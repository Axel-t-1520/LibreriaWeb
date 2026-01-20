import dotenv from "dotenv";
import express from "express";
import cors from 'cors'
import { PORT } from "./config/config.js";
import userRoute from "./routes/user.route.js";
import productRoute from "./routes/product.route.js";
import clientRoute from "./routes/client.route.js";
import proveedorRoute from "./routes/proveedor.route.js";
import ventaRoute from "./routes/venta.route.js";
import dashboardRoute from "./routes/dashboard.route.js";
dotenv.config();
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Cambia '*' por tu URL de frontend en producción
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ============================================
// RUTA RAÍZ (BIENVENIDA)
// ============================================
app.get("/", (req, res) => {
  res.json({
    message: "🚀 API Librería T&M",
    version: "1.0.0",
    endpoints: {
      usuarios: "/api/vendedor/*",
      productos: "/api/product/*",
      clientes: "/api/client/*",
      proveedores: "/api/prov/*",
      ventas: "/api/venta/*",
      dashboard: "/api/ventas/*"
    },
    status: "online"
  });
});
app.use("/api", userRoute);

app.use("/api", productRoute);

app.use("/api", clientRoute);

app.use("/api", proveedorRoute);

app.use("/api", ventaRoute);

app.use("/api", dashboardRoute);

app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    message: `No se encontró ${req.method} ${req.path}`,
    disponible_en: "GET /"
  });
});
app.listen(PORT);
console.log(`Server on PORT ${PORT}`);
