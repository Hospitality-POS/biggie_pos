import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";
import { message } from "antd";

const baseUrl = BASE_URL;

interface PrintData {
  cart_id: string;
  print_etr: boolean;
  print: boolean;
}

declare global {
  interface Window {
    showSaveFilePicker(options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }): Promise<FileSystemFileHandle>;
  }
}

// ==================== EXISTING CART OPERATIONS ====================

export const getAllCartItems = async (cartId: string) => {
  try {
    const response = await axiosInstance.get(`${baseUrl}/cart/cart-items/${cartId}`);
    return response.data || [];
  } catch (error: any) {
    console.log(error);
  }
};

export const printInvoice = async (printData: PrintData): Promise<void> => {
  try {
    const response = await axiosInstance.put(`${baseUrl}/cart/print-cart`, printData, {
      responseType: 'arraybuffer',
    });

    const blob = new Blob([response.data], { type: "application/pdf" });

    try {
      if (!('showSaveFilePicker' in window)) {
        throw new Error('File System API not supported');
      }

      const fileHandle = await window.showSaveFilePicker({
        suggestedName: `invoice_${Date.now()}.pdf`,
        types: [{
          description: 'PDF Files',
          accept: {
            'application/pdf': ['.pdf'],
          },
        }],
      });

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      message.success(`Invoice saved successfully`);
    } catch (fileError) {
      console.log("Falling back to traditional download due to:", fileError);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice_${Date.now()}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      message.success("Invoice downloaded successfully");
    }
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Failed to download invoice");
    }
  }
};

export const getAllInvoices = async (params: ParamsType) => {
  try {
    console.log("Fetching invoices with params:", params);

    const response = await axiosInstance.get(`${baseUrl}/cart/invoices`, {
      params: {
        orderNo: params?.order_no || params?.orderNo || params?.keyword,
        tableName: params?.table || params?.tableName,
        start_date: params?.start_date,
        end_date: params?.end_date
      }
    });

    console.log("Invoices API response:", response.data?.length, "results");

    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return [];
  }
};

export const rePrintInvoice = async (invoiceId: string) => {
  try {
    const response = await axiosInstance.put(`${baseUrl}/cart/re-print-inv`, {
      invoice_id: invoiceId,
    });
    message.success("Invoice re-printed successfully");
    return response.data || [];
  } catch (error: any) {
    if (error?.response?.status != 403) {
      message.error("Failed to re-print invoice");
    }
  }
};

// ==================== NEW SUBSCRIPTION CART OPERATIONS ====================

/**
 * Get customer's active subscriptions for cart creation
 * Used when cashier selects a customer in POS
 */
