import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axios, { AxiosError } from "axios";

const roleUrl = `${BASE_URL}/users`;

interface Role {
  role_type: string;
  _id: string;
}

export const fetchAllRoles = async (params: ParamsType) => {
  try {
    const response = await axios.get(`${roleUrl}/fetch-role-type/all`, { params });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const createRole = async (roleData: Role) => {
  try {
    const response = await axios.post(`${roleUrl}/new-role-type`, roleData);
    message.success("Role created successfully");
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    console.error("Error creating role:", err.message);
    message.error("Failed to create role");
    throw err;
  }
};

export const updateRole = async (roleData: Role) => {
  try {
    const response = await axios.put(`${roleUrl}/update-role-type/${roleData._id}`, roleData);
    message.success("Role updated successfully");
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    console.error("Error updating role:", err.message);
    message.error("Failed to update role");
    throw err;
  }
};

export const deleteRole = async (id: string) => {
  try {
    const response = await axios.delete(`${roleUrl}/remove-role-type/${id}`);
    message.success("Role deleted successfully");
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    console.error("Error deleting role:", err.message);
    message.error("Failed to delete role");
    throw err;
  }
};