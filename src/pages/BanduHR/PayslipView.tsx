import React, { useState } from "react";
import {
  Table,
  Button,
  Space,
  Typography,
  Select,
  Row,
  Col,
  Drawer,
  Tag,
  Tooltip,
  Empty,
  Popconfirm,
  Modal,
  message,
} from "antd";
import {
  FileTextOutlined,
  DownloadOutlined,
  MailOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmployeePayslips,
  fetchAllPayslips,
  getPayslipById,
  emailPayslip,
  emailPayslipsBatch,
  deletePayslip,
  fetchEmployees,
  type Payslip,
} from "@services/bandu";
import { getUser } from "@services/tenants";
import { generatePayslipPDF } from "@utils/payslipPDF";
import { generateP9FormPDF } from "@utils/p9FormPDF";
import dayjs from "dayjs";
import { THEME_C } from "@utils/getPrimaryColor";

const { Title, Text } = Typography;
const { Option } = Select;

const C = THEME_C;

// ── Dashboard-style card ──────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div style={{ ...cardStyle, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: `${color}15`,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>{title}</Text>
      <Text strong style={{ fontSize: 18, color, lineHeight: 1.2 }}>
        {value}
      </Text>
    </div>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode; extra?: React.ReactNode }> = ({
  children,
  extra,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    }}
  >
    <Text
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {children}
    </Text>
    {extra}
  </div>
);

const MoneyRow: React.FC<{ label: string; value?: number; strong?: boolean; color?: string }> = ({
  label,
  value,
  strong,
  color,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      padding: "3px 0",
    }}
  >
    <Text style={{ color: "#64748b" }}>{label}</Text>
    <Text strong={strong} style={{ color: color || "#0f172a" }}>
      KES {(value ?? 0).toLocaleString()}
    </Text>
  </div>
);

const employeeLabel = (emp: any) =>
  emp?.fullname || emp?.user_id?.fullname || emp?.employee_number || "—";

