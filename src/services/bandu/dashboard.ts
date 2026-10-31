import axiosInstance from "../request";
import { message } from "antd";
import { fetchEmployees } from "./index";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmployeeStats {
  total_employees: number;
  active_employees: number;
  on_leave: number;
  suspended: number;
  terminated: number;
  resigned: number;
  new_hires_this_month: number;
}

export interface LeaveStats {
  total_requests: number;
  pending: number;
  approved: number;
  rejected: number;
  on_leave_today: number;
}

export interface AttendanceStats {
  present_today: number;
  absent_today: number;
  late_today: number;
  average_attendance_rate: number;
  clocked_in_now: number;
  tracked_staff: number;
  average_hours: number;
}

export interface PayrollStats {
  total_payroll_this_month: number;
  total_deductions: number;
  net_pay: number;
  pending_payroll: number;
  pending_runs: number;
  salary_bill: number;
  average_basic_salary: number;
}

export interface PayrollTrendMonth {
  label: string;
  gross_pay: number;
  deductions: number;
  net_pay: number;
}

export interface LeaveByType {
  leave_type: string;
  count: number;
  approved: number;
  pending: number;
  days?: number;
}

export interface EmployeeByDepartment {
  department: string;
  count: number;
  active: number;
  on_leave: number;
}

export interface StatutoryDeductions {
  paye: number;
  nssf: number;
  shif: number;
  housing_levy: number;
  nita: number;
  withholding_tax: number;
  other: number;
}

export interface PayrollPipelineStage {
  status: "draft" | "pending_approval" | "approved" | "processed" | "paid";
  count: number;
  amount: number;
}

export interface LeaveEntry {
  leave_id: string;
  employee_name: string;
  job_title?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
}

export interface WorkforceStats {
  hires_in_period: number;
  exits_in_period: number;
  turnover_rate: number;
  average_tenure_years: number;
  headcount_trend: Array<{ label: string; hires: number; exits: number; headcount: number }>;
  tenure_bands: Array<{ band: string; count: number }>;
  employment_types: Array<{ type: string; count: number }>;
  upcoming_anniversaries: Array<{
    employee_id: string;
    employee_name: string;
    job_title?: string;
    hire_date: string;
    years: number;
    days_until: number;
  }>;
}

