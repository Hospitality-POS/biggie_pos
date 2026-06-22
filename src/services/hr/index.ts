import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";

const hr_url = `${BASE_URL}/api/hr`;

/* ============================
   EMPLOYEE PROFILE
============================ */

export interface EmployeeProfile {
  _id: string;
  user_id: string;
  shop_id: string;
  department_id?: string;
  hire_date: string;
  employment_type: "Full-time" | "Part-time" | "Contract" | "Intern" | "Probation";
  job_title: string;
  position?: string;
  grade_level?: string;
  employee_status: "Active" | "On Probation" | "Suspended" | "Terminated" | "Resigned";
  probation_end_date?: string;
  termination_date?: string;
  termination_reason?: string;
  resignation_date?: string;
  resignation_reason?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
  kra_pin?: string;
  tax_bracket?: string;
  nhif_number?: string;
  nssf_number?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  next_of_kin_relationship?: string;
  next_of_kin_address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const createEmployeeProfile = async (data: Partial<EmployeeProfile>) => {
  try {
    const response = await axiosInstance.post(`${hr_url}/employee-profile`, data);
   
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to create employee profile";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchEmployeeProfiles = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/employee-profile`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching employee profiles:", error);
    message.error(error?.response?.data?.message || "Failed to fetch employee profiles");
    return { profiles: [], total: 0 };
  }
};

export const getEmployeeProfileById = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/employee-profile/${id}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch employee profile";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const getEmployeeProfileByUserId = async (userId: string) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/employee-profile/user/${userId}`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching employee profile by user:", error);
    return null;
  }
};

export const updateEmployeeProfile = async (id: string, data: Partial<EmployeeProfile>) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/employee-profile/${id}`, data);
    
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to update employee profile";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const terminateEmployee = async (id: string, data: { termination_date: string; termination_reason: string }) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/employee-profile/${id}/terminate`, data);
    // message.success("Employee terminated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to terminate employee";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const acceptResignation = async (id: string, data: { resignation_date: string; resignation_reason: string }) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/employee-profile/${id}/resign`, data);
    // message.success("Resignation accepted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to accept resignation";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateEmployeeStatus = async (id: string, data: { employee_status: string }) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/employee-profile/${id}/status`, data);
    // message.success("Employee status updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to update employee status";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const deleteEmployeeProfile = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${hr_url}/employee-profile/${id}`);
    // message.success("Employee profile deleted successfully");
    return response.data;
  } catch (error: any) {
    message.error("Failed to delete employee profile");
    throw new Error(error.message);
  }
};

export const importEmployeeProfiles = async (file: File, shopId: string, updateMode = false) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("shop_id", shopId);
    formData.append("update_mode", updateMode.toString());
    const response = await axiosInstance.post(`${hr_url}/employee-profile/import`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    // message.success("Employee profiles imported successfully");
    return response.data;
  } catch (error: any) {
    message.error("Failed to import employee profiles");
    throw new Error(error.message);
  }
};

export const downloadEmployeeProfileTemplate = async () => {
  try {
    const response = await axiosInstance.get(`${hr_url}/employee-profile/export/template`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "employee_profiles_template.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    // message.success("Template downloaded successfully");
  } catch (error: any) {
    message.error("Failed to download template");
    throw new Error(error.message);
  }
};

// ── ANALYSE FILE (preview before import — does NOT import anything) ────────────
export const analyseEmployeeFile = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axiosInstance.post(
      `${hr_url}/employee-profile/analyse-import`,
      formData,
      { headers: { "Content-Type": undefined } }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error analysing employee file:", error);
    const errMsg =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      "Failed to analyse file. Please check the file format and try again.";
    if (error?.response?.status !== 403) message.error(errMsg);
    throw error;
  }
};

/* ============================
   BANK
============================ */

export interface Bank {
  _id: string;
  bank_code: string;
  bank_name: string;
  bank_branch: string;
  swift_code?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  shop_id: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const fetchBanks = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/banks`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching banks:", error);
    message.error(error?.response?.data?.message || "Failed to fetch banks");
    return { banks: [], total: 0 };
  }
};

export const getBankById = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/banks/${id}`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching bank:", error);
    message.error(error?.response?.data?.message || "Failed to fetch bank");
    throw error;
  }
};

