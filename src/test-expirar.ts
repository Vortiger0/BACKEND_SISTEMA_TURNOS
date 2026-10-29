import "dotenv/config";
import { prisma } from "./prisma";

async function main() {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);

    const turno = await prisma.turno.create({
        data: {
            numero: 9999,
            estado: "ACTIVO",
            sucursalId: 6, // Sucursal de Testing — ajustá si el id es otro
            creadoEn: ayer,
        },
    });

    console.log("Turno creado con creadoEn de ayer:", turno);
}

main()
    .catch((e) => console.error("Error:", e))
    .finally(() => prisma.$disconnect());