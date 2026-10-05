import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import http from 'http'
import { pool } from './db.js'
import { Server } from 'socket.io'
import socketAuthMiddleware from '../middleware/socket.auth.middleware.js'

dotenv.config()

const app = express()

// cors setup

app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ['GET','PUT','DELETE','POST'],
  credentials: true
}));

// logging socket connection URLs

app.use((req, res, next) => {
    console.log(`SOCKET APP: ${req.method} ${req.url}`)
    next()
})


// use the express app to create an http server
const server = http.createServer(app)


const io = new Server(server,{
    cors:{
        origin: process.env.CLIENT_URL, // frontend URL
        credentials: true // allows cookies
    }
})

io.use(socketAuthMiddleware)

// takes the name of the event and the callback function


// Track active socket connections for each authenticated user.
const userSocketMap = new Map()

// User rooms deliver events to every active session for this user.
const getReceiverSocket = (user_id) =>
{
    return userSocketMap.has(String(user_id)) ? `user:${user_id}` : null
}

io.on("connection", async (socket) =>
{

    const userId = String(socket.user.user_id)
    socket.userId = userId
    socket.userName = socket.user.name
    const userSockets = userSocketMap.get(userId) ?? new Set()
    userSockets.add(socket.id)
    userSocketMap.set(userId, userSockets)
    socket.join(`user:${userId}`)

    console.log("User Connected - ", socket.userName)

    const pendingMessages = await pool.query(
        `SELECT Message_Status.message_id, Messages.sender_id
         FROM Message_Status
         JOIN Messages ON Messages.message_id = Message_Status.message_id
         WHERE Message_Status.receiver_id = $1 AND Message_Status.status = 'sent';`,
        [userId]
    )

    await pool.query(
        "UPDATE Message_Status SET status = 'delivered', delivered_at = NOW() WHERE status = 'sent' AND receiver_id = $1;",
        [userId]
    )

    pendingMessages.rows.forEach(({ message_id, sender_id }) => {
        const senderRoom = getReceiverSocket(sender_id)
        if (senderRoom) {
            io.to(senderRoom).emit("messageDelivered", {
                message_id,
                status: 'delivered'
            })
        }
    })

    io.emit("getOnlineUsers", [...userSocketMap.keys()])

    socket.on("disconnect", () =>
    {
        const activeSockets = userSocketMap.get(userId)
        activeSockets?.delete(socket.id)
        if (activeSockets?.size === 0) {
            userSocketMap.delete(userId)
        }
        io.emit("getOnlineUsers", [...userSocketMap.keys()])
        console.log("User Disconnected - ", socket.userName)
    })
})

export {io, app, server, getReceiverSocket}
