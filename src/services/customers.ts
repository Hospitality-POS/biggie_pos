import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";
const categ_url = `${BASE_URL}/customers`;

//  categories
export const addNewCustomer = async (params: ParamsType) => {
    try {
        params.tenant_id = '674dd82a9f6cd7b6a50e571b';
        params.shop_id = '678409b73f1321be48285b3f';
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

