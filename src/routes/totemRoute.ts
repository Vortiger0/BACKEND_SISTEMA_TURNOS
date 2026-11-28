import express from "express"
import { rateLimit } from "express-rate-limit";
import { activarTotem } from "../controllers/totemController"
import { verificarTotem } from "../middlewares/authMiddleware";

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
router.get("/sesion/:sucursalId", verificarTotem, (req,res) => {
    //compara el numero de la url con la sucursal del token
    if(Number(req.params.sucursalId) !== req.totem?.sucursalId) {
        return res.status(403).json({ error: "No tienes permiso para esta acción"})
    }
    return res.status(200).json({ sucursalId: req.totem.sucursalId})
})

export default router