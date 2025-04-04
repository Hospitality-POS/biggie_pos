import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "./request";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import { createAsyncThunk } from "@reduxjs/toolkit";
import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";

const userUrl = `${BASE_URL}/users`;
const tenantUrl = `${BASE_URL}/tenants`;

const shopId = localStorage.getItem("shopId");
const { headers } = SetBearerHeaderToken();

// Get tenant from localStorage
const getTenant = () => {
  try {
    const tenantStr = localStorage.getItem('tenant');
    if (tenantStr) {
      return JSON.parse(tenantStr);
    }
    return null;
  } catch (error) {
    console.error("Error getting tenant:", error);
    return null;
  }
};

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
  try {
    const tenant = getTenant();
    const companyCode = localStorage.getItem("companyCode");

    // Check if there's an image file to upload
    const imageFile = data?.value?.imageFile;
    const hasFile = imageFile instanceof File;

    if (hasFile) {
      // Create FormData for file upload
      const formData = new FormData();

      // Add the file using the field name that multer is configured for
      formData.append("thumbnail", imageFile);

      // Add tenant information
      if (tenant) {
        formData.append('tenant', JSON.stringify(tenant));
        if (tenant.tenant_code) {
          formData.append('tenant_code', tenant.tenant_code);
        }
      }

      // Add company code if available
      if (companyCode) {
        formData.append('companyCode', companyCode);
        formData.append('tenant_code', companyCode);
      }

      // Add shop ID if available
      if (shopId && shopId !== "undefined") {
        formData.append("shop_id", shopId);
      }

      // Handle roleId (normalize object format from ProFormSelect)
      if (typeof data.value.roleId === 'object' && data.value.roleId?.value) {
        formData.append('roleId', data.value.roleId.value);
      } else if (data.value.roleId) {
        formData.append('roleId', data.value.roleId.toString());
      }

      // Handle shop_id (normalize object format from ProFormSelect)
      if (typeof data.value.shop_id === 'object' && data.value.shop_id?.value) {
        formData.append('shop_id', data.value.shop_id.value);
      } else if (data.value.shop_id) {
        formData.append('shop_id', data.value.shop_id.toString());
      }

      // Add all other fields (excluding already processed ones)
      const { imageFile: _, roleId: __, shop_id: ___, ...otherValues } = data.value;

      Object.keys(otherValues).forEach(key => {
        if (otherValues[key] !== null && otherValues[key] !== undefined) {
          if (typeof otherValues[key] === 'object' && !(otherValues[key] instanceof File)) {
            formData.append(key, JSON.stringify(otherValues[key]));
          } else {
            formData.append(key, otherValues[key].toString());
          }
        }
      });

      // Get authentication token
      const token = localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user")).Token
        : '';

      // Set request headers
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      if (companyCode) {
        headers['companyCode'] = companyCode;
      }

      // Make API request
      const response = await fetch(`${userUrl}/${data._id}`, {
        method: 'PUT',
        headers: headers,
        body: formData
      });

      // Process response
      const responseData = await response.json();

      if (!response.ok) {
        console.error("Server error response:", responseData);
        throw new Error(responseData.message || "Failed to update user");
      }

      message.success("User updated successfully");
      return responseData;
    } else {
      // No file to upload, use regular JSON request
      // Normalize roleId and shop_id
      const roleId = data.value.roleId?.value || data.value.roleId;
      const shop_id = data.value.shop_id?.value || data.value.shop_id;

      // Remove imageFile if present
      const { imageFile: _, ...cleanValues } = data.value;

      const requestBody = {
        ...cleanValues,
        roleId,
        shop_id,
        tenant,
        companyCode,
        tenant_code: companyCode || (tenant ? tenant.tenant_code : null)
      };

      // Use axios instance for non-file requests
      const response = await axiosInstance.put(`${userUrl}/${data._id}`, requestBody, {
        headers: {
          ...headers,
          ...(companyCode ? { 'companyCode': companyCode } : {})
        }
      });

      message.success("User updated successfully");
      return response.data;
    }
  } catch (error: any) {
    console.error("Error updating user:", error);
    if (error?.response?.status !== 403) {
      message.error("Failed to update user");
    }
    throw new Error(error?.message || "Failed to update user");
  }
};

