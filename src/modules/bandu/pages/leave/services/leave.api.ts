import { message } from 'antd';
import type { ParamsType } from '@ant-design/pro-components';
import { axiosInstance, BANDU_API_URL } from '../../../services/client';
import type {
  LeavePolicy,
  CreateLeavePolicyParams,
  Leave,
  CreateLeaveParams,
} from '../../../types';

export const createLeavePolicy = async (params: CreateLeavePolicyParams) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/leave-policies`, params);
    message.success('Leave policy created successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create leave policy';
    message.error(errorMessage);
    throw error;
  }
};

export const fetchLeavePolicies = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/leave-policies`, { params });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch leave policies';
    message.error(errorMessage);
    throw error;
  }
};

export const getLeavePolicyById = async (policyId: string) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/leave-policies/${policyId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch leave policy';
    message.error(errorMessage);
    throw error;
  }
};

export const getLeavePolicyForDepartment = async (departmentId: string) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/leave-policies/department/${departmentId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch leave policy for department';
    message.error(errorMessage);
    throw error;
  }
};

export const updateLeavePolicy = async (policyId: string, params: Partial<CreateLeavePolicyParams>) => {
  try {
    const response = await axiosInstance.patch(`${BANDU_API_URL}/leave-policies/${policyId}`, params);
    message.success('Leave policy updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update leave policy';
    message.error(errorMessage);
    throw error;
  }
};

export const deleteLeavePolicy = async (policyId: string) => {
  try {
    const response = await axiosInstance.delete(`${BANDU_API_URL}/leave-policies/${policyId}`);
    message.success('Leave policy deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete leave policy';
    message.error(errorMessage);
    throw error;
  }
};

export const initializeLeaveBalances = async (policyId: string) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/leave-policies/${policyId}/initialize-balances`);
    message.success('Leave balances initialized successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to initialize leave balances';
    message.error(errorMessage);
    throw error;
  }
};

export const applyForLeave = async (params: CreateLeaveParams) => {
  try {
    const response = await axiosInstance.post(`${BANDU_API_URL}/leave`, params);
    message.success('Leave application submitted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to submit leave application';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchLeaves = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/leave`, {
      params: {
        status: params.status,
        leave_type: params.leave_type,
        department_id: params.department_id,
        page: params.page,
        limit: params.limit,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching leaves:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch leave requests');
    return { leaves: [], total: 0 };
  }
};

export const getLeaveById = async (leaveId: string) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/leave/${leaveId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch leave';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const approveLeave = async (leaveId: string) => {
  try {
    const response = await axiosInstance.patch(`${BANDU_API_URL}/leave/${leaveId}/approve`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to approve leave';
    message.error(errorMessage);
    throw error;
  }
};

export const rejectLeave = async ({ leaveId, rejection_reason }: { leaveId: string; rejection_reason?: string }) => {
  try {
    const response = await axiosInstance.patch(`${BANDU_API_URL}/leave/${leaveId}/reject`, {
      rejection_reason,
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to reject leave';
    message.error(errorMessage);
    throw error;
  }
};

export const cancelLeave = async (leaveId: string) => {
  try {
    const response = await axiosInstance.patch(`${BANDU_API_URL}/leave/${leaveId}/cancel`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to cancel leave';
    message.error(errorMessage);
    throw error;
  }
};

export const uploadLeaveDocument = async (leaveId: string, file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post(`${BANDU_API_URL}/leave/${leaveId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    message.success('Document uploaded successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to upload document';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchLeaveDocuments = async (leaveId: string) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/leave/${leaveId}/documents`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching leave documents:', error);
    return { documents: [] };
  }
};

export const deleteLeaveDocument = async (leaveId: string, documentId: string) => {
  try {
    const response = await axiosInstance.delete(`${BANDU_API_URL}/leave/${leaveId}/documents/${documentId}`);
    message.success('Document deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete document';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchLeaveBalance = async (departmentId: string, params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${BANDU_API_URL}/leave/balance/${departmentId}`, {
      params: {
        year: params.year,
        employee_id: params.employee_id,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching leave balance:', error);
    return { success: false, data: [] };
  }
};
