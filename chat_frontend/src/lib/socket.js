import {io} from 'socket.io-client'

const BASE_URL = "http://localhost:3000" 


export const socketInstance = io(
    BASE_URL,
    {
        withCredentials:true, 
        autoConnect: false
    }
)

