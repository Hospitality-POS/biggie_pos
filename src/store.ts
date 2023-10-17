import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { authSlice } from "./features/Auth/AuthSlice";
import CartSlice from "./features/Cart/CartSlice";
import OrderSlice from "./features/Order/OrderSlice";
import ProductSlice from "./features/Product/ProductSlice";
import productInventorySlice from "./features/Inventory/product/productInventorySlice";
import SupplierSlice from "./features/Supplier/SupplierSlice";
import TableSlice from "./features/Table/TableSlice";
import CategorySlice from "./features/Category/CategorySlice";
import PaymentMethodSlice from "./features/Payment/PaymentMethodSlice";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";




const rootReducer = combineReducers({
  auth: authSlice.reducer,
  cart: CartSlice,
  order: OrderSlice,
  product: ProductSlice,
  productInventory: productInventorySlice,
  supplier: SupplierSlice,
  Tables: TableSlice,
  Categories: CategorySlice,
  PaymentMethods: PaymentMethodSlice
});

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState> 

type AppDispatch = typeof store.dispatch
export const useAppDispatch: ()=> AppDispatch = useDispatch;

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;