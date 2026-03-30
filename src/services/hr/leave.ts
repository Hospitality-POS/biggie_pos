import { ParamsType } from "@ant-design/pro-components";
import { BASE_URL } from "@utils/config";
import { message } from "antd";
import axiosInstance from "../request";
import { createAsyncThunk } from "@reduxjs/toolkit";

const hr_url = `${BASE_URL}/hr`;

/* ============================
   LEAVE OPERATIONS
============================ */

// Staff: submit a leave request
export const applyForLeave = async (params: {
    leave_type: "Annual" | "Sick" | "Emergency" | "Maternity" | "Paternity" | "Unpaid";
    start_date: string;
    end_date: string;
    reason?: string;
}) => {
    try {
        const response = await axiosInstance.post(`${hr_url}/leave`, params);
        message.success("Leave application submitted successfully");
        return response.data;
    } catch (error: any) {
        const errorMessage =
            error?.response?.data?.message || error?.message || "Failed to submit leave application";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

// Fetch leave requests — admins see all, staff see their own
export const fetchLeaves = async (params: ParamsType = {}) => {
    try {
        const response = await axiosInstance.get(`${hr_url}/leave`, {
            params: {
                status: params.status,
                leave_type: params.leave_type,
                staff_id: params.staff_id,
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

// Get a single leave by ID
export const getLeaveById = async (leaveId: string) => {
    try {
        const response = await axiosInstance.get(`${hr_url}/leave/${leaveId}`);
        return response.data;
    } catch (error: any) {
        const errorMessage =
            error?.response?.data?.message || error?.message || "Failed to fetch leave";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

// Admin: approve a leave request
export const approveLeave = createAsyncThunk(
    "hr/approveLeave",
    async (leaveId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.patch(`${hr_url}/leave/${leaveId}/approve`);
            message.success("Leave approved successfully");
            return response.data;
        } catch (error: any) {
            const errorMessage =
                error?.response?.data?.message || error?.message || "Failed to approve leave";
            message.error(errorMessage);
            return rejectWithValue(errorMessage);
        }
    }
);

// Admin: reject a leave request
export const rejectLeave = createAsyncThunk(
    "hr/rejectLeave",
    async (
        { leaveId, rejection_reason }: { leaveId: string; rejection_reason?: string },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.patch(
                `${hr_url}/leave/${leaveId}/reject`,
                { rejection_reason }
            );
            message.success("Leave rejected");
            return response.data;
        } catch (error: any) {
            const errorMessage =
                error?.response?.data?.message || error?.message || "Failed to reject leave";
            message.error(errorMessage);
            return rejectWithValue(errorMessage);
        }
    }
);

// Staff/Admin: cancel a leave request
export const cancelLeave = createAsyncThunk(
    "hr/cancelLeave",
    async (leaveId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.patch(`${hr_url}/leave/${leaveId}/cancel`);
            message.success("Leave cancelled");
            return response.data;
        } catch (error: any) {
            const errorMessage =
                error?.response?.data?.message || error?.message || "Failed to cancel leave";
            message.error(errorMessage);
            return rejectWithValue(errorMessage);
        }
    }
);

/* ============================
   LEAVE BALANCE OPERATIONS
============================ */

// Get leave balance for a staff member
export const fetchLeaveBalance = async (staffId: string, year?: number) => {
    try {
        const response = await axiosInstance.get(`${hr_url}/leave/balance/${staffId}`, {
            params: year ? { year } : {},
        });
        return response.data;
    } catch (error: any) {
        console.error("Error fetching leave balance:", error);
        message.error(error?.response?.data?.message || "Failed to fetch leave balance");
        return { balances: [] };
    }
};

// Admin: seed/reset leave entitlements for a staff member
export const seedLeaveBalance = createAsyncThunk(
    "hr/seedLeaveBalance",
    async (
        data: {
            staff_id: string;
            year: number;
            entitlements: Array<{
                leave_type: "Annual" | "Sick" | "Emergency" | "Maternity" | "Paternity" | "Unpaid";
                entitled: number;
            }>;
        },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosInstance.post(`${hr_url}/leave/balance/seed`, data);
            message.success("Leave balances updated successfully");
            return response.data;
        } catch (error: any) {
            const errorMessage =
                error?.response?.data?.message || error?.message || "Failed to seed leave balances";
            message.error(errorMessage);
            return rejectWithValue(errorMessage);
        }
    }
);

/* ============================
   ATTENDANCE OPERATIONS
============================ */

// Staff: clock in
export const clockIn = async () => {
    try {
        const response = await axiosInstance.post(`${hr_url}/attendance/clock-in`);
        message.success(response.data?.message || "Clocked in successfully");
        return response.data;
    } catch (error: any) {
        const errorMessage =
            error?.response?.data?.message || error?.message || "Failed to clock in";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

// Staff: clock out
export const clockOut = async () => {
    try {
        const response = await axiosInstance.post(`${hr_url}/attendance/clock-out`);
        message.success(response.data?.message || "Clocked out successfully");
        return response.data;
    } catch (error: any) {
        const errorMessage =
            error?.response?.data?.message || error?.message || "Failed to clock out";
        message.error(errorMessage);
        throw new Error(errorMessage);
    }
};

// Staff: get today's clock status (clocked in / clocked out / not started)
export const fetchClockStatus = async () => {
    try {
        const response = await axiosInstance.get(`${hr_url}/attendance/status`);
        return response.data;
    } catch (error: any) {
        console.error("Error fetching clock status:", error);
        return { clocked_in: false, clocked_out: false, clock: null };
    }
};

// Staff: get own attendance history
export const fetchMyAttendance = async (params: ParamsType = {}) => {
    try {
        const response = await axiosInstance.get(`${hr_url}/attendance/my`, {
            params: {
                from: params.from,
                to: params.to,
                page: params.page,
                limit: params.limit,
            },
        });
        return response.data;
    } catch (error: any) {
        console.error("Error fetching attendance:", error);
        message.error(error?.response?.data?.message || "Failed to fetch attendance");
        return { summaries: [], clock_records: [], total: 0 };
    }
};

// Admin: get all staff attendance
export const fetchAllAttendance = async (params: ParamsType = {}) => {
    try {
        const response = await axiosInstance.get(`${hr_url}/attendance`, {
            params: {
                staff_id: params.staff_id,
                status: params.status,
                from: params.from,
                to: params.to,
                page: params.page,
                limit: params.limit,
                view: params.view || "summary",   // "summary" | "raw"
            },
        });
        return response.data;
    } catch (error: any) {
        console.error("Error fetching all attendance:", error);
        message.error(error?.response?.data?.message || "Failed to fetch attendance records");
        return { records: [], total: 0 };
    }
};

// Admin: get aggregated attendance report, optionally email it
export const fetchAttendanceReport = async (params: {
    from?: string;
    to?: string;
    staff_id?: string;
    send_email?: boolean;
}) => {
    try {
        const response = await axiosInstance.get(`${hr_url}/attendance/report`, {
            params: {
                from: params.from,
                to: params.to,
                staff_id: params.staff_id,
                send_email: params.send_email ? "true" : undefined,
            },
        });
        if (params.send_email) message.success("Attendance report emailed successfully");
        return response.data;
    } catch (error: any) {
        console.error("Error fetching attendance report:", error);
        message.error(error?.response?.data?.message || "Failed to fetch attendance report");
        return { report: [] };
    }
};

// Admin: reconcile attendance for a specific date (or yesterday by default)
export const reconcileAttendance = createAsyncThunk(
    "hr/reconcileAttendance",
    async (date: string | undefined, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`${hr_url}/attendance/reconcile`, {
                date,
            });
            message.success(response.data?.message || "Attendance reconciled successfully");
            return response.data;
        } catch (error: any) {
            const errorMessage =
                error?.response?.data?.message || error?.message || "Failed to reconcile attendance";
            message.error(errorMessage);
            return rejectWithValue(errorMessage);
        }
    }
);

/* ============================
   TYPES
============================ */

export type LeaveType =
    | "Annual"
    | "Sick"
    | "Emergency"
    | "Maternity"
    | "Paternity"
    | "Unpaid";

export type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export type AttendanceStatus =
    | "Present"
    | "Absent"
    | "Late"
    | "On Leave"
    | "Public Holiday";

export interface Leave {
    _id: string;
    staff_id: {
        _id: string;
        fullname: string;
        username: string;
        thumbnail?: string;
    };
    shop_id: string;
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    days_requested: number;
    reason?: string;
    status: LeaveStatus;
    approved_by?: { _id: string; fullname: string };
    approved_at?: string;
    rejection_reason?: string;
    createdAt: string;
    updatedAt: string;
}

export interface LeaveBalance {
    _id: string;
    staff_id: string;
    year: number;
    leave_type: LeaveType;
    entitled: number;
    used: number;
    pending: number;
    remaining: number;
}

export interface AttendanceSummary {
    _id: string;
    staff_id: {
        _id: string;
        fullname: string;
        username: string;
        thumbnail?: string;
    };
    date: string;
    shift_id?: {
        startTime: string;
        endTime: string;
        dayOfWeek: string;
    };
    expected_hours: number;
    actual_hours: number;
    overtime_hours: number;
    status: AttendanceStatus;
    absence_reason?: string;
    leave_id?: string;
}

export interface ClockStatus {
    clocked_in: boolean;
    clocked_out: boolean;
    clock_in?: string;
    clock_out?: string;
    hours_so_far?: number;
    clock?: {
        _id: string;
        staff_id: string;
        clock_in: string;
        clock_out?: string;
    };
}

export interface AttendanceReport {
    staff_id: string;
    fullname: string;
    username: string;
    present_days: number;
    late_days: number;
    absent_days: number;
    leave_days: number;
    holiday_days: number;
    total_hours: number;
    expected_hours: number;
    overtime_hours: number;
    raw_clock_hours: number;
    total_sessions: number;
    attendance_rate: number;
}