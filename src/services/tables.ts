import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "./request";
import { BASE_URL } from "@utils/config";
import { message } from "antd";




const tableUrl = `${BASE_URL}/tables`;

export const getAllTables = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(tableUrl, {
      params: { name: data.name, locatedAt: data.locatedAt },
    });
    return response.data;
  } catch (error) {
    throw new Error("Error fetching tables");
  }
};

export const getTableLocation = async (data: ParamsType) => {
  try {
    const url = `${tableUrl}/location/locations`;
    const response = await axiosInstance.get(url, { params: { name: data.name } });
    return response.data;
  } catch (error) {
    throw new Error("Error fetching table location");
  }
};

export const fetchTableUsequery = async (params) => {
  try {

    const response = await axiosInstance.get(`${tableUrl}/tables/unique-locatedAt`, { params: { locationId: params.id } });

    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Error fetching table");
  }
};

export const editLocation = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.put(`${tableUrl}/locations/${data._id}`, {
      locationName: data?.values?.name,
    });
    message.success("Successfully edited location");
    return response.data;
  } catch (error: any) {
    if (error?.response?.status != 403) {
      message.error("Error editing location");
    }
    throw new Error("Error editing location");
  }
};
export const addNewTableLocation = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.post(`${tableUrl}/locations`, {
      locationName: data?.name,
    });
    message.success("Successfully added new location");
    return response.data;
  } catch (error: any) {
    if (error?.response?.status != 403) {
      message.error("Error adding new location");
    }
    throw new Error("Error adding new location");
  }
};

export const delLocation = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.delete(`${tableUrl}/locations/${data}`);
    console.log(data);
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Error deleting location");
    }
    throw new Error("Error deleting location");
  }
};

export const transferCartitems = async (data: ParamsType) => {
  try {
    const transferUrl = `${BASE_URL}/cart`;
    // console.log({ products: data?.products, table: data?.table?.value });
    const response = await axiosInstance.post(`${transferUrl}/transfer-cart-items`, {
      products: data?.products,
      table: data.table?.value,
    });

    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Failed to transfer product");
    }
    throw new Error("Error transfering product");
  }
};

export const addNewTable = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.post(tableUrl, {
      name: data?.name,
      locatedAt: data?.locatedAt,
    });
    message.success("Successfully added new Table");
    return response.data;
  } catch (error: any) {
    if (error?.response?.status != 403) {
      message.error("Error adding new Table");
    }
    throw new Error("Error adding new table");
  }
};

export const updateTable = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.put(`${tableUrl}/${data._id}`, {
      name: data?.values?.name,
      locatedAt: data?.values?.locatedAt?._id,
    });
    message.success("Successfully updated Table");
    return response.data;
  } catch (error: any) {
    if (error?.response?.status != 403) {
      message.error("Error updating Table");
    }
    throw new Error("Error updating table");
  }
};

export const deleteTable = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.delete(`${tableUrl}/${data}`);
    return response.data;
  } catch (error: any) {
    throw new Error("Error deleting table");
  }
};
