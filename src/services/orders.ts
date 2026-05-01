import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "./request";

export const getAllOrders = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/orders`, {
      params: {
        order_no: data?.order_no || data?.keyword,
        name: data?.name,
        start_date: data?.start_date,
        end_date: data?.end_date,
        shop_id: data?.shop_id,
      },
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    return [];
  }
};

export const getDashboardAnalysis = async (startDate: string, endDate: string, shopId?: string) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (shopId) params.append('shop_id', shopId);

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
        name: data?.name,
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

// ============================================
// ORDER ITEM OPERATIONS
// ============================================

interface UpdateOrderItemParams {
  quantity?: number;
  createdAt?: string;
}

/**
 * ✅ Update order item (quantity and/or timestamp)
 */
export const updateOrderItem = async (itemId: string, data: UpdateOrderItemParams) => {
  try {
    const response = await axiosInstance.patch(
      `${BASE_URL}/orders/items/${itemId}`,
      data
    );
    message.success("Order item updated successfully");
    return response.data;
  } catch (error) {
    if (error?.response?.data?.message) {
      message.error(error.response.data.message);
    } else {
      message.error("Error updating order item");
    }
    throw error;
  }
};

/**
 * ✅ NEW: Delete order item
 */
export const deleteOrderItem = async (itemId: string) => {
  try {
    const response = await axiosInstance.delete(
      `${BASE_URL}/orders/items/${itemId}`
    );
    message.success("Order item deleted successfully");
    return response.data;
  } catch (error) {
    if (error?.response?.data?.message) {
      message.error(error.response.data.message);
    } else {
      message.error("Error deleting order item");
    }
    throw error;
  }
};

// ============================================
// ORDER OPERATIONS
// ============================================

interface UpdateOrderParams {
  cart_id?: string;
  order_amount?: number;
  table_id?: string;
  updated_by?: string;
  order_no?: string;
  createdAt?: string;  // ✅ NEW: Support timestamp update
}

/**
 * ✅ NEW: Update order (including timestamp with cascading updates)
 */
export const updateOrder = async (orderId: string, data: UpdateOrderParams) => {
  try {
    const response = await axiosInstance.put(
      `${BASE_URL}/orders/${orderId}`,
      data
    );

    // Show appropriate success message
    // if (data.createdAt) {
    //   message.success("Order updated successfully. Timestamps propagated to all items and payments.");
    // } else {
    //   message.success("Order updated successfully");
    // }

    return response.data;
  } catch (error) {
    if (error?.response?.data?.message) {
      message.error(error.response.data.message);
    } else {
      message.error("Error updating order");
    }
    throw error;
  }
};

/**
 * ✅ NEW: Update order timestamp only (convenience function)
 */
export const updateOrderTimestamp = async (orderId: string, createdAt: string) => {
  try {
    const response = await axiosInstance.put(
      `${BASE_URL}/orders/${orderId}`,
      { createdAt }
    );

    message.success(
      `Order timestamp updated. ${response.data.timestamp_update?.order_items_updated || 0} items and ${response.data.timestamp_update?.order_payments_updated || 0} payments updated.`
    );

    return response.data;
  } catch (error) {
    if (error?.response?.data?.message) {
      message.error(error.response.data.message);
    } else {
      message.error("Error updating order timestamp");
    }
    throw error;
  }
};

// ============================================
// ORDER PAYMENT OPERATIONS
// ============================================

interface RepostOrderPaymentParams {
  force_recreate?: boolean;
}

interface RepostOrderPaymentResponse {
  success: boolean;
  message: string;
  order: {
    order_id: string;
    order_no: string;
    order_amount: number;
    order_type: string;
    payment_status: string;
    order_status: string;
  };
  payments_created: Array<{
    _id: string;
    method_id: string;
    method_name: string;
    method_type: string;
    amount: number;
    payment_status: string;
    payment_date: string;
    notes: string;
  }>;
  summary: {
    total_payments: number;
    total_amount: number;
    was_forced: boolean;
    deleted_old_payments: number;
  };
}

/**
 * ✅ NEW: Repost missing order payment for regular orders
 * This function creates or recreates payment records for orders that are missing them
 * 
 * @param orderId - The ID of the order to repost payment for
 * @param params - Optional parameters
 * @param params.force_recreate - If true, deletes existing payments and recreates them
 * 
 * @example
 * // Create missing payment
 * await repostOrderPayment('695e063f1d1b335b0e8f3bbc');
 * 
 * @example
 * // Force recreate existing payments
 * await repostOrderPayment('695e063f1d1b335b0e8f3bbc', { force_recreate: true });
 */
export const repostOrderPayment = async (
  orderId: string,
  params: RepostOrderPaymentParams = {}
): Promise<RepostOrderPaymentResponse> => {
  try {
    const response = await axiosInstance.post(
      `${BASE_URL}/orders/${orderId}/repost-payment`,
      params
    );

    const data = response.data as RepostOrderPaymentResponse;

    // Show success message with details
    if (data.summary.was_forced) {
      message.success(
        `Payment records recreated for order ${data.order.order_no}. ` +
        `Created ${data.summary.total_payments} payment(s) totaling ${data.summary.total_amount}. ` +
        `Deleted ${data.summary.deleted_old_payments} old payment(s).`
      );
    } else {
      message.success(
        `Payment records created for order ${data.order.order_no}. ` +
        `Created ${data.summary.total_payments} payment(s) totaling ${data.summary.total_amount}.`
      );
    }

    return data;
  } catch (error) {
    if (error?.response?.data?.message) {
      message.error(error.response.data.message);
    } else {
      message.error("Error reposting order payment");
    }
    throw error;
  }
};

/**
 * ✅ NEW: Batch repost payments for multiple orders
 * Useful for fixing multiple orders at once
 * 
 * @param orderIds - Array of order IDs to repost payments for
 * @param forceRecreate - If true, deletes existing payments and recreates them for all orders
 * 
 * @returns Object with success/failure counts and details
 */
export const batchRepostOrderPayments = async (
  orderIds: string[],
  forceRecreate: boolean = false
) => {
  const results = {
    success: [] as string[],
    failed: [] as Array<{ orderId: string; error: string }>,
    total: orderIds.length,
  };

  for (const orderId of orderIds) {
    try {
      await repostOrderPayment(orderId, { force_recreate: forceRecreate });
      results.success.push(orderId);
    } catch (error) {
      results.failed.push({
        orderId,
        error: error?.response?.data?.message || error.message || "Unknown error",
      });
    }
  }

  // Show summary message
  if (results.failed.length === 0) {
    message.success(
      `Successfully reposted payments for all ${results.total} orders`
    );
  } else if (results.success.length === 0) {
    message.error(
      `Failed to repost payments for all ${results.total} orders`
    );
  } else {
    message.warning(
      `Reposted payments for ${results.success.length}/${results.total} orders. ` +
      `${results.failed.length} failed.`
    );
  }

  return results;
};