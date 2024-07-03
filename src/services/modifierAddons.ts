import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { Modal, notification } from "antd";
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
export const createModifierAddon = async (data: ParamsType) => {
  try {
    let user;
    if (localStorage.getItem("user")) {
      user = JSON.parse(localStorage.getItem("user"));
    }
    const response = await axios.post(`${BASE_URL}/modifiers/create-modifier`, {
      ...data,
      createdBy: user?.id,
    });
    Modal.success({
      title: "Success!",
      content: "Modifier Added Successfully!",
    });
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops!",
      content: "Please check your internet connection! or try again later!",
    });
    console.log(error);
  }
};

export const editModifierAddon = async (data: ParamsType) => {
  try {
     let user;
     if (localStorage.getItem("user")) {
       user = JSON.parse(localStorage.getItem("user"));
     }     
    const response = await axios.put(`${BASE_URL}/modifiers/update-modifier/${data?._id}`, {
      ...data.values,
      createdBy: user?.id,
    });
    notification.success({
      message: "Success!",
      description: "Modifier Updated Successfully!",
      duration: 2,
      placement: "bottomLeft",
    });
    return response.data;
  } catch (error) {
      Modal.error({
      title: "Oops!",
      content: "Please check your internet connection! or try again later!",
    });
    console.log(error);
  }
};

export const deleteModifierAddon = async (data: ParamsType) => {
  try {
    const response = await axios.delete(
      `${BASE_URL}/modifiers/delete-modifier/${data?._id}`
    );
    Modal.success({
      title: "Success!",
      content: "Modifier Deleted Successfully!",
    });
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops!",
      content: "Please check your internet connection! or try again later!",
    });
    console.log(error);
  }
};

export const getModifierAddonById = async (data: ParamsType) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/modifiers/fetch-modifiers`,
      {
        params: {
          id: data?.id,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.log(error);
  }
};


// addons 
export const getAllAddons = async (data: ParamsType) => {
  try {
    const response = await axios.get(`${BASE_URL}/addons/fetch-addons`, {
      params: {
        name: data?.name,
      },
    });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};
export const createAddon = async (data: ParamsType) => {
  try {    
    const response = await axios.post(`${BASE_URL}/modifiers/create-addons`, {
      ...data,
    });
    notification.success({
      message: "Success!",
      description: "Addon Added Successfully!",
      duration: 1,
      placement: "bottomLeft",
    });
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops!",
      content: "Please check your internet connection! or try again later!",
    });
    console.log(error);
  }
};

export const editAddon = async (data: ParamsType) => {
  try {   
    const response = await axios.put(`${BASE_URL}/modifiers/update-addon/${data?._id}`, {
      ...data.values,       
    });
    notification.success({
      message: "Success!",
      description: "Addon Updated Successfully!",
      duration: 2,
      placement: "bottomLeft",
    });
    return response.data;
  } catch (error) {
      Modal.error({
      title: "Oops!",
      content: "Please check your internet connection! or try again later!",
    });
    console.log(error);
  }
};

export const deleteAddon = async (data: ParamsType) => {
  try {
    const response = await axios.delete(
      `${BASE_URL}/modifiers/delete-addon/${data?._id}`
    );
    notification.success({
      message: "Success!",
      description: "Addon Deleted Successfully!",
      duration: 2,
      placement: "bottomLeft",
    });
    return response.data;
  } catch (error) {
    Modal.error({
      title: "Oops!",
      content: "Please check your internet connection! or try again later!",
    });
    console.log(error);
  }
};

export const getAddonById = async (data: ParamsType) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/modifiers/fetch-addons`,
      {
        params: {
          id: data?.id,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.log(error);
  }
};