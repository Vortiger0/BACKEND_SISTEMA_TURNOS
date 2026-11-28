import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../app";

describe("tótem", () => {
    let tokenAdmin = ""
    let tokenTotem = ""
    let sucursalId = 0
    let codigo = ""

    // Antes de los tests: login de admin, genera un código y activa el tótem.
    beforeAll(async () => {
        const loginAdmin = await request(app)
            .post("/api/auth/login")
            .send({
                identificador: process.env.ADMIN_TESTING_USERNAME,
                contrasena: process.env.ADMIN_TESTING_PASSWORD,
                esFuncionario: true,
            })
        tokenAdmin = loginAdmin.body.token

        const generado = await request(app)
            .post("/api/admin/totem/codigo")
            .set("Authorization", `Bearer ${tokenAdmin}`)
        codigo = generado.body.codigo

        const activado = await request(app)
            .post("/api/totem/activar")
            .send({ codigo })
        tokenTotem = activado.body.token
        sucursalId = activado.body.sucursalId
    })

    it("la sesión responde 200 con un tótem activo", async () => {
        const respuesta = await request(app)
            .get(`/api/totem/sesion/${sucursalId}`)
            .set("Authorization", `Bearer ${tokenTotem}`)

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.sucursalId).toBe(sucursalId)
    })

    it("la sesión rechaza un pedido sin token", async () => {
        const respuesta = await request(app)
            .get(`/api/totem/sesion/${sucursalId}`)

        expect(respuesta.status).toBe(401)
    })

    it("la sesión rechaza un token de admin", async () => {
        const respuesta = await request(app)
            .get(`/api/totem/sesion/${sucursalId}`)
            .set("Authorization", `Bearer ${tokenAdmin}`)

        expect(respuesta.status).toBe(403)
    })

    it("un código ya usado no sirve de nuevo", async () => {
        const respuesta = await request(app)
            .post("/api/totem/activar")
            .send({ codigo })

        expect(respuesta.status).toBe(400)
    })

    // Va al final: generar un código nuevo corta el token que usan los tests anteriores.
    it("un tótem cortado recibe 401 TOTEM_NO_AUTORIZADO", async () => {
        await request(app)
            .post("/api/admin/totem/codigo")
            .set("Authorization", `Bearer ${tokenAdmin}`)

        const respuesta = await request(app)
            .get(`/api/totem/sesion/${sucursalId}`)
            .set("Authorization", `Bearer ${tokenTotem}`)

        expect(respuesta.status).toBe(401)
        expect(respuesta.body.codigo).toBe("TOTEM_NO_AUTORIZADO")
    })
})