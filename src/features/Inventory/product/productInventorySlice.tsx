import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  getProductInventory,
  updateProductInventory,
  deleteProductInventory,
  fetchAllProductInventories,
  createProductInventory, 
} from "./productInventoryActions";

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
  data: ProductInventory[];
  loading: boolean;
  error: string | null;
  isSuccess: boolean;
}

const initialState: ProductInventoryState = {
  data: [],
  loading: false,
  error: null,
  isSuccess: false
};

const productInventorySlice = createSlice({
  name: "productInventory",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllProductInventories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllProductInventories.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAllProductInventories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(getProductInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProductInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(getProductInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateProductInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProductInventory.fulfilled, (state, action) => {
        state.loading = false;
        // state.data = action.payload;
        const updatedData = action.payload;
        const index = state.data.findIndex(
          (dataItem) => dataItem._id === updatedData._id
        );
        if (index !== -1) {
          state.data[index] = updatedData;
        }
      })
      .addCase(updateProductInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteProductInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProductInventory.fulfilled, (state, action) => {
        state.loading = false;
        const dataToDeleteId = action.payload;

        state.data = state.data.filter((item) => item._id !== dataToDeleteId);
      })
      .addCase(deleteProductInventory.rejected, (state, action) => {
        state.loading = false;

        state.error = action.payload as string;
      })
      .addCase(createProductInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProductInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.data.push(action.payload);
        state.isSuccess= true
      })
      .addCase(createProductInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isSuccess =false
      });
  },
});

export default productInventorySlice.reducer;
