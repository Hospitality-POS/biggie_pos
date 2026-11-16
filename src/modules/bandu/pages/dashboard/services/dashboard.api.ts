import { message } from 'antd';
import { axiosInstance, BANDU_API_URL, getBanduHeaders } from '../../../services/client';
import type { HRDashboardData } from '../../../types';

export interface HRDashboardParams {
  shop_id?: string;
  start_date?: string;
  end_date?: string;
}

export const fetchHRDashboard = async (params: HRDashboardParams): Promise<HRDashboardData> => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/hr/dashboard`, {
      params,
      headers: getBanduHeaders(),
    });
    const apiData = response.data?.data || {};

    const genderBreakdown = apiData.employees?.gender_breakdown || {
      male: 0,
      female: 0,
      other: 0,
      prefer_not_to_say: 0,
      not_specified: 0,
    };

    return {
      employeeStats: {
        total_employees: apiData.employees?.total || 0,
        active_employees: apiData.employees?.active || 0,
        on_leave: 0,
        suspended: 0,
        terminated: 0,
        resigned: 0,
        new_hires_this_month: 0,
      },
      leaveStats: {
        total_requests: (apiData.leave?.pending || 0) + (apiData.leave?.approved || 0) + (apiData.leave?.rejected || 0),
        pending: apiData.leave?.pending || 0,
        approved: apiData.leave?.approved || 0,
        rejected: apiData.leave?.rejected || 0,
        on_leave_today: 0,
      },
      attendanceStats: {
        present_today: 0,
        absent_today: 0,
        late_today: 0,
        average_attendance_rate: 0,
      },
      payrollStats: {
        total_payroll_this_month: apiData.payroll?.total_gross || 0,
        total_deductions: (apiData.payroll?.total_gross || 0) - (apiData.payroll?.total_net || 0),
        net_pay: apiData.payroll?.total_net || 0,
        pending_payroll: 0,
      },
      payrollTrends: [],
      leaveDistribution: [],
      departmentDistribution: [],
      ...response.data?.data,
      gender_breakdown: genderBreakdown,
    };
  } catch (error: any) {
    console.error('Error fetching HR dashboard:', error);
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch HR dashboard';
    message.error(errorMessage);
    throw error;
  }
};
