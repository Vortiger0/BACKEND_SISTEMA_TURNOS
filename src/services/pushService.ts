import webpush from "web-push";
import { prisma } from "../prisma";

export const UMBRAL_AVISO = 5;

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
export const pushHabilitado = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);

if (pushHabilitado) {
    webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
}
export const clavePublicaVapid = VAPID_PUBLIC_KEY ?? null;

export type PayloadPush = {
    titulo: string;
    cuerpo: string;
    turnoId: number;
    sucursalId: number;
    tag: string;
};
export const mensajePosicion = (delante: number):{ titulo: string; cuerpo: string} => {
    if (delante === 0) {
        return { titulo: "¡Sos el siguiente!", cuerpo:"En breve te van a llamar."};

    }
    if (delante === 1) {
        return { titulo:" falta 1 turno", cuerpo: "Hay un turno antes que el tuyo."};    
    }
    return { titulo: `Faltan ${delante} turnos`, cuerpo: `Hay ${delante} turnos antes que el tuyo`};
}

export const enviarPushACiudadano = async (ciudadanoId: number, payload: PayloadPush ) => {
    if (!pushHabilitado) return;
    const suscripciones = await prisma.pushSuscripcion.findMany({ where: { ciudadanoId } });
    Promise.allSettled(suscripciones.map(async (s) => {
        try {
            try {
                await webpush.sendNotification(
                    { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                    JSON.stringify(payload),
                    { TTL: 600, urgency: "high" }
                );
            } catch (error) {
                const status = (error as { statusCode?: number }).statusCode;
                if (status === 404 || status === 410) {
                    await prisma.pushSuscripcion.deleteMany({ where: { id: s.id } })


                }
            }
        }
        catch (error) {
            console.error("[push]Error:", error);
        }
    }))
};
export const notificarTurnoLlamado = async (
    turno: {id: number; sucursalId: number; ciudadanoId: number | null},
    numeroCaja: number
)=> {
    if(!turno.ciudadanoId)return;
    await enviarPushACiudadano(turno.ciudadanoId, {
        titulo:"¡es tu turno!",
        cuerpo:`Dirigite a la caja ${numeroCaja}.`,
        turnoId: turno.id,
        sucursalId: turno.sucursalId,
        tag: `turno-${turno.id}`,
    });
}
    ;
export const notificarProgresoCola = async (sucursalId: number) => {
    if (!pushHabilitado) return;
    try {
        const cola = await prisma.turno.findMany({
            where: { sucursalId, estado: "ACTIVO" },
            orderBy: { numero: "asc" },
            take: UMBRAL_AVISO + 1,
            select: { id: true, ciudadanoId: true },
        });
        for (const [delante, turno] of cola.entries()) {
            if (!turno.ciudadanoId) continue;
            const reclamo = await prisma.turno.updateMany({
                where: {
                    id: turno.id,
                    estado: "ACTIVO",
                    OR: [
                        { ultimaPosicionNotificada: null },
                        { ultimaPosicionNotificada: { gt: delante } },
                    ],
                },
                data: { ultimaPosicionNotificada: delante },
            });
            if (reclamo.count === 0) continue;
            const {titulo,cuerpo} = mensajePosicion(delante);
            await enviarPushACiudadano(turno.ciudadanoId, {
                titulo,
                cuerpo,
                turnoId: turno.id,
                sucursalId,
                tag:"turno-${turno.id}",

            })
        }

    }catch (error){
        console.error("[push] Error notificando progreso de cola", error);
    } 
    }