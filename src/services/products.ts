import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const productUrl = `${BASE_URL}/product/products`;
const invetoryUrl = `${BASE_URL}/product-inventory`;
const unitsUrl = `${BASE_URL}/uom`;

const { headers } = SetBearerHeaderToken();

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

const getTenant = () => {
  try {
    const tenantStr = localStorage.getItem('tenant');
    if (tenantStr) return JSON.parse(tenantStr);
    return null;
  } catch (error) {
    console.error("Error getting tenant:", error);
    return null;
  }
};

export const getAllProducts = async (forceRefresh = false) => {
  try {
    const url = forceRefresh 
      ? `${productUrl}/getproducts/all?_t=${Date.now()}`
      : `${productUrl}/getproducts/all`;
    const response = await axiosInstance.get(url);
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
    const shopId = localStorage.getItem("shopId");

    const thumbnailFile = params.thumbnailFile;
    const hasFile = thumbnailFile instanceof File;

    if (hasFile) {
      const formData = new FormData();
      const rawFile = new File([thumbnailFile], thumbnailFile.name, { type: thumbnailFile.type });
      formData.append("thumbnail", rawFile);

      if (tenant) {
        formData.append('tenant', JSON.stringify(tenant));
        if (tenant.tenant_code) formData.append('tenant_code', tenant.tenant_code);
      }
      if (companyCode) {
        formData.append('companyCode', companyCode);
        formData.append('tenant_code', companyCode);
      }
      if (shopId && shopId !== "undefined") formData.append("shop_id", shopId);

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

      const token = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).Token : '';
      const fetchHeaders: HeadersInit = { 'Authorization': `Bearer ${token}` };
      if (companyCode) fetchHeaders['companyCode'] = companyCode;

      const fetchResponse = await fetch(`${BASE_URL}/product/products`, {
        method: 'POST',
        headers: fetchHeaders,
        body: formData,
      });

      const data = await fetchResponse.json();
      if (!fetchResponse.ok) throw new Error(data.message || "Failed to create product");

      message.success("Product added successfully");
      return data;
    } else {
      const { thumbnailFile: _, ...cleanParams } = params;
      const requestBody = {
        ...cleanParams,
        tenant,
        companyCode,
        tenant_code: companyCode || (tenant ? tenant.tenant_code : null),
        shop_id: shopId,
      };

      response = await axiosInstance.post(`${BASE_URL}/product/products`, requestBody, {
        headers: { ...(companyCode ? { 'companyCode': companyCode } : {}) },
      });

      message.success("Product added successfully");
      return response.data;
    }
  } catch (error) {
    console.error("Error adding product:", error);
    if (error?.response?.status !== 403) message.error("Failed to add a new product");
    throw new Error("Failed to add a new product");
  }
};

// silent = true suppresses the success toast (used during bulk operations)
export const editProduct = async (data: any, silent = false) => {
  try {
    let response;
    const tenant = getTenant();
    const thumbnailFile = data.thumbnailFile;
    const hasFile = thumbnailFile instanceof File;

    let category;
    if (Array.isArray(data.category)) {
      category = data.category[0];
    } else if (data.category && typeof data.category === 'object' && data.category.value) {
      category = data.category.value;
    } else {
      category = data.category;
    }

    if (hasFile) {
      const formData = new FormData();
      formData.append("thumbnail", thumbnailFile, thumbnailFile.name);
      formData.append("category", category.toString());

      const { thumbnailFile: _, _id, ...otherData } = data;
      Object.keys(otherData).forEach((key) => {
        if (otherData[key] !== null && otherData[key] !== undefined) {
          if (typeof otherData[key] === "object" && !(otherData[key] instanceof File)) {
            formData.append(key, JSON.stringify(otherData[key]));
          } else {
            formData.append(key, otherData[key].toString());
          }
        }
      });

      response = await axiosInstance.put(`${productUrl}/${data._id}`, formData, {
        headers: { ...headers },
      });
    } else {
      const { thumbnailFile: _, ...cleanData } = data;
      response = await axiosInstance.put(`${productUrl}/${data._id}`, {
        ...cleanData,
        category,
        tenant,
      }, { headers });
    }

    // Only show the toast when NOT in a bulk operation
    if (!silent) {
      message.success("Product updated successfully");
    }

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
    const tenant = getTenant();
    await axiosInstance.delete(`${productUrl}/${productId}`, {
      headers,
      data: { tenant },
    });
    message.success("Product deleted successfully");
    return productId;
  } catch (error) {
    if (error?.response?.status !== 403) message.error("Failed to delete product");
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