import express from "express"
import {misTurnos, sacarTurno} from "../controllers/turnoController"
import {verificarToken, verificarTokenOpcional} from "../middlewares/authMiddleware"

const router: express.Router = express.Router();

router.post("/", verificarTokenOpcional, sacarTurno)
router.post("/mis-turnos", verificarToken, misTurnos)

export default router;