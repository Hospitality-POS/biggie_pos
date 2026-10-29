import { message } from 'antd';
import type { ParamsType } from '@ant-design/pro-components';
import { axiosInstance, BANDU_API_URL } from '../../../services/client';
import type { Payslip, P9Form } from '../../../types';

export const emailPayslipsBatch = async (
  payslipIds: string[],
  template?: string,
  color?: string,
  header?: 'company' | 'department'
) => {
  const response = await axiosInstance.post(`${BANDU_API_URL}/payslips/email-batch`, {
    payslip_ids: payslipIds,
    template,
    color,
    header,
  });
  return response.data;
};

export const emailP9FormPdf = async (payload: {
  employee_id: string;
  year: number;
  pdf_base64: string;
  filename?: string;
}) => {
  const response = await axiosInstance.post(`${BANDU_API_URL}/payslips/email-p9`, payload);
  return response.data;
};

export const previewPayslipEmail = async (
  payslipId: string,
  template: string,
  color?: string,
  extras?: { message?: string; recipient_name?: string; subject?: string; header?: 'company' | 'department' }
) => {
  const response = await axiosInstance.post(`${BANDU_API_URL}/payslips/email-preview`, {
    payslip_id: payslipId,
    template,
    color,
    ...extras,
  });
  return response.data as { subject: string; html: string; template: string };
};

export const deletePayslip = async (payslipId: string) => {
  try {
    const response = await axiosInstance.delete(`${BANDU_API_URL}/payslips/${payslipId}`);
    message.success('Payslip deleted');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete payslip';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const generatePayslip = async (payrollId: string, employeeId: string) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/payslips/generate/${payrollId}/${employeeId}`);
    message.success('Payslip generated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to generate payslip';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const generateBatchPayslips = async (payrollId: string) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/payslips/generate-batch/${payrollId}`);
    message.success('Payslips generated successfully for all employees');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to generate batch payslips';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchEmployeePayslips = async (employeeId: string, params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/payslips/employee/${employeeId}`, {
      params: {
        page: params.page,
        limit: params.limit,
        year: params.year,
        month: params.month,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching payslips:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch payslips');
    return { payslips: [], total: 0 };
  }
};

export const fetchAllPayslips = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/payslips`, {
      params: {
        page: params.page,
        limit: params.limit,
        year: params.year,
        month: params.month,
        employee_id: params.employee_id,
        department_id: params.department_id,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching all payslips:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch payslips');
    return { payslips: [], total: 0 };
  }
};

export const getPayslipById = async (payslipId: string) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/payslips/${payslipId}`);
    return response.data.data || response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch payslip';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const emailPayslip = async (
  payslipId: string,
  template?: string,
  color?: string,
  opts?: { to?: string; cc?: string; subject?: string; message?: string; pdf?: string; recipient_name?: string; header?: 'company' | 'department' }
) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/payslips/${payslipId}/email`, {
      template,
      color,
      ...opts,
    });
    message.success('Payslip emailed successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to email payslip';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const generateP9Form = async (employeeId: string, year: number) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/p9-forms/generate/${employeeId}/${year}`);
    message.success('P9 form generated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to generate P9 form';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchEmployeeP9Forms = async (employeeId: string, params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/p9-forms/employee/${employeeId}`, {
      params: {
        page: params.page,
        limit: params.limit,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching P9 forms:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch P9 forms');
    return { p9_forms: [], total: 0 };
  }
};

export const getP9FormById = async (p9FormId: string) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/p9-forms/${p9FormId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch P9 form';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const emailP9Form = async (p9FormId: string) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/p9-forms/${p9FormId}/email`);
    message.success('P9 form emailed successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to email P9 form';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};
