import axios from "axios";
import { BASE_URL } from "@utils/config";
import { message } from "antd";

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 5000,
});

axiosInstance.interceptors.request.use(
    (config) => {
        const user = localStorage.getItem("user");

        if (user) {
            const userObject = JSON.parse(user);
            const token = userObject.Token;
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
                console.log('Token added to headers:', config.headers['Authorization']);
            }
        }
        return config;
    },
    (error) => {
        message.error("Request failed");
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const { response } = error;
        if (response && response.status === 401) {
            message.error("Unauthorized. Please login again.");
        } else {
            message.error("An error occurred while processing your request.");
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
