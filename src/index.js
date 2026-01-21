import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { PORT } from "./config/config.js";
import userRoute from "./routes/user.route.js";
import productRoute from "./routes/product.route.js";
import clientRoute from "./routes/client.route.js";
import proveedorRoute from "./routes/proveedor.route.js";
import ventaRoute from "./routes/venta.route.js";
import dashboardRoute from "./routes/dashboard.route.js";

dotenv.config();
const app = express();

// ============================================
// CORS CONFIGURADO CORRECTAMENTE
// ============================================
app.use(cors({
  origin: ['http://localhost:5173', 'https://libreria-frontend-theta.vercel.app'], // Agregar tu dominio de producción después
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Manejo explícito de OPTIONS (preflight)
//app.options('*', cors());

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger simple
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Ruta raíz
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

// Rutas
app.use("/api", userRoute);
app.use("/api", productRoute);
app.use("/api", clientRoute);
app.use("/api", proveedorRoute);
app.use("/api", ventaRoute);
app.use("/api", dashboardRoute);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    message: `No se encontró ${req.method} ${req.path}`,
    disponible_en: "GET /"
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err);
  
  if (err.message === 'Solo se permiten imágenes') {
    return res.status(400).json({
      message: err.message
    });
  }
  
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      message: "JSON inválido en el cuerpo de la petición"
    });
  }
  
  res.status(err.status || 500).json({
    message: err.message || "Error interno del servidor",
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 SERVIDOR INICIADO                 ║
║   📡 Puerto: ${PORT}                      ║
║   🌍 URL: http://localhost:${PORT}       ║
║   📅 Fecha: ${new Date().toLocaleString('es-BO')}
╚════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM recibido. Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT recibido. Cerrando servidor...');
  process.exit(0);
});