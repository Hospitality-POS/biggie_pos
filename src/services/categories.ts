import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";

// todo: Implement UseQuery for fetching and querying urls

const BASE_URL = import.meta.env.VITE_API_URL;

export const fetchAllCategories = async (
  data: ParamsType & {
    pageSize?: number | undefined;
    current?: number | undefined;
    keyword?: string | undefined;
  }
) => {
  let url = `${BASE_URL}/categories`;

  // Append query parameters if provided
  if (data.name) {
    url += `?name=${encodeURIComponent(data.name)}`;
  }

  if (data.sub_category) {
    url += `${data.name ? "&" : "?"}sub_category=${encodeURIComponent(
      data.sub_category?.name
    )}`;
  }

  const response = await axios.get(url);
  return response.data;
};

// FILTER ON BACKEND TO PREVENT
