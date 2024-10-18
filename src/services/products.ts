import { ParamsType } from "@ant-design/pro-components";
import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";
import { BASE_URL } from "@utils/config";
import { Modal, notification } from "antd";
import axios from "axios";

const productUrl = `${BASE_URL}/product/products`;
const invetoryUrl = `${BASE_URL}/product-inventory`;
const unitsUrl = `${BASE_URL}/uom`

const { headers } = SetBearerHeaderToken();

export const getAllProducts = async () => {
  try {
    const response = await axios.get(`${productUrl}/getproducts/all`);
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops! Something went wrong",
      content: "Please check your internet connection!",
    });
  }
};

export const addNewProduct = async (params: ParamsType) => {
  try {
    const response = await axios.post(`${productUrl}`, params);
    notification.success({
      message: `Success`,
      description: "Successfully Added a new Product",
      placement: "bottomLeft",
    });
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops! Something went wrong",
      content: "Please check your internet connection!",
      centered: true,
    });
  }
};
export const editProduct = async (data: ParamsType) => {
  // console.log(data); 

  try {
    const response = await axios.put(`${productUrl}/${data._id}`, { ...data, category: data?.category?.value || data.category });
    notification.success({
      message: `Success`,
      description: "Successfully edited a Product",
      placement: "bottomLeft",
    });
    return response.data;
  } catch (error) {
    console.log(error);

    Modal.error({
      title: "Oops! Something went wrong",
      content: `${error?.response.data.error == "Internal server error"
        ? "Failed to edit product, Please check your internet connection!"
        : "Please check your internet connection and try again later."
        }`,
      centered: true,
    });
  }
};

export const deleteProduct = async (productId: string) => {
  try {
    await axios.delete(`${productUrl}/${productId}`, { headers });
    notification.success({
      message: `Success`,
      description: "Product deleted successfully.",
      placement: "bottomLeft",
    });
    return productId;
  } catch (error) {
    Modal.error({
      title: "Oops! Something went wrong",
      content: "Please check your internet connection!",
      centered: true
    });
  }
};


export const fetchAllInventoryItems = async (params: type) => {
  try {
    const response = await axios.get(`${invetoryUrl}`)
    return response.data
  } catch (error) {
    throw new Error("failed to fetch invetories");
  }
}

export const fetchAllUnits = async (params: type) => {
  try {
    const response = await axios.get(`${unitsUrl}`)
    return response.data
  } catch (error) {
    throw new Error("Failed to fetch units");

  }
}