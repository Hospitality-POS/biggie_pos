import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;
const tableUrl = `${BASE_URL}/tables`;

export const getAllTables = async (data: ParamsType) => {
  const response = await axios.get(tableUrl, { params: data });
  return response.data;
};

export const getTableLocation = async (data: ParamsType) => {
  const url = `${tableUrl}/location/locations`;
  const response = await axios.get(url, { params: { name: data.name } });
  return response.data;
};
