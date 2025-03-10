import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "./request";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import { createAsyncThunk } from "@reduxjs/toolkit";
const userUrl = `${BASE_URL}/users`;
const tenantUrl = `${BASE_URL}/tenants`;

const shopId = localStorage.getItem("shopId");

export const fetchAllUsersList = async (data: ParamsType) => {
  try {
    const url = `${BASE_URL}/users/all`;

    const response = await axiosInstance.get(url, {
      params: { fullname: data.fullname, email: data.email },
    });
    return response.data;
  } catch (error) {
    throw new Error(error?.message);
  }
};


export const fetchAllUsersByShopId = async () => {
  try {
    const url = `${BASE_URL}/users/shop/${shopId}`;
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw new Error(error?.message);
  }
};


export const updateSubscription = createAsyncThunk(
  "subscription/update",
  async (data: ParamsType, { rejectWithValue }) => {
    try {
      const url = `${BASE_URL}/users/update-package`;
      const response = await axiosInstance.post(url, data);
      // console.log('nice bbb', response);
      if (response && response.data && response.data.data) {
        localStorage.setItem("tenant", JSON.stringify(response.data.data));
      }

      return response.data;
    } catch (error) {
      console.error('Error:', error);
      return rejectWithValue("Failed to update subscription.");
    }
  }
);

export const verifyCompanyCode = async (data: ParamsType) => {
  try {
    const url = `${tenantUrl}/verify`;

    // Create the request body
    const requestBody = {
      ...data,
    };

    const response = await axiosInstance.post(url, requestBody);

    console.log('oooh ', response);

    return response.data;
  } catch (error: any) {
    throw new Error(error?.message || "Failed to verify company code.");
  }
};



export const updateUsers = async (data: ParamsType) => {
  const url = `${BASE_URL}/users`;
  try {
    const response = await axiosInstance.put(`${url}/${data?._id}`, data?.value);
    message.success("User updated successfully");
    return response.data;
  } catch (error: any) {
    if (error?.response?.status != 403) {
      message.error("Failed to update user");
    }
    throw new Error(error?.message);
  }
};

export const fetchUserRoles = async () => {
  const url = `${BASE_URL}/users`;
  try {
    const response = await axiosInstance.get(`${url}/fetch-role-type/all`);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const fetchUserById = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${userUrl}/${id}`);
    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Error fetching user");
  }
};

export const deleteUserById = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${userUrl}/${id}`);
    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Error deleting user");
  }
};
