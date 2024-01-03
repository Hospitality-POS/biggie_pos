import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  createLocation,
  createTable,
  deleteLocation,
  deleteTable,
  editLocation,
  fetchTableById,
  fetchTableByLocatedAt,
  fetchTables,
  updateTable,
} from "./TableActions";

interface Table {
  _id: string;
  name: string;
  locatedAt: string;
  served_by: string | null;
  cart_amount: number;
}

interface TableState {
  tables: Table[];
  tableData: Table;
  loading: boolean;
  error: string | null;
  isSuccess: boolean;
  newTableMessage: string;
  newTableMessageSucess: string;
  isError: boolean;
  isLocationError: boolean;
}

const initialState: TableState = {
  tables: [],
  tableData: {
    _id: "",
    name: "",
    locatedAt: "",
    served_by: null,
    cart_amount: 0,
  },
  loading: false,
  error: null,
  newTableMessage: "",
  newTableMessageSucess: "",
  isSuccess: false,
  isError: false,
  isLocationError: false
};

export const tableSlice = createSlice({
  name: "table",
  initialState,
  reducers: {
    reset: (state) => {
      state.loading = false;
      state.isSuccess = false;
      state.error = null;
    },
    resetTableMessage: (state) => {
      state.newTableMessage = "";
      state.newTableMessageSucess = "";
      state.isError = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTables.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchTables.fulfilled,
        (state, action: PayloadAction<Table[]>) => {
          state.loading = false;
          state.isSuccess = true;
          state.tables = action.payload;
        }
      )
      .addCase(fetchTables.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createTable.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTable.fulfilled, (state, action: PayloadAction<Table>) => {
        state.loading = false;
        state.isSuccess = true;
        state.isError = false;
        state.newTableMessageSucess = "Table created successfully";
        state.tables.push(action.payload);
      })
      .addCase(createTable.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isError = true;
        state.newTableMessage = "Failed to create new table!";
      })
      .addCase(updateTable.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTable.fulfilled, (state, action: PayloadAction<Table>) => {
        state.loading = false;
        state.isSuccess = true;
        const updatedTable = action.payload;
        const index = state.tables.findIndex((t) => t._id === updatedTable._id);
        if (index !== -1) {
          state.tables[index] = updatedTable;
        }
      })
      .addCase(updateTable.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteTable.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        deleteTable.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading = false;
          state.isSuccess = true;
          state.tables = state.tables.filter(
            (table) => table._id !== action.payload
          );
        }
      )
      .addCase(deleteTable.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTableById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchTableById.fulfilled,
        (state, action: PayloadAction<Table>) => {
          state.loading = false;
          state.isSuccess = true;
          state.tableData = action.payload;
        }
      )
      .addCase(fetchTableById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTableByLocatedAt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTableByLocatedAt.fulfilled, (state, action) => {
        state.loading = false;
        state.isSuccess = true;
        state.tables = action.payload;
      })
      .addCase(fetchTableByLocatedAt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createLocation.fulfilled, (state, _action: PayloadAction<Location>) => {
          state.loading = false;
          state.isSuccess = true;
          state.isLocationError = false;
          state.newTableMessageSucess = "Location created successfully";
          // If you need to update the state with the new location data, you can do it here.
        }
      )
      .addCase(createLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isLocationError = true;
        state.newTableMessage = "Failed to create new location!";
      })
      .addCase(editLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editLocation.fulfilled,(state) => {
          state.loading = false;
          state.isSuccess = true;
          state.isError = false;
          state.newTableMessageSucess = "Location edited successfully";
        }
      )
      .addCase(editLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isError = true;
        state.newTableMessage = "Failed to edit location!";
      })

      .addCase(deleteLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLocation.fulfilled,(state, action: PayloadAction<string>) => {
          state.loading = false;
          state.isSuccess = true;
          state.tables = state.tables.filter(
            (table) => table._id !== action.payload
          );
        }
      )
      .addCase(deleteLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isError = true;
        state.newTableMessage = "Failed to delete location!";
      });
  },
});

export const { reset, resetTableMessage } = tableSlice.actions;

export default tableSlice.reducer;
