import { BASE_URL } from "@utils/config";
import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";


export const fetchAllSuppliers = async (data: ParamsType) => {
  const url = `${BASE_URL}/suppliers`;

  const response = await axios.get(url, {
    params: { name: data.name, email: data.email },
  });
  return response.data;
};