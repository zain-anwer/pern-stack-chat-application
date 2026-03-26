import { useEffect, useState } from 'react'
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

    },[])
    
    
    const selectChat = (conversation_id,display_name,is_group,other_user_id) =>
    {
        setChatSelected([conversation_id,display_name,is_group,other_user_id])
        console.log("Chat selected with conversation id: ",conversation_id)
    }
    
    useEffect(()=>{
        const getChatList = async () => {
            try {
                const res = await axiosInstance("/chats")
                setChatList(res.data.chats)
                console.log(res.data.chats)
            }
            catch(error)
            {
                toast.error(error.response.data.message || "Error loading chats")
            }
        }
        getChatList()
    },[readRefreshes])

    return (
        <div className="chats">
            { 
                (chatList === null) ? 
                    <p>No Chats Yet</p>
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