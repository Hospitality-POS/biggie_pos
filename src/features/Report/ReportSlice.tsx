import { createSlice } from "@reduxjs/toolkit";
import { generateDeliveryReport, generatePurchaseReport, generateSalesReport, generateVoidedReport, generateInventoryUsageReport } from "./reportActions";

interface ReportState {
  salesReport: any;
  voidedReport: any;
  purchaseReport: any;
  deliveryReport: any;
  loading: boolean;
  error: string | null;
}

const initialState: ReportState = {
  salesReport: null,
  voidedReport: null,
  purchaseReport: null,
  deliveryReport: null,
  loading: false,
  error: null,
};

const reportSlice = createSlice({
  name: "report",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(generateSalesReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateSalesReport.fulfilled, (state, action) => {
        state.loading = false;
        state.salesReport = action.payload;
      })
      .addCase(generateSalesReport.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(generateVoidedReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateVoidedReport.fulfilled, (state, action) => {
        state.loading = false;
        state.voidedReport = action.payload;
      })
      .addCase(generateVoidedReport.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(generatePurchaseReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generatePurchaseReport.fulfilled, (state, action) => {
        state.loading = false;
        state.purchaseReport = action.payload;
      })
      .addCase(generatePurchaseReport.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(generateDeliveryReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateDeliveryReport.fulfilled, (state, action) => {
        state.loading = false;
        state.deliveryReport = action.payload;
      })
      .addCase(generateDeliveryReport.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(generateInventoryUsageReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateInventoryUsageReport.fulfilled, (state, action) => {
        state.loading = false;
        state.deliveryReport = action.payload;
      })
      .addCase(generateInventoryUsageReport.rejected, (state, action: any) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default reportSlice.reducer;