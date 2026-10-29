import { message } from 'antd';
import { axiosInstance } from '../../../services/client';
import type { Shift } from '../../../types';

const shiftUrl = '/shifts';

export const fetchAllShifts = async () => {
  try {
    const response = await axiosInstance.get(shiftUrl);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 403) {
      message.error('Failed to fetch shifts');
    }
    throw error;
  }
};

export const createShift = async (shiftData: Shift) => {
  try {
    const response = await axiosInstance.post(shiftUrl, shiftData);
    message.success('Shift created successfully');
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 403) {
      message.error('Failed to create shift');
    }
    throw error;
  }
};

export const updateShift = async (shiftData: Shift) => {
  try {
    const response = await axiosInstance.put(`${shiftUrl}/${shiftData._id}`, shiftData);
    message.success('Shift updated successfully');
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 403) {
      message.error('Failed to update shift');
    }
    throw error;
  }
};

export const deleteShift = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${shiftUrl}/${id}`);
    message.success('Shift deleted successfully');
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 403) {
      message.error('Failed to delete shift');
    }
    throw error;
  }
};
