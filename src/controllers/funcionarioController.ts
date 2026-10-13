import type { Request, Response } from "express";
import { prisma } from "../prisma";

//confirma que quien está pidiendo "siguiente" sea un funcionario real
export const siguienteTurno = async (req: Request, res: Response) => {
    const funcionarioId = req.usuario?.id;

    if (!funcionarioId) {
        return res.status(401).json({ error: "No autenticado"})

    }

    //busca los datos completos de ese funcionario, no basta solo con el id (que ya lo trae el token) se necesita traer el resto de su fila, en especial para saber a que sucursal está asignado.
    const funcionario = await prisma.funcionario.findUnique({
        where: { id: funcionarioId},
    })
    
    if(!funcionario){
        return res.status(404).json({ error: "Funcionario no encontrado"})
    }

    //busca si este funcionario especifico tiene un turno en atencion en este momento
    const turnoEnAtencion = await prisma.turno.findFirst({
        where: {
            sucursalId: funcionario.sucursalId,
            funcionarioId: funcionario.id,
            estado: "EN_ATENCION"
        }
    });
    //si encontró uno, lo cierra como finalizado antes de llamar al siguiente. Si es la primera vez en el día en la que toca este botón no habrá ninguno, y este bloque no hará nada
    if (turnoEnAtencion) {
        await prisma.turno.update({
            where: {id: turnoEnAtencion.id},
            data: { estado: "FINALIZADO"},
        }); 
    }
    //busca el próximo turno esperado en la fila de la sucursal 
    const siguienteTurno = await prisma.turno.findFirst({
        where: {
            sucursalId: funcionario.sucursalId,
            estado: "ACTIVO"
        },
        // trae los numeros de menor a mayor, así combinado con findFirst trae el turno con el número más bajo pendiente
        orderBy: {numero: "asc"}
    });

    //si no hay ninguno esperando a ser atendido retorna este mensaje
    if (!siguienteTurno) {
        return res.json({ mensaje: "No hay turnos esperando en la fila"})
    }

    // al que llama pasa a estar en atencion, queda asignado al funcionario concreto y se registra el momento exacto en el que lo llamó
    const turnoActualizado = await prisma.turno.update({
        where: {id: siguienteTurno.id},
        data: {
            estado: "EN_ATENCION",
            funcionarioId: funcionarioId,
            llamadoEn: new Date(),
        }
    });
    //devuelve el turno actualizado para que el front pueda mostrar en pantalla a quien se llama
    return res.json(turnoActualizado)
};
