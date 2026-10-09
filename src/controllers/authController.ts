import type { Request, Response } from 'express';   
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { enviarCorreoVerificacion } from "../mailer";
import { z } from "zod";
import { prisma } from "../prisma";

//lo que hace zod es validar los datos que vienen en el body de la peticion, si no cumplen con las reglas que definimos, zod nos va a tirar un error y no va a dejar que se ejecute el resto del codigo
//por ej en el nombre de usuario, si no viene un string de al menos un caracter, zod nos va a tirar un error y no va a dejar que se ejecute el resto del codigo
//zemail valida que el formato del correo sea correcto
const registroSchema = z.object({
    nombreCompleto: z.string().min(1, "El nombre es obligatorio"),
    correo: z.email("El correo no es válido"),
    contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
})

//esta funcion lo que hace es recibir los datos del ciudadano y validarlos para guardarlos en la bd de ser correctos
export const registrarCiudadano = async (req: Request, res: Response) => {
    // safeparse es un metodo de zod que se encargará de validar los datos que vienen en el body de la peticion
    const resultado = registroSchema.safeParse(req.body);

    if (!resultado.success) {
        return res.status(400).json({ error: resultado.error.issues[0]?.message });
    }

    //procede con el registro del ciudadano
    const { nombreCompleto, correo, contrasena } = resultado.data;

    //consulta si ya hay un ciudadano con el mismo correo en la bd
    const ciudadanoExistente = await prisma.ciudadano.findUnique({
        where: { correo },
    });

    if (ciudadanoExistente) {
        return res.status(400).json({ error: "El correo ya está registrado" });
    }

    const contrasenaHasheada = await bcrypt.hash(contrasena, 10);
    
    //cuando se pasan las validaciones, se crea el usuario base y con el id el ciudadano
    const usuario = await prisma.usuario.create({
        data: {
            nombreCompleto,
            contrasena: contrasenaHasheada,
            rol: "CIUDADANO",
        }
    });

    await prisma.ciudadano.create({
        data: {
            id: usuario.id,
            correo,
        }
    })

    //se genera un token de verificacion que expira en 1 hora y se envia al correo del usuario para que pueda verificar su cuenta
    const tokenVerificacion = 
        jwt.sign({ id: usuario.id }, //esto es el payload, lo que hace es obtener del id del usuario cuando haga click en en enlace de verificación para poder identificarlo y cambiar su estado a verificado 
        config.jwtSecret, //esto es el jwt secret que se encuentra en el archivo .env, es una cadena de texto que se utiliza para firmar y verificar el token con el fin de que no pueda ser modificado por terceros
        { expiresIn: "1d" }); //tiempo que dura el token antes de expirar, en este caso 1 dia
    
    //espera a que se envie el correo de verificacion al usuario con el token generado
    await enviarCorreoVerificacion(correo, tokenVerificacion);

    return res.status(201).json({message: "Cuenta creada correctamente. Por favor, verifica tu correo electrónico."});
   };


//parte final del proceso de verificación, esta funcion verifica el token que se le pasa por parametro y si es valido, cambia el estado del ciudadano a verificado en la bd
export const verificarCorreo = async (req: Request, res: Response) => {
    const { token } = req.params;

    if (typeof token !== "string" || token.length === 0) {
        return res.status(400).json({ error: "Token de verificación no proporcionado." });
    }

    try {
        const payload = jwt.verify(token, config.jwtSecret) as unknown as { id: number };

        await prisma.ciudadano.update({
            where: { id: payload.id },
            data: { correoVerificado: true },
        });

        return res.send(`
          <html>
            <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
              <h2> Tu cuenta fue verificada correctamente</h2>
              <p>Ya podés iniciar sesión en el sistema.</p>
            </body>
          </html>
        `);
    } catch (error) {
        return res.status(400).send(`
          <html>
            <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
              <h2> El enlace no es válido o venció</h2>
              <p>Intentá registrarte de nuevo para recibir un nuevo enlace.</p>
            </body>
          </html>
        `);
    }
};