export const createBank = async (data: Partial<Bank>) => {
  try {
    const response = await axiosInstance.post(`${hr_url}/banks`, data);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to create bank";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateBank = async (id: string, data: Partial<Bank>) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/banks/${id}`, data);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to update bank";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const deleteBank = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${hr_url}/banks/${id}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete bank";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const importBanks = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axiosInstance.post(`${hr_url}/banks/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to import banks";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const downloadBankTemplate = async () => {
  try {
    const response = await axiosInstance.get(`${hr_url}/banks/export/template`, {
      responseType: "blob",
    });
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to download template";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

// ── ANALYSE BANK FILE (preview before import — does NOT import anything) ────────────
export const analyseBankFile = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axiosInstance.post(
      `${hr_url}/banks/analyse-import`,
      formData,
      { headers: { "Content-Type": undefined } }
    );
    return response.data;
  } catch (error: any) {
    console.error("Error analysing bank file:", error);
    const errMsg =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      "Failed to analyse file. Please check the file format and try again.";
    if (error?.response?.status !== 403) message.error(errMsg);
    throw error;
  }
};

/* ============================
   PAYROLL
============================ */

export interface Payroll {
  _id: string;
  shop_id: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  pay_period_type: "Monthly" | "Bi-weekly" | "Weekly" | "Daily";
  status: "Draft" | "Processing" | "Processed" | "Paid" | "Cancelled";
  total_employees: number;
  total_gross_pay: number;
  total_net_pay: number;
  total_deductions: number;
  total_allowances: number;
  total_overtime_pay: number;
  total_paye_tax: number;
  total_nhif: number;
  total_nssf: number;
  total_other_deductions: number;
  payment_method: "Bank Transfer" | "Cash" | "M-Pesa" | "Mixed";
  payment_reference?: string;
  journal_entry_id?: string;
  exclude_employees?: string[];
  payroll_items?: PayrollItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PayrollItem {
  // Add properties for PayrollItem here
}

export const createPayroll = async (data: Partial<Payroll>) => {
  try {
    const response = await axiosInstance.post(`${hr_url}/payroll`, data);

    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to create payroll";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchPayrolls = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/payroll`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching payrolls:", error);
    message.error(error?.response?.data?.message || "Failed to fetch payrolls");
    return { payrolls: [], total: 0 };
  }
};

export const getPayrollById = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/payroll/${id}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch payroll";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const processPayroll = async (id: string) => {
  try {
    const response = await axiosInstance.post(`${hr_url}/payroll/${id}/process`);
    // message.success("Payroll processed successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to process payroll";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const approvePayroll = async (id: string) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/payroll/${id}/approve`);
    // message.success("Payroll approved successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to approve payroll";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const cancelPayroll = async (id: string) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/payroll/${id}/cancel`);
    // message.success("Payroll cancelled successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to cancel payroll";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const deletePayroll = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${hr_url}/payroll/${id}`);
    // message.success("Payroll deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete payroll";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/* ============================
   PAYSLIPS
============================ */

export interface Payslip {
  _id: string;
  payroll_id: string;
  employee_profile_id: string;
  user_id: string;
  shop_id: string;
  basic_salary: number;
  overtime_hours: number;
  overtime_rate: number;
  overtime_pay: number;
  allowances: Array<{ name: string; amount: number; type: string }>;
  total_allowances: number;
  gross_pay: number;
  paye_tax: number;
  nhif_deduction: number;
  nssf_deduction: number;
  other_deductions: Array<{ name: string; amount: number; description: string }>;
  total_deductions: number;
  net_pay: number;
  payment_method: string;
  bank_name?: string;
  bank_account_number?: string;
  payment_status: "Pending" | "Paid" | "Failed";
  payment_reference?: string;
  paid_at?: string;
  days_worked: number;
  days_absent: number;
  leave_days_taken: number;
  createdAt: string;
  updatedAt: string;
}

export const fetchPayslips = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/payslips`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching payslips:", error);
    message.error(error?.response?.data?.message || "Failed to fetch payslips");
    return { payslips: [], total: 0 };
  }
};

export const getPayslipById = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/payslips/${id}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch payslip";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const getPayslipsByPayroll = async (payrollId: string) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/payroll/${payrollId}/payslips`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching payslips by payroll:", error);
    return { payslips: [] };
  }
};

export const getPayslipsByUser = async (userId: string) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/payslips/user/${userId}`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching payslips by user:", error);
    return { payslips: [] };
  }
};

export const updatePayslipPayment = async (id: string, data: { payment_status: string; payment_reference?: string }) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/payslips/${id}/payment`, data);
    // message.success("Payment status updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to update payment status";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/* ============================
   SHIFT SCHEDULES
============================ */

