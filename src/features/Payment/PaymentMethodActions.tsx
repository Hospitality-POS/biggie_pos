import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const baseUrl = `${import.meta.env.VITE_API_URL}/payment-methods`

// Define the types for your payment data
interface Payment {
  _id: string;
  name: string;
}

// Function to get the token from localStorage
const getToken = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user ? user.Token : null;
};

// Create an async thunk to fetch all payments
export const fetchPaymentsMethod = createAsyncThunk(
  "paymentMethod/fetchPaymentsMethod",
  async (_, { rejectWithValue }) => {
    const token = getToken(); 
    try {
      const response = await axios.get(baseUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to create a new payment
export const createPaymentMethod = createAsyncThunk(
  "paymentMethod/createPaymentMethod",
  async (newPayment: Payment, { rejectWithValue }) => {
    const token = getToken(); 
    try {
      const response = await axios.post(baseUrl, newPayment, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to update an existing payment
export const updatePaymentMethod = createAsyncThunk(
  "paymentMethod/updatePaymentMethod",
  async (updatedPayment: Payment, { rejectWithValue }) => {
    const token = getToken(); 
    try {
      const response = await axios.put(
        `${baseUrl}/${updatedPayment._id}`,
        updatedPayment,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to delete a payment
export const deletePaymentMethod = createAsyncThunk(
  "paymentMethod/deletePaymentMethod",
  async (paymentId: string, { rejectWithValue, dispatch}) => {
    const token = getToken(); 
    try {
      const response = await axios.delete(`${baseUrl}/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      dispatch(fetchPaymentsMethod())
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);
