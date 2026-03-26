import { useState, useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble.jsx'
import { SendHorizonal } from 'lucide-react'
import { axiosInstance } from '../lib/axios.js'
import { socketInstance } from '../lib/socket.js'
import { toast } from 'react-hot-toast'
import './ChatContainer.css'

/* chat_information = [conversation_id,display_name,is_group,other_user_id] */

const ChatContainer = ({chat_information,setChatSelected,setReadRefreshes,onlineUsers}) =>
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
        if (!chat_information) return;

        const handler = async (new_message) =>
        {
            setMessages(prev => [...prev,new_message])
            
            try {
                console.log("Message Id: ",new_message.message_id)
                await axiosInstance.put(`/read-message/${parseInt(new_message.message_id)}`);
            } 
            catch (err) {
                console.error("Error updating read status:", err.response?.status, err.response?.data);
            }
            setReadRefreshes(prev => prev + 1)
        }

        /* this is supposed to be an async listener I guess */
        socketInstance.on("getMessage",handler)

        const getMessages = async() =>
        {
            try {

                let res;
                console.log("This is the get messages function with convo id: ",chat_information[0])
                
                if (chat_information[0])
                    res = await axiosInstance.get(`/messages/${chat_information[0]}`)
                else
                {
                    const find_convo_result = await axiosInstance.get(`/convo-id/${chat_information[3]}`)
                    if (!find_convo_result.data.success)
                    {
                        setMessages(null)
                        return
                    }
                    res = await axiosInstance.get(`/messages/${find_convo_result.data.conversation_id}`)
                }
                console.log(res)
                
                setMessages(res.data.messages)
                setCurrentUserId(res.data.currentUserId)
                setReadRefreshes(prev => prev + 1)
            }
            catch(error) {
                toast.error(error.response.data.message || "Something Went Down/Wrong!")
            }
        }
        getMessages()

        return () => {
            socketInstance.off("getMessage",handler)
        }
    }
    ,[chat_information])

    const handleSubmit = (e) => {
        e.preventDefault()
        sendMessage()
    }


    const sendMessage = async () =>
    {
        try{
            let res;
            if (chat_information[2])
                res = await axiosInstance.post(`/send/group-chat/${chat_information[0]}`,{message:currentMessage,userId:currentUserId})
            else
                res = await axiosInstance.post(`/send/chat/${chat_information[3]}`,{message:currentMessage,userId:currentUserId})
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
                <div className="name-status-area">
                    <h3>{chat_information[1]}</h3>
                    {(onlineUsers.includes(chat_information[3])? <sub style={{fontFamily: 'Roboto'}}>Online</sub> : <sub style={{fontFamily: 'Roboto'}}>Offline</sub>)}
                </div>
                <button onClick={()=>{closeChat()}} className="close-chat-button">close chat</button>
            </div>
            <div className="messages-area">
                { (messages.length != 0) ? 
                    (messages.map(
                        (message) => 
                            <MessageBubble key={message.message_id} message={message.message} sent_at={message.sent_at} status={message.status} mine={(message.sender_id == currentUserId)? true:false}/>
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