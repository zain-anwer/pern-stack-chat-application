import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// middleware

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true
}));

// REST API Routes

app.use("/api/auth", authRoutes);
app.use("/api", messageRoutes);

app.listen(PORT,()=>{
  console.log("Hello Sinners!")
  console.log(process.env.DB_URI)
  console.log(`Listening at http://localhost:${PORT}`)
})