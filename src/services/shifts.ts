import axiosInstance from "./request"; // Import the axiosInstance
import { message } from "antd";

interface Shift {
  employee_id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

const shiftUrl = `/shifts`; // No need to repeat BASE_URL, it's already included in axiosInstance

// Fetch all shifts
export const fetchAllShifts = async () => {
  try {
    const response = await axiosInstance.get(shiftUrl);
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Failed to fetch shifts");
    }
    throw error;
  }
};

// Create a shift
export const createShift = async (shiftData: Shift) => {
  try {
    const response = await axiosInstance.post(shiftUrl, shiftData);
    // message.success("Shift created successfully");
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Failed to create shift");
    }
    throw error;
  }
};

// Update a shift
export const updateShift = async (shiftData: Shift) => {
  try {
    const response = await axiosInstance.put(`${shiftUrl}/${shiftData._id}`, shiftData);
    // message.success("Shift updated successfully");
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Failed to update shift");
    }
    throw error;
  }
};

// Delete a shift
export const deleteShift = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${shiftUrl}/${id}`);
    // message.success("Shift deleted successfully");
    return response.data;
  } catch (error) {
    if (error?.response?.status != 403) {
      message.error("Failed to delete shift");
    }
    throw error;
  }
};
