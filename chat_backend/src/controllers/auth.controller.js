import { pool } from '../lib/db.js';
import { generateToken } from '../lib/utils.js';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';

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

            const encrypted_password = await bcrypt.hash(password,parseInt(process.env.SALT_ROUNDS));

            result = await pool.query("INSERT INTO Users (name, email, password) values($1,$2,$3) RETURNING *;",[name,email,encrypted_password]);

            console.log(result)
            
            // Function that generates token and sends it as a cookie through the res object

            const id = result.rows[0].user_id;
            const token = generateToken(result.rows[0].user_id);

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
            let result = await pool.query("SELECT * from Users where email = $1;",[email]);
           
            // user does not exist

            if (result.rows.length == 0) 
               return res.status(401).json({message: "Invalid Credentials"});

            // user exists


            // check whether password is correct or not

            const isMatch = await bcrypt.compare(password,result.rows[0].password);

            if (!isMatch)
            {
                console.log("Incorrect password entered throwing HTTP ERROR 401 - UNAUTHORIZED");
                return res.status(401).json({message:"Incorrect Password"});
            }

            const id = result.rows[0].user_id;
            const fullname = result.rows[0].name;
            const token = generateToken(result.rows[0].user_id);

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
        // token stored in local storage on the frontend will simply be deleted on the frontend
        // no clue if this will work but hope so :)
        /*
        res.clearCookie("jwt", {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "development" ? "strict" : "none",
        secure: process.env.NODE_ENV === "development" ? false : true,
         });
        */
        return res.status(200).json({message: "Logged out successfully"});   
    };


export const getProfile = async (req,res) =>
{
    try{
        const userId = req.userId

        const result = await pool.query("SELECT name, email, profile_picture from Users where user_id = $1;",[userId])
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            name : result.rows[0].name,
            email : result.rows[0].email,
            profilePicture: result.rows[0].profile_picture
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

export const updateProfile = async (req,res) =>
{
    try
    {
        const { currentPassword, name, email, newPassword, confirmPassword } = req.body;
        const requestedUpdates = [name !== undefined, email !== undefined, newPassword !== undefined]
            .filter(Boolean).length;

        if (typeof currentPassword !== "string" || !currentPassword || requestedUpdates !== 1)
            return res.status(400).json({message:"Enter your current password and submit one profile change"});

        if (name !== undefined && (typeof name !== "string" || !name.trim() || name.trim().length > 100))
            return res.status(400).json({message:"Name must be between 1 and 100 characters"});

        if (email !== undefined && typeof email !== "string")
            return res.status(400).json({message:"Enter a valid email address"});
        const normalizedEmail = email?.trim();
        if (email !== undefined && (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)))
            return res.status(400).json({message:"Enter a valid email address"});

        if (newPassword !== undefined) {
            if (typeof newPassword !== "string" || typeof confirmPassword !== "string")
                return res.status(400).json({message:"Enter and confirm your new password"});
            if (newPassword.length < 6)
                return res.status(400).json({message:"Password must be six characters or greater"});
            if (newPassword !== confirmPassword)
                return res.status(400).json({message:"Passwords do not match"});
        }

        const userResult = await pool.query(
            "SELECT password FROM Users WHERE user_id = $1;",
            [req.userId]
        );
        if (userResult.rows.length === 0)
            return res.status(404).json({message:"User not found"});

        const passwordMatches = await bcrypt.compare(currentPassword, userResult.rows[0].password);
        if (!passwordMatches)
            return res.status(401).json({message:"Current password is incorrect"});

        if (normalizedEmail !== undefined) {
            const existingEmail = await pool.query(
                "SELECT 1 FROM Users WHERE email = $1 AND user_id <> $2;",
                [normalizedEmail, req.userId]
            );
            if (existingEmail.rows.length > 0)
                return res.status(409).json({message:"That email address is already in use"});
        }

        if (newPassword !== undefined) {
            const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.SALT_ROUNDS, 10));
            await pool.query("UPDATE Users SET password = $1 WHERE user_id = $2;", [hashedPassword, req.userId]);
        } else if (normalizedEmail !== undefined) {
            await pool.query("UPDATE Users SET email = $1 WHERE user_id = $2;", [normalizedEmail, req.userId]);
        } else {
            await pool.query("UPDATE Users SET name = $1 WHERE user_id = $2;", [name.trim(), req.userId]);
        }

        const profileResult = await pool.query(
            "SELECT name, email, profile_picture FROM Users WHERE user_id = $1;",
            [req.userId]
        );
        const profile = profileResult.rows[0];
        return res.status(200).json({
            success: true,
            requiresLogout: newPassword !== undefined || normalizedEmail !== undefined,
            profile: {
                name: profile.name,
                email: profile.email,
                profilePicture: profile.profile_picture
            }
        });
    }
    catch (error)
    {
        if (error.code === "23505")
            return res.status(409).json({message:"That email address is already in use"});
        console.error("Error updating profile:", error);
        return res.status(500).json({message:"Unable to update profile"});
    }
};

export const updateProfilePicture = async (req,res) =>
{
    try
    {
        if (!req.file)
            return res.status(400).json({message:"Choose an image to upload"});

        const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET)
            return res.status(503).json({message:"Profile image uploads are not configured"});

        cloudinary.config({
            cloud_name: CLOUDINARY_CLOUD_NAME,
            api_key: CLOUDINARY_API_KEY,
            api_secret: CLOUDINARY_API_SECRET,
            secure: true
        });

        const uploadResult = await new Promise((resolve,reject) =>
        {
            cloudinary.uploader.upload_stream(
                {folder:"bubble-chat/profile-images", resource_type:"image"},
                (error,result) =>
                {
                    if (error)
                        return reject(error);
                    if (!result?.secure_url)
                        return reject(new Error("Cloudinary did not return an image URL"));
                    return resolve(result);
                }
            ).end(req.file.buffer);
        });

        const profileResult = await pool.query(
            "UPDATE Users SET profile_picture = $1 WHERE user_id = $2 RETURNING name, email, profile_picture;",
            [uploadResult.secure_url, req.userId]
        );
        if (profileResult.rows.length === 0)
            return res.status(404).json({message:"User not found"});

        const profile = profileResult.rows[0];
        return res.status(200).json({
            success: true,
            profile: {
                name: profile.name,
                email: profile.email,
                profilePicture: profile.profile_picture
            }
        });
    }
    catch (error)
    {
        console.error("Error uploading profile picture:", error);
        return res.status(500).json({message:"Unable to upload profile image"});
    }
};

export const removeProfilePicture = async (req,res) =>
{
    try
    {
        const profileResult = await pool.query(
            "UPDATE Users SET profile_picture = NULL WHERE user_id = $1 RETURNING name, email, profile_picture;",
            [req.userId]
        );
        const profile = profileResult.rows[0];
        return res.status(200).json({
            success: true,
            profile: {
                name: profile.name,
                email: profile.email,
                profilePicture: profile.profile_picture
            }
        });
    }
    catch (error)
    {
        console.error("Error removing profile picture:", error);
        return res.status(500).json({message:"Unable to remove profile image"});
    }
};
