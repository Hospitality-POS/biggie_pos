import { createAsyncThunk } from "@reduxjs/toolkit";
import SetBearerHeaderToken from "@utils/SetBearerHeaderToken";
import { BASE_URL } from "@utils/config";
import axios from "axios";
import { Shift } from "src/interfaces/ShiftTypes";

const { headers } = SetBearerHeaderToken()

const baseUrl = `${BASE_URL}/shifts`;



export const createShift = createAsyncThunk(
    "shift/createShift",
    async (shift: Shift, { rejectWithValue, dispatch }) => {
        try {
            const response = await axios.post(`${baseUrl}`, shift);
            dispatch(fetchShifts());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response.data.error || error.toString());
        }
    }
);

export const fetchShifts = createAsyncThunk(
    "shift/fetchShifts",
    async (_, { rejectWithValue }) => {
        try {

            const response = await axios.get(baseUrl);

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || error.toString());
        }
    }
);

export const updateShift = createAsyncThunk(
    "shift/updateShift",
    async (shift: Shift, { rejectWithValue, dispatch }) => {
        try {
            const response = await axios.put(`${baseUrl}/${shift._id}`, shift, {
                headers,
            });
            dispatch(fetchShifts());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || error.toString());
        }
    }
);


export const deleteShift = createAsyncThunk(
    "shift/deleteShift",
    async (shiftId: string, { rejectWithValue }) => {
        try {
            const userJSON = localStorage.getItem("user");
            let token = "";

            if (userJSON) {
                const userObject = JSON.parse(userJSON);
                token = userObject.Token;
            }

            const headers = {
                Authorization: `Bearer ${token}`,
            };

            await axios.delete(`${baseUrl}/${shiftId}`, { headers });
            return shiftId;
        } catch (error: any) {
            return rejectWithValue(error.message || error.toString());
        }
    }
);
