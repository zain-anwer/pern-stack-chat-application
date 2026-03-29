import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import http from 'http'
import { pool } from './db.js'
import { Server } from 'socket.io'

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

// takes the name of the event and the callback function


// mapping user_id to socket_id
const userSocketMap = {}

// to get socket id from user id
const getReceiverSocket = (user_id) =>
{   return userSocketMap[user_id]   }

io.on("connection", async (socket) =>
{

    // to figure out whether socket is ever created and the problem is in the authenticate event

    console.log("RAW CONNECTION - socket id:", socket.id)

    socket.on("authenticate", async ({ userId, userName }) => {
        
        if (!userId)
        {
            socket.disconnect()
            return
        }
        
        console.log("User Connected - ", userName)
        
        socket.userId = userId
        socket.userName = userName

        userSocketMap[socket.userId] = socket.id

        console.log("List of connected users now: ", Object.keys(userSocketMap))

        const pendingUsers = await pool.query(`SELECT DISTINCT Messages.sender_id 
                                FROM Messages JOIN Message_Status
                                ON Messages.message_id = Message_Status.message_id
                                WHERE receiver_id = $1 AND status = 'sent';`, [socket.userId]);

        await pool.query("UPDATE Message_Status SET status = 'delivered', delivered_at = NOW() WHERE status = 'sent' AND receiver_id = $1;", [socket.userId])

        pendingUsers.rows.forEach(row => {
            const sender_socket = getReceiverSocket(row.sender_id)
            if (sender_socket)
            {
                io.to(sender_socket).emit("userBackOnline", { userId: socket.userId })
            }
        })

        io.emit("getOnlineUsers", Object.keys(userSocketMap))

    })

    socket.on("disconnect", () =>
    {
        delete userSocketMap[socket.userId]
        io.emit("getOnlineUsers", Object.keys(userSocketMap))
        console.log("User Disconnected - ", socket.userName)
    })
})

export {io, app, server, getReceiverSocket}
