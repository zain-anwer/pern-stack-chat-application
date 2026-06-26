import {io} from 'socket.io-client'

const BASE_URL = import.meta.env.VITE_BACKEND_URL.replace('/api','')


export const socketInstance = io(
    BASE_URL,
    {
        autoConnect: false,
        transports: ['websocket','polling'],
        auth: {
            token: localStorage.getItem('token')
        }
    }
)

// will call this immediately after connecting to sent the userId
// cookies are httpOnly so apparently frontend cannot read it

export const authenticateSocket = (userId, userName) => {
    if (socketInstance.connected) {
        socketInstance.emit("authenticate", { userId, userName })
    } else {
        socketInstance.once("connect", () => {
            socketInstance.emit("authenticate", { userId, userName })
        })
    }
}