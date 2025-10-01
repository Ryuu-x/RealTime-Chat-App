import express, { json } from "express";
import authRoutes from "./routes/auth.route.js"
import messageRoutes from "./routes/message.route.js"
import dotenv  from 'dotenv';
import { connectionDB } from "./lib/db.js";
import cookieParser from "cookie-parser" 

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes)
app.use("/api/messages", messageRoutes)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectionDB();
})