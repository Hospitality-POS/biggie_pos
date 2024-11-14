import { createAsyncThunk } from "@reduxjs/toolkit";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../../services/request";

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


const baseUrl = `${BASE_URL}/orders`


export const createOrder = createAsyncThunk(
  "order/createOrder",
  async (orderDetails: OrderDetails, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`${baseUrl}/create`, orderDetails);
      return response.data;
    } catch (error: any) {
      message.error("Failed to create order");
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const fetchOrders = createAsyncThunk(
  "order/fetchOrders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(baseUrl);
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
      const response = await axiosInstance.put(
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
      const response = await axiosInstance.get(`${baseUrl}`, {
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
      await axiosInstance.delete(`${baseUrl}/${orderId}`);
      return orderId;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);
