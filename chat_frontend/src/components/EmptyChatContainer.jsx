import {MessageCircleOff} from 'lucide-react'

const EmptyChatContainer = () =>
{
    return(
        <div style={{display:"flex", flexDirection:"column",gap:"1.5rem" ,alignItems: "center",padding:"10%", alignSelf:"center", fontSize:"150%"}}>
            No Conversation Selected
            <img style={{width:'20vw'}} src='../../images/empty_conversation_icon.png'/>
        </div>
    )
}

export default EmptyChatContainer