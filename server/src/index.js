import express, { json } from "express";
import authRoutes from "./routes/auth.route.js"
import dotenv  from 'dotenv';
import { connectionDB } from "./lib/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(express.json())

app.use("/api/auth", authRoutes)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectionDB();
})