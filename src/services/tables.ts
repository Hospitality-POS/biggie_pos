import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "./request";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import { fetchSystemSetupDetailsById } from "./systemsetup";

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
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const currentUser = user._id || user.id;
    // Check both user.role (string) and user.roleData.role_type (nested object)
    const userRole = (typeof user.role === 'string' ? user.role : user.roleData?.role_type)?.toLowerCase();

    console.log('🔍 Full user object:', user);
    console.log('🔍 User ID:', currentUser);
    console.log('🔍 User role:', userRole);

    const params: any = { name: data.name, locatedAt: data.locatedAt };

    // Apply role-based privacy: waiters only see tables they served + empty tables
    if (userRole === "waiter" && currentUser) {
      params.privacy_filter = "waiter";
      params.current_user_id = currentUser;
      console.log('🔍 Privacy Filter: Applying waiter filter for user', currentUser, 'role:', userRole);
    } else {
      console.log('🔍 Privacy Filter: No filter applied. User role:', userRole, 'User ID:', currentUser);
    }

    const response = await axiosInstance.get(tableUrl, { params });
    let tables = response.data;
    console.log('🔍 Tables API response:', tables);

    // Apply privacy locking for waiters - lock tables where cart was created by others
    let enablePrivacy = false;
    try {
      const systemSettings = await fetchSystemSetupDetailsById();
      enablePrivacy = systemSettings?.enable_privacy || false;
      console.log('🔍 enable_privacy from API:', enablePrivacy);
    } catch (err) {
      console.log('🔍 Failed to fetch enable_privacy, defaulting to false');
    }

    // If privacy is enabled and user is waiter, lock tables where served_by is not current user
    if (enablePrivacy && userRole === "waiter" && currentUser) {
      tables = tables.map((table: any) => {
        const servedByCurrentUser = table.served_by === currentUser || table.served_by === user.name;
        const isEmpty = !table.isOccupied && table.status !== 'occupied';
        // Lock if not served by current user AND not empty
        const isLocked = !servedByCurrentUser && !isEmpty;
        console.log(`🔍 Table ${table.name}: served_by=${table.served_by}, isOccupied=${table.isOccupied}, isLocked=${isLocked}`);
        return { ...table, isLocked };
      });
      console.log('🔍 Applied privacy locking, locked tables:', tables.filter((t: any) => t.isLocked).length);
      console.log('🔍 Final tables with isLocked flags:', tables.map((t: any) => ({ name: t.name, isLocked: t.isLocked })));
    }

    return tables;
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
    let tables = response.data;

    // Apply privacy locking for waiters - lock tables where cart was created by others
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const currentUser = user._id || user.id;
    const userRole = (typeof user.role === 'string' ? user.role : user.roleData?.role_type)?.toLowerCase();

    let enablePrivacy = false;
    try {
      const systemSettings = await fetchSystemSetupDetailsById();
      enablePrivacy = systemSettings?.enable_privacy || false;
    } catch (err) {
      console.log('🔍 Failed to fetch enable_privacy in fetchTableUsequery');
    }

    // If privacy is enabled and user is waiter, lock tables where served_by is not current user
    if (enablePrivacy && userRole === "waiter" && currentUser) {
      tables = tables.map((table: any) => {
        const servedByCurrentUser = table.served_by === currentUser || table.served_by === user.name;
        // If served_by is undefined, treat as not served by current user (lock as safety)
        const isServedByCurrentUser = table.served_by ? servedByCurrentUser : false;
        const isEmpty = !table.isOccupied && table.status !== 'occupied';
        // Lock if not served by current user AND not empty
        const isLocked = !isServedByCurrentUser && !isEmpty;
        console.log(`🔍 [fetchTableUsequery] Table ${table.name}: served_by=${table.served_by}, isOccupied=${table.isOccupied}, isLocked=${isLocked}`);
        return { ...table, isLocked };
      });
      console.log('🔍 [fetchTableUsequery] Applied privacy locking, locked tables:', tables.filter((t: any) => t.isLocked).length);
    }

    return tables;
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
    // message.success("Successfully edited location");
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
    // message.success("Successfully added new location");
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
    // message.success("Successfully added new Table");
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
    // message.success("Successfully updated Table");
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