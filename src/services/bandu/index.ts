import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";
import { createAsyncThunk } from "@reduxjs/toolkit";

const bandu_url = `${BASE_URL}/bandu`;

/* ============================
   EMPLOYEES
============================ */

export interface Employee {
  _id: string;
  employee_number: string;
  user_id: {
    _id: string;
    fullname: string;
    username: string;
    email: string;
    thumbnail?: string;
  };
  department_id: {
    _id: string;
    name: string;
    code: string;
  };
  shop_id?: {
    _id: string;
    name: string;
  };
  hire_date: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern' | 'casual';
  job_title: string;
  employment_status: 'active' | 'on_leave' | 'suspended' | 'terminated' | 'resigned';
  basic_salary: number;
  currency: string;
  payment_frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  allowances: Array<{
    name: string;
    amount: number;
    frequency: string;
    is_taxable: boolean;
  }>;
  benefits: Array<{
    name: string;
    amount: number;
    frequency: string;
    is_taxable: boolean;
  }>;
  bank_name?: string;
  bank_account_number?: string;
  kra_pin?: string;
  nssf_number?: string;
  nhif_number?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  nationality?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  gross_salary?: number;
  total_allowances?: number;
  total_benefits?: number;
}

export interface CreateEmployeeParams {
  user_id: string;
  department_id: string;
  employee_number: string;
  hire_date: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern' | 'casual';
  job_title: string;
  basic_salary: number;
  currency: string;
  payment_frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  bank_name?: string;
  bank_account_number?: string;
  kra_pin?: string;
  nssf_number?: string;
  nhif_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  allowances?: Array<{
    name: string;
    amount: number;
    frequency: string;
    is_taxable: boolean;
  }>;
  benefits?: Array<{
    name: string;
    amount: number;
    frequency: string;
    is_taxable: boolean;
  }>;
}