const PayslipView: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isBulkSending, setIsBulkSending] = useState(false);

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
    queryKey: isAdmin
      ? ["all-payslips", selectedYear, selectedMonth, selectedEmployeeId]
      : ["employee-payslips", selectedYear, selectedMonth],
    queryFn: () => {
      const params = { year: selectedYear, month: selectedMonth };
      if (isAdmin) {
        if (selectedEmployeeId) {
          return fetchEmployeePayslips(selectedEmployeeId, params);
        }
        return fetchAllPayslips(params);
      } else {
        return fetchEmployeePayslips(user?._id || user?.id, params);
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

  // Delete payslip mutation
  const deleteMutation = useMutation({
    mutationFn: deletePayslip,
    onSuccess: () => {
      handleRefresh();
      if (isDrawerVisible) {
        setIsDrawerVisible(false);
        setSelectedPayslip(null);
      }
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

  // Send payslips to a list of ids — summarises sent/skipped/failed
  const handleBulkEmail = async (ids: string[]) => {
    if (!ids.length || isBulkSending) return;
    setIsBulkSending(true);
    try {
      const res = await emailPayslipsBatch(ids);
      const { skipped, failed } = res.results;
      message.success(res.message);
      if (skipped.length) {
        message.warning(
          `${skipped.length} skipped (no email): ${skipped
            .map((s: any) => s.employee_number || s.payslip_id)
            .join(", ")}`,
          6
        );
      }
      if (failed.length) {
        message.error(`${failed.length} failed to send`, 5);
      }
      setSelectedRowKeys([]);
      handleRefresh();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Failed to send payslips");
    } finally {
      setIsBulkSending(false);
    }
  };

  const handleDownloadPayslip = async () => {
    if (selectedPayslip) {
      await generatePayslipPDF(selectedPayslip as any);
    }
  };

  // ── P9 preview state ─────────────────────────────────────────────────────────
  const [isP9ModalOpen, setIsP9ModalOpen] = useState(false);
  const [p9EmployeeId, setP9EmployeeId] = useState<string | null>(null);

  // Unique employees present in the loaded payslips
  const p9Employees = (() => {
    const map = new Map<string, string>();
    payslips.forEach((p: any) => {
      const id = p.employee_id?._id;
      if (id && !map.has(id)) {
        map.set(
          id,
          p.employee_id?.fullname ||
            p.employee_id?.user_id?.fullname ||
            p.employee_id?.employee_number ||
            "Employee"
        );
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  })();

  const p9ActiveEmployeeId = p9EmployeeId || p9Employees[0]?.value || null;
  const p9Payslips = p9ActiveEmployeeId
    ? payslips.filter((p: any) => p.employee_id?._id === p9ActiveEmployeeId)
    : payslips;

  const handleOpenP9Modal = () => {
    if (payslips.length === 0) {
      message.warning("No payslips available for the selected year");
      return;
    }
    setP9EmployeeId(p9Employees[0]?.value || null);
    setIsP9ModalOpen(true);
  };

  const handleDownloadP9Form = async () => {
    await generateP9FormPDF(p9Payslips, selectedYear);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: isAdmin ? ["all-payslips", selectedYear] : ["employee-payslips", selectedYear],
    });
  };

  const breakdownRow = (p: Payslip) => (
    <div
      style={{
        display: "flex",
        gap: 24,
        flexWrap: "wrap",
        padding: "8px 4px",
        background: "#fafafa",
        borderRadius: 8,
      }}
    >
      <div style={{ minWidth: 190 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            display: "block",
            marginBottom: 4,
          }}
        >
          Earnings
        </Text>
        <MoneyRow label="Basic" value={p.earnings?.basic_salary} />
        <MoneyRow label="Allowances" value={p.earnings?.allowances} />
        <MoneyRow label="Benefits" value={p.earnings?.benefits} />
        <MoneyRow label="Overtime" value={p.earnings?.overtime_pay} />
      </div>
      <div style={{ minWidth: 190 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            display: "block",
            marginBottom: 4,
          }}
        >
          Deductions
        </Text>
        {[
          { label: "PAYE", value: p.deductions?.paye },
          { label: "NSSF", value: p.deductions?.nssf },
          { label: "SHA", value: p.deductions?.nhif },
          { label: "Housing Levy", value: p.deductions?.housing_levy },
          ...(p.deductions?.custom || []).map((c) => ({ label: `${c.name} (custom)`, value: c.amount })),
        ].map((d) => (
          <div
            key={d.label}
            style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12, padding: "3px 0" }}
          >
            <Text style={{ color: "#64748b" }}>{d.label}</Text>
            <Text style={{ color: "#ef4444" }}>KES {(d.value ?? 0).toLocaleString()}</Text>
          </div>
        ))}
      </div>
      <div style={{ marginLeft: "auto", alignSelf: "center" }}>
        <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Net Pay</Text>
        <Text strong style={{ fontSize: 15, color: "#10b981" }}>
          KES {(p.net_pay ?? 0).toLocaleString()}
        </Text>
      </div>
    </div>
  );

  const columns = [
    ...(isAdmin
      ? [
          {
            title: "Employee",
            key: "employee",
            render: (_: unknown, record: Payslip) => (
              <div>
                <Text style={{ fontSize: 12, fontWeight: 500, display: "block" }}>
                  {employeeLabel(record.employee_id)}
                </Text>
                <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                  {[record.employee_id?.employee_number, record.employee_id?.job_title]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </div>
            ),
          },
        ]
      : []),
    {
      title: "Period",
      key: "period",
      render: (_: unknown, record: Payslip) => (
        <div>
          <Text style={{ fontSize: 12, fontWeight: 500, display: "block" }}>{record.period_label}</Text>
          <Text style={{ fontSize: 11, color: "#94a3b8" }}>
            {dayjs(record.period_start).format("DD MMM")} – {dayjs(record.period_end).format("DD MMM YYYY")}
          </Text>
        </div>
      ),
    },
    {
      title: "Gross Salary",
      dataIndex: ["earnings", "gross_salary"],
      key: "gross_salary",
      align: "right" as const,
      render: (amount: number) => <Text>KES {(amount ?? 0).toLocaleString()}</Text>,
    },
    {
      title: "Deductions",
      dataIndex: ["deductions", "total"],
      key: "deductions",
      align: "right" as const,
      render: (amount: number) => (
        <Text style={{ color: C.red }}>KES {(amount ?? 0).toLocaleString()}</Text>
      ),
    },
    {
      title: "Net Pay",
      dataIndex: "net_pay",
      key: "net_pay",
      align: "right" as const,
      render: (amount: number) => (
        <Text strong style={{ color: C.green }}>KES {(amount ?? 0).toLocaleString()}</Text>
      ),
    },
    {
      title: "Generated",
      dataIndex: "generated_at",
      key: "generated_at",
      render: (date: string) => (
        <Text style={{ fontSize: 12 }}>{date ? dayjs(date).format("DD MMM YYYY") : "—"}</Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 140,
      render: (_: unknown, record: Payslip) => (
        <Space size={0}>
          <Tooltip title="View payslip">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleViewPayslip(record._id)} />
          </Tooltip>
          <Tooltip title="Email payslip">
            <Button
              type="text"
              size="small"
              icon={<MailOutlined />}
              onClick={() => handleEmailPayslip(record._id)}
              loading={emailMutation.isLoading}
            />
          </Tooltip>
          {isAdmin && (
            <Popconfirm
              title="Delete this payslip?"
              description="This cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => deleteMutation.mutate(record._id)}
            >
              <Tooltip title="Delete payslip">
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const totalGross = payslips.reduce((sum: number, p: Payslip) => sum + (p.earnings?.gross_salary || 0), 0);
  const totalNet = payslips.reduce((sum: number, p: Payslip) => sum + (p.net_pay || 0), 0);
  const totalDeductions = payslips.reduce((sum: number, p: Payslip) => sum + (p.deductions?.total || 0), 0);

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: C.darkText }}>
            <FileTextOutlined style={{ marginRight: 8, color: C.primary }} />
            {isAdmin ? "Payslips" : "My Payslips"}
          </Title>
          <Text style={{ fontSize: 12, color: "#64748b" }}>
            {payslips.length} payslip{payslips.length !== 1 ? "s" : ""} ·{" "}
            {selectedMonth ? `${dayjs().month(selectedMonth - 1).format("MMMM")} ` : ""}
            {selectedYear}
          </Text>
        </div>
        <Space wrap>
          {isAdmin && (
            <Select
              placeholder="Filter by Employee"
              value={selectedEmployeeId}
              onChange={setSelectedEmployeeId}
              allowClear
              style={{ width: 220 }}
              showSearch
              optionFilterProp="children"
            >
              {employees.map((emp: any) => (
                <Option key={emp._id} value={emp._id}>
                  {employeeLabel(emp)} ({emp.employee_number})
                </Option>
              ))}
            </Select>
          )}
          <Select
            value={selectedMonth}
            onChange={setSelectedMonth}
            allowClear
            placeholder="All months"
            style={{ width: 130 }}
            options={[
              { value: 1, label: "January" },
              { value: 2, label: "February" },
              { value: 3, label: "March" },
              { value: 4, label: "April" },
              { value: 5, label: "May" },
              { value: 6, label: "June" },
              { value: 7, label: "July" },
              { value: 8, label: "August" },
              { value: 9, label: "September" },
              { value: 10, label: "October" },
              { value: 11, label: "November" },
              { value: 12, label: "December" },
            ]}
          />
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: 110 }}
            options={[0, 1, 2, 3].map((offset) => {
              const y = new Date().getFullYear() - offset;
              return { value: y, label: `${y}` };
            })}
          />
          <Popconfirm
            title={`Email payslips to all ${payslips.length} employee(s)?`}
            description="Each payslip is emailed to its employee's email address."
            okText="Send All"
            onConfirm={() => handleBulkEmail(payslips.map((p: Payslip) => p._id))}
          >
            <Button
              type="primary"
              icon={<MailOutlined />}
              disabled={payslips.length === 0 || isBulkSending}
              loading={isBulkSending}
            >
              Email All
            </Button>
          </Popconfirm>
          <Tooltip title="Preview & download P9 Form for the selected year">
            <Button icon={<FilePdfOutlined />} onClick={handleOpenP9Modal} disabled={payslips.length === 0}>
              P9 Form
            </Button>
          </Tooltip>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading}>
            Refresh
          </Button>
        </Space>
      </div>

      {/* Summary Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <StatCard title="Total Payslips" value={payslips.length} icon={<FileTextOutlined />} color="#3b82f6" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard
            title="Total Gross"
            value={`KES ${totalGross.toLocaleString()}`}
            icon={<DollarOutlined />}
            color="#3b82f6"
          />
        </Col>
        <Col xs={12} md={6}>
          <StatCard
            title="Total Deductions"
            value={`KES ${totalDeductions.toLocaleString()}`}
            icon={<DeleteOutlined />}
            color="#ef4444"
          />
        </Col>
        <Col xs={12} md={6}>
          <StatCard
            title="Total Net Pay"
            value={`KES ${totalNet.toLocaleString()}`}
            icon={<CheckCircleOutlined />}
            color="#10b981"
          />
        </Col>
      </Row>

      {/* Selection bar */}
      {selectedRowKeys.length > 0 && (
        <div
          style={{
            ...cardStyle,
            padding: "8px 14px",
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
          }}
        >
          <Text style={{ fontSize: 12 }}>
            <Text strong>{selectedRowKeys.length}</Text> payslip{selectedRowKeys.length !== 1 ? "s" : ""} selected
          </Text>
          <Space>
            <Button size="small" onClick={() => setSelectedRowKeys([])}>
              Clear
            </Button>
            <Button
              size="small"
              type="primary"
              icon={<MailOutlined />}
              loading={isBulkSending}
              onClick={() => handleBulkEmail(selectedRowKeys.map(String))}
            >
              Email Selected
            </Button>
          </Space>
        </div>
      )}

      {/* Payslip table */}
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          columns={columns}
          dataSource={payslips}
          loading={isLoading}
          rowKey="_id"
          size="small"
          pagination={{ pageSize: 12 }}
          expandable={{
            expandedRowRender: breakdownRow,
          }}
          locale={{
            emptyText: (
              <Empty
                description={`No payslips for ${selectedYear}`}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: "32px 0" }}
              />
            ),
          }}
        />
      </div>

      {/* Payslip Detail Drawer */}
      <Drawer
        title="Payslip"
        placement="right"
        width={640}
        open={isDrawerVisible}
        onClose={() => {
          setIsDrawerVisible(false);
          setSelectedPayslip(null);
        }}
        styles={{ body: { background: "#f8fafc", padding: 16 } }}
      >
        {selectedPayslip && (
          <div>
            {/* Header card */}
            <div
              style={{
                ...cardStyle,
                padding: "14px 16px",
                marginBottom: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <Text strong style={{ fontSize: 14, display: "block" }}>
                  {selectedPayslip.period_label}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b" }}>
                  {employeeLabel(selectedPayslip.employee_id)} ·{" "}
                  {selectedPayslip.employee_id?.employee_number} ·{" "}
                  {dayjs(selectedPayslip.period_start).format("DD MMM")} –{" "}
                  {dayjs(selectedPayslip.period_end).format("DD MMM YYYY")}
                </Text>
              </div>
              {selectedPayslip.emailed_at ? (
                <Tag color="green" style={{ margin: 0 }}>
                  Emailed {dayjs(selectedPayslip.emailed_at).format("DD MMM YYYY")}
                </Tag>
              ) : (
                <Tag style={{ margin: 0 }}>Not emailed</Tag>
              )}
            </div>

            {/* Net pay highlight */}
            <div
              style={{
                ...cardStyle,
                padding: "16px",
                marginBottom: 14,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                textAlign: "center",
              }}
            >
              <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>NET PAY</Text>
              <Text strong style={{ fontSize: 26, color: "#10b981" }}>
                KES {(selectedPayslip.net_pay ?? 0).toLocaleString()}
              </Text>
            </div>

            {/* Earnings */}
            <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 12 }}>
              <SectionTitle
                extra={
                  <Text strong style={{ fontSize: 13 }}>
                    KES {(selectedPayslip.earnings?.gross_salary ?? 0).toLocaleString()}
                  </Text>
                }
              >
                Earnings
              </SectionTitle>
              <MoneyRow label="Basic Salary" value={selectedPayslip.earnings?.basic_salary} />
              <MoneyRow label="Allowances" value={selectedPayslip.earnings?.allowances} />
              <MoneyRow label="Benefits" value={selectedPayslip.earnings?.benefits} />
              <MoneyRow label="Overtime Pay" value={selectedPayslip.earnings?.overtime_pay} />
              <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 6, paddingTop: 6 }}>
                <MoneyRow label="Gross Salary" value={selectedPayslip.earnings?.gross_salary} strong color="#3b82f6" />
              </div>
            </div>

            {/* Deductions */}
            <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 12 }}>
              <SectionTitle
                extra={
                  <Text strong style={{ fontSize: 13, color: "#ef4444" }}>
                    − KES {(selectedPayslip.deductions?.total ?? 0).toLocaleString()}
                  </Text>
                }
              >
                Deductions
              </SectionTitle>
              <MoneyRow label="NSSF" value={selectedPayslip.deductions?.nssf} color="#ef4444" />
              <MoneyRow label="SHIF" value={selectedPayslip.deductions?.nhif} color="#ef4444" />
              <MoneyRow label="Housing Levy" value={selectedPayslip.deductions?.housing_levy} color="#ef4444" />
              <div style={{ borderTop: "1px dashed #e2e8f0", margin: "6px 0", paddingTop: 6 }}>
                <MoneyRow label="Taxable Pay" value={(selectedPayslip.deductions as any)?.taxable_pay} strong color="#64748b" />
              </div>
              <MoneyRow label="Income Tax" value={(selectedPayslip.deductions as any)?.income_tax} color="#f59e0b" />
              <MoneyRow
                label="Personal Relief"
                value={
                  (selectedPayslip.deductions as any)?.personal_relief != null
                    ? -(selectedPayslip.deductions as any).personal_relief
                    : undefined
                }
                color="#10b981"
              />
              <MoneyRow label="P.A.Y.E" value={selectedPayslip.deductions?.paye} strong color="#ef4444" />
              {(selectedPayslip.deductions?.custom || []).map((d: any, i: number) => (
                <MoneyRow key={i} label={d.name} value={d.amount} color="#ef4444" />
              ))}
              <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 6, paddingTop: 6 }}>
                <MoneyRow label="Total Deductions" value={selectedPayslip.deductions?.total} strong color="#ef4444" />
              </div>
            </div>

            {/* Meta */}
            <div style={{ ...cardStyle, padding: "12px 16px", marginBottom: 16 }}>
              <SectionTitle>Details</SectionTitle>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Tag style={{ margin: 0 }}>Days worked: {selectedPayslip.days_worked ?? 0}</Tag>
                <Tag style={{ margin: 0 }}>Overtime: {selectedPayslip.overtime_hours ?? 0} hrs</Tag>
                {selectedPayslip.generated_at && (
                  <Tag style={{ margin: 0 }}>
                    Generated: {dayjs(selectedPayslip.generated_at).format("DD MMM YYYY")}
                  </Tag>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
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
              {isAdmin && (
                <Popconfirm
                  title="Delete this payslip?"
                  description="This cannot be undone."
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => deleteMutation.mutate(selectedPayslip._id)}
                >
                  <Button danger icon={<DeleteOutlined />} loading={deleteMutation.isLoading}>
                    Delete
                  </Button>
                </Popconfirm>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ── P9 Form Preview Modal ── */}
      <Modal
        title={null}
        open={isP9ModalOpen}
        onCancel={() => setIsP9ModalOpen(false)}
        width={920}
        style={{ top: 20 }}
        destroyOnClose
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              {p9Payslips.length} payslip{p9Payslips.length !== 1 ? "s" : ""} included · Year {selectedYear}
            </Text>
            <Space>
              <Button onClick={() => setIsP9ModalOpen(false)}>Close</Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadP9Form}
                disabled={p9Payslips.length === 0}
              >
                Download P9 PDF
              </Button>
            </Space>
          </div>
        }
      >
        {(() => {
          const emp: any = p9Payslips[0]?.employee_id || {};
          const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          const rows = months.map((m) => {
            const agg = { basic: 0, benefits: 0, gross: 0, paye: 0, nssf: 0, nhif: 0, housing: 0, net: 0 };
            p9Payslips.forEach((p: any) => {
              const month = new Date(p.period_start).toLocaleString("default", { month: "short" });
              if (month === m) {
                agg.basic += p.earnings?.basic_salary || 0;
                agg.benefits += (p.earnings?.allowances || 0) + (p.earnings?.benefits || 0) + (p.earnings?.overtime_pay || 0);
                agg.gross += p.earnings?.gross_salary || 0;
                agg.paye += p.deductions?.paye || 0;
                agg.nssf += p.deductions?.nssf || 0;
                agg.nhif += p.deductions?.nhif || 0;
                agg.housing += p.deductions?.housing_levy || 0;
                agg.net += p.net_pay || 0;
              }
            });
            return { month: m, ...agg };
          });
          const tot = (k: string) => rows.reduce((s, r: any) => s + r[k], 0);
          const fmt = (v: number) => v.toLocaleString();
          const th: React.CSSProperties = {
            padding: "6px 8px", fontSize: 10, color: "#fff", background: C.primary,
            textAlign: "right", fontWeight: 600, whiteSpace: "nowrap",
          };
          const td: React.CSSProperties = { padding: "5px 8px", fontSize: 11, textAlign: "right" };
          const tdL: React.CSSProperties = { ...td, textAlign: "left", fontWeight: 600 };

          return (
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "18px 24px", borderBottom: `2px solid ${C.primary}` }}>
                <img
                  src="/kra.png"
                  alt="KRA"
                  style={{ width: 84, height: 84, objectFit: "contain", flexShrink: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div style={{ flex: 1, textAlign: "center" }}>
                  <Text strong style={{ fontSize: 20, color: C.primary, display: "block", lineHeight: 1.2 }}>
                    P9 FORM
                  </Text>
                  <Text style={{ fontSize: 12, color: "#64748b", display: "block", letterSpacing: "0.4px" }}>
                    KENYA REVENUE AUTHORITY
                  </Text>
                  <Text strong style={{ fontSize: 12, color: "#0f172a" }}>
                    Year of Income: {selectedYear}
                  </Text>
                </div>
                <div style={{ width: 84, flexShrink: 0 }} />
              </div>

              {/* Employee info */}
              <div style={{ display: "flex", gap: 32, flexWrap: "wrap", padding: "12px 18px", borderBottom: "1px solid #f1f5f9" }}>
                {[
                  { label: "Employee", value: emp.fullname || emp.user_id?.fullname || "—" },
                  { label: "Employee No.", value: emp.employee_number || "—" },
                  { label: "Job Title", value: emp.job_title || "—" },
                  { label: "KRA PIN", value: emp.kra_pin || "—" },
                ].map((f) => (
                  <div key={f.label}>
                    <Text style={{ fontSize: 10, color: "#64748b", display: "block", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                      {f.label}
                    </Text>
                    <Text strong style={{ fontSize: 13 }}>{f.value}</Text>
                  </div>
                ))}
              </div>

              {/* Employee selector (admin, multiple employees) */}
              {p9Employees.length > 1 && (
                <div style={{ padding: "10px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 12, color: "#64748b" }}>Employee:</Text>
                  <Select
                    value={p9ActiveEmployeeId}
                    onChange={setP9EmployeeId}
                    options={p9Employees}
                    style={{ minWidth: 260 }}
                    size="small"
                  />
                </div>
              )}

              {/* Monthly table */}
              <div style={{ padding: "12px 18px", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>Month</th>
                      <th style={th}>Basic</th>
                      <th style={th}>Benefits</th>
                      <th style={th}>Gross</th>
                      <th style={th}>PAYE</th>
                      <th style={th}>NSSF</th>
                      <th style={th}>SHA</th>
                      <th style={th}>Housing Levy</th>
                      <th style={th}>Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.month} style={{ borderBottom: "1px solid #f1f5f9", background: r.gross > 0 ? "#fff" : "#fafbfc" }}>
                        <td style={{ ...tdL, color: r.gross > 0 ? "#0f172a" : "#cbd5e1" }}>{r.month}</td>
                        <td style={td}>{fmt(r.basic)}</td>
                        <td style={td}>{fmt(r.benefits)}</td>
                        <td style={td}>{fmt(r.gross)}</td>
                        <td style={td}>{fmt(r.paye)}</td>
                        <td style={td}>{fmt(r.nssf)}</td>
                        <td style={td}>{fmt(r.nhif)}</td>
                        <td style={td}>{fmt(r.housing)}</td>
                        <td style={td}>{fmt(r.net)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                      <td style={tdL}>TOTAL</td>
                      <td style={td}>{fmt(tot("basic"))}</td>
                      <td style={td}>{fmt(tot("benefits"))}</td>
                      <td style={td}>{fmt(tot("gross"))}</td>
                      <td style={td}>{fmt(tot("paye"))}</td>
                      <td style={td}>{fmt(tot("nssf"))}</td>
                      <td style={td}>{fmt(tot("nhif"))}</td>
                      <td style={td}>{fmt(tot("housing"))}</td>
                      <td style={td}>{fmt(tot("net"))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Net pay banner */}
              <div style={{ padding: "0 18px 14px" }}>
                <div style={{ background: "#10b981", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>TOTAL NET PAY</Text>
                  <Text strong style={{ color: "#fff", fontSize: 15 }}>KES {fmt(tot("net"))}</Text>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: "8px 18px 14px", textAlign: "center" }}>
                <Text style={{ fontSize: 10, color: "#94a3b8" }}>
                  This is a computer-generated P9 form and does not require a signature.
                </Text>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default PayslipView;
