import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { prisma } from "../prisma";
import app from "../app";

describe("Funcionarios (Admin) - eliminar en su propia sucursal", () => {

    let tokenAdminTesting: string;
    let sucursalAdminId: number;

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

        //busca la sucursal del admin de testing para crear los funcionarios ahí
        const admin = await prisma.admin.findUnique({
            where: { nombreUsuario: process.env.ADMIN_TESTING_USERNAME as string },
        });
        expect(admin, "no se encontró al admin de testing").not.toBeNull();
        sucursalAdminId = admin!.sucursalId;
    });

    it("elimina un funcionario de su propia sucursal (200)", async () => {
        let usuarioId: number | undefined;

        try {
            const usuario = await prisma.usuario.create({
                data: {
                    nombreCompleto: "Funcionario a eliminar (test)",
                    contrasena: "no-se-usa-en-este-test",
                    rol: "FUNCIONARIO",
                }
            });
            usuarioId = usuario.id;

            await prisma.funcionario.create({
                data: {
                    id: usuario.id,
                    nombreUsuario: `funcionario-test-${Date.now()}`,
                    numeroCaja: 97,
                    sucursalId: sucursalAdminId,
                }
            });

            const respuesta = await request(app)
                .delete(`/api/admin/funcionarios/${usuario.id}`)
                .set("Authorization", `Bearer ${tokenAdminTesting}`);

            expect(respuesta.status, `respuesta: ${JSON.stringify(respuesta.body)}`).toBe(200);

            //comprueba que realmente desapareció de la base
            const despues = await prisma.funcionario.findUnique({ where: { id: usuario.id } });
            expect(despues).toBeNull();
        } finally {
            //limpieza por si el test falló antes de que el endpoint lo borrara
            if (usuarioId) await prisma.funcionario.deleteMany({ where: { id: usuarioId } });
            if (usuarioId) await prisma.usuario.deleteMany({ where: { id: usuarioId } });
        }
    });

    it("no deja eliminar un funcionario que está atendiendo un turno (400)", async () => {
        let usuarioId: number | undefined;

        try {
            const usuario = await prisma.usuario.create({
                data: {
                    nombreCompleto: "Funcionario atendiendo (test)",
                    contrasena: "no-se-usa-en-este-test",
                    rol: "FUNCIONARIO",
                }
            });
            usuarioId = usuario.id;

            await prisma.funcionario.create({
                data: {
                    id: usuario.id,
                    nombreUsuario: `funcionario-test-${Date.now()}`,
                    numeroCaja: 96,
                    sucursalId: sucursalAdminId,
                }
            });

            //turno en atención atribuido a ese funcionario
            await prisma.turno.create({
                data: {
                    numero: 9999,
                    estado: "EN_ATENCION",
                    sucursalId: sucursalAdminId,
                    funcionarioId: usuario.id,
                    llamadoEn: new Date(),
                }
            });

            const respuesta = await request(app)
                .delete(`/api/admin/funcionarios/${usuario.id}`)
                .set("Authorization", `Bearer ${tokenAdminTesting}`);

            expect(respuesta.status, `respuesta: ${JSON.stringify(respuesta.body)}`).toBe(400);
            expect(respuesta.body.error).toContain("atendiendo");

            //comprueba que el funcionario sigue existiendo
            const despues = await prisma.funcionario.findUnique({ where: { id: usuario.id } });
            expect(despues).not.toBeNull();
        } finally {
            //limpieza: primero el turno, luego funcionario y usuario
            if (usuarioId) await prisma.turno.deleteMany({ where: { funcionarioId: usuarioId } });
            if (usuarioId) await prisma.funcionario.deleteMany({ where: { id: usuarioId } });
            if (usuarioId) await prisma.usuario.deleteMany({ where: { id: usuarioId } });
        }
    });
});