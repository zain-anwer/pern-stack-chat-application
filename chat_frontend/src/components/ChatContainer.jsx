import { useState, useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble.jsx'
import { SendHorizonal } from 'lucide-react'
import { axiosInstance } from '../lib/axios.js'
import { toast } from 'react-hot-toast'
import './ChatContainer.css'

const ChatContainer = ({readRefreshes,user_information,setChatSelected,setReadRefreshes}) =>
{
    const scrollRef = useRef(null)
    const [messages,setMessages] = useState([])
    const [currentUserId,setCurrentUserId] = useState(null)
    const [currentMessage,setCurrentMessage] = useState("")

    useEffect(()=>
    {
        if (scrollRef.current) {
         scrollRef.current.scrollIntoView({behavior:"smooth"})
        }
    },[messages])

    useEffect(()=>
    {
        if (!user_information || !user_information[0]) return;
        const getMessages = async() =>
        {
            try {
                const res = await axiosInstance.get(`/messages/${user_information[0]}`)
                setMessages(res.data.messages)
                setCurrentUserId(res.data.currentUserId)
                const messages = res.data.messages
                if (messages.length != 0 && messages[messages.length-1].sender_id != res.data.currentUserId)
                {
                    const res2 = await axiosInstance.put(`/read-all/${user_information[0]}`)
                    console.log(res2.data.messages_read)
                    setReadRefreshes(prev => prev + 1)
                }

            }
            catch(error) {
                toast.error(error.response.data.message || "Something Went Down/Wrong!")
            }
        }
        getMessages()
    }
    ,[user_information[0]])

    const handleSubmit = (e) => {
        e.preventDefault()
        sendMessage()
    }


    const sendMessage = async () =>
    {
        try{
            const res = await axiosInstance.post(`/send/${user_information[0]}`,{message:currentMessage,userId:currentUserId})
            setCurrentMessage("")
            setMessages(prev => [...prev,res.data.new_message])
        }
        catch(error) {
            toast.error(error.response.data.message || "Something went wrong")
        }
    }

    const closeChat = () =>
    {
        setChatSelected([])
    }


    return (
        <>
            <div className="opened-chat-info-area">
                <h3>{user_information[1]}</h3>
                <button onClick={()=>{closeChat()}} className="close-chat-button">close chat</button>
            </div>
            <div className="messages-area">
                { (messages.length != 0) ? 
                    (messages.map(
                        (message) => 
                            <MessageBubble message={message.message} sent_at={message.sent_at} status={message.status} mine={(message.sender_id === currentUserId)? true:false}/>
                        )
                    ) 
                    : 
                    (<p>No messages yet</p>)
                }
                <div ref={scrollRef}/>
            </div>

           
          
            <form className="message-entry-area" onSubmit={handleSubmit}>
        
                <input placeholder="Type a message" value={currentMessage} onChange={(e)=>{setCurrentMessage(e.target.value)
                    console.log(e.target.value)
                }}/>
                <button type="submit" className="send-button"><SendHorizonal className="send-icon" size={30}/></button>
                
            </form>
        </> 
    )
}

export default ChatContainer