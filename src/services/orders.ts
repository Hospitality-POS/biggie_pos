import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import axios from "axios";

export const getAllOrders = async (data: ParamsType) => {
  try {
    console.log("orders", data); 
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
