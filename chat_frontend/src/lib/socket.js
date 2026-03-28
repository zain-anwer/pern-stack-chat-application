import {io} from 'socket.io-client'

const BASE_URL = import.meta.env.VITE_BACKEND_URL


export const socketInstance = io(
    BASE_URL,
    {
        withCredentials:true, 
        autoConnect: false
    }
)

