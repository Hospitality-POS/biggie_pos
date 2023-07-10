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
        console.log(_userDetails);
        
      const response = await axios.post(`${baseUrl}/login`, _userDetails);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);
