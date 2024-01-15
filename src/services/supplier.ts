import { BASE_URL } from "@utils/config";
import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";
import { Modal } from "antd/lib";


export const fetchAllSuppliers = async (data?: ParamsType) => {
 try {
   const url = `${BASE_URL}/suppliers`;
 
   const response = await axios.get(url, {
     params: { name: data.name, email: data.email },
   });
   return response.data;
 } catch (error) {
  Modal.error({ title: `${error?.message}`, content: "Please check your internet connection!" });
 }
};