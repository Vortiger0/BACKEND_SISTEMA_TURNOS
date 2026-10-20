import app from "./app"
import { config } from "./config";
import cron from "node-cron"
import { cerrarTurnosVencidos } from "./jobs/cerrarTurnosVencidos";

app.listen(config.puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${config.puerto}`);
});

//programa que, todos los días a medianoche, se ejecute automáticamente cerrarTurnosVencidos()
cron.schedule("00 00 * * *", () => {
  cerrarTurnosVencidos()
})