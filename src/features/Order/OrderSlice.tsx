import { createSlice } from "@reduxjs/toolkit";
import { createOrder, deleteOrder, fetchOrders, fetchOrdersByDateRange, updateOrder } from "./OrderActions";

interface Order {
  table_id: string;
  created_by: string;
  order_no: string;
  order_amount: string;
  cart_id: string;
}

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  openModal: boolean;
}

const initialState: OrderState = {
  orders: [],
  loading: false,
  error: null,
  openModal: false,
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    closeModal(state) {
      state.openModal = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.openModal = true;
        state.orders.push(action.payload);
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.openModal = false;
        state.error = action.payload as string;
      })
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateOrder.fulfilled, (state, action) => {
        state.loading = false;
        const updatedOrder = action.payload;
        const index = state.orders.findIndex((order) => order._id === updatedOrder._id);
        if (index !== -1) {
          state.orders[index] = updatedOrder;
        }
      })
      .addCase(updateOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchOrdersByDateRange.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrdersByDateRange.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchOrdersByDateRange.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteOrder.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteOrder.fulfilled, (state, action) => {
        state.loading = false;
        const orderNoToDeleteId = action.payload;
        console.log(orderNoToDeleteId);
        
      state.orders = state.orders.filter((item) => item._id !== orderNoToDeleteId);
      })
      .addCase(deleteOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { closeModal } = orderSlice.actions;

export default orderSlice.reducer;