// Create Employee
export const createEmployee = async (params: CreateEmployeeParams) => {
  try {
    const response = await axiosInstance.post(`${bandu_url}/employees`, params);
    message.success("Employee created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to create employee";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Get All Employees
export const fetchEmployees = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/employees`, {
      params: {
        page: params.page,
        limit: params.limit,
        department_id: params.department_id,
        employment_status: params.employment_status,
        search: params.search,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching employees:", error);
    message.error(error?.response?.data?.message || "Failed to fetch employees");
    return { employees: [], total: 0 };
  }
};

// Get Single Employee
export const getEmployeeById = async (employeeId: string) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/employees/${employeeId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch employee";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Update Employee
export const updateEmployee = async (employeeId: string, params: Partial<CreateEmployeeParams>) => {
  try {
    const response = await axiosInstance.patch(`${bandu_url}/employees/${employeeId}`, params);
    message.success("Employee updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to update employee";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Delete Employee (Soft Delete)
export const deleteEmployee = async (employeeId: string) => {
  try {
    const response = await axiosInstance.delete(`${bandu_url}/employees/${employeeId}`);
    message.success("Employee deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete employee";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Get Employees by Department
export const fetchEmployeesByDepartment = async (departmentId: string) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/employees/department/${departmentId}`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching employees by department:", error);
    message.error(error?.response?.data?.message || "Failed to fetch employees");
    return { employees: [] };
  }
};

// Update Employment Status
export const updateEmploymentStatus = createAsyncThunk(
  "bandu/updateEmploymentStatus",
  async (
    { employeeId, employment_status, reason }: { employeeId: string; employment_status: string; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(`${bandu_url}/employees/${employeeId}/status`, {
        employment_status,
        reason,
      });
      message.success("Employment status updated successfully");
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to update employment status";
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/* ============================
   EMPLOYEE DOCUMENTS
============================ */

export interface EmployeeDocument {
  _id: string;
  employee_id: string;
  document_type: 'employee_contract' | 'id_copy' | 'passport_photo' | 'kra_pin' | 'bank_details' | 'academic_certificates' | 'professional_certificates' | 'disciplinary_record' | 'performance_review' | 'other';
  document_name: string;
  description?: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  expiration_date?: string;
  access_level: 'private' | 'hr_only' | 'manager' | 'public';
  status: 'active' | 'expired' | 'revoked';
  uploaded_at: string;
  uploaded_by: string;
}

// Upload Employee Document
export const uploadEmployeeDocument = async (
  employeeId: string,
  file: File,
  documentType: string,
  documentName: string,
  description?: string,
  expirationDate?: string,
  accessLevel = 'private'
) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('document_name', documentName);
    if (description) formData.append('description', description);
    if (expirationDate) formData.append('expiration_date', expirationDate);
    formData.append('access_level', accessLevel);

    const response = await axiosInstance.post(`${bandu_url}/employees/${employeeId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    message.success("Document uploaded successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to upload document";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Get Employee Documents
export const fetchEmployeeDocuments = async (employeeId: string, params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/employees/employee/${employeeId}`, {
      params: {
        document_type: params.document_type,
        status: params.status,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching employee documents:", error);
    message.error(error?.response?.data?.message || "Failed to fetch documents");
    return { documents: [] };
  }
};

// Get Expiring Documents Alert
export const fetchExpiringDocuments = async (days = 30) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/employees/alerts/expiring`, {
      params: { days },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching expiring documents:", error);
    return { alerts: [] };
  }
};

// Delete Document
export const deleteEmployeeDocument = async (documentId: string) => {
  try {
    const response = await axiosInstance.delete(`${bandu_url}/employees/${documentId}`);
    message.success("Document deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete document";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/* ============================
   LEAVE POLICIES
============================ */

export interface LeavePolicy {
  _id: string;
  department_id?: string;
  department_name?: string;
  is_default: boolean;
  leave_types: Array<{
    name: string;
    default_days: number;
    max_days: number;
    requires_document: boolean;
    is_paid: boolean;
    accrual_rate: number;
    carry_forward: boolean;
    max_carry_forward: number;
    min_service_months: number;
  }>;
  approval_settings: {
    auto_approve_days: number;
    max_consecutive_days: number;
    notice_period_days: number;
  };
  pro_rata_calculation: 'calendar_year' | 'employment_year' | 'joining_date';
  created_at: string;
  updated_at: string;
}

export interface CreateLeavePolicyParams {
  department_id?: string;
  is_default?: boolean;
  leave_types: Array<{
    name: string;
    default_days: number;
    max_days: number;
    requires_document: boolean;
    is_paid: boolean;
    accrual_rate: number;
    carry_forward: boolean;
    max_carry_forward: number;
    min_service_months: number;
  }>;
  approval_settings: {
    auto_approve_days: number;
    max_consecutive_days: number;
    notice_period_days: number;
  };
  pro_rata_calculation: 'calendar_year' | 'employment_year' | 'joining_date';
}

// Create Leave Policy
export const createLeavePolicy = async (params: CreateLeavePolicyParams) => {
  try {
    const response = await axiosInstance.post(`${bandu_url}/leave-policies`, params);
    message.success("Leave policy created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to create leave policy";
    message.error(errorMessage);
    throw error;
  }
};

// Fetch Leave Policies
export const fetchLeavePolicies = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/leave-policies`, { params });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch leave policies";
    message.error(errorMessage);
    throw error;
  }
};

// Get Leave Policy by ID
export const getLeavePolicyById = async (policyId: string) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/leave-policies/${policyId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch leave policy";
    message.error(errorMessage);
    throw error;
  }
};

// Get Leave Policy for Department
export const getLeavePolicyForDepartment = async (departmentId: string) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/leave-policies/department/${departmentId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch leave policy for department";
    message.error(errorMessage);
    throw error;
  }
};

