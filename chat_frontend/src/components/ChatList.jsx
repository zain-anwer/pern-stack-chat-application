import { useEffect, useState } from 'react'
import { axiosInstance } from "../lib/axios"
import { toast } from 'react-hot-toast'

const ChatList = () =>
{
    const [chatList,setChatList] = useState(null)
    
    const selectChat = () =>
    {

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
    },[])

    return (
        <div>
            { 
                (chatList === null) ? 
                    <p>No Chats Yet</p>
                :
                    (
                        // make a chat tile pleasee
                        chatList.map(
                            (chat) =>
                                <button on>{chat.friend_name}{chat.unread_count}</button> 
                        )
                    )
            }
        </div>
    )
}

export default ChatList