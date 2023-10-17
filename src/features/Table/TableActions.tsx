import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const baseUrl = "http://localhost:3000/tables";

// Define the types for your supplier data
interface table {
  _id: string;
  name: string;
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
      const response = await axios.get(`${baseUrl}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to create a new supplier
export const createTable = createAsyncThunk(
  "table/createTable",
  async (newTable: table, { rejectWithValue }) => {
    const token = getToken(); // Get the token
    try {
      const response = await axios.post(`${baseUrl}`, newTable, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
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
      const response = await axios.put(
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
      const response = await axios.delete(`${baseUrl}/${tableId}`, {
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
      const response = await axios.get(`${baseUrl}/${tableId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);