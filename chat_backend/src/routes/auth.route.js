import express from 'express';
import {signup, login, logout, getProfile, updateProfile, updateProfilePicture, removeProfilePicture} from '../controllers/auth.controller.js'
import {protectRoute} from '../middleware/auth.middleware.js';
import {arcjetProtection} from '../middleware/arcjet.middleware.js';
import multer from 'multer';

const router = express.Router();
const profileImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: 5 * 1024 * 1024},
    fileFilter: (_,file,callback) => {
        if (!["image/jpeg","image/png","image/webp","image/gif"].includes(file.mimetype))
            return callback(new Error("Upload a JPEG, PNG, WebP, or GIF image"));
        return callback(null,true);
    }
}).single("image");

const handleProfileImageUpload = (req,res,next) => {
    profileImageUpload(req,res,(error) => {
        if (error)
            return res.status(400).json({message:error.message});
        return next();
    });
};

// .use function is used to provide the middleware function in a global manner 

//router.use(arcjetProtection);

router.post("/signup", signup)
  
router.post("/login", login)

router.post("/logout", logout)

router.get("/get-profile",protectRoute,getProfile)

router.put("/update-profile",protectRoute,updateProfile)

router.post("/update-profile-picture",protectRoute,handleProfileImageUpload,updateProfilePicture)

router.delete("/update-profile-picture",protectRoute,removeProfilePicture)

router.get("/check",protectRoute, (req,res) => res.status(200).json({userId:req.userId}));

export default router;
