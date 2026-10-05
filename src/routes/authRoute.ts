import express from "express";
import { registrarCiudadano, verificarCorreo } from "../controllers/authController";

const router: express.Router = express.Router();

router.post("/registro", registrarCiudadano);
router.get("/verificar/:token", verificarCorreo);
export default router;