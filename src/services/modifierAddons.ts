import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import axios from "axios";

export const getAllModifierAddons = async (data: ParamsType) => {
  try {
    const response = await axios.get(`${BASE_URL}/modifiers/fetch-modifiers`, {
      params: {
        name: data?.name,
      },
    });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};
