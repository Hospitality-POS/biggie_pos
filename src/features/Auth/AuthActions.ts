import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const baseUrl = "http://localhost:3000/users";

interface UserDetails {
  username: string;
  pin: string;
}

export const loginUser = createAsyncThunk(
  "authUser/loginUser",
  async (_userDetails: UserDetails, { rejectWithValue }) => {
    try {
        // console.log(_userDetails);
        
      const response = await axios.post(`${baseUrl}/login`, _userDetails);
      localStorage.setItem('user', JSON.stringify(response.data))
      return response.data;
    } catch (error: any) {
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
        } catch (error) {
            return error.message
        }
    }
)
