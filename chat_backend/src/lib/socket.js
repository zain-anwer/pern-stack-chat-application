import express from 'express'
import dotenv from 'dotenv'
import http from 'http'
import { pool } from './db.js'
import { Server } from 'socket.io'
import socketAuthMiddleware from '../middleware/socket.auth.middleware.js'

dotenv.config()

const app = express()

// use the express app to create an http server
const server = http.createServer(app)


const io = new Server(server,{
    cors:{
        origin: process.env.CLIENT_URL, // frontend URL
        credentials: true // allows cookies
    }
})

// socket auth middleware

// io.use(socketAuthMiddleware)


// takes the name of the event and the callback function


// mapping user_id to socket_id
const userSocketMap = {}

// to get socket id from user id
const getReceiverSocket = (user_id) =>
{   return userSocketMap[user_id]   }

io.on("connection", async (socket)=>
{
    console.log("User Connected - ",socket.user?.name)

    socket.on("authenticate",({userId}) => {
        if (!userId)
        {
            socket.disconnect()
            return
        }
        socket.userId = userId
    })

    userSocketMap[socket.userId] = socket.id

    // converting the dictionary into an array of keys and printing it for validation purposes
    
    console.log("List of connected users now: ",Object.keys(userSocketMap))

    // marking all messages sent to this user as delivered

    const pendingUsers = await pool.query(`SELECT DISTINCT Messages.sender_id 
                            FROM Messages JOIN Message_Status
                            ON Messages.message_id = Message_Status.message_id
                            WHERE receiver_id = $1 AND status = 'sent';`,[socket.userId]);

    await pool.query("UPDATE Message_Status SET status = 'delivered', delivered_at = NOW() WHERE status = 'sent' AND receiver_id = $1;",[socket.userId])

    pendingUsers.rows.forEach(row => {
        const sender_socket = getReceiverSocket(row.sender_id)
        if (sender_socket)
        {
            io.to(sender_socket).emit("userBackOnline",{userId:socket.userId})
        }
    })
    
    
    // io.emit is used to broadcast to all available clients

    io.emit("getOnlineUsers",Object.keys(userSocketMap))

    // socket.on is used to listen to events

    socket.on("disconnect",()=>
    {
        delete userSocketMap[socket.userId]
        io.emit("getOnlineUsers",Object.keys(userSocketMap))
        console.log("User Disconnected - ",socket.user?.name)
    })
})

export {io, app, server, getReceiverSocket}
