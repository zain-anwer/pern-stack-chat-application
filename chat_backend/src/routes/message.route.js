import express from 'express';
import dotenv from 'dotenv';
import {getChatList, getMessages, sendMessage, readAll, getAllContacts} from '../controllers/message.controller.js';
import {protectRoute} from '../middleware/auth.middleware.js';
import {arcjetProtection} from '../middleware/arcjet.middleware.js';

dotenv.config();

const router = express.Router();
router.use(protectRoute);

router.get("/get-all-contacts",getAllContacts)
router.get("/chats",getChatList);
router.get("/messages/:otherUserId",getMessages);
router.post("/create-group",createGroup);
router.post("/send/:id",sendMessage);
router.put("/read-all/:id",readAll);

export default router;
