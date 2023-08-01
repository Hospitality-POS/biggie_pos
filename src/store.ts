import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { authSlice } from "./features/Auth/AuthSlice";
import CartSlice from "./features/Cart/CartSlice";


const rootReducer = combineReducers({
  auth: authSlice.reducer,
  cart: CartSlice
});

export const store = configureStore({
  reducer: rootReducer,
});
