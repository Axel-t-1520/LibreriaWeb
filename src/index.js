import dotenv from "dotenv";
import express from "express";
import { PORT } from "./config/config.js";
import userRoute from "./routes/user.route.js";
import productRoute from "./routes/product.route.js";
import clientRoute from './routes/client.route.js'
import proveedorRoute from './routes/proveedor.route.js'
dotenv.config();
const app = express();
app.use(express.json());

app.use("/api", userRoute);

app.use("/api", productRoute);

app.use('/api',clientRoute)

app.use('/api', proveedorRoute)

app.listen(PORT);
console.log(`Server on PORT ${PORT}`);
