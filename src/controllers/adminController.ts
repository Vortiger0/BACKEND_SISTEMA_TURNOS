import type {Request, Response} from "express";
import {prisma} from "../prisma"
import {z} from "zod";
import { DiaSemana } from "../../generated/prisma/enums";

//valida los datos del día individual dentro del array horarios, que día de la semana es, si atiende ese día y en qué horario
const horarioDiaSchema = z.object({
    diaSemana: z.enum(["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]),
    atiende: z.boolean(),
    horaDesde: z.string(),
    horaHasta: z.string(),
})


//valida todo lo que se guarda junto desde la pantalla de horarios del admin
const actualizarHorariosSchema = z.object({
    horarios: z.array(horarioDiaSchema).length(7),
    margenCorte: z.number().int().min(0),
    umbralPocoOcupado: z.number().int().positive(),
    umbralOcupado: z.number().int().positive(),
    maxTurnosDia: z.number().int().positive(),
    cantidadCajas: z.number().int().positive(),
})

export const actualizarHorarios = async (req: Request, res: Response) => {
    const adminId = req.usuario?.id;

    if (!adminId) {
        return res.status(401).json({ error: "No autenticado"});

    }

    const admin = await prisma.admin.findUnique({
        where: {id: adminId},
    })

    if (!admin){
        return res.status(404).json({error: "Administrador no encontrado"});

    }

    //valida que vengan los campos esperados con el formato correcto
    const resultado = actualizarHorariosSchema.safeParse(req.body);

    if (!resultado.success) {
        return res.status(400).json({error: resultado.error.issues[0]?.message})
    }

    const { horarios, margenCorte, umbralPocoOcupado, umbralOcupado, maxTurnosDia, cantidadCajas} = resultado.data

    if (umbralOcupado <= umbralPocoOcupado ) {
        return res.status(400).json({error: "El umbral de Ocupado debe ser mayor al de Poco Ocupado "})
    }

    await prisma.sucursal.update({
        where: { id: admin.sucursalId},
        data: {
            margenCorte,
            umbralPocoOcupado,
            umbralOcupado,
            maxTurnosDia,
            cantidadCajas
        }
    })

    for (const dia of horarios) {
        await prisma.horario.update({
            where: {
                sucursalId_diaSemana: {
                    sucursalId: admin.sucursalId,
                    diaSemana: dia.diaSemana,
                }
            },
            data: {
                atiende: dia.atiende,
                horaDesde: new Date(`1970-01-01T${dia.horaDesde}:00`),
                horaHasta: new Date(`1970-01-01T${dia.horaHasta}:00`),
            }
        });
    }

    return res.json({ mensaje: "Horarios actualizados correctamente"})


}