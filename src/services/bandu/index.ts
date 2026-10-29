/**
 * Legacy Bandu Services adapter
 * Forwards to canonical feature-sliced Bandu module services and types
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { message } from 'antd';
import axiosInstance from '../request';
import { BASE_URL } from '@utils/config';

const bandu_url = `${BASE_URL}/bandu`;

export * from '@modules/bandu/types';
export * from '@modules/bandu/services/banduApi';

// Legacy Redux thunks maintained for backward compatibility
export const updateEmploymentStatus = createAsyncThunk(
  'bandu/updateEmploymentStatus',
  async (
    { employeeId, employment_status, reason }: { employeeId: string; employment_status: string; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(`${bandu_url}/employees/${employeeId}/status`, {
        employment_status,
        reason,
      });
      message.success('Employment status updated successfully');
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update employment status';
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const seedLeaveBalance = createAsyncThunk(
  'bandu/seedLeaveBalance',
  async (
    data: {
      department_id: string;
      employee_id: string;
      year: number;
      entitlements: Array<{
        leave_type: 'Annual' | 'Sick' | 'Emergency' | 'Maternity' | 'Paternity' | 'Unpaid';
        entitled: number;
      }>;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(`${bandu_url}/leave/balance/seed`, data);
      message.success('Leave balances updated successfully');
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to seed leave balances';
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const approvePayroll = createAsyncThunk(
  'bandu/approvePayroll',
  async (payrollId: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`${bandu_url}/payroll/${payrollId}/approve`);
      message.success('Payroll approved successfully');
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to approve payroll';
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const processPayroll = createAsyncThunk(
  'bandu/processPayroll',
  async (payrollId: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`${bandu_url}/payroll/${payrollId}/process`);
      message.success('Payroll processed successfully');
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to process payroll';
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const markPayrollAsPaid = createAsyncThunk(
  'bandu/markPayrollAsPaid',
  async (
    { payrollId, payment_date }: { payrollId: string; payment_date: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(`${bandu_url}/payroll/${payrollId}/pay`, {
        payment_date,
      });
      message.success('Payroll marked as paid');
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to mark payroll as paid';
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const voidPayroll = createAsyncThunk(
  'bandu/voidPayroll',
  async (
    { payrollId, reason }: { payrollId: string; reason: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(`${bandu_url}/payroll/${payrollId}/void`, {
        reason,
      });
      message.success('Payroll voided');
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to void payroll';
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const updatePayrollLine = createAsyncThunk(
  'bandu/updatePayrollLine',
  async (
    {
      payrollId,
      line_id,
      adjustments,
    }: {
      payrollId: string;
      line_id: string;
      adjustments: {
        overtime_hours?: number;
        custom_deductions?: Array<{ name: string; amount: number }>;
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(`${bandu_url}/payroll/${payrollId}/line`, {
        line_id,
        adjustments,
      });
      message.success('Payroll line updated');
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update payroll line';
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

import banduApi from '@modules/bandu/services/banduApi';
export default banduApi;
