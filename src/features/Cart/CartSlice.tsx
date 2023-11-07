import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  createCart,
  getCart,
  fetchCartItems,
  addItemToCart,
  updateCartItems,
  deleteCartItem,
  deleteAllCartItems,
  cartVoid,
  cartSent,
} from "./CartActions";


  
interface CartDetails {
  _id: string;
  table_id: {
    _id: string;
    name: string;
  };
  created_by: {
    _id: string;
    username: string;
  };
  items: string[];
  order_no: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}


interface CartItem {
  _id: string;
  name: string;
  cartId: string | undefined;
  productId: string;
  product_id: string;
  quantity: number;
}

interface CartState {
  cartDetails: CartDetails;
  cartItems: CartItem[];
  totalAmount: number;
  loading: boolean;
  error: string | null;
}

const initialState: CartState = {
cartDetails: {
    _id: '',
    table_id: {
      _id: '',
      name: '',
    },
    created_by: {
      _id: '',
      username: '',
    },
    items: [],
    order_no: '',
    status: '',
    createdAt: '',
    updatedAt: '',
    __v: 0,
  },
  cartItems: [],
  totalAmount: 0,
  loading: false,
  error: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      // Check if the item is already in the cart
      const existingItem = state.cartItems.find(
        (item) => item.productId === action.payload.productId
      );

      if (existingItem) {
        // If the item exists, increase its quantity
        existingItem.quantity += action.payload.quantity;
      } else {
        // If the item is not in the cart, add it
        state.cartItems.push(action.payload);
      }

      // Recalculate the total amount
      state.totalAmount = state.cartItems.reduce(
        (total, item: any) => total + parseFloat(item.price) * item.quantity,
        0
      );
    },
    subtractItem(state, action: PayloadAction<CartItem>) {
      // Find the item in the cart
      const existingItem = state.cartItems.find(
        (item) => item.productId === action.payload.productId
      );

      if (existingItem) {
        // Decrease the item's quantity, but ensure it's greater than zero
        if (existingItem.quantity > 1) {
          existingItem.quantity -= action.payload.quantity;
        } else {
          // If the quantity reaches zero or less, remove the item from the cart
          state.cartItems = state.cartItems.filter(
            (item) => item.productId !== action.payload.productId
          );
        }

        // Recalculate the total amount
        state.totalAmount = state.cartItems.reduce(
          (total, item: any) => total + parseFloat(item.price) * item.quantity,
          0
        );
      }
    },
    removeCartItem(state, action: PayloadAction<string>) {
      state.cartItems = state.cartItems.filter(
        (item) => item.productId !== action.payload
      );

      state.totalAmount = state.cartItems.reduce(
        (total, item: any) => total + parseFloat(item.price) * item.quantity,
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
      .addCase(createCart.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(getCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCart.fulfilled, (state, action) => {
        state.loading = false;
        state.cartDetails = action.payload;
        state.cartItems = action.payload.items

        // Calculate the total amount of all cart items using reduce
        state.totalAmount = action.payload.items.reduce(
          (total: any, item: any) =>
            total + parseFloat(item.price) * item.quantity,
          0
        );
      })
      .addCase(getCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchCartItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCartItems.fulfilled, (state, action) => {
        state.loading = false;
        state.cartItems = action.payload as any;
        // Calculate the total amount of all cart items using reduce
        state.totalAmount = action.payload.reduce(
          (total: any, item: any) => total + parseFloat(item.price||0),
          0
        );
      })
      .addCase(fetchCartItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(addItemToCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addItemToCart.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addItemToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateCartItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCartItems.fulfilled, (state, action) => {
        state.loading = false;
        const updatedData = action.payload;
        const index = state.cartItems.findIndex(
          (dataItem: { _id: boolean | string }) =>
            dataItem._id === updatedData._id
        );
        if (index !== -1) {
          state.cartItems[index] = updatedData;
        }
        // todo: make this a reducer
        state.totalAmount = state.cartItems.reduce(
          (total, item: any) => total + parseFloat(item.price),
          0
        );
      })
      .addCase(updateCartItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
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
          (total, item: any) => total + parseFloat(item.price),
          0
        );
      })
      .addCase(deleteCartItem.rejected, (state, action) => {
        state.error = action.error as string;
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
        state.error = action.payload as string;
      })
      .addCase(cartSent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cartSent.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(cartSent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(cartVoid.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cartVoid.fulfilled, (state) => {
        state.loading = false;
        // state.cartItems = [];
        // state.totalAmount = 0;
      })
      .addCase(cartVoid.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { removeCartItem, addItem, subtractItem } = cartSlice.actions;

export default cartSlice.reducer;
