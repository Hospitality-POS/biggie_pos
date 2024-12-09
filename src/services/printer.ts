import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const printerUrl = `${BASE_URL}/printer`;

export const getAllPrinters = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.get(`${printerUrl}`, { params });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const createPrinter = async (data: any) => {
  try {
    const response = await axiosInstance.post(`${printerUrl}`, data);
    message.success("Printer added successfully");
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const updatePrinter = async (data: any) => {
  try {
    const response = await axiosInstance.put(`${printerUrl}/${data._id}`, { ...data?.values, main_category: data?.values?.main_category?.value || data.values.main_category });
    message.success("Printer updated successfully");
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Failed to update printer");
    }
  }
};

export const deletePrinter = async (printerId: string) => {
  try {
    const response = await axiosInstance.delete(`${printerUrl}/${printerId}`);
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Failed to delete printer");
    }
  }
};