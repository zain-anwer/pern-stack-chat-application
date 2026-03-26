import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import {app, server, io} from './lib/socket.js'


dotenv.config();
const PORT = process.env.PORT || 3000;

// middleware

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET','PUT','DELETE','POST'],
  credentials: true
}));


// REST API Routes

app.use("/api/auth", authRoutes);
app.use("/api", messageRoutes);


server.listen(PORT,()=>{
  console.log("Hello Sinners!")
  console.log(process.env.DB_URI)
  console.log(`Listening at http://localhost:${PORT}`)
})

/* debugging middlewares */

app.use((req, res) => {
  console.log("404 - No route matched:", req.method, req.url);
  res.status(404).json({ message: "Route not found" });
});

app.use((req, res, next) => {
  console.log(`Incoming: ${req.method} ${req.url}`);
  next();
});