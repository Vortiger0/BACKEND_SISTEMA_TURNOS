import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "../prisma";

describe("sacar turno", () => {
    let tokenCiudadano = ""

    beforeAll(async () => {
        const login = await request(app)
            .post("/api/auth/login")
            .send({
                identificador: process.env.CIUDADANO_TESTING_EMAIL,
                contrasena: process.env.CIUDADANO_TESTING_PASSWORD,
                esFuncionario: false,
            })
        tokenCiudadano = login.body.token
    })

    it("rechaza sacar turno sin token", async () => {
        const respuesta = await request(app)
            .post("/api/turnos")
            .send({ sucursalId: 1 })

        expect(respuesta.status).toBe(401)
    })

    it("rechaza sacar turno en una sucursal que no existe", async () => {
        const respuesta = await request(app)
            .post("/api/turnos")
            .set("Authorization", `Bearer ${tokenCiudadano}`)
            .send({ sucursalId: 99999 })

        expect(respuesta.status).toBe(404)
    })

    it("rechaza sacar turno sin mandar sucursalId", async () => {
        const respuesta = await request(app)
            .post("/api/turnos")
            .set("Authorization", `Bearer ${tokenCiudadano}`)
            .send({})

        expect(respuesta.status).toBe(400)
    })
})