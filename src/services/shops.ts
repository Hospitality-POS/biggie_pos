import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const url = `${BASE_URL}/shops`;

export const fetchAllShops = async (params?: ParamsType) => {
  try {
    const response = await axiosInstance.get(url, { params });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const createShop = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(url, params);
    message.success("Shop created successfully");
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Error creating shop");
    }
    throw new Error(error);
  }
};

export const updateShop = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.put(`${url}/${params?._id}`, params);
    message.success("Shop updated successfully");
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Error updating shop");
    }
    throw new Error(error);
  }
};

export const deleteShop = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${url}/${id}`);
    message.success("Shop deleted successfully");
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Error deleting shop");
    }
    throw new Error(error);
  }
};

export const fetchShop = async (id: string) => {
  console.log("Fetching shop with ID:", id);
  try {
    const response = await axiosInstance.get(`${url}/${id}`);
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      // message.error("Error fetching shop");
    }
    throw new Error(error);
  }
};