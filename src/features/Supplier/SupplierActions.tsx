import { createAsyncThunk } from "@reduxjs/toolkit";
import { BASE_URL } from "@utils/config";
import axios from "axios";

const baseUrl = `${BASE_URL}/suppliers`;

// Define the types for your supplier data
interface Supplier {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

// Function to get the token from localStorage
const getToken = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user ? user.Token : null;
};

// Create an async thunk to fetch all suppliers
export const fetchSuppliers = createAsyncThunk(
  "supplier/fetchSuppliers",
  async (_, { rejectWithValue }) => {
    const token = getToken(); // Get the token
    try {
      const response = await axios.get(`${baseUrl}`, {
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

// Create an async thunk to create a new supplier
export const createSupplier = createAsyncThunk(
  "supplier/createSupplier",
  async (newSupplier: Supplier, { rejectWithValue }) => {
    const token = getToken(); // Get the token
    try {
      const response = await axios.post(`${baseUrl}`, newSupplier, {
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
export const updateSupplier = createAsyncThunk(
  "supplier/updateSupplier",
  async (updatedSupplier: Supplier, { rejectWithValue }) => {
    const token = getToken(); // Get the token
    try {
      const response = await axios.put(
        `${baseUrl}/${updatedSupplier._id}`,
        updatedSupplier,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to delete a supplier
export const deleteSupplier = createAsyncThunk(
  "supplier/deleteSupplier",
  async (supplierId: string, { rejectWithValue, dispatch }) => {
    const token = getToken(); // Get the token
    try {
      const response = await axios.delete(`${baseUrl}/${supplierId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      dispatch(fetchSuppliers())
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);
