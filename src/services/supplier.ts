import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;

export const fetchAllSuppliers = async (data: ParamsType) => {
  const url = `${BASE_URL}/suppliers`;

  const response = await axios.get(url, {
    params: { name: data.name, email: data.email },
  });
  return response.data;
};