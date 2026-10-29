import { message } from 'antd';
import { axiosInstance, DALA_API_URL, getDalaHeaders } from '../../../services/client';
import type { Lease } from '../../../types';

export interface FetchLeasesParams {
  page?: number;
  limit?: number;
  propertyId?: string;
  status?: string;
  occupantId?: string;
  shop_id?: string;
  startDate?: string;
  endDate?: string;
}

export const fetchLeases = async (params?: FetchLeasesParams) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/leases`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch leases:', error);
    throw error;
  }
};

export const fetchLease = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/leases/${id}`, {
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch lease:', error);
    throw error;
  }
};

export const createLease = async (data: Partial<Lease> | any) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/leases`, data, {
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to create lease';
    message.error(errorMessage);
    throw error;
  }
};

export const updateLease = async (id: string, data: Partial<Lease>) => {
  try {
    const response = await axiosInstance.put(`${DALA_API_URL}/leases/${id}`, data, {
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to update lease';
    message.error(errorMessage);
    throw error;
  }
};

export const deleteLease = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${DALA_API_URL}/leases/${id}`, {
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to delete lease';
    message.error(errorMessage);
    throw error;
  }
};

export const activateLease = async (id: string) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/leases/${id}/activate`, {}, {
      headers: getDalaHeaders(),
    });
    message.success('Lease activated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to activate lease';
    message.error(errorMessage);
    throw error;
  }
};

export const noticeLease = async (id: string, data: { noticeDate?: string; vacateDate?: string }) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/leases/${id}/notice`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Notice period set successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to set notice period';
    message.error(errorMessage);
    throw error;
  }
};

export const terminateLease = async (id: string, data: { terminationDate?: string; terminationReason?: string }) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/leases/${id}/terminate`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Lease terminated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to terminate lease';
    message.error(errorMessage);
    throw error;
  }
};

export const renewLease = async (id: string, data: { startDate: string; endDate?: string; leaseAmount?: number }) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/leases/${id}/renew`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Lease renewed successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to renew lease';
    message.error(errorMessage);
    throw error;
  }
};
