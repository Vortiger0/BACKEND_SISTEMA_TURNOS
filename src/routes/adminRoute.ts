import express from "express"
import { actualizarHorarios } from "../controllers/adminController";
import { verificarToken, verificarRol } from "../middlewares/authMiddleware";

const router: express.Router = express.Router();

router.put("/horarios", verificarToken, verificarRol(["ADMIN"]), actualizarHorarios);

export default router;