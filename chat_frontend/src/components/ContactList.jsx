import { useEffect, useState } from 'react'
import { axiosInstance } from "../lib/axios"
import { toast } from 'react-hot-toast'
import './ContactList.css'

const ContactList = ({setChatSelected})=>
{
    const [contacts,setContacts] = useState([])

    const selectChat = (other_user_id,display_name) =>
    {
        setChatSelected([null,display_name,false,other_user_id])
        console.log("Chat selected with user id: ",other_user_id)
    }    

    useEffect(()=>
    {
        const getContacts = async () => {
            
            try {
                const res = await axiosInstance.get(`/get-all-contacts`)
                setContacts(res.data.contacts)
            }

            catch(error) {
                toast.error(error.response.data.message || "Something went wrong!")
            }
        }
        getContacts()
    },[])

    return (
        <>
            {
                contacts.map(contact => 
                    <button key={contact.user_id} onClick={()=>{selectChat(contact.user_id,contact.name)}} className="contact-tile">{contact.name}</button>
                )
            }
        </>
    )
}

export default ContactList