import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Snapshot of a cart right after it was paid for, kept around purely so the
// bill can still be printed — deliberately independent of the live cart so
// that switching tables/pages or paying again never loses it. It only lives
// in memory (not persisted); the CartDrawer renders the print/close controls
// for it, and rebuilds the snapshot from cartDetails.pending_print if the
// page was refreshed in between.
export interface PaidCartSnapshot {
  cartDetails: any;
  data: any[];
  subtotal: number;
  totalVatAmount: number;
  grandTotal: number;
}

interface PendingPrintState {
  snapshot: PaidCartSnapshot | null;
}

const initialState: PendingPrintState = {
  snapshot: null,
};

const pendingPrintSlice = createSlice({
  name: "pendingPrint",
  initialState,
  reducers: {
    setPendingPrint(state, action: PayloadAction<PaidCartSnapshot>) {
      state.snapshot = action.payload;
    },
    clearPendingPrint(state) {
      state.snapshot = null;
    },
  },
});

export const { setPendingPrint, clearPendingPrint } = pendingPrintSlice.actions;
export default pendingPrintSlice.reducer;
