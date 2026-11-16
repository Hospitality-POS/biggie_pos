import { message } from 'antd';
import { axiosInstance, BANDU_API_URL } from '../../../services/client';

export const initializeDeductionSettings = async () => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/deduction-settings/initialize`);
    message.success(response.data?.message || 'Default statutory deductions configured');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to initialize deduction settings';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchDeductionConfigs = async () => {
  const response = await axiosInstance.get(`${BANDU_API_URL}/deduction-settings`);
  return (response.data?.data || []) as any[];
};

export const deleteDeductionConfig = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${BANDU_API_URL}/deduction-settings/${id}`);
    message.success('Deduction removed');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete deduction';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const saveDeductionSettings = async (settings: any) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/deduction-settings`, settings);
    message.success('Deduction settings saved successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save deduction settings';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};
