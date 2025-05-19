import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

export const getAllOrders = async (data: ParamsType) => {
  try {
    console.log("Fetching orders with params:", data); // Debug log

    const response = await axiosInstance.get(`${BASE_URL}/orders`, {
      params: {
        order_no: data?.order_no || data?.keyword,
        table_name: data?.name,
        // Include date filter parameters if they exist
        start_date: data?.start_date,
        end_date: data?.end_date,
        // Include any other parameters that might be passed
        shop_id: data?.shop_id,
      },
    });

    console.log("Orders API response:", response.data.length, "results"); // Debug log

    // Ensure we always return an array, even if the response is null/undefined
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Error fetching orders:", error);
    // Always return empty array on error
    return [];
  }
};

export const getDashboardAnalysis = async (startDate: string, endDate: string) => {
  try {
    // Build query parameters for the date range
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    const url = `${BASE_URL}/orders/dashboard/summary${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get(url);
    console.log('Dashboard response with date range:', response);
    return response.data;
  } catch (error) {
    console.log('Dashboard analysis error:', error);
    throw error; // Re-throw the error so it can be handled by the query's onError
  }
};
export const getAdminDashboardAnalysis = async (startDate: string, endDate: string) => {
  try {
    // Build query parameters for the date range
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    const url = `${BASE_URL}/orders/admin-dashboard/summary${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get(url);
    console.log('Admin dashboard response:', response);
    return response.data;
  } catch (error) {
    console.log('Admin dashboard error:', error);
    throw error; // Re-throw the error so it can be handled by the query's onError
  }
};

export const getTodayOrdersCount = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/orders`, {
      params: {
        order_no: data?.order_no || data?.keyword,
        table_name: data?.name,
      },
    });
    return response.data;
  } catch (error) {
    console.log(error);
  }
};


export const deleteOrderById = async (id: string) => {
  try {
    await axiosInstance.delete(`${BASE_URL}/orders/${id}`);
    message.success("Order deleted successfully");
    return true;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Error deleting order");
    }
    return false;
  }
};
