import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { authSlice } from "./features/Auth/AuthSlice";
import { cartSlice } from "./features/Cart/CartSlice";

const rootReducer = combineReducers({
  auth: authSlice.reducer,
  cart: cartSlice.reducer
});

export const store = configureStore({
  reducer: rootReducer,
});
