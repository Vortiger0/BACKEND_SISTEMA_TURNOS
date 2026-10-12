import {prisma} from "../prisma"

//job que resuelve el problema del conteo del catalogo que iba aumentando indefinidamente con turnos viejos que no se atendieron nunca
export const cerrarTurnosVencidos = async () => {
    //fecha de hoy con la hora en 0
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    //actualiza varias filas de una sola vez. Busca todos los turnos que sigan activo o en atencion pero que hayan sido creados antes de hoy
    const resultado = await prisma.turno.updateMany({
        where: {
            estado: { in: ["ACTIVO", "EN_ATENCION"]},
            creadoEn: {lt:hoy},
        },
        data: {
            estado: "EXPIRADO"
        }
    });

    console.log(`Turnos vencidos cerrados: ${resultado.count}`)


} 


