import { ParamsType } from "@ant-design/pro-components";
import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";
import { BASE_URL } from "@utils/config";
import { Modal } from "antd";
import axios from "axios";

const productUrl = `${BASE_URL}/product/products`;

const {headers} = SetBearerHeaderToken()

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


export const addNewProduct =async (params:ParamsType) => {
  try {
    const response = await axios.post(`${productUrl}/${params?._id}`, params?.values, {headers});
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops! Something went wrong",
      content: "Please check your internet connection!",
    });
  }
}
export const editProduct =async (params:ParamsType) => {
  try {
    const response = await axios.post(`${productUrl}`, params);
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops! Something went wrong",
      content: "Please check your internet connection!",
    });
  }
}



export const deleteProduct = async (productId: string) => {
  try {
    await axios.delete(`${productUrl}/${productId}`, { headers });
    return productId;
  } catch (error) {
    Modal.error({
      title: "Oops!",
      content: "Please check your internet connection!",
    });
  }
};
