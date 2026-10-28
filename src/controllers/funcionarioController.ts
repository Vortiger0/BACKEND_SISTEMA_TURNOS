import type { Request, Response } from "express";
import { prisma } from "../prisma";
import { notificarTurnoLlamado, notificarProgresoCola } from "../services/pushService";
import {io} from "../socket"

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
        //el turno cerrado debe desaparecer de mis turnos
        io.emit ("cola-actualizada", { sucursalId: funcionario.sucursalId}) 
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
    void notificarTurnoLlamado(turnoActualizado,funcionario.numeroCaja)
        .then(()=>notificarProgresoCola(funcionario.sucursalId))
        .catch((error)=>console.error("[push] Error tras llamar turnos",error))

    //la tv debe mostrar el nuevo numero llamado
    io.emit("cola-actualizada", { sucursalId: funcionario.sucursalId})

    //devuelve el turno actualizado para que el front pueda mostrar en pantalla a quien se llama
    return res.json(turnoActualizado)

    
};

export const marcarAusente = async (req: Request, res: Response ) => {
    const funcionarioId = req.usuario?.id;

    if (!funcionarioId) {
        return res.status(401).json({ error: "No autenticado"})
    }

    // busca si el funcionario concreto tiene un turno en atencion ahora mismo
    const turnoEnAtencion = await prisma.turno.findFirst({
        where: {
            funcionarioId,
            estado: "EN_ATENCION",
        },
    })

    if (!turnoEnAtencion) {
            return res.status(400).json({ error: "No hay ningún turno en atención para marcar como ausente"})
    }

    //cambia el estado del turno una vez marcado a ausente
    await prisma.turno.update({
        where: {id: turnoEnAtencion.id},
        data: { estado: "AUSENTE"}
    })

    //si el turno vino del totem, entonces no hay ciudadano asociado a quien aplicarselo y se saltea todo el cálculo de ausencias
    if (turnoEnAtencion.ciudadanoId) {
        const ciudadano = await prisma.ciudadano.findUnique({
            where: { id: turnoEnAtencion.ciudadanoId},
        });

        //otro chequeo, confirma que que esa fila realmente exista en la bd, de existir
        // calcula y actualiza la ausencia sumandole +1 al contador (o resetea a 1 si pasaron 7 días si ausencia)
        //guarda la fecha de la ausencia, de llegar a 3, aplica suspensión de 24h

        
        if (ciudadano) {
            //prepara dos fechas de referencia, el momento actual y el punto exacto
            //de hace 7 dias para poder comparar mas abajo
            const ahora = new Date();
            const sieteDiasAtras = new Date();
            sieteDiasAtras.setDate(ahora.getDate() - 7);

            //decide si pasaron más de 7 días desde la ultima ausencia
            //Si fechaUltimaAusencia es null, esto da falso directo
            const yaPasaronSieteDias = 
            ciudadano.fechaUltimaAusencia && ciudadano.fechaUltimaAusencia < sieteDiasAtras

            //de haber pasado los 7 días, arranca el conteo de nuevo en 1;
            //caso contrario suma +1 al que ya tenía acumulado
            const nuevasAusencias = yaPasaronSieteDias ? 1 : ciudadano.ausenciasAcumuladas + 1;

            //guarda los datos, el campo suspendidoHasta tiene "?" ya que es opcional, a veces no está incluido si no se llegaron a 3 ausencias
            const datosActualizar: {
                ausenciasAcumuladas: number;
                fechaUltimaAusencia: Date;
                suspendidoHasta?: Date;
            } = {
                ausenciasAcumuladas: nuevasAusencias, //siempre tiene un valor real 1 o el conteo +1
                fechaUltimaAusencia: ahora, //registra que esta ausencia de ahora, es la mas reciente
            }

            //si el conteo llegó a 3 entra a aplicar la suspensión
            if (nuevasAusencias >= 3 ) {
                //calcula el momento exacto en que termina la suspension toma "ahora" como punto de partida y le suma 24 horas
                //ej 14:00 hoy la suspensión dura hasta 14:00 del día siguiente
                const suspendidoHasta = new Date();
                suspendidoHasta.setHours(suspendidoHasta.getHours() + 24);
                datosActualizar.suspendidoHasta = suspendidoHasta;
                //sobrescribe el valor de ausencias nuevamente a 0, reiniciandolo de ese modo
                datosActualizar.ausenciasAcumuladas = 0;
            }

            await prisma.ciudadano.update({
                where: { id: ciudadano.id},
                data: datosActualizar,
            });
        }
    }

    io.emit("cola-actualizada", { sucursalId: turnoEnAtencion.sucursalId}) //libera el cupo y la caja vuelve al estado de espera en la tv
    return res.json({ mensaje: "Turno marcado como ausente"})
}
