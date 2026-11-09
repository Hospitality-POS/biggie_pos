import React from "react";
import { Row, Col, Typography } from "antd";
import {
  TeamOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { KPICard } from "./SharedUI";
import { fmtK } from "@utils/formatters";

const { Text } = Typography;

export interface BanduExecutiveKPIsProps {
  employeeStats: {
    total_employees: number;
    active_employees: number;
    suspended?: number;
    terminated?: number;
  };
  attendanceStats: {
    average_attendance_rate: number;
    present_today: number;
    average_hours?: number;
  };
  trackedStaff: number;
  leaveStats: {
    pending: number;
    on_leave_today: number;
    approved: number;
    rejected: number;
  };
  payrollStats: {
    net_pay: number;
    total_payroll_this_month: number;
    total_deductions: number;
  };
  isMobile: boolean;
  onSelectTab?: (tab: string) => void;
}

export const BanduExecutiveKPIs: React.FC<BanduExecutiveKPIsProps> = ({
  employeeStats,
  attendanceStats,
  trackedStaff,
  leaveStats,
  payrollStats,
  isMobile,
  onSelectTab,
}) => {
  return (
    <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
      {/* 1. Active Workforce */}
      <Col xs={12} sm={12} lg={6}>
        <KPICard
          title="Active Workforce"
          value={employeeStats.active_employees?.toLocaleString() ?? "0"}
          icon={<TeamOutlined />}
          color="#3b82f6"
          bg="#eff6ff"
          border="#bfdbfe"
          isMobile={isMobile}
          onClick={() => onSelectTab?.("workforce")}
          subtext={
            <Text style={{ fontSize: 11, color: "#64748b" }}>
              {employeeStats.total_employees} total · {employeeStats.suspended || 0} suspended · {employeeStats.terminated || 0} left
            </Text>
          }
        />
      </Col>

      {/* 2. Attendance Rate */}
      <Col xs={12} sm={12} lg={6}>
        <KPICard
          title="Attendance Rate"
          value={`${((attendanceStats.average_attendance_rate || 0) * 100).toFixed(1)}%`}
          icon={<CheckCircleOutlined />}
          color="#10b981"
          bg="#f0fdf4"
          border="#bbf7d0"
          isMobile={isMobile}
          onClick={() => onSelectTab?.("pulse")}
          subtext={
            <Text style={{ fontSize: 11, color: "#64748b" }}>
              {attendanceStats.present_today} of {trackedStaff} in today · {attendanceStats.average_hours || 0}h avg shift
            </Text>
          }
        />
      </Col>

      {/* 3. Leave Requests */}
      <Col xs={12} sm={12} lg={6}>
        <KPICard
          title="Pending Approvals"
          value={`${leaveStats.pending || 0} Pending`}
          icon={<CalendarOutlined />}
          color="#f59e0b"
          bg="#fffbeb"
          border="#fde68a"
          isMobile={isMobile}
          onClick={() => onSelectTab?.("operations")}
          subtext={
            <Text style={{ fontSize: 11, color: "#64748b" }}>
              {leaveStats.on_leave_today || 0} out today · {leaveStats.approved || 0} approved this period
            </Text>
          }
        />
      </Col>

      {/* 4. Net Payroll */}
      <Col xs={12} sm={12} lg={6}>
        <KPICard
          title="Net Payroll"
          value={`KES ${fmtK(payrollStats.net_pay || 0)}`}
          icon={<DollarOutlined />}
          color="#6366f1"
          bg="#eef2ff"
          border="#c7d2fe"
          isMobile={isMobile}
          onClick={() => onSelectTab?.("payroll")}
          subtext={
            <Text style={{ fontSize: 11, color: "#64748b" }}>
              Gross: KES {fmtK(payrollStats.total_payroll_this_month || 0)} · Ded: KES {fmtK(payrollStats.total_deductions || 0)}
            </Text>
          }
        />
      </Col>
    </Row>
  );
};
