import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CartItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
}

const initialState: CartItem[] = [];

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const { _id, price } = action.payload;
      const existingItem = state.find(item => item._id === _id);

      if (existingItem) {
        existingItem.quantity += 1;
        existingItem.price = price * existingItem.quantity;
      } else {
        state.push(action.payload);
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const existingItemIndex = state.findIndex(item => item._id === id);

      if (existingItemIndex !== -1) {
        const existingItem = state[existingItemIndex];

        if (existingItem.quantity > 1) {
          existingItem.quantity -= 1;
          existingItem.price = existingItem.price / existingItem.quantity;
        } else {
          state.splice(existingItemIndex, 1);
        }
      }
    },
    deleteItem: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const existingItemIndex = state.findIndex(item => item._id === id);

      if (existingItemIndex !== -1) {
        state.splice(existingItemIndex, 1);
      }
    },
    clearCart: () => initialState,
  },
});

export const { addItem, removeItem, clearCart, deleteItem } = cartSlice.actions;

export default cartSlice.reducer;
