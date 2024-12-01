import axios from "axios";
import { BASE_URL } from "@utils/config";
import { message } from "antd";

// Helper function to handle errors
const handleError = (errorMessage: string) => {
    message.error(`${errorMessage}`)
};

// Create an axios instance with the base URL and timeout
const axiosInstance = axios.create({
    baseURL: BASE_URL,
});

// Interceptor to add authorization token to each request if available
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
        const storedCode = localStorage.getItem("companyCode");
        if (storedCode || config.data?.companyCode) {
            config.headers['companyCode'] = storedCode || config.data?.companyCode;
        }

        console.log('nice', config);
        return config;
    },
    (error) => {
        console.log('my error', error);
        handleError("Request failed");
        return Promise.reject(error);
    }
);

// Interceptor to handle response errors globally
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {

        const { response } = error;
        if (response && response.status === 401) {
            handleError("Unauthorized. Please login again.");
        } else if (response.status === 403) {
            handleError(response.data.message);
        }
        else if (response.status === 409) {
            handleError("Company does not exist kindly contact support ");
        }
        else {
            handleError("An error occurred while processing your request.");
        }
        return Promise.reject(error);
    }
);

// Utility functions for different HTTP methods
export const getRequest = (url: string, config = {}) => axiosInstance.get(url, config);

export const postRequest = (url: string, data: any, config = {}) => axiosInstance.post(url, data, config);

export const putRequest = (url: string, data: any, config = {}) => axiosInstance.put(url, data, config);

export const deleteRequest = (url: string, config = {}) => axiosInstance.delete(url, config);

export default axiosInstance;
