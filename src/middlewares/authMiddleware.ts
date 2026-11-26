import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config"
import { prisma } from "../prisma"

//middleware para confirmar que el pedido venga con un token válido antes de dejarlo ir hacia la ruta que lo use
export const verificarToken = (req: Request, res: Response, next: NextFunction) => {
    //la cabecera trae el token si el front lo mandó
    const authHeader = req.headers.authorization;
    //si no viene ninguna cabecera o no tiene el formato "Bearer token" se rechaza
    if (!authHeader || !authHeader.startsWith("Bearer")){
        return res.status(401).json({error: "No autenticado"});
    }
    // separa "Bearer" del token en sí, para quedarse solo con este
    const token = authHeader.split(" ")[1];

    // si posterior a separar el bearer del token no queda "nada" del token, corta aquí
    if(!token){
        return res.status(401).json({error: "No autenticado"})
    }

    // revisa que el token tenga la firma correcta. Si todo está bien devuelve el contenido guardado en el momento en el que se creó (id y rol)
    try {
        const payload = jwt.verify(token, config.jwtSecret) as unknown as { id: number; rol: string};

        // lo guarda en el pedido para que el controlador que se ejecute después pueda leer quién es la persona sin decodificar el token de nuevo
        req.usuario = payload;

        //avisa a express para que siga con el siguiente paso
        next();
    } catch {
        return res.status(401).json({error: "Token inválido"});
    } }

    //recibe la lista de roles permitidos para una ruta, y devuelve el middleware ya "configurado" para exigir justo esos roles
    export const verificarRol = (rolesPermitidos: string[]) => {
        return (req: Request, res: Response, next: NextFunction) => {
            if (!req.usuario) {
                return res.status(401).json({ error: "No autenticado"})
            }
            if (!rolesPermitidos.includes(req.usuario.rol)) {
                return res.status(403).json({ error: "No tenés permiso para esta acción"})
            }

            next();


        };
    };

    //otra alternativa del middlewware para que la falta del token no bloquee el pedido (para usarlo en el totem)
    export const verificarTokenOpcional = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization; 

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next();
    }

    const token = authHeader.split(" ")[1];

    if(!token){
        return next();
    }

    try {
        const payload = jwt.verify(token, config.jwtSecret) as unknown as {id: number; rol: string};
        req.usuario = payload;
    } catch {

    }
    next()

}

//middleware que solo deja pasar a un ciudadano con sesión o un totem activado, cualquier otro pedido es rechazado
export const verificarEmisor = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
        return res.status(401).json({ error: "No autenticado"})
    }

    const token = authHeader.split(" ")[1]
    if(!token){
        return res.status(401).json({ error: "No autenticado"})
    }

    let payload: { id?: number, rol: string; sucursalId?: number; version?: number}
    try {
        payload = jwt.verify(token, config.jwtSecret) as unknown as typeof payload;
    } catch {
        return res.status(401).json({ error: "Token inválido"})
    }

    //un ciudadano con sesión pasa como siempre
    if(payload.rol === "CIUDADANO" && payload.id) {
        req.usuario = { id: payload.id, rol: payload.rol}
        return next();
    }

    if(payload.rol === "TOTEM" && typeof payload.sucursalId === "number") {
        try {
            const totem = await prisma.totem.findUnique({ where: { sucursalId: payload.sucursalId }})

            if (!totem || !totem.activo || totem.version !== payload.version) {
                return res.status(401).json({ error: "Totem no autorizado", codigo: "TOTEM_NO_AUTORIZADO"})
            }

            req.totem = { sucursalId: totem.sucursalId}
            return next();

        } catch {
            return res.status(500).json({ error: "Error interno del servidor"})
        }
    }

    return res.status(403).json({ error: "No tienes permiso para esta acción"})
    
}
