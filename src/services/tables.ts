import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "./request";
import { BASE_URL } from "@utils/config";
import { message } from "antd";

const tableUrl = `${BASE_URL}/tables`;

// ── Helper: check if POS is in restaurant mode ───────────────────────────────
// The single source of truth is localStorage key "posMode" set by POSModeContext.
// restaurant → physical tables, no auto-slot creation
// retail     → slots are auto-created as needed
const isRestaurantMode = (): boolean => {
  try {
    return (localStorage.getItem("posMode") ?? "restaurant") === "restaurant";
  } catch {
    return true; // default safe — don't auto-create if we can't read
  }
};

export const getAllTables = async (data: ParamsType) => {
  try {
    // Check if user is authenticated before making API call
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (!token || !user) {
      console.warn("User not authenticated - skipping tables API call");
      return [];
    }

    const response = await axiosInstance.get(tableUrl, {
      params: { name: data.name, locatedAt: data.locatedAt },
    });
    return response.data;
  } catch (error) {
    throw new Error("Error fetching tables");
  }
};

export const getTableLocation = async (data: ParamsType) => {
  try {
    const url = `${tableUrl}/location/locations`;
    const response = await axiosInstance.get(url, { params: { name: data.name } });
    return response.data;
  } catch (error) {
    throw new Error("Error fetching table location");
  }
};

export const fetchTableUsequery = async (params: any) => {
  try {
    const response = await axiosInstance.get(
      `${tableUrl}/tables/unique-locatedAt`,
      { params: { locationId: params.id } }
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Error fetching table");
  }
};

export const editLocation = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.put(`${tableUrl}/locations/${data._id}`, {
      locationName: data?.values?.name,
    });
    message.success("Successfully edited location");
    return response.data;
  } catch (error: any) {
    if (error?.response?.status != 403) {
      message.error("Error editing location");
    }
    throw new Error("Error editing location");
  }
};

export const createAutoSlot = async () => {
  // ── Guard: restaurant mode uses physical tables, not auto-generated slots ──
  if (isRestaurantMode()) {
    console.info("[createAutoSlot] Skipped — tenant is in restaurant/table mode.");
    return null;
  }

  try {
    const response = await axiosInstance.post(`${tableUrl}/auto-slot`, {});
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 403) {
      message.error("Error creating new slot");
    }
    throw new Error("Error creating auto slot");
  }
};

export const addNewTableLocation = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.post(`${tableUrl}/locations`, {
      locationName: data?.name,
    });
    message.success("Successfully added new location");
    return response.data;
  } catch (error: any) {
    if (error?.response?.status != 403) {
      message.error("Error adding new location");
    }
    throw new Error("Error adding new location");
  }
};

export const delLocation = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.delete(`${tableUrl}/locations/${data}`);
    console.log(data);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status != 403) {
      message.error("Error deleting location");
    }
    throw new Error("Error deleting location");
  }
};

export const transferCartitems = async (data: ParamsType) => {
  try {
    const transferUrl = `${BASE_URL}/cart`;
    const response = await axiosInstance.post(`${transferUrl}/transfer-cart-items`, {
      products: data?.products,
      table: data.table?.value,
    });
    return response.data;
  } catch (error: any) {
    if (error?.response?.status != 403) {
      message.error("Failed to transfer product");
    }
    throw new Error("Error transfering product");
  }
};

export const addNewTable = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.post(tableUrl, {
      name: data?.name,
      locatedAt: data?.locatedAt,
    });
    message.success("Successfully added new Table");
    return response.data;
  } catch (error: any) {
    if (error?.response?.status != 403) {
      message.error("Error adding new Table");
    }
    throw new Error("Error adding new table");
  }
};

export const updateTable = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.put(`${tableUrl}/${data._id}`, {
      name: data?.values?.name,
      locatedAt: data?.values?.locatedAt?._id,
    });
    message.success("Successfully updated Table");
    return response.data;
  } catch (error: any) {
    if (error?.response?.status != 403) {
      message.error("Error updating Table");
    }
    throw new Error("Error updating table");
  }
};

export const deleteTable = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.delete(`${tableUrl}/${data}`);
    return response.data;
  } catch (error: any) {
    throw new Error("Error deleting table");
  }
};