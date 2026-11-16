/**
 * Legacy CRM Lead Activities service adapter
 * Forwards to canonical feature-sliced Mteja module services and types
 */

import { BASE_URL } from '@utils/config';
import { message } from 'antd';
import axiosInstance from '../request';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { LeadActivity, CreateActivityPayload } from '@modules/mteja/pages/calendar/services';

export * from '@modules/mteja/types';
export * from '@modules/mteja/pages/calendar/services';

const BASE = `${BASE_URL}/api/crm/lead-activities`;

// Legacy Redux thunks maintained for backward compatibility
export const createLeadActivity = createAsyncThunk(
  'leadActivities/create',
  async (
    data: CreateActivityPayload,
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(BASE, data);
      message.success('Activity logged successfully');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to log activity';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateLeadActivity = createAsyncThunk(
  'leadActivities/update',
  async (
    { id, data }: { id: string; data: Partial<LeadActivity> },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.put(`${BASE}/${id}`, data);
      message.success('Activity updated successfully');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update activity';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteLeadActivity = createAsyncThunk(
  'leadActivities/delete',
  async (
    { id, shop_id }: { id: string; shop_id?: string },
    { rejectWithValue }
  ) => {
    try {
      await axiosInstance.delete(`${BASE}/${id}`, { params: shop_id ? { shop_id } : undefined });
      message.success('Activity deleted successfully');
      return id;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to delete activity';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);