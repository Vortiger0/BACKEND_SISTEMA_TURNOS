import express from "express";
import { registrarCiudadano, verificarCorreo, login } from "../controllers/authController";
import { rateLimit } from "express-rate-limit";

const router: express.Router = express.Router();

const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,// 15 minutos
    limit: 5, //maximo de 5 pedidos en esa ventana
    message: {error: "Demasiados intentos de login"},
    standardHeaders: "draft-8",
    legacyHeaders: false,
})

router.post("/registro", registrarCiudadano);
router.get("/verificar/:token", verificarCorreo);
router.post("/login",limiteLogin, login);
export default router;


