import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  loginUser,
  logoutUser,
  fetchAllUsers,
  createUser,
  deleteUser,
} from "./AuthActions";

interface User {
  username: string;
}

interface AuthState {
  user: User | null;
  users: User[];
  token: string | null;
  message: string;
  newmessage: string;
  isSuccess: boolean;
  isLoading: boolean;
  isError: boolean;
  IsError: boolean;
}

const user = JSON.parse(localStorage.getItem("user"));

const initialState: AuthState = {
  user: user ? user : null,
  users: [],
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
        (state, action: PayloadAction<{ user: User; Token: string }>) => {
          state.isLoading = false;
          state.isSuccess = true;
          state.isError = false;
          state.message = "Login successful";
          state.user = action.payload;
          state.token = action.payload.Token;
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
      });
  },
});

export const { reset, resetMessage } = authSlice.actions;

export default authSlice.reducer;
