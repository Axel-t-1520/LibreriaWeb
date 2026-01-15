import { Router } from "express";
import { registerProduct } from "../controllers/products.controller.js";

const router = Router();

router.post("/regisProd", registerProduct);

export default router;
