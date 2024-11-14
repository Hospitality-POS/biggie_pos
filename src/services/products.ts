import { ParamsType } from "@ant-design/pro-components";
import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const productUrl = `${BASE_URL}/product/products`;
const invetoryUrl = `${BASE_URL}/product-inventory`;
const unitsUrl = `${BASE_URL}/uom`;

const { headers } = SetBearerHeaderToken();

export const getAllProducts = async () => {
  try {
    const response = await axiosInstance.get(`${productUrl}/getproducts/all`);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch products", error);
  }
};

export const addNewProduct = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(`${productUrl}`, params);
    message.success("Product added successfully");
    return response.data;
  } catch (error) {
    message.error("Failed to add a new product");
    throw new Error("Failed to add a new product", error);
  }
};
export const editProduct = async (data: ParamsType) => {
  // console.log(data);

  try {
    const response = await axiosInstance.put(`${productUrl}/${data._id}`, {
      ...data,
      category: data?.category?.value || data.category,
    });
    message.success("Product updated successfully");
    return response.data;
  } catch (error) {
    console.log(error);
    message.error("Failed to edit product");
  }
};

export const deleteProduct = async (productId: string) => {
  try {
    await axiosInstance.delete(`${productUrl}/${productId}`, { headers });
    message.success("Product deleted successfully");
    return productId;
  } catch (error) {
    message.error("Failed to delete product");
  }
};

export const fetchAllInventoryItems = async (params: type) => {
  try {
    const response = await axiosInstance.get(`${invetoryUrl}`);
    return response.data;
  } catch (error) {
    throw new Error("failed to fetch invetories");
  }
};

export const fetchAllUnits = async (params: type) => {
  try {
    const response = await axiosInstance.get(`${unitsUrl}`);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch units");
  }
};
