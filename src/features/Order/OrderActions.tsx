import { createAsyncThunk } from "@reduxjs/toolkit";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../../services/request";

interface OrderDetails {
  _id?: string;
  table_id: string | undefined;
  created_by?: string;
  order_no: string;
  order_amount: number | number[];
  cart_id: string;
  method_id: string | (string | null)[] | null;
  updated_by: string | undefined;
  cart_items: any[];
  shop_id?: string;
  payment_type?: string;
  // NEW: Subscription fields
  use_subscription?: boolean;
  subscription_id?: string;
  customer_id?: string;
  // STK Push fields (existing)
  customer_phone?: string;
  customer_name?: string;
  customer_email?: string;
  enable_stk_push?: boolean;
  stk_phone_number?: string;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

const baseUrl = `${BASE_URL}/orders`;

export const createOrder = createAsyncThunk(
  "order/createOrder",
  async (orderDetails: OrderDetails, { rejectWithValue }) => {
    try {
      console.log("Creating order with details:", orderDetails);

      const response = await axiosInstance.post(`${baseUrl}/create`, orderDetails);

      // Handle subscription orders
      if (orderDetails.use_subscription) {
        message.success("Order placed successfully using subscription visit!");
      } else if (response.data?.payment?.stk_push) {
        // Handle STK Push orders
        message.success("STK Push sent successfully!");
      } else {
        // Handle regular orders
        message.success("Order created successfully!");
      }

      return response.data;
    } catch (error: any) {
      console.error("Order creation failed:", error);

      // Enhanced error messaging
      const errorMessage = error.response?.data?.message || error.message || "Failed to create order";

      if (orderDetails.use_subscription) {
        message.error(`Subscription order failed: ${errorMessage}`);
      } else {
        message.error(errorMessage);
      }

      return rejectWithValue(error.response?.data || error.message || error.toString());
    }
  }
);

export const fetchOrders = createAsyncThunk(
  "order/fetchOrders",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(baseUrl);
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
      message.success("Order updated successfully!");
      return response.data;
    } catch (error: any) {
      message.error("Failed to update order");
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
      message.success("Order deleted successfully!");
      return orderId;
    } catch (error: any) {
      message.error("Failed to delete order");
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// NEW: Fetch orders by type (Regular, Subscription, etc.)
export const fetchOrdersByType = createAsyncThunk(
  "order/fetchOrdersByType",
  async (
    params: {
      order_type?: string;
      startDate?: string;
      endDate?: string;
      shop_id?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.get(`${baseUrl}`, {
        params,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// NEW: Get sales breakdown by type (Regular vs Subscription)
export const getSalesBreakdownByType = createAsyncThunk(
  "order/getSalesBreakdownByType",
  async (
    params: {
      startDate?: string;
      endDate?: string;
      shop_id?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.get(`${baseUrl}/sales-breakdown-by-type`, {
        params,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// NEW: Get subscription analytics
export const getSubscriptionAnalytics = createAsyncThunk(
  "order/getSubscriptionAnalytics",
  async (
    params: {
      startDate?: string;
      endDate?: string;
      shop_id?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.get(`${baseUrl}/subscription-analytics`, {
        params,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export default {
  createOrder,
  fetchOrders,
  updateOrder,
  fetchOrdersByDateRange,
  deleteOrder,
  fetchOrdersByType,
  getSalesBreakdownByType,
  getSubscriptionAnalytics,
};