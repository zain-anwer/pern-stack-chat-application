import { pool } from '../lib/db.js';
import { generateToken } from '../lib/utils.js';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// using the env file to get salt rounds for bcrypt
dotenv.config();

export const signup = async (req,res) => 
    { 
        try
        {
            const {name, email, password} = req.body;

            // check availability

            if (!name || !email || !password)
                return res.status(400).json({message:"All fields are required"}); 

            // check password length

            if (password.length < 6)
                return res.status(400).json({message:"Password must be six characters or greater"});

            // Add further validations if necessary
            // *

            let result = await pool.query("SELECT * from Users where name = $1 and email = $2;",[name,email]);

            if (result.rows.length > 0)
                return res.status(409).json("User already exists");
            
            // encrypting password

            const encrypted_password = bcrypt.hash(password,process.env.SALT_ROUNDS);

            result = await pool.query("INSERT INTO Users (name, email, password) values($1,$2,$3) RETURNING *;",[name,email,encrypted_password]);

            console.log(result)
            
            // Function that generates token and sends it as a cookie through the res object

            const id = result.rows[0].user_id;
            const token = generateToken(result.rows[0].user_id,res);

            return res.status(200).json({
                "success": true,
                "user": {
                "id": id,
                "name": name,
                "email": email
                },
                token
            });
        }
        catch (error)
        {
            console.error("Error in signup : ",error);
            res.status(500).json({message:"Internal Server Error"});
        }
    };

export const login = async (req,res) => 
    {
        const {email, password} = req.body;
       
        try
        {
            let result = await pool.query("SELECT password from Users where email = $1;",[email]);
           
            // user does not exist

            if (result.rows.length == 0) 
               return res.status(401).json({message: "Invalid Credentials"});

            // user exists


            // check whether password is correct or not

            const isMatch = bcrypt.compare(password,result.rows[0].password);

            if (!isMatch)
            {
                console.log("Incorrect password entered throwing HTTP ERROR 401 - UNAUTHORIZED");
                res.status(401).json({message:"Incorrect Password"});
            }

            const id = result.rows[0].user_id.toString();
            const fullname = result.rows[0].name;
            const token = generateToken(result.rows[0].user_id,res);

            return res.status(200).json({
                "success": true,
                "user": {
                "id": id,
                "name": fullname,
                "email": email
                },
                token
            });

        }
        
        catch (error)
        {
            console.error("Error in Signin: ",error);
        }
    };

export const logout = async (_,res) => 
    {
        res.cookie("jwt","",{maxAge:0});
        return res.status(200).json({message: "Logged out successfully"});   
    };


export const getProfile = async (req,res) =>
{
    try{
        const userId = req.userId

        const result = await pool.query("SELECT name, email, password from Users where user_id = $1;",[userId])
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            name : result.rows[0].name,
            email : result.rows[0].email,
            password : result.rows[0].password
        })
    }
    catch(error)
    {
        console.log(error)
        res.status(500).json({message:"Internal Server Error"})
    }
}

// to update any information probably profile pictures and stuff
/*
Notes:
1. Include boolean fields to get the list of changed variables
2. If password_changed then req.password to match or something equivalent I guess
3. That's all for now

*/

export const updateProfile = async (req,res) => {};
