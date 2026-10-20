import express, { type Express} from "express";
import {prisma} from "./prisma"
import helmet from "helmet";
import authRoutes from "./routes/authRoute"
import sucursalRoutes from "./routes/sucursalesRoute";
import turnoRoutes from "./routes/turnoRoute";
import funcionarioRoutes from "./routes/funcionarioRoutes"
import adminRoutes from "./routes/adminRoute"
import tvRoutes from "./routes/tvRoute"

const app: Express = express();

app.use(helmet())
app.use(express.json())

app.use("/api/auth", authRoutes);
app.use("/api/sucursales", sucursalRoutes);
app.use("/api/turnos", turnoRoutes)
app.use("/api/funcionario", funcionarioRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/tv", tvRoutes)

app.get("/testeo", async (_req, res) => {
  const sucursales = await prisma.sucursal.count();
  res.json({ estado: "ok", sucursales });
});

export default app;