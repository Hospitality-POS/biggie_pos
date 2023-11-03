import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const baseUrl = "http://localhost:3000/orders";

interface OrderDetails {
  _id: string;
  table_id: string | undefined;
  created_by: string;
  order_no: string;
  order_amount: number[];
  cart_id: string;
  method_id: (string | null)[];
  updated_by: string | undefined;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

export const createOrder = createAsyncThunk(
  "order/createOrder",
  async (orderDetails: OrderDetails, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${baseUrl}/create`, orderDetails);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const fetchOrders = createAsyncThunk(
  "order/fetchOrders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(baseUrl);
      // console.log(response);

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const updateOrder = createAsyncThunk(
  "order/updateOrder",
  async (orderDetails: OrderDetails, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${baseUrl}/${orderDetails._id}`,
        orderDetails
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const fetchOrdersByDateRange = createAsyncThunk(
  "order/fetchOrdersByDateRange",
  async (dateRange: DateRange, { rejectWithValue }) => {
    try {
      const { startDate, endDate } = dateRange;
      const response = await axios.get(`${baseUrl}`, {
        params: {
          startDate,
          endDate,
        },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const deleteOrder = createAsyncThunk(
  "order/deleteOrder",
  async (orderId: string, { rejectWithValue }) => {
    try {
      await axios.delete(`${baseUrl}/${orderId}`);
      return orderId;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);