export interface ShiftSchedule {
  _id: string;
  shop_id: string;
  department_id?: string;
  schedule_start: string;
  schedule_end: string;
  schedule_type: "Weekly" | "Monthly" | "Custom";
  status: "Draft" | "Published" | "Archived";
  assignments: Array<{
    user_id: string;
    date: string;
    shift_id?: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    is_overtime: boolean;
    notes?: string;
  }>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const createShiftSchedule = async (data: Partial<ShiftSchedule>) => {
  try {
    const response = await axiosInstance.post(`${hr_url}/shift-schedules`, data);
    // message.success("Shift schedule created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to create shift schedule";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchShiftSchedules = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/shift-schedules`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching shift schedules:", error);
    message.error(error?.response?.data?.message || "Failed to fetch shift schedules");
    return { schedules: [], total: 0 };
  }
};

export const getShiftScheduleById = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/shift-schedules/${id}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch shift schedule";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateShiftSchedule = async (id: string, data: Partial<ShiftSchedule>) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/shift-schedules/${id}`, data);
    // message.success("Shift schedule updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to update shift schedule";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const publishShiftSchedule = async (id: string) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/shift-schedules/${id}/publish`);
    // message.success("Shift schedule published successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to publish shift schedule";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const deleteShiftSchedule = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${hr_url}/shift-schedules/${id}`);
    // message.success("Shift schedule deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete shift schedule";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchShiftCalendar = async (params: { start_date: string; end_date: string; user_id?: string }) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/shift-schedules/calendar`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching shift calendar:", error);
    return { events: [] };
  }
};

export const fetchShiftRoster = async (params: { date: string }) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/shift-schedules/roster`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching shift roster:", error);
    return { roster: [] };
  }
};

/* ============================
   SHIFT SWAPS
============================ */

export interface ShiftSwap {
  _id: string;
  shop_id: string;
  requested_by: string;
  requested_to: string;
  original_shift_id?: string;
  target_shift_id?: string;
  swap_date: string;
  original_start_time: string;
  original_end_time: string;
  target_start_time: string;
  target_end_time: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled" | "Completed";
  approved_by?: string;
  approved_at?: string;
  reason?: string;
  rejection_reason?: string;
  response_by?: string;
  response_at?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const createShiftSwap = async (data: Partial<ShiftSwap>) => {
  try {
    const response = await axiosInstance.post(`${hr_url}/shift-swaps`, data);
    // message.success("Shift swap request created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to create shift swap";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchShiftSwaps = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/shift-swaps`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching shift swaps:", error);
    message.error(error?.response?.data?.message || "Failed to fetch shift swaps");
    return { swaps: [], total: 0 };
  }
};

export const getShiftSwapById = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/shift-swaps/${id}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch shift swap";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const respondToShiftSwap = async (id: string, data: { status: string; rejection_reason?: string }) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/shift-swaps/${id}/respond`, data);
    // message.success("Response submitted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to respond to shift swap";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const approveShiftSwap = async (id: string) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/shift-swaps/${id}/approve`);
    // message.success("Shift swap approved successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to approve shift swap";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const cancelShiftSwap = async (id: string) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/shift-swaps/${id}/cancel`);
    // message.success("Shift swap cancelled successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to cancel shift swap";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const completeShiftSwap = async (id: string) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/shift-swaps/${id}/complete`);
    // message.success("Shift swap completed successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to complete shift swap";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

/* ============================
   HR REPORTS
============================ */

export const fetchHeadcountReport = async (params: { department_id?: string; as_of_date?: string }) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/headcount`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching headcount report:", error);
    return { headcount: { total: 0, by_status: {}, by_employment_type: {}, by_department: {} } };
  }
};

export const fetchTurnoverReport = async (params: { start_date: string; end_date: string; department_id?: string }) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/turnover`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching turnover report:", error);
    return { turnover: { total_departures: 0, turnover_rate: "0", by_reason: {}, by_department: {}, departures: [] } };
  }
};

export const fetchAttendanceReport = async (params: { start_date: string; end_date: string; group_by?: string }) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/attendance`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching attendance report:", error);
    return { summary: {}, trends: [] };
  }
};

export const fetchLeaveReport = async (params: { start_date: string; end_date: string; leave_type?: string }) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/leave`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching leave report:", error);
    return { report: { total_leaves: 0, by_type: {}, by_status: {}, leaves: [] } };
  }
};

export const fetchPayrollReport = async (params: { start_date: string; end_date: string }) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/payroll`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching payroll report:", error);
    return { summary: {}, payrolls: [] };
  }
};

export const fetchDashboardSummary = async () => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/dashboard`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching dashboard summary:", error);
    return { dashboard: {} };
  }
};

export const fetchHRReports = async (params: { start_date: string; end_date: string; type: string }) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/${params.type}`, {
      params: { start_date: params.start_date, end_date: params.end_date }
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching HR report:", error);
    return {};
  }
};

// New HR Reports API endpoints
export const fetchEmployeeDirectory = async (filters: { department_id?: string; status?: string; employment_type?: string } = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/employee-directory`, { params: filters });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching employee directory:", error);
    return { total: 0, employees: [] };
  }
};

