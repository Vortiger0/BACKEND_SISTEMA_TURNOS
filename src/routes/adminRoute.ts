import express from "express"
import { actualizarHorarios, crearExcepcion, eliminarExcepcion, obtenerConfiguracion } from '../controllers/adminController';
import { verificarToken, verificarRol } from "../middlewares/authMiddleware";

const router: express.Router = express.Router();

router.put("/horarios", verificarToken, verificarRol(["ADMIN"]), actualizarHorarios);
router.post("/excepciones", verificarToken, verificarRol(["ADMIN"]), crearExcepcion)
router.delete("/excepciones/:id", verificarToken, verificarRol(["ADMIN"]), eliminarExcepcion)
router.get("/horarios", verificarToken, verificarRol(["ADMIN"]), obtenerConfiguracion)

export default router;