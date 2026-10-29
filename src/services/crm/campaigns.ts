/**
 * Legacy CRM Campaigns service adapter
 * Forwards to canonical feature-sliced Mteja module services and types
 */

import { BASE_URL } from '@utils/config';
import { message } from 'antd';
import axiosInstance from '../request';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { Campaign, CampaignStatus } from '@modules/mteja/types';

export * from '@modules/mteja/types';
export * from '@modules/mteja/pages/campaigns/services';

const BASE = `${BASE_URL}/api/crm/campaigns`;

// Legacy Redux thunks maintained for backward compatibility
export const createCampaign = createAsyncThunk(
  'campaigns/create',
  async (
    data: Partial<Campaign> & { name: string; shop_id: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(BASE, data);
      message.success('Campaign created successfully');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create campaign';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateCampaign = createAsyncThunk(
  'campaigns/update',
  async (
    { id, data }: { id: string; data: Partial<Campaign> & { shop_id: string } },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.put(`${BASE}/${id}`, data);
      message.success('Campaign updated successfully');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update campaign';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteCampaign = createAsyncThunk(
  'campaigns/delete',
  async (
    { id, shop_id }: { id: string; shop_id: string },
    { rejectWithValue }
  ) => {
    try {
      await axiosInstance.delete(`${BASE}/${id}`, { params: { shop_id } });
      message.success('Campaign deleted successfully');
      return id;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to delete campaign';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateCampaignStatus = createAsyncThunk(
  'campaigns/updateStatus',
  async (
    { id, shop_id, status }: { id: string; shop_id: string; status: CampaignStatus },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(`${BASE}/${id}/status`, {
        shop_id,
        status,
      });
      message.success(`Status updated to '${status}'`);
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update status';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);