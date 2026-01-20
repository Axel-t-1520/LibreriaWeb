import { Router } from "express";
import {
  registrarVendedor,
  loginVendedor,
  logoutVendedor,
  getVendedorActual,
  cambiarPassword,
  recuperarPassword,
  ventasRealizadas,
} from "../controllers/users.controller.js";

import { verificarToken, verificarVendedor } from "../middleware/auth.middleware.js";

const router = Router();

// Autenticación

//rutas publicas 
router.post("/vendedor/login", loginVendedor);
router.post("/vendedor/registro",registrarVendedor);
router.post("/vendedor/recuperar-password", recuperarPassword);


//rutas protegidas
router.get("/ventashechas/:id",verificarVendedor,ventasRealizadas);
router.post("/vendedor/logout",verificarToken,logoutVendedor);
router.get("/vendedor/me",verificarToken, getVendedorActual);
router.put("/vendedor/cambiar-password",verificarToken, cambiarPassword);

export default router;
