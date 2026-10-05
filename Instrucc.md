Orden de despliegue:

1. pnpm install

2. Completar env 

Abrir el archivo .env recién creado y completar cada variable:

Formato:
DATABASE_URL="mysql://usuario:contraseña@localhost:3306/nombre_de_base"

JWT_SECRET generarlo con:
  node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"


3. Crear las tablas en tu base de datos

pnpm orm:deploy

4. Generar el cliente de Prisma

pnpm orm:generate

5. Poblar la base con datos de prueba

pnpm exec prisma db seed

6. levantar servidor

pnpm dev

CASOS ESPECIALES
-----------------------------------
Vaciar la base y poblarla de nuevo desde cero

pnpm orm:pereza
pnpm exec prisma db seed
---------------------------
Cambios en el schema
Si vos mismo modificaste el modelo de datos (agregaste un campo, una tabla, etc.):

pnpm orm:migrate nombre-descriptivo-del-cambio
pnpm orm:generate
----------------------------

Alguien más cambió el schema

pnpm orm:deploy
pnpm orm:generate
---------------------------

Ver los datos de la base con una interfaz visual

pnpm studio
-------------------------------



