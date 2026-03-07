import {LogOut} from 'lucide-react'
import {axiosInstance} from '../lib/axios'
import {toast} from 'react-hot-toast'
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
                toast.success("Logged out successfully")
            props.setAuth(false)
            navigate('/')           
        }

        catch(error)
        {
            toast.error(error.response.data.message)
        }
      
    }

    return (
        <div className="container">
            <h4>{props.profile.name}</h4>
            <button className="logout-button" onClick={logout}>
                <LogOut/>         
            </button>
        </div>
    )
}

export default ProfileHeader