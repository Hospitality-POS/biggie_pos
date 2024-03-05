import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { Modal, notification } from "antd/lib";

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

export const fetchMainCategories = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/categories/main-categories`);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const editCategory = async (params: ParamsType) => {
  console.log(params);
  
  const url = `${BASE_URL}/categories`;
  try {
    const response = await axios.put(`${url}/${params?.data?._id}`, params?.values);
    notification.success({
      message: `Success`,
      description: "Successfully edited category",
      placement: "bottomLeft",
    });
    return response.data;
  } catch (error) {
     Modal.error({
       title: `${(error as Error)?.message}`,
       content: "Please check your internet connection!",
     }); 
    return (error as Error).message;
  }
};


export const deleteSubCategory =async(params: ParamsType)=>{
  const url = `${BASE_URL}/categories/sub-categories`;
try {
    const response = await axios.delete(`${url}/${params}`);
  
    return response.data;
  } catch (error) {
     Modal.error({
       title: `${(error as Error)?.message}`,
       content: "Please check your internet connection!",
     }); 
    return (error as Error).message;
  }
}

export const deleteMainCategory =async(params: ParamsType)=>{
  const url = `${BASE_URL}/categories/main-categories`;
try {
    const response = await axios.delete(`${url}/${params}`);
  
    return response.data;
  } catch (error) {
     Modal.error({
       title: `${(error as Error)?.message}`,
       content: "Please check your internet connection!",
     }); 
    return (error as Error).message;
  }
}