export interface LeaveBalanceSummary {
  entitled: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface HRDashboardData {
  employee_stats: EmployeeStats;
  leave_stats: LeaveStats;
  attendance_stats: AttendanceStats;
  payroll_stats: PayrollStats;
  payroll_trend: PayrollTrendMonth[];
  leave_by_type: LeaveByType[];
  employees_by_department: EmployeeByDepartment[];
  gender_breakdown?: {
    male: number;
    female: number;
    other: number;
    prefer_not_to_say: number;
    not_specified: number;
  };
  upcoming_birthdays: Array<{
    employee_id: string;
    employee_name: string;
    employee_number: string;
    job_title: string;
    birthday: string;
    days_until: number;
  }>;
  expiring_documents: Array<{
    employee_id: string;
    fullname: string;
    document_name: string;
    document_type?: string;
    expiration_date: string;
    days_until: number;
  }>;
  recent_activities: Array<{
    type: string;
    description: string;
    timestamp: string;
    employee_name?: string;
  }>;
  statutory: StatutoryDeductions;
  payroll_pipeline: PayrollPipelineStage[];
  on_leave_today: LeaveEntry[];
  pending_leave_requests: LeaveEntry[];
  attendance_trend: Array<{ date: string; label: string; present: number }>;
  workforce: WorkforceStats;
  leave_balance: LeaveBalanceSummary;
  departments_total: number;
}

export interface HRDashboardParams {
  shop_id?: string;
  start_date?: string;
  end_date?: string;
}

// ── API Response Types (actual structure from backend) ─────────────────────────────

export interface APIHRDashboardResponse {
  success: boolean;
  data: {
    period: {
      start: string;
      end: string;
    };
    employees: {
      total: number;
      active: number;
      inactive: number;
      new_hires?: number;
      gender_breakdown?: {
        male: number;
        female: number;
        other: number;
        prefer_not_to_say: number;
        not_specified: number;
      };
    };
    departments: {
      total: number;
    };
    leave: {
      pending: number;
      approved: number;
      rejected: number;
      balance: LeaveBalanceSummary;
    };
    payroll: {
      total_payrolls: number;
      total_net: number;
      total_gross: number;
      // Newer API versions also send the fields below
      total_deductions?: number;
      statutory?: StatutoryDeductions;
      trend?: PayrollTrendMonth[];
      pipeline?: PayrollPipelineStage[];
      pending_amount?: number;
      pending_runs?: number;
      salary_bill?: number;
      average_basic_salary?: number;
    };
    birthdays?: {
      upcoming: Array<{
        employee_id: string;
        employee_name: string;
        employee_number: string;
        job_title: string;
        date_of_birth: string;
        days_until: number;
      }>;
      count: number;
    };
    leave_by_type?: LeaveByType[];
    on_leave_today?: LeaveEntry[];
    pending_leave_requests?: LeaveEntry[];
    attendance?: {
      tracked_staff: number;
      present_today: number;
      clocked_in_now: number;
      absent_today: number;
      attendance_rate: number;
      average_hours: number;
      trend: Array<{ date: string; label: string; present: number }>;
    };
    workforce?: WorkforceStats;
    expiring_documents?: HRDashboardData["expiring_documents"];
    recent_activities?: HRDashboardData["recent_activities"];
  };
}

const EMPTY_STATUTORY: StatutoryDeductions = {
  paye: 0,
  nssf: 0,
  shif: 0,
  housing_levy: 0,
  nita: 0,
  withholding_tax: 0,
  other: 0,
};

const EMPTY_WORKFORCE: WorkforceStats = {
  hires_in_period: 0,
  exits_in_period: 0,
  turnover_rate: 0,
  average_tenure_years: 0,
  headcount_trend: [],
  tenure_bands: [],
  employment_types: [],
  upcoming_anniversaries: [],
};

// ── Fetch HR Dashboard ───────────────────────────────────────────────────────

export const fetchHRDashboard = async (params: HRDashboardParams): Promise<HRDashboardData> => {
  try {
    const response = await axiosInstance.get<APIHRDashboardResponse>("/bandu/hr/dashboard", { params });
    const apiData = response.data.data;

    // Fetch employees to build department breakdown and per-status counts
    let employeesByDepartment: EmployeeByDepartment[] = [];
    let statusCounts: Record<string, number> | null = null;
    try {
      const employeesResponse = await fetchEmployees({ shop_id: params.shop_id });
      const employees = Array.isArray(employeesResponse) ? employeesResponse : employeesResponse?.data || [];

      // Group employees by department
      const deptMap: Record<string, { count: number; active: number; on_leave: number }> = {};
      const counts: Record<string, number> = {
        active: 0,
        on_leave: 0,
        suspended: 0,
        terminated: 0,
        resigned: 0,
      };
      employees.forEach((emp: any) => {
        const deptName = emp.department_id?.name || "Unassigned";
        if (!deptMap[deptName]) {
          deptMap[deptName] = { count: 0, active: 0, on_leave: 0 };
        }
        deptMap[deptName].count++;
        if (emp.employment_status === "active") {
          deptMap[deptName].active++;
        }
        if (emp.employment_status === "on_leave") {
          deptMap[deptName].on_leave++;
        }
        const status = String(emp.employment_status || "");
        if (status in counts) counts[status]++;
      });
      statusCounts = counts;

      employeesByDepartment = Object.entries(deptMap).map(([department, stats]) => ({
        department,
        count: stats.count,
        active: stats.active,
        on_leave: stats.on_leave,
      }));
    } catch (err) {
      console.error("Error fetching employees for department breakdown:", err);
    }

    // Build gender breakdown from API data if available
    const genderBreakdown = apiData.employees.gender_breakdown || {
      male: 0,
      female: 0,
      other: 0,
      prefer_not_to_say: 0,
      not_specified: 0,
    };

    const attendance = apiData.attendance;
    const onLeaveToday = apiData.on_leave_today || [];

    // Map API response to expected dashboard structure
    return {
      employee_stats: {
        total_employees: apiData.employees.total,
        active_employees: statusCounts ? statusCounts.active : apiData.employees.active,
        on_leave: statusCounts?.on_leave || 0,
        suspended: statusCounts?.suspended || 0,
        terminated: statusCounts?.terminated || 0,
        resigned: statusCounts?.resigned || 0,
        new_hires_this_month: apiData.employees.new_hires || 0,
      },
      leave_stats: {
        total_requests: apiData.leave.pending + apiData.leave.approved + apiData.leave.rejected,
        pending: apiData.leave.pending,
        approved: apiData.leave.approved,
        rejected: apiData.leave.rejected,
        on_leave_today: onLeaveToday.length,
      },
      attendance_stats: {
        present_today: attendance?.present_today || 0,
        absent_today: attendance?.absent_today || 0,
        late_today: 0, // Not provided by API
        average_attendance_rate: attendance?.attendance_rate || 0,
        clocked_in_now: attendance?.clocked_in_now || 0,
        tracked_staff: attendance?.tracked_staff || 0,
        average_hours: attendance?.average_hours || 0,
      },
      payroll_stats: {
        total_payroll_this_month: apiData.payroll.total_gross,
        total_deductions: apiData.payroll.total_deductions ?? apiData.payroll.total_gross - apiData.payroll.total_net,
        net_pay: apiData.payroll.total_net,
        pending_payroll: apiData.payroll.pending_amount || 0,
        pending_runs: apiData.payroll.pending_runs || 0,
        salary_bill: apiData.payroll.salary_bill || 0,
        average_basic_salary: apiData.payroll.average_basic_salary || 0,
      },
      payroll_trend: apiData.payroll.trend || [],
      leave_by_type: apiData.leave_by_type || [],
      employees_by_department: employeesByDepartment,
      gender_breakdown: genderBreakdown,
      upcoming_birthdays: apiData.birthdays?.upcoming?.map((b) => ({
        employee_id: b.employee_id,
        employee_name: b.employee_name,
        employee_number: b.employee_number,
        job_title: b.job_title,
        birthday: b.date_of_birth,
        days_until: b.days_until,
      })) || [],
      expiring_documents: apiData.expiring_documents || [],
      recent_activities: apiData.recent_activities || [],
      statutory: apiData.payroll.statutory || EMPTY_STATUTORY,
      payroll_pipeline: apiData.payroll.pipeline || [],
      on_leave_today: onLeaveToday,
      pending_leave_requests: apiData.pending_leave_requests || [],
      attendance_trend: attendance?.trend || [],
      workforce: apiData.workforce || EMPTY_WORKFORCE,
      leave_balance: apiData.leave.balance || { entitled: 0, used: 0, pending: 0, remaining: 0 },
      departments_total: apiData.departments?.total || 0,
    };
  } catch (error: any) {
    console.error("Error fetching HR dashboard:", error);
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch HR dashboard";
    message.error(errorMessage);
    throw error;
  }
};
