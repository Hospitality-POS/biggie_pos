import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";
const categ_url = `${BASE_URL}/customers`;

//  categories
export const addNewCustomer = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.post(categ_url, { ...params });
        message.success("Customer added successfully");
        return response;
    } catch (error) {
        if (error?.response?.status != 403) {
            message.error("Failed to add a new customer");
        }
        throw new Error("Failed to add a new customer", error);
    }
};
export const staffClockInOut = async (params: ParamsType) => {
    try {
        console.log('params', params);
        const response = await axiosInstance.post(categ_url + '/clock-in', { ...params });
        message.success("Customer visit logged  successfully");
        return response;
    } catch (error) {

        throw new Error("You have already clocked in and out for today");
    }
};

export const logCustomerVisit = async (params: ParamsType) => {
    try {
        console.log('params', params);
        const response = await axiosInstance.post(categ_url + '/log-visit', { ...params });
        message.success("Customer visit logged  successfully");
        return response;
    } catch (error) {
        console.log('error', error);
    }
};

