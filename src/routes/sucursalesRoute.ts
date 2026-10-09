import express from "express";
import { listarSucursales } from "../controllers/sucursalController";


const router: express.Router = express.Router();

router.get("/", listarSucursales);

export default router;