import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message, Modal, notification } from "antd";
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
    throw new Error("Error fetching modifiers");
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
    message.success("Modifier created successfully");
    return response.data;
  } catch (error) {
    message.error("Failed to add modifier");
    throw new Error("Error adding modifier");
  }
};

export const editModifierAddon = async (data: ParamsType) => {
  try {
    let user;
    if (localStorage.getItem("user")) {
      user = JSON.parse(localStorage.getItem("user"));
    }
    const response = await axios.put(
      `${BASE_URL}/modifiers/update-modifier/${data?._id}`,
      {
        ...data.values,
        createdBy: user?.id,
      }
    );
    message.success("Modifier updated successfully");
    return response.data;
  } catch (error) {
    message.error("Failed to update modifier");
    throw new Error("Error updating modifier");
  }
};

export const deleteModifierAddon = async (data: ParamsType) => {
  try {
    const response = await axios.delete(
      `${BASE_URL}/modifiers/delete-modifier/${data}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Error deleting modifier");
  }
};

export const getModifierAddonById = async (data: ParamsType) => {
  try {
    const response = await axios.get(`${BASE_URL}/modifiers/fetch-modifiers`, {
      params: {
        id: data?.id,
      },
    });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

// addons
export const getAllAddons = async (data: ParamsType) => {
  try {
    const response = await axios.get(`${BASE_URL}/modifiers/fetch-addons`, {
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
    const response = await axios.post(`${BASE_URL}/modifiers/create-addons`, data);
    message.success("Addon created successfully");
    return response.data;
  } catch (error) {
    message.error("Failed to add addon");
    throw new Error("Error adding addon");
  }
};

export const editAddon = async (data: ParamsType) => {
  try {
    const response = await axios.put(
      `${BASE_URL}/modifiers/update-addon/${data?._id}`,
      {
        ...data.values,
      }
    );
    message.success("Addon updated successfully");
    return response.data;
  } catch (error) {
    message.error("Failed to update addon");
    throw new Error("Error updating addon");
  }
};

export const deleteAddon = async (data: ParamsType) => {
  try {
    const response = await axios.delete(
      `${BASE_URL}/modifiers/delete-addon/${data}`
    );

    return response.data;
  } catch (error) {
    throw new Error("Error deleting addon");
  }
};

export const getAddonById = async (data: ParamsType) => {
  try {
    const response = await axios.get(`${BASE_URL}/modifiers/fetch-addons`, {
      params: {
        id: data?.id,
      },
    });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};
