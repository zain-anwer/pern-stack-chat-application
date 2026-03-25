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

// 1-1 chats
router.get("/messages/chat/:other_user_id",getMessages);
router.post("/send/chat/:receiver_id",sendMessage);

// group chats
router.get("/messages/group-chat/:conversation_id",getMessages);
router.post("/send/group-chat/:conversation_id",sendMessage);

router.put("/read-all/:conversation_id",readAll);

export default router;
