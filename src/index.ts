import express from "express";
import {config} from "./config"
import {prisma} from "./prisma"

const app = express();

app.use(express.json())

app.get("/testeo", async (_req, res) => {
  const sucursales = await prisma.sucursal.count();
  res.json({ estado: "ok", sucursales });
});

app.listen(config.puerto, () => {
  console.log(`Servidor escuchando en http://localhost:${config.puerto}`);
});