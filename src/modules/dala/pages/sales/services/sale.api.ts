import { message } from 'antd';
import { axiosInstance, DALA_API_URL, getDalaHeaders } from '../../../services/client';
import type { PropertySale } from '../../../types';

export const fetchPropertySales = async (params?: {
  page?: number;
  limit?: number;
  property_id?: string;
  status?: string;
  agent_id?: string;
  customer_id?: string;
  start_date?: string;
  end_date?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/sales`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch property sales:', error);
    throw error;
  }
};

export const fetchSalesByCustomer = async (customerId: string, params?: any) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/sales`, {
      params: { customer_id: customerId, ...params },
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch sales by customer:', error);
    throw error;
  }
};

export const createPropertySale = async (data: Partial<PropertySale>) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/sales`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Property sale created successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to create property sale';
    message.error(errorMessage);
    throw error;
  }
};

export const updatePropertySale = async (id: string, data: Partial<PropertySale>) => {
  try {
    const response = await axiosInstance.put(`${DALA_API_URL}/sales/${id}`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Property sale updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to update property sale';
    message.error(errorMessage);
    throw error;
  }
};

export const deletePropertySale = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${DALA_API_URL}/sales/${id}`, {
      headers: getDalaHeaders(),
    });
    message.success('Property sale deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to delete property sale';
    message.error(errorMessage);
    throw error;
  }
};

export const fetchSalePayments = async (params?: any) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/sale-payments`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch sale payments:', error);
    throw error;
  }
};

export const recordSalePayment = async (data: any) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/sale-payments`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Sale payment recorded successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to record sale payment';
    message.error(errorMessage);
    throw error;
  }
};

export const reverseSalePayment = async (id: string, reversalReason?: string) => {
  try {
    const response = await axiosInstance.post(
      `${DALA_API_URL}/sale-payments/${id}/reverse`,
      { reversalReason },
      { headers: getDalaHeaders() }
    );
    message.success('Sale payment reversed successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to reverse sale payment';
    message.error(errorMessage);
    throw error;
  }
};

export const deleteSalePayment = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${DALA_API_URL}/sale-payments/${id}`, {
      headers: getDalaHeaders(),
    });
    message.success('Sale payment deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to delete sale payment';
    message.error(errorMessage);
    throw error;
  }
};
