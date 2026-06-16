import React, { useState } from "react";
import { Typography, Card, DatePicker, Button, Tabs, Table, Space } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { 
  fetchAttendanceSummary, 
  fetchLeaveApplications,
  fetchPayrollSummaryReport,
  fetchStatutoryDeductions,
  fetchNewHires,
  fetchTurnoverReport
} from "@services/hr";
import dayjs from "dayjs";

const { Title } = Typography;
const { RangePicker } = DatePicker;

type ReportTab = "attendance" | "leave" | "payroll" | "statutory" | "headcount" | "turnover";

const TAB_ITEMS = [
  { key: "attendance", label: "Attendance" },
  { key: "leave", label: "Leave" },
  { key: "payroll", label: "Payroll" },
  { key: "statutory", label: "Statutory" },
  { key: "headcount", label: "Headcount" },
  { key: "turnover", label: "Turnover" },
];

const BanduReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [activeTab, setActiveTab] = useState<ReportTab>("attendance");
  const [hasFilterApplied, setHasFilterApplied] = useState(false);

  // Attendance data
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ["hr-attendance", { start_date: dateRange[0]?.format("YYYY-MM-DD"), end_date: dateRange[1]?.format("YYYY-MM-DD") }],
    queryFn: () => fetchAttendanceSummary(dateRange[0]!.format("YYYY-MM-DD"), dateRange[1]!.format("YYYY-MM-DD")),
    enabled: activeTab === "attendance" && hasFilterApplied && dateRange[0] !== null && dateRange[1] !== null,
  });

  // Leave applications data
  const { data: leaveApplicationsData, isLoading: leaveApplicationsLoading } = useQuery({
    queryKey: ["hr-leave-applications", { start_date: dateRange[0]?.format("YYYY-MM-DD"), end_date: dateRange[1]?.format("YYYY-MM-DD") }],
    queryFn: () => fetchLeaveApplications({ start_date: dateRange[0]!.format("YYYY-MM-DD"), end_date: dateRange[1]!.format("YYYY-MM-DD") }),
    enabled: activeTab === "leave" && hasFilterApplied && dateRange[0] !== null && dateRange[1] !== null,
  });

  // Payroll summary data
  const { data: payrollData, isLoading: payrollLoading } = useQuery({
    queryKey: ["hr-payroll", { start_date: dateRange[0]?.format("YYYY-MM-DD"), end_date: dateRange[1]?.format("YYYY-MM-DD") }],
    queryFn: () => fetchPayrollSummaryReport(dateRange[0]!.format("YYYY-MM-DD"), dateRange[1]!.format("YYYY-MM-DD")),
    enabled: activeTab === "payroll" && hasFilterApplied && dateRange[0] !== null && dateRange[1] !== null,
  });

  // Statutory deductions data
  const { data: statutoryData, isLoading: statutoryLoading } = useQuery({
    queryKey: ["hr-statutory", { start_date: dateRange[0]?.format("YYYY-MM-DD"), end_date: dateRange[1]?.format("YYYY-MM-DD") }],
    queryFn: () => fetchStatutoryDeductions(dateRange[0]!.format("YYYY-MM-DD"), dateRange[1]!.format("YYYY-MM-DD")),
    enabled: activeTab === "statutory" && hasFilterApplied && dateRange[0] !== null && dateRange[1] !== null,
  });

  // New hires data
  const { data: newHiresData, isLoading: newHiresLoading } = useQuery({
    queryKey: ["hr-new-hires", { start_date: dateRange[0]?.format("YYYY-MM-DD"), end_date: dateRange[1]?.format("YYYY-MM-DD") }],
    queryFn: () => fetchNewHires(dateRange[0]!.format("YYYY-MM-DD"), dateRange[1]!.format("YYYY-MM-DD")),
    enabled: activeTab === "headcount" && hasFilterApplied && dateRange[0] !== null && dateRange[1] !== null,
  });

  // Turnover data
  const { data: turnoverData, isLoading: turnoverLoading } = useQuery({
    queryKey: ["hr-turnover", { start_date: dateRange[0]?.format("YYYY-MM-DD"), end_date: dateRange[1]?.format("YYYY-MM-DD") }],
    queryFn: () => fetchTurnoverReport({ start_date: dateRange[0]!.format("YYYY-MM-DD"), end_date: dateRange[1]!.format("YYYY-MM-DD") }),
    enabled: activeTab === "turnover" && hasFilterApplied && dateRange[0] !== null && dateRange[1] !== null,
  });

  const attendance = attendanceData || {};
  const leaveApps = leaveApplicationsData || {};
  const payroll = payrollData || {};
  const statutory = statutoryData || {};
  const newHires = newHiresData?.report || {};
  const turnover = turnoverData?.turnover || {};

  const attendanceColumns = [
    { title: "Employee ID", dataIndex: "employee_id", key: "employee_id" },
    { title: "Employee Name", dataIndex: "employee_name", key: "employee_name" },
    { title: "Date", dataIndex: "date", key: "date" },
    { title: "Status", dataIndex: "status", key: "status" },
    { title: "Hours Worked", dataIndex: "hours_worked", key: "hours_worked" },
    { title: "Overtime Hours", dataIndex: "overtime_hours", key: "overtime_hours" },
  ];

  const renderAttendance = () => (
    <Table
      columns={attendanceColumns}
      dataSource={attendance.records || []}
      loading={attendanceLoading}
      rowKey={(record) => `${record.employee_id}-${record.date}`}
      pagination={{ pageSize: 20 }}
    />
  );

  const leaveColumns = [
    { title: "Employee ID", dataIndex: "employee_id", key: "employee_id" },
    { title: "Employee Name", dataIndex: "employee_name", key: "employee_name" },
    { title: "Leave Type", dataIndex: "leave_type", key: "leave_type" },
    { title: "Start Date", dataIndex: "start_date", key: "start_date" },
    { title: "End Date", dataIndex: "end_date", key: "end_date" },
    { title: "Days", dataIndex: "days", key: "days" },
    { title: "Status", dataIndex: "status", key: "status" },
  ];

  const renderLeave = () => (
    <Table
      columns={leaveColumns}
      dataSource={leaveApps.applications || []}
      loading={leaveApplicationsLoading}
      rowKey={(record) => `${record.employee_id}-${record.start_date}`}
      pagination={{ pageSize: 20 }}
    />
  );

  const payrollColumns = [
    { title: "Employee ID", dataIndex: "employee_id", key: "employee_id" },
    { title: "Employee Name", dataIndex: "employee_name", key: "employee_name" },
    { title: "Pay Period", dataIndex: "pay_period", key: "pay_period" },
    { title: "Gross Pay", dataIndex: "gross_pay", key: "gross_pay", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
    { title: "Net Pay", dataIndex: "net_pay", key: "net_pay", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
    { title: "PAYE", dataIndex: "paye", key: "paye", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
    { title: "NHIF", dataIndex: "nhif", key: "nhif", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
    { title: "NSSF", dataIndex: "nssf", key: "nssf", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
  ];

  const renderPayroll = () => (
    <Table
      columns={payrollColumns}
      dataSource={payroll.payroll_runs || []}
      loading={payrollLoading}
      rowKey={(record) => `${record.employee_id}-${record.pay_period}`}
      pagination={{ pageSize: 20 }}
    />
  );

  const statutoryColumns = [
    { title: "Employee ID", dataIndex: "employee_id", key: "employee_id" },
    { title: "Employee Name", dataIndex: "employee_name", key: "employee_name" },
    { title: "PAYE", dataIndex: "paye", key: "paye", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
    { title: "NHIF", dataIndex: "nhif", key: "nhif", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
    { title: "NSSF", dataIndex: "nssf", key: "nssf", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
    { title: "Housing Levy", dataIndex: "housing_levy", key: "housing_levy", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
  ];

  const renderStatutory = () => (
    <Table
      columns={statutoryColumns}
      dataSource={statutory.additional_statutory_deductions || []}
      loading={statutoryLoading}
      rowKey={(record) => `${record.employee_id}-${record.paye}`}
      pagination={{ pageSize: 20 }}
    />
  );

  const headcountColumns = [
    { title: "Employee ID", dataIndex: "employee_id", key: "employee_id" },
    { title: "Employee Name", dataIndex: "employee_name", key: "employee_name" },
    { title: "Department", dataIndex: "department", key: "department" },
    { title: "Employment Type", dataIndex: "employment_type", key: "employment_type" },
    { title: "Hire Date", dataIndex: "hire_date", key: "hire_date" },
  ];

  const renderHeadcount = () => (
    <Table
      columns={headcountColumns}
      dataSource={newHires.hires || []}
      loading={newHiresLoading}
      rowKey="employee_id"
      pagination={{ pageSize: 20 }}
    />
  );

  const turnoverColumns = [
    { title: "Employee ID", dataIndex: "employee_id", key: "employee_id" },
    { title: "Employee Name", dataIndex: "employee_name", key: "employee_name" },
    { title: "Department", dataIndex: "department", key: "department" },
    { title: "Termination Date", dataIndex: "termination_date", key: "termination_date" },
    { title: "Reason", dataIndex: "reason", key: "reason" },
  ];

  const renderTurnover = () => (
    <Table
      columns={turnoverColumns}
      dataSource={turnover.departures || []}
      loading={turnoverLoading}
      rowKey={(record) => `${record.employee_id}-${record.termination_date}`}
      pagination={{ pageSize: 20 }}
    />
  );

  const renderTabContent = () => {
    if (!hasFilterApplied) {
      return (
        <div style={{ textAlign: "center", padding: 48, color: "#888" }}>
          Please select a date range and click "Apply Filter" to view report data
        </div>
      );
    }

    switch (activeTab) {
      case "attendance":
        return renderAttendance();
      case "leave":
        return renderLeave();
      case "payroll":
        return renderPayroll();
      case "statutory":
        return renderStatutory();
      case "headcount":
        return renderHeadcount();
      case "turnover":
        return renderTurnover();
      default:
        return null;
    }
  };

  const handleApplyFilter = () => {
    if (dateRange[0] && dateRange[1]) {
      setHasFilterApplied(true);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>
            HR Reports
          </Title>
          <p style={{ color: "#888", marginTop: 8 }}>
            View and analyze HR metrics and reports
          </p>
        </div>

        <Space style={{ marginBottom: 24 }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
          />
          <Button type="primary" onClick={handleApplyFilter} disabled={!dateRange[0] || !dateRange[1]}>
            Apply Filter
          </Button>
          <Button icon={<DownloadOutlined />} disabled={!hasFilterApplied}>Export</Button>
        </Space>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as ReportTab)}
          items={TAB_ITEMS}
          tabBarStyle={{ marginBottom: 16 }}
        />

        {renderTabContent()}
      </Card>
    </div>
  );
};

export default BanduReportsPage;
