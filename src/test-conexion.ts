import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Intentando conectar...");
    const resultado = await prisma.sucursal.count();
    console.log("Conexión exitosa. Sucursales:", resultado);
}

main()
    .catch((e) => console.error("Error:", e))
    .finally(() => prisma.$disconnect());