import type {Request, Response} from "express";
import {prisma} from "../prisma"
import {z} from "zod";
import { hashearCodigo } from "../utils/codigoTotem";
import jwt from "jsonwebtoken";
import { config } from "../config";

//descripcion de la forma que debe tener el pedido al dispositivo, un numero de sucursal y un codigo en texto
const esquemaActivacion = z.object({
    sucursalId: z.number().int(),
    codigo: z.string().max(20)
})

const DURACION_TOKEN_TOTEM = "365d"

export const activarTotem = async (req: Request, res: Response) => {
    const datos = esquemaActivacion.safeParse(req.body)

    if (!datos.success) {
        return res.status(400).json({ error: "Datos inválidos" })
    }

    const { sucursalId, codigo } = datos.data

    const hash = hashearCodigo(codigo)
    const ahora = new Date()

    //consume el codigo, si es correcto, no venció y no hay totem activo, lo activa y borra el codigo (porque es de un solo uso)
    const resultado = await prisma.totem.updateMany({
        where: {
            sucursalId,
            activo: false,
            codigoHash: hash,
            codigoVenceEn: { gt: ahora}
        },
        data: {
            activo: true,
            activadoEn: ahora,
            codigoHash: null,
            codigoGeneradoEn: null,
            codigoVenceEn: null
        }

        
    })

    if (resultado.count === 0) {
            return res.status(400).json({ error: "Código inválido o vencido"})
        }

    try{
        //lee la fila para obtener la version actual, q va dentro del token
        const totem = await prisma.totem.findUnique({ where: { sucursalId } })

        if (!totem) {
            return res.status(500).json({ error: "Error interno del servidor" })
        }

        //firma el token del tótem: lleva el rol, la sucursal y la version con la que se emitió
        const token = jwt.sign(
            { rol: "TOTEM", sucursalId, version: totem.version },
            config.jwtSecret,
            { expiresIn: DURACION_TOKEN_TOTEM }
        )

        return res.status(200).json({ token })
                
    } catch (error) {
        return res.status(500).json({error: "Error interno del servidor"})
    }

}