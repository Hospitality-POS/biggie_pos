import { createAsyncThunk } from "@reduxjs/toolkit";
import axios, { AxiosResponse } from "axios";


//  todo: api_Config.ts export apis

const baseUrl = "http://localhost:3000/tables";

// Define the types for your supplier data
interface Location{
  locationName: string;
  _id: string;
  name: string;
}
interface table extends Location {
  locatedAt: string;
}
// Function to get the token from localStorage
const getToken = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user ? user.Token : null;
};
  
// Create an async thunk to fetch all suppliers
export const fetchTables = createAsyncThunk(
  "table/fetchTables",
  async (_, { rejectWithValue }) => {
    try {
      const response: AxiosResponse<unknown, unknown>= await axios.get(`${baseUrl}`)
      return response.data;
    } catch (error:any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to create a new supplier
export const createTable = createAsyncThunk(
  "table/createTable",
  async (newTable: table, { rejectWithValue, dispatch }) => {
    const token = getToken(); // Get the token
    try {
      const response = await axios.post(`${baseUrl}`, newTable, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      dispatch(fetchTables())
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to update an existing supplier
export const updateTable = createAsyncThunk(
  "table/updateTable",
  async (updatedTable: table, { rejectWithValue }) => {
    const token = getToken(); // Get the token
    try {
      const response: AxiosResponse<unknown, unknown> = await axios.put(
        `${baseUrl}/${updatedTable._id}`,
        updatedTable,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to delete a supplier
export const deleteTable = createAsyncThunk(
  "table/deleteTable",
  async (tableId: string, { rejectWithValue, dispatch }) => {
    const token = getToken(); // Get the token
    try {
      const response: AxiosResponse<unknown, unknown> = await axios.delete(`${baseUrl}/${tableId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      dispatch(fetchTables())
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to fetch a table by ID
export const fetchTableById = createAsyncThunk(
  "table/fetchTableById",
  async (tableId: string, { rejectWithValue }) => {
    try {
      const response: AxiosResponse<unknown, unknown> = await axios.get(`${baseUrl}/${tableId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);


// Create an async thunk to fetch a table by ID
export const fetchTableByLocatedAt = createAsyncThunk(
  "table/fetchTableByLocatedAt",
  async (locatedAt: string, { rejectWithValue }) => {
    try {
      const response: AxiosResponse<unknown, unknown> = await axios.get(`${baseUrl}/locatedAt/${locatedAt}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);


// Create an async thunk to create a new location
export const createLocation = createAsyncThunk(
  "table/createLocation",
  async (newLocation: Location, { rejectWithValue }) => {
    try {
      const response: AxiosResponse<unknown, unknown> = await axios.post(`${baseUrl}/locations`,{ "locationName":newLocation});
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);


// Create an async thunk to edit an existing location
export const editLocation = createAsyncThunk(
  "table/editLocation",
  async (editedLocation: Location, { rejectWithValue }) => {
    try {
      const response: AxiosResponse<unknown, unknown> = await axios.put(
        `${baseUrl}/locations/${editedLocation._id}`,
        { "locationName": editedLocation.locationName }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);

// Create an async thunk to delete a location
export const deleteLocation = createAsyncThunk(
  "table/deleteLocation",
  async (locationId: string, { rejectWithValue }) => {
    try {
      const response: AxiosResponse<unknown, unknown> = await axios.delete(`${baseUrl}/locations/${locationId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || error.toString());
    }
  }
);
