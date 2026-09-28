import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

//con el adapter prisma podrá comunicarse con mysql
const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

//crea el cliente una sola vez y lo exporta para usarlo desde cualquier archivo
export const prisma = new PrismaClient({ adapter })