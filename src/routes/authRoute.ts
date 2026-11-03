import express from "express";
import { registrarCiudadano, verificarCorreo, login, cambiarCredenciales, quienSoy, olvideContrasena, restablecerContrasena } from '../controllers/authController';
import { verificarToken, verificarRol } from "../middlewares/authMiddleware";
import { rateLimit } from "express-rate-limit";

const router: express.Router = express.Router();

const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,// 15 minutos
    limit: 10, //maximo de 5 pedidos en esa ventana
    message: {error: "Demasiados intentos de login"},
    standardHeaders: "draft-8",
    legacyHeaders: false,
})

const limiteRegistro = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message: { error: "Demasiados registros, intentá más tarde"},
    standardHeaders: "draft-8",
    legacyHeaders: false,
})

const limiteOlvideContrasena = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,
    message: { error: "Demasiados pedidos de recuperación, intenta más tarde"},
    standardHeaders: "draft-8",
    legacyHeaders: false
})

router.post("/registro", limiteRegistro, registrarCiudadano);
router.get("/verificar/:token", verificarCorreo);
router.post("/login",limiteLogin, login);
router.put("/cambiar-credenciales", verificarToken, verificarRol(["ADMIN"]), cambiarCredenciales)
router.get("/quien-soy", verificarToken, quienSoy)
router.post("/olvide-contrasena", limiteOlvideContrasena, olvideContrasena)
router.post("/restablecer-contrasena", restablecerContrasena)
export default router;


