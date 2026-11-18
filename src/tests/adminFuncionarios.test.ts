import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { prisma } from "../prisma";
import app from "../app";

describe("Funcionarios (Admin) - IDOR", () => {

    //login como el Admin de Testing (el "atacante", otra sucursal), validado una sola vez antes de los tests
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

    it("rechaza editar un funcionario de otra sucursal", async () => {
        let sucursalId: number | undefined;
        let usuarioId: number | undefined;

        try {
            //crea un funcionario "víctima" directo en la base, en una sucursal propia del test (distinta a la del admin de testing)
            //sin pasar por login de ningún otro admin
            const sucursalAjena = await prisma.sucursal.create({
                data: {
                    nombre: `Sucursal ajena test ${Date.now()}`,
                    organismo: "TESTING",
                    direccion: "N/A",
                    latitud: 0,
                    longitud: 0,
                    telefono: "0000-0000",
                    margenCorte: 15,
                    umbralPocoOcupado: 5,
                    umbralOcupado: 15,
                    cantidadCajas: 1,
                }
            });
            sucursalId = sucursalAjena.id;

            const usuarioAjeno = await prisma.usuario.create({
                data: {
                    nombreCompleto: "Funcionario ajeno (test)",
                    contrasena: "no-se-usa-en-este-test",
                    rol: "FUNCIONARIO",
                }
            });
            usuarioId = usuarioAjeno.id;

            const funcionarioAjeno = await prisma.funcionario.create({
                data: {
                    id: usuarioAjeno.id,
                    nombreUsuario: `funcionario-test-${Date.now()}`,
                    numeroCaja: 99,
                    sucursalId: sucursalAjena.id,
                }
            });

            const respuesta = await request(app)
                .put(`/api/admin/funcionarios/${funcionarioAjeno.id}`)
                .set("Authorization", `Bearer ${tokenAdminTesting}`)
                .send({
                    nombreCompleto: "Hackeado",
                    nombreUsuario: "hackeado123",
                    numeroCaja: 1,
                });

            expect(respuesta.status, `respuesta: ${JSON.stringify(respuesta.body)}`).toBe(404);

            const funcionarioDespues = await prisma.funcionario.findUnique({ 
                where: { id: funcionarioAjeno.id},
                include: { usuario: true },
            })

            expect(funcionarioDespues?.nombreUsuario).toBe(funcionarioAjeno.nombreUsuario);
            expect(funcionarioDespues?.numeroCaja).toBe(99);
            expect(funcionarioDespues?.usuario.nombreCompleto).toBe("Funcionario ajeno (test)");

        } finally {
            //borra lo que creamos para este test (se ejecuta siempre, aunque el test falle)
            //el borrado va en orden: primero funcionario, luego usuario y al final la sucursal
            if (usuarioId) await prisma.funcionario.deleteMany({ where: { id: usuarioId } });
            if (usuarioId) await prisma.usuario.deleteMany({ where: { id: usuarioId } });
            if (sucursalId) await prisma.sucursal.deleteMany({ where: { id: sucursalId } });
        }
    });

    it("rechaza eliminar un funcionario de otra sucursal", async () => {
        let sucursalId: number | undefined;
        let usuarioId: number | undefined;

        try {
            const sucursalAjena = await prisma.sucursal.create({
                data: {
                    nombre: `Sucursal ajena test ${Date.now()}`,
                    organismo: "TESTING",
                    direccion: "N/A",
                    latitud: 0,
                    longitud: 0,
                    telefono: "0000-0000",
                    margenCorte: 15,
                    umbralPocoOcupado: 5,
                    umbralOcupado: 15,
                    cantidadCajas: 1,
                }
            });
            sucursalId = sucursalAjena.id;

            const usuarioAjeno = await prisma.usuario.create({
                data: {
                    nombreCompleto: "Funcionario ajeno (test)",
                    contrasena: "no-se-usa-en-este-test",
                    rol: "FUNCIONARIO",
                }
            });
            usuarioId = usuarioAjeno.id;

            const funcionarioAjeno = await prisma.funcionario.create({
                data: {
                    id: usuarioAjeno.id,
                    nombreUsuario: `funcionario-test-${Date.now()}`,
                    numeroCaja: 98,
                    sucursalId: sucursalAjena.id,
                }
            });

            const respuesta = await request(app)
                .delete(`/api/admin/funcionarios/${funcionarioAjeno.id}`)
                .set("Authorization", `Bearer ${tokenAdminTesting}`);

            expect(respuesta.status, `respuesta: ${JSON.stringify(respuesta.body)}`).toBe(404);

            //comprueba que el borrado rechazado no eliminó al funcionario
            const funcionarioDespues = await prisma.funcionario.findUnique({
                where: { id: funcionarioAjeno.id },
            });
            expect(funcionarioDespues).not.toBeNull();
        } finally {
            //como el borrado fue rechazado, el funcionario sigue existiendo, hay que limpiarlo nosotros
            if (usuarioId) await prisma.funcionario.deleteMany({ where: { id: usuarioId } });
            if (usuarioId) await prisma.usuario.deleteMany({ where: { id: usuarioId } });
            if (sucursalId) await prisma.sucursal.deleteMany({ where: { id: sucursalId } });
        }
    });

        it("rechaza eliminar una excepción de otra sucursal", async () => {
        let sucursalId: number | undefined;
        let excepcionId: number | undefined;

        try {
            const sucursalAjena = await prisma.sucursal.create({
                data: {
                    nombre: `Sucursal ajena test ${Date.now()}`,
                    organismo: "TESTING",
                    direccion: "N/A",
                    latitud: 0,
                    longitud: 0,
                    telefono: "0000-0000",
                    margenCorte: 15,
                    umbralPocoOcupado: 5,
                    umbralOcupado: 15,
                    cantidadCajas: 1,
                }
            });
            sucursalId = sucursalAjena.id;

            const excepcionAjena = await prisma.excepcion.create({
                data: {
                    fecha: new Date("2026-12-25T00:00:00Z"),
                    sucursalId: sucursalAjena.id,
                }
            });
            excepcionId = excepcionAjena.id;

            const respuesta = await request(app)
                .delete(`/api/admin/excepciones/${excepcionAjena.id}`)
                .set("Authorization", `Bearer ${tokenAdminTesting}`);

            expect(respuesta.status, `respuesta: ${JSON.stringify(respuesta.body)}`).toBe(404);

            //comprueba que el borrado rechazado no eliminó la excepción
            const excepcionDespues = await prisma.excepcion.findUnique({
                where: { id: excepcionAjena.id },
            });
            expect(excepcionDespues).not.toBeNull();
        } finally {
            //primero la excepción y al final la sucursal
            if (excepcionId) await prisma.excepcion.deleteMany({ where: { id: excepcionId } });
            if (sucursalId) await prisma.sucursal.deleteMany({ where: { id: sucursalId } });
        }
    });

    });
