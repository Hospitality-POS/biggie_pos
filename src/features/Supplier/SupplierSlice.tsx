import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  createSupplier,
  deleteSupplier,
  fetchSuppliers,
  updateSupplier,
} from "./SupplierActions";

interface Supplier {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

interface SupplierState {
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  isSuccess: boolean;
  newsuppliermessage: string;
  IsError: boolean;
}

const initialState: SupplierState = {
  suppliers: [],
  loading: false,
  error: null,
  newsuppliermessage: "",
  isSuccess: false,
  IsError: false,
};

export const supplierSlice = createSlice({
  name: "supplier",
  initialState,
  reducers: {
    reset: (state) => {
      state.loading = false;
      state.isSuccess = false;
      state.error = null;
    },
    resetSupplierMessage: (state) => {
      state.newsuppliermessage = "";
      state.IsError = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuppliers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchSuppliers.fulfilled,
        (state, action: PayloadAction<Supplier[]>) => {
          state.loading = false;
          state.isSuccess = true;
          state.suppliers = action.payload;
        }
      )
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createSupplier.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        createSupplier.fulfilled,
        (state, action: PayloadAction<Supplier>) => {
          state.loading = false;
          state.isSuccess = true;
          state.IsError = false;
          state.newsuppliermessage = "Suppier created successfully";
          state.suppliers.push(action.payload);
        }
      )
      .addCase(createSupplier.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.IsError = true;
        state.newsuppliermessage = "Failed to create new Supplier!";
      })
      .addCase(updateSupplier.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateSupplier.fulfilled,
        (state, action: PayloadAction<Supplier>) => {
          state.loading = false;
          state.isSuccess = true;
          const updatedSupplier = action.payload;
          const index = state.suppliers.findIndex(
            (s) => s._id === updatedSupplier._id
          );
          if (index !== -1) {
            state.suppliers[index] = updatedSupplier;
          }
        }
      )
      .addCase(updateSupplier.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteSupplier.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        deleteSupplier.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading = false;
          state.isSuccess = true;
          state.suppliers = state.suppliers.filter(
            (supplier) => supplier._id !== action.payload
          );
        }
      )
      .addCase(deleteSupplier.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { reset, resetSupplierMessage } = supplierSlice.actions;

export default supplierSlice.reducer;
