import dotenv from 'dotenv';
dotenv.config()

import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import {app, server, io} from './lib/socket.js'

/* --------------------- bebugging socket code -----------------------------------------------------*/


process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err)
})

process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason)
})

/* ------------------------------------------------------------------------------------*/

const PORT = process.env.PORT || 3000;

console.log("CLIENT_URL is:", process.env.CLIENT_URL)

// middleware

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ['GET','PUT','DELETE','POST'],
  credentials: true
}));

// logging middleware to check incoming URLs (I love(hate) debugging)

app.use((req, res, next) => {
  console.log(`Incoming: ${req.method} ${req.url}`);
  next();
});


// REST API Routes

app.use("/api/auth", authRoutes);
app.use("/api", messageRoutes);


server.listen(PORT,()=>{
  console.log("Hello Sinners!")
  console.log(`Listening at http://localhost:${PORT}`)
})
