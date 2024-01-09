import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";

import axios from "axios";


export const fetchAllCategories = async (data: ParamsType) => {
  const url = `${BASE_URL}/categories`;

  const response = await axios.get(url, {
    params: { name: data.name, sub_category: data.sub_category?.name },
  });
  return response.data;
};

export const fetchSubCategories = async () => {
  const response = await axios.get(`${BASE_URL}/categories/sub-categories`);
  return response.data;
};
