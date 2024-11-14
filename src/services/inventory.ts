import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";


const url = `${BASE_URL}/product-inventory`;

export const fetchAllInventory = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(url, {
      params: { name: data.name, code: data.code },
    });
    return response.data;
  } catch (error) {
    throw new Error(error);
  }
};

export const addNewInventory = async (params: ParamsType) => {
  try {
    console.log(params);
    const response = await axiosInstance.post(url, { ...params });
    message.success("Inventory added successfully");
    return response.data;
  } catch (error) {
    message.error("Error adding inventory, Please try again");
    throw new Error(error);
  }
};

export const editInventory = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.put(`${url}/${params?._id}`, {
      ...params.values,
      unit_id: params.values.unit_id.value,
      subcategory_id: params.values.subcategory_id.value,
    });
    message.success("Inventory updated successfully");
    return response.data;
  } catch (error) {
    message.error("Error updating inventory");
    throw new Error(error);
  }
};

export const deleteInventory = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.delete(`${url}/${params}`);
    // message.success("Inventory deleted successfully");
    return response.data;
  } catch (error) {
    // message.error("Error deleting inventory");
    throw new Error(error);
  }
};
