// can't shake this project off
// another night of agony
// can't take this anymoree

import dotenv from 'dotenv';
dotenv.config()

import express from 'express';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import {app, server, io} from './lib/socket.js';
import {pool} from './lib/db.js'

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

// debugging
console.log("CLIENT_URL is:", process.env.CLIENT_URL)
console.log("DB RAW:", JSON.stringify(process.env.DB_URI || process.env.DATABASE_URL));

// middleware

app.use(express.static('public'))
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

app.get("/", async (req, res) => {
  try {
    // a simple read statement to keep the database from pausing 
    await pool.query('SELECT 1;')
    return res.status(200).json({ status: 200, service: "Bubble Chat Backend", db: "ok" })
  } catch (e) {
    return res.status(503).json({ status: 503, service: "Bubble Chat Backend", db: "error" })
  }
})

server.listen(PORT,()=>{
  console.log("Hello Sinners!")
  console.log(`Listening at http://localhost:${PORT}`)
})
