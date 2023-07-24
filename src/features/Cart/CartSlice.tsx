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
        existingItem.price += price;
      } else {
        state.unshift(action.payload);
      }
    },
    removeItem: (state, action: PayloadAction<CartItem>) => {
      const {_id, price} = action.payload;
      const existingItem = state.find(item => item._id === _id);

      if (existingItem) {
        if (existingItem.quantity > 1) {
          existingItem.quantity -= 1;
          existingItem.price -= price;
        } else {
          return state.filter(item => item._id !== _id);
        }
      }
    },
    deleteItem: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      return state.filter(item => item._id !== id);
    },
    clearCart: () => initialState,
  },
});

export const { addItem, removeItem, clearCart, deleteItem } = cartSlice.actions;

export default cartSlice.reducer;