// Add a new user with image upload support
export const addUser = async (userData) => {
  try {
    const tenant = getTenant();
    const companyCode = localStorage.getItem("companyCode");

    // Check if there's an image file to upload
    const imageFile = userData?.imageFile;
    const hasFile = imageFile instanceof File;

    if (hasFile) {
      // Create FormData for file upload
      const formData = new FormData();

      // Add the file using the field name that multer is configured for
      formData.append("thumbnail", imageFile);

      // Add tenant information
      if (tenant) {
        formData.append('tenant', JSON.stringify(tenant));
        if (tenant.tenant_code) {
          formData.append('tenant_code', tenant.tenant_code);
        }
      }

      // Add company code if available
      if (companyCode) {
        formData.append('companyCode', companyCode);
        formData.append('tenant_code', companyCode);
      }

      // Add shop ID if available
      if (shopId && shopId !== "undefined") {
        formData.append("shop_id", shopId);
      }

      // Handle roleId (normalize object format from ProFormSelect)
      if (typeof userData.roleId === 'object' && userData.roleId?.value) {
        formData.append('roleId', userData.roleId.value);
      } else if (userData.roleId) {
        formData.append('roleId', userData.roleId.toString());
      }

      // Handle shop_id (normalize object format from ProFormSelect)
      if (typeof userData.shop_id === 'object' && userData.shop_id?.value) {
        formData.append('shop_id', userData.shop_id.value);
      } else if (userData.shop_id) {
        formData.append('shop_id', userData.shop_id.toString());
      }

      // Add all other fields (excluding already processed ones)
      const { imageFile: _, roleId: __, shop_id: ___, ...otherValues } = userData;

      Object.keys(otherValues).forEach(key => {
        if (otherValues[key] !== null && otherValues[key] !== undefined) {
          if (typeof otherValues[key] === 'object' && !(otherValues[key] instanceof File)) {
            formData.append(key, JSON.stringify(otherValues[key]));
          } else {
            formData.append(key, otherValues[key].toString());
          }
        }
      });

      // Get authentication token
      const token = localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user")).Token
        : '';

      // Set request headers
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      if (companyCode) {
        headers['companyCode'] = companyCode;
      }

      // Make API request
      const response = await fetch(`${userUrl}`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      // Process response
      const responseData = await response.json();

      if (!response.ok) {
        console.error("Server error response:", responseData);
        throw new Error(responseData.message || "Failed to add user");
      }

      message.success("User added successfully");
      return responseData;
    } else {
      // No file to upload, use regular JSON request
      // Normalize roleId and shop_id
      const roleId = userData.roleId?.value || userData.roleId;
      const shop_id = userData.shop_id?.value || userData.shop_id;

      // Remove imageFile if present
      const { imageFile: _, ...cleanValues } = userData;

      const requestBody = {
        ...cleanValues,
        roleId,
        shop_id,
        tenant,
        companyCode,
        tenant_code: companyCode || (tenant ? tenant.tenant_code : null)
      };

      // Use axios instance for non-file requests
      const response = await axiosInstance.post(`${userUrl}`, requestBody, {
        headers: {
          ...headers,
          ...(companyCode ? { 'companyCode': companyCode } : {})
        }
      });

      message.success("User added successfully");
      return response.data;
    }
  } catch (error: any) {
    console.error("Error adding user:", error);
    if (error?.response?.status !== 403) {
      message.error("Failed to add user");
    }
    throw new Error(error?.message || "Failed to add user");
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

export const fetchTenantById = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${tenantUrl}/${id}`);
    console.log('asdfnadsmd', response);
    if (response && response.data) {
      localStorage.setItem("tenant", JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Error fetching tenant");
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