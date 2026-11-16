import { message } from 'antd';
import type { ParamsType } from '@ant-design/pro-components';
import { axiosInstance, BANDU_API_URL } from '../../../services/client';
import type {
  Payroll,
  GeneratePayrollParams,
  PayrollPreviewResult,
} from '../../../types';

export const previewPayroll = async (params: GeneratePayrollParams): Promise<PayrollPreviewResult> => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/payroll/preview`, params);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to preview payroll';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const duplicatePayroll = async (
  payrollId: string,
  params: { period_start: string; period_end: string; period_label: string }
) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/payroll/${payrollId}/duplicate`, params);
    message.success('Payroll duplicated as draft');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to duplicate payroll';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const patchPayrollLine = async (
  payrollId: string,
  payload: {
    line_id: string;
    adjustments: {
      basic_salary?: number;
      allowances?: number;
      benefits?: number;
      allowance_items?: Array<{ name: string; amount: number }>;
      benefit_items?: Array<{ name: string; value: number }>;
      overtime_hours?: number;
      overtime_pay?: number;
      custom_deductions?: Array<{ name: string; amount: number }>;
    };
  }
) => {
  try {
    const response = await axiosInstance.patch(`${BANDU_API_URL}/payroll/${payrollId}/line`, payload);
    message.success('Payroll line updated');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update payroll line';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const payrollLineAction = async (
  payrollId: string,
  employeeIds: string[],
  action: 'delete' | 'approve' | 'submit' | 'revert',
  reason?: string
) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/payroll/${payrollId}/lines/action`, {
      employee_ids: employeeIds,
      action,
      ...(reason ? { reason } : {}),
    });
    message.success(response.data?.message || 'Done');
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.message || `Failed to ${action} the selected employee(s)`;
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const processPayrollRequest = async (payrollId: string) => {
  try {
    const response = await axiosInstance.patch(`${BANDU_API_URL}/payroll/${payrollId}/process`);
    message.success('Payroll processed');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to process payroll';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const markPayrollPaid = async (
  payrollId: string,
  payload: { payment_date?: string; auto_create_accounts?: boolean } = {}
) => {
  const response = await axiosInstance.patch(`${BANDU_API_URL}/payroll/${payrollId}/pay`, payload);
  message.success('Payroll marked as paid');
  return response.data;
};

export const generatePayroll = async (params: GeneratePayrollParams) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/payroll/generate`, params);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to generate payroll';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchPayrolls = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/payroll`, {
      params: {
        page: params.page,
        limit: params.limit,
        department_id: params.department_id,
        status: params.status,
        period_start: params.period_start,
        period_end: params.period_end,
        year: params.year,
        month: params.month,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching payrolls:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch payrolls');
    return { payrolls: [], total: 0 };
  }
};

export const deletePayroll = async (payrollId: string) => {
  try {
    const response = await axiosInstance.delete(`${BANDU_API_URL}/payroll/${payrollId}`);
    message.success('Payroll deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete payroll';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const submitPayrollForApproval = async (payrollId: string) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/payroll/${payrollId}/submit`);
    message.success(response.data?.message || 'Payroll submitted for approval');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to submit payroll for approval';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const approvePayrollRequest = async (payrollId: string) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/payroll/${payrollId}/approve`);
    message.success('Payroll approved successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to approve payroll';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const rejectPayrollRequest = async (payrollId: string, reason?: string) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/payroll/${payrollId}/reject`, { reason });
    message.success('Payroll rejected — moved back to drafts');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to reject payroll';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const getPayrollById = async (payrollId: string) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/payroll/${payrollId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch payroll';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};
