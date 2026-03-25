import express from 'express';
import dotenv from 'dotenv';
import {getChatList, getMessages, sendMessage, getAllContacts, getConvoId} from '../controllers/message.controller.js';
import {protectRoute} from '../middleware/auth.middleware.js';
import {arcjetProtection} from '../middleware/arcjet.middleware.js';

dotenv.config();

const router = express.Router();
router.use(protectRoute);

router.get("/get-all-contacts",getAllContacts)
router.get("/chats",getChatList);
router.get("/messages/:conversation_id",getMessages);

// 1-1 chats  
router.post("/send/chat/:receiver_id",sendMessage);

// group chats
router.post("/send/group-chat/:conversation_id",sendMessage);

// to find a conversation id for a chat (for chats opened through contact list)
router.get("/convo-id/:other_user_id",getConvoId)

//router.put("/read-all/:conversation_id",readAll);

export default router;
