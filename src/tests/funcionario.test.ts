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
    it('Llama los turnos en orden y, al marcar AUSENTE, llama solo al próximo', async () => {
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

            // El funcionario llama solo al primero: debe ser el #1 (siempre el número más bajo pendiente)
      const resPrimero = await request(app)
        .post('/api/funcionario/siguiente')
        .set('Authorization', `Bearer ${token}`);

      expect(resPrimero.status, `siguiente respondió: ${resPrimero.text}`).toBe(200);
      expect(resPrimero.body).toHaveProperty('numero', 1);
      expect(resPrimero.body).toHaveProperty('estado', 'EN_ATENCION');
      expect(resPrimero.body).toHaveProperty('funcionarioId', usuario.id);
      // avisa a la TV que cambió la cola
      expect(io.emit).toHaveBeenCalledWith('cola-actualizada', { sucursalId: sucursal.id });

      // Cada "ausente" marca el turno en atención y llama solo al próximo (1 -> 2, 2 -> 3)
      for (const [ausente, proximo] of [[1, 2], [2, 3]] as const) {
        const resAusente = await request(app)
          .post('/api/funcionario/ausente')
          .set('Authorization', `Bearer ${token}`);

        expect(resAusente.status, `ausente respondió: ${resAusente.text}`).toBe(200);
        // la respuesta ahora es el turno que se llamó
        expect(resAusente.body).toHaveProperty('numero', proximo);
        expect(resAusente.body).toHaveProperty('estado', 'EN_ATENCION');
        expect(resAusente.body).toHaveProperty('funcionarioId', usuario.id);

        // el turno marcado como ausente se verifica en la base
        const turnoEnDb = await prisma.turno.findFirst({
          where: { sucursalId: sucursal.id, numero: ausente },
        });
        expect(turnoEnDb?.estado).toBe('AUSENTE');
      }

      // El último ausente (#3): ya no queda nadie para llamar
      const resUltimo = await request(app)
        .post('/api/funcionario/ausente')
        .set('Authorization', `Bearer ${token}`);

      expect(resUltimo.status, `ausente respondió: ${resUltimo.text}`).toBe(200);
      expect(resUltimo.body.mensaje).toContain('Turno marcado como ausente');

      const ultimoEnDb = await prisma.turno.findFirst({
        where: { sucursalId: sucursal.id, numero: 3 },
      });
      expect(ultimoEnDb?.estado).toBe('AUSENTE');

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