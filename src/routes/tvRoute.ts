import express from "express"
import { obtenerEstadoTV } from "../controllers/tvController"

const router: express.Router = express.Router();

router.get("/:sucursalId", obtenerEstadoTV)

export default router;