import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { authSlice } from "./features/Auth/AuthSlice";
import CartSlice from "./features/Cart/CartSlice";
import OrderSlice from "./features/Order/OrderSlice";
import ProductSlice from "./features/Product/ProductSlice";


const rootReducer = combineReducers({
  auth: authSlice.reducer,
  cart: CartSlice,
  order: OrderSlice,
  product: ProductSlice
});

export const store = configureStore({
  reducer: rootReducer,
});
