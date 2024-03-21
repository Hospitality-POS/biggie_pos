import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { Modal, notification } from "antd/lib";

import axios from "axios";
const categ_url = `${BASE_URL}/categories`;

export const fetchAllCategories = async (data: ParamsType) => {
  const response = await axios.get(categ_url, {
    params: { name: data.name, sub_category: data.sub_category?.name },
  });
  return response.data;
};

export const fetchSubCategories = async () => {
  try {
    const response = await axios.get(`${categ_url}/sub-categories`);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const fetchMainCategories = async () => {
  try {
    const response = await axios.get(`${categ_url}/main-categories`);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const addNewCategory = async (params: ParamsType) => {
  try {
    const response = await axios.post(categ_url, {
      name: params.name,
      sub_category: params.subcategory_id,
    });

    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops!",
      content: "Please check your internet connection!",
    });
  }
};

export const updateCategory = async (data: ParamsType) => {
  try {
    const response = await axios.put(`${categ_url}/${data?._id}`, {
      name: data.values.name,
      sub_category: data.values.subcategory_id,
    });
    notification.success({
      message: `Success`,
      description: "Successfully edited category",
      placement: "bottomLeft",
    });
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops! Something went wrong",
      content: "Please check your internet connection!",
    });
    return (error as Error).message;
  }
};

// sub category
export const addNewSubCategory = async (params: ParamsType) => {
  try {
    const response = await axios.post(`${categ_url}/sub-categories`, {
      name: params.name,
      main_category: params.main_category,
    });
    notification.success({
      message: `Success`,
      description: "Successfully Added new Location",
      placement: "bottomLeft",
    });

    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops! Something went wrong",
      content: "Please check your internet connection!",
    });
  }
};

export const editSubCategory = async (data: ParamsType) => {
  try {
    const response = await axios.put(
      `${categ_url}/sub-categories/${data?._id}`,
      {
        name: data?.values.name,
        main_category: data?.values.main_category,
      }
    );
    notification.success({
      message: `Success`,
      description: "Successfully edited sub-category",
      placement: "bottomLeft",
    });
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops! Something went wrong",
      content: "Please check your internet connection!",
    });
    return (error as Error).message;
  }
};

export const deleteSubCategory = async (params: ParamsType) => {
  const url = `${categ_url}/sub-categories`;
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
};

export const deleteMainCategory = async (params: ParamsType) => {
  const url = `${categ_url}/main-categories`;
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
};
