import type {Request, Response} from "express";
import {prisma} from "../prisma"
import {z} from "zod";
import bcrypt from "bcryptjs";


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
        const fechaConvertida = new Date(`${fecha}T00:00:00Z`);

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

    export const eliminarExcepcion = async (req: Request, res: Response) => {
        const adminId = req.usuario?.id;
        //busca si ese admin está autenticado
        if (!adminId) {
            return res.status(401).json({ error : "Administrador no encontrado"})
        }

        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
        });
        
        //trae sus datos completos para confirmar que la excepción corresponda a su sucursal

        if (!admin) {
            return res.status(404).json({ error: "Administrador no encontrado" });
        }

        const {id} = req.params;

        if (!id){
            return res.status(400).json({ error: "Falta el id de la excepción"});

        }

        //convierte el texto de la url a numero
        const excepcionId = Number(id);

        if (isNaN (excepcionId)) {
            return res.status(400).json({error: "El id no es válido"})
        }
        //busca la excepcion en la base y confirma que venga de la sucursal de este admin
        const excepcion = await prisma.excepcion.findUnique({
            where: { id: excepcionId},
        });

        if (!excepcion || excepcion.sucursalId !== admin.sucursalId) {
            return res.status(404).json({ error: "Excepción no encontrada"})
        }

        //borra la fila
        await prisma.excepcion.delete({
            where: {id: excepcionId},
        });
        
        return res.json({ mensaje: "Excepción eliminada correctamente"})
    }

    //trae toda la configuración actual de la parte de horarios para que el frontend pueda precargar el formulario con los valores reales.
    export const obtenerConfiguracion = async (req: Request, res: Response) => {
        const adminId = req.usuario?.id;

        if (!adminId) {
            return res.status(401).json({ error: "No autenticado"})
        }

        const admin = await prisma.admin.findUnique ({
            where: {id: adminId},
        })
 
        if (!admin) {
            return res.status(404).json({ error: "Administrador no encontrado"});
        }

        //trae los campos de configuracion. Todos los horarios y excepciones de la sucursal específica.
        const sucursal = await prisma.sucursal.findUnique({
            where: {id: admin.sucursalId},
            select: {
                margenCorte: true,
                umbralPocoOcupado: true,
                umbralOcupado: true,
                maxTurnosDia: true,
                cantidadCajas: true,
                horarios: true,
                excepciones: true,
            }
        });

        if (!sucursal) {
            return res.status(404).json({ error: "Sucursal no encontrada"})
        }

        return res.json(sucursal)
    }

    export const listarFuncionarios = async (req: Request, res: Response) => {
        const adminId = req.usuario?.id;

        if (!adminId) {
            return res.status(401).json({ error: "No autenticado"});
        }

        const admin = await prisma.admin.findUnique({
            where: { id: adminId},
        })

        if (!admin){
            return res.status(404).json({error: "Administrador no encontrado"})
        }
        //devuelve todos los funcionarios de la sucursal del admin logueado
        const funcionarios = await prisma.funcionario.findMany({
            where: { sucursalId: admin.sucursalId},
            select: {
                id: true,
                nombreUsuario: true,
                numeroCaja: true,
                usuario: {
                    select: { nombreCompleto: true},
                }
            }
        })

        return res.json(funcionarios);
        
    
    }

    const crearFuncionarioSchema = z.object({
        nombreCompleto: z.string().min(1, "El nombre es obligatorio"),
        nombreUsuario: z.string().min(3, "El usuario debe tener al menos 3 caracteres"),
        numeroCaja: z.number().int().positive(),
        contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres")
                    .regex(/[^A-Za-z0-9]/, "La contraseña debe tener al menos un carácter especial")
    });

    //el admin da de alta a un funcionario nuevo asignandole, nombre, usuario, numero de caja y contra inicial
    export const crearFuncionario = async (req: Request, res: Response) => {
        const adminId = req.usuario?.id;

        if (!adminId) {
        return res.status(401).json({ error: "No autenticado" });
    }

    const admin = await prisma.admin.findUnique({
        where: { id: adminId },
    });

    if (!admin) {
        return res.status(404).json({ error: "Administrador no encontrado" });
    }

    const resultado = crearFuncionarioSchema.safeParse(req.body);

    if (!resultado.success) {
        return res.status(400).json({ error: resultado.error.issues[0]?.message})
    }

    const {nombreCompleto, nombreUsuario, numeroCaja, contrasena} = resultado.data

    //se debe validar que numeroCaja no supere a cantidadCajas y que no esté ocupada
    const sucursal = await prisma.sucursal.findUnique({
        where: { id: admin.sucursalId}
    })

    if (!sucursal) {
        return res.status(404).json({ error: "Sucursal no encontrada"});
    }

    if (numeroCaja > sucursal.cantidadCajas) {
        return res.status(400).json({ error: `La sucursal solo tiene ${sucursal.cantidadCajas} cajas configuradas`})
    }

    const cajaOcupada = await prisma.funcionario.findFirst({
        where: {
            sucursalId: admin.sucursalId,
            numeroCaja,
        }
    })

    if (cajaOcupada){
        return res.status(400).json({ error: "Esa caja ya está asignada a otro funcionario"})
    }

    //Se hashea la contra y se crea al funcionario, para ello primero se crea la fila de Usuario (ya que de ahí sale el ID del funcionario) para
    //luego crear la fila del funcionario en sí. 
    const contrasenaHasheada = await bcrypt.hash(contrasena, 10);

    const usuario = await prisma.usuario.create({
        data: {
            nombreCompleto,
            contrasena: contrasenaHasheada,
            rol: "FUNCIONARIO"
        }
    });

    const funcionarioCreado = await prisma.funcionario.create({
        data: {
            id: usuario.id,
            nombreUsuario,
            numeroCaja,
            sucursalId: admin.sucursalId
        }
    })
     return res.status(201).json(funcionarioCreado);
    }

    const editarFuncionarioSchema = z.object({
        nombreCompleto: z.string().min(1, "El nombre es obligatorio"),
        nombreUsuario: z.string().min(3, "El usuario debe tener al menos 3 caracteres"),
        numeroCaja: z.number().int().positive(),
        contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres")
        .regex(/[^A-Za-z0-9]/, "La contraseña debe tener al menos un carácter especial").optional(),
    })

    export const editarFuncionario = async (req: Request, res: Response) => {
        const adminId = req.usuario?.id;

        if (!adminId) {
            return res.status(401).json({ error: "No autenticado" });
        }

        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
        });

        if (!admin) {
            return res.status(404).json({ error: "Administrador no encontrado" });
        }

        //lee el id del funcionario concreto desde la url
        const { id } = req.params;
        
        //si no vino nada en la url corta aquí
        if (!id) {
            return res.status(400).json({error: "Falta el id del funcionario"});
        }

        //convierte el id a número
        const funcionarioId = Number(id);

        //confirma que la conversión haya funcionado
        if (isNaN(funcionarioId)){
            return res.status(400).json({error: "El id no es válido"})
        }

        const resultado = editarFuncionarioSchema.safeParse(req.body);

        if (!resultado.success) {
            return res.status(400).json({error: resultado.error.issues[0]?.message});
        }

        //busca el funcionario a editar, y confirma que pertenezca a la sucursal de este admin concreto
        const { nombreCompleto, nombreUsuario, numeroCaja, contrasena} = resultado.data;

        const funcionario = await prisma.funcionario.findUnique({
            where: { id: funcionarioId},
        });

        if (!funcionario || funcionario.sucursalId !== admin.sucursalId) {
            return res.status(404).json({ error: "Funcionario no encontrado"});
        }

        //trae la sucursal para validar la caja elegida contra la cantidad real configurada
        const sucursal = await prisma.sucursal.findUnique({
            where: { id: admin.sucursalId},
        })

        if (!sucursal) {
            return res.status(404).json({ error: "Sucursal no encontrada"})
        }

        //valida que no se asignen cajas que no existan segun la config
        if (numeroCaja > sucursal.cantidadCajas) {
            return res.status(400).json({error: `La sucursal solo tiene ${sucursal.cantidadCajas} cajas configuradas`})
        }

        //solo chequea si la caja está ocupada cuando el admin la está cambiando
        if (numeroCaja !== funcionario.numeroCaja) {
            const cajaOcupada = await prisma.funcionario.findFirst({
                where: {
                    sucursalId: admin.sucursalId,
                    numeroCaja
                }
            })

            if (cajaOcupada) {
                return res.status(400).json({ error: "Esa caja ya está asignada a otro funcionario"})
            }
        }

        //si se mandó una contra nueva, se debe hashear y actualizar Usuario. Si no se mandó nada 
        //porque es opcional, se deja la antigua contraseña intacta.
        const datosUsuario: { nombreCompleto: string, contrasena?: string} = {
            nombreCompleto,
        };

        if (contrasena) {
            datosUsuario.contrasena = await bcrypt.hash(contrasena,10);
        }

        await prisma.usuario.update({
            where: { id: funcionarioId},
            data: datosUsuario,
        })

        const funcionarioActualizado = await prisma.funcionario.update({
            where: { id: funcionarioId},
            data: {
                nombreUsuario,
                numeroCaja
            }
        })

        return res.json(funcionarioActualizado);
    }

    export const eliminarFuncionario = async (req: Request, res: Response) => {
        const adminId = req.usuario?.id

        if (!adminId){
            return res.status(401).json({ error: "No autenticado"});
        }

        const admin = await prisma.admin.findUnique({
            where: { id: adminId}, 
        });

        if (!admin){
            return res.status(404).json({ error: "Administrador no encontrado"})
        }

        const {id} = req.params;

        if (!id){
            return res.status(400).json({ error: "Falta el id del funcionario"})
        }

        const funcionarioId = Number(id);

        if (isNaN(funcionarioId)){
            return res.status(400).json({error: "El id no es válido"})
        }

        const funcionario = await prisma.funcionario.findUnique({
            where: { id: funcionarioId},
        });

        if (!funcionario || funcionario.sucursalId !== admin.sucursalId) {
            return res.status(404).json({error: "Funcionario no encontrado"})

        }

        //Luego de las validaciones y de encontrar al funcionario prosigue con la eliminación
        //primero "desvincula" todos los turnos que este funcionario haya atendido para que la bd no lo rechace el borrado por la relacion entre funcionario y turno
        await prisma.turno.updateMany({
            where: {funcionarioId: funcionarioId},
            data: { funcionarioId: null},
        });
        //borra al funcionario y luego al usuario
        await prisma.funcionario.delete({
            where: { id: funcionarioId},
        });

        await prisma.usuario.delete({
            where: { id: funcionarioId}
        })

        return res.json({ mensaje: "Funcionario eliminado correctamente"})

    }

    //valida los 4 datos que el admin puede editar en datos del local
    const actualizarDatosLocalSchema = z.object({
        direccion: z.string().min(1, "La dirección es obligatoria"),
        telefono: z.string().min(1, "El teléfono es obligatorio"),
        latitud: z.number(),
        longitud: z.number(),
    });
    
    export const actualizarDatosLocal = async (req: Request, res: Response) => {
        const adminId = req.usuario?.id;

        if (!adminId) {
            return res.status(401).json({ error: "No autenticado" });
        }

        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
        });

        if (!admin) {
        return res.status(404).json({ error: "Administrador no encontrado" });
        }

        const resultado = actualizarDatosLocalSchema.safeParse(req.body);

        if (!resultado.success){
            return res.status(400).json({error: resultado.error.issues[0]?.message})
        }

        const {direccion, telefono, latitud, longitud} = resultado.data;

        await prisma.sucursal.update({
            where: {id: admin.sucursalId},
            data: {direccion, telefono, latitud, longitud},
        })

        return res.json({mensaje: "Datos del local actualizados correctamente"})

    }

    export const obtenerDatosLocal = async (req: Request, res:Response) => {
        const adminId = req.usuario?.id;

        if (!adminId) {
            return res.status(401).json({ error: "No autenticado" });
        }

        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
        });

        if (!admin) {
            return res.status(404).json({ error: "Administrador no encontrado" });
        }

        const sucursal = await prisma.sucursal.findUnique({
            where: {id: admin.sucursalId},
            select: {
                direccion: true,
                telefono: true,
                latitud: true,
                longitud: true,
            }
        })

        if (!sucursal) {
            return res.status(404).json({ error: "Sucursal no encontrada"});
        }

        return res.json(sucursal);
    }

