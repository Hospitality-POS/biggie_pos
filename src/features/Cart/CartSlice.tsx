import { createSlice } from "@reduxjs/toolkit";
import {
  createCart,
  getCart,
  fetchCartItems,
  addItemToCart,
  updateCartItems,
} from "./CartActions";

interface CartDetails {
  table_id: string;
  created_by: string;
}

interface CartItem {
  cartId: string;
  productId: string;
  quantity: number;
}

interface CartState {
  cartDetails: CartDetails | null;
  cartItems: CartItem[];
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  cartDetails: null,
  cartItems: [],
  loading: false,
  error: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Add any synchronous reducers here if needed
  },
  extraReducers: (builder) => {
    builder
      .addCase(createCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCart.fulfilled, (state, action) => {
        state.loading = false;
        state.cartDetails = action.payload;
      })
      .addCase(createCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCart.fulfilled, (state, action) => {
        state.loading = false;
        state.cartItems = action.payload;
      })
      .addCase(getCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCartItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCartItems.fulfilled, (state, action) => {
        state.loading = false;
        state.cartItems = action.payload;
      })
      .addCase(fetchCartItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addItemToCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addItemToCart.fulfilled, (state, action) => {
        state.loading = false;
        state.cartItems.push(action.payload);
      })
      .addCase(addItemToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateCartItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCartItems.fulfilled, (state, action) => {
        state.loading = false;
         state.cartItems = action.payload;
      })
      .addCase(updateCartItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default cartSlice.reducer;
