import { ParamsType } from "@ant-design/pro-components";
import axiosInstance from "./request";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import { fetchSystemSetupDetailsById } from "./systemsetup";
import { fetchShop } from "./shops";

const tableUrl = `${BASE_URL}/tables`;

// A table counts as "served by someone else" only when the served_by marker is
// set and none of its entries match the current user. List endpoints return
// served_by as a username string ("mike" / "mike (+2)") while the single-table
// endpoint returns raw user ObjectIds — handle both shapes.
const isServedByOtherStaff = (
  table: any,
  currentUserId: string,
  userName: string
): boolean => {
  const servedBy = table?.served_by;
  if (
    servedBy === null ||
    servedBy === undefined ||
    servedBy === "" ||
    (Array.isArray(servedBy) && servedBy.length === 0)
  ) {
    return false;
  }
  const entries = Array.isArray(servedBy) ? servedBy : [servedBy];
  const me = String(currentUserId ?? "");
  const myName = String(userName ?? "").trim().toLowerCase();
  return !entries.some((entry: any) => {
    const entryId = String(entry?._id ?? entry ?? "");
    const entryName = String(entry?.username ?? entry ?? "")
      .split(" (")[0]
      .trim()
      .toLowerCase();
    return (me && entryId === me) || (myName && entryName === myName);
  });
};

// "Being served" requires the open cart to hold real value — an empty cart or
// a stale served_by on an unoccupied table must stay visible to everyone.
const isHiddenServedTable = (
  table: any,
  currentUserId: string,
  userName: string
): boolean =>
  isServedByOtherStaff(table, currentUserId, userName) &&
  (table?.cart_amount ?? 0) > 0;

// Shop-level flag: when on, waiters see only tables they serve (admin/cashier
// unaffected). Fail-open on any fetch error.
const fetchHideTablesServedByOthers = async (): Promise<boolean> => {
  try {
    const shopId = localStorage.getItem("shopId");
    if (!shopId) return false;
    const shopData = await fetchShop(shopId);
    return !!shopData?.hide_tables_served_by_others;
  } catch {
    return false;
  }
};

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
    let hideServedByOthers = false;
    try {
      const systemSettings = await fetchSystemSetupDetailsById();
      enablePrivacy = systemSettings?.enable_privacy || false;
      console.log('🔍 enable_privacy from API:', enablePrivacy);
    } catch (err) {
      console.log('🔍 Failed to fetch enable_privacy, defaulting to false');
    }
    hideServedByOthers = await fetchHideTablesServedByOthers();

    // Shop flag: hide tables actively served by other staff (waiters only);
    // empty tables and 0-value slots stay visible
    if (hideServedByOthers && userRole === "waiter" && currentUser && Array.isArray(tables)) {
      tables = tables.filter(
        (table: any) => !isHiddenServedTable(table, currentUser, user.name)
      );
    }

    // If privacy is enabled and user is waiter, lock tables where served_by is not current user
    if (enablePrivacy && userRole === "waiter" && currentUser && Array.isArray(tables)) {
      tables = tables.map((table: any) => {
        if (table.cart_amount === 0) {
          return { ...table, isLocked: false };
        }
        const servedByCurrentUser = table.served_by === currentUser || table.served_by === user.name;
        const isEmpty = !table.isOccupied && table.status !== 'occupied';
        // Lock if not served by current user AND not empty
        const isLocked = !servedByCurrentUser && !isEmpty;
        return { ...table, isLocked };
      });
    }

    return tables;
  } catch (error) {
    console.error("Error fetching tables:", error);
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
      { params: { locationId: params.id, includeDisabled: "true" } }
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
    const hideServedByOthers = await fetchHideTablesServedByOthers();

    // Shop flag: drop tables actively served by other staff (waiters only);
    // empty tables and 0-value slots stay visible
    if (hideServedByOthers && userRole === "waiter" && currentUser && Array.isArray(tables)) {
      tables = tables
        .map((item: any) =>
          item?.tables && Array.isArray(item.tables)
            ? {
                ...item,
                tables: item.tables.filter(
                  (t: any) => !isHiddenServedTable(t, currentUser, user.name)
                ),
              }
            : item
        )
        .filter((item: any) =>
          item?.tables ? true : !isHiddenServedTable(item, currentUser, user.name)
        );
    }

    // Apply privacy locking to individual tables (handling both locations with nested tables and flat table lists)
    if (Array.isArray(tables)) {
      tables = tables.map((item: any) => {
        if (item?.tables && Array.isArray(item.tables)) {
          const mappedTables = item.tables.map((table: any) => {
            if (!enablePrivacy || userRole !== "waiter" || !currentUser) {
              return { ...table, isLocked: false };
            }
            if (table.cart_amount === 0) {
              return { ...table, isLocked: false };
            }
            const servedByCurrentUser = table.served_by === currentUser || table.served_by === user.name;
            const isServedByCurrentUser = table.served_by ? servedByCurrentUser : false;
            const isEmpty = !table.isOccupied && table.status !== 'occupied';
            const isLocked = !isServedByCurrentUser && !isEmpty;
            return { ...table, isLocked };
          });
          return { ...item, tables: mappedTables };
        }

        if (!enablePrivacy || userRole !== "waiter" || !currentUser) {
          return { ...item, isLocked: false };
        }
        if (item.cart_amount === 0) {
          return { ...item, isLocked: false };
        }
        const servedByCurrentUser = item.served_by === currentUser || item.served_by === user.name;
        const isServedByCurrentUser = item.served_by ? servedByCurrentUser : false;
        const isEmpty = !table.isOccupied && table.status !== 'occupied';
        const isLocked = !isServedByCurrentUser && !isEmpty;
        return { ...item, isLocked };
      });
    }

    return tables;
  } catch (error) {
    console.log(error);
    throw new Error("Error fetching table");
  }
};

// Single table record (raw doc — served_by is an array of user ObjectIds)
export const fetchTableById = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${tableUrl}/${id}`);
    return response.data;
  } catch (error) {
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

export const getAllTablesIncludeDisabled = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(tableUrl, {
      params: { name: data.name, locatedAt: data.locatedAt, includeDisabled: "true" },
    });
    return response.data;
  } catch (error) {
    throw new Error("Error fetching tables");
  }
};

export const getTableLocationIncludeDisabled = async (data: ParamsType) => {
  try {
    const url = `${tableUrl}/location/locations`;
    const response = await axiosInstance.get(url, {
      params: { name: data.name, includeDisabled: "true" },
    });
    console.log("🔍 [getTableLocationIncludeDisabled] API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("🔍 [getTableLocationIncludeDisabled] Error:", error);
    throw new Error("Error fetching table locations");
  }
};

export const disableTable = async (id: string) => {
  try {
    const response = await axiosInstance.patch(`${tableUrl}/${id}/disable`);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 403) message.error("Error disabling table");
    throw new Error("Error disabling table");
  }
};

export const enableTable = async (id: string) => {
  try {
    const response = await axiosInstance.patch(`${tableUrl}/${id}/enable`);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 403) message.error("Error enabling table");
    throw new Error("Error enabling table");
  }
};

export const disableLocation = async (id: string) => {
  try {
    const response = await axiosInstance.patch(`${tableUrl}/locations/${id}/disable`);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 403) message.error("Error disabling location");
    throw new Error("Error disabling location");
  }
};

export const enableLocation = async (id: string) => {
  try {
    const response = await axiosInstance.patch(`${tableUrl}/locations/${id}/enable`);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 403) message.error("Error enabling location");
    throw new Error("Error enabling location");
  }
};