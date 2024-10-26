import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createShift, deleteShift, fetchShifts, updateShift } from "./ShiftActions";


interface Shift {
    _id: string;
    employee_id: string;
    day: string,
    time: {
        start: moment.Moment; // Make sure to reflect the structure
        end: moment.Moment;
    };
}

interface ShiftState {
    shifts: Shift[];
    loading: boolean;
    error: string | null;
    isSuccess: boolean;
    newPaymentMessage: string;
    isError: boolean;
}

const initialState: ShiftState = {
    shifts: [],
    loading: false,
    error: null,
    newPaymentMessage: "",
    isSuccess: false,
    isError: false,
};

export const shiftSlice = createSlice({
    name: "shift",
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
            .addCase(fetchShifts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(
                fetchShifts.fulfilled,
                (state, action: PayloadAction<Shift[]>) => {
                    console.log('Fetched shifts:', action.payload);
                    state.loading = false;
                    state.isSuccess = true;
                    state.shifts = action.payload;
                }
            )
            .addCase(fetchShifts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(createShift.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(
                createShift.fulfilled,
                (state, action: PayloadAction<Shift>) => {
                    state.loading = false;
                    state.isSuccess = true;
                    state.isError = false;
                    state.newPaymentMessage = "shift created successfully";
                    state.shifts.push(action.payload);
                }
            )
            .addCase(createShift.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.isError = true;
                state.newPaymentMessage = "Failed to create new payment method!";
            })
            .addCase(updateShift.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(
                updateShift.fulfilled,
                (state, action: PayloadAction<Shift>) => {
                    state.loading = false;
                    state.isSuccess = true;
                    const updatedPayment = action.payload;
                    const index = state.shifts.findIndex(
                        (p) => p._id === updatedPayment._id
                    );
                    if (index !== -1) {
                        state.shifts[index] = updatedPayment;
                    }
                }
            )
            .addCase(updateShift.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(deleteShift.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(
                deleteShift.fulfilled,
                (state, action: PayloadAction<string>) => {
                    state.loading = false;
                    state.isSuccess = true;
                    state.shifts = state.shifts.filter(
                        (shift) => shift._id !== action.payload
                    );
                }
            )
            .addCase(deleteShift.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export default shiftSlice.reducer;