import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import MessageBubble from './MessageBubble.jsx'
import { MessageSquareOff, SendHorizonal } from 'lucide-react'
import { axiosInstance } from '../lib/axios.js'
import { socketInstance } from '../lib/socket.js'
import { toast } from 'react-hot-toast'
import './ChatContainer.css'

/* chat_information = [conversation_id,display_name,is_group,other_user_id] */

const statusPriority = { sending: 0, sent: 1, delivered: 2, read: 3 }

const latestStatus = (first, second) =>
    (statusPriority[second] ?? 0) > (statusPriority[first] ?? 0) ? second : first

const mergeMessages = (current, incoming, knownStatuses) => {
    const merged = new Map()

    for (const message of [...current, ...incoming]) {
        const key = String(message.message_id)
        const previous = merged.get(key)
        const cachedStatus = knownStatuses.get(key)
        const incomingStatus = message.status ?? 'sent'
        const status = latestStatus(
            latestStatus(previous?.status ?? incomingStatus, incomingStatus),
            cachedStatus ?? incomingStatus
        )
        merged.set(key, { ...previous, ...message, status })
    }

    return [...merged.values()].sort(
        (first, second) => new Date(first.sent_at) - new Date(second.sent_at)
    )
}

const ChatContainer = ({currentUserId,chat_information,setChatSelected,setReadRefreshes,onlineUsers}) =>
{
    const scrollRef = useRef(null)
    const knownStatuses = useRef(new Map())
    const temporaryMessageSequence = useRef(0)
    const [currentMessage,setCurrentMessage] = useState("")
    const chatKey = chat_information[2]
        ? `conversation:${chat_information[0]}`
        : `contact:${chat_information[3]}`
    const activeChatKey = useRef(chatKey)
    useLayoutEffect(() => {
        activeChatKey.current = chatKey
    },[chatKey])
    const [messageState,setMessageState] = useState(() => ({ chatKey, messages: [] }))
    const messages = useMemo(
        () => messageState.chatKey === chatKey ? messageState.messages : [],
        [messageState, chatKey]
    )
    const setMessages = useCallback(update => {
        setMessageState(previous => {
            if (activeChatKey.current !== chatKey) return previous
            const current = previous.chatKey === chatKey ? previous.messages : []
            const next = typeof update === 'function' ? update(current) : update
            return { chatKey, messages: next }
        })
    },[chatKey])

    const updateMessageStatus = useCallback((messageId, status) => {
        const key = String(messageId)
        const nextStatus = latestStatus(knownStatuses.current.get(key), status)
        knownStatuses.current.set(key, nextStatus)
        setMessages(prev => prev.map(message =>
            String(message.message_id) === key
                ? { ...message, status: latestStatus(message.status, nextStatus) }
                : message
        ))
    },[setMessages])

    useEffect(() => {
        const isCurrentConversation = conversationId =>
            !conversationId ||
            !chat_information[0] ||
            String(conversationId) === String(chat_information[0])

        const deliveryHandler = ({message_id,conversation_id,status}) => {
            if (isCurrentConversation(conversation_id)) {
                updateMessageStatus(message_id, status)
            }
        }

        const readHandler = ({message_id,conversation_id,readBy,status}) => {
            if (
                isCurrentConversation(conversation_id) &&
                (chat_information[2] || String(readBy) === String(chat_information[3]))
            ) {
                updateMessageStatus(message_id, status)
            }
        }

        socketInstance.on("messageDelivered",deliveryHandler)
        socketInstance.on("readSingleMessage",readHandler)
        return () => {
            socketInstance.off("messageDelivered",deliveryHandler)
            socketInstance.off("readSingleMessage",readHandler)
        }
    },[chat_information, updateMessageStatus])

    useEffect(()=>
    {
        if (scrollRef.current) {
         scrollRef.current.scrollIntoView({behavior:"smooth"})
        }
    },[messages])

    useEffect(() => {
        let cancelled = false

        const readMessagesHandler = ({conversation_id,readBy,message_statuses = []}) => {
            if (
                String(conversation_id) === String(chat_information[0]) &&
                (chat_information[2] || String(readBy) === String(chat_information[3]))
            ) {
                message_statuses.forEach(({message_id,status}) =>
                    updateMessageStatus(message_id, status)
                )
            }
        }

        const messageHandler = async newMessage => {
            const belongsToOpenChat =
                (chat_information[0] &&
                    String(newMessage.conversation_id) === String(chat_information[0])) ||
                (!chat_information[2] &&
                    String(newMessage.sender_id) === String(chat_information[3]))
            if (!belongsToOpenChat) return

            setMessages(prev => mergeMessages(prev, [newMessage], knownStatuses.current))
            try {
                await axiosInstance.put(`/read-message/${newMessage.message_id}`)
                if (cancelled) return
                updateMessageStatus(newMessage.message_id, 'read')
                setReadRefreshes(prev => prev + 1)
            } catch (error) {
                console.error(
                    "Error updating read status:",
                    error.response?.status,
                    error.response?.data
                )
            }
        }

        const getMessages = async () => {
            try {
                let conversationId = chat_information[0]
                if (!conversationId) {
                    const result = await axiosInstance.get(`/convo-id/${chat_information[3]}`)
                    conversationId = result.data.conversation_id
                }
                const result = await axiosInstance.get(`/messages/${conversationId}`)
                if (cancelled) return
                setMessages(prev =>
                    mergeMessages(prev, result.data.messages, knownStatuses.current)
                )
                setReadRefreshes(prev => prev + 1)
            } catch (error) {
                if (cancelled) return
                if (error.response?.status === 404) {
                    return
                }
                toast.error(error.response?.data?.message || "Something Went Down/Wrong!")
            }
        }

        socketInstance.on("getMessage",messageHandler)
        socketInstance.on("readMessages",readMessagesHandler)
        getMessages()

        return () => {
            cancelled = true
            socketInstance.off("getMessage",messageHandler)
            socketInstance.off("readMessages",readMessagesHandler)
        }
    },[chat_information, chatKey, currentUserId, setMessages, setReadRefreshes, updateMessageStatus])

    const handleSubmit = (e) => {
        e.preventDefault()
        sendMessage()
    }

    const sendMessage = async () =>
    {
        const messageText = currentMessage.trim()
        
        if (messageText.length == 0)
        {
            toast("Please refrain from sending empty messages ಠ_ಠ")
            return
        }
        
        const tempId = `temp-${Date.now()}-${temporaryMessageSequence.current++}`

        const optimisticMessage = {
            message_id: tempId,
            sender_id: currentUserId,
            message: messageText,
            sent_at: new Date().toISOString(),
            status: 'sending',
        }
        
        setMessages(prev => [...prev,optimisticMessage])
        setCurrentMessage("")

        try{
            let res;
            if (chat_information[2])
                res = await axiosInstance.post(`/send/group-chat/${chat_information[0]}`,{message:messageText,userId:currentUserId})
            else
                res = await axiosInstance.post(`/send/chat/${chat_information[3]}`,{message:messageText,userId:currentUserId})

            const newMessage = res.data.new_message
            const messageKey = String(newMessage.message_id)
            const status = latestStatus(
                newMessage.status ?? 'sent',
                knownStatuses.current.get(messageKey)
            )
            knownStatuses.current.set(messageKey, status)
            setMessages(prev => mergeMessages(
                prev.filter(msg => msg.message_id !== tempId),
                [{ ...newMessage, status }],
                knownStatuses.current
            ))
            setReadRefreshes(prev => prev + 1)

            if (
                !chat_information[0] &&
                res.data.new_message?.conversation_id &&
                activeChatKey.current === chatKey
            ) {
                setChatSelected([
                    res.data.new_message.conversation_id,
                    chat_information[1],
                    false,
                    chat_information[3],
                    chat_information[4]
                ])
            }

        }
        catch(error) {
            toast.error(error.response?.data?.message || "Failed to send message")
            setMessages(prev => prev.filter(msg => msg.message_id !== tempId))
        }
    }

    const closeChat = () =>
    {
        setChatSelected([])
    }

    return (
        <> 
            <div className="opened-chat-info-area">
                <div className="dp-area">
                    <img
                        className="dp"
                        src={chat_information[4] && chat_information[4] !== "/data/profileImages/default.jpg" ? chat_information[4] : "/images/default_dp.png"}
                        alt={`${chat_information[1] || "Chat"} profile`}
                    />
                </div>
                <div className="name-status-area">
                    <h3>{chat_information[1]}</h3>
                    {(onlineUsers.some(userId => String(userId) === String(chat_information[3]))? <sub>Online</sub> : <sub>Offline</sub>)}
                </div>
                <button onClick={()=>{closeChat()}} className="close-chat-button">close chat</button>
            </div>
            <div className={`messages-area ${messages.length === 0 ? 'is-empty' : ''}`}>
                { (messages.length != 0) ? 
                    (messages.map(
                        (message) => 
                            <MessageBubble key={message.message_id} message={message.message} sent_at={message.sent_at} status={message.status} mine={(Number(message.sender_id) === Number(currentUserId))? true:false}/>
                        )
                    ) 
                    : 
                    (<p className="messages-placeholder">No messages yet <MessageSquareOff size={20} aria-hidden="true" /></p>)
                }
                <div ref={scrollRef}/>
            </div>

          
            <form className="message-entry-area" onSubmit={handleSubmit}>
        
                <input 
                    placeholder="Type a message" 
                    value={currentMessage} 
                    onChange={(e)=>{setCurrentMessage(e.target.value)}} 
                />

                <button type="submit" className="send-button"><SendHorizonal className="send-icon" size={30}/></button>
                
            </form>
        </> 
    )
}

export default ChatContainer