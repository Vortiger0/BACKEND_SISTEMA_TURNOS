import type { Request, Response } from "express";
import { prisma } from "../prisma"

//ruta pública, el id de la sucursal viaja directo en la url
export const obtenerEstadoTV = async (req: Request, res: Response) => {
    const { sucursalId } = req.params;

    if (!sucursalId) {
        return res.status(400).json({ error: "Falta el id de la sucursal"});
    }

    //convierte el texto de la url a numero
    const sucursalIdNum = Number(sucursalId)

    if (isNaN(sucursalIdNum)) {
        return res.status(400).json({ error: "El id no es válido"})
    }
    //fecha normalizada a medianoche para filtrar los turnos de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0)

    //trae todos los funcionarios de esta sucursal que al menos tengan un turno de hoy asociado
    const funcionarios = await prisma.funcionario.findMany({
        where: {
            sucursalId: sucursalIdNum,
            turnos: {
                some: {
                    creadoEn: { gte: hoy},
                }
            }
        },
        select: {
            id: true,
            numeroCaja: true,
            turnos: {
                //busca si tiene uno en atencion ahora mismo
                where: {
                    creadoEn: { gte: hoy},
                    estado: "EN_ATENCION"
                },
                //trae el numero
                select: { numero: true},
                take: 1,
            }
        }
    })

    const cajas = funcionarios.map((funcionario) => ({
        numeroCaja: funcionario.numeroCaja,
        estado: funcionario.turnos.length > 0 ? "ATENDIENDO" : "ESPERANDO",
        numeroTurno: funcionario.turnos.length > 0 ? funcionario.turnos[0]!.numero : null,
    }))

    return res.json({ cajas })
}