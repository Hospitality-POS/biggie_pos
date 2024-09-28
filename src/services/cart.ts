import { ParamsType } from "@ant-design/pro-components";
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
    const response = await axios.put(`${baseUrl}/cart/print-cart`, { cart_id: cartId });
    message.success("Invoice printed successfully");
    return response.data || [];
  } catch (error: any) {
    console.log(error);
    message.error("Failed to print invoice");
  }
};

export const getAllInvoices = async (params: ParamsType) => {
  try {
    const response = await axios.get(`${baseUrl}/cart/invoices`, { params: {
      orderNo: params?.order_no || params?.keyword,
      tableName: params?.table,
    } });
    return response.data || [];
  } catch (error: any) {
    console.log(error);
  }
};

export const rePrintInvoice = async (invoiceId: string) => {
  try {
    const response = await axios.put(`${baseUrl}/cart/re-print-inv`, {
      invoice_id: invoiceId,
    });
    message.success("Invoice re-printed successfully");
    return response.data || [];
  } catch (error: any) {
    console.log(error);
    message.error("Failed to re-print invoice");
  }
};
