import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;

export const fetchAllUsersList = async (data: ParamsType) => {
  const url = `${BASE_URL}/users/all`;

  const response = await axios.get(url, {
    params: { fullname: data.fullname, email: data.email },
  });
  return response.data;
};