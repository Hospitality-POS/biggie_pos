import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const baseUrl = "http://localhost:3000/categories";

// Define the types for your category data
interface Category {
  _id: string;
  name: string;
  product_count: number;
}

// Create an async thunk to fetch all categories
export const fetchCategories = createAsyncThunk(
  "category/fetchCategories",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(baseUrl);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to create a new category
export const createCategory = createAsyncThunk(
  "category/createCategory",
  async (newCategory: Category, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(baseUrl, newCategory);
      dispatch(fetchCategories())
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to update an existing category
export const updateCategory = createAsyncThunk(
  "category/updateCategory",
  async (updatedCategory: Category, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${baseUrl}/${updatedCategory._id}`,
        updatedCategory
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to delete a category
export const deleteCategory = createAsyncThunk(
  "category/deleteCategory",
  async (categoryId: string, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.delete(`${baseUrl}/${categoryId}`);
      // Optionally, you can dispatch an action to fetch updated categories after deletion.
      dispatch(fetchCategories());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);