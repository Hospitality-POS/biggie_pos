import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { loginUser, logoutUser, fetchAllUsers } from "./AuthActions";

interface User {
  username: string;
}


interface AuthState {
  user: User | null;
  users: User[];
  token: string | null;
  message: string;
  isSuccess: boolean;
  isLoading: boolean;
  isError: boolean;
}

const user = JSON.parse(localStorage.getItem('user'));

const initialState: AuthState = {
  user: user ? user : null,
  users: [],
  token: null,
  message: "",
  isSuccess: false,
  isLoading: false,
  isError: false,
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
      });
  },
});

export const { reset } = authSlice.actions;

export default authSlice.reducer;
