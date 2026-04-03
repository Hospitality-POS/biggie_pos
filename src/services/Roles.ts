import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const roleUrl = `${BASE_URL}/users`;

interface Role {
  role_type: string;
  permissions: string;
  _id: string;
}

export const fetchAllRoles = async (params: ParamsType) => {
  try {
    const response = await axiosInstance.get(`${roleUrl}/fetch-role-type/all`, { params });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const createRole = async (roleData: Role) => {
  try {
    const response = await axiosInstance.post(`${roleUrl}/new-role-type`, roleData);
    message.success("Role created successfully");
    return response.data;
  } catch (error: unknown) {
    if (error?.response?.status != 403) {
      message.error("Failed to create role");
    }
    throw error;
  }
};

export const updateRole = async (roleData: Role) => {
  try {
    console.log('my data', roleData);
    const response = await axiosInstance.put(`${roleUrl}/update-role-type/${roleData._id}`, roleData);
    message.success("Role updated successfully");
    return response.data;
  } catch (error: unknown) {

    if (error?.response?.status != 403) {
      message.error("Failed to update role");
    }
    throw error;
  }
};

export const deleteRole = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${roleUrl}/remove-role-type/${id}`);
    message.success("Role deleted successfully");
    return response.data;
  } catch (error: unknown) {
    if (error?.response?.status != 403) {
      message.error("Failed to delete role");
    }
    throw error;
  }
};