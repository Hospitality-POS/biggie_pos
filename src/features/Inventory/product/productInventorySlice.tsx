import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  getProductInventory,
  updateProductInventory,
  deleteProductInventory,
  fetchAllProductInventories,
  createProductInventory, // Import the new action
} from './productInventoryActions';

interface ProductInventory {
  _id: string;
  name: string;
  quantity: number;
  price: number;
  desc: string;
  category_id: string;
  min_viable_quantity: number;
}

interface ProductInventoryState {
  data: ProductInventory[] | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProductInventoryState = {
  data: [],
  loading: false,
  error: null,
};

const productInventorySlice = createSlice({
  name: 'productInventory',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchAllProductInventories.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllProductInventories.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAllProductInventories.rejected, (state, action) => {
        state.loading = false;
        state.data = null;
        state.error = action.payload as string;
      })
      .addCase(getProductInventory.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProductInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(getProductInventory.rejected, (state, action) => {
        state.loading = false;
        state.data = null;
        state.error = action.payload as string;
      })
      .addCase(updateProductInventory.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProductInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(updateProductInventory.rejected, (state, action) => {
        state.loading = false;
        state.data = null;
        state.error = action.payload as string;
      })
      .addCase(deleteProductInventory.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProductInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.data = null;
      })
      .addCase(deleteProductInventory.rejected, (state, action) => {
        state.loading = false;
        state.data = null;
        state.error = action.payload as string;
      })
      .addCase(createProductInventory.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProductInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(createProductInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default productInventorySlice.reducer;
