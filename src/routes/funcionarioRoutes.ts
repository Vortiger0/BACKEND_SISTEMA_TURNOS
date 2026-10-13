import express from "express";
import {siguienteTurno} from "../controllers/funcionarioController"
import { verificarToken, verificarRol } from "../middlewares/authMiddleware";

const router: express.Router = express.Router();

router.post("/siguiente", verificarToken, verificarRol(["FUNCIONARIO"]), siguienteTurno);

export default router;