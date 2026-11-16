/**
 * Legacy CRM Leads service adapter
 * Forwards to canonical feature-sliced Mteja module services and types
 */

import { BASE_URL } from '@utils/config';
import { message } from 'antd';
import axiosInstance from '../request';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { Lead, LeadStage } from '@modules/mteja/types';

export * from '@modules/mteja/types';
export * from '@modules/mteja/pages/leads/services';

const BASE = `${BASE_URL}/api/crm/leads`;

// Legacy Redux thunks maintained for backward compatibility
export const createLead = createAsyncThunk(
  'leads/create',
  async (data: Partial<Lead> & { shop_id: string; lead_name: string }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(BASE, data);
      message.success('Lead created successfully');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create lead';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateLead = createAsyncThunk(
  'leads/update',
  async (
    { id, data }: { id: string; data: Partial<Lead> & { shop_id: string } },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.put(`${BASE}/${id}`, data);
      message.success('Lead updated successfully');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update lead';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateLeadStage = createAsyncThunk(
  'leads/updateStage',
  async (
    {
      id,
      shop_id,
      stage,
      note,
    }: { id: string; shop_id: string; stage: LeadStage; note?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(`${BASE}/${id}/stage`, {
        shop_id,
        stage,
        note,
      });
      message.success(`Lead moved to '${stage}'`);
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update stage';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const convertLead = createAsyncThunk(
  'leads/convert',
  async (
    { id, shop_id }: { id: string; shop_id: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(`${BASE}/${id}/convert`, {
        shop_id,
      });
      message.success('Lead converted to customer successfully');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to convert lead';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteLead = createAsyncThunk(
  'leads/delete',
  async (
    { id, shop_id }: { id: string; shop_id: string },
    { rejectWithValue }
  ) => {
    try {
      await axiosInstance.delete(`${BASE}/${id}`, { params: { shop_id } });
      message.success('Lead deleted successfully');
      return id;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to delete lead';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);