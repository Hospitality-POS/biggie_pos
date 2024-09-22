import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axios from "axios";

export const getAllOrders = async (data: ParamsType) => {
  try {
    const response = await axios.get(`${BASE_URL}/orders`, {
      params: {
        order_no: data?.order_no || data?.keyword,
        table_name: data?.name,
      },
    });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};


export const deleteOrderById = async (id: string) => {
  try {
    await axios.delete(`${BASE_URL}/orders/${id}`);
    message.success("Order deleted successfully");
    return true;
  } catch (error) {
    console.log(error);
    message.error("Error deleting order");
    return false;
  }
};
