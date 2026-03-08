import { useState, useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble.jsx'
import { SendHorizonal } from 'lucide-react'
import { axiosInstance } from '../lib/axios.js'
import { toast } from 'react-hot-toast'
import './ChatContainer.css'

const ChatContainer = ({user_id}) =>
{
    const scrollRef = useRef(null)
    const [messages,setMessages] = useState([])
    const [currentUserId,setCurrentUserId] = useState(null)
    const [currentMessage,setCurrentMessage] = useState("")

    useEffect(()=>
    {
        if (scrollRef.current) {
         scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    },[messages])

    useEffect(()=>
    {
        const getMessages = async() =>
        {
            try {
                const res = await axiosInstance.get(`/messages/${user_id}`)
                setMessages(res.data.messages)
                setCurrentUserId(res.data.currentUserId)
            }
            catch(error) {
                toast.error(error.response.data.message || "Something Went Down/Wrong!")
            }
        }
        getMessages()
    }
    ,[user_id])

    const handleSubmit = (e) => {
        e.preventDefault()
        sendMessage()
    }


    const sendMessage = async () =>
    {
        try{
            const res = await axiosInstance.post(`/send/${user_id}`,{message:currentMessage,userId:currentUserId})
            setCurrentMessage("")
            setMessages(prev => [...prev,res.data.new_message])
        }
        catch(error) {
            toast.error(error.response.data.message || "Something went wrong")
        }
    }


    return (
        <>
            <div>
            </div>
            <div ref={scrollRef} className="messages-area">
                { (messages.length != 0) ? 
                    (messages.map(
                        (message) => 
                            <MessageBubble message={message.message} sent_at={message.sent_at} status={message.status} mine={(message.sender_id === currentUserId)? true:false}/>
                        )
                    ) 
                    : 
                    (<p>No messages yet</p>)
                }
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