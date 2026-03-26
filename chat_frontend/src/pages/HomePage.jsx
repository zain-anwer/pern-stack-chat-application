import ChatContainer from "../components/ChatContainer"
import EmptyChatContainer from "../components/EmptyChatContainer"
import ContactList from "../components/ContactList"
import ChatList from "../components/ChatList"
import ProfileHeader from "../components/ProfileHeader"
import {axiosInstance} from "../lib/axios"
import {useState,useEffect} from 'react'
import {toast} from 'react-hot-toast'
import './HomePage.css' 


const HomePage = ({setAuth,onlineUsers})=> {

   const [readRefreshes,setReadRefreshes] = useState(0)
   const [profile,setProfile] = useState({name:"",email:"",password:""})
   const [activeTab,setActiveTab] = useState("chats")
   const [chatSelected,setChatSelected] = useState([])

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
            <div className="profileInfo-area">
               <ProfileHeader profile={profile} setAuth={setAuth}/>
            </div>
            <div className="active-tab-area">
               <button onClick={()=>{setActiveTab("chats")}} className="chats-button">Chats</button>
               <h1>|</h1>
               <button onClick={()=>{setActiveTab("contacts")}} className="contacts-button">Contacts</button>
            </div>
            <div className="chatlist-area">
               { (activeTab === "chats") ? <ChatList setReadRefreshes={setReadRefreshes} readRefreshes={readRefreshes} setChatSelected={setChatSelected}/> : <ContactList setChatSelected={setChatSelected}/> }
            </div>
         </div>
         <div className="right-area">
            { (chatSelected.length == 0) ? <EmptyChatContainer/> : <ChatContainer onlineUsers={onlineUsers} readRefreshes={readRefreshes} setReadRefreshes={setReadRefreshes} setChatSelected={setChatSelected} chat_information={chatSelected}/> }
         </div>
      </div>
   ) 

}

export default HomePage