// Update Leave Policy
export const updateLeavePolicy = async (policyId: string, params: Partial<CreateLeavePolicyParams>) => {
  try {
    const response = await axiosInstance.patch(`${bandu_url}/leave-policies/${policyId}`, params);
    message.success("Leave policy updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to update leave policy";
    message.error(errorMessage);
    throw error;
  }
};

// Delete Leave Policy
export const deleteLeavePolicy = async (policyId: string) => {
  try {
    const response = await axiosInstance.delete(`${bandu_url}/leave-policies/${policyId}`);
    message.success("Leave policy deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete leave policy";
    message.error(errorMessage);
    throw error;
  }
};

// Initialize Leave Balances from Policy
export const initializeLeaveBalances = async (policyId: string) => {
  try {
    const response = await axiosInstance.post(`${bandu_url}/leave-policies/${policyId}/initialize-balances`);
    message.success("Leave balances initialized successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to initialize leave balances";
    message.error(errorMessage);
    throw error;
  }
};

/* ============================
   LEAVE MANAGEMENT
============================ */

export interface Leave {
  _id: string;
  department_id: {
    _id: string;
    name: string;
    code: string;
  };
  employee_id?: {
    _id: string;
    employee_number: string;
    job_title: string;
  };
  requested_by: {
    _id: string;
    fullname: string;
    username: string;
    thumbnail?: string;
  };
  leave_type: 'Annual' | 'Sick' | 'Emergency' | 'Maternity' | 'Paternity' | 'Unpaid';
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  approved_by?: {
    _id: string;
    fullname: string;
  };
  approved_at?: string;
  rejection_reason?: string;
  attachments: Array<{
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    uploaded_at: string;
    uploaded_by: string;
  }>;
  document_required: boolean;
  document_provided: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LeaveType = 'Annual' | 'Sick' | 'Emergency' | 'Maternity' | 'Paternity' | 'Unpaid';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveBalance {
  _id: string;
  department_id: string;
  year: number;
  leave_type: LeaveType;
  entitled: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface CreateLeaveParams {
  department_id: string;
  employee_id?: string;
  leave_type: 'Annual' | 'Sick' | 'Emergency' | 'Maternity' | 'Paternity' | 'Unpaid';
  start_date: string;
  end_date: string;
  reason?: string;
}

// Apply for Leave
export const applyForLeave = async (params: CreateLeaveParams) => {
  try {
    const response = await axiosInstance.post(`${bandu_url}/leave`, params);
    message.success("Leave application submitted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to submit leave application";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Get Leaves
export const fetchLeaves = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/leave`, {
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
    console.error("Error fetching leaves:", error);
    message.error(error?.response?.data?.message || "Failed to fetch leave requests");
    return { leaves: [], total: 0 };
  }
};

// Get Single Leave
export const getLeaveById = async (leaveId: string) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/leave/${leaveId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch leave";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Approve Leave
export const approveLeave = async (leaveId: string) => {
  try {
    const response = await axiosInstance.patch(`${bandu_url}/leave/${leaveId}/approve`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to approve leave";
    message.error(errorMessage);
    throw error;
  }
};

// Reject Leave
export const rejectLeave = async ({ leaveId, rejection_reason }: { leaveId: string; rejection_reason?: string }) => {
  try {
    const response = await axiosInstance.patch(`${bandu_url}/leave/${leaveId}/reject`, {
      rejection_reason,
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to reject leave";
    message.error(errorMessage);
    throw error;
  }
};

// Cancel Leave
export const cancelLeave = async (leaveId: string) => {
  try {
    const response = await axiosInstance.patch(`${bandu_url}/leave/${leaveId}/cancel`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to cancel leave";
    message.error(errorMessage);
    throw error;
  }
};

// Upload Leave Document
export const uploadLeaveDocument = async (leaveId: string, file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post(`${bandu_url}/leave/${leaveId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    message.success("Document uploaded successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to upload document";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Get Leave Documents
export const fetchLeaveDocuments = async (leaveId: string) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/leave/${leaveId}/documents`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching leave documents:", error);
    return { documents: [] };
  }
};

// Delete Leave Document
export const deleteLeaveDocument = async (leaveId: string, documentId: string) => {
  try {
    const response = await axiosInstance.delete(`${bandu_url}/leave/${leaveId}/documents/${documentId}`);
    message.success("Document deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete document";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Get Leave Balance
export const fetchLeaveBalance = async (departmentId: string, params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/leave/balance/${departmentId}`, {
      params: {
        year: params.year,
        employee_id: params.employee_id,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching leave balance:", error);
    message.error(error?.response?.data?.message || "Failed to fetch leave balance");
    return { balances: [] };
  }
};

// Seed Leave Balance (Admin Only)
export const seedLeaveBalance = createAsyncThunk(
  "bandu/seedLeaveBalance",
  async (
    data: {
      department_id: string;
      employee_id: string;
      year: number;
      entitlements: Array<{
        leave_type: 'Annual' | 'Sick' | 'Emergency' | 'Maternity' | 'Paternity' | 'Unpaid';
        entitled: number;
      }>;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(`${bandu_url}/leave/balance/seed`, data);
      message.success("Leave balances updated successfully");
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to seed leave balances";
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/* ============================
   PAYROLL
============================ */

export interface Payroll {
  _id: string;
  payroll_id: string;
  department_id: {
    _id: string;
    name: string;
    code: string;
  };
  period_start: string;
  period_end: string;
  period_label: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'processed' | 'paid' | 'void';
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_paye: number;
  total_nssf: number;
  total_nhif: number;
  total_housing_levy: number;
  total_custom_deductions: number;
  lines: Array<{
    employee_id: {
      _id: string;
      employee_number: string;
      job_title: string;
    };
    gross_salary: number;
    basic_salary: number;
    allowances: number;
    benefits: number;
    deductions: {
      paye: number;
      nssf: number;
      nhif: number;
      housing_levy: number;
      custom: Array<{ name: string; amount: number }>;
      total: number;
    };
    net_pay: number;
    days_worked: number;
    overtime_hours: number;
    overtime_pay: number;
  }>;
  processed_by?: {
    _id: string;
    fullname: string;
  };
  processed_at?: string;
  approved_by?: {
    _id: string;
    fullname: string;
  };
  approved_at?: string;
  payment_date?: string;
  journal_entry_id?: string;
}

export interface GeneratePayrollParams {
  department_id?: string;
  employee_id?: string;
  employee_ids?: string[];
  period_start: string;
  period_end: string;
  period_label: string;
  shop_id?: string;
}

// Generate Payroll Draft
export const generatePayroll = async (params: GeneratePayrollParams) => {
  try {
    const response = await axiosInstance.post(`${bandu_url}/payroll/generate`, params);
    message.success("Payroll draft generated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to generate payroll";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Get All Payrolls
export const fetchPayrolls = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/payroll`, {
      params: {
        page: params.page,
        limit: params.limit,
        department_id: params.department_id,
        status: params.status,
        period_start: params.period_start,
        period_end: params.period_end,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching payrolls:", error);
    message.error(error?.response?.data?.message || "Failed to fetch payrolls");
    return { payrolls: [], total: 0 };
  }
};

// Delete Payroll
export const deletePayroll = async (payrollId: string) => {
  try {
    const response = await axiosInstance.delete(`${bandu_url}/payroll/${payrollId}`);
    message.success("Payroll deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete payroll";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Save Deduction Settings
export const saveDeductionSettings = async (settings: any) => {
  try {
    const response = await axiosInstance.post(`${bandu_url}/deduction-settings`, settings);
    message.success("Deduction settings saved successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to save deduction settings";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Submit Payroll for Approval
export const submitPayrollForApproval = async (payrollId: string) => {
  try {
    const response = await axiosInstance.post(`${bandu_url}/payroll/${payrollId}/submit`);
    message.success("Payroll submitted for approval");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to submit payroll for approval";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Approve Payroll
export const approvePayrollRequest = async (payrollId: string) => {
  try {
    const response = await axiosInstance.post(`${bandu_url}/payroll/${payrollId}/approve`);
    message.success("Payroll approved successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to approve payroll";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Get Single Payroll
export const getPayrollById = async (payrollId: string) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/payroll/${payrollId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch payroll";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Approve Payroll
export const approvePayroll = createAsyncThunk(
  "bandu/approvePayroll",
  async (payrollId: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`${bandu_url}/payroll/${payrollId}/approve`);
      message.success("Payroll approved successfully");
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to approve payroll";
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

// Process Payroll (Post to Accounting)
export const processPayroll = createAsyncThunk(
  "bandu/processPayroll",
  async (payrollId: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`${bandu_url}/payroll/${payrollId}/process`);
      message.success("Payroll processed successfully");
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to process payroll";
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

// Mark Payroll as Paid
export const markPayrollAsPaid = createAsyncThunk(
  "bandu/markPayrollAsPaid",
  async (
    { payrollId, payment_date }: { payrollId: string; payment_date: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(`${bandu_url}/payroll/${payrollId}/pay`, {
        payment_date,
      });
      message.success("Payroll marked as paid");
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to mark payroll as paid";
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

// Void Payroll
export const voidPayroll = createAsyncThunk(
  "bandu/voidPayroll",
  async (
    { payrollId, reason }: { payrollId: string; reason: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(`${bandu_url}/payroll/${payrollId}/void`, {
        reason,
      });
      message.success("Payroll voided");
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to void payroll";
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

// Update Payroll Line (Adjustments)
export const updatePayrollLine = createAsyncThunk(
  "bandu/updatePayrollLine",
  async (
    {
      payrollId,
      line_id,
      adjustments,
    }: {
      payrollId: string;
      line_id: string;
      adjustments: {
        overtime_hours?: number;
        custom_deductions?: Array<{ name: string; amount: number }>;
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.patch(`${bandu_url}/payroll/${payrollId}/line`, {
        line_id,
        adjustments,
      });
      message.success("Payroll line updated");
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to update payroll line";
      message.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/* ============================
   PAYSLIPS
============================ */

export interface Payslip {
  _id: string;
  payroll_id: string;
  employee_id: {
    _id: string;
    employee_number: string;
    fullname: string;
    job_title: string;
  };
  period_start: string;
  period_end: string;
  period_label: string;
  gross_salary: number;
  basic_salary: number;
  allowances: number;
  benefits: number;
  deductions: {
    paye: number;
    nssf: number;
    nhif: number;
    housing_levy: number;
    custom: Array<{ name: string; amount: number }>;
    total: number;
  };
  net_pay: number;
  days_worked: number;
  overtime_hours: number;
  overtime_pay: number;
  generated_at: string;
}

// Generate Payslip
export const generatePayslip = async (payrollId: string, employeeId: string) => {
  try {
    const response = await axiosInstance.post(`${bandu_url}/payslips/generate/${payrollId}/${employeeId}`);
    message.success("Payslip generated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to generate payslip";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Generate Batch Payslips for a Payroll
export const generateBatchPayslips = async (payrollId: string) => {
  try {
    const response = await axiosInstance.post(`${bandu_url}/payslips/generate-batch/${payrollId}`);
    message.success("Payslips generated successfully for all employees");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to generate batch payslips";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Get Employee Payslip History
export const fetchEmployeePayslips = async (employeeId: string, params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/payslips/employee/${employeeId}`, {
      params: {
        page: params.page,
        limit: params.limit,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching payslips:", error);
    message.error(error?.response?.data?.message || "Failed to fetch payslips");
    return { payslips: [], total: 0 };
  }
};

// Get All Payslips (Admin only)
export const fetchAllPayslips = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/payslips`, {
      params: {
        page: params.page,
        limit: params.limit,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching all payslips:", error);
    message.error(error?.response?.data?.message || "Failed to fetch payslips");
    return { payslips: [], total: 0 };
  }
};

// Get Single Payslip
export const getPayslipById = async (payslipId: string) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/payslips/${payslipId}`);
    return response.data.data || response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch payslip";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Email Payslip to Employee
export const emailPayslip = async (payslipId: string) => {
  try {
    const response = await axiosInstance.post(`${bandu_url}/payslips/${payslipId}/email`);
    message.success("Payslip emailed successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to email payslip";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/* ============================
   P9 FORMS (KRA TAX FORMS)
============================ */

export interface P9Form {
  _id: string;
  employee_id: {
    _id: string;
    employee_number: string;
    fullname: string;
    kra_pin?: string;
  };
  year: number;
  basic_salary: number;
  benefits: number;
  total_gross: number;
  paye: number;
  nssf: number;
  nhif: number;
  housing_levy: number;
  taxable_pay: number;
  generated_at: string;
}

// Generate P9 Form
export const generateP9Form = async (employeeId: string, year: number) => {
  try {
    const response = await axiosInstance.post(`${bandu_url}/p9-forms/generate/${employeeId}/${year}`);
    message.success("P9 form generated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to generate P9 form";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Get Employee P9 History
export const fetchEmployeeP9Forms = async (employeeId: string, params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/p9-forms/employee/${employeeId}`, {
      params: {
        page: params.page,
        limit: params.limit,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching P9 forms:", error);
    message.error(error?.response?.data?.message || "Failed to fetch P9 forms");
    return { p9_forms: [], total: 0 };
  }
};

// Get Single P9 Form
export const getP9FormById = async (p9FormId: string) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/p9-forms/${p9FormId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch P9 form";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// Email P9 Form to Employee
export const emailP9Form = async (p9FormId: string) => {
  try {
    const response = await axiosInstance.post(`${bandu_url}/p9-forms/${p9FormId}/email`);
    message.success("P9 form emailed successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to email P9 form";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/* ============================
   REPORTS
============================ */

// Payroll Summary Report
export const fetchPayrollSummaryReport = async (params: {
  department_id?: string;
  period_start?: string;
  period_end?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/reports/payroll-summary`, {
      params: {
        department_id: params.department_id,
        period_start: params.period_start,
        period_end: params.period_end,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching payroll summary report:", error);
    message.error(error?.response?.data?.message || "Failed to fetch report");
    return { success: false, data: null };
  }
};

// Leave Utilization Report
export const fetchLeaveUtilizationReport = async (params: {
  department_id?: string;
  year?: number;
}) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/reports/leave-utilization`, {
      params: {
        department_id: params.department_id,
        year: params.year,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching leave utilization report:", error);
    message.error(error?.response?.data?.message || "Failed to fetch report");
    return { success: false, data: null };
  }
};

// Tax Summary Report
export const fetchTaxSummaryReport = async (params: {
  department_id?: string;
  period_start?: string;
  period_end?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/reports/tax-summary`, {
      params: {
        department_id: params.department_id,
        period_start: params.period_start,
        period_end: params.period_end,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching tax summary report:", error);
    message.error(error?.response?.data?.message || "Failed to fetch report");
    return { success: false, data: null };
  }
};

// Document Expiration Report
export const fetchDocumentExpirationReport = async (days = 30) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/reports/document-expiration`, {
      params: { days },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching document expiration report:", error);
    return { success: false, data: null };
  }
};

// Deduction Analysis Report
export const fetchDeductionAnalysisReport = async (params: {
  department_id?: string;
  period_start?: string;
  period_end?: string;
}) => {
  try {
    const response = await axiosInstance.get(`${bandu_url}/reports/deduction-analysis`, {
      params: {
        department_id: params.department_id,
        period_start: params.period_start,
        period_end: params.period_end,
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching deduction analysis report:", error);
    message.error(error?.response?.data?.message || "Failed to fetch report");
    return { success: false, data: null };
  }
};
