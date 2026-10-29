/**
 * Legacy CRM Sales Targets service adapter
 * Forwards to canonical feature-sliced Mteja module services and types
 */

import { BASE_URL } from '@utils/config';
import { message } from 'antd';
import axiosInstance from '../request';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { SalesTarget, TargetMilestone } from '@modules/mteja/types';

export * from '@modules/mteja/types';
export * from '@modules/mteja/pages/targets/services';

const BASE = `${BASE_URL}/api/crm/sales-targets`;

// Legacy Redux thunks maintained for backward compatibility
export const createSalesTarget = createAsyncThunk(
  'salesTargets/create',
  async (
    data: Partial<SalesTarget> & { name: string; target_value: number; period_start: string; period_end: string; shop_id: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(BASE, data);
      message.success('Target created successfully');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create target';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateSalesTarget = createAsyncThunk(
  'salesTargets/update',
  async (
    { id, data }: { id: string; data: Partial<SalesTarget> & { shop_id: string } },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.put(`${BASE}/${id}`, data);
      message.success('Target updated successfully');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update target';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteSalesTarget = createAsyncThunk(
  'salesTargets/delete',
  async (
    { id, shop_id }: { id: string; shop_id: string },
    { rejectWithValue }
  ) => {
    try {
      await axiosInstance.delete(`${BASE}/${id}`, { params: { shop_id } });
      message.success('Target deleted successfully');
      return id;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to delete target';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateMilestones = createAsyncThunk(
  'salesTargets/updateMilestones',
  async (
    {
      id,
      shop_id,
      milestones,
    }: { id: string; shop_id: string; milestones: TargetMilestone[] },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(`${BASE}/${id}/milestones`, {
        shop_id,
        milestones,
      });
      message.success('Milestones updated');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update milestones';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const recalculateTargetActual = createAsyncThunk(
  'salesTargets/recalculate',
  async (
    { id, shop_id }: { id: string; shop_id: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(`${BASE}/${id}/recalculate`, {
        shop_id,
      });
      message.success('Actual value recalculated');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to recalculate';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);