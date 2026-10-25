import express from "express";
import {obtenerClavePublica, suscribir, desuscribir} from "../controllers/pushController";
import {verificarToken, verificarRol} from "../middlewares/authMiddleware";

const router: express.Router = express.Router();

router.get("/clave-publica",obtenerClavePublica);
router.post("/suscripcion",verificarToken,verificarRol(["CIUDADANO"]),suscribir)
router.delete("/suscripcion",verificarToken,verificarRol(["CIUDADANO"]),desuscribir)

export default router;

