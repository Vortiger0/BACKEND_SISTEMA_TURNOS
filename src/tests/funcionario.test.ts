import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { prisma } from '../prisma';
import { config } from '../config';
import { io } from '../socket';

// En los tests no se levanta el servidor (index.ts), por eso initSocket() nunca
// corre y `io` queda undefined. Se reemplaza el módulo por un io falso.
// vi.mock se "eleva" solo al principio del archivo, antes de importar app.
vi.mock('../socket', () => ({
  io: { emit: vi.fn() },
  initSocket: vi.fn(),
}));

describe('Funcionario llama turnos y los marca como ausentes', () => {
  it('Llama los turnos en orden de número y marca cada uno como AUSENTE', async () => {
    const sufijo = Date.now();

    let sucursalId: number | undefined;
    let usuarioId: number | undefined;

    try {
      // Sucursal propia: "siguiente" solo ve los turnos de este test
      const sucursal = await prisma.sucursal.create({
        data: {
          nombre: `Sucursal test ${sufijo}`,
          organismo: 'TESTING',
          direccion: 'N/A',
          latitud: 0,
          longitud: 0,
          telefono: '0000-0000',
          margenCorte: 15,
          umbralPocoOcupado: 5,
          umbralOcupado: 15,
          cantidadCajas: 1,
        },
      });
      sucursalId = sucursal.id;

      // Funcionario propio (Usuario + Funcionario comparten id)
      const usuario = await prisma.usuario.create({
        data: {
          nombreCompleto: 'Funcionario Test',
          contrasena: 'no-se-usa-en-este-test',
          rol: 'FUNCIONARIO',
        },
      });
      usuarioId = usuario.id;

      await prisma.funcionario.create({
        data: {
          id: usuario.id,
          nombreUsuario: `func_test_${sufijo}`,
          numeroCaja: 1,
          sucursalId: sucursal.id,
        },
      });

      const token = jwt.sign({ id: usuario.id, rol: 'FUNCIONARIO' }, config.jwtSecret, {
        expiresIn: '5m',
      });

      // Tres turnos en espera (creados fuera de orden a propósito)
      const numeros = [3, 1, 2];
      for (const numero of numeros) {
        await prisma.turno.create({
          data: { numero, estado: 'ACTIVO', sucursalId: sucursal.id },
        });
      }

      // Debe llamarlos 1, 2, 3 (siempre el número más bajo pendiente)
      for (const numeroEsperado of [1, 2, 3]) {
        const resLlamar = await request(app)
          .post('/api/funcionario/siguiente')
          .set('Authorization', `Bearer ${token}`);

        // resLlamar.text trae el stack trace de Express cuando hay un 500
        expect(resLlamar.status, `siguiente respondió: ${resLlamar.text}`).toBe(200);
        expect(resLlamar.body).toHaveProperty('numero', numeroEsperado);
        expect(resLlamar.body).toHaveProperty('estado', 'EN_ATENCION');
        expect(resLlamar.body).toHaveProperty('funcionarioId', usuario.id);
        // avisa a la TV que cambió la cola
        expect(io.emit).toHaveBeenCalledWith('cola-actualizada', { sucursalId: sucursal.id });

        const resAusente = await request(app)
          .post('/api/funcionario/ausente')
          .set('Authorization', `Bearer ${token}`);

        expect(resAusente.status, `ausente respondió: ${resAusente.text}`).toBe(200);
        expect(resAusente.body).toHaveProperty('mensaje', 'Turno marcado como ausente');

        // La ruta no devuelve el turno, así que se verifica en la base
        const turnoEnDb = await prisma.turno.findFirst({
          where: { sucursalId: sucursal.id, numero: numeroEsperado },
        });
        expect(turnoEnDb?.estado).toBe('AUSENTE');
      }

      // Ya no queda nadie en la fila
      const resVacio = await request(app)
        .post('/api/funcionario/siguiente')
        .set('Authorization', `Bearer ${token}`);

      expect(resVacio.status).toBe(200);
      expect(resVacio.body).toHaveProperty('mensaje', 'No hay turnos esperando en la fila');

      // Y tampoco hay turno en atención para marcar ausente
      const resSinTurno = await request(app)
        .post('/api/funcionario/ausente')
        .set('Authorization', `Bearer ${token}`);

      expect(resSinTurno.status).toBe(400);
    } finally {
      // Limpieza (orden por FK: turnos -> funcionario -> usuario -> sucursal)
      if (sucursalId !== undefined) {
        await prisma.turno.deleteMany({ where: { sucursalId } });
      }
      if (usuarioId !== undefined) {
        await prisma.funcionario.deleteMany({ where: { id: usuarioId } });
        await prisma.usuario.deleteMany({ where: { id: usuarioId } });
      }
      if (sucursalId !== undefined) {
        await prisma.sucursal.deleteMany({ where: { id: sucursalId } });
      }
    }
  });
});