import webpush from "web-push";
import { prisma } from "../prisma";

//distancia de turnos con la que el sistema empieza a avisar
export const UMBRAL_AVISO = 5;

//lee las 3 credenciales VAPID del .env. Este par de clave son las que le prueban al servicio de push del navegador que los mensajes realmente vienen de este backend
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
//si falta alguna de las 3, el push queda deshabilitado en lugar de romper el sv
export const pushHabilitado = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);

if (pushHabilitado) {
    //guarda las 3 credenciales en la libreria, mas adelante la libreria usa estas credenciales para firmar y cifrar el envio puntual
    webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
}
export const clavePublicaVapid = VAPID_PUBLIC_KEY ?? null;

//forma del contenido que viaja cifrado dentro de cada notificación
export type PayloadPush = {
    titulo: string;
    cuerpo: string;
    turnoId: number;
    sucursalId: number;
    tag: string;
};
// devuelve el texto de la notificación segun cuantos turnos falten antes del propio
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
    //si faltan las claves VAPID, no hace nada
    if (!pushHabilitado) return;
    //trae todos los dispositivos/navegadores (suscripciones) en los que este ciudadano activó avisos
    const suscripciones = await prisma.pushSuscripcion.findMany({ where: { ciudadanoId } });
    //intenta mandar push a cada dispositivo en paralelo. 
    //allSetled espera que todos terminen, sin que el fallo de uno cancele el envío a los demás. 
    Promise.allSettled(suscripciones.map(async (s) => {
        try {
            try {
                //p256dh y auth son datos que generó el navegador al suscribirse, se les pasa a la librería para que cifre el mensaje
                //de forma que solo el navegador puntual pueda leerlo.
                //la libreria realiza el cifrado y la firma VAPID por su cuenta
                await webpush.sendNotification(
                    { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                    JSON.stringify(payload),
                    //ttl: cuanto tiempo reintenta el servicio de push si el dispositivo esta offline, antes de descartarlo
                    //urgency solicita que no demroe
                    { TTL: 600, urgency: "high" }
                );
            } catch (error) {
                //404 0 410 en caso de que el endpoint(direccion del mensaje) ya no exista
                const status = (error as { statusCode?: number }).statusCode;
                if (status === 404 || status === 410) {
                    //limpia automaticamente la suscripcion muerta para no seguir intentando
                    await prisma.pushSuscripcion.deleteMany({ where: { id: s.id } })


                }
            }
        }
        catch (error) {
            console.error("[push]Error:", error);
        }
    }))
};
//si el turno no tiene ciudadanoId (viene del totem) no hay a quien avisarle y corta ahí.
//de tenerlo arma el mensaje y se lo manda
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

//recorre los proximos turnos de la fila y avisa a quienes se les acerca su turno
export const notificarProgresoCola = async (sucursalId: number) => {
    if (!pushHabilitado) return;
    try {
        //consulta los proximos turnos activos de la sucursal, el resto de la funcion usa esta lista para decidir a quien le toca avisar
        const cola = await prisma.turno.findMany({
            where: { sucursalId, estado: "ACTIVO" },
            orderBy: { numero: "asc" },
            take: UMBRAL_AVISO + 1,
            select: { id: true, ciudadanoId: true },
        });
        //delante es la posicion de este turno en la lista (0 = el proximo, 1 = uno antes que el suyo)
        for (const [delante, turno] of cola.entries()) {
            //turno de totem, no hay cuenta asociada así que no se avisa
            if (!turno.ciudadanoId) continue;
            
            //compara la ultima posicion avisada a este turno contra su posicion actual
            //si mejoró, actualiza y habilita mandar el aviso
            const reclamo = await prisma.turno.updateMany({
                where: {
                    id: turno.id,
                    estado: "ACTIVO",
                    OR: [
                        { ultimaPosicionNotificada: null },
                        { ultimaPosicionNotificada: { gt: delante } },
                    ],
                },
                //si no, no hay nada que avisar, se pasa al siguiente
                data: { ultimaPosicionNotificada: delante },
            });
            //arma el texto de aviso segun la posicion
            if (reclamo.count === 0) continue;
            const {titulo,cuerpo} = mensajePosicion(delante);
            await enviarPushACiudadano(turno.ciudadanoId, {
                titulo,
                cuerpo,
                turnoId: turno.id,
                sucursalId,
                tag: `turno-${turno.id}`,

            })
        }

    }catch (error){
        console.error("[push] Error notificando progreso de cola", error);
    } 
    }