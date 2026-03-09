import { useEffect, useState } from 'react'
import { axiosInstance } from "../lib/axios"
import { toast } from 'react-hot-toast'
import './ChatList.css'

const ChatList = ({readRefreshes,setChatSelected}) =>
{
    const [chatList,setChatList] = useState(null)
    
    const selectChat = (user_id,user_name) =>
    {
        setChatSelected([user_id,user_name])
        console.log("Chat selected with user id: ",user_id)
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
                                <button className="chat-tile" onClick={()=>{selectChat(chat.friend_id,chat.friend_name)}}>{chat.friend_name}{(chat.unread_count !== '0') ? <span className="unread_count">{chat.unread_count}</span>: ""}</button> 
                        )
                    )
            }
        </div>
    )
}

export default ChatList