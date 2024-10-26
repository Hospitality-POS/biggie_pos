import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axios, { AxiosError } from "axios";

interface Shift {
  employee_id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

const shiftUrl = `${BASE_URL}/shifts`;

export const fetchAllShifts = async () => {
  try {
    const response = await axios.get(shiftUrl);
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    console.error("Error fetching shifts:", err.message);
    message.error("Failed to fetch shifts");
    throw err;
  }
};

export const createShift = async (shiftData: Shift) => {
  try {
    const response = await axios.post(shiftUrl, shiftData);
    message.success("Shift created successfully");
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    console.error("Error creating shift:", err.message);
    message.error("Failed to create shift");
    throw err;
  }
};

export const updateShift = async (shiftData: Shift) => {
  try {
    const response = await axios.put(`${shiftUrl}/${shiftData._id}`, shiftData);
    message.success("Shift updated successfully");
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    console.error("Error updating shift:", err.message);
    message.error("Failed to update shift");
    throw err;
  }
};

export const deleteShift = async (id: string) => {
  try {
    const response = await axios.delete(`${shiftUrl}/${id}`);
    message.success("Shift deleted successfully");
    return response.data;
  } catch (error: unknown) {
    const err = error as AxiosError;
    console.error("Error deleting shift:", err.message);
    message.error("Failed to delete shift");
    throw err;
  }
};