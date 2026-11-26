import express from "express"
import { misTurnos, sacarTurno, cancelarTurno, obtenerFilaVirtual } from "../controllers/turnoController"
import { verificarToken, verificarEmisor } from "../middlewares/authMiddleware"

const router: express.Router = express.Router();

router.post("/", verificarEmisor, sacarTurno)
router.get("/mis-turnos", verificarToken, misTurnos)

// Ruta para devolver la fila virtual al front
router.get("/:id/fila-virtual", verificarToken, obtenerFilaVirtual)

router.delete("/:id", verificarToken, cancelarTurno)

export default router;