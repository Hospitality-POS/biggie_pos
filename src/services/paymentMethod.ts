import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "./request";
import { BASE_URL } from "@utils/config";
import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";
import { message } from "antd";

const method_url = `${BASE_URL}/payment-methods`;

const { headers } = SetBearerHeaderToken();

export const fetchAllPaymentMethods = async (data?: ParamsType) => {
  try {
    const response = await axiosInstance.get(method_url, {
      params: { name: data?.name },
    });
    return response.data;
  } catch (error) {
    throw new Error("Error fetching payment methods");
  }
};

export const addNewPaymentMethod = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(method_url, params, { headers });
    message.success("Payment method created successfully");
    return response.data;
  } catch (error) {
    message.error("Failed to add new payment method");
    throw new Error("Error adding new payment method");
  }
};

export const makeSubscriptionPayment = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(method_url + '/make-payment', params, { headers });
    message.success("Payment submitted successfully");
    return response.data;
  } catch (error) {
    throw new Error("Error making payment");
  }
};


export const updateMethod = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.put(`${method_url}/${data?._id}`, data?.values, { headers })
    message.success("Payment method updated successfully");
    return response.data
  } catch (error) {
    message.error("Failed to update payment method");
    throw new Error("Error updating payment method");
  }
}

export const deletePaymentMethod = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.delete(`${method_url}/${data}`, { headers });
    return response.data;
  } catch (error) {
    throw new Error("Error deleting payment method");
  }
};