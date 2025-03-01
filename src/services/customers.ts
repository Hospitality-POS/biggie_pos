import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";
import { createAsyncThunk } from "@reduxjs/toolkit";
const categ_url = `${BASE_URL}/customers`;


//  categories



export const fetchAllCustomers = async (data: ParamsType) => {
    try {

        const shopId = localStorage.getItem("shopId");


        const response = await axiosInstance.get(categ_url, {
            params: { shop_id: shopId, customer_name: data.customer_name, email: data.email, phone: data.phone, code: data.code },
        });
        return response.data;
    } catch (error) {
        throw new Error(error?.message);
    }
};

export const fetchAdminAllCustomers = async (data: ParamsType) => {
    try {
        const response = await axiosInstance.get(categ_url, {
            params: { customer_name: data.customer_name, email: data.email, phone: data.phone, code: data.code },
        });
        return response.data;
    } catch (error) {
        throw new Error(error?.message);
    }
};


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
        // console.log('params', params);
        const response = await axiosInstance.post(categ_url + '/clock-in', { ...params });
        // message.success("Customer visit logged  successfully");
        return response;
    } catch (error) {
        console.log("error", error);
        throw new Error(error?.response?.data?.message || "Failed to clock in/out");
    }
};

export const logCustomerVisit = async (params: ParamsType) => {
    try {
        console.log('params', params);
        const response = await axiosInstance.post(categ_url + '/log-visit', { ...params });
        // message.success("Customer visit logged  successfully");
        return response;
    } catch (error) {
        console.log('error', error);
    }
};

export const fetchAllGiftCards = async (data: any) => {
    try {
        console.log('wewe', data);
        const url = `${categ_url}/all-cards`;

        const response = await axiosInstance.get(url, {
            params: { customer_id: data },
        });
        return response.data;
    } catch (error) {
        throw new Error(error?.message);
    }
};

export const createGiftCard = createAsyncThunk(
    'giftCard/create',
    async (giftCardData, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(categ_url + '/new-card', giftCardData);
            return response.data;
        } catch (error: any) {
            message.error(error?.message || "Failed to create gift card");
            return rejectWithValue(error?.message || "Failed to create gift card");
        }
    }
);

// Send gift card email thunk
export const sendGiftCard = createAsyncThunk(
    'giftCard/send',
    async (data, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(categ_url + '/new-card-email', data);
            return response.data;
        } catch (error: any) {
            message.error(error?.message || "Failed to send gift card email");
            return rejectWithValue(error?.message || "Failed to send gift card email");
        }
    }
);

