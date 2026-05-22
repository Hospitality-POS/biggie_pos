import { createAsyncThunk } from "@reduxjs/toolkit";
import { BASE_URL } from "@utils/config";
import { AxiosResponse } from "axios";
import axiosInstance from "../../services/request";
import { fetchSystemSetupDetailsById } from "../../services/systemsetup";

const baseUrl = `${BASE_URL}/tables`;

// Define the types for your supplier data
interface Location {
  locationName: string;
  _id: string;
  name: string;
}
interface table extends Location {
  locatedAt: string;
}
// Function to get the token from localStorage
const getToken = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user ? user.Token : null;
};

// Create an async thunk to fetch all suppliers
export const fetchTables = createAsyncThunk(
  "table/fetchTables",
  async (_, { rejectWithValue }) => {
    try {
      const response: AxiosResponse<unknown, unknown> = await axiosInstance.get(`${baseUrl}`)
      let tables: any = response.data;

      // Apply privacy locking for waiters - lock tables where cart was created by others
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const currentUser = user._id || user.id;
      const userRole = (typeof user.role === 'string' ? user.role : user.roleData?.role_type)?.toLowerCase();

      let enablePrivacy = false;
      try {
        const systemSettings = await fetchSystemSetupDetailsById();
        enablePrivacy = systemSettings?.enable_privacy || false;
      } catch (err) {
        console.log('🔍 [fetchTables] Failed to fetch enable_privacy');
      }

      // If privacy is enabled and user is waiter, lock tables where served_by is not current user
      if (enablePrivacy && userRole === "waiter" && currentUser) {
        tables = tables.map((table: any) => {
          const servedByCurrentUser = table.served_by === currentUser || table.served_by === user.name;
          const isEmpty = !table.isOccupied && table.status !== 'occupied';
          // Lock if not served by current user AND not empty
          const isLocked = !servedByCurrentUser && !isEmpty;
          console.log(`🔍 [fetchTables] Table ${table.name}: served_by=${table.served_by}, isOccupied=${table.isOccupied}, isLocked=${isLocked}`);
          return { ...table, isLocked };
        });
        console.log('🔍 [fetchTables] Applied privacy locking, locked tables:', tables.filter((t: any) => t.isLocked).length);
      }

      return tables;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to create a new supplier
export const createTable = createAsyncThunk(
  "table/createTable",
  async (newTable: table, { rejectWithValue, dispatch }) => {
    const token = getToken(); // Get the token
    try {
      const response = await axiosInstance.post(`${baseUrl}`, newTable, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      dispatch(fetchTables())
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to update an existing supplier
export const updateTable = createAsyncThunk(
  "table/updateTable",
  async (updatedTable: table, { rejectWithValue }) => {
    const token = getToken(); // Get the token
    try {
      const response: AxiosResponse<unknown, unknown> = await axiosInstance.put(
        `${baseUrl}/${updatedTable._id}`,
        updatedTable,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to delete a supplier
export const deleteTable = createAsyncThunk(
  "table/deleteTable",
  async (tableId: string, { rejectWithValue, dispatch }) => {
    const token = getToken(); // Get the token
    try {
      const response: AxiosResponse<unknown, unknown> = await axiosInstance.delete(`${baseUrl}/${tableId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      dispatch(fetchTables())
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to fetch a table by ID
export const fetchTableById = createAsyncThunk(
  "table/fetchTableById",
  async (tableId: string, { rejectWithValue }) => {
    try {
      const response: AxiosResponse<unknown, unknown> = await axiosInstance.get(`${baseUrl}/${tableId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);


// Create an async thunk to fetch a table by ID
export const fetchTableByLocatedAt = createAsyncThunk(
  "table/fetchTableByLocatedAt",
  async (locatedAt: string, { rejectWithValue }) => {
    try {
      const response: AxiosResponse<unknown, unknown> = await axiosInstance.get(`${baseUrl}/locatedAt/${locatedAt}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);


// Create an async thunk to create a new location
export const createLocation = createAsyncThunk(
  "table/createLocation",
  async (newLocation: Location, { rejectWithValue }) => {
    try {
      const response: AxiosResponse<unknown, unknown> = await axiosInstance.post(`${baseUrl}/locations`, { "locationName": newLocation });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);


// Create an async thunk to edit an existing location
export const editLocation = createAsyncThunk(
  "table/editLocation",
  async (editedLocation: Location, { rejectWithValue }) => {
    try {
      const response: AxiosResponse<unknown, unknown> = await axiosInstance.put(
        `${baseUrl}/locations/${editedLocation._id}`,
        { "locationName": editedLocation.locationName }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to delete a location
export const deleteLocation = createAsyncThunk(
  "table/deleteLocation",
  async (locationId: string, { rejectWithValue }) => {
    try {
      const response: AxiosResponse<unknown, unknown> = await axiosInstance.delete(`${baseUrl}/locations/${locationId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);
