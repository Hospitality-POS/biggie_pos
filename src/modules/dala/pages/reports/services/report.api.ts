import { axiosInstance, DALA_API_URL, getDalaHeaders } from '../../../services/client';

export interface ReportParams {
  shop_id?: string;
  startDate?: string;
  endDate?: string;
  property_id?: string;
  agent_id?: string;
  department_id?: string;
  employee_id?: string;
  status?: string;
  category_id?: string;
  year?: number;
  employment_status?: string;
  employment_type?: string;
  limit?: number;
}

const reportsUrl = `${DALA_API_URL}/reports`;

// ── Dashboard & Property Reports ──────────────────────────────────────────────

export const fetchDalaDashboard = async (params?: {
  start_date?: string;
  end_date?: string;
  period?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/dashboard`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch dashboard data:', error);
    throw error;
  }
};

export const fetchPropertyReport = async (
  property_id: string,
  params?: {
    start_date?: string;
    end_date?: string;
    report_type?: 'sales' | 'rentals' | 'occupancy' | 'financial';
  }
) => {
  try {
    const response = await axiosInstance.get(`${DALA_API_URL}/properties/${property_id}/reports`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch property report:', error);
    throw error;
  }
};

// ── Domain Analytic Reports ───────────────────────────────────────────────────

export const fetchPaymentsDueReport = async (params: ReportParams = {}) => {
  try {
    const response = await axiosInstance.get(`${reportsUrl}/payments-due`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch payments due report:', error);
    throw error;
  }
};

export const fetchCommissionsDueReport = async (params: ReportParams = {}) => {
  try {
    const response = await axiosInstance.get(`${reportsUrl}/commissions-due`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch commissions due report:', error);
    throw error;
  }
};

export const fetchSalesReport = async (params: ReportParams = {}) => {
  try {
    const response = await axiosInstance.get(`${reportsUrl}/sales`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch sales report:', error);
    throw error;
  }
};

export const fetchPropertyOccupancyReport = async (params: ReportParams = {}) => {
  try {
    const response = await axiosInstance.get(`${reportsUrl}/property-occupancy`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch property occupancy report:', error);
    throw error;
  }
};

export const fetchRentCollectionReport = async (params: ReportParams = {}) => {
  try {
    const response = await axiosInstance.get(`${reportsUrl}/rent-collection`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch rent collection report:', error);
    throw error;
  }
};

export const fetchMaintenanceReport = async (params: ReportParams = {}) => {
  try {
    const response = await axiosInstance.get(`${reportsUrl}/maintenance`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch maintenance report:', error);
    throw error;
  }
};

export const fetchPortfolioAnalysisReport = async (params: ReportParams = {}) => {
  try {
    const response = await axiosInstance.get(`${reportsUrl}/portfolio-analysis`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch portfolio analysis report:', error);
    throw error;
  }
};

export const fetchAlreadyPaidPaymentsReport = async (params: ReportParams = {}) => {
  try {
    const response = await axiosInstance.get(`${reportsUrl}/already-paid-payments`, {
      params,
      headers: getDalaHeaders(),
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch already paid payments report:', error);
    throw error;
  }
};
