import express from "express"
import { actualizarHorarios, crearExcepcion, eliminarExcepcion } from '../controllers/adminController';
import { verificarToken, verificarRol } from "../middlewares/authMiddleware";

const router: express.Router = express.Router();

router.put("/horarios", verificarToken, verificarRol(["ADMIN"]), actualizarHorarios);
router.post("/excepciones", verificarToken, verificarRol(["ADMIN"]), crearExcepcion)
router.delete("/excepciones/:id", verificarToken, verificarRol(["ADMIN"]), eliminarExcepcion)

export default router;