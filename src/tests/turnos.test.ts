import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "../prisma";

describe("sacar turno", () => {
    it ("rechaza sacar turno en una sucursal que no existe", async () => {
        const respuesta = await request(app)
            .post("/api/turnos")
            .send({ sucursalId: 99999})

        expect(respuesta.status).toBe(404)
    })

    it ("rechaza sacar turno sin mandar sucursalId", async () => {
        const respuesta = await request(app)
            .post("/api/turnos")
            .send({})

            expect(respuesta.status).toBe(400)
    } )
})

describe("Cancelar turno" , () => {
    it ("rechaza cancelar un turno que no pertenece al usuario autenticado", async () => {

        const ciudadanoTesting = await prisma.ciudadano.findUnique({ 
            where: { correo: process.env.CIUDADANO_TESTING_EMAIL!}
        });

        if ( ciudadanoTesting) {
            await prisma.turno.deleteMany({ where: { ciudadanoId: ciudadanoTesting.id}});
        }

        const loginCiudadano = await request(app)
            .post("/api/auth/login")
            .send({
                identificador: process.env.CIUDADANO_TESTING_EMAIL,
                contrasena: process.env.CIUDADANO_TESTING_PASSWORD,
                esFuncionario: false, 
            })

            const tokenCiudadano = loginCiudadano.body.token

            const turnoCreado = await request(app)
                .post("/api/turnos")
                .set("Authorization", `Bearer ${tokenCiudadano}`)
                .send({ sucursalId: 6});

            const turnoId = turnoCreado.body.id;

            const loginAdmin = await request(app)
                .post("/api/auth/login")
                .send({
                    identificador: process.env.ADMIN_TESTING_USERNAME,
                    contrasena: process.env.ADMIN_TESTING_PASSWORD,
                    esFuncionario: true,
                })

            const tokenAdmin = loginAdmin.body.token;

            const respuesta = await request(app)
                .delete(`/api/turnos/${turnoId}`)
                .set("Authorization", `Bearer ${tokenAdmin}`)

            expect(turnoId, `turnoCreado completo: ${JSON.stringify(turnoCreado.body)}`).toBeDefined();
expect(respuesta.status, `respuesta de cancelación: ${JSON.stringify(respuesta.body)}`).toBe(404);

    })
} )