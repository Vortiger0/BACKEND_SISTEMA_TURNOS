import express from "express"
import {misTurnos, sacarTurno, cancelarTurno} from "../controllers/turnoController"
import {verificarToken, verificarTokenOpcional} from "../middlewares/authMiddleware"

const router: express.Router = express.Router();

router.post("/", verificarTokenOpcional, sacarTurno)
router.get("/mis-turnos", verificarToken, misTurnos)
router.delete("/:id", verificarToken, cancelarTurno)

export default router;