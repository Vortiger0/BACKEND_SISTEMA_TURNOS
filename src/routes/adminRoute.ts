import express from "express"
import { actualizarHorarios, crearExcepcion, eliminarExcepcion, obtenerConfiguracion, crearFuncionario, listarFuncionarios, editarFuncionario, eliminarFuncionario } from '../controllers/adminController';
import { verificarToken, verificarRol } from "../middlewares/authMiddleware";

const router: express.Router = express.Router();

router.put("/horarios", verificarToken, verificarRol(["ADMIN"]), actualizarHorarios)
router.post("/excepciones", verificarToken, verificarRol(["ADMIN"]), crearExcepcion)
router.delete("/excepciones/:id", verificarToken, verificarRol(["ADMIN"]), eliminarExcepcion)
router.get("/horarios", verificarToken, verificarRol(["ADMIN"]), obtenerConfiguracion)
router.get("/funcionarios", verificarToken, verificarRol(["ADMIN"]), listarFuncionarios)
router.post("/funcionarios", verificarToken, verificarRol(["ADMIN"]), crearFuncionario)
router.put("/funcionarios/:id", verificarToken, verificarRol(["ADMIN"]), editarFuncionario)
router.delete("/funcionarios/:id", verificarToken, verificarRol(["ADMIN"]), eliminarFuncionario)

export default router;