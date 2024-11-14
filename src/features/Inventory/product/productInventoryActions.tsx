import { createAsyncThunk } from "@reduxjs/toolkit";
import { BASE_URL } from "@utils/config";
import { Modal } from "antd/lib";
import axiosInstance from "../../../services/request";

const baseUrl = `${BASE_URL}/product-inventory`;

interface ProductInventory {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  desc: string;
  category_id: string;
  min_viable_quantity: number;
}
interface InventoryData {
  name: string;
  quantity: number;
  price: number;
  desc: string;
  category_id: string;
  min_viable_quantity: number;
}

// Action to create product inventory
export const createProductInventory = createAsyncThunk(
  "productInventory/createProductInventory",
  async (inventoryData: InventoryData, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(baseUrl, inventoryData);
      dispatch(fetchAllProductInventories());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Action to fetch all product inventories
export const fetchAllProductInventories = createAsyncThunk(
  "productInventory/fetchAllProductInventories",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(baseUrl);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);
// Action to fetch product inventory by ID
export const getProductInventory = createAsyncThunk(
  "productInventory/getProductInventory",
  async (inventoryId: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`${baseUrl}/${inventoryId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Action to update product inventory
export const updateProductInventory = createAsyncThunk(
  "productInventory/updateProductInventory",
  async (inventoryData: ProductInventory, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.put(
        `${baseUrl}/${inventoryData._id}`,
        inventoryData
      );
      dispatch(fetchAllProductInventories());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Action to delete product inventory
export const deleteProductInventory = createAsyncThunk(
  "productInventory/deleteProductInventory",
  async (inventoryId: string, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`${baseUrl}/${inventoryId}`);

      return inventoryId;
    } catch (error) {
      // console.log(error);

      Modal.warning({
        title: "Error",
        content: "Failed to delete the product inventory",
      });
      return rejectWithValue(error.message || error.toString());
    }
  }
);
