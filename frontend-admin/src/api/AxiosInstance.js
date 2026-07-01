// api/axiosInstance.js
import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:8000/api", // adjust to your backend
});

export default instance;
