import { describe, it, expect } from "vitest";
import request from "supertest";
import { prisma } from "../prisma";
import app from "../app";

describe("Funcionarios (Admin) - IDOR", () => {
    it("rechaza editar un funcionario de otra sucursal", async () => {
        //crea un funcionario "víctima" directo en la base, en la sucursal de RedPagos (id 1)
        //sin pasar por login de ningún otro admin
        const usuarioAjeno = await prisma.usuario.create({
            data: {
                nombreCompleto: "Funcionario ajeno (test)",
                contrasena: "no-se-usa-en-este-test",
                rol: "FUNCIONARIO",
            }
        });

        const funcionarioAjeno = await prisma.funcionario.create({
            data: {
                id: usuarioAjeno.id,
                nombreUsuario: `funcionario-test-${Date.now()}`,
                numeroCaja: 99,
                sucursalId: 1,
            }
        });

        //login como el Admin de Testing (el "atacante", otra sucursal)
        const loginAdminTesting = await request(app)
            .post("/api/auth/login")
            .send({
                identificador: process.env.ADMIN_TESTING_USERNAME,
                contrasena: process.env.ADMIN_TESTING_PASSWORD,
                esFuncionario: true,
            });

        const tokenAdminTesting = loginAdminTesting.body.token;

        const respuesta = await request(app)
            .put(`/api/admin/funcionarios/${funcionarioAjeno.id}`)
            .set("Authorization", `Bearer ${tokenAdminTesting}`)
            .send({
                nombreCompleto: "Hackeado",
                nombreUsuario: "hackeado123",
                numeroCaja: 1,
            });

        expect(respuesta.status, `respuesta: ${JSON.stringify(respuesta.body)}`).toBe(404);

        //limpieza: borra lo que creamos para este test
        await prisma.funcionario.delete({ where: { id: funcionarioAjeno.id } });
        await prisma.usuario.delete({ where: { id: usuarioAjeno.id } });
    });

    it("rechaza eliminar un funcionario de otra sucursal", async () => {
        const usuarioAjeno = await prisma.usuario.create({
            data: {
                nombreCompleto: "Funcionario ajeno (test)",
                contrasena: "no-se-usa-en-este-test",
                rol: "FUNCIONARIO",
            }
        });

        const funcionarioAjeno = await prisma.funcionario.create({
            data: {
                id: usuarioAjeno.id,
                nombreUsuario: `funcionario-test-${Date.now()}`,
                numeroCaja: 98,
                sucursalId: 1,
            }
        });

        const loginAdminTesting = await request(app)
            .post("/api/auth/login")
            .send({
                identificador: process.env.ADMIN_TESTING_USERNAME,
                contrasena: process.env.ADMIN_TESTING_PASSWORD,
                esFuncionario: true,
            });

        const tokenAdminTesting = loginAdminTesting.body.token;

        const respuesta = await request(app)
            .delete(`/api/admin/funcionarios/${funcionarioAjeno.id}`)
            .set("Authorization", `Bearer ${tokenAdminTesting}`);

        expect(respuesta.status, `respuesta: ${JSON.stringify(respuesta.body)}`).toBe(404);

        //limpieza: como el borrado fue rechazado, el funcionario sigue existiendo, hay que limpiarlo nosotros
        await prisma.funcionario.delete({ where: { id: funcionarioAjeno.id } });
        await prisma.usuario.delete({ where: { id: usuarioAjeno.id } });
    });

    it("rechaza eliminar una excepción de otra sucursal", async () => {
    const excepcionAjena = await prisma.excepcion.create({
        data: {
            fecha: new Date("2026-12-25T00:00:00Z"),
            sucursalId: 1,
        }
    });

    const loginAdminTesting = await request(app)
        .post("/api/auth/login")
        .send({
            identificador: process.env.ADMIN_TESTING_USERNAME,
            contrasena: process.env.ADMIN_TESTING_PASSWORD,
            esFuncionario: true,
        });

    const tokenAdminTesting = loginAdminTesting.body.token;

    const respuesta = await request(app)
        .delete(`/api/admin/excepciones/${excepcionAjena.id}`)
        .set("Authorization", `Bearer ${tokenAdminTesting}`);

    expect(respuesta.status, `respuesta: ${JSON.stringify(respuesta.body)}`).toBe(404);

    await prisma.excepcion.delete({ where: { id: excepcionAjena.id } });
});

});