import { message } from 'antd';
import type { ParamsType } from '@ant-design/pro-components';
import { axiosInstance } from '../../../services/client';
import { BASE_URL } from '@utils/config';

const hr_url = `${BASE_URL}/hr`;

export const fetchAllAttendance = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/attendance`, {
      params: {
        staff_id: params.staff_id,
        status: params.status,
        from: params.from,
        to: params.to,
        page: params.page,
        limit: params.limit,
        view: params.view || 'summary',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching all attendance:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch attendance records');
    return { records: [], total: 0 };
  }
};

export const fetchAttendanceReport = async (params: {
  from?: string;
  to?: string;
  staff_id?: string;
  send_email?: boolean;
}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/attendance/report`, {
      params: {
        from: params.from,
        to: params.to,
        staff_id: params.staff_id,
        send_email: params.send_email ? 'true' : undefined,
      },
    });
    if (params.send_email) message.success('Attendance report emailed successfully');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching attendance report:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch attendance report');
    return { report: [] };
  }
};

export const fetchHoursWorkedReport = async (params: {
  from?: string;
  to?: string;
  staff_id?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/attendance/hours-report`, {
      params: {
        from: params.from,
        to: params.to,
        staff_id: params.staff_id,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching hours worked report:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch hours worked report');
    return { report: [], totals: { employees: 0, total_hours: 0, completed_sessions: 0, open_sessions: 0 } };
  }
};

export const testBiometricConnection = async () => {
  try {
    const response = await axiosInstance.get(`${hr_url}/attendance/biometric/test`);
    return response.data;
  } catch (error: any) {
    console.error('Biometric test failed:', error);
    message.error(error?.response?.data?.message || 'Biometric connection test failed');
    return { configured: false, reachable: false, message: 'Request failed' };
  }
};

export const clockIn = async () => {
  try {
    const response = await axiosInstance.post(`${hr_url}/attendance/clock-in`, undefined, {
      timeout: 5000,
    });
    message.success(response.data?.message || 'Clocked in successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.message || 'Failed to clock in';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const clockOut = async () => {
  try {
    const response = await axiosInstance.post(`${hr_url}/attendance/clock-out`, undefined, {
      timeout: 5000,
    });
    message.success(response.data?.message || 'Clocked out successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.message || 'Failed to clock out';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchClockStatus = async () => {

  try {
    const response = await axiosInstance.get(`${hr_url}/attendance/status`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching clock status:', error);
    return { clocked_in: false, clocked_out: false, clock: null };
  }
};

export const fetchMyAttendance = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/attendance/my`, {
      params: {
        from: params.from,
        to: params.to,
        page: params.page,
        limit: params.limit,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch attendance');
    return { summaries: [], clock_records: [], total: 0 };
  }
};

export const deleteClockRecord = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${hr_url}/attendance/${id}`);
    message.success(response.data?.message || 'Session deleted');
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.message || 'Failed to delete session';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};
