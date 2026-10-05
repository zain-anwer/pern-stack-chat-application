import { useEffect, useState } from 'react'
import { Bot, MessageCircleOff } from 'lucide-react'
import { axiosInstance } from "../lib/axios"
import { toast } from 'react-hot-toast'
import { socketInstance } from '../lib/socket'
import './ChatList.css'

const ChatList = ({setReadRefreshes,readRefreshes,setChatSelected}) =>
{
    const [chatList,setChatList] = useState(null)
    
    // we will be using a use-effect to register a socket event on mount
    
    useEffect(()=>
    { 
        const handler = () =>
        {
            console.log("Inside the get message event handler -- updating unread count")
            // to trigger reloading to show newly arrived messages
            setReadRefreshes(prev => prev + 1)
        }

        socketInstance.on("getMessage",handler)

        return () =>
        {
            socketInstance.off("getMessage",handler)
        }

    },[setReadRefreshes])
    
    
    const selectChat = (conversation_id,display_name,is_group,other_user_id) =>
    {
        setChatSelected([conversation_id,display_name,is_group,other_user_id])
        console.log("Chat selected with conversation id: ",conversation_id)
    }
    
    useEffect(()=>{
        let cancelled = false
        const getChatList = async () => {
            try {
                const res = await axiosInstance("/chats")
                if (!cancelled) {
                    setChatList(res.data.chats)
                }
            }
            catch(error)
            {
                if (!cancelled) {
                    toast.error(error.response?.data?.message || "Error loading chats")
                }
            }
        }
        getChatList()

        return () => {
            cancelled = true
        }
    },[readRefreshes])

    return (
        <div className={`chats ${chatList === null || chatList.length === 0 ? 'has-placeholder' : ''}`}>
            { 
                (chatList === null) ? 
                    <p className="chat-list-placeholder">Loading Chats... <Bot size={20} aria-hidden="true" /></p>
                :
                (chatList.length == 0) ? 
                    <p className="chat-list-placeholder">No Chats Yet <MessageCircleOff size={20} aria-hidden="true" /></p>
                :
                    (
                        // make a chat tile pleasee
                        chatList.map(
                            (chat) =>
                                <button key={chat.conversation_id} className="chat-tile" onClick={()=>{selectChat(chat.conversation_id,chat.display_name,chat.is_group,chat.other_user_id)}}>{chat.display_name}{(chat.unread_count !== '0') ? <span className="unread_count">{chat.unread_count}</span>: ""}</button> 
                        )
                    )
            }
        </div>
    )
}

export default ChatList