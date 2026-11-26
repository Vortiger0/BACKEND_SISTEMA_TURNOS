import express from "express"
import { rateLimit } from "express-rate-limit";
import { activarTotem } from "../controllers/totemController"

const router: express.Router = express.Router()

//limita los intentos de activación por IP para evitar que se prueben códigos a fuerza bruta
const limiteActivacion = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 10, 
    message: { error: "Demasiados intentos. Esperá unos minutos." },
    standardHeaders: "draft-8",
    legacyHeaders: false,
})


router.post("/activar", limiteActivacion, activarTotem)

export default router