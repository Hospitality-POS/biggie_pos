import { message } from 'antd';
import { axiosInstance, DALA_API_URL, getDalaHeaders } from '../../../services/client';
import type { Property, Block, Floor } from '../../../types';

export const fetchProperties = async (populate = true) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/properties`, {
      headers: getDalaHeaders(),
      params: { populate },
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch properties:', error);
    throw error;
  }
};

export const fetchProperty = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/properties/${id}`, {
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch property:', error);
    throw error;
  }
};

export const createProperty = async (data: Partial<Property>) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/properties`, data, {
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to create property';
    message.error(errorMessage);
    throw error;
  }
};

export const updateProperty = async (id: string, data: Partial<Property>) => {
  try {
    const response = await axiosInstance.put(`${DALA_API_URL}/properties/${id}`, data, {
      headers: getDalaHeaders(),
      params: { populate: false },
    });
    message.success('Property updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to update property';
    message.error(errorMessage);
    throw error;
  }
};

export const deleteProperty = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${DALA_API_URL}/properties/${id}`, {
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to delete property';
    message.error(errorMessage);
    throw error;
  }
};

export const importProperties = async (data: { properties: Partial<Property>[] }) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/properties/import`, data, {
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to import properties';
    message.error(errorMessage);
    throw error;
  }
};

// ── Blocks API ──────────────────────────────────────────────────────────────

export const fetchBlocks = async (property_id?: string) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/blocks`, {
      params: { property_id },
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch blocks:', error);
    throw error;
  }
};

export const createBlock = async (data: Partial<Block>) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/blocks`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Block created successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to create block';
    message.error(errorMessage);
    throw error;
  }
};

export const updateBlock = async (id: string, data: Partial<Block>) => {
  try {
    const response = await axiosInstance.put(`${DALA_API_URL}/blocks/${id}`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Block updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to update block';
    message.error(errorMessage);
    throw error;
  }
};

export const deleteBlock = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${DALA_API_URL}/blocks/${id}`, {
      headers: getDalaHeaders(),
    });
    message.success('Block deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to delete block';
    message.error(errorMessage);
    throw error;
  }
};

// ── Floors API ──────────────────────────────────────────────────────────────

export const fetchFloors = async (block_id?: string) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/floors`, {
      params: { block_id },
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch floors:', error);
    throw error;
  }
};

export const createFloor = async (data: Partial<Floor>) => {
  try {
    const response = await axiosInstance.post(`${DALA_API_URL}/floors`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Floor created successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to create floor';
    message.error(errorMessage);
    throw error;
  }
};

export const updateFloor = async (id: string, data: Partial<Floor>) => {
  try {
    const response = await axiosInstance.put(`${DALA_API_URL}/floors/${id}`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Floor updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to update floor';
    message.error(errorMessage);
    throw error;
  }
};

export const deleteFloor = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${DALA_API_URL}/floors/${id}`, {
      headers: getDalaHeaders(),
    });
    message.success('Floor deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to delete floor';
    message.error(errorMessage);
    throw error;
  }
};
