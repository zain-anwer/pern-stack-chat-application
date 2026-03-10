import jwt from 'jsonwebtoken'
import { pool } from '../lib/db.js'
import dotenv from 'dotenv'


// give us access to environment varibles through process.env.ENV_VAR

dotenv.config()

const socketAuthMiddleware = async (socket,next) =>
{
    try{
        const token = socket.handshake.headers.cookie?.split("; ").find(row => row.startsWith("jwt"))?.split("=")[1]
        
        if (!token) {
            console.log("Token not provided")
            return next(new Error("Unauthorized - Token Not Provided"))
        }
        
        const decoded = jwt.verify(token,process.env.JWT_SECRET)
        
        if (!decoded){
            console.log("Token Invalid")
            return next(new Error("Unauthorized - Invalid Token"))   
        }

        socket.userId = decoded.userId

        const result = await pool.query("SELECT * FROM Users where user_id = $1",[decoded.userId])
        socket.user = result.rows[0]

        next()
    }
    catch(error){
        console.log(error)
        next(new Error("Unauthorized - Authentication Failed"))   
    }
}

export default socketAuthMiddleware