import { Router } from "express";
import { registrarUsuario, getUsers } from "../controllers/users.controller.js";

const router = Router();

router.post("/register", registrarUsuario);

router.get('/get/:id',getUsers)

export default router;
