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

export const addToCartByBarcode = createAsyncThunk(
  "cart/addByBarcode",
  async ({ barcode, tableId }: { barcode: string; tableId: string }, { rejectWithValue, dispatch }) => {
    try {
      const res = await axiosInstance.post(`/cart/${tableId}/add-by-barcode`, { barcode });
      dispatch(getCart(tableId));
      return { success: true, productName: res.data.product?.name, ...res.data };
    } catch (err: any) {
      if (err.response?.status === 404)
        return { success: false, notFound: true };
      return rejectWithValue(err.response?.data);
    }
  }
);

export const getCart = createAsyncThunk(
  "cart/getCart",
  async (tableId: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`${baseUrl}/cart/${tableId}`);
      console.log('nice uno', response);
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

// ── DATA MODEL (single source of truth) ───────────────────────────────────────
// cartItem.price  = UNIT price (price of one unit of the product)
// cartItem.quantity = number of units
// The slice's calculateTotals computes the line total as: price * quantity
// So we NEVER modify price when changing quantity — only quantity changes.
// ─────────────────────────────────────────────────────────────────────────────

export const addQtyCart = createAsyncThunk(
  "cart/addQtyCart",
  async (cartItem: any, { rejectWithValue, dispatch, getState }) => {
    try {
      const state: any = getState();
      const tableId = state.cart.cartDetails?.table_id?._id || state.cart.cartDetails?.table_id;

      const newQty = (cartItem.quantity || 1) + 1;

      // Send only the new quantity; price stays as unit price — unchanged
      const response = await axiosInstance.put(
        `${baseUrl}/cart-item/${cartItem._id}`,
        { ...cartItem, quantity: newQty }
      );

      if (tableId) dispatch(getCart(tableId));
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const removeQtyCart = createAsyncThunk(
  "cart/removeQtyCart",
  async (cartItem: any, { rejectWithValue, dispatch, getState }) => {
    try {
      const state: any = getState();
      const tableId = state.cart.cartDetails?.table_id?._id || state.cart.cartDetails?.table_id;

      const currentQty = cartItem.quantity || 1;
      if (currentQty <= 1) return cartItem; // Safety guard

      const newQty = currentQty - 1;

      // Send only the new quantity; price stays as unit price — unchanged
      const response = await axiosInstance.put(
        `${baseUrl}/cart-item/${cartItem._id}`,
        { ...cartItem, quantity: newQty }
      );

      if (tableId) dispatch(getCart(tableId));
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const updateCartItemQty = createAsyncThunk(
  "cart/updateCartItemQty",
  async (
    { cartItem, quantity }: { cartItem: any; quantity: number },
    { rejectWithValue, dispatch, getState }
  ) => {
    try {
      const state: any = getState();
      const tableId = state.cart.cartDetails?.table_id?._id || state.cart.cartDetails?.table_id;

      // Send only the new quantity; price stays as unit price — unchanged
      const response = await axiosInstance.put(
        `${baseUrl}/cart-item/${cartItem._id}`,
        { ...cartItem, quantity }
      );

      if (tableId) dispatch(getCart(tableId));
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
  async (cartId: string, { rejectWithValue, getState }) => {
    try {
      const response = await axiosInstance.delete(`${baseUrl}/cart/${cartId}`);

      const state: any = getState();
      const tableId = state.cart.cartDetails?.table_id?._id || state.cart.cartDetails?.table_id;
      if (tableId) {
        await axiosInstance.put(`${BASE_URL}/tables/${tableId}`, { isOccupied: false });
      }

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
      dispatch(getCart(cart?.table_id._id));
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);