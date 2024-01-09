import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";
import { BASE_URL } from "@utils/config";

export const fetchAllPaymentMethods = async (data: ParamsType) => {
  const url = `${BASE_URL}/payment-methods`;

  const response = await axios.get(url, { params: { name: data.name } });
  return response.data;
};

