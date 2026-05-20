import React, { useState } from "react";
import { Typography, Card, Row, Col, Statistic, DatePicker, Select, Button, Table, Tag } from "antd";
import { TeamOutlined, DollarOutlined, UsergroupAddOutlined, ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchHRReports } from "@services/hr";
import dayjs from "dayjs";

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const BanduReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [reportType, setReportType] = useState<string>("");

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ["hr-reports", { start_date: dateRange[0].format("YYYY-MM-DD"), end_date: dateRange[1].format("YYYY-MM-DD") }],
    queryFn: () => fetchHRReports({
      start_date: dateRange[0].format("YYYY-MM-DD"),
      end_date: dateRange[1].format("YYYY-MM-DD"),
      type: reportType,
    }),
  });

  const reports = reportsData || {};

  const headcountColumns = [
    { title: "Department", dataIndex: "department", key: "department" },
    { title: "Active Employees", dataIndex: "active_count", key: "active_count" },
    { title: "On Leave", dataIndex: "on_leave_count", key: "on_leave_count" },
    { title: "Total", dataIndex: "total_count", key: "total_count" },
  ];

  const payrollColumns = [
    { title: "Month", dataIndex: "month", key: "month" },
    { title: "Total Payroll", dataIndex: "total_payroll", key: "total_payroll", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
    { title: "Total Deductions", dataIndex: "total_deductions", key: "total_deductions", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
    { title: "Net Pay", dataIndex: "net_pay", key: "net_pay", render: (v: number) => `KES ${v?.toLocaleString() || 0}` },
    { title: "Employees Paid", dataIndex: "employees_paid", key: "employees_paid" },
  ];

  const turnoverColumns = [
    { title: "Month", dataIndex: "month", key: "month" },
    { title: "Departures", dataIndex: "departures", key: "departures" },
    { title: "New Hires", dataIndex: "new_hires", key: "new_hires" },
    { title: "Turnover Rate", dataIndex: "turnover_rate", key: "turnover_rate", render: (v: number) => `${v}%` },
  ];

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

        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          />
          <Select
            placeholder="Report Type"
            value={reportType}
            onChange={setReportType}
            style={{ width: 200 }}
            allowClear
          >
            <Option value="headcount">Headcount</Option>
            <Option value="payroll">Payroll Summary</Option>
            <Option value="turnover">Turnover</Option>
            <Option value="attendance">Attendance</Option>
          </Select>
        </div>

        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Employees"
                value={reports.summary?.total_employees || 0}
                prefix={<TeamOutlined />}
                valueStyle={{ color: "#3f8600" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Payroll"
                value={reports.summary?.total_payroll || 0}
                prefix={<DollarOutlined />}
                precision={0}
                formatter={(value) => `KES ${value?.toLocaleString()}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Active Employees"
                value={reports.summary?.active_employees || 0}
                prefix={<UsergroupAddOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Avg Net Pay"
                value={reports.summary?.avg_net_pay || 0}
                prefix={<ArrowUpOutlined />}
                precision={0}
                formatter={(value) => `KES ${value?.toLocaleString()}`}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card title="Headcount by Department" loading={isLoading}>
              <Table
                columns={headcountColumns}
                dataSource={reports.headcount || []}
                rowKey="department"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Payroll Summary" loading={isLoading}>
              <Table
                columns={payrollColumns}
                dataSource={reports.payroll_summary || []}
                rowKey="month"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          <Col xs={24}>
            <Card title="Employee Turnover" loading={isLoading}>
              <Table
                columns={turnoverColumns}
                dataSource={reports.turnover || []}
                rowKey="month"
                pagination={{ pageSize: 5 }}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default BanduReportsPage;
