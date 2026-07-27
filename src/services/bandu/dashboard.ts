import axiosInstance from "../request";
import { message } from "antd";
import { fetchEmployees } from "./index";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmployeeStats {
  total_employees: number;
  active_employees: number;
  on_leave: number;
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
}

export interface PayrollStats {
  total_payroll_this_month: number;
  total_deductions: number;
  net_pay: number;
  pending_payroll: number;
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
}

export interface EmployeeByDepartment {
  department: string;
  count: number;
  active: number;
  on_leave: number;
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
    expiration_date: string;
    days_until: number;
  }>;
  recent_activities: Array<{
    type: string;
    description: string;
    timestamp: string;
    employee_name?: string;
  }>;
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
      balance: {
        entitled: number;
        used: number;
        pending: number;
        remaining: number;
      };
    };
    payroll: {
      total_payrolls: number;
      total_net: number;
      total_gross: number;
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
  };
}

// ── Fetch HR Dashboard ───────────────────────────────────────────────────────

export const fetchHRDashboard = async (params: HRDashboardParams): Promise<HRDashboardData> => {
  try {
    console.log("Fetching HR dashboard with params:", params);
    const response = await axiosInstance.get<APIHRDashboardResponse>("/bandu/hr/dashboard", { params });
    console.log("HR dashboard response:", response.data);
    const apiData = response.data.data;

    // Fetch employees to build department breakdown
    let employeesByDepartment: EmployeeByDepartment[] = [];
    try {
      const employeesResponse = await fetchEmployees({ shop_id: params.shop_id });
      const employees = Array.isArray(employeesResponse) ? employeesResponse : employeesResponse?.data || [];

      // Group employees by department
      const deptMap: Record<string, { count: number; active: number; on_leave: number }> = {};
      employees.forEach((emp: any) => {
        const deptName = emp.department_id?.name || "Unassigned";
        if (!deptMap[deptName]) {
          deptMap[deptName] = { count: 0, active: 0, on_leave: 0 };
        }
        deptMap[deptName].count++;
        if (emp.employment_status === "active") {
          deptMap[deptName].active++;
        }
      });

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

    // Map API response to expected dashboard structure
    const mappedData = {
      employee_stats: {
        total_employees: apiData.employees.total,
        active_employees: apiData.employees.active,
        on_leave: 0, // Not provided by API
        new_hires_this_month: 0, // Not provided by API
      },
      leave_stats: {
        total_requests: apiData.leave.pending + apiData.leave.approved + apiData.leave.rejected,
        pending: apiData.leave.pending,
        approved: apiData.leave.approved,
        rejected: apiData.leave.rejected,
        on_leave_today: 0, // Not provided by API
      },
      attendance_stats: {
        present_today: 0, // Not provided by API
        absent_today: 0, // Not provided by API
        late_today: 0, // Not provided by API
        average_attendance_rate: 0, // Not provided by API
      },
      payroll_stats: {
        total_payroll_this_month: apiData.payroll.total_gross,
        total_deductions: apiData.payroll.total_gross - apiData.payroll.total_net,
        net_pay: apiData.payroll.total_net,
        pending_payroll: 0, // Not provided by API
      },
      payroll_trend: [], // Not provided by API
      leave_by_type: [], // Not provided by API
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
      expiring_documents: [], // Not provided by API
      recent_activities: [], // Not provided by API
    };
    console.log("Mapped dashboard data:", mappedData);
    return mappedData;
  } catch (error: any) {
    console.error("Error fetching HR dashboard:", error);
    const errorMessage = error?.response?.data?.message || error?.message || "Failed to fetch HR dashboard";
    message.error(errorMessage);
    throw error;
  }
};
