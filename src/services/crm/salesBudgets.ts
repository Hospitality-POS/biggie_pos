/**
 * Legacy CRM Sales Budgets service adapter
 * Forwards to canonical feature-sliced Mteja module services and types
 */

import { BASE_URL } from '@utils/config';
import { message } from 'antd';
import axiosInstance from '../request';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { SalesBudget } from '@modules/mteja/types';

export * from '@modules/mteja/types';
export * from '@modules/mteja/pages/targets/services';

const BASE = `${BASE_URL}/api/crm/sales-budgets`;

// Legacy Redux thunks maintained for backward compatibility
export const createSalesBudget = createAsyncThunk(
  'salesBudgets/create',
  async (
    data: Partial<SalesBudget> & { name: string; period_start: string; period_end: string; shop_id: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(BASE, data);
      message.success('Budget created successfully');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create budget';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateSalesBudget = createAsyncThunk(
  'salesBudgets/update',
  async (
    { id, data }: { id: string; data: Partial<SalesBudget> & { shop_id: string } },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.put(`${BASE}/${id}`, data);
      message.success('Budget updated successfully');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update budget';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteSalesBudget = createAsyncThunk(
  'salesBudgets/delete',
  async (
    { id, shop_id }: { id: string; shop_id: string },
    { rejectWithValue }
  ) => {
    try {
      await axiosInstance.delete(`${BASE}/${id}`, { params: { shop_id } });
      message.success('Budget deleted successfully');
      return id;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to delete budget';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const submitSalesBudget = createAsyncThunk(
  'salesBudgets/submit',
  async (
    { id, shop_id }: { id: string; shop_id: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(`${BASE}/${id}/submit`, { shop_id });
      message.success('Budget submitted for approval');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to submit budget';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const approveSalesBudget = createAsyncThunk(
  'salesBudgets/approve',
  async (
    { id, shop_id }: { id: string; shop_id: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(`${BASE}/${id}/approve`, { shop_id });
      message.success('Budget approved');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to approve budget';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const rejectSalesBudget = createAsyncThunk(
  'salesBudgets/reject',
  async (
    {
      id,
      shop_id,
      rejection_reason,
    }: { id: string; shop_id: string; rejection_reason: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(`${BASE}/${id}/reject`, {
        rejection_reason,
        shop_id,
      });
      message.success('Budget rejected');
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to reject budget';
      message.error(msg);
      return rejectWithValue(msg);
    }
  }
);