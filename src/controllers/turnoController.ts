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

    //como parte de saber que estamos en horario de atención para sacar turno, necesitamos saber que día de la semana es hoy
    //el bloque de arriba indicaba la fecha del calendario de hoy, con esto lo que hacemos es saber a que dia corresponde esa fecha exacta.
    const diasSemana = [
        "DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"
    ] as const;
    
    //devuelve un numero del 0 al 6, donde 0 es domingo, 1 es lunes, etc.
    const diaActual = diasSemana[new Date().getDay()];


    if (!diaActual) {
        return res.status(500).json({error: "Error interno al calcular dia"})
    }

    //Busca para la sucursal concreta, la fila completa de Horario que corresponde
    //al dia de hoy: trae si atiende ese día, y de cuándo a cuándo
    const horarioHoy = await prisma.horario.findUnique({
        where: {
            sucursalId_diaSemana: {
                sucursalId,
                diaSemana: diaActual
            }
            
        },
    })

    //cubre dos casos: que no exista ningun horario cargado para el día concreto (improbable pero no imposible)
    //o que exista pero con atiende en false (por ejemplo los domingos)
    if (!horarioHoy || !horarioHoy.atiende) {
        return res.status(400).json({error: "La sucursal no atiende hoy"})
    }

    //convertimos cada hora a minutos desde la medianoche (ej. las 10:30 son 630 minutos)
    //porque no se puede comparar una hora directamente como si fuera un número simple
    const ahora = new Date()
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes()
    
    const desde = horarioHoy.horaDesde;
    const horaDesdeMinutos = desde.getUTCHours() * 60 + desde.getUTCMinutes();

    const hasta = horarioHoy.horaHasta;
    const horaHastaMinutos = hasta.getUTCHours() * 60 + hasta.getUTCMinutes();
    const horaCorte = horaHastaMinutos - sucursal.margenCorte
    
    //valida si la hora actual esté en el rango de atención, si la hora actual
    //es menor que la hora en la que comienza a atender o es mayor a la hora en la que se deja de atender entonces estamos fuera de horario de atención
    if (horaActual < horaDesdeMinutos || horaActual > horaCorte ) {
        return res.status(400).json({error: "La sucursal está fuera de su horario de atención"})
    }

    //tope diario
    const turnosHoy = await prisma.turno.count({
        where: {
            sucursalId,
            creadoEn: {gte: hoy}, //gte significa mayor o igual que, como "hoy" está con la hora en 00:00 todos los turnos creado desde la medianoche de hoy en adelante
            //cuentan. basicamente esta pieza cuenta todos los turnos de hoy, dejando fuera a los de otros días.
            estado: {notIn: ["AUSENTE", "CANCELADO"]} //un turno cancelado o ausente nunca se usa, así que se excluye del conteo
        }
    })

    //si la cantidad de hoy ya alcanzó o superó el tope configurado se rechaza
    if (turnosHoy >= sucursal.maxTurnosDia ) {
        return res.status(400).json({error: "No hay turnos disponibles en esta sucursal por hoy"})
    }

    //turno único por organismo y suspensión por inasistencia
    //esta validacion es distinta ya que solo aplica a los que están logeados (no el totem que no tiene cuenta asociada). 
    const ciudadanoId = req.usuario?.id;

    if (ciudadanoId) {
        const ciudadano = await prisma.ciudadano.findUnique({
            where: {id: ciudadanoId},
        })

        if (!ciudadano) {
        return res.status(404).json({error: "Ciudadano no encontrado"})
        }
        
        //busca si hay una suspension y si la hay verifica que esa fecha de suspensión ya no haya pasado porque de lo contrario no debería bloquear nada
        if(ciudadano.suspendidoHasta && ciudadano.suspendidoHasta > new Date()) {
            return res.status(403).json({error:"Estás suspendido temporalmente por inasistencias"})
        }
        
        //un ciudadano no puede tener dos turnos activos en el mismo organismo
        //aquí se busca si el ciudadano concreto tiene algún turno activo o en atención en alguna sucursal del mismo organismo
        //de la sucursal en la que intenta sacar un turno ahora
        const turnoMismoOrganismo = await prisma.turno.findFirst({
            where: {
                ciudadanoId,
                estado: {in: ["ACTIVO", "EN_ATENCION"]},
                //mira si el organismo de la sucursal concreta coincide con el de la sucursal actual en la que se intenta sacar turno
                sucursal: {organismo: sucursal.organismo}
            }
        });
        if (turnoMismoOrganismo) {
            return res.status(400).json({error: "Ya tenés un turno activo en este organismo "})
        }
    }
 
    //obtiene el ultimo numero que salió en la sucursal
    //si por ejemplo ya salió el 1 2 y 3 esto obtiene ese último número al ordenarlo de forma descendente (3, 2, 1)
    const ultimoTurnoHoy = await prisma.turno.findFirst({
        where: {
            sucursalId,
            creadoEn: {gte: hoy}
        },
        orderBy: { numero: "desc"},
    })

    //una vez obtiene ese número le suma uno para darle el número que será el que obtenga la persona que está sacando turno
    const siguienteNumero = ultimoTurnoHoy ? ultimoTurnoHoy.numero + 1 : 1;


    //crea la fila del turno y si corresponde, quien lo sacó. 
    const turnoCreado = await prisma.turno.create({
        data: {
            numero: siguienteNumero,
            estado: "ACTIVO",
            sucursalId,
            ciudadanoId: ciudadanoId ?? null,
        }
    })
    return res.status(201).json(turnoCreado);
}   

