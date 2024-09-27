import { BASE_URL } from "@utils/config";
import { message, Modal, notification } from "antd";
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


export const printInvoice = async (cartId: string) => {
  try {
    const response = await axios.get(`${baseUrl}/cart/print-invoice/${cartId}`);
    message.success("Invoice printed successfully");
    return response.data || [];
  } catch (error: any) {
    console.log(error);
    message.error("Failed to print invoice");
  }
};