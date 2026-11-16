import { message } from 'antd';
import { axiosInstance, DALA_API_URL, getDalaHeaders } from '../../../services/client';
import type { PropertyType } from '../../../types';

export interface FetchPropertyTypesParams {
  page?: number;
  limit?: number;
  status?: string;
  shop_id?: string;
}

export const fetchPropertyTypes = async (params?: FetchPropertyTypesParams) => {
  try {
    let shopId = params?.shop_id;
    if (!shopId) {
      const tenantStr = localStorage.getItem('tenant');
      try {
        const tenant = JSON.parse(tenantStr || '{}');
        shopId = tenant.shop_id || '';
      } catch (error) {
        console.error('Error parsing tenant:', error);
      }
    }

    const response = await axiosInstance.get(`${DALA_API_URL}/property-types`, {
      params: {
        ...params,
        shop_id: shopId,
      },
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch property types:', error);
    throw error;
  }
};

export const createPropertyType = async (data: Partial<PropertyType>) => {
  try {
    let shopId = data.shop_id as string;
    if (!shopId) {
      shopId = localStorage.getItem('shopId') || '';
    }

    const dataWithIds = {
      ...data,
      shop_id: shopId,
    };

    const response = await axiosInstance.post(`${DALA_API_URL}/property-types`, dataWithIds, {
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to create property type';
    message.error(errorMessage);
    throw error;
  }
};

export const updatePropertyType = async (id: string, data: Partial<PropertyType>) => {
  try {
    const response = await axiosInstance.put(`${DALA_API_URL}/property-types/${id}`, data, {
      headers: getDalaHeaders(),
    });
    message.success('Property type updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to update property type';
    message.error(errorMessage);
    throw error;
  }
};

export const deletePropertyType = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${DALA_API_URL}/property-types/${id}`, {
      headers: getDalaHeaders(),
    });
    message.success('Property type deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error || 'Failed to delete property type';
    message.error(errorMessage);
    throw error;
  }
};
