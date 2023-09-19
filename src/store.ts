import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { authSlice } from "./features/Auth/AuthSlice";
import CartSlice from "./features/Cart/CartSlice";
import OrderSlice from "./features/Order/OrderSlice";
import ProductSlice from "./features/Product/ProductSlice";
import productInventorySlice from "./features/Inventory/product/productInventorySlice";
import SupplierSlice from "./features/Supplier/SupplierSlice";
import TableSlice from "./features/Table/TableSlice";
import CategorySlice from "./features/Category/CategorySlice";




const rootReducer = combineReducers({
  auth: authSlice.reducer,
  cart: CartSlice,
  order: OrderSlice,
  product: ProductSlice,
  productInventory: productInventorySlice,
  supplier: SupplierSlice,
  Tables: TableSlice,
  Categories: CategorySlice
});

export const store = configureStore({
  reducer: rootReducer,
});
