import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { clavePublicaVapid, pushHabilitado } from "../services/pushService";

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
export const obtenerClavePublica = (_req: Request, res: Response) => {
    if (!pushHabilitado || !clavePublicaVapid) {
        return res.status(503).json({ error: "Las notificaciones están disponibles" })
    }
    return res.json({ clavePublica: clavePublicaVapid });
};
export const suscribir = async (req: Request, res: Response) => {
    const ciudadanoId = req.usuario?.id;
    if (!ciudadanoId) {
        return res.status(401).json({ error: "No autentico" });
    }
    const resultado = suscripcionSchema.safeParse(req.body);
    if (!resultado.success) {
        return res.status(400).json({ error: "No autenticado" });
    }
    const { endpoint, keys } = resultado.data;

    await prisma.pushSuscripcion.upsert({
        where: { endpoint },
        create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, ciudadanoId },
        update: { p256dh: keys.p256dh, auth: keys.auth, ciudadanoId },
    });
    return res.status(201).json({ mensaje: "suscripcion registrada" })
};

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