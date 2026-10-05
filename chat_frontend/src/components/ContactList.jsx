import { useEffect, useState } from 'react'
import { Bot } from 'lucide-react'
import { axiosInstance } from "../lib/axios"
import { toast } from 'react-hot-toast'
import './ContactList.css'

const ContactList = ({setChatSelected})=>
{
    const [contacts,setContacts] = useState(null)

    const selectChat = (other_user_id,display_name) =>
    {
        setChatSelected([null,display_name,false,other_user_id])
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
                    <button key={contact.user_id} onClick={()=>{selectChat(contact.user_id,contact.name)}} className="contact-tile">{contact.name}</button>
                )
            }
        </div>
    )
}

export default ContactList