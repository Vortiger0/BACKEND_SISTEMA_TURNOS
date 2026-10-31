import express from "express";
import {siguienteTurno, marcarAusente, obtenerTurnoActual} from "../controllers/funcionarioController"
import { verificarToken, verificarRol } from "../middlewares/authMiddleware";

const router: express.Router = express.Router();

router.post("/siguiente", verificarToken, verificarRol(["FUNCIONARIO"]), siguienteTurno);
router.post("/ausente", verificarToken, verificarRol(["FUNCIONARIO"]), marcarAusente)
router.get("/actual", verificarToken, verificarRol(["FUNCIONARIO"]), obtenerTurnoActual)

export default router;