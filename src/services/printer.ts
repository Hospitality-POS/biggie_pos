import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axios from "axios";

const printerUrl = `${BASE_URL}/printer`;

export const getAllPrinters = async (params: ParamsType) => {
  try {
    const response = await axios.get(`${printerUrl}`, { params });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const createPrinter = async (data: any) => {
  try {
    const response = await axios.post(`${printerUrl}`, data);
    message.success("Printer added successfully");
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const updatePrinter = async (data: any) => {
  try {
    const response = await axios.put(`${printerUrl}/${data._id}`, {...data?.values, main_category: data?.values?.main_category?.value || data.values.main_category});
    message.success("Printer updated successfully");
    return response.data;
  } catch (error) {
    console.log(error);
    message.error("Failed to update printer");
  }
};

export const deletePrinter = async (printerId: string) => {
  try {
    const response = await axios.delete(`${printerUrl}/${printerId}`);
    return response.data;
  } catch (error) {
    console.log(error);
    message.error("Failed to delete printer");
  }
};