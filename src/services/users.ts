import { ParamsType } from "@ant-design/pro-components";
import axios from "axios";
import { BASE_URL } from "@utils/config";
import { Modal, notification } from "antd/lib";
import { message } from "antd";

const userUrl = `${BASE_URL}/users`;

export const fetchAllUsersList = async (data: ParamsType) => {
  try {
    const url = `${BASE_URL}/users/all`;

    const response = await axios.get(url, {
      params: { fullname: data.fullname, email: data.email },
    });
    return response.data;
  } catch (error) {
    throw new Error(error?.message);
  }
};

export const updateUsers = async (data: ParamsType) => {
  const url = `${BASE_URL}/users`;
  try {
    const response = await axios.put(`${url}/${data?._id}`, data?.value);
    message.success("User updated successfully");
    return response.data;
  } catch (error: any) {
    message.error("Failed to update user");
    throw new Error(error?.message);
  }
};

export const fetchUserRoles = async () => {
  const url = `${BASE_URL}/users`;
  try {
    const response = await axios.get(`${url}/fetch-role-type/all`);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const fetchUserById = async (id: string) => {
  try {
    const response = await axios.get(`${userUrl}/${id}`);
    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Error fetching user");
  }
};

export const deleteUserById = async (id: string) => {
  try {
    const response = await axios.delete(`${userUrl}/${id}`);
    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Error deleting user");
  }
};
