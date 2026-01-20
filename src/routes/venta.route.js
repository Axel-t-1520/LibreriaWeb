import { Router } from "express";

import {
  descargarPDFFactura,
  listarFacturas,
  realizarVenta,
} from "../controllers/venta.controller.js";

const router = Router();

router.get("/factura/:id", descargarPDFFactura);
router.post("/venta", realizarVenta);
router.get("/list/facturas", listarFacturas);

export default router;
