import './MessageBubble.css'

const MessageBubble = ({message,sent_at,status,mine}) =>
{
    const formatTime = () =>
    {
        const date = new Date(sent_at)
        return date.toLocaleTimeString([],{
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    }

    return (
        (mine) ?
            <>
                <div className="message-bubble-mine">
                    <p>{message}</p>
                    <p className="timestamp">{formatTime()}</p>
                </div>
                <p className="status-mine">{status}</p>
            </>
            :
            <>
                <div className="message-bubble-theirs">
                    <p>{message}</p>
                    <p className="timestamp">{formatTime()}</p>
                </div>
            </>
    )
}
export default MessageBubble