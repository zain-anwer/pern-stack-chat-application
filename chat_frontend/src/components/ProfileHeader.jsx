import { useRef, useState } from 'react'
import { LogOut,UserPen, X, UserRound, Mail, Lock, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { createPortal } from 'react-dom'
import { axiosInstance } from '../lib/axios'
import { socketInstance } from '../lib/socket'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import './ProfileHeader.css'

const ProfileHeader = (props) => {
    const navigate = useNavigate()
    const imageInputRef = useRef(null)
    const [isEditorOpen,setIsEditorOpen] = useState(false)
    const [activeSection,setActiveSection] = useState("overview")
    const [imageAction,setImageAction] = useState(null)
    const [formData,setFormData] = useState({
        name: "",
        email: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    })
    const [profileImage,setProfileImage] = useState(null)
    const [isSubmitting,setIsSubmitting] = useState(false)

    const clearSession = () => {
        localStorage.removeItem('token')
        socketInstance.disconnect()
        props.setAuth(false)
        props.setCurrentUserId(null)
        navigate('/')
    }

    const closeEditor = () => {
        setIsEditorOpen(false)
        setProfileImage(null)
        setImageAction(null)
        setFormData({name:"",email:"",currentPassword:"",newPassword:"",confirmPassword:""})
    }

    const logout = async () => {
        try {
            await axiosInstance.post("/auth/logout")
            toast.success("Logged out successfully")
            clearSession()
        } catch(error) {
            toast.error(error.response?.data?.message || "Unable to log out")
        }
    }

    const updateField = (field,value) => setFormData((previous) => ({...previous,[field]:value}))

    const handleProfileUpdate = async (event,field) => {
        event.preventDefault()
        setIsSubmitting(true)

        const payload = {
            currentPassword: formData.currentPassword,
            [field]: formData[field]
        }
        if (field === "newPassword")
            payload.confirmPassword = formData.confirmPassword

        try {
            const response = await axiosInstance.put("/auth/update-profile",payload)
            props.setProfile(response.data.profile)
            closeEditor()
            if (response.data.requiresLogout) {
                toast.success("Your account was updated. Please log in again.")
                clearSession()
            } else {
                toast.success("Profile updated successfully")
            }
        } catch(error) {
            toast.error(error.response?.data?.message || "Unable to update profile")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleImageUpload = async (event) => {
        event.preventDefault()
        if (!profileImage) {
            toast.error("Choose an image to upload")
            return
        }
        if (profileImage.size > 5 * 1024 * 1024) {
            toast.error("Profile images must be 5 MB or smaller")
            return
        }

        const payload = new FormData()
        payload.append("image",profileImage)
        setIsSubmitting(true)

        try {
            const response = await axiosInstance.post("/auth/update-profile-picture",payload)
            props.setProfile(response.data.profile)
            closeEditor()
            toast.success("Profile image updated")
        } catch(error) {
            toast.error(error.response?.data?.message || "Unable to upload profile image")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleImageRemoval = async (event) => {
        event.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await axiosInstance.delete("/auth/update-profile-picture")
            props.setProfile(response.data.profile)
            closeEditor()
            toast.success("Profile photo removed")
        } catch(error) {
            toast.error(error.response?.data?.message || "Unable to remove profile photo")
        } finally {
            setIsSubmitting(false)
        }
    }

    const openEditor = () => {
        setActiveSection("overview")
        setIsEditorOpen(true)
    }

    const profilePicture = props.profile.profilePicture;
    const avatarSource = profilePicture && profilePicture !== "/data/profileImages/default.jpg"
        ? profilePicture
        : "/images/default_dp.png";

    return (
        <>
            <div className="profile-info-area">
                <div className="name-area">
                    <img className="profile-avatar" src={avatarSource} alt={`${props.profile.name || "User"} profile`} />
                    <h3>{props.profile.name}</h3>
                </div>
                <div className="button-area">
                    <button type="button" aria-label="Log out" className="logout-button" onClick={logout}>
                        <LogOut className="logout-icon" size={25}/>
                    </button>
                    <button type="button" aria-label="Edit profile" onClick={openEditor} className="profile-edit-button">
                        <UserPen className="profile-edit-icon" size={25}/>
                    </button>
                </div>
            </div>

            {isEditorOpen && createPortal(
                <div className="profile-modal-backdrop" onMouseDown={(event)=>{if(event.target === event.currentTarget) closeEditor()}}>
                    <section className="profile-modal" role="dialog" aria-modal="true" aria-label="Edit profile">
                        <div className="profile-modal-heading">
                            {activeSection === "overview" ? (
                                <h2 id="profile-modal-title">Your profile</h2>
                            ) : (
                                <button type="button" className="profile-modal-back" onClick={()=>setActiveSection("overview")}>
                                    <ArrowLeft size={18}/> Back
                                </button>
                            )}
                            <button type="button" className="profile-modal-close" aria-label="Close edit profile" onClick={closeEditor}>
                                <X size={20}/>
                            </button>
                        </div>

                        {activeSection === "overview" && (
                            <div className="profile-overview">
                                <div className="profile-photo-editor">
                                    <img className="profile-modal-avatar" src={avatarSource} alt={`${props.profile.name || "User"} profile`} />
                                    <div className="profile-photo-actions">
                                        <button type="button" className="profile-photo-action" aria-label="Edit profile photo" title="Upload a new photo" onClick={()=>imageInputRef.current?.click()}>
                                            <Pencil size={16}/>
                                        </button>
                                        <button type="button" className="profile-photo-action delete" aria-label="Remove profile photo" title="Remove profile photo" onClick={()=>{setProfileImage(null);setImageAction("delete")}}>
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>
                                <input ref={imageInputRef} className="profile-image-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event)=>{setProfileImage(event.target.files?.[0] || null);setImageAction(event.target.files?.[0] ? "upload" : null)}}/>

                                {(imageAction === "upload" || imageAction === "delete") && (
                                    <form className="profile-photo-confirm" onSubmit={imageAction === "upload" ? handleImageUpload : handleImageRemoval}>
                                        {imageAction === "upload" && <p className="profile-photo-filename">{profileImage?.name}</p>}
                                        {imageAction === "delete" && <p>Remove your current profile photo?</p>}
                                        <div className="profile-photo-confirm-actions">
                                            <button type="button" className="profile-secondary-button" onClick={()=>{setImageAction(null);setProfileImage(null);if(imageInputRef.current) imageInputRef.current.value = ""}}>Cancel</button>
                                            <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : imageAction === "upload" ? "Upload photo" : "Remove photo"}</button>
                                        </div>
                                    </form>
                                )}

                                <div className="profile-summary">
                                    <div><span>Name</span><strong>{props.profile.name}</strong></div>
                                    <div><span>Email</span><strong>{props.profile.email}</strong></div>
                                </div>
                                <div className="profile-edit-actions">
                                    <button type="button" onClick={()=>setActiveSection("name")}><UserRound size={18}/> Change name</button>
                                    <button type="button" onClick={()=>setActiveSection("email")}><Mail size={18}/> Change email</button>
                                    <button type="button" onClick={()=>setActiveSection("password")}><Lock size={18}/> Change password</button>
                                </div>
                            </div>
                        )}

                        {activeSection === "name" && (
                            <form className="profile-edit-form" onSubmit={(event)=>handleProfileUpdate(event,"name")}>
                                <h3>Change name</h3>
                                <label>New name<input required maxLength={100} value={formData.name} onChange={(event)=>updateField("name",event.target.value)} autoComplete="name"/></label>
                                <label>Current password<input required type="password" value={formData.currentPassword} onChange={(event)=>updateField("currentPassword",event.target.value)} autoComplete="current-password"/></label>
                                <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save name"}</button>
                            </form>
                        )}

                        {activeSection === "email" && (
                            <form className="profile-edit-form" onSubmit={(event)=>handleProfileUpdate(event,"email")}>
                                <h3>Change email</h3>
                                <label>New email<input required type="email" value={formData.email} onChange={(event)=>updateField("email",event.target.value)} autoComplete="email"/></label>
                                <label>Current password<input required type="password" value={formData.currentPassword} onChange={(event)=>updateField("currentPassword",event.target.value)} autoComplete="current-password"/></label>
                                <p className="profile-modal-note">You will be logged out after changing your email.</p>
                                <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save email"}</button>
                            </form>
                        )}

                        {activeSection === "password" && (
                            <form className="profile-edit-form" onSubmit={(event)=>handleProfileUpdate(event,"newPassword")}>
                                <h3>Change password</h3>
                                <label>Current password<input required type="password" value={formData.currentPassword} onChange={(event)=>updateField("currentPassword",event.target.value)} autoComplete="current-password"/></label>
                                <label>New password<input required minLength={6} type="password" value={formData.newPassword} onChange={(event)=>updateField("newPassword",event.target.value)} autoComplete="new-password"/></label>
                                <label>Confirm new password<input required minLength={6} type="password" value={formData.confirmPassword} onChange={(event)=>updateField("confirmPassword",event.target.value)} autoComplete="new-password"/></label>
                                <p className="profile-modal-note">You will be logged out after changing your password.</p>
                                <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save password"}</button>
                            </form>
                        )}

                    </section>
                </div>,
                document.body
            )}
        </>
    )
}

export default ProfileHeader
