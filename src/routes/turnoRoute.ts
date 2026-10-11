import express from "express"
import {sacarTurno} from "../controllers/turnoController"
import { verificarTokenOpcional} from "../middlewares/authMiddleware"

const router: express.Router = express.Router();

router.post("/", verificarTokenOpcional, sacarTurno)

export default router;