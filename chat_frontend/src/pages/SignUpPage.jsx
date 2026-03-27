import { useState } from "react"
import { MessageCircleMore, User, Lock, Mail } from "lucide-react"
import { axiosInstance } from "../lib/axios"
import { socketInstance } from "../lib/socket"
import { Link,useNavigate } from "react-router-dom"
import "./AuthPage.css"
import { toast } from "react-hot-toast"


const SignUpPage = ({setAuth})=>{

    // apparently you should store data in a state
    // useState function returns an array not an object
    // takes initial value as a parameter and returns the variable and the setter as an array
    
    const [formData,setFormData] = useState({name:"",email:"",password:""})
    const navigate = useNavigate()

    const handleSubmit = async (e) => 
    {
        e.preventDefault() // this prevents the page from reloading
        console.log("Values submitted I guess")
        await SignUp(formData)
    }
 
    const SignUp = async (formData) => {
        
        try { 
            const res = await axiosInstance.post("/auth/signup",formData)
            if (res.data.success)
            {
                toast.success("Sign Up Successful")
                if (!socketInstance.connected) socketInstance.connect();
                setAuth(true)
                navigate("/")
            }
            else 
                toast.error("Signup Unsuccessful")
        }

        catch (error) {
            toast.error(error.response.data.message || "Something went wrong")
        }

    }

    return(
        <>
            <div className="container">
                
                <div className="form-area">
                    
                    <h2>Bubble Chat</h2>
                    
                    <p>Signup To Begin Chatting!</p>
                    
                    <img style={{width:'7vw'}} src='../../images/chat_image.png'/>

                    <form onSubmit={handleSubmit}>
                        
                        <label>Name
                            <div className="input-group">
                                <User/>
                                <input type="text" placeholder="Kim Kardashian"
                                    value={formData.name} onChange={(e)=>{setFormData({...formData,name:e.target.value})}}
                                />
                            </div>
                        </label>
                        
                        <label>Email
                            <div className="input-group">
                                <Mail/>
                                <input type="email" placeholder="kim.kardashian@gmail.com"
                                    value={formData.email} onChange={(e)=>{setFormData({...formData,email:e.target.value})}}
                                />
                            </div>
                        </label>
                        
                        <label>Password
                            <div className="input-group">
                                <Lock/>
                                <input type="password" 
                                    value={formData.password} onChange={(e)=>{setFormData({...formData,password:e.target.value})}}
                                />
                            </div>
                        </label>
                    
                      <button className="submit-button">Create Account</button>

                    </form>
                    <br/>
                    <Link className="login-link" to="/LoginPage">Already have an account? Login</Link>

                </div>
                <div className="picture-area">
                    <img src='../../images/chat_poster.png'/>
                </div>
            </div>
        </>
    )
}

export default SignUpPage