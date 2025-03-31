import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const productUrl = `${BASE_URL}/product/products`;
const invetoryUrl = `${BASE_URL}/product-inventory`;
const unitsUrl = `${BASE_URL}/uom`;

const { headers } = SetBearerHeaderToken();

// Define ParamsType interface
interface ParamsType {
  _id?: string;
  name: string;
  price: number;
  category: any;
  desc?: string;
  quantity?: number;
  min_viable_quantity?: number;
  activateInventory?: boolean;
  addons?: any[];
  shop_id?: string;
  thumbnailFile?: File | null;
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

export const getAllProducts = async () => {
  try {
    const response = await axiosInstance.get(`${productUrl}/getproducts/all`);
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch products");
  }
};

export const addNewProduct = async (params: ParamsType) => {
  try {
    let response;
    const tenant = getTenant();
    const companyCode = localStorage.getItem("companyCode");
    const shopId = localStorage.getItem("shopId"); // Get shop_id from localStorage

    console.log("Company code from localStorage:", companyCode);
    console.log("Shop ID from localStorage:", shopId);
    console.log("Adding product with file:", params.thumbnailFile ? "File present" : "No file");

    const thumbnailFile = params.thumbnailFile;
    const hasFile = thumbnailFile instanceof File;

    if (hasFile) {
      console.log("File details:", {
        name: thumbnailFile.name,
        type: thumbnailFile.type,
        size: thumbnailFile.size,
        lastModified: thumbnailFile.lastModified
      });

      console.log("Thumbnail File Check:", thumbnailFile instanceof File, thumbnailFile);

      const formData = new FormData();
      const rawFile = new File([thumbnailFile], thumbnailFile.name, { type: thumbnailFile.type });
      formData.append("thumbnail", rawFile);

      if (tenant) {
        formData.append('tenant', JSON.stringify(tenant));
        if (tenant.tenant_code) {
          formData.append('tenant_code', tenant.tenant_code);
        }
      }

      if (companyCode) {
        formData.append('companyCode', companyCode);
        formData.append('tenant_code', companyCode);
      }

      if (shopId && shopId !== "undefined") {
        formData.append("shop_id", shopId); // Append shop_id explicitly
      }

      const { thumbnailFile: _, ...otherParams } = params;

      Object.keys(otherParams).forEach(key => {
        if (otherParams[key] !== null && otherParams[key] !== undefined) {
          if (typeof otherParams[key] === 'object' && !(otherParams[key] instanceof File)) {
            formData.append(key, JSON.stringify(otherParams[key]));
          } else {
            formData.append(key, otherParams[key].toString());
          }
        }
      });

      console.log("FormData entries:");
      for (const pair of formData.entries()) {
        console.log(`${pair[0]}: ${typeof pair[1] === 'object' ? 'File object' : pair[1]}`);
      }

      const token = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).Token : '';

      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
      };

      if (companyCode) {
        headers['companyCode'] = companyCode;
      }

      console.log("Request headers:", headers);

      const fetchResponse = await fetch(`${BASE_URL}/product/products`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      const data = await fetchResponse.json();
      console.log("Response from server:", data);

      if (!fetchResponse.ok) {
        throw new Error(data.message || "Failed to create product");
      }

      message.success("Product added successfully");
      return data;
    } else {
      const { thumbnailFile: _, ...cleanParams } = params;

      const requestBody = {
        ...cleanParams,
        tenant,
        companyCode,
        tenant_code: companyCode || (tenant ? tenant.tenant_code : null),
        shop_id: shopId // Include shop_id in JSON request as well
      };

      console.log("Sending JSON request with body:", requestBody);

      response = await axiosInstance.post(`${BASE_URL}/product/products`, requestBody, {
        headers: {
          ...(companyCode ? { 'companyCode': companyCode } : {}),
        }
      });

      message.success("Product added successfully");
      return response.data;
    }
  } catch (error) {
    console.error("Error adding product:", error);
    if (error?.response?.status !== 403) {
      message.error("Failed to add a new product");
    }
    throw new Error("Failed to add a new product");
  }
};

export const editProduct = async (data) => {
  try {
    let response;
    const tenant = getTenant();
    const thumbnailFile = data.thumbnailFile;
    const hasFile = thumbnailFile instanceof File;

    // Normalize category to a single value:
    let category;
    if (Array.isArray(data.category)) {
      // If it's an array, choose the first element (or adjust as needed)
      category = data.category[0];
    } else if (data.category && typeof data.category === 'object' && data.category.value) {
      // If it's an object with a value property, use that
      category = data.category.value;
    } else {
      category = data.category;
    }

    if (hasFile) {
      // Prepare FormData for multipart upload
      const formData = new FormData();

      // Append the file as usual
      formData.append("thumbnail", thumbnailFile, thumbnailFile.name);

      // Append category as a string (do not JSON.stringify if it's just an ID)
      formData.append("category", category.toString());

      // Append other product data (ensure that the keys match what your server expects)
      const { thumbnailFile: _, _id, ...otherData } = data;
      Object.keys(otherData).forEach((key) => {
        if (otherData[key] !== null && otherData[key] !== undefined) {
          // For non-file objects, you can check if it's an object and stringify if necessary
          if (typeof otherData[key] === "object" && !(otherData[key] instanceof File)) {
            formData.append(key, JSON.stringify(otherData[key]));
          } else {
            formData.append(key, otherData[key].toString());
          }
        }
      });

      // Make request with FormData
      response = await axiosInstance.put(`${productUrl}/${data._id}`, formData, {
        headers: {
          // Do not manually set "Content-Type", let Axios set it with the proper boundary
          ...headers,
        },
      });
    } else {
      // Send JSON request if no file is included
      const { thumbnailFile: _, ...cleanData } = data;
      const requestBody = {
        ...cleanData,
        category,
        tenant,
      };

      response = await axiosInstance.put(`${productUrl}/${data._id}`, requestBody, { headers });
    }

    message.success("Product updated successfully");
    return response.data;
  } catch (error) {
    console.error("Error editing product:", error);
    if (error?.response?.status !== 403) {
      message.error("Failed to edit product");
    }
    throw new Error("Failed to edit product");
  }
};



export const deleteProduct = async (productId: string) => {
  try {
    // Get tenant info
    const tenant = getTenant();

    await axiosInstance.delete(`${productUrl}/${productId}`, {
      headers,
      data: { tenant } // Include tenant in the delete request body
    });

    message.success("Product deleted successfully");
    return productId;
  } catch (error) {
    if (error?.response?.status !== 403) {
      message.error("Failed to delete product");
    }
    throw new Error("Failed to delete product");
  }
};

export const fetchAllInventoryItems = async (params: any) => {
  try {
    const response = await axiosInstance.get(`${invetoryUrl}`, { headers });
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch inventories");
  }
};

export const fetchAllUnits = async (params: any) => {
  try {
    const response = await axiosInstance.get(`${unitsUrl}`, { headers });
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch units");
  }
};