import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { authSlice } from "./features/Auth/AuthSlice";

const rootReducer = combineReducers({
  auth: authSlice.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
});
