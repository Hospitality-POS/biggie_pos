import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";
import { BASE_URL } from "@utils/config";
import { Modal } from "antd/lib";

export const fetchAllPaymentMethods = async (data?: ParamsType) => {
  try {
    const url = `${BASE_URL}/payment-methods`;

    const response = await axios.get(url, { params: { name: data?.name } });
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops!",
      content: "Please check your internet connection!",
    });
  }
};
