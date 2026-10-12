import express from "express";
import {config} from "./config"
import {prisma} from "./prisma"
import cron from "node-cron";
import authRoutes from "./routes/authRoute"
import sucursalRoutes from "./routes/sucursalesRoute";
import turnoRoutes from "./routes/turnoRoute";
import { cerrarTurnosVencidos } from "./jobs/cerrarTurnosVencidos";


const app = express();

app.use(express.json())

app.use("/api/auth", authRoutes);
app.use("/api/sucursales", sucursalRoutes);
app.use("/api/turnos", turnoRoutes)

app.get("/testeo", async (_req, res) => {
  const sucursales = await prisma.sucursal.count();
  res.json({ estado: "ok", sucursales });
});

app.listen(config.puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${config.puerto}`);
});

//programa que, todos los días a medianoche, se ejecute automáticamente cerrarTurnosVencidos()
cron.schedule("00 00 * * *", () => {
  cerrarTurnosVencidos()
})