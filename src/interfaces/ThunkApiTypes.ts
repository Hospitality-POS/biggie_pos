import { Dispatch } from "@reduxjs/toolkit";

export interface ThunkApi {
  dispatch: Dispatch<Action<any>>;
  rejectWithValue<T>(value: T): RejectWithValue<T>;
}