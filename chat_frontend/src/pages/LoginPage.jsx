import { useState } from "react"
import {MessageCircleMore, UserKey} from "lucide-react"
import { axiosInstance } from "../lib/axios"
import {Link,useNavigate} from "react-router-dom"
import "./LoginPage.css"
import {toast} from "react-hot-toast"


const LoginPage = ()=>{

    // apparently you should store data in a state
    // useState function returns an array not an object
    // takes initial value as a parameter and returns the variable and the setter as an array
    
    const [formData,setFormData] = useState({email:"",password:""})
    const navigate = useNavigate()

    const handleSubmit = async (e) => 
    {
        e.preventDefault() // this prevents the page from reloading
        console.log("Values submitted I guess")
        await Login(formData)
    }

    const Login = async (formData) => {
        
        try { 
            const res = await axiosInstance.post("/auth/login",formData)
            if (res.data.success)
            {
                toast.success("Login Successful")
                navigate("/")
            }
            else 
                toast.error("Login Unsuccessful")
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
                    
                    <p>Login To Begin Chatting!</p>
                    
                    <MessageCircleMore size={40}/>
                    
                    <br/>
                    <br/>
                    
                    <form onSubmit={handleSubmit}>
                        
                        <label>Email
                            <input type="email" placeholder="kim.kardashian@gmail.com"
                                value={formData.email} onChange={(e)=>{setFormData({...formData,email:e.target.value})}}
                            />
                        </label>
                        
                        <label>Password
                            <input type="password" 
                                value={formData.password} onChange={(e)=>{setFormData({...formData,password:e.target.value})}}
                            />
                        </label>
                    
                      <button className="submit-button">Login</button>

                    </form>
                    <br/>
                    <Link to="/SignUpPage">Don't have an account yet? Signup</Link>

                </div>
                <div className="picture-area">
                </div>
            </div>
        </>
    )
}

export default LoginPage