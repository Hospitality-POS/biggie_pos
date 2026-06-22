import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";


const permissionUrl = `${BASE_URL}/users`;

interface Permission {
    role_type: string;
    _id: string;
}

export const fetchAllPermissions = async (params: ParamsType) => {
    try {
        const response = await axiosInstance.get(`${permissionUrl}/fetch-permission/all`, { params });
        return response.data;
    } catch (error) {
        console.log(error);
    }
};

export const createPermission = async (roleData: Permission) => {
    try {
        const response = await axiosInstance.post(`${permissionUrl}/new-permission`, roleData);
        // message.success("permission created successfully");
        return response.data;
    } catch (error: unknown) {
        if (error?.response?.status != 403) {
            message.error("Failed to create permission");
        }
        throw error;
    }
};

export const updatePermission = async (roleData: Permission) => {
    try {
        const response = await axiosInstance.put(`${permissionUrl}/update-permission/${roleData._id}`, roleData);
        // message.success("permission updated successfully");
        return response.data;
    } catch (error: unknown) {

        if (error?.response?.status != 403) {
            message.error("Failed to update permission");
        }
        throw error;
    }
};

export const deletePermission = async (id: string) => {
    try {
        const response = await axiosInstance.delete(`${permissionUrl}/remove-permission/${id}`);
        // message.success("permission deleted successfully");
        return response.data;
    } catch (error: unknown) {
        if (error?.response?.status != 403) {
            message.error("Failed to delete permission");
        }
        throw error;
    }
};