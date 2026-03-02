import {Routes, Route} from 'react-router'
import ChatPage from './pages/ChatPage'
import SignUpPage from './pages/SignUpPage'
import LoginPage from './pages/LoginPage'
import ChatListPage from './pages/ChatListPage'
import './App.css'
import HomePage from './pages/HomePage'

function App() {

  return (
    <>
      <div className="main-layout">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/ChatPage" element={<ChatPage/>} />
          <Route path="/SignUpPage" element={<SignUpPage/>} />
          <Route path="/LoginPage" element={<LoginPage/>} />
          <Route path="/ChatListPage" element={<ChatListPage/>} />
        </Routes>
      </div>
    </>
  )
}

export default App
