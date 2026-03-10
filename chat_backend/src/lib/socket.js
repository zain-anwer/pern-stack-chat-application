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

const onlineUsers = new Set()

io.on("connection",(socket)=>
{
    console.log("User Connected - ",socket.user?.name)
    onlineUsers.add(socket.userId)

    // io.emit is used to broadcast to all available clients

    io.emit("getOnlineUsers",[...onlineUsers])

    // socket.on is used to listen to events

    socket.on("disconnect",()=>
    {
        onlineUsers.delete(socket.userId)
        io.emit("getOnlineUsers",[...onlineUsers])
        console.log("User Disconnected - ",socket.user?.name)
    })
})

export {io, app, server}
