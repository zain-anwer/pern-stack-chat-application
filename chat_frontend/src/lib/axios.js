import axios from 'axios'

export const axiosInstance = axios.create(
    {
        baseUrl: "http://localhost:3000",
        withCredentials:true
    }
)