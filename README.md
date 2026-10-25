# Sistema de Turnos 

Backend de un sistema de gestión de filas y turnos por número correlativo, pensado para cualquier organismo que atienda al público por turnos (redes de cobranza, salud, etc.).  Proyecto de la Tecnicatura en Redes y Software (Polo Tecnológico Melo) — equipo **CodeNexo**.

Emite turnos numéricos correlativos por sucursal (sin reserva de fecha/hora, sin fila virtual). Sistema basado en tres roles: **Ciudadano**, **Funcionario** y **Administrador**.

## Stack

- Node.js + Express 5 + TypeScript
- Prisma 7 (`@prisma/adapter-mariadb`) + MySQL
- JWT + bcryptjs para autenticación, Helmet para cabeceras de seguridad
- Zod para validación de entrada
- Nodemailer (verificación de correo) + web-push (avisos de turno próximo)
- node-cron (cierre automático de turnos vencidos)
- Vitest + Supertest para testing

## Requisitos previos

- Node.js y [pnpm](https://pnpm.io/)
- MySQL corriendo localmente (o accesible por `DATABASE_URL`)

## Puesta en marcha

1. Instalar dependencias:
   ```bash
   pnpm install
   ```

2. Copiar `.env.example` a `.env` y completar las variables (conexión a base de datos, credenciales de las sucursales de prueba, claves VAPID para push, `JWT_SECRET`, credenciales de Gmail para el envío de correos):
   ```bash
   cp .env.example .env
   ```

3. Aplicar las migraciones y poblar la base con las sucursales y cuentas de prueba:
   ```bash
   pnpm orm:migrate
   pnpm orm:generate
   ```
   > La carga de datos de ejemplo (seed) está configurada en `prisma7.config.ts` y no corre sola con `migrate` — ejecutarla aparte con `prisma db seed` si hace falta reponer los datos de prueba.

4. Levantar el servidor en modo desarrollo:
   ```bash
   pnpm dev
   ```

## Scripts disponibles

| Script | Descripción |
|---|---|
| `pnpm dev` | Levanta el servidor con recarga automática (`tsx watch`) |
| `pnpm test` | Corre la suite de tests con Vitest |
| `pnpm orm:migrate` | Crea y aplica una migración de Prisma en desarrollo |
| `pnpm orm:generate` | Regenera el cliente de Prisma |
| `pnpm orm:deploy` | Aplica migraciones pendientes (entornos de staging/producción) |
| `pnpm studio` | Abre Prisma Studio para explorar la base de datos |
| `pnpm orm:pereza` | Resetea la base por completo y la regenera (⚠️ borra todos los datos) |

## Estructura del proyecto

src/
controllers/ # Lógica de cada endpoint, por rol/dominio
routes/ # Definición de rutas de Express
middlewares/ # Autenticación (JWT), autorización por rol
services/ # Lógica reutilizable (p. ej. envío de notificaciones push)
jobs/ # Tareas programadas (cron) — cierre de turnos vencidos
types/ # Extensiones de tipos (Express, etc.)
tests/ # Tests de integración con Vitest + Supertest
prisma/
schema.prisma # Modelo de datos
migrations/ # Historial de migraciones


## Roles y módulos principales

- **Ciudadano**: registro con verificación de correo, login, listado de sucursales con nivel de ocupación, sacar/cancelar turno, ver mis turnos, avisos push cuando se acerca su turno.
- **Funcionario**: atención de turnos por caja asignada ("Siguiente" / "Ausente").
- **Administrador**: configuración de horarios, excepciones/feriados, cajas, umbrales de ocupación y tope diario de emisión por sucursal; alta/baja de funcionarios.
- **Tótem** (`/api/turnos` sin token) y **Pantalla TV** (`/api/tv/:sucursalId`): endpoints públicos para el kiosco de autoservicio y la pantalla de sala de espera.
