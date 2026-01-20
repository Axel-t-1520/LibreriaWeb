import { Router } from "express";
import {
  ventasHoyVsAyer,
  ventasMesActual,
  ventasTotal,
  ventasUltimos7Dias,
} from "../controllers/dashboard.controller.js";

const router = Router();

router.get("/ventas/realizadas", ventasTotal);
router.get("/ventas7dias", ventasUltimos7Dias);
router.get("/ventasMes", ventasMesActual);
router.get("/ventasvs", ventasHoyVsAyer);

export default router;
