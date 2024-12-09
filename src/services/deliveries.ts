import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const url = `${BASE_URL}/delivery`;

export const fetchAllDeliveries = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(url, {
      params: { name: data.name, code: data.code },
    });
    return response.data;
  } catch (error) {
    throw new Error(error);
  }
};

export const addNewDelivery = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(url, {
      ...params,
    });
    message.success("Delivery added successfully");
    return response.data;
  } catch (error) {
    throw new Error(error);
  }
};

export const editDelivery = async (params: ParamsType) => {
  try {
    console.log(params);
    const response = await axiosInstance.put(`${url}/${params?._id}`, {
      ...params.values,
      supplier_id: params.values.supplier_id?.value,
      received_by: params.values.received_by?.value,
      delivery_items: params?.values?.delivery_items?.map((item: any) => ({
        inventory_id: item?.inventory_id?.value || item?.inventory_id,
        unit_id: item?.unit_id?.value || item?.unit_id,
        quantity: item.quantity,
      })),
    });
    message.success("Delivery updated successfully");
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Error updating delivery");
    }
    throw new Error(error);
  }
};

export const deleteDelivery = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.delete(`${url}/${params}`);
    return response.data;
  } catch (error) {
    throw new Error(error);
  }
};

export const getDeliveryItemsByDateRange = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.get(`${url}/date-range-delivery-items/items`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw new Error(error);
  }
};

export const printDeliveryNote = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.get(`${url}/delivery-note/${params}?print=true`);
    // message.success("Delivery note printed successfully");
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Error printing delivery note");
    }
    throw new Error(error);
  }
};