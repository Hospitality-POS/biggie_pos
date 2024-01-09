import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";
import { BASE_URL } from "@utils/config";


export const fetchAllUsersList = async (data: ParamsType) => {
  const url = `${BASE_URL}/users/all`;

  const response = await axios.get(url, {
    params: { fullname: data.fullname, email: data.email },
  });
  return response.data;
};