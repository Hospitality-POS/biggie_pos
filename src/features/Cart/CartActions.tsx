import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const baseUrl = `${import.meta.env.VITE_API_URL}/cart`;

interface CartInfo {
  table_id: string;
  created_by: string;
}



interface UpdatedCartItems {
  cart_id: string;
  _id: string;
  product_id: string;
  price: number;
  desc: string;
  quantity: number;
}

export const createCart = createAsyncThunk(
  "cart/createCart",
  async (cartDetails: CartInfo, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${baseUrl}/create-cart`, cartDetails);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const getCart = createAsyncThunk(
  "cart/getCart",
  async (tableId: string, { rejectWithValue }) => {
    try {
      // console.log("waaat", tableId);
      const response = await axios.get(`${baseUrl}/cart/${tableId}`);
      // console.log("res get me", response.data);

      return response.data;
    } catch (error: any) {
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
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const addItemToCart = createAsyncThunk(
  "cart/addItemToCart",
  async (cartItem: CartInfo, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(
        `${baseUrl}/add-item-to-cart`,
        cartItem
      );
      dispatch(getCart(cartItem.table_id));
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const updateCartItems = createAsyncThunk(
  "cart/updateCartItems",
  async (updatedCartItems: UpdatedCartItems, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.put(
        `${baseUrl}/cart-item/${updatedCartItems._id}`,
        updatedCartItems
      );
      dispatch(fetchCartItems(updatedCartItems.cart_id));
      return response.data;
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const cartSent = createAsyncThunk(
  "cart/cartSent",
  async (cartDetails: any, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.put(`${baseUrl}/send-cart`, {
        cart_id: cartDetails._id,
      });
      dispatch(getCart(cartDetails.table_id._id))
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const cartVoid = createAsyncThunk(
  "cart/cartVoid",
  async (cartDetails: any, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.put(`${baseUrl}/void-cart`, {
        cart_id: cartDetails._id,
      });
            dispatch(getCart(cartDetails.table_id._id))

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);
