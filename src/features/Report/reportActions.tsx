import { createAsyncThunk } from "@reduxjs/toolkit";
import { BASE_URL } from "@utils/config";
import axios from "axios";

const baseUrl = `${BASE_URL}/orders`;

interface DateDetails {
  startDate: string;
  endDate: string;
}

export const generateSalesReport = createAsyncThunk(
  "report/generateSalesReport",
  async (dated: DateDetails, { rejectWithValue }) => {

    try {
      const response = await axios.get(`${baseUrl}/date-range-sales/items`,{params: {
          startDate: dated.startDate,
          endDate: dated.endDate,
        }});
      console.log("ress sales",response.data);
      
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response.data.error || error.toString());
    }
  }
);

export const generatePurchaseReport = createAsyncThunk(
  "report/generatePurchaseReport",
  async (dated: DateDetails, { rejectWithValue }) => {
    try { 
      const response = await axios.get(`${baseUrl}/order-payment-methods/summary`, {params: {
          startDate: dated.startDate,
          endDate: dated.endDate,
        }});

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response.data.error || error.toString());
    }
  }
);