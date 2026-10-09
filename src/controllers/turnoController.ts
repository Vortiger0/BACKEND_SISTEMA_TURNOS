import type {Request, Response} from "express";
import { prisma } from "../prisma"
import {z} from "zod";

const sacarTurnoSchema = z.object({
    sucursalId: z.number().int().positive(),
})

//recibe un pedido para sacar un turno, confirma que venga con un sucursalId y lo deja listo en una variable
export const sacarTurno = async (req: Request, res: Response ) => {
    const resultado = sacarTurnoSchema.safeParse(req.body);

    if (!resultado.success){
        return res.status(400).json({ error: resultado.error.issues[0]?.message})
    }
    const { sucursalId } = resultado.data;

    //busca una fila de sucursal con un id exacto, si se manda uno que no corresponde corta aquí
    const sucursal = await prisma.sucursal.findUnique({
        where: {id: sucursalId},
    });

    if(!sucursal) {
        return res.status(404).json({error: "Sucursal no encontrada"});
    }

    //antes de sacar un turno se neceista confirmar que no hayan excepciones y la sucursal se encuentre dentro del horario de atención
    //primero crea un objeto con la fecha y hora actuales y lo limpia dejando en 00:00:00, esto es porque cualquier turno que saque alguien tendrá una hora concreta que no es validada en lo que está guardado en el campo fecha de la tabla excepción en la bd
    // ya que dicho campo al ser @db.Date solo tiene fecha, la hora la tiene en 00:00, por lo que cualquier horario distinto de ese, aunque se encuentren en el mismo día se saltaría la excepción.
    //por eso para poder comparar que la fecha en la que el usuario pide turno coincide con una excepción debemos tener la hora en la que hace esa solicitud en 00:00 para que no hayan problemas en el proceso.
    const hoy = new Date();
    hoy.setHours (0, 0, 0, 0);

    //confirma que no sea feriado/excepcion para esta sucursal
    //busca por sucursalId + fecha no es una combinación @@unique, esto quiere decir que pueden existir varias excepciones en una sucursal cargadas con el mismo día (por algun error) 
    //por lo que para eso usamos findFirst, para que aunque por error hubieran varias excepciones cargadas para el mismo día, con encontrar una ya alcanza.
    const esExcepcion = await prisma.excepcion.findFirst({
        where: {
            sucursalId,
            fecha: hoy,
        }
    });
    
    if(esExcepcion) {
        return res.status(400).json({error: "La sucursal no se encuentra disponible hoy para atención al público"})
    }
}