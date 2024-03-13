import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";
import { BASE_URL } from "@utils/config";
import { Modal } from "antd";
import axios from "axios";

const productUrl = `${BASE_URL}/product`;

const {headers} = SetBearerHeaderToken()

export const getAllProducts = async () => {
  try {
    const response = await axios.get(`${productUrl}/products/getproducts/all`);
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops!",
      content: "Please check your internet connection!",
    });
  }
};

export const deleteProduct = async (productId: string) => {
  try {
    await axios.delete(`${productUrl}/products/${productId}`, { headers });
    return productId;
  } catch (error) {
    Modal.error({
      title: "Oops!",
      content: "Please check your internet connection!",
    });
  }
};
