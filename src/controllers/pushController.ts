import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { clavePublicaVapid, pushHabilitado } from "../services/pushService";

//valida que lo que manda el front tenga la forma real de una suscripcion
const suscripcionSchema = z.object({
    endpoint: z.url().max(512),
    keys: z.object({
        p256dh: z.string().min(1).max(255),
        auth: z.string().min(1).max(255),
    }),
});
const desuscribirSchema = z.object({
    endpoint: z.string().min(1).max(512),
});

//devuelve la clave VAPID para que el front la use al suscribirse
export const obtenerClavePublica = (_req: Request, res: Response) => {
    if (!pushHabilitado || !clavePublicaVapid) {
        return res.status(503).json({ error: "Las notificaciones no están disponibles" })
    }
    return res.json({ clavePublica: clavePublicaVapid });
};

//guarda o actualiza la suscripcion de este ciudadano
export const suscribir = async (req: Request, res: Response) => {
    const ciudadanoId = req.usuario?.id;
    if (!ciudadanoId) {
        return res.status(401).json({ error: "No autentico" });
    }
    const resultado = suscripcionSchema.safeParse(req.body);
    if (!resultado.success) {
        return res.status(400).json({ error: "Datos inválidos" });
    }
    const { endpoint, keys } = resultado.data;

    //upsert actualiza si existe, crea si no.
    await prisma.pushSuscripcion.upsert({
        where: { endpoint },
        create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, ciudadanoId },
        update: { p256dh: keys.p256dh, auth: keys.auth, ciudadanoId },
    });
    return res.status(201).json({ mensaje: "suscripcion registrada" })
};

//borra la suscripcion de ese endpoint puntual llamando al cerrar sesión, pero filtrando tambien por ciudadanoId para evitar que alguien borre la suscripcion de otro
export const desuscribir = async (req: Request, res: Response) => {
    const ciudadanoId = req.usuario?.id;
    if (!ciudadanoId) {
        return res.status(401).json({ error: "no autenticado" });
    }
    const resultado = desuscribirSchema.safeParse(req.body);
    if (!resultado.success) {
        return res.status(400).json({
            error: "falta el endpoint"
        })
    }
    await prisma.pushSuscripcion.deleteMany({
        where: { endpoint: resultado.data.endpoint, ciudadanoId },
    });
    return res.json({ mensaje: "Suscripcion eliminada" })

};