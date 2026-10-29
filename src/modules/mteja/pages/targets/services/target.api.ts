import { message } from 'antd';
import type { ParamsType } from '@ant-design/pro-components';
import { axiosInstance } from '../../../services/client';
import { BASE_URL } from '@utils/config';
import type { SalesTarget, SalesBudget, TargetMilestone } from '../../../types';

const TARGETS_URL = `${BASE_URL}/api/crm/sales-targets`;
const BUDGETS_URL = `${BASE_URL}/api/crm/sales-budgets`;

// ── Targets ───────────────────────────────────────────────────────────────────

export interface SalesTargetListResponse {
  total: number;
  page: number;
  pages: number;
  targets: SalesTarget[];
}

export interface FetchSalesTargetsParams {
  shop_id?: string;
  type?: string;
  period?: string;
  user_id?: string;
  department_id?: string;
  campaign_id?: string;
  budget_id?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const fetchAllSalesTargets = async (
  params: FetchSalesTargetsParams = {}
): Promise<SalesTargetListResponse> => {
  try {
    const response = await axiosInstance.get(TARGETS_URL, { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching sales targets:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch sales targets');
    return { total: 0, page: 1, pages: 0, targets: [] };
  }
};

export const fetchSalesTargets = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(TARGETS_URL, { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching sales targets:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch targets');
    return { data: [], total: 0 };
  }
};

export const getSalesTargetById = async (
  id: string,
  shop_id?: string
): Promise<SalesTarget | null> => {
  try {
    const response = await axiosInstance.get(`${TARGETS_URL}/${id}`, {
      params: shop_id ? { shop_id } : undefined,
    });
    return response.data?.target || response.data?.data || response.data;
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Failed to fetch target';
    message.error(msg);
    throw new Error(msg);
  }
};

export const fetchSalesTargetById = getSalesTargetById;

export const createSalesTarget = async (data: Partial<SalesTarget>) => {
  try {
    const response = await axiosInstance.post(TARGETS_URL, data);
    message.success('Target created successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create target';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateSalesTarget = async (id: string, data: Partial<SalesTarget>) => {
  try {
    const response = await axiosInstance.put(`${TARGETS_URL}/${id}`, data);
    message.success('Target updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update target';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const deleteSalesTarget = async (id: string, shop_id?: string) => {
  try {
    const response = await axiosInstance.delete(`${TARGETS_URL}/${id}`, {
      params: shop_id ? { shop_id } : undefined,
    });
    message.success('Target deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete target';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateMilestonesApi = async (
  id: string,
  milestones: TargetMilestone[],
  shop_id?: string
) => {
  try {
    const response = await axiosInstance.patch(`${TARGETS_URL}/${id}/milestones`, {
      milestones,
      shop_id,
    });
    message.success('Milestones updated');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update milestones';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const recalculateTargetActualApi = async (id: string, shop_id?: string) => {
  try {
    const response = await axiosInstance.post(`${TARGETS_URL}/${id}/recalculate`, {
      shop_id,
    });
    message.success('Target actual recalculated');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to recalculate';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// ── Budgets ───────────────────────────────────────────────────────────────────

export interface SalesBudgetListResponse {
  total: number;
  page: number;
  pages: number;
  budgets: SalesBudget[];
}

export interface FetchSalesBudgetsParams {
  shop_id?: string;
  status?: string;
  period?: string;
  campaign_id?: string;
  department_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const fetchAllSalesBudgets = async (
  params: FetchSalesBudgetsParams = {}
): Promise<SalesBudgetListResponse> => {
  try {
    const response = await axiosInstance.get(BUDGETS_URL, { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching sales budgets:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch budgets');
    return { total: 0, page: 1, pages: 0, budgets: [] };
  }
};

export const fetchSalesBudgets = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(BUDGETS_URL, { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching sales budgets:', error);
    message.error(error?.response?.data?.message || 'Failed to fetch budgets');
    return { data: [], total: 0 };
  }
};

export const getSalesBudgetById = async (
  id: string,
  shop_id?: string
): Promise<SalesBudget | null> => {
  try {
    const response = await axiosInstance.get(`${BUDGETS_URL}/${id}`, {
      params: shop_id ? { shop_id } : undefined,
    });
    return response.data?.budget || response.data?.data || response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch budget';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchSalesBudgetById = getSalesBudgetById;

export const createSalesBudget = async (data: Partial<SalesBudget>) => {
  try {
    const response = await axiosInstance.post(BUDGETS_URL, data);
    message.success('Budget created successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create budget';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateSalesBudget = async (id: string, data: Partial<SalesBudget>) => {
  try {
    const response = await axiosInstance.put(`${BUDGETS_URL}/${id}`, data);
    message.success('Budget updated successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update budget';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const deleteSalesBudget = async (id: string, shop_id?: string) => {
  try {
    const response = await axiosInstance.delete(`${BUDGETS_URL}/${id}`, {
      params: shop_id ? { shop_id } : undefined,
    });
    message.success('Budget deleted successfully');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete budget';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const submitSalesBudgetApi = async (id: string, shop_id?: string) => {
  try {
    const response = await axiosInstance.patch(`${BUDGETS_URL}/${id}/submit`, { shop_id });
    message.success('Budget submitted for approval');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to submit budget';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const approveSalesBudgetApi = async (id: string, shop_id?: string) => {
  try {
    const response = await axiosInstance.patch(`${BUDGETS_URL}/${id}/approve`, { shop_id });
    message.success('Budget approved');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to approve budget';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const rejectSalesBudgetApi = async (id: string, rejection_reason: string, shop_id?: string) => {
  try {
    const response = await axiosInstance.patch(`${BUDGETS_URL}/${id}/reject`, {
      rejection_reason,
      shop_id,
    });
    message.success('Budget rejected');
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to reject budget';
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};
