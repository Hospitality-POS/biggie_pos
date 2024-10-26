import { createAsyncThunk } from "@reduxjs/toolkit";
import { BASE_URL } from "@utils/config";
import { message, notification } from "antd";
import axios from "axios";

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
        
      const response = await axios.post(`${baseUrl}/login`, _userDetails);
      localStorage.setItem('user', JSON.stringify(response.data))
      message.success('Login successful')
      return response.data;
    } catch (error: any) {
      notification.error({message: error.response.data.message })
      return rejectWithValue(error.message || error.toString());
    }
  }
);
export const logoutUser = createAsyncThunk(
    "authUser/logoutUser",
    async () => {
        try {
            const response = await localStorage.removeItem('user')
            return response
        } catch (error:any) {
            return error.message
        }
    }
)


export const fetchAllUsers = createAsyncThunk(
  "user/fetchAllUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${baseUrl}/all`);
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
      const response = await axios.post(`${baseUrl}/register`, _userDetails);
      dispatch(fetchAllUsers())
      return response.data;
    } catch (error: any) {    
      return rejectWithValue(error.response.data.message);
    }
  }
);

export const deleteUser = createAsyncThunk(
  "user/deleteUser",
  async (userId: string, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.delete(`${baseUrl}/${userId}`);
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
      const response = await axios.get(`${baseUrl}/${userId}`);
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
      const response = await axios.put(`${baseUrl}/${userData._id}`, userData);
      dispatch(fetchAllUsers());
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response.data.message);
    }
  }
);
