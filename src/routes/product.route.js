import { Router } from "express";
import {
  deleteProd,
  getProd,
  getProductCat,
  getProductId,
  productTotal,
  registerProduct,
  updateProd,
 
} from "../controllers/products.controller.js";
import upload from "../middleware/upload.middleware.js";
import { verificarToken, verificarVendedor } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/product", verificarToken,verificarVendedor,getProd);
router.get("/product/categoria/:cat",verificarToken,verificarVendedor, getProductCat);
router.get("/product/:id", getProductId);
router.post("/regisProd",verificarToken,upload.single('imagen'), registerProduct);
router.put('/product/update/:id',verificarToken,verificarVendedor, updateProd)
router.delete('/product/delete/:id',verificarToken,deleteProd)
router.get('/productosTotal',productTotal)

export default router;
