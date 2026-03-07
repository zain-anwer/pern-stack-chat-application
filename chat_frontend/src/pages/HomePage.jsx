import ChatContainer from "../components/ChatContainer"
import EmptyChatContainer from "../components/EmptyChatContainer"
import ContactList from "../components/ContactList"
import ChatList from "../components/ChatList"
import ProfileHeader from "../components/ProfileHeader"
import {axiosInstance} from "../lib/axios"
import {useState,useEffect} from 'react'
import {toast} from 'react-hot-toast'
import './HomePage.css' 


const HomePage = ({setAuth})=> {

   const [profile,setProfile] = useState({name:"",email:"",password:""})
   const [activeTab,setActiveTab] = useState("chats")
   const [chatSelected,setChatSelected] = useState(null)

   useEffect(() => {
      
      const fetchProfile = async () => {  
         
         try{
            console.log("Hello this is the fetch profile function")
            const res = await axiosInstance("/auth/get-profile")
            setProfile({name: res.data.name, email: res.data.email, password: res.data.password})
         }

         catch(error)
         {
            toast.error(error.response.data.message || "Something went wrong")
         }

      }
      fetchProfile()
   }
   ,[])

   return (
      <div className="container">
         <div className="left-area">
           <ProfileHeader profile={profile} setAuth={setAuth}/>
           { (activeTab === "chats") ? <ChatList/> : <ContactList/> }
         </div>
         <div className="right-area">
            { (chatSelected === null) ? <EmptyChatContainer/> : <ChatContainer/> }
         </div>
      </div>
   )

}

export default HomePage