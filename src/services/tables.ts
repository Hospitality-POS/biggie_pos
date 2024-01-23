import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";
import { BASE_URL } from "@utils/config";
import { Modal } from "antd/lib";

const tableUrl = `${BASE_URL}/tables`;

export const getAllTables = async (data: ParamsType) => {
  try {
    const response = await axios.get(tableUrl, { params: {name: data.name, locatedAt: data.locatedAt} });
    return response.data;
  } catch (error) {
    Modal.error({ title: `${error?.message}`, content: "Please check your internet connection!" });
  }
};

export const getTableLocation = async (data: ParamsType) => {
  try {
    const url = `${tableUrl}/location/locations`;
    const response = await axios.get(url, { params: { name: data.name } });
    return response.data;
  } catch (error) {
    Modal.error({ title: `${error?.message}`, content: "Please check your internet connection!" });
  }
};

export const fetchTableUsequery = async () => {
  try {
    const response = await axios.get(
      `${tableUrl}/tables/unique-locatedAt`
    );
  
    return response.data;
  } catch (error) {
    console.log(error);
    
  }
};