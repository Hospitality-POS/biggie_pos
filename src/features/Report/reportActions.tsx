import { createAsyncThunk } from "@reduxjs/toolkit";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../../services/request";

const baseUrl = `${BASE_URL}/orders`;

interface DateDetails {
  startDate: string;
  endDate: string;
  shop_id?: string;
}

export const generateSalesReport = createAsyncThunk(
  "report/generateSalesReport",
  async (dated: DateDetails, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `${baseUrl}/date-range-sales/items`,
        {
          params: {
            startDate: dated.startDate,
            endDate: dated.endDate,
            print: true,
          },
        }
      );
      message.success("Sales report generated successfully");
      return response.data;
    } catch (error: any) {
      message.error("Failed to generate sales report");
      return rejectWithValue(error.response.data.error || error.toString());
    }
  }
);

export const generateInventoryUsageReport = createAsyncThunk(
  "report/generateInventoryUsageReport",
  async (dated: DateDetails, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `${BASE_URL}/product-inventory/date-range-inventory-usage-items/items`,
        {
          params: {
            startDate: dated.startDate,
            endDate: dated.endDate,
            print: true,
          },
        }
      );
      console.log("reportType", response),
        message.success("Sales report generated successfully");
      return response.data;
    } catch (error: any) {
      message.error("Failed to generate sales report");
      return rejectWithValue(error.response.data.error || error.toString());
    }
  }
);

export const generateVoidedReport = createAsyncThunk(
  "report/generateVoidedReport",
  async (dated: DateDetails, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `${baseUrl}/date-range-void/items`,
        {
          params: {
            startDate: dated.startDate,
            endDate: dated.endDate,
            print: true,
          },
        }
      );
      message.success("Voided report generated successfully");
      return response.data;
    } catch (error: any) {
      message.error("Failed to generate voided report");
      return rejectWithValue(error.response.data.error || error.toString());
    }
  }
);

export const generatePurchaseReport = createAsyncThunk(
  "report/generatePurchaseReport",
  async (dated: DateDetails, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `${baseUrl}/order-payment-methods/summary`,
        {
          params: {
            startDate: dated.startDate,
            endDate: dated.endDate,
            print: true,
          },
        }
      );
      message.success("Purchase report generated successfully");
      return response.data;
    } catch (error: any) {
      message.error("Failed to generate purchase report");
      return rejectWithValue(error.response.data.error || error.toString());
    }
  }
);

export const generateDeliveryReport = createAsyncThunk(
  "report/generateDeliveryReport",
  async (dated: DateDetails, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(
        `${BASE_URL}/delivery/date-range-delivery-items/items`,
        {
          params: {
            startDate: dated.startDate,
            endDate: dated.endDate,
            print: true,
          },
        }
      );
      message.success("Delivery report generated successfully");
      return response.data;
    } catch (error: any) {
      message.error("Failed to generate delivery report");
      return rejectWithValue(error.response.data.error || error.toString());
    }
  }
);

export const generateVATReport = createAsyncThunk(
  "report/generateVatSummaryReport",
  async (dated: DateDetails, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`${baseUrl}/vat-summary`, {
        params: {
          startDate: dated.startDate,
          endDate: dated.endDate,
          shop_id: dated.shop_id
        },
      });
      message.success("VAT report generated successfully");
      return response.data.data;
    } catch (error: any) {
      message.error("Failed to generate VAT report");
      return rejectWithValue(error.response.data.error || error.toString());
    }
  }
);
