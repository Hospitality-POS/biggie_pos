import React, { useState } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Select,
  Row,
  Col,
  Statistic,
  Drawer,
  Descriptions,
  message,
} from "antd";
import {
  FileTextOutlined,
  DownloadOutlined,
  MailOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmployeePayslips,
  fetchAllPayslips,
  getPayslipById,
  emailPayslip,
  fetchEmployees,
  type Payslip,
} from "@services/bandu";
import { getUser } from "@services/tenants";
import { generatePayslipPDF } from "@utils/payslipPDF";
import { generateP9FormPDF } from "@utils/p9FormPDF";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;

const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
};

const PayslipView: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);

  const user = getUser();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  // Fetch employees for admin filter
  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: () => fetchEmployees(),
    enabled: isAdmin,
  });

  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.data || [];

  // Fetch payslips based on user role and employee filter
  const { data: payslipsData, isLoading } = useQuery({
    queryKey: isAdmin ? ["all-payslips", selectedYear, selectedEmployeeId] : ["employee-payslips", selectedYear],
    queryFn: () => {
      if (isAdmin) {
        if (selectedEmployeeId) {
          return fetchEmployeePayslips(selectedEmployeeId, { year: selectedYear });
        }
        return fetchAllPayslips({ year: selectedYear });
      } else {
        return fetchEmployeePayslips(user?._id || user?.id, { year: selectedYear });
      }
    },
  });

  const payslips = Array.isArray(payslipsData) ? payslipsData : payslipsData?.data || [];

  // Email payslip mutation
  const emailMutation = useMutation({
    mutationFn: emailPayslip,
    onSuccess: () => {
      message.success("Payslip emailed successfully");
    },
  });

  const handleViewPayslip = async (payslipId: string) => {
    try {
      const data = await getPayslipById(payslipId);
      setSelectedPayslip(data);
      setIsDrawerVisible(true);
    } catch (error) {
      // Error handled by service
    }
  };

  const handleEmailPayslip = async (payslipId: string) => {
    try {
      await emailMutation.mutateAsync(payslipId);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDownloadPayslip = async () => {
    if (selectedPayslip) {
      await generatePayslipPDF(selectedPayslip);
    }
  };

  const handleDownloadP9Form = async () => {
    if (payslips.length > 0) {
      await generateP9FormPDF(payslips, selectedYear);
    } else {
      message.warning('No payslips available for the selected year');
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: isAdmin ? ["all-payslips", selectedYear] : ["employee-payslips", selectedYear] });
  };

  const columns = [
    {
      title: "Period",
      key: "period",
      render: (_: unknown, record: Payslip) => (
        <Text strong>{record.period_label}</Text>
      ),
    },
    {
      title: "Period Start",
      dataIndex: "period_start",
      key: "period_start",
      render: (date: string) => <Text>{dayjs(date).format("DD MMM YYYY")}</Text>,
    },
    {
      title: "Period End",
      dataIndex: "period_end",
      key: "period_end",
      render: (date: string) => <Text>{dayjs(date).format("DD MMM YYYY")}</Text>,
    },
    {
      title: "Gross Salary",
      dataIndex: "gross_salary",
      key: "gross_salary",
      render: (amount: number) => <Text>{amount?.toLocaleString()} KES</Text>,
    },
    {
      title: "Total Deductions",
      dataIndex: ["deductions", "total"],
      key: "deductions",
      render: (amount: number) => <Text style={{ color: C.red }}>{amount?.toLocaleString()} KES</Text>,
    },
    {
      title: "Net Pay",
      dataIndex: "net_pay",
      key: "net_pay",
      render: (amount: number) => <Text strong style={{ color: C.green }}>{amount?.toLocaleString()} KES</Text>,
    },
    {
      title: "Generated",
      dataIndex: "generated_at",
      key: "generated_at",
      render: (date: string) => <Text>{dayjs(date).format("DD MMM YYYY")}</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Payslip) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewPayslip(record._id)}
          >
            View
          </Button>
          <Button
            type="link"
            icon={<MailOutlined />}
            onClick={() => handleEmailPayslip(record._id)}
            loading={emailMutation.isLoading}
          >
            Email
          </Button>
        </Space>
      ),
    },
  ];

  const totalGross = payslips.reduce((sum: number, p: Payslip) => sum + (p.gross_salary || 0), 0);
  const totalNet = payslips.reduce((sum: number, p: Payslip) => sum + (p.net_pay || 0), 0);
  const totalDeductions = payslips.reduce((sum: number, p: Payslip) => sum + (p.deductions?.total || 0), 0);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={3} style={{ margin: 0, color: C.darkText }}>
          <FileTextOutlined style={{ marginRight: 8, color: C.primary }} />
          {isAdmin ? "All Payslips" : "My Payslips"}
        </Title>
        <Space>
          {isAdmin && (
            <Select
              placeholder="Filter by Employee"
              value={selectedEmployeeId}
              onChange={setSelectedEmployeeId}
              allowClear
              style={{ width: 200 }}
              showSearch
              optionFilterProp="children"
            >
              {employees.map((emp: any) => (
                <Option key={emp._id} value={emp._id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_number})
                </Option>
              ))}
            </Select>
          )}
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: 120 }}
          >
            <Option value={new Date().getFullYear()}>{new Date().getFullYear()}</Option>
            <Option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</Option>
            <Option value={new Date().getFullYear() - 2}>{new Date().getFullYear() - 2}</Option>
          </Select>
          <Button
            icon={<FilePdfOutlined />}
            onClick={handleDownloadP9Form}
            disabled={payslips.length === 0}
          >
            Download P9 Form
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={isLoading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Summary Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Payslips"
              value={payslips.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: C.blue, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Gross"
              value={totalGross}
              prefix="KES"
              valueStyle={{ color: C.blue, fontSize: 20 }}
              formatter={(value) => `${value?.toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Deductions"
              value={totalDeductions}
              prefix="KES"
              valueStyle={{ color: C.red, fontSize: 20 }}
              formatter={(value) => `${value?.toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Net Pay"
              value={totalNet}
              prefix="KES"
              valueStyle={{ color: C.green, fontSize: 20 }}
              formatter={(value) => `${value?.toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={payslips}
          loading={isLoading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Payslip Detail Drawer */}
      <Drawer
        title="Payslip Details"
        placement="right"
        width={720}
        open={isDrawerVisible}
        onClose={() => {
          setIsDrawerVisible(false);
          setSelectedPayslip(null);
        }}
      >
        {selectedPayslip && (
          <div>
            <Descriptions bordered column={2} title="Pay Period">
              <Descriptions.Item label="Period" span={2}>
                {selectedPayslip.period_label}
              </Descriptions.Item>
              <Descriptions.Item label="Start Date">
                {dayjs(selectedPayslip.period_start).format("DD MMM YYYY")}
              </Descriptions.Item>
              <Descriptions.Item label="End Date">
                {dayjs(selectedPayslip.period_end).format("DD MMM YYYY")}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions bordered column={2} title="Earnings" style={{ marginTop: 16 }}>
              <Descriptions.Item label="Basic Salary">
                {selectedPayslip.basic_salary?.toLocaleString()} KES
              </Descriptions.Item>
              <Descriptions.Item label="Allowances">
                {selectedPayslip.allowances?.toLocaleString()} KES
              </Descriptions.Item>
              <Descriptions.Item label="Benefits">
                {selectedPayslip.benefits?.toLocaleString()} KES
              </Descriptions.Item>
              <Descriptions.Item label="Gross Salary">
                <Text strong style={{ color: C.blue }}>
                  {selectedPayslip.gross_salary?.toLocaleString()} KES
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Descriptions bordered column={2} title="Deductions" style={{ marginTop: 16 }}>
              <Descriptions.Item label="PAYE">
                {selectedPayslip.deductions?.paye?.toLocaleString()} KES
              </Descriptions.Item>
              <Descriptions.Item label="NSSF">
                {selectedPayslip.deductions?.nssf?.toLocaleString()} KES
              </Descriptions.Item>
              <Descriptions.Item label="NHIF">
                {selectedPayslip.deductions?.nhif?.toLocaleString()} KES
              </Descriptions.Item>
              <Descriptions.Item label="Housing Levy">
                {selectedPayslip.deductions?.housing_levy?.toLocaleString()} KES
              </Descriptions.Item>
              {selectedPayslip.deductions?.custom?.map((deduction: { name: string; amount: number }, index: number) => (
                <Descriptions.Item label={deduction.name} key={index}>
                  {deduction.amount?.toLocaleString()} KES
                </Descriptions.Item>
              ))}
              <Descriptions.Item label="Total Deductions" span={2}>
                <Text strong style={{ color: C.red }}>
                  {selectedPayslip.deductions?.total?.toLocaleString()} KES
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Descriptions bordered column={2} title="Summary" style={{ marginTop: 16 }}>
              <Descriptions.Item label="Days Worked">
                {selectedPayslip.days_worked}
              </Descriptions.Item>
              <Descriptions.Item label="Overtime Hours">
                {selectedPayslip.overtime_hours}
              </Descriptions.Item>
              <Descriptions.Item label="Overtime Pay">
                {selectedPayslip.overtime_pay?.toLocaleString()} KES
              </Descriptions.Item>
              <Descriptions.Item label="Net Pay" span={2}>
                <Text strong style={{ color: C.green, fontSize: 18 }}>
                  {selectedPayslip.net_pay?.toLocaleString()} KES
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Space>
                <Button
                  type="primary"
                  icon={<MailOutlined />}
                  onClick={() => handleEmailPayslip(selectedPayslip._id)}
                  loading={emailMutation.isLoading}
                >
                  Email Payslip
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleDownloadPayslip}>
                  Download PDF
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PayslipView;
