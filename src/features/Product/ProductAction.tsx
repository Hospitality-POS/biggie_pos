import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const baseUrl = "http://localhost:3000/product/products";

interface Product {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  desc: string;
  min_viable_quantity: number;
  image: string;
  category: string;
}

export const createProduct = createAsyncThunk(
  "product/createProduct",
  async (product: Product, { rejectWithValue, dispatch}) => {
    try {
       
      const user = JSON.parse(localStorage.getItem("user") || "{}");
    const accessToken = user.Token;

      const headers = {
        Authorization: `Bearer ${accessToken}`,
         "Content-Type": "multipart/form-data",

      };
      const response = await axios.post(`${baseUrl}`, product,{headers});
      dispatch(fetchProducts())
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
      const response = await axios.get(baseUrl);
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
      const user = JSON.parse(localStorage.getItem("user") || "{}");
    const accessToken = user.Token;

      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };
      const response = await axios.put(`${baseUrl}/${product._id}`, product, {headers});
      dispatch(fetchProducts())
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
      const response = await axios.get(`${baseUrl}/category/${category}`);
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

      await axios.delete(`${baseUrl}/${productId}`, { headers });
      return productId;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);
