import { Router } from "express";
import { deleteProv, getProveedor, getProveedorNom, registProv, updateProv } from "../controllers/proveedor.controller.js";

const router = Router()

router.post('/regprov',registProv)
router.get('/prov', getProveedor)
router.put('/updpro/:id',updateProv)
router.get('/prov/:nombre',getProveedorNom)
router.delete('/delprov/:id', deleteProv)

export default router