//para la pantalla principal del admin
export const obtenerResumenInicio = async (req: Request, res: Response) => {
    const adminId = req.usuario?.id;

    if (!adminId) {
        return res.status(401).json({ error: "No autenticado" });
    }

    const admin = await prisma.admin.findUnique({
        where: { id: adminId },
    });

    if (!admin) {
        return res.status(404).json({ error: "Administrador no encontrado" });
}

    const hoy = new Date();
    hoy.setHours(0,0,0,0)

    //cuenta los turnos de hoy excluyendo los que liberaron cupo
    const turnosHoy = await prisma.turno.count({
        where: {
            sucursalId: admin.sucursalId,
            creadoEn: { gte: hoy},
            estado: {notIn: ["AUSENTE", "CANCELADO"]}
        },
    })

    //cuenta solo los turnos en finalizado de hoy
    const atendidosHoy = await prisma.turno.count({
        where: {
            sucursalId: admin.sucursalId,
            creadoEn: { gte: hoy},
            estado: "FINALIZADO",
        }
    })

    //cuenta solo los ausentes de hoy
    const ausentesHoy = await prisma.turno.count({
        where: {
            sucursalId: admin.sucursalId,
            creadoEn: { gte: hoy},
            estado: "AUSENTE",
        }
    });

    //busca el turno mas reciente que haya sido llamado hoy
    const ultimoLlamado = await prisma.turno.findFirst({
        where: {
            sucursalId: admin.sucursalId,
            creadoEn: { gte: hoy},
            llamadoEn: { not: null},
        },
        orderBy: { llamadoEn: "desc"}
    })

    const sucursal = await prisma.sucursal.findUnique({
        where: {id: admin.sucursalId},
    })

    if (!sucursal){
        return res.status(404).json({ error: "Sucursal no encontrada"})
    }

    //busca el horario del día actual y si el local atiende hoy y la hora cae dentro del rango
    //lo marca como abierto, en otro caso, cerrado.
    const diasSemana = [
        "DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"
    ] as const;

    const diaActual = diasSemana[new Date().getDay()];

    const horarioHoy = await prisma.horario.findUnique({
        where: {
            sucursalId_diaSemana: {
                sucursalId: admin.sucursalId,
                diaSemana: diaActual!,
            }
        }
    })

    //estado del local en la pantalla inicio de admin
   let estadoLocal = "Cerrado";

   const esExcepcionHoy = await prisma.excepcion.findFirst({
    where: {
        sucursalId: admin.sucursalId,
        fecha: hoy
    }
   })
   
   if (!esExcepcionHoy && horarioHoy && horarioHoy.atiende) {
    const ahora = new Date()
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();

    const horaDesdeMinutos = horarioHoy.horaDesde.getUTCHours() * 60 + horarioHoy.horaDesde.getUTCMinutes()
    const horaHastaMinutos = horarioHoy.horaHasta.getUTCHours() * 60 + horarioHoy.horaHasta.getUTCMinutes();

    if (horaActual >= horaDesdeMinutos && horaActual <= horaHastaMinutos ) {
        estadoLocal = "Abierto";
    }
   }

   return res.json({
    turnosHoy,
    numeroActual: ultimoLlamado ? ultimoLlamado.numero : null,
    estadoLocal,
    atendidosHoy,
    ausentesHoy
   })


}
