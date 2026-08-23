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
    console.log(error);
  }
};

export const fetchPurchaseReport = async (data: ParamsType) => {
  try {
    const response = await axiosInstance.get(
      `${BASE_URL}/order-payment-methods/summary`,
      {
        params: data,
      }
    );
    return response.data;
  } catch (error) {
    console.log(error);
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
    console.log(error);
  }
};

// Services / Products sales by date range
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
    console.log(error);
  }
};