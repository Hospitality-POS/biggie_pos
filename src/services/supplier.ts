import { BASE_URL } from "@utils/config";
import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "./request";
import { message } from "antd";

const supplierUrl = `${BASE_URL}/suppliers`;

export const fetchAllSuppliers = async (data: ParamsType) => {
  try {

    const response = await axiosInstance.get(supplierUrl, {
      params: { name: data.name, email: data.email },
    });
    return response.data;
  } catch (error) {
    throw new Error(error);
  }
};

export const addNewSupplier = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(`${supplierUrl}`, {
      ...params,
    });
    message.success("Supplier added successfully");
    return response.data;
  } catch (error) {
    throw new Error(error);
  }
};

export const editSupplier = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.put(`${supplierUrl}/${params?._id}`, {
      ...params.value,
    });
    message.success("Supplier updated successfully");
    return response.data;
  } catch (error) {
    throw new Error(error);
  }
};

export const getSupplierById = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${supplierUrl}/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error);
  }
};

export const deleteSupplier = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.delete(`${supplierUrl}/${params}`);
    return response.data;
  } catch (error) {
    throw new Error(error);
  }
};
