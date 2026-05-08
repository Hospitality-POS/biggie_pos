import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

const inventoryUrl = `${BASE_URL}/product-inventory`;
const transferUrl = `${BASE_URL}/transfers`;

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

interface TransferItem {
  from_product_id: string;
  to_product_id: string;
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

interface AutoCreated {
  units?: string[];
  main_categories?: string[];
  categories?: string[];
  subcategories?: string[];
  suppliers?: string[];
}

interface ImportInventoryResult {
  message: string;
  summary: {
    total: number;
    created: number;
    skipped: number;
    errors: number;
    auto_created?: AutoCreated;
    format_detected?: {
      sheet: string;
      header_row: number;
      mapped_columns: number;
    };
  };
  errors: Array<{ row: number | string; name: string; reason: string }>;
}

interface AnalyseInventoryResult {
  canImport: boolean;
  sheetUsed: string;
  headerRowDetectedAt: number;
  totalDataRows: number;
  mappedColumns: string[];
  unmappedColumns: string[];
  missingRequired: string[];
  missingRecommended: string[];
  columnMapping: Record<string, string>;
  advice: Array<{ level: "success" | "warning" | "error" | "info"; message: string }>;
  previewRows: Array<{
    rowNum: number;
    name: string;
    quantity: string;
    unit: string;
    usage_type: string;
    price: string;
    category: string;
    supplier: string;
    barcode: string;
  }>;
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

// ── TEMPLATE DOWNLOAD ─────────────────────────────────────────────────────────
export const downloadInventoryTemplate = async (): Promise<void> => {
  try {
    const response = await axiosInstance.get(`${inventoryUrl}/template`, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory_import_template.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    message.success("Template downloaded successfully");
  } catch (error) {
    console.error("Error downloading inventory template:", error);
    message.error("Failed to download template");
    throw new Error("Failed to download inventory template");
  }
};

// ── ANALYSE FILE (preview before import — does NOT import anything) ────────────
export const analyseInventoryFile = async (file: File): Promise<AnalyseInventoryResult> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post<AnalyseInventoryResult>(
      `${inventoryUrl}/analyse-import`,
      formData,
      { headers: { "Content-Type": undefined } }
    );

    return response.data;
  } catch (error: any) {
    console.error("Error analysing inventory file:", error);
    const errMsg =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      "Failed to analyse file. Please check the file format and try again.";
    if (error?.response?.status !== 403) message.error(errMsg);
    throw error;
  }
};

// ── EXCEL IMPORT ──────────────────────────────────────────────────────────────
export const importInventoryFromExcel = async (
  file: File,
  shopId: string
): Promise<ImportInventoryResult> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("shop_id", shopId);

    const response = await axiosInstance.post<ImportInventoryResult>(
      `${inventoryUrl}/import`,
      formData,
      { headers: { "Content-Type": undefined } }
    );

    const data = response.data;

    if (data.summary.created > 0) {
      const ac = data.summary.auto_created;
      const totalAC = ac
        ? Object.values(ac).reduce((s, arr) => s + (arr?.length ?? 0), 0)
        : 0;
      const autoNote = totalAC > 0 ? ` (${totalAC} supporting record(s) auto-created)` : "";
      message.success(
        `Import complete — ${data.summary.created} item(s) created` +
        (data.summary.skipped > 0 ? `, ${data.summary.skipped} skipped` : "") +
        autoNote
      );
    } else if (data.summary.errors > 0) {
      const firstErr = data.errors?.[0];
      message.warning(
        firstErr
          ? `Import issue: ${firstErr.reason}`
          : "No items were imported — check the error details below."
      );
    } else {
      message.warning("No items were imported. Check the error details.");
    }

    return data;
  } catch (error: any) {
    console.error("Error importing inventory from Excel:", error);
    const errMsg =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      "Failed to import inventory. Please try again.";
    if (error?.response?.status !== 403) message.error(errMsg);
    throw error;
  }
};

