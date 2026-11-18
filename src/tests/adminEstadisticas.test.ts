import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import { config } from "../config";

describe("Estadísticas (Admin)", () => {

    //login como el Admin de Testing, validado una sola vez antes de los tests
    let tokenAdminTesting: string;

    beforeAll(async () => {
        const loginAdminTesting = await request(app)
            .post("/api/auth/login")
            .send({
                identificador: process.env.ADMIN_TESTING_USERNAME,
                contrasena: process.env.ADMIN_TESTING_PASSWORD,
                esFuncionario: true,
            });

        expect(loginAdminTesting.status, `login: ${JSON.stringify(loginAdminTesting.body)}`).toBe(200);
        expect(loginAdminTesting.body.token).toBeDefined();
        tokenAdminTesting = loginAdminTesting.body.token;
    });

    it("rechaza el pedido sin token", async () => {
        const respuesta = await request(app).get("/api/admin/estadisticas");
        expect(respuesta.status).toBe(401);
    });

    it("rechaza a un funcionario (solo puede el administrador)", async () => {
        //el middleware solo lee el rol del token, no consulta la base, por eso alcanza con firmar uno
        const tokenFuncionario = jwt.sign({ id: 1, rol: "FUNCIONARIO" }, config.jwtSecret, { expiresIn: "5m" });

        const respuesta = await request(app)
            .get("/api/admin/estadisticas")
            .set("Authorization", `Bearer ${tokenFuncionario}`);

        expect(respuesta.status).toBe(403);
    });

    it("rechaza un período que no sea 15, 30 o 90", async () => {
        const respuesta = await request(app)
            .get("/api/admin/estadisticas?dias=7")
            .set("Authorization", `Bearer ${tokenAdminTesting}`);

        expect(respuesta.status, `respuesta: ${JSON.stringify(respuesta.body)}`).toBe(400);
    });

    it("devuelve las estadísticas con el período por defecto (200)", async () => {
        const respuesta = await request(app)
            .get("/api/admin/estadisticas")
            .set("Authorization", `Bearer ${tokenAdminTesting}`);

        expect(respuesta.status, `respuesta: ${JSON.stringify(respuesta.body)}`).toBe(200);

        const datos = respuesta.body;

        //período por defecto
        expect(datos.dias).toBe(15);
        expect(typeof datos.total).toBe("number");
        expect(typeof datos.esperaPromedioMin).toBe("number");

        //los estados tienen que sumar el total
        const sumaEstados = Object.values(datos.porEstado as Record<string, number>).reduce((a, b) => a + b, 0);
        expect(sumaEstados).toBe(datos.total);

        //siete días de la semana, que también suman el total
        expect(datos.porDiaSemana).toHaveLength(7);
        const sumaDias = (datos.porDiaSemana as { cantidad: number }[]).reduce((a, d) => a + d.cantidad, 0);
        expect(sumaDias).toBe(datos.total);

        //el gráfico por mes siempre trae 6 meses
        expect(datos.porMes).toHaveLength(6);
    });

    it("respeta el período pedido (30 días)", async () => {
        const respuesta = await request(app)
            .get("/api/admin/estadisticas?dias=30")
            .set("Authorization", `Bearer ${tokenAdminTesting}`);

        expect(respuesta.status, `respuesta: ${JSON.stringify(respuesta.body)}`).toBe(200);
        expect(respuesta.body.dias).toBe(30);
        //el gráfico por mes no depende del período
        expect(respuesta.body.porMes).toHaveLength(6);
    });
});