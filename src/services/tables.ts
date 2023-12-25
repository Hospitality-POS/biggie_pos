import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;
let tableUrl = `${BASE_URL}/tables`;

export const fetchAllTables = async (
  data: ParamsType & {
    pageSize?: number | undefined;
    current?: number | undefined;
    keyword?: string | undefined;
  }
) => {
  const response = await axios.get(tableUrl);

  return response.data;
};

export const fetchAllTableLocation = async (
  data: ParamsType & {
    pageSize?: number | undefined;
    current?: number | undefined;
    keyword?: string | undefined;
  }
) => {
  const response = await axios.get(`${tableUrl}/location/locations`);
  return response.data;
};
