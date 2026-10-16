import type {Request, Response} from "express";
import {prisma} from "../prisma"
import {z} from "zod";
import { error } from "node:console";

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

    //el for toma los 7 objetos que llegaron en horarios(uno por cada dia de la semana), por cada uno actualiza la fila correspondiente de horario en la base
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
                horaDesde: new Date(`1970-01-01T${dia.horaDesde}:00Z`),
                horaHasta: new Date(`1970-01-01T${dia.horaHasta}:00Z`),
            }
        });
    }

    return res.json({ mensaje: "Horarios actualizados correctamente"})

   
}

// valida que vega una fecha como texto en el body (ej: "2026-08-25")
 const crearExcepcionSchema = z.object({
        fecha: z.string(),
    });

// agrega una fecha puntual (feriado) en la que la sucursal del Admin no atiende
export const crearExcepcion = async (req: Request, res: Response) => {
        const adminId = req.usuario?.id

        if (!adminId) {
            return res.status(401).json({error: "No autenticado"})
        }

        //trae los datos completos del admin
        const admin = await prisma.admin.findUnique({
            where: { id: adminId},
        });

        if (!admin){
            return res.status(404).json({ error: "Administrador no encontrado"})
        }

        //vlida que venga el campo fecha con el formato esperado
        const resultado = crearExcepcionSchema.safeParse(req.body);

        if (!resultado.success) {
            return res.status(400).json({ error: resultado.error.issues[0]?.message})
        }

        const { fecha } = resultado.data;
        //convierte el texto a un objeto Date real, y lo normaliza a medianoche (00:00), para comparar siempre con esa hora.
        const fechaConvertida = new Date(fecha);
        fechaConvertida.setHours(0, 0, 0, 0);

        const yaExiste = await prisma.excepcion.findFirst({
            where: {
                sucursalId: admin.sucursalId,
                fecha: fechaConvertida,
            }
        })

        if (yaExiste){
            return res.status(400).json({ error: "Ya existe una excepcion para esta fecha"});
        }

        const excepcionCreada = await prisma.excepcion.create({
            data: {
                sucursalId: admin.sucursalId,
                fecha: fechaConvertida
            }
        })

        return res.status(201).json(excepcionCreada)
    }