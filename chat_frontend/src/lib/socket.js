import {io} from 'socket.io-client'

const BASE_URL = import.meta.env.VITE_BACKEND_URL


export const socketInstance = io(
    BASE_URL,
    {
        withCredentials:true, 
        autoConnect: false,
        transports: ['polling']
    }
)

// will call this immediately after connecting to sent the userId
// cookies are httpOnly so apparently frontend cannot read it

export const authenticateSocket = (userId,userName) => {
    socketInstance.emit("authenticate", { userId,userName })
}