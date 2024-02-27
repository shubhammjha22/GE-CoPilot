import axios from "axios";

const instance = axios.create({
    withCredentials: true,
    baseURL: "https://ai.ihadnan.xyz"
})
export default instance