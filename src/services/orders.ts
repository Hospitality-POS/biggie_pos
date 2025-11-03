import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

export const getAllOrders = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/orders`, {
      params: {
        order_no: data?.order_no || data?.keyword,
        table_name: data?.name,
        start_date: data?.start_date,
        end_date: data?.end_date,
        shop_id: data?.shop_id,
      },
    });
    console.log('man min', response);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    return [];
  }
};

export const getDashboardAnalysis = async (startDate: string, endDate: string) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    const url = `${BASE_URL}/orders/dashboard/summary${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getAdminDashboardAnalysis = async (startDate: string, endDate: string) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    const url = `${BASE_URL}/orders/admin-dashboard/summary${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error;
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
    throw error;
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

interface BestSellersParams {
  startDate?: string;
  endDate?: string;
  shop_id?: string;
  category_id?: string;
  product_type?: 'Product' | 'Product_Inventory';
  limit?: number;
}

export const getBestSellers = async (params: BestSellersParams = {}) => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/orders/product/best-sellers`, {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        shop_id: params.shop_id,
        category_id: params.category_id,
        product_type: params.product_type,
        limit: params.limit || 10,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

interface BestSellersByCategoryParams {
  startDate?: string;
  endDate?: string;
  shop_id?: string;
  limit?: number;
}

export const getBestSellersByCategory = async (params: BestSellersByCategoryParams = {}) => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/orders/best-sellers/by-category`, {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        shop_id: params.shop_id,
        limit: params.limit || 5,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

interface SalesChartParams {
  startDate?: string;
  endDate?: string;
  shop_id?: string;
  period?: 'day' | 'week' | 'month' | 'year';
}

export const getSalesChartData = async (params: SalesChartParams = {}) => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/orders/dashboard/sales-chart`, {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        shop_id: params.shop_id,
        period: params.period || 'day',
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};