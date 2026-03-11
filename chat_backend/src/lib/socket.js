import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import socketAuthMiddleware from '../middleware/socket.auth.middleware.js'

const app = express()

// use the express app to create an http server
const server = http.createServer(app)


const io = new Server(server,{
    cors:{
        origin: "http://localhost:5173", // frontend URL
        credentials: true // allows cookies
    }
})

io.use(socketAuthMiddleware)


// takes the name of the event and the callback function


// mapping user_id to socket_id
const userSocketMap = {}

io.on("connection",(socket)=>
{
    console.log("User Connected - ",socket.user?.name)
    userSocketMap[socket.userId] = socket.id

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

const getReceiverSocket = (user_id) =>
{   return userSocketMap[user_id]   }

export {io, app, server, getReceiverSocket}
