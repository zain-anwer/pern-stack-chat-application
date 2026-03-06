import {Routes, Route} from 'react-router'
import { axiosInstance } from './lib/axios'
import { useEffect, useState } from 'react'
import SignUpPage from './pages/SignUpPage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import {LoaderPinwheel} from 'lucide-react'
import {Toaster} from "react-hot-toast"
import './App.css'


function App() {

  // one time user authentication check
  // we will be using use effect function that requires a simple callback function
  // axios always wraps responses in a data object
  // use try catch blocks when dealing with error messages because the promise is rejected or some shit

  const [userAuthenticated,authenticate] = useState(null)

  useEffect( () => {
    const checkAuth = async () =>
    {
      try{
         const res = await axiosInstance.get("/auth/check")
        if (res.data.userId)
          authenticate(true)
      }
     
      catch{ 
        authenticate(false)
      }
    }
    checkAuth()
  }
  ,[]) // the empty array shows that the effect will not rerun based on some value changing
    
  // placing the loading animated here so that it rerenders
  // return a loading icon preferably

  if (userAuthenticated === null)
    return(
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <LoaderPinwheel className="animate-spin" size={40}/>
    </div>)

  return (
    <>
      <Toaster/>
      <div className="main-layout">
        <Routes>
          <Route path="/" element= {userAuthenticated? <HomePage /> : <LoginPage/>} />
          <Route path="/SignUpPage" element={<SignUpPage/>} />
          <Route path="/LoginPage" element={<LoginPage/>} />
        </Routes>
      </div>
    </>
  )
}

export default App
