import {MessageCircleOff} from 'lucide-react'

const EmptyChatContainer = () =>
{
    return(
        <div style={{display:"flex", flexDirection:"column",gap:"1.5rem" ,alignItems: "center",padding:"10%", alignSelf:"center", fontSize:"150%"}}>
            No Conversations Yet
            <MessageCircleOff size={40}/>
        </div>
    )
}

export default EmptyChatContainer