import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createPaymentMethod, deletePaymentMethod, fetchPaymentsMethod, updatePaymentMethod } from "./PaymentMethodActions";


interface Payment {
  _id: string;
  name: string;
}

interface PaymentMethodState {
  payments: Payment[];
  loading: boolean;
  error: string | null;
  isSuccess: boolean;
  newPaymentMessage: string;
  isError: boolean;
}

const initialState: PaymentMethodState = {
  payments: [],
  loading: false,
  error: null,
  newPaymentMessage: "",
  isSuccess: false,
  isError: false,
};

export const paymentMethodSlice = createSlice({
  name: "paymentMethod",
  initialState,
  reducers: {
    reset: (state) => {
      state.loading = false;
      state.isSuccess = false;
      state.error = null;
    },
    resetPaymentMessage: (state) => {
      state.newPaymentMessage = "";
      state.isError = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPaymentsMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchPaymentsMethod.fulfilled,
        (state, action: PayloadAction<Payment[]>) => {
          state.loading = false;
          state.isSuccess = true;
          state.payments = action.payload;
        }
      )
      .addCase(fetchPaymentsMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createPaymentMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        createPaymentMethod.fulfilled,
        (state, action: PayloadAction<Payment>) => {
          state.loading = false;
          state.isSuccess = true;
          state.isError = false;
          state.newPaymentMessage = "Payment method created successfully";
          state.payments.push(action.payload);
        }
      )
      .addCase(createPaymentMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isError = true;
        state.newPaymentMessage = "Failed to create new payment method!";
      })
      .addCase(updatePaymentMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updatePaymentMethod.fulfilled,
        (state, action: PayloadAction<Payment>) => {
          state.loading = false;
          state.isSuccess = true;
          const updatedPayment = action.payload;
          const index = state.payments.findIndex(
            (p) => p._id === updatedPayment._id
          );
          if (index !== -1) {
            state.payments[index] = updatedPayment;
          }
        }
      )
      .addCase(updatePaymentMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deletePaymentMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        deletePaymentMethod.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading = false;
          state.isSuccess = true;
          state.payments = state.payments.filter(
            (payment) => payment._id !== action.payload
          );
        }
      )
      .addCase(deletePaymentMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { reset, resetPaymentMessage } = paymentMethodSlice.actions;

export default paymentMethodSlice.reducer;