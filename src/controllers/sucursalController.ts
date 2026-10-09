import type {Request, Response } from "express"
import {prisma} from "../prisma";


const calcularConcurrencia = (
    turnosPendientes: number,
    umbralPocoOcupado: number,
    umbralOcupado: number
) => {
    if (turnosPendientes <= umbralPocoOcupado) {
        return "Poco ocupado";
    }
    if (turnosPendientes <= umbralOcupado) {
        return "Ocupado"
    }
    return "Muy ocupado"
}

export const listarSucursales = async (req: Request, res:Response) => {
    //Trae todas las sucursales con sus datos
    const sucursales = await prisma.sucursal.findMany({
        select: {
            id: true,
            nombre: true,
            organismo: true,
            direccion: true,
            umbralPocoOcupado: true,
            umbralOcupado: true,
            //funcion especial de prisma para contabilizar unicamente los turnos activos y en atención.
            _count: {
                select: {
                    turnos: {
                        where: {estado: {in: ["ACTIVO", "EN_ATENCION"]}},
                    }
                }
            }
        }
    })
    //map es una propiedad que recorre un array para entregar un resultado más simple con solo los campos que el frontend necesita
    const resultado = sucursales.map((sucursal) => ({
    id: sucursal.id,
    nombre: sucursal.nombre,
    organismo: sucursal.organismo,
    direccion: sucursal.direccion,
    turnosPendientes: sucursal._count.turnos,
    concurrencia: calcularConcurrencia (
        sucursal._count.turnos,
        sucursal.umbralPocoOcupado,
        sucursal.umbralOcupado
    )
})) 
    return res.json(resultado);

}


