import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";

import axios from "axios";


export const fetchAllInventory = async (data: ParamsType) => {
  const url = `${BASE_URL}/product-inventory`;

  const response = await axios.get(url, {
    params: { name: data.name, code: data.code},
  });
  return response.data;
};