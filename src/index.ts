import { createServer } from "http"
import app from "./app"
import { config } from "./config";
import cron from "node-cron"
import { cerrarTurnosVencidos } from "./jobs/cerrarTurnosVencidos";
import { initSocket } from "./socket";

//engancha el socket al sv y lo pone a escuchar pedidos
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(config.puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${config.puerto}`);
});

//programa que, todos los días a medianoche, se ejecute automáticamente cerrarTurnosVencidos()
cron.schedule("00 00 * * *", () => {
  cerrarTurnosVencidos()
})