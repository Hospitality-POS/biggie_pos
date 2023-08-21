import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { number } from "yup";

const baseUrl = "http://localhost:3000/cart";

interface CartDetails {
  table_id: string;
  created_by: string;
}

interface CartItem {
  _id: any;
  cartId: any;
}
interface updatedCartItems {
  _id: string;
  product_id: string;
  price: number;
  desc: string;
  quantity: number;
}

export const createCart = createAsyncThunk(
  "cart/createCart",
  async (cartDetails: CartDetails, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${baseUrl}/create-cart`, cartDetails);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const getCart = createAsyncThunk(
  "cart/getCart",
  async (cartId: CartItem, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${baseUrl}/cart/${cartId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const fetchCartItems = createAsyncThunk(
  "cart/fetchCartItems",
  async (cartId: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${baseUrl}/cart-items/${cartId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const addItemToCart = createAsyncThunk(
  "cart/addItemToCart",
  async (cartItem: CartItem, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${baseUrl}/add-item-to-cart`,
        cartItem
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const updateCartItems = createAsyncThunk(
  "cart/updateCartItems",
  async (updatedCartItems: any, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.put(
        `${baseUrl}/cart-item/${updatedCartItems._id}`,
        updatedCartItems
      );
        dispatch(fetchCartItems(updatedCartItems.cart_id))
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const deleteCartItem = createAsyncThunk(
  "cart/deleteCartItem",
  async (cartItemId: string, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`${baseUrl}/cart-item/${cartItemId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const deleteAllCartItems = createAsyncThunk(
  "cart/deleteAllCartItems",
  async (cartId: string, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`${baseUrl}/cart/${cartId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);
