import './HomePage.css'
import {useNavigate} from 'react-router-dom'


const HomePage = ()=> {

    const navigate = useNavigate()

    const login = () =>
    {
        // doing some stuff
        

        // This here is a sneaky little thing that changes the URL 
        navigate('/LoginPage')
    }

    const signup = () =>
    {
        // doing some stuff probably
        navigate('/SignupPage')
    }

    return(
        <div>
            <p style={{fontSize: '50px'}} >"Bubble Chat"</p>
            <button onClick={login} className="glass-panel" style={{marginRight: '10px'}}>Login</button>
            <button onClick={signup} className="glass-panel">Signup</button>
        </div>
    )

}

export default HomePage