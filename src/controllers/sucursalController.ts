import type {Request, Response } from "express"
import {prisma} from "../prisma";
import type { Horario } from '../../generated/prisma/client'
import { login } from "./authController";


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

// recibe un array con los horarios y devuelve un string que será el texto que se mostrará en la vista previa
// como "Lun a Vie: 09:00-18:00" por ej."
const formatearHorarios = (horarios: Horario[]): string => {
    const diasOrdenados = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO" ];

    const abreviatura: Record<string, string> = {
        LUNES: "Lun", MARTES: "Mar", MIERCOLES: "Mié", JUEVES: "Jue", VIERNES: "Vie", SABADO: "Sáb", DOMINGO: "Dom"
    }

    //reordena los 7 horarios poniendolos en el orden correcto
    const ordenados = diasOrdenados
        .map((dia) => horarios.find((h) => h.diaSemana === dia))
        .filter((h): h is Horario => h !== undefined);

    //array donde se guardan los textos ya armados 
    const tramos: string[] = []
    //array que junta los días con el mismo horario
    let grupoActual: typeof ordenados = [];

    //compara dos horarios y dice si son exactamente iguales 
    const mismoHorario = (a: Horario, b: Horario) =>
        a.atiende === b.atiende &&
        a.horaDesde.getTime() === b.horaDesde.getTime() &&
        a.horaHasta.getTime() === b.horaHasta.getTime();

    // recorre los 7 días uno por uno
    for (const horario of ordenados) {
        //si el grupo está vacio (primer día) o el día actual tiene el mismo horario que el último agregado, lo suma al mismo grupo
        if (grupoActual.length === 0 || mismoHorario(grupoActual[grupoActual.length - 1]!, horario)) {
            grupoActual.push(horario);
        } else {
            //si cambió el horario, cierra el grupo anterior (lo convierte en texto y lo guarda en tramos)
            //y arranca un grupo nuevo con el día actual
            tramos.push(formatearTramo(grupoActual, abreviatura));
            grupoActual = [horario];
        }
    }
    //al salir del for puede quedar un grupo sin cerrar (el ultimo), esto lo cierra
    if (grupoActual.length > 0) {
        tramos.push(formatearTramo(grupoActual, abreviatura));
    }

    //une todos los textos armados, separados 
    return tramos.join(" | ")
}

//recibe un grupo y el diccionario de abreviaturas y devuelve el texto final de ese tramo
const formatearTramo = (grupo: Horario[], abreviatura: Record<string, string>): string => {
    const primero = grupo[0]!;
    const etiquetaDias = grupo.length === 1

        ? abreviatura[primero.diaSemana]
        : `${abreviatura[primero.diaSemana]} a ${abreviatura[grupo[grupo.length - 1]!.diaSemana]}`

    if (!primero.atiende) {
        return `${etiquetaDias}: Cerrado`;
    }

    const desde = primero.horaDesde.toISOString().slice(11, 16);
    const hasta = primero.horaHasta.toISOString().slice(11, 16);
    return `${etiquetaDias}: ${desde} - ${hasta}`;

}


export const listarSucursales = async (req: Request, res:Response) => {
    //Trae todas las sucursales con sus datos
    const sucursales = await prisma.sucursal.findMany({
        select: {
            id: true,
            nombre: true,
            organismo: true,
            direccion: true,
            telefono: true,
            latitud: true,
            longitud: true,
            umbralPocoOcupado: true,
            umbralOcupado: true,
            horarios: true,
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
    telefono: sucursal.telefono,
    latitud: sucursal.latitud,
    longitud: sucursal.longitud,
    horarios: formatearHorarios(sucursal.horarios),
    turnosPendientes: sucursal._count.turnos,
    concurrencia: calcularConcurrencia (
        sucursal._count.turnos,
        sucursal.umbralPocoOcupado,
        sucursal.umbralOcupado
    )
})) 
    return res.json(resultado);

}


