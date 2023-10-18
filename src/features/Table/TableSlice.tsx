import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createTable, deleteTable, fetchTableById, fetchTableByLocatedAt, fetchTables, updateTable } from "./TableActions";


interface Table {
  _id: string;
  name: string;
  locatedAt: string;
  served_by: string | null;
  cart_amount: number
}

interface TableState {
  tables: Table[];
  tableData: Table;
  loading: boolean;
  error: string | null;
  isSuccess: boolean;
  newTableMessage: string;
  isError: boolean;
}

const initialState: TableState = {
  tables: [],
  tableData: {
    _id: '',
    name: '',
    locatedAt: '',
    served_by: null,
    cart_amount: 0
  },
  loading: false,
  error: null,
  newTableMessage: "",
  isSuccess: false,
  isError: false,
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
      .addCase(
        createTable.fulfilled,
        (state, action: PayloadAction<Table>) => {
          state.loading = false;
          state.isSuccess = true;
          state.isError = false;
          state.newTableMessage = "Table created successfully";
          state.tables.push(action.payload);
        }
      )
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
      .addCase(
        updateTable.fulfilled,
        (state, action: PayloadAction<Table>) => {
          state.loading = false;
          state.isSuccess = true;
          const updatedTable = action.payload;
          const index = state.tables.findIndex(
            (t) => t._id === updatedTable._id
          );
          if (index !== -1) {
            state.tables[index] = updatedTable;
          }
        }
      )
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
      .addCase(
        fetchTableByLocatedAt.fulfilled,
        (state, action) => {
          state.loading = false;
          state.isSuccess = true;
          state.tables = action.payload;
        }
      )
      .addCase(fetchTableByLocatedAt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { reset, resetTableMessage } = tableSlice.actions;

export default tableSlice.reducer;