export const fetchAttendanceSummary = async (startDate: string, endDate: string, filters: { department_id?: string } = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/attendance-summary`, {
      params: { start_date: startDate, end_date: endDate, ...filters }
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching attendance summary:", error);
    return { summary: {}, records: [] };
  }
};

export const fetchLeaveBalance = async (filters: { department_id?: string; leave_type?: string } = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/leave-balance`, { params: filters });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching leave balance:", error);
    return { total: 0, leave_balances: [] };
  }
};

export const fetchLeaveApplications = async (filters: { start_date?: string; end_date?: string; status?: string; leave_type?: string } = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/leave-applications`, { params: filters });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching leave applications:", error);
    return { total_applications: 0, by_status: {}, by_type: {}, applications: [] };
  }
};

export const fetchPayrollSummaryReport = async (startDate: string, endDate: string) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/payroll-summary`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching payroll summary:", error);
    return { summary: {}, payroll_runs: [] };
  }
};

export const fetchStatutoryDeductions = async (startDate: string, endDate: string) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/statutory-deductions`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching statutory deductions:", error);
    return { statutory_summary: {}, additional_statutory_deductions: [] };
  }
};

export const fetchNewHires = async (startDate: string, endDate: string, filters: { department_id?: string } = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/new-hires`, {
      params: { start_date: startDate, end_date: endDate, ...filters }
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching new hires:", error);
    return { report: { total_new_hires: 0, by_department: {}, by_employment_type: {}, hires: [] } };
  }
};

export const fetchHRDashboard = async () => {
  try {
    const response = await axiosInstance.get(`${hr_url}/reports/dashboard`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching HR dashboard:", error);
    return { dashboard: {} };
  }
};

/* ============================
   DEDUCTION CONFIGURATION
============================ */

export interface DeductionType {
  _id: string;
  tenant_id: string;
  code: string;
  name: string;
  description?: string;
  category: "Tax" | "Social Security" | "Health Insurance" | "Housing" | "Loan" | "Other";
  calculation_method: "Percentage" | "Fixed Amount" | "Tiered/Banded" | "Formula";
  applies_to: "All Employees" | "Specific Employees" | "Based on Salary Range";
  priority: number;
  is_active: boolean;
  is_mandatory: boolean;
  effective_from: string;
  effective_to?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeductionRule {
  _id: string;
  tenant_id: string;
  deduction_type_id: string;
  name: string;
  description?: string;
  rule_type: "Tiered/Banded" | "Fixed Amount" | "Percentage" | "Formula";
  bands?: Array<{
    name: string;
    min_amount: number;
    max_amount: number | null;
    rate: number;
    rate_type: "Percentage" | "Fixed";
    fixed_amount?: number;
  }>;
  fixed_amount?: number;
  percentage_rate?: number;
  max_amount?: number;
  min_amount?: number;
  formula?: string;
  salary_min?: number;
  salary_max?: number;
  employment_types?: string[];
  priority: number;
  is_active: boolean;
  effective_from: string;
  effective_to?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const createDeductionType = async (data: Partial<DeductionType>) => {
  try {
    const response = await axiosInstance.post(`${hr_url}/deductions/types`, data);
    // message.success("Deduction type created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to create deduction type";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchDeductionTypes = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/deductions/types`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching deduction types:", error);
    return { types: [] };
  }
};

export const updateDeductionType = async (id: string, data: Partial<DeductionType>) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/deductions/types/${id}`, data);
    // message.success("Deduction type updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to update deduction type";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const createDeductionRule = async (data: Partial<DeductionRule>) => {
  try {
    const response = await axiosInstance.post(`${hr_url}/deductions/rules`, data);
   // message.success("Deduction rule created successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to create deduction rule";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const fetchDeductionRules = async (params: ParamsType = {}) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/deductions/rules`, { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching deduction rules:", error);
    return { rules: [] };
  }
};

export const getDeductionRuleById = async (id: string) => {
  try {
    const response = await axiosInstance.get(`${hr_url}/deductions/rules/${id}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch deduction rule";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateDeductionRule = async (id: string, data: Partial<DeductionRule>) => {
  try {
    const response = await axiosInstance.patch(`${hr_url}/deductions/rules/${id}`, data);
    // message.success("Deduction rule updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to update deduction rule";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const deleteDeductionRule = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`${hr_url}/deductions/rules/${id}`);
    // message.success("Deduction rule deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete deduction rule";
    message.error(errorMessage);
    throw new Error(errorMessage);
  }
};

export const calculateDeductions = async (data: { salary: number; employment_type?: string }) => {
  try {
    const response = await axiosInstance.post(`${hr_url}/deductions/calculate`, data);
    return response.data;
  } catch (error: any) {
    console.error("Error calculating deductions:", error);
    return { gross_salary: data.salary, deductions: [], total_deductions: 0, net_pay: data.salary };
  }
};
