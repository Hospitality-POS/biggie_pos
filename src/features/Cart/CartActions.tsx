import { AlertOutlined } from "@ant-design/icons";
import { ParamsType } from "@ant-design/pro-components";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { BASE_URL } from "@utils/config";
import { Modal, notification } from "antd";
import axiosInstance from "../../services/request";
import { CartDetailsInterface } from "src/interfaces/CartDetailsTypes";
import { ThunkApi } from "src/interfaces/ThunkApiTypes";
import { updateCartInterface } from "src/interfaces/UpdateCartTypes";

const baseUrl = `${BASE_URL}/cart`;

interface CartItemInfo {
  cart_id: string;
  product_id: string;
  product_type: 'Product' | 'Product_Inventory';
  price: number;
  created_by: string;
  quantity: number;
  desc: string;
  table_id: string;
  duration?: number;
}

interface CartInfo {
  table_id: string;
  created_by: string;
}

interface UpdatedCartItems {
  cart_id: string;
  _id: string;
  product_id: string;
  product_type?: 'Product' | 'Product_Inventory';
  price: number;
  desc: string;
  quantity: number;
  duration?: number;
}

export const createCart = createAsyncThunk(
  "cart/createCart",
  async (cartDetails: CartDetailsInterface, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`${baseUrl}/create-cart`, cartDetails);
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
      console.log("waaat", tableId);
      const response = await axiosInstance.get(`${baseUrl}/cart/${tableId}`);
      console.log("res get me", response.data);

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
      const response = await axiosInstance.get(`${baseUrl}/cart-items/${cartId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const addItemToCart = createAsyncThunk(
  "cart/addItemToCart",
  async (cartItem: CartItemInfo, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(
        `${baseUrl}/add-item-to-cart`,
        cartItem
      );
      dispatch(getCart(cartItem.table_id));
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        Modal.error({
          title: "Oops!",
          content: `${error?.response?.data?.message}`,
          centered: true,
          icon: <AlertOutlined />
        });
      }
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const updateCartItems = createAsyncThunk(
  "cart/updateCartItems",
  async (updatedCartItems: UpdatedCartItems, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.put(
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
      const response = await axiosInstance.delete(`${baseUrl}/cart-item/${cartItemId}`);
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
      const response = await axiosInstance.delete(`${baseUrl}/cart/${cartId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const cartSent = createAsyncThunk(
  "cart/cartSent",
  async (cartDetails: CartDetailsInterface, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.put(`${baseUrl}/send-cart`, {
        cart_id: cartDetails._id,
      });
      dispatch(getCart(cartDetails.table_id._id));
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const cartVoid = createAsyncThunk(
  "cart/cartVoid",
  async (cartDetails: CartDetailsInterface, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`${baseUrl}/void-cart`, {
        cart_id: cartDetails._id,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const transferCartitemsAction = createAsyncThunk(
  "cart/transferCartItems",
  async (data: ParamsType, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.post(`${baseUrl}/transfer-cart-items`, {
        products: data?.products,
        table: data.table?.value,
      });

      dispatch(getCart(data?.id));
      notification.success({
        message: `Success`,
        description: "Successfully transfered the products",
        placement: "bottomLeft",
      });
      return response.data;
    } catch (error: any) {
      console.log("failed to tranfer product", error);

      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const updateCart = createAsyncThunk(
  "cart/updateCart",
  async (
    { cart, data }: updateCartInterface,
    { rejectWithValue, dispatch }: ThunkApi
  ) => {
    try {
      const response = await axiosInstance.put(
        `${baseUrl}/update-cart/${cart?._id}`,
        data
      );
      console.log('data new', cart);
      dispatch(getCart(cart?.table_id._id));

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);