// ── FETCH ALL ─────────────────────────────────────────────────────────────────
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
      const formData = new FormData();
      formData.append("thumbnail", imageFile);

      if (tenant) {
        formData.append('tenant', JSON.stringify(tenant));
        if (tenant.tenant_code) formData.append('tenant_code', tenant.tenant_code);
      }
      if (companyCode) {
        formData.append('companyCode', companyCode);
        formData.append('tenant_code', companyCode);
      }
      if (shopId && shopId !== "undefined") formData.append("shop_id", shopId);

      if (typeof params.subcategory_id === 'object' && params.subcategory_id?.value) {
        formData.append('subcategory_id', params.subcategory_id.value);
      } else if (params.subcategory_id) {
        formData.append('subcategory_id', params.subcategory_id.toString());
      }

      if (typeof params.unit_id === 'object' && params.unit_id?.value) {
        formData.append('unit_id', params.unit_id.value);
      } else if (params.unit_id) {
        formData.append('unit_id', params.unit_id.toString());
      }

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

      const token = localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user")).Token
        : '';

      const response = await fetch(inventoryUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to add inventory");

      message.success("Inventory added successfully");
      return data;
    } else {
      const subcategory_id = params.subcategory_id?.value || params.subcategory_id;
      const unit_id = params.unit_id?.value || params.unit_id;
      const { imageFile: _, ...cleanParams } = params;

      const response = await axiosInstance.post(inventoryUrl, {
        ...cleanParams,
        subcategory_id,
        unit_id,
        tenant,
        companyCode,
        tenant_code: companyCode || (tenant ? tenant.tenant_code : null),
        shop_id: shopId
      });

      message.success("Inventory added successfully");
      return response.data;
    }
  } catch (error) {
    console.error("Error adding inventory:", error);
    if (error?.response?.status !== 403) message.error("Error adding inventory, Please try again");
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
        if (tenant.tenant_code) formData.append('tenant_code', tenant.tenant_code);
      }
      if (companyCode) formData.append('companyCode', companyCode);
      if (shopId && shopId !== "undefined") formData.append("shop_id", shopId);

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

      const response = await fetch(`${inventoryUrl}/${params._id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update inventory");

      // message.success("Inventory updated successfully");
      return data;
    } else {
      const subcategory_id = params.values.subcategory_id?.value || params.values.subcategory_id;
      const unit_id = params.values.unit_id?.value || params.values.unit_id;
      const { imageFile: _, ...cleanValues } = params.values;

      const response = await axiosInstance.put(`${inventoryUrl}/${params._id}`, {
        ...cleanValues,
        subcategory_id,
        unit_id,
        tenant,
        companyCode,
        tenant_code: companyCode || (tenant ? tenant.tenant_code : null),
        shop_id: shopId
      });

      // message.success("Inventory updated successfully");
      return response.data;
    }
  } catch (error) {
    console.error("Error updating inventory:", error);
    if (error?.response?.status !== 403) message.error("Error updating inventory");
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
    if (error?.response?.status !== 403) message.error("Error deleting inventory");
    throw new Error("Failed to delete inventory");
  }
};

// ── DELETE MULTIPLE ───────────────────────────────────────────────────────────
export const deleteMultipleInventory = async (ids: string[]): Promise<{ deleted: number; failed: number }> => {
  try {
    const response = await axiosInstance.delete(`${inventoryUrl}/bulk/delete`, {
      data: { ids },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting multiple inventory items:", error);
    if (error?.response?.status !== 403) message.error("Failed to delete selected items");
    throw error;
  }
};

// ── DELETE ALL ────────────────────────────────────────────────────────────────
export const deleteAllInventory = async (shopId: string): Promise<{ deleted: number }> => {
  try {
    const response = await axiosInstance.delete(`${inventoryUrl}/bulk/delete-all`, {
      data: { shop_id: shopId },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting all inventory:", error);
    if (error?.response?.status !== 403) message.error("Failed to delete all inventory items");
    throw error;
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
    if (shopId && shopId !== 'undefined') params.shop_id = shopId;
    const response = await axiosInstance.get(`${inventoryUrl}/date-range-inventory-usage-items/items`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching inventory usage:", error);
    throw new Error("Failed to fetch inventory usage");
  }
};

export const createTransfer = async (params: CreateTransferParams) => {
  try {
    const response = await axiosInstance.post(`${transferUrl}`, params);
    return response.data;
  } catch (error) {
    console.error("Error creating transfer:", error);
    const errorMessage = error?.response?.data?.error || "Failed to create transfer";
    message.error(errorMessage);
    throw error;
  }
};

export const fetchAllTransfers = async (filters?: TransferFilters) => {
  try {
    const response = await axiosInstance.get(`${transferUrl}`, { params: filters });
    return response.data;
  } catch (error) {
    console.error("Error fetching transfers:", error);
    throw new Error("Failed to fetch transfers");
  }
};

export const fetchTransferById = async (transferId: string) => {
  try {
    const response = await axiosInstance.get(`${transferUrl}/${transferId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching transfer:", error);
    throw new Error("Failed to fetch transfer details");
  }
};

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

