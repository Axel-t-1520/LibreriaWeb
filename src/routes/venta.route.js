import { Router } from "express";

import { realizarVenta } from "../controllers/venta.controller.js";

const router = Router();

router.post("/venta", realizarVenta);

export default router
