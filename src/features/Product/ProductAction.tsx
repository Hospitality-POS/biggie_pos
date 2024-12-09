import { createAsyncThunk } from "@reduxjs/toolkit";
import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";
import { BASE_URL } from "@utils/config";
import axiosInstance from "../../services/request";
import { Product } from "src/interfaces/Product";

const { headers } = SetBearerHeaderToken()

const baseUrl = `${BASE_URL}/product/products`;



export const createProduct = createAsyncThunk(
  "product/createProduct",
  async (product: Product, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(`${baseUrl}`, product);
      dispatch(fetchProducts());
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response.data.error || error.toString());
    }
  }
);

export const fetchProducts = createAsyncThunk(
  "product/fetchProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(baseUrl);
      return response.data.products;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const updateProduct = createAsyncThunk(
  "product/updateProduct",
  async (product: Product, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.put(`${baseUrl}/${product._id}`, product, {
        headers,
      });
      dispatch(fetchProducts());
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const fetchProductsByCategory = createAsyncThunk(
  "product/fetchProductsByCategory",
  async (category: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`${baseUrl}/category/${category}`);
      return response.data.products;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const deleteProduct = createAsyncThunk(
  "product/deleteProduct",
  async (productId: string, { rejectWithValue }) => {
    try {
      const userJSON = localStorage.getItem("user");
      let token = "";

      if (userJSON) {
        const userObject = JSON.parse(userJSON);
        token = userObject.Token;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      await axiosInstance.delete(`${baseUrl}/${productId}`, { headers });
      return productId;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);
