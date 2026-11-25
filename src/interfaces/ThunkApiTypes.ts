import type { AsyncThunkPayloadCreator } from "@reduxjs/toolkit";

/** The thunk API object that createAsyncThunk passes to a payload creator. */
export type ThunkApi = Parameters<AsyncThunkPayloadCreator<unknown, unknown>>[1];
