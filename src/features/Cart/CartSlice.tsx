import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  createCart,
  getCart,
  fetchCartItems,
  addItemToCart,
  updateCartItems,
  deleteCartItem,
  deleteAllCartItems,
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
  totalAmount: number; // New field to store the total amount of all cart items
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
  cartDetails: null,
  cartItems: [],
  totalAmount: 0,
  loading: false,
  error: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    removeCartItem(state, action: PayloadAction<string>) {
      state.cartItems = state.cartItems.filter(
        (item) => item._id !== action.payload
      );

      state.totalAmount = state.cartItems.reduce(
        (total, item) => total + parseFloat(item.price),
        0
      );
    },
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
        // Calculate the total amount of all cart items using reduce
        state.totalAmount = action.payload.reduce(
          (total, item) => total + parseFloat(item.price) * item.quantity,
          0
        );
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
        // Calculate the total amount of all cart items using reduce
        state.totalAmount = action.payload.reduce(
          (total, item) => total + parseFloat(item.price),
          0
        );
        
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
        const updatedData = action.payload;
        const index = state.cartItems.findIndex(
          (dataItem) => dataItem._id === updatedData._id
        );
        if (index !== -1) {
          state.cartItems[index] = updatedData;
        }
        // todo: make this a reducer
        state.totalAmount = state.cartItems.reduce(
          (total, item) => total + parseFloat(item.price),
          0
        );
      })
      .addCase(updateCartItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteCartItem.fulfilled, (state, action) => {
        state.loading = false;
        const deletedItemId = action.payload._id;
        const deletedItemIndex = state.cartItems.findIndex(
          (item) => item._id === deletedItemId
        );

        if (deletedItemIndex !== -1) {
          state.cartItems.splice(deletedItemIndex, 1);
        }
        
        state.totalAmount = state.cartItems.reduce(
          (total, item) => total + parseFloat(item.price),
          0
        );
      })
      .addCase(deleteCartItem.rejected, (state, action) => {
        state.error = action.error;
      })
      .addCase(deleteAllCartItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAllCartItems.fulfilled, (state) => {
        state.loading = false;
        state.cartItems = [];
        state.totalAmount = 0;
      })
      .addCase(deleteAllCartItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { removeCartItem } = cartSlice.actions;

export default cartSlice.reducer;
