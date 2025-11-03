import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const inventoryUrl = `${BASE_URL}/product-inventory`;
const transferUrl = `${BASE_URL}/transfers`;

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

// Transfer related interfaces
interface TransferItem {
  product_id: string;
  quantity: number;
  unit_id: string;
  notes?: string;
}

interface CreateTransferParams {
  from_shop_id: string;
  to_shop_id: string;
  items: TransferItem[];
  expected_delivery_date?: string;
  notes?: string;
  initiated_by?: string;
}

interface TransferFilters {
  shop_id?: string;
  status?: 'pending' | 'in_transit' | 'completed' | 'cancelled' | 'rejected';
  direction?: 'incoming' | 'outgoing' | 'both';
  startDate?: string;
  endDate?: string;
}

interface ApproveTransferParams {
  approved_by?: string;
}

interface CompleteTransferParams {
  received_by?: string;
}

interface RejectTransferParams {
  rejection_reason: string;
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

// ==================== INVENTORY METHODS ====================

// Note: axiosInstance automatically adds companyCode header via request interceptor
// No need for getCommonHeaders() function anymore!

export const fetchAllInventory = async (data: any = {}) => {
  try {
    const response = await axiosInstance.get(inventoryUrl, {
      params: { name: data.name, code: data.code, shop_id: data.shop_id, origin_shop: data.origin_shop }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching inventory:", error);
    throw new Error("Failed to fetch inventory items");
  }
};

export const fetchInventoryNotifications = async (shopId?: string) => {
  try {
    const response = await axiosInstance.get(`${inventoryUrl}/notifications/count`, {
      params: shopId ? { shop_id: shopId } : {}
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching inventory notifications:", error);
    throw new Error("Failed to fetch inventory notifications");
  }
};

export const addNewInventory = async (params) => {
  try {
    const tenant = getTenant();
    const companyCode = localStorage.getItem("companyCode");
    const shopId = localStorage.getItem("shopId");

    const imageFile = params.imageFile;
    const hasFile = imageFile instanceof File;

    if (hasFile) {
      // Create FormData for file upload
      const formData = new FormData();
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

      // Handle subcategory_id
      if (typeof params.subcategory_id === 'object' && params.subcategory_id?.value) {
        formData.append('subcategory_id', params.subcategory_id.value);
      } else if (params.subcategory_id) {
        formData.append('subcategory_id', params.subcategory_id.toString());
      }

      // Handle unit_id
      if (typeof params.unit_id === 'object' && params.unit_id?.value) {
        formData.append('unit_id', params.unit_id.value);
      } else if (params.unit_id) {
        formData.append('unit_id', params.unit_id.toString());
      }

      // Add all other fields
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

      // Set request headers (companyCode will be added by axios interceptor)
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      // Make API request using fetch (for FormData)
      const response = await fetch(inventoryUrl, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Server error response:", data);
        throw new Error(data.message || "Failed to add inventory");
      }

      message.success("Inventory added successfully");
      return data;
    } else {
      // No file to upload, use axios with JSON
      const subcategory_id = params.subcategory_id?.value || params.subcategory_id;
      const unit_id = params.unit_id?.value || params.unit_id;

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

      // axiosInstance will automatically add companyCode header
      const response = await axiosInstance.post(inventoryUrl, requestBody);

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

    const imageFile = params.values?.imageFile;
    const hasFile = imageFile instanceof File;

    if (hasFile) {
      const formData = new FormData();
      formData.append("thumbnail", imageFile);

      if (tenant) {
        formData.append('tenant', JSON.stringify(tenant));
        if (tenant.tenant_code) {
          formData.append('tenant_code', tenant.tenant_code);
        }
      }

      if (companyCode) {
        formData.append('companyCode', companyCode);
      }

      if (shopId && shopId !== "undefined") {
        formData.append("shop_id", shopId);
      }

      if (typeof params.values.subcategory_id === 'object' && params.values.subcategory_id?.value) {
        formData.append('subcategory_id', params.values.subcategory_id.value);
      } else if (params.values.subcategory_id) {
        formData.append('subcategory_id', params.values.subcategory_id.toString());
      }

      if (typeof params.values.unit_id === 'object' && params.values.unit_id?.value) {
        formData.append('unit_id', params.values.unit_id.value);
      } else if (params.values.unit_id) {
        formData.append('unit_id', params.values.unit_id.toString());
      }

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

      const token = localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user")).Token
        : '';

      const headers = {
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch(`${inventoryUrl}/${params._id}`, {
        method: 'PUT',
        headers: headers,
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Server error response:", data);
        throw new Error(data.message || "Failed to update inventory");
      }

      message.success("Inventory updated successfully");
      return data;
    } else {
      const subcategory_id = params.values.subcategory_id?.value || params.values.subcategory_id;
      const unit_id = params.values.unit_id?.value || params.values.unit_id;

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

      const response = await axiosInstance.put(`${inventoryUrl}/${params._id}`, requestBody);

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
    const tenant = getTenant();
    const response = await axiosInstance.delete(`${inventoryUrl}/${inventoryId}`, {
      data: { tenant }
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

export const fetchInventoryById = async (inventoryId: string) => {
  try {
    const response = await axiosInstance.get(`${inventoryUrl}/${inventoryId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching inventory by ID:", error);
    throw new Error("Failed to fetch inventory item");
  }
};

export const fetchInventoryUsageByDateRange = async (startDate: string, endDate: string, shopId?: string) => {
  try {
    const params: any = { startDate, endDate };
    if (shopId && shopId !== 'undefined') {
      params.shop_id = shopId;
    }

    const response = await axiosInstance.get(`${inventoryUrl}/date-range-inventory-usage-items/items`, {
      params
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching inventory usage:", error);
    throw new Error("Failed to fetch inventory usage");
  }
};

// ==================== MATERIAL TRANSFER METHODS ====================

/**
 * Create a new material transfer between shops
 */
export const createTransfer = async (params: CreateTransferParams) => {
  try {
    const response = await axiosInstance.post(`${transferUrl}`, params);

    message.success("Transfer created successfully");
    return response.data;
  } catch (error) {
    console.error("Error creating transfer:", error);
    const errorMessage = error?.response?.data?.error || "Failed to create transfer";
    message.error(errorMessage);
    throw error;
  }
};

/**
 * Get all transfers with optional filters
 */
export const fetchAllTransfers = async (filters?: TransferFilters) => {
  try {
    console.log("Fetching transfers with filters:", filters);
    const response = await axiosInstance.get(`${transferUrl}`, {
      params: filters
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching transfers:", error);
    console.error("Error response:", error?.response?.data);
    throw new Error("Failed to fetch transfers");
  }
};

/**
 * Get a specific transfer by ID
 */
export const fetchTransferById = async (transferId: string) => {
  try {
    const response = await axiosInstance.get(`${transferUrl}/${transferId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching transfer:", error);
    throw new Error("Failed to fetch transfer details");
  }
};

/**
 * Get pending transfers for a shop (incoming)
 */
export const fetchPendingTransfers = async (shopId: string) => {
  try {
    const response = await axiosInstance.get(`${transferUrl}/pending/list`, {
      params: { shop_id: shopId }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching pending transfers:", error);
    throw new Error("Failed to fetch pending transfers");
  }
};

/**
 * Get transfer statistics for a shop
 */
export const fetchTransferStats = async (shopId: string) => {
  try {
    const response = await axiosInstance.get(`${transferUrl}/stats/summary`, {
      params: { shop_id: shopId }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching transfer stats:", error);
    throw new Error("Failed to fetch transfer statistics");
  }
};

/**
 * Approve a pending transfer
 */
export const approveTransfer = async (transferId: string, params?: ApproveTransferParams) => {
  try {
    const response = await axiosInstance.post(
      `${transferUrl}/${transferId}/approve`,
      params || {}
    );

    message.success("Transfer approved successfully");
    return response.data;
  } catch (error) {
    console.error("Error approving transfer:", error);
    const errorMessage = error?.response?.data?.error || "Failed to approve transfer";
    message.error(errorMessage);
    throw error;
  }
};

/**
 * Complete an in-transit transfer
 */
export const completeTransfer = async (transferId: string, params?: CompleteTransferParams) => {
  try {
    const response = await axiosInstance.post(
      `${transferUrl}/${transferId}/complete`,
      params || {}
    );

    message.success("Transfer completed successfully");
    return response.data;
  } catch (error) {
    console.error("Error completing transfer:", error);
    const errorMessage = error?.response?.data?.error || "Failed to complete transfer";
    message.error(errorMessage);
    throw error;
  }
};

/**
 * Reject a transfer
 */
export const rejectTransfer = async (transferId: string, params: RejectTransferParams) => {
  try {
    const response = await axiosInstance.post(
      `${transferUrl}/${transferId}/reject`,
      params
    );

    message.success("Transfer rejected successfully");
    return response.data;
  } catch (error) {
    console.error("Error rejecting transfer:", error);
    const errorMessage = error?.response?.data?.error || "Failed to reject transfer";
    message.error(errorMessage);
    throw error;
  }
};

/**
 * Cancel a pending transfer
 */
export const cancelTransfer = async (transferId: string) => {
  try {
    const response = await axiosInstance.post(
      `${transferUrl}/${transferId}/cancel`,
      {}
    );

    message.success("Transfer cancelled successfully");
    return response.data;
  } catch (error) {
    console.error("Error cancelling transfer:", error);
    const errorMessage = error?.response?.data?.error || "Failed to cancel transfer";
    message.error(errorMessage);
    throw error;
  }
};

/**
 * Get transfers by direction (incoming/outgoing)
 */
export const fetchTransfersByDirection = async (
  shopId: string,
  direction: 'incoming' | 'outgoing' | 'both',
  status?: string
) => {
  try {
    const filters: TransferFilters = {
      shop_id: shopId,
      direction,
    };

    if (status) {
      filters.status = status as any;
    }

    return await fetchAllTransfers(filters);
  } catch (error) {
    console.error("Error fetching transfers by direction:", error);
    throw error;
  }
};

/**
 * Get transfers by status
 */
export const fetchTransfersByStatus = async (
  shopId: string,
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled' | 'rejected'
) => {
  try {
    const filters: TransferFilters = {
      shop_id: shopId,
      status,
    };

    return await fetchAllTransfers(filters);
  } catch (error) {
    console.error("Error fetching transfers by status:", error);
    throw error;
  }
};

/**
 * Get transfers within a date range
 */
export const fetchTransfersByDateRange = async (
  shopId: string,
  startDate: string,
  endDate: string
) => {
  try {
    const filters: TransferFilters = {
      shop_id: shopId,
      startDate,
      endDate,
    };

    return await fetchAllTransfers(filters);
  } catch (error) {
    console.error("Error fetching transfers by date range:", error);
    throw error;
  }
};