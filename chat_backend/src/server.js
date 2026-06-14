// can't shake this project off
// another night of agony
// can't take this anymoree

import dotenv from 'dotenv';
dotenv.config()

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

// default port = 7860 for hugging face spacess
const PORT = process.env.PORT || 7860;

console.log("CLIENT_URL is:", process.env.CLIENT_URL)

// middleware

app.use(express.json());
app.use(cookieParser());

// logging middleware to check incoming URLs (I love(hate) debugging)

app.use((req, res, next) => {
  console.log(`Incoming: ${req.method} ${req.url}`);
  next();
});


// REST API Routes

app.use("/api/auth", authRoutes);
app.use("/api", messageRoutes);

// HEALTH API FOR HUGGING FACE SPACES

app.get("/",(req,res) => {
  return res.status(200).json(
    {
      "status":200,
      "service":"Bubble Chat Backend"
    }
  )
})

server.listen(PORT,()=>{
  console.log("Hello Sinners!")
  console.log(`Listening at http://localhost:${PORT}`)
})
