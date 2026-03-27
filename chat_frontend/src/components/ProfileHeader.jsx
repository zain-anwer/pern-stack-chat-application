import { LogOut,CircleUserRound,UserPen } from 'lucide-react'
import { axiosInstance } from '../lib/axios'
import { socketInstance } from '../lib/socket'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import './ProfileHeader.css'

const ProfileHeader = (props) => {

    const navigate = useNavigate()
    const logout = async () =>
    {   
        console.log("Clickk")
        try{ 
            const res = await axiosInstance.post("/auth/logout")
            if (res.status == 200)
            {
                toast.success("Logged out successfully")
                socketInstance.disconnect()
                props.setAuth(false)
                navigate('/')       
            }    
        }

        catch(error)
        {
            toast.error(error.response.data.message)
        }
      
    }

    return (
        <div className="profile-info-area">
            <div className="name-area">
                <CircleUserRound size={35} style={{marginRight:"5%"}}/>
                <h3 style={{fontFamily:"Inter", width:"100%",whiteSpace: "nowrap", overflow:"hidden", textOverflow:"ellipsis"}} >{props.profile.name}</h3>
            </div>
            <div className="button-area">
                <button className="logout-button" onClick={logout}>
                <LogOut className="logout-icon" size={25}/>         
                </button>
                <button onClick={()=>{toast.error("Edit-Profile component hasn't been developed yet :(")}} className="profile-edit-button">
                    <UserPen className="profile-edit-icon" size={25}/>
                </button>
            </div>
        </div>
    )
}

export default ProfileHeader