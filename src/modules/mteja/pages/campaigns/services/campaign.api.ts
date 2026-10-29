import { message } from 'antd';
import type { ParamsType } from '@ant-design/pro-components';
import { axiosInstance } from '../../../services/client';
import { BASE_URL } from '@utils/config';
import type {
  Campaign,
  CampaignStatus,
  CampaignListResponse,
  FetchCampaignsParams,
} from '../../../types';

const BASE = `${BASE_URL}/api/crm/campaigns`;

export const fetchAllCampaigns = async (
  params: FetchCampaignsParams = {}
): Promise<CampaignListResponse> => {
  try {
    const response = await axiosInstance.get(BASE, { params });
    return response.data;
  } catch (error: any) {
    message.error(error?.response?.data?.message || 'Failed to fetch campaigns');
    return { total: 0, page: 1, pages: 0, campaigns: [] };
  }
};

export const fetchCampaigns = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(BASE, { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch campaigns');
    return { data: [], total: 0 };
  }
};

export const getCampaignById = async (
  id: string,
  shop_id?: string
): Promise<Campaign | null> => {
  try {
    const response = await axiosInstance.get(`${BASE}/${id}`, {
      params: shop_id ? { shop_id } : undefined,
    });
    return response.data?.campaign || response.data?.data || response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to fetch campaign';
    message.error(msg);
    throw new Error(msg);
  }
};

export const fetchCampaignById = getCampaignById;

export const createCampaign = async (data: Partial<Campaign>) => {
  try {
    const response = await axiosInstance.post(BASE, data);
    message.success('Campaign created successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create campaign';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateCampaign = async (id: string, data: Partial<Campaign>) => {
  try {
    const response = await axiosInstance.put(`${BASE}/${id}`, data);
    message.success('Campaign updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update campaign';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const deleteCampaign = async (id: string, shop_id?: string) => {
  try {
    const response = await axiosInstance.delete(`${BASE}/${id}`, {
      params: shop_id ? { shop_id } : undefined,
    });
    message.success('Campaign deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete campaign';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateCampaignStatus = async (id: string, status: CampaignStatus, shop_id?: string) => {
  try {
    const response = await axiosInstance.patch(`${BASE}/${id}/status`, { status, shop_id });
    message.success('Campaign status updated');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update status';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};
