import { ParamsType } from "@ant-design/pro-components";
import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";
import { BASE_URL } from "@utils/config";
import { Modal, notification } from "antd";
import axios from "axios";

const productUrl = `${BASE_URL}/product/products`;

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
    const response = await axios.put(`${productUrl}/${data._id}`, data.values, {
      headers,
    });
    notification.success({
      message: `Success`,
      description: "Successfully edited a Product",
      placement: "bottomLeft",
    });
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops! Something went wrong",
      content: `${
        error?.response.data.error == "Internal server error"
          ? "Failed to edit product, Please check your internet connection!"
          : "You need to be Authorized to modify the product."
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
