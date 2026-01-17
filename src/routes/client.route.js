import { Router } from "express";
import {
  comprasCliente,
  deleteClient,
  getClient,
  getClientNombApe,
  registClient,
  updateClient,
} from "../controllers/client.controller.js";

const router = Router();

router.post("/registclient", registClient);
router.get("/client", getClient);
router.get('/compras/:id',comprasCliente)
router.put("/upclient/:id", updateClient);
router.delete("/delclient/:id", deleteClient);
router.get("/client/:termino", getClientNombApe);

export default router;
