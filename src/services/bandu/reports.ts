import axiosInstance from "../request";
import { BASE_URL } from "@utils/config";

const banduUrl = `${BASE_URL}/api/bandu/mteja-reports`;

// ── Report Types ────────────────────────────────────────────────────────────────

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

// ── Bandu HR Reports ─────────────────────────────────────────────────────────

/**
 * Employee Master List
 * Complete employee directory with contact, banking, and employment details
 */
export const fetchEmployeeMasterList = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${banduUrl}/employee-master-list`, { params });
  return response.data;
};

/**
 * Payroll Register
 * Detailed payroll records with deduction breakdown (PAYE, NSSF, NHIF, Housing Levy)
 */
export const fetchPayrollRegister = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${banduUrl}/payroll-register`, { params });
  return response.data;
};

/**
 * Leave Balance Report
 * Annual leave balances, sick/maternity/paternity/compassionate leave, year-based reporting
 */
export const fetchLeaveBalanceReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${banduUrl}/leave-balance`, { params });
  return response.data;
};

/**
 * Leave History Report
 * Complete leave application history with status and approval tracking
 */
export const fetchLeaveHistoryReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${banduUrl}/leave-history`, { params });
  return response.data;
};

/**
 * Department Staffing Report
 * Department-wise employee distribution, salary analysis, active/inactive breakdown
 */
export const fetchDepartmentStaffingReport = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${banduUrl}/department-staffing`, { params });
  return response.data;
};

/**
 * Employee Contact Directory
 * Contact information for all employees with emergency contacts
 */
export const fetchContactDirectory = async (params: ReportParams = {}) => {
  const response = await axiosInstance.get(`${banduUrl}/contact-directory`, { params });
  return response.data;
};
