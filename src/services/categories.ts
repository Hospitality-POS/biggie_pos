import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";
const categ_url = `${BASE_URL}/categories`;

//  categories

export const fetchAllCategories = async (data: ParamsType) => {
  const response = await axiosInstance.get(categ_url, {
    params: { name: data.name, sub_category: data.sub_category?.name },
  });
  return response.data;
};

export const deleteCategory = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.delete(`${categ_url}/${params}`);
    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Error deleting category");
  }
};

export const addNewCategory = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(categ_url, {
      name: params.name,
      sub_category: params.subcategory_id,
    });
    message.success("Category added successfully");
    return response.data;
  } catch (error) {
    message.error("Failed to add a new category");
    throw new Error("Failed to add a new category", error);
  }
};

export const updateCategory = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.put(`${categ_url}/${data?._id}`, {
      name: data?.name,
      sub_category: data?.subcategory_id.value || data?.subcategory_id,
    });
    message.success("Category updated successfully");
    return response.data;
  } catch (error) {
    message.error("Failed to edit category");
    return (error as Error).message;
  }
};

// sub category
export const fetchSubCategories = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(`${categ_url}/sub-categories`, {
      params: { name: data.name, main_category: data.main_category?.name },
    });
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch sub categories", error);
  }
};

export const addNewSubCategory = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(`${categ_url}/sub-categories`, {
      name: params.name,
      main_category: params.main_category,
    });
    message.success("Subcategory added successfully");

    return response.data;
  } catch (error) {
    message.error("Failed to add a new subcategory");
    throw new Error("Failed to add a new subcategory", error);
  }
};

export const editSubCategory = async (data: ParamsType) => {
  try {
    // console.log("xxxxxx", data);

    const response = await axiosInstance.put(
      `${categ_url}/sub-categories/${data?._id}`,
      {
        name: data?.values.name,
        main_category:
          data?.values.main_category || data?.values.main_category?.value,
      }
    );
    message.success("Subcategory updated successfully");
    return response.data;
  } catch (error) {
    message.error("Failed to edit a sub-category");
    throw new Error("Failed to edit a sub-category", error);
  }
};

export const deleteSubCategory = async (params: ParamsType) => {
  const url = `${categ_url}/sub-categories`;
  try {
    const response = await axiosInstance.delete(`${url}/${params}`);
    message.success("Subcategory deleted successfully");
    return response.data;
  } catch (error) {
    message.error("Failed to delete a sub-category");
    return (error as Error).message;
  }
};

// main category
export const fetchMainCategories = async () => {
  try {
    const response = await axiosInstance.get(`${categ_url}/main-categories`);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const addNewMainCategory = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.post(`${categ_url}/main-categories`, {
      name: params.name,
    });
    message.success("Main-Category created successfully");
    return response.data;
  } catch (error) {
    throw new Error("Error creating main-category");
  }
};

export const editMainCategory = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.put(
      `${categ_url}/main-categories/${data?._id}`,
      {
        name: data?.values.name,
      }
    );
    message.success("Main-Category updated successfully");
    return response.data;
  } catch (error) {
    throw new Error("Error updating main-category");
  }
};

export const deleteMainCategory = async (params: ParamsType) => {
  const url = `${categ_url}/main-categories`;
  try {
    const response = await axiosInstance.delete(`${url}/${params}`);
    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Error deleting main-category");
  }
};