import { message } from 'antd';
import { axiosInstance, BANDU_API_URL } from '../../../services/client';

export interface ReportParams {
  shop_id?: string;
  startDate?: string;
  endDate?: string;
  department_id?: string;
  employee_id?: string;
  status?: string;
  year?: number;
  employment_status?: string;
  employment_type?: string;
  limit?: number;
}

const banduReportsUrl = `${BANDU_API_URL}/reports`;
const unwrap = (response: any) => response.data?.data ?? response.data;

export const fetchPayrollSummaryReport = async (params: {
  department_id?: string;
  period_start?: string;
  period_end?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${banduReportsUrl}/payroll-summary`, {
      params,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching payroll summary report:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch report');
    return { success: false, data: null };
  }
};

export const fetchLeaveUtilizationReport = async (params: {
  department_id?: string;
  year?: number;
}) => {
  try {
    const response = await axiosInstance.get(`${banduReportsUrl}/leave-utilization`, {
      params,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching leave utilization report:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch report');
    return { success: false, data: null };
  }
};

export const fetchTaxSummaryReport = async (params: {
  department_id?: string;
  period_start?: string;
  period_end?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${banduReportsUrl}/tax-summary`, {
      params,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching tax summary report:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch report');
    return { success: false, data: null };
  }
};

export const fetchDocumentExpirationReport = async (days = 30) => {
  try {
    const response = await axiosInstance.get(`${banduReportsUrl}/document-expiration`, {
      params: { days },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching document expiration report:', error);
    return { success: false, data: null };
  }
};

export const fetchDeductionAnalysisReport = async (params: {
  department_id?: string;
  period_start?: string;
  period_end?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${banduReportsUrl}/deduction-analysis`, {
      params,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching deduction analysis report:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch report');
    return { success: false, data: null };
  }
};

export const fetchEmployeeMasterList = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${banduReportsUrl}/employee-master-list`, { params });
  return unwrap(response);
};

export const fetchPayrollRegister = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${banduReportsUrl}/payroll-register`, { params });
  return unwrap(response);
};

export const fetchLeaveBalanceReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${banduReportsUrl}/leave-balance`, { params });
  return unwrap(response);
};

export const fetchLeaveHistoryReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${banduReportsUrl}/leave-history`, { params });
  return unwrap(response);
};

export const fetchDepartmentStaffingReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${banduReportsUrl}/department-staffing`, { params });
  return unwrap(response);
};

export const fetchContactDirectory = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${banduReportsUrl}/contact-directory`, { params });
  return unwrap(response);
};
