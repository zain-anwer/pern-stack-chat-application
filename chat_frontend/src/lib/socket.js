import {io} from 'socket.io-client'

const BASE_URL = import.meta.env.VITE_BACKEND_URL.replace('/api','')


export const socketInstance = io(
    BASE_URL,
    {
        autoConnect: false,
        transports: ['websocket','polling'],
        auth: (callback) => callback({ token: localStorage.getItem('token') })
    }
)

export const connectSocket = (refreshCredentials = false) => {
    if (refreshCredentials && socketInstance.connected) {
        socketInstance.disconnect()
    }
    if (!socketInstance.connected) {
        socketInstance.connect()
    }
}