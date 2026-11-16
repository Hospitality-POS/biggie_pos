import { message } from 'antd';
import { axiosInstance, DALA_API_URL, getDalaHeaders } from '../../../services/client';
import type { Unit } from '../../../types';

export interface FetchUnitsParams {
  property_id?: string;
  block_id?: string;
  floor_id?: string;
  status?: string;
  type?: string;
}

export const fetchUnits = async (params?: FetchUnitsParams) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/units`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch units:', error);
    throw error;
  }
};

export const fetchUnit = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/units/${id}`, {
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch unit:', error);
    throw error;
  }
};

export const createUnit = async (data: Partial<Unit>) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/units`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Unit created successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to create unit';
    message.error(errorMessage);
    throw error;
  }
};

export const updateUnit = async (id: string, data: Partial<Unit>) => {
  try {
    const response = await axiosInstance.put(`${DALA_API_URL}/units/${id}`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Unit updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to update unit';
    message.error(errorMessage);
    throw error;
  }
};

export const deleteUnit = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${DALA_API_URL}/units/${id}`, {
      headers: getDalaHeaders(),
    });
    message.success('Unit deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to delete unit';
    message.error(errorMessage);
    throw error;
  }
};
