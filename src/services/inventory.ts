import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const inventoryUrl = `${BASE_URL}/product-inventory`;

const { headers } = SetBearerHeaderToken();

// Define ParamsType interface
interface ParamsType {
  _id?: string;
  name: string;
  quantity: number;
  price: number;
  min_viable_quantity?: number;
  desc?: string;
  subcategory_id: any;
  unit_id: any;
  shop_id?: string;
  imageFile?: File | null;
  [key: string]: any;
}

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

export const fetchAllInventory = async (data: any = {}) => {
  try {
    const response = await axiosInstance.get(inventoryUrl, {
      params: { name: data.name, code: data.code },
      headers: headers,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching inventory:", error);
    throw new Error("Failed to fetch inventory items");
  }
};

// Updated to match multer configuration in server.js
export const addNewInventory = async (params) => {
  try {
    const tenant = getTenant();
    const companyCode = localStorage.getItem("companyCode");
    const shopId = localStorage.getItem("shopId");

    // Check if there's an image file to upload
    const imageFile = params.imageFile;
    const hasFile = imageFile instanceof File;

    if (hasFile) {
      // Create FormData for file upload
      const formData = new FormData();

      // Add the file using the field name that multer is configured for
      // Your server.js shows multer.single("thumbnail")
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

      // Handle subcategory_id (normalize object format from ProFormSelect)
      if (typeof params.subcategory_id === 'object' && params.subcategory_id?.value) {
        formData.append('subcategory_id', params.subcategory_id.value);
      } else if (params.subcategory_id) {
        formData.append('subcategory_id', params.subcategory_id.toString());
      }

      // Handle unit_id (normalize object format from ProFormSelect)
      if (typeof params.unit_id === 'object' && params.unit_id?.value) {
        formData.append('unit_id', params.unit_id.value);
      } else if (params.unit_id) {
        formData.append('unit_id', params.unit_id.toString());
      }

      // Add all other fields (excluding already processed ones)
      const { imageFile: _, subcategory_id: __, unit_id: ___, ...otherParams } = params;

      Object.keys(otherParams).forEach(key => {
        if (otherParams[key] !== null && otherParams[key] !== undefined) {
          if (typeof otherParams[key] === 'object' && !(otherParams[key] instanceof File)) {
            formData.append(key, JSON.stringify(otherParams[key]));
          } else {
            formData.append(key, otherParams[key].toString());
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
      const response = await fetch(inventoryUrl, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      // Process response
      const data = await response.json();

      if (!response.ok) {
        console.error("Server error response:", data);
        throw new Error(data.message || "Failed to add inventory");
      }

      message.success("Inventory added successfully");
      return data;
    } else {
      // No file to upload, use regular JSON request
      // Normalize subcategory_id and unit_id
      const subcategory_id = params.subcategory_id?.value || params.subcategory_id;
      const unit_id = params.unit_id?.value || params.unit_id;

      // Remove imageFile if present
      const { imageFile: _, ...cleanParams } = params;

      const requestBody = {
        ...cleanParams,
        subcategory_id,
        unit_id,
        tenant,
        companyCode,
        tenant_code: companyCode || (tenant ? tenant.tenant_code : null),
        shop_id: shopId
      };

      // Use your axios instance for non-file requests
      const response = await axiosInstance.post(inventoryUrl, requestBody, {
        headers: {
          ...headers,
          ...(companyCode ? { 'companyCode': companyCode } : {})
        }
      });

      message.success("Inventory added successfully");
      return response.data;
    }
  } catch (error) {
    console.error("Error adding inventory:", error);
    if (error?.response?.status !== 403) {
      message.error("Error adding inventory, Please try again");
    }
    throw new Error("Failed to add inventory");
  }
};

export const editInventory = async (params) => {
  try {
    const tenant = getTenant();
    const companyCode = localStorage.getItem("companyCode");
    const shopId = localStorage.getItem("shopId");

    // Check if there's an image file to upload
    const imageFile = params.values?.imageFile;
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
      }

      // Add shop ID if available
      if (shopId && shopId !== "undefined") {
        formData.append("shop_id", shopId);
      }

      // Handle subcategory_id
      if (typeof params.values.subcategory_id === 'object' && params.values.subcategory_id?.value) {
        formData.append('subcategory_id', params.values.subcategory_id.value);
      } else if (params.values.subcategory_id) {
        formData.append('subcategory_id', params.values.subcategory_id.toString());
      }

      // Handle unit_id
      if (typeof params.values.unit_id === 'object' && params.values.unit_id?.value) {
        formData.append('unit_id', params.values.unit_id.value);
      } else if (params.values.unit_id) {
        formData.append('unit_id', params.values.unit_id.toString());
      }

      // Add all other fields (excluding already processed ones)
      const { imageFile: _, subcategory_id: __, unit_id: ___, ...otherValues } = params.values;

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
      const response = await fetch(`${inventoryUrl}/${params._id}`, {
        method: 'PUT',
        headers: headers,
        body: formData
      });

      // Process response
      const data = await response.json();

      if (!response.ok) {
        console.error("Server error response:", data);
        throw new Error(data.message || "Failed to update inventory");
      }

      message.success("Inventory updated successfully");
      return data;
    } else {
      // No file to upload, use regular JSON request
      // Normalize subcategory_id and unit_id
      const subcategory_id = params.values.subcategory_id?.value || params.values.subcategory_id;
      const unit_id = params.values.unit_id?.value || params.values.unit_id;

      // Remove imageFile if present
      const { imageFile: _, ...cleanValues } = params.values;

      const requestBody = {
        ...cleanValues,
        subcategory_id,
        unit_id,
        tenant,
        companyCode,
        tenant_code: companyCode || (tenant ? tenant.tenant_code : null),
        shop_id: shopId
      };

      // Use your axios instance for non-file requests
      const response = await axiosInstance.put(`${inventoryUrl}/${params._id}`, requestBody, {
        headers: {
          ...headers,
          ...(companyCode ? { 'companyCode': companyCode } : {})
        }
      });

      message.success("Inventory updated successfully");
      return response.data;
    }
  } catch (error) {
    console.error("Error updating inventory:", error);
    if (error?.response?.status !== 403) {
      message.error("Error updating inventory");
    }
    throw new Error("Failed to update inventory");
  }
};

export const deleteInventory = async (inventoryId: string) => {
  try {
    // Get tenant info
    const tenant = getTenant();
    const companyCode = localStorage.getItem("companyCode");

    const response = await axiosInstance.delete(`${inventoryUrl}/${inventoryId}`, {
      headers: {
        ...headers,
        ...(companyCode ? { 'companyCode': companyCode } : {}),
      },
      data: { tenant } // Include tenant in the delete request body
    });

    message.success("Inventory deleted successfully");
    return response.data;
  } catch (error) {
    console.error("Error deleting inventory:", error);
    if (error?.response?.status !== 403) {
      message.error("Error deleting inventory");
    }
    throw new Error("Failed to delete inventory");
  }
};