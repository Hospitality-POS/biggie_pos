import { BASE_URL } from "@utils/config";
import { Modal, notification } from "antd";
import axios from "axios";
const baseUrl = BASE_URL;

export const getAllCartItems = async (cartId: string) => {
  try {
    const response = await axios.get(`${baseUrl}/cart/cart-items/${cartId}`);
    return response.data || [];
  } catch (error: any) {
    console.log(error);
  }
};