//busca todos los turnos activos o en atencion del ciudadano
export const misTurnos = async (req: Request, res: Response) => {
    //lee el id del ciudadano desde el token
    const ciudadanoId = req.usuario?.id;

    if (!ciudadanoId) {
        return res.status(401).json({ error: "No autenticado" });
    }
    //trae las filas que cumplan esa condicion
    const turnos = await prisma.turno.findMany({
        where: {
            ciudadanoId,
            estado: { in: ["ACTIVO", "EN_ATENCION"] },
        },
        //trae los datos que son útiles para mostrar en pantalla en la sección de mis turnos
        select: {
            id: true,
            numero: true,
            estado: true,
            creadoEn: true,
            sucursal: {
                select: { nombre: true, organismo: true },
            },
        },
        //ordena del turno mas reciente al mas viejo
        orderBy: { creadoEn: "desc" },
    });

    return res.json(turnos);
};

//cancela un turno del ciudadano logeado, primero confirma que haya sesion después lee y valida el id del turno que viene en la url
export const cancelarTurno = async (req: Request, res: Response) => {
   //id sacado del token verificado
    const ciudadanoId = req.usuario?.id;

    if (!ciudadanoId) {
        return res.status(401).json({error: "No autenticado"});
    }

    //el id del turno viaja en la url, por eso se lee el req.params y no el body
    const {id} = req.params;

    if (!id) {
        return res.status(400).json({error: "Falta el id del turno"})
    }

    //hay que convertir el req.params que siempre da texto a número antes de usarlo en la consulta de prisma
    //tambien confirma que la conversion haya funcionado sino el valor Number da NaN
    const turnoId = Number(id);

    if (isNaN(turnoId)) {
        return res.status(400).json({error: "El id del turno no es válido"})
    }
    //busca el turno por su id sin ningun filtro
    const turno = await prisma.turno.findUnique({
        where: {id: turnoId},
    })
    //cubre dos casos, que el turno no exista o que exista pero le pertenezca a otro ciudadano, de darse alguno da error
    if (!turno || turno.ciudadanoId !== ciudadanoId) {
        return res.status(404).json({error: "Turno no encontrado"})
    }
    //mientras el turno esté en activo se puede cancelar
    if (turno.estado !== "ACTIVO") {
        return res.status(400).json({error: "Este turno no se puede cancelar"});
    }

    //actualiza el estado a cancelado 
    await prisma.turno.update({
        where: {id: turnoId},
        data: {estado: "CANCELADO"},
    });
    return res.json({mensaje: "Turno cancelado correctamente"})
}

// Función para devolver la fila virtual con 5 turnos previos activos actuales hacia el front
export const obtenerFilaVirtual = async (req: Request, res: Response) => {
    const ciudadanoId = req.usuario?.id

    if (!ciudadanoId) {
        return res.status(401).json({ error: "No autenticado"})
    }

    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "Falta el id del turno" });
    }

    const turnoIdNum = Number(id);

    if (isNaN(turnoIdNum)) {
        return res.status(400).json({ error: "El id del turno no es válido" });
    }

    const turnoUsuario = await prisma.turno.findUnique({
        where: { id: turnoIdNum },
        select: { id: true, sucursalId: true, numero: true, ciudadanoId: true }
    });

    if (!turnoUsuario || turnoUsuario.ciudadanoId !== ciudadanoId) {
        return res.status(404).json({ error: "Turno no encontrado" });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const turnosPrevios = await prisma.turno.findMany({
        where: {
            sucursalId: turnoUsuario.sucursalId,
            estado: { in: ["ACTIVO"] }, // Solo los que están activos/en espera
            creadoEn: { gte: hoy },     // Creados hoy
            numero: { lt: turnoUsuario.numero } // Números anteriores al de la persona que consulta la fila
        },
        orderBy: {
            numero: 'desc' // Del más cercano a la persona hacia atrás (ej: 3, 2, 1)
        },
        take: 5,     // Tomamos los 5 turnos con su ID, NRO, Fecha de creación y ESTADO
        select: {
            id: true,
            numero: true,
            creadoEn: true,
            estado: true
        }
    });

    return res.json({
        miTurno: turnoUsuario.numero,
        filaVirtual: turnosPrevios
    });
};