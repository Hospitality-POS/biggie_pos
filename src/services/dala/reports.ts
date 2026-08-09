import axiosInstance from "../request";
import { BASE_URL } from "@utils/config";

const dalaUrl = `${BASE_URL}/api/dala/reports`;

// ── Report Types ────────────────────────────────────────────────────────────────

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

// ── Dala Reports ────────────────────────────────────────────────────────────────

/**
 * Payments Due Report
 * Sale payment plans with due payments, rent invoices with outstanding balances
 */
export const fetchPaymentsDueReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${dalaUrl}/payments-due`, { params });
  return response.data;
};

/**
 * Commissions Due Report
 * Pending and partially paid commissions, agent breakdown, withholding tax
 */
export const fetchCommissionsDueReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${dalaUrl}/commissions-due`, { params });
  return response.data;
};

/**
 * Sales Report
 * Complete sales data with payment information, property/agent breakdowns
 */
export const fetchSalesReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${dalaUrl}/sales`, { params });
  return response.data;
};

/**
 * Property Occupancy Report
 * Unit status breakdown, occupancy rates, revenue tracking
 */
export const fetchPropertyOccupancyReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${dalaUrl}/property-occupancy`, { params });
  return response.data;
};

/**
 * Rent Collection Report
 * Invoice and payment tracking, collection rate calculations
 */
export const fetchRentCollectionReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${dalaUrl}/rent-collection`, { params });
  return response.data;
};

/**
 * Maintenance Report
 * Ticket status and category breakdown, cost tracking
 */
export const fetchMaintenanceReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${dalaUrl}/maintenance`, { params });
  return response.data;
};

/**
 * Portfolio Analysis Report
 * Property performance, investment returns, development progress
 */
export const fetchPortfolioAnalysisReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${dalaUrl}/portfolio-analysis`, { params });
  return response.data;
};

/**
 * Already Paid Payments Report
 * Payments that have been fully paid, including payment plans and rent invoices
 */
export const fetchAlreadyPaidPaymentsReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${dalaUrl}/already-paid-payments`, { params });
  return response.data;
};
