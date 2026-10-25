import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";


//manda un pedido al login con un usuario que no existe para confirmar que el codigo y mensaje de error sean los adecuados.
describe("Login", () => {
    it("Rechaza el login con datos incorrectos", async () => {
        const respuesta = await request(app)
        .post("/api/auth/login")
        .send({ identificador: "usuarioInexistente@gmail.com", contrasena: "12345678", esFuncionario: false})
        
        expect(respuesta.status).toBe(401);
        expect(respuesta.body.error).toBe("Datos incorrectos")
      })

      it("Permite loguearse con credenciales correctas", async() => {
        const respuesta = await request(app)
        .post("/api/auth/login")
        .send({
            identificador: process.env.ADMIN_TESTING_USERNAME,
            contrasena: process.env.ADMIN_TESTING_PASSWORD,
            esFuncionario: true
        })

        expect(respuesta.status).toBe(200)
        expect(respuesta.body.token).toBeDefined();
        expect(respuesta.body.rol).toBe("ADMIN");
      })

      
})


describe("Mis turnos", () => {
    it("rechaza el pedido sin token", async () => {
        const respuesta = await request(app).get("/api/turnos/mis-turnos");
        expect(respuesta.status).toBe(401);
    });
});

describe("Login - coherencia de modo", () => {
    it ("rechaza si el switch dice Funcionario pero el identificador es un correo", async () => {
        const respuesta = await request(app)
            .post("/api/auth/login")
            .send({
                identificador: "correo@gmail.com",
                contrasena: "12345678",
                esFuncionario: true
            })

            expect(respuesta.status).toBe(400);
    })

    it( " rechaza si el switch dice Ciudadano pero el identificador no es un correo", async () => {
        const respuesta = await request(app)
            .post("/api/auth/login")
            .send({
                identificador: "usuario.SinArroba",
                contrasena: "12345678",
                esFuncionario:false,
            })
            expect(respuesta.status).toBe(400)
    })
})