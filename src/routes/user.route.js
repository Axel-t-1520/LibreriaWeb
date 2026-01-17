import { Router } from 'express';
import {
  registrarVendedor,
  loginVendedor,
  logoutVendedor,
  getVendedorActual,
  cambiarPassword,
  recuperarPassword
} from '../controllers/users.controller.js';

const router = Router();

// Autenticación
router.post('/vendedor/registro', registrarVendedor);
router.post('/vendedor/login', loginVendedor);
router.post('/vendedor/logout', logoutVendedor);
router.get('/vendedor/me', getVendedorActual);
router.put('/vendedor/cambiar-password', cambiarPassword);
router.post('/vendedor/recuperar-password', recuperarPassword);

export default router
