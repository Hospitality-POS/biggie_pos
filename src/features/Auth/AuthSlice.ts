import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  loginUser,
  logoutUser,
  fetchAllUsers,
  createUser,
  deleteUser,
  fetchUserById,
  updateUser,
} from "./AuthActions";
import { Key, ReactNode } from "react";

interface User {
  pin?: string;
  idNumber?: string;
  name?: string;
  _id?: Key | null | undefined;
  fullname?: string;
  email: string;
  phone?: ReactNode;
  id?: string;
  username?: string;
  isAdmin?: boolean;
  role?: any;
  roleId?: string;
}

interface AuthState {
  user?: null | User;
  users?: User[];
  selected: unknown | User;
  token?: string | null;
  message?: string;
  newmessage?: string;
  isSuccess?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  IsError?: boolean;
}

const user = JSON.parse(localStorage.getItem("user"));

const initialState: AuthState = {
  user: user ? user : null,
  users: [],
  selected: "",
  token: null,
  message: "",
  newmessage: "",
  isSuccess: false,
  isLoading: false,
  isError: false,
  IsError: false,
};

export const authSlice = createSlice({
  name: "authUser",
  initialState,
  reducers: {
    reset: (state) => {
      state.isError = false;
      state.isLoading = false;
      state.isSuccess = false;
      state.message = "";
      state.user = null;
    },
    resetMessage: (state) => {
      state.newmessage = "";
      state.IsError = false;
    },
    updateUserDetails: (state, action: PayloadAction<User>) => {
      state.selected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
        state.user = null;
      })
      .addCase(
        loginUser.fulfilled,
        (state, action: any) => {
          state.isLoading = false;
          state.isSuccess = true;
          state.isError = false;
          state.message = "Login successful";
          state.user = action.payload;
          state.token = action.payload.Token;
          localStorage.setItem("shopId", action.payload?.shopId);
        }
      )
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
      })
      .addCase(fetchAllUsers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(
        fetchAllUsers.fulfilled,
        (state, action: PayloadAction<User[]>) => {
          state.isLoading = false;
          state.isSuccess = true;
          state.isError = false;
          state.message = "Fetch users successful";
          state.users = action.payload;
        }
      )
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      .addCase(createUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.isLoading = false;
        state.IsError = true;
        state.newmessage = action.payload as string;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.IsError = false;
        state.newmessage = "User created successfully";
        state.users.push(action.payload);
      })
      .addCase(deleteUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = "User deleted successfully";
        state.users = state.users.filter((user) => user.username !== action.payload);
      })
      .addCase(fetchUserById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserById.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.message = "Fetch user by ID successful";
        state.selected = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      .addCase(updateUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isError = false;
        state.message = "User updated successfully";
        state.users = state.users.map((user) =>
          user.id === action.payload.id ? action.payload : user
        );
        state.selected = action.payload;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      });
  },
});

export const { reset, resetMessage, updateUserDetails } = authSlice.actions;

export default authSlice.reducer;
