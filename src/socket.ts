import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { config } from "./config"

export let io: Server;

//habilita que se acepten conexiones socket sobre el servidor
export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: { origin: config.frontendUrl},
    });

    return io;
}