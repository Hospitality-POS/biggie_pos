import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";
import { BASE_URL } from "@utils/config";
import { Modal } from "antd/lib";
import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";

const method_url = `${BASE_URL}/payment-methods`;

const { headers } = SetBearerHeaderToken();

export const fetchAllPaymentMethods = async (data?: ParamsType) => {
  try {
    const response = await axios.get(method_url, {
      params: { name: data?.name },
    });
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops!",
      content: "Please check your internet connection!",
    });
  }
};

export const addNewPaymentMethod = async (params: ParamsType) => {
  try {
    const response = await axios.post(method_url, params, { headers });
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops!",
      content: "Please check your internet connection!",
    });
  }
};


export const updateMethod =async (data:ParamsType) => {
  try {
    const response = await axios.put(`${method_url}/${data?._id}`, data?.values, {headers})
    return response.data
  } catch (error) {
    Modal.error({
      title: "Oops!",
      content: "Please check your internet connection!",
    });
  }
}