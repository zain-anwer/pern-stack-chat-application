import { useEffect, useState } from 'react'
import { Bot } from 'lucide-react'
import { axiosInstance } from "../lib/axios"
import { toast } from 'react-hot-toast'
import './ContactList.css'

const ContactList = ({setChatSelected})=>
{
    const [contacts,setContacts] = useState(null)

    const selectChat = (other_user_id,display_name,profile_picture) =>
    {
        setChatSelected([null,display_name,false,other_user_id,profile_picture])
        console.log("Chat selected with user id: ",other_user_id)
    }    

    useEffect(() => {
        let cancelled = false
        const getContacts = async () => {
            try {
                const res = await axiosInstance.get(`/get-all-contacts`)
                if (!cancelled) {
                    setContacts(res.data.contacts)
                }
            }
            catch(error) {
                if (!cancelled) {
                    toast.error(error.response?.data?.message || "Something went wrong!")
                    setContacts([])
                }
            }
        }
        getContacts()

        return () => {
            cancelled = true
        }
    },[])

    return (
        <div className={`contacts ${contacts === null ? 'has-placeholder' : ''}`}>
            {contacts === null
                ? <p className="contacts-placeholder">Loading Contacts ... <Bot size={20} aria-hidden="true" /></p>
                : contacts.map(contact =>
                    <button key={contact.user_id} onClick={()=>{selectChat(contact.user_id,contact.name,contact.profile_picture)}} className="contact-tile">
                        <img
                            className="contact-tile-avatar"
                            src={contact.profile_picture && contact.profile_picture !== "/data/profileImages/default.jpg" ? contact.profile_picture : "/images/default_dp.png"}
                            alt=""
                        />
                        <span className="contact-tile-name">{contact.name}</span>
                    </button>
                )
            }
        </div>
    )
}

export default ContactList