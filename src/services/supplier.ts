import { BASE_URL } from "@utils/config";
import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";
import { Modal } from "antd/lib";
import { message } from "antd";

const supplierUrl = `${BASE_URL}/suppliers`;

export const fetchAllSuppliers = async (data: ParamsType) => {
  try {

    const response = await axios.get(supplierUrl, {
      params: { name: data.name, email: data.email },
    });
    return response.data;
  } catch (error) {
    throw new Error(error);
  }
};

export const addNewSupplier = async (params: ParamsType) => {
  try {
    const response = await axios.post(`${supplierUrl}`, {
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
    const response = await axios.put(`${supplierUrl}/${params?._id}`, {
      ...params.value,
    });
    message.success("Supplier updated successfully");
    return response.data;
  } catch (error) {
    throw new Error(error);
  }
};

export const deleteSupplier = async (params: ParamsType) => {
  try {
    const response = await axios.delete(`${supplierUrl}/${params}`);
    return response.data;
  } catch (error) {
    throw new Error(error);
  }
};