export const approveTransfer = async (transferId: string, params?: ApproveTransferParams) => {
  try {
    const response = await axiosInstance.post(`${transferUrl}/${transferId}/approve`, params || {});
    return response.data;
  } catch (error) {
    console.error("Error approving transfer:", error);
    const errorMessage = error?.response?.data?.error || "Failed to approve transfer";
    message.error(errorMessage);
    throw error;
  }
};

export const completeTransfer = async (transferId: string, params?: CompleteTransferParams) => {
  try {
    const response = await axiosInstance.post(`${transferUrl}/${transferId}/complete`, params || {});
    return response.data;
  } catch (error) {
    console.error("Error completing transfer:", error);
    const errorMessage = error?.response?.data?.error || "Failed to complete transfer";
    message.error(errorMessage);
    throw error;
  }
};

export const rejectTransfer = async (transferId: string, params: RejectTransferParams) => {
  try {
    const response = await axiosInstance.post(`${transferUrl}/${transferId}/reject`, params);
    message.success("Transfer rejected successfully");
    return response.data;
  } catch (error) {
    console.error("Error rejecting transfer:", error);
    const errorMessage = error?.response?.data?.error || "Failed to reject transfer";
    message.error(errorMessage);
    throw error;
  }
};

export const cancelTransfer = async (transferId: string) => {
  try {
    const response = await axiosInstance.post(`${transferUrl}/${transferId}/cancel`, {});
    message.success("Transfer cancelled successfully");
    return response.data;
  } catch (error) {
    console.error("Error cancelling transfer:", error);
    const errorMessage = error?.response?.data?.error || "Failed to cancel transfer";
    message.error(errorMessage);
    throw error;
  }
};

export const fetchTransfersByDirection = async (
  shopId: string,
  direction: 'incoming' | 'outgoing' | 'both',
  status?: string
) => {
  try {
    const filters: TransferFilters = { shop_id: shopId, direction };
    if (status) filters.status = status as any;
    return await fetchAllTransfers(filters);
  } catch (error) {
    console.error("Error fetching transfers by direction:", error);
    throw error;
  }
};

export const fetchTransfersByStatus = async (
  shopId: string,
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled' | 'rejected'
) => {
  try {
    return await fetchAllTransfers({ shop_id: shopId, status });
  } catch (error) {
    console.error("Error fetching transfers by status:", error);
    throw error;
  }
};

export const fetchTransfersByDateRange = async (
  shopId: string,
  startDate: string,
  endDate: string
) => {
  try {
    return await fetchAllTransfers({ shop_id: shopId, startDate, endDate });
  } catch (error) {
    console.error("Error fetching transfers by date range:", error);
    throw error;
  }
};

// ── TOP SELLERS REPORT ─────────────────────────────────────────────────────────
export const fetchTopSellersReport = async (filters: {
  shop_id: string;
  start_date?: string;
  end_date?: string;
  category?: string;
  sort_by?: string;
  limit?: number;
}) => {
  try {
    
    // Filter out empty parameters
    const cleanParams = Object.keys(filters).reduce((acc, key) => {
      const value = filters[key];
      if (value !== '' && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    
    const response = await axiosInstance.get(`${BASE_URL}/inventory/top-sellers`, { params: cleanParams });
    return response.data;
  } catch (error) {
    console.error("Error fetching top sellers report:", error);
    throw new Error("Failed to fetch top sellers report");
  }
};

export const fetchInventoryCategories = async (shopId: string) => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/inventory/categories`, { params: { shop_id: shopId } });
    return response.data;
  } catch (error) {
    console.error("Error fetching inventory categories:", error);
    throw new Error("Failed to fetch inventory categories");
  }
};