export const fetchCustomerActiveSubscriptionsForCart = async (
  customerId: string
) => {
  try {
    const shopId = localStorage.getItem("shopId");
    const response = await axiosInstance.get(
      `${baseUrl}/cart/customer/${customerId}/active-subscriptions`,
      {
        params: { shop_id: shopId },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching subscriptions for cart:", error);
    return {
      subscriptions: [],
      count: 0,
      hasActiveSubscription: false,
    };
  }
};

/**
 * Create cart (supports both regular and subscription orders)
 */
export const createCart = async (cartData: {
  table_id: string;
  created_by: string;
  shop_id?: string;
  customer_id?: string;
  use_subscription?: boolean;
  payment_type?: string;
  subscription_id?: string;
}) => {
  try {
    const shopId = cartData.shop_id || localStorage.getItem("shopId");

    const response = await axiosInstance.post(`${baseUrl}/cart/create`, {
      ...cartData,
      shop_id: shopId,
    });

    if (cartData.use_subscription) {
      message.info("🎫 Using subscription for this order");
    }

    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error ||
      error?.message ||
      "Failed to create cart";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Update cart — uses PUT /cart/update-cart with cart_id in the body.
 * Supports discount, tips, client info, subscription details, and created_by (served by).
 */
export const updateCart = async (
  cartId: string,
  cartData: {
    discount_type?: string | null;
    discount?: number | null;
    client_pin?: string | null;
    tip_type?: string | null;
    tip_amount?: number | null;
    client_name?: string | null;
    client_email?: string | null;
    client_phone?: string | null;
    customer_id?: string | null;
    use_subscription?: boolean | null;
    payment_type?: string | null;
    subscription_id?: string | null;
    served_by?: string | null;
  }
) => {
  try {
    const response = await axiosInstance.put(
      `${baseUrl}/cart/update-cart/${cartId}`,
      cartData
    );
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error ||
      error?.message ||
      "Failed to update cart";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Get cart details (includes subscription info if applicable)
 */
export const getCart = async (tableId: string) => {
  try {
    const response = await axiosInstance.get(`${baseUrl}/cart/${tableId}`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching cart:", error);
    throw new Error(error?.response?.data?.error || "Failed to fetch cart");
  }
};

/**
 * Add item to cart
 */
export const addItemToCart = async (itemData: {
  cart_id: string;
  product_id: string | null;
  price: number;
  quantity: number;
  created_by: string;
  desc?: string;
  table_id?: string;
  product_type: "Product" | "Product_Inventory" | "Miscellaneous";
  miscellaneous_name?: string;
  vat_type?: string;
  notes?: string;
  addons?: any[];
}) => {
  try {
    const companyCode = localStorage.getItem("companyCode");
    const tenant = localStorage.getItem("tenant") ? JSON.parse(localStorage.getItem("tenant")!) : null;
    
    const requestData = {
      ...itemData,
      companyCode: companyCode || (tenant ? tenant.tenant_code : null),
      tenant_code: companyCode || (tenant ? tenant.tenant_code : null),
    };

    const response = await axiosInstance.post(
      `${baseUrl}/cart/add-to-cart`,
      requestData
    );
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Failed to add item to cart";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Update cart item
 */
export const updateCartItem = async (
  cartItemId: string,
  itemData: {
    product_id?: string;
    price?: number;
    desc?: string;
    quantity?: number;
    product_type?: "Product" | "Product_Inventory";
  }
) => {
  try {
    const response = await axiosInstance.put(
      `${baseUrl}/cart/cart-item/${cartItemId}`,
      itemData
    );
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error ||
      error?.message ||
      "Failed to update cart item";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Delete cart item
 */
export const deleteCartItem = async (cartItemId: string) => {
  try {
    const response = await axiosInstance.delete(
      `${baseUrl}/cart/cart-item/${cartItemId}`
    );
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error ||
      error?.message ||
      "Failed to delete cart item";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Delete all cart items
 */
export const deleteAllCartItems = async (cartId: string) => {
  try {
    const response = await axiosInstance.delete(
      `${baseUrl}/cart/cart-items/${cartId}`
    );
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error ||
      error?.message ||
      "Failed to clear cart";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Send cart to kitchen
 */
export const sendCart = async (cartId: string) => {
  try {
    const response = await axiosInstance.put(`${baseUrl}/cart/send-cart`, {
      cart_id: cartId,
    });
    message.success("Order sent to kitchen");
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error ||
      error?.message ||
      "Failed to send order";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Void cart
 */
export const voidCart = async (cartId: string) => {
  try {
    const response = await axiosInstance.put(`${baseUrl}/cart/void-cart`, {
      cart_id: cartId,
    });
    message.success("Order voided successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error ||
      error?.message ||
      "Failed to void order";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Transfer cart items to another table
 */
export const transferCartItems = async (data: {
  products: string[];
  table: string;
}) => {
  try {
    const response = await axiosInstance.post(
      `${baseUrl}/cart/transfer-items`,
      data
    );
    message.success("Items transferred successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error ||
      error?.message ||
      "Failed to transfer items";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// ==================== TYPES ====================

export interface Cart {
  _id: string;
  table_id: {
    _id: string;
    name: string;
  };
  created_by: {
    _id: string;
    username: string;
  };
  discount?: number;
  discount_type?: string;
  shop_id: string;
  tip_type?: string;
  tip_amount?: number;
  client_pin?: string;
  client_name?: string;
  order_no: string;
  status: "Open" | "Closed";
  void: boolean;
  // NEW: Subscription fields
  customer_id?: {
    _id: string;
    customer_name: string;
    code: string;
  };
  use_subscription?: boolean;
  payment_type?: string;
  subscription_id?: string;
  items?: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  _id: string;
  cart_id: string;
  product_id: any;
  product_type: "Product" | "Product_Inventory";
  shop_id: string;
  category: string;
  price: number;
  created_by: string;
  desc?: string;
  quantity: number;
  table_id: string;
  printed: boolean;
  sent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionInfo {
  subscription_code: string;
  package_name: string;
  visits_remaining: number;
  visits_used: number;
  total_visits_allowed: number;
  end_date: string;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if a cart is using subscription
 */
export const isSubscriptionCart = (cart: Cart): boolean => {
  return cart?.use_subscription === true && !!cart?.customer_id;
};

/**
 * Get cart total amount
 */
export const getCartTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + item.price, 0);
};

/**
 * Format subscription info for display
 */
export const formatSubscriptionDisplay = (
  subscription: SubscriptionInfo
): string => {
  return `${subscription.package_name} - ${subscription.visits_remaining}/${subscription.total_visits_allowed} visits left`;
};

/**
 * Validate if subscription can be used
 */
export const canUseSubscription = (subscription: any): boolean => {
  if (!subscription) return false;

  const now = new Date();
  const endDate = new Date(subscription.end_date);

  return (
    subscription.status === "Active" &&
    subscription.visits_remaining > 0 &&
    endDate >= now
  );
};