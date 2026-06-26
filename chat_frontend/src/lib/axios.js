import axios from 'axios'

export const axiosInstance = axios.create(
    {
        baseURL: import.meta.env.VITE_BACKEND_URL,
        
        /* No longer using cookie based token passing */
        /* Instead using authorization header token passing */
        // withCredentials:true
    }
)

// we will be using interceptors which is like a middleware
// it will take onfulfilled and onrejected are callback functions / hooks that handle our middleware logic
// config is the object which contains request type, body etc etc.

axiosInstance.interceptors.request.use(
    (config) =>
    {
        const token = localStorage.getItem('token')
        if (token)
            config.headers.Authorization = `Bearer ${token}`
        
        return config
    },
    (error) =>
    {
        console.log('Error in axios interceptor!')
        console.log('Error Information: ',error)
    }
)