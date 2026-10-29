/**
 * Legacy HR Leave & Attendance adapter
 * Forwards to canonical feature-sliced Bandu leave & attendance services
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { message } from 'antd';
import axiosInstance from '../request';
import { BASE_URL } from '@utils/config';

const hr_url = `${BASE_URL}/hr`;

export * from '@modules/bandu/pages/leave/services';
export * from '@modules/bandu/pages/attendance/services';

// Reconcile attendance Redux thunk
export const reconcileAttendance = createAsyncThunk(
  'hr/reconcileAttendance',
  async (date: string | undefined, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`${hr_url}/attendance/reconcile`, {
        date,
      });
      message.success(response.data?.message || 'Attendance reconciled successfully');
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to reconcile attendance';
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export type LeaveType =
  | 'Annual'
  | 'Sick'
  | 'Emergency'
  | 'Maternity'
  | 'Paternity'
  | 'Unpaid';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export type AttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Late'
  | 'On Leave'
  | 'Public Holiday';

export interface AttendanceSummary {
  _id: string;
  staff_id: {
    _id: string;
    fullname: string;
    username: string;
    thumbnail?: string;
  };
  date: string;
  shift_id?: {
    startTime: string;
    endTime: string;
    dayOfWeek: string;
  };
  expected_hours: number;
  actual_hours: number;
  overtime_hours: number;
  status: AttendanceStatus;
  absence_reason?: string;
  leave_id?: string;
}

export interface ClockStatus {
  clocked_in: boolean;
  clocked_out: boolean;
  clock_in?: string;
  clock_out?: string;
  hours_so_far?: number;
  clock?: {
    _id: string;
    staff_id: string;
    clock_in: string;
    clock_out?: string;
  };
}

export interface AttendanceReport {
  staff_id: string;
  fullname: string;
  username: string;
  present_days: number;
  late_days: number;
  absent_days: number;
  leave_days: number;
  holiday_days: number;
  total_hours: number;
  expected_hours: number;
  overtime_hours: number;
  raw_clock_hours: number;
  total_sessions: number;
  attendance_rate: number;
}