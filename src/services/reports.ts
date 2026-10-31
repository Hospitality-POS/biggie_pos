import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";

export const fetchItemSalesReport = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(
      `${BASE_URL}/orders/date-range-sales/items`,
      {
        params: data,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching item sales report:", error);
    throw error;
  }
};

export const fetchProductTypeSalesReport = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(
      `${BASE_URL}/orders/date-range-sales/services-or-products`,
      {
        params: data,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching product type sales report:", error);
    throw error;
  }
};

export const fetchPurchaseReport = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(
      `${BASE_URL}/orders/order-payment-methods/summary`,
      {
        params: data,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching purchase report:", error);
    throw error;
  }
};


// VAT Summary
export const fetchVATSummary = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(
      `${BASE_URL}/orders/vat-summary`,
      {
        params: data,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching VAT summary:", error);
    throw error;
  }
};

// Voided orders report
export const fetchVoidedReport = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(
      `${BASE_URL}/orders/date-range-void/items`,
      {
        params: { ...data, print: true },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching voided report:", error);
    throw error;
  }
};

// Delivery report
export const fetchDeliveryReport = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(
      `${BASE_URL}/delivery/date-range-delivery-items/items`,
      {
        params: { ...data, print: true },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching delivery report:", error);
    throw error;
  }
};

// Inventory usage report
export const fetchInventoryUsageReport = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(
      `${BASE_URL}/product-inventory/date-range-inventory-usage-items/items`,
      {
        params: { ...data, print: true },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching inventory usage report:", error);
    throw error;
  }
};