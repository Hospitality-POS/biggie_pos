import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const fetchAllTables=()=> async ( _data: ParamsType & {
    pageSize?: number | undefined;
    current?: number | undefined;
    keyword?: string | undefined;
  }) => {
    
    const response = await axios.get(`${BASE_URL}/tables`)

    return response.data
}