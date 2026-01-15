import dotenv from "dotenv";
import express from "express";
import { PORT } from "./config/config.js";
import userRoutes from "./routes/user.route.js";
import productRoute from './routes/product.route.js'
dotenv.config();
const app = express();
app.use(express.json());

app.use("/api", userRoutes);

app.use('/api',productRoute)

app.listen(PORT);
console.log(`Server on PORT ${PORT}`);
