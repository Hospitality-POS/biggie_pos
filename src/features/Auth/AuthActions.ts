import { createAsyncThunk } from "@reduxjs/toolkit";
import { BASE_URL } from "@utils/config";
import { message, notification } from "antd";
import axiosInstance from "../../services/request";
import { clearBusinessHealthCache } from "../../services/healthScore";
import { queryClient } from "../../main";

const baseUrl = `${BASE_URL}/users`;

interface UserDetails {
  username: string;
  pin: string;
}

interface UserPinDetails {
  pin: string;
}
export const loginUser = createAsyncThunk(
  "authUser/loginUser",
  async (_userDetails: UserPinDetails, { rejectWithValue }) => {
    try {
      // console.log(_userDetails);

      const response = await axiosInstance.post(`${baseUrl}/login`, _userDetails);

      // A different user signing in must not inherit the previous user's
      // cached data (e.g. privacy-filtered table lists). Wipe the React Query
      // cache whenever the logged-in user identity changes.
      let prevUserId: string | null = null;
      try {
        const prev = JSON.parse(localStorage.getItem('user') || "{}");
        prevUserId = prev._id || prev.id || null;
      } catch {
        prevUserId = null;
      }
      const nextUserId = response.data?._id || response.data?.id || null;
      if (nextUserId && nextUserId !== prevUserId) {
        queryClient.clear();
      }

      localStorage.setItem('user', JSON.stringify(response.data))
      message.success('Login successful')
      return response.data;
    } catch (error: any) {
      notification.error({ message: error.response.data.message })
      return rejectWithValue(error.message || error.toString());
    }
  }
);
export const logoutUser = createAsyncThunk(
  "authUser/logoutUser",
  async () => {
    try {
      clearBusinessHealthCache();
      const response = await localStorage.removeItem('user')
      return response
    } catch (error: any) {
      return error.message
    }
  }
)


export const fetchAllUsers = createAsyncThunk(
  "user/fetchAllUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`${baseUrl}/all`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const createUser = createAsyncThunk(
  "user/createUser",
  async (_userDetails: UserDetails, { rejectWithValue, dispatch }) => {
    try {
      // Add company code to prevent logout
      const companyCode = localStorage.getItem("companyCode");
      const payload = companyCode ? { ..._userDetails, companyCode, tenant_code: companyCode } : _userDetails;
      const response = await axiosInstance.post(`${baseUrl}/register`, payload);
      dispatch(fetchAllUsers())
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || { message: error?.message || "Failed to add a new User" });
    }
  }
);

export const deleteUser = createAsyncThunk(
  "user/deleteUser",
  async (userId: string, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.delete(`${baseUrl}/${userId}`);
      // Optionally, you can dispatch another action after successful deletion, like fetching updated user data.
      dispatch(fetchAllUsers());
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const fetchUserById = createAsyncThunk(
  "user/fetchUserById",
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`${baseUrl}/${userId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

export const updateUser = createAsyncThunk(
  "user/updateUser",
  async (userData: any, { rejectWithValue, dispatch }) => {
    try {
      const response = await axiosInstance.put(`${baseUrl}/${userData._id}`, userData);
      dispatch(fetchAllUsers());
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response.data.message);
    }
  }
);
