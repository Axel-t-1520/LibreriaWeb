import { Router } from "express";
import {
  deleteProd,
  getProd,
  getProductCat,
  getProductId,
  registerProduct,
  updateProd,
 
} from "../controllers/products.controller.js";


const router = Router();

router.get("/product", getProd);
router.get("/product/categoria/:cat", getProductCat);
router.get("/product/:id", getProductId);
router.post("/regisProd", registerProduct);
router.put('/product/update/:id', updateProd)
router.delete('/product/delete/:id',deleteProd)

export default router;