const loginSchema = z.object({
    identificador: z.string().min(1, "Ingresa tu correo o usuario"),
    contrasena: z.string().min(1, "Ingresa tu contraseña"),
})

export const login = async (req: Request, res: Response) => {
    //llega el pedido, y se validan la forma de los datos
    const resultado = loginSchema.safeParse(req.body);
    //se chequea que venga algo en identificador y contrasena, si falta alguno, corta con un error
    if (!resultado.success){
        return res.status(400).json({error: resultado.error.issues[0]?.message})

    }
   
    const { identificador, contrasena } = resultado.data;
    //si lo que escribió una persona tiene arroba quiere decir que se intentó logear como ciudadano, de lo contrario es un funcionario o admin (ingresa con usuario)
    const esCorreo = identificador.includes("@");

    
    let correoVerificado = true;
    let contrasenaHasheada;
    let userId;
    let rol;
    let nombreSucursal: string | null = null;

    //si es correo busca en ciudadano trayendo solo lo necesario (id, si verificó correo, contra hasheada y rol). No confundir aquí los true con un valor, es una sintaxis de prisma para indicar que se traiga ese dato.
    if (esCorreo) {
        const ciudadano = await prisma.ciudadano.findUnique({
            where: { correo: identificador},
            select: {
                id: true,
                correoVerificado: true,
                usuario: { select: { contrasena: true, rol: true}},
            }
        });
        if (!ciudadano){
            return res.status(401).json({error: "Datos incorrectos"})
        }
        userId = ciudadano.id
        correoVerificado = ciudadano.correoVerificado;
        contrasenaHasheada = ciudadano.usuario.contrasena;
        rol = ciudadano.usuario.rol;
    } else{
        //si no es correo busca primero en funcionario, si no lo encuentra busca en admin. Si ninguno de los dos tiene el nombre de usuario ingresado, corta con un mensaje de error
        
        const funcionario = await prisma.funcionario.findUnique({
            where: { nombreUsuario: identificador },
            select: { id: true, usuario: { select: { contrasena: true, rol: true}},
                                sucursal:{ select: {nombre:true}}}
        })
        const admin = funcionario 
        ? null
        : await prisma.admin.findUnique({
            where: {nombreUsuario: identificador},
            select: {id: true, usuario: { select: {contrasena: true, rol: true }},
                                sucursal: {select:{nombre:true}}}
        })
    const cuenta = funcionario ?? admin;

    if(!cuenta){
        return res.status(401).json({ error: "Datos incorrectos"})
    }
    //en cualquiera de los casos, si encuentra a alguien guarda los datos en variables
    // para luego usarlos en la comparación de contra y generación del token
    userId = cuenta.id;
    contrasenaHasheada = cuenta.usuario.contrasena;
    rol = cuenta.usuario.rol;
    nombreSucursal = cuenta.sucursal.nombre;


    }
    //hashea la contraseña ingresada y la compara con el hash ya guardado
    const contrasenaValida = await bcrypt.compare (contrasena, contrasenaHasheada);

    if (!contrasenaValida) {
        return res.status(401).json ({error: "Datos incorrectos"})
    }
    //chequea si falta verificar correo, esto solo bloquea a los ciudadanos que no lo tengan verificado, los admin y funcionarios se saltean esto al no tener un correo, traen correoVerificado en true por defecto.
    if (!correoVerificado) {
        return res.status(403).json ({ error: "Verifica tu correo antes de iniciar sesión"})
    }

    //genera el token de sesión con el id y rol de usuario
    const token = jwt.sign(
        { id: userId, rol},
        config.jwtSecret,
        { expiresIn: "2h"}
    );

    //responde con el token para que el frontend lo guarde y use después (para pruebas)
    return res.status (200).json ({
        mensaje: "Inicio de sesión exitoso",
        token,
        rol,
        sucursal: nombreSucursal,
    })

}