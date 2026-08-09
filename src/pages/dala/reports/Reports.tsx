import React, { useState, useMemo } from "react";
import { Button, DatePicker, Form, Select, Typography, Spin, Empty, Table, Space } from "antd";
import { Modal } from "antd";
import {
  HomeOutlined,
  DollarOutlined,
  CalendarOutlined,
  ToolOutlined,
  FileTextOutlined,
  PrinterOutlined,
  UserOutlined,
  TagOutlined,
  LockOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  BarChartOutlined,
  ShoppingOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { getPermissionChecker } from "@utils/getPermissionChecker";
import {
  fetchPaymentsDueReport,
  fetchCommissionsDueReport,
  fetchSalesReport,
  fetchPropertyOccupancyReport,
  fetchRentCollectionReport,
  fetchMaintenanceReport,
  fetchPortfolioAnalysisReport,
  fetchAlreadyPaidPaymentsReport,
} from "@services/dala/reports";
import { fetchAllUsersList } from "@services/users";
import { fetchProperties } from "@services/dala";
import { exportToExcel, exportToPDF } from "@utils/exportUtils";
import { formatCurrency } from "../../../utils/formatters";
import dayjs, { Dayjs } from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import quarterOfYear from "dayjs/plugin/quarterOfYear";

dayjs.extend(weekOfYear);
dayjs.extend(quarterOfYear);

const { RangePicker } = DatePicker;
const { Text } = Typography;
const { Option } = Select;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Tab config ───────────────────────────────────────────────────────────────────
const TAB_CFG = [
  {
    key: "sales",
    icon: <DollarOutlined />,
    iconColor: C.green,
    label: "Sales",
    permissionKey: "DALA_SALES_VIEW",
  },
  {
    key: "rentals",
    icon: <HomeOutlined />,
    iconColor: C.blue,
    label: "Rent Collection",
    permissionKey: "DALA_RENTALS_VIEW",
  },
  {
    key: "maintenance",
    icon: <ToolOutlined />,
    iconColor: C.orange,
    label: "Maintenance",
    permissionKey: "DALA_MAINTENANCE_VIEW",
  },
  {
    key: "portfolio",
    icon: <FileTextOutlined />,
    iconColor: C.purple,
    label: "Portfolio",
    permissionKey: "DALA_PORTFOLIO_VIEW",
  },
];

// ── Locked placeholder ────────────────────────────────────────────────────────
const LockedTab: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "60px 24px", gap: 12,
    color: "#94a3b8", textAlign: "center",
  }}>
    <LockOutlined style={{ fontSize: 32, color: "#cbd5e1" }} />
    <Text style={{ fontSize: 14, color: "#94a3b8" }}>
      You don't have permission to generate the <strong>{label}</strong> report.
    </Text>
    <Text style={{ fontSize: 12, color: "#cbd5e1" }}>
      Contact your administrator to request access.
    </Text>
  </div>
);

// ── Custom tab nav ────────────────────────────────────────────────────────────
const TabNav: React.FC<{
  tabs: (typeof TAB_CFG[number] & { allowed: boolean })[];
  active: string;
  onChange: (k: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div style={{
    display: "flex", gap: 6, flexWrap: "wrap",
    paddingBottom: 16, borderBottom: `1px solid ${C.border}`, marginBottom: 20,
  }}>
    {tabs.map((t) => {
      const on = t.key === active;
      return (
        <button
          key={t.key}
          onClick={() => t.allowed && onChange(t.key)}
          title={!t.allowed ? "You don't have permission to access this report" : undefined}
          style={{
            background: on ? C.primary : C.bg,
            color: on ? "#fff" : t.allowed ? C.subText : "#cbd5e1",
            border: `1px solid ${on ? C.primary : C.border}`,
            borderRadius: 8, padding: "7px 13px", fontSize: 12,
            fontWeight: on ? 700 : 500,
            cursor: t.allowed ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.15s", whiteSpace: "nowrap",
            opacity: t.allowed ? 1 : 0.5,
          }}
        >
          <span style={{ color: on ? "#fff" : t.allowed ? t.iconColor : "#cbd5e1", fontSize: 13 }}>
            {t.allowed ? t.icon : <LockOutlined />}
          </span>
          {t.label}
        </button>
      );
    })}
  </div>
);

// ── SectionLabel ──────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{
    display: "block", fontSize: 10, fontWeight: 700, color: C.subText,
    textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10,
  }}>
    {children}
  </span>
);

// ── Shared field components ───────────────────────────────────────────────────
const DateRangeField: React.FC<{
  onChange?: (dates: any) => void;
  presets?: { label: string; value: [Dayjs, Dayjs] }[];
}> = ({ onChange, presets }) => (
  <Form.Item
    name="dateRange"
    label={
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}>
        <CalendarOutlined /> Date & Time Range
      </span>
    }
    rules={[{ required: true, message: "Please select a date & time range" }]}
    style={{ marginBottom: 14 }}
  >
    <RangePicker
      showTime={{ format: "HH:mm" }}
      format="YYYY-MM-DD HH:mm"
      onChange={onChange}
      presets={presets}
      style={{ width: "100%", borderRadius: 8 }}
    />
  </Form.Item>
);

const GenerateButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
  loading?: boolean;
  onClick?: () => void;
}> = ({ label, icon, disabled, loading, onClick }) => (
  <Form.Item style={{ marginBottom: 0 }}>
    <Button
      type="primary" htmlType="submit"
      icon={icon} disabled={disabled} loading={loading}
      onClick={onClick}
      style={{
        background: C.primary, borderColor: C.primary,
        borderRadius: 8, height: 40, fontWeight: 600,
        fontSize: 13, width: "100%",
      }}
    >
      {label}
    </Button>
  </Form.Item>
);

// ── Summary card (matching ItemSalesModal pattern) ──────────────────────────────
const SummaryCard: React.FC<{ label: string; value: string; color: string; bg: string; icon: React.ReactNode }> = ({ label, value, color, bg, icon }) => (
  <div style={{ flex: "1 1 130px", background: bg, border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "10px 14px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span style={{ color, fontSize: 12 }}>{icon}</span>
      <Text style={{ fontSize: 10, color: C.subText, textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 700 }}>{label}</Text>
    </div>
    <Text strong style={{ fontSize: 14, color }}>{value}</Text>
  </div>
);

// ── Sales Report Summary Component ───────────────────────────────────────────────
const SalesReportSummary: React.FC<{ summary: any }> = ({ summary }) => {
  if (!summary) return null;
  
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
      <SummaryCard label="Total Sales" value={String(summary.totalSalesCount || 0)} color={C.primary} bg={C.primaryLight} icon={<ShoppingOutlined />} />
      <SummaryCard label="Total Sales Value" value={formatCurrency(summary.totalSalesValue || 0)} color={C.green} bg="#f0fdf4" icon={<DollarOutlined />} />
      <SummaryCard label="Total Paid" value={formatCurrency(summary.totalPaidAmount || 0)} color={C.blue} bg="#eff6ff" icon={<CheckCircleOutlined />} />
      <SummaryCard label="Total Balance" value={formatCurrency(summary.totalBalance || 0)} color={C.orange} bg="#fffbeb" icon={<BarChartOutlined />} />
    </div>
  );
};

// ── Payments Due Summary Component ─────────────────────────────────────────────
const PaymentsDueSummary: React.FC<{ summary: any }> = ({ summary }) => {
  if (!summary) return null;
  
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
      <SummaryCard label="Total Payments Due" value={formatCurrency(summary.totalPaymentsDue || 0)} color={C.primary} bg={C.primaryLight} icon={<DollarOutlined />} />
      <SummaryCard label="Sale Payments Due" value={formatCurrency(summary.totalSalePaymentsDue || 0)} color={C.green} bg="#f0fdf4" icon={<ShoppingOutlined />} />
      <SummaryCard label="Rent Payments Due" value={formatCurrency(summary.totalRentPaymentsDue || 0)} color={C.blue} bg="#eff6ff" icon={<HomeOutlined />} />
      <SummaryCard label="Payment Plans Count" value={String(summary.salePaymentPlansCount || 0)} color={C.orange} bg="#fffbeb" icon={<FileTextOutlined />} />
    </div>
  );
};

// ── Already Paid Summary Component ─────────────────────────────────────────────
const AlreadyPaidSummary: React.FC<{ summary: any }> = ({ summary }) => {
  if (!summary) return null;
  
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
      <SummaryCard label="Total Payments" value={formatCurrency(summary.totalPayments || 0)} color={C.primary} bg={C.primaryLight} icon={<DollarOutlined />} />
      <SummaryCard label="Sale Payments" value={formatCurrency(summary.totalSalePayments || 0)} color={C.green} bg="#f0fdf4" icon={<ShoppingOutlined />} />
      <SummaryCard label="Rent Payments" value={formatCurrency(summary.totalRentPayments || 0)} color={C.blue} bg="#eff6ff" icon={<HomeOutlined />} />
      <SummaryCard label="Total Transactions" value={String(summary.salePaymentCount + summary.rentPaymentCount || 0)} color={C.orange} bg="#fffbeb" icon={<FileTextOutlined />} />
    </div>
  );
};

// ── Generic Summary Component for other reports ─────────────────────────────
const GenericReportSummary: React.FC<{ summary: any }> = ({ summary }) => {
  if (!summary) return null;
  
  const keys = Object.keys(summary).filter(key => typeof summary[key] === 'number');
  const displayKeys = keys.slice(0, 4);
  const colors = [C.primary, C.green, C.blue, C.orange];
  const bgs = [C.primaryLight, "#f0fdf4", "#eff6ff", "#fffbeb"];
  const icons = [<DollarOutlined />, <ShoppingOutlined />, <CheckCircleOutlined />, <BarChartOutlined />];
  
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
      {displayKeys.map((key, index) => (
        <SummaryCard
          key={key}
          label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          value={key.toLowerCase().includes('amount') || key.toLowerCase().includes('value') || key.toLowerCase().includes('total') ? formatCurrency(summary[key]) : String(summary[key])}
          color={colors[index]}
          bg={bgs[index]}
          icon={icons[index]}
        />
      ))}
    </div>
  );
};

// ── Report Table Component ────────────────────────────────────────────────────
const ReportTable: React.FC<{
  data: any[];
  columns: any[];
  loading: boolean;
  onExportExcel: () => void;
  onExportPDF: () => void;
  summary?: any;
  summaryType?: "sales" | "payments" | "already-paid" | "generic";
}> = ({ data, columns, loading, onExportExcel, onExportPDF, summary, summaryType }) => (
  <div>
    {summary && summaryType === "sales" && <SalesReportSummary summary={summary} />}
    {summary && summaryType === "payments" && <PaymentsDueSummary summary={summary} />}
    {summary && summaryType === "already-paid" && <AlreadyPaidSummary summary={summary} />}
    {summary && summaryType === "generic" && <GenericReportSummary summary={summary} />}
    
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 16 }}>
      <Space>
        <Button
          icon={<FileExcelOutlined />}
          onClick={onExportExcel}
          style={{ borderRadius: 8, borderColor: C.border, color: C.subText }}
        >
          Export Excel
        </Button>
        <Button
          icon={<FilePdfOutlined />}
          onClick={onExportPDF}
          style={{ borderRadius: 8, borderColor: C.border, color: C.subText }}
        >
          Export PDF
        </Button>
      </Space>
    </div>
    
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: "#fff", overflow: "hidden" }}>
      <Table
        columns={columns}
        dataSource={data || []}
        loading={loading}
        rowKey={(record, index) => record.reference || record.saleCode || index}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
        size="small"
        style={{ fontSize: 13 }}
        scroll={{ x: 1200, y: 400 }}
        style={{ margin: 0 }}
      />
    </div>
  </div>
);

interface ReportsProps {
  onReportGenerated?: (title: string, content: React.ReactNode) => void;
}

// ── Main component ────────────────────────────────────────────────────────────
const Reports: React.FC<ReportsProps> = ({ onReportGenerated }) => {
  const can = useMemo(() => getPermissionChecker(), []);

  // Attach allowed flag to every tab
  const tabsWithAccess = useMemo(
    () => TAB_CFG.map((t) => ({ ...t, allowed: can(t.permissionKey) })),
    [can]
  );

  // Default to first tab the user can actually access
  const defaultTab = useMemo(
    () => tabsWithAccess.find((t) => t.allowed)?.key ?? TAB_CFG[0].key,
    [tabsWithAccess]
  );

  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    form.resetFields();
  };

  const handleExportExcel = (data: any[], reportName: string) => {
    exportToExcel(data, `${reportName}-${dayjs().format("YYYY-MM-DD")}`, setLoading);
  };

  const handleExportPDF = (data: any[], reportName: string, columns: any[]) => {
    exportToPDF(
      data,
      `${reportName}-${dayjs().format("YYYY-MM-DD")}`,
      setLoading,
      {
        title: reportName,
        subtitle: `Generated on ${dayjs().format("DD MMM YYYY, HH:mm")}`,
        columns: columns.map((col) => ({ header: col.title, dataKey: col.dataIndex })),
      }
    );
  };

  // ── Fetch agents/users for dropdown ───────────────────────────────────────
  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchAllUsersList(),
  });

  const agents = useMemo(() => {
    if (!usersData) return [];
    const users = Array.isArray(usersData) ? usersData : usersData.data || [];
    return users.map((user: any) => ({
      value: user._id,
      label: user.fullname || user.email,
    }));
  }, [usersData]);

  // ── Show all users (not just agents) ───────────────────────────────────────
  const allUsers = useMemo(() => {
    if (!usersData) return [];
    const users = Array.isArray(usersData) ? usersData : usersData.data || [];
    return users.map((user: any) => ({
      value: user._id,
      label: user.fullname || user.email,
    }));
  }, [usersData]);

  // ── Fetch properties for dropdown ───────────────────────────────────────
  const { data: propertiesData } = useQuery({
    queryKey: ["properties"],
    queryFn: () => fetchProperties(true),
  });

  const properties = useMemo(() => {
    if (!propertiesData?.data) return [];
    return propertiesData.data.map((prop: any) => ({
      value: prop._id,
      label: prop.name || prop.property_name,
    }));
  }, [propertiesData]);

  // ── Date range presets ───────────────────────────────────────────────────
  const rangePresets: {
    label: string;
    value: [Dayjs, Dayjs];
  }[] = [
    { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
    { label: "This Week", value: [dayjs().startOf("week"), dayjs().endOf("week")] },
    { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
    { label: "This Quarter", value: [dayjs().startOf("quarter"), dayjs().endOf("quarter")] },
    { label: "This Year", value: [dayjs().startOf("year"), dayjs().endOf("year")] },
    { label: "Last Year", value: [dayjs().subtract(1, "year").startOf("year"), dayjs().subtract(1, "year").endOf("year")] },
  ];

  // ── Active tab config (with allowed flag) ─────────────────────────────────
  const activeTabCfg = tabsWithAccess.find((t) => t.key === activeTab);

  // ── Per-tab content ───────────────────────────────────────────────────────
  const renderTabContent = () => {
    // Block rendering if user lacks permission
    if (!activeTabCfg?.allowed) {
      return <LockedTab label={activeTabCfg?.label ?? activeTab} />;
    }

    switch (activeTab) {
      case "sales":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            setLoading(true);
            try {
              const reportType = values.reportType || "sales";
              let data;
              let reportTitle;
              let reportContent;
              
              if (reportType === "payment-plans") {
                data = await fetchPaymentsDueReport({
                  shop_id: values.shopId,
                  startDate: values.dateRange?.[0]?.toISOString(),
                  endDate: values.dateRange?.[1]?.toISOString(),
                  property_id: values.propertyId,
                  status: values.status,
                });
                reportTitle = "Payment Plans Due Report";
                const paymentsData = data?.data?.salePayments || [];
                const summaryData = data?.data?.summary || null;
                reportContent = (
                  <ReportTable
                    data={paymentsData}
                    summary={summaryData}
                    summaryType="payments"
                    columns={[
                      { title: "Type", dataIndex: "type", key: "type" },
                      { title: "Reference", dataIndex: "reference", key: "reference" },
                      { title: "Customer", dataIndex: "customer", key: "customer" },
                      { title: "Property", dataIndex: "property", key: "property" },
                      { title: "Installment Amount", dataIndex: "installmentAmount", key: "installmentAmount", render: (value: number) => formatCurrency(value) },
                      { title: "Paid Amount", dataIndex: "paidAmount", key: "paidAmount", render: (value: number) => formatCurrency(value) },
                      { title: "Balance", dataIndex: "balance", key: "balance", render: (value: number) => formatCurrency(value) },
                      { title: "Due Date", dataIndex: "dueDate", key: "dueDate", render: (date: string) => dayjs(date).format("DD MMM YYYY") },
                      { title: "Status", dataIndex: "status", key: "status", render: (status: string) => (
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          background: status === "active" ? "#f59e0b20" : status === "completed" ? "#10b98120" : "#64748b20",
                          color: status === "active" ? "#f59e0b" : status === "completed" ? "#10b981" : "#64748b",
                        }}>
                          {status?.charAt(0).toUpperCase() + status?.slice(1)}
                        </span>
                      )},
                    ]}
                    loading={false}
                    onExportExcel={() => handleExportExcel(paymentsData, "payments-due")}
                    onExportPDF={() =>
                      handleExportPDF(
                        paymentsData,
                        "Payment Plans Due Report",
                        [
                          { title: "Type", dataIndex: "type" },
                          { title: "Reference", dataIndex: "reference" },
                          { title: "Customer", dataIndex: "customer" },
                          { title: "Property", dataIndex: "property" },
                          { title: "Installment Amount", dataIndex: "installmentAmount" },
                          { title: "Paid Amount", dataIndex: "paidAmount" },
                          { title: "Balance", dataIndex: "balance" },
                          { title: "Due Date", dataIndex: "dueDate" },
                          { title: "Status", dataIndex: "status" },
                        ]
                      )
                    }
                    title="Payment Plans Due Report"
                  />
                );
              } else if (reportType === "commissions") {
                data = await fetchCommissionsDueReport({
                  shop_id: values.shopId,
                  startDate: values.dateRange?.[0]?.toISOString(),
                  endDate: values.dateRange?.[1]?.toISOString(),
                  agent_id: values.agentId,
                  status: values.status,
                });
                reportTitle = "Commissions Due Report";
                const commissionsData = data?.data?.commissions || [];
                const summaryData = data?.data?.summary || null;
                reportContent = (
                  <ReportTable
                    data={commissionsData}
                    summary={summaryData}
                    summaryType="generic"
                    columns={[
                      { title: "Agent", dataIndex: "agent", key: "agent" },
                      { title: "Sale Reference", dataIndex: "sale_reference", key: "sale_reference" },
                      { title: "Commission Amount", dataIndex: "commission_amount", key: "commission_amount", render: (value: number) => formatCurrency(value) },
                      { title: "Paid Amount", dataIndex: "paid_amount", key: "paid_amount", render: (value: number) => formatCurrency(value) },
                      { title: "Balance", dataIndex: "balance_amount", key: "balance_amount", render: (value: number) => formatCurrency(value) },
                      { title: "Withholding Tax", dataIndex: "withholding_tax", key: "withholding_tax", render: (value: number) => formatCurrency(value) },
                      { title: "Status", dataIndex: "status", key: "status" },
                      { title: "Due Date", dataIndex: "due_date", key: "due_date", render: (date: string) => dayjs(date).format("DD MMM YYYY") },
                    ]}
                    loading={false}
                    onExportExcel={() => handleExportExcel(commissionsData, "commissions-due")}
                    onExportPDF={() =>
                      handleExportPDF(
                        commissionsData,
                        "Commissions Due Report",
                        [
                          { title: "Agent", dataIndex: "agent" },
                          { title: "Sale Reference", dataIndex: "sale_reference" },
                          { title: "Commission Amount", dataIndex: "commission_amount" },
                          { title: "Paid Amount", dataIndex: "paid_amount" },
                          { title: "Balance", dataIndex: "balance_amount" },
                          { title: "Withholding Tax", dataIndex: "withholding_tax" },
                          { title: "Status", dataIndex: "status" },
                          { title: "Due Date", dataIndex: "due_date" },
                        ]
                      )
                    }
                  />
                );
              } else if (reportType === "already-paid") {
                data = await fetchAlreadyPaidPaymentsReport({
                  shop_id: values.shopId,
                  startDate: values.dateRange?.[0]?.toISOString(),
                  endDate: values.dateRange?.[1]?.toISOString(),
                  property_id: values.propertyId,
                  agent_id: values.agentId,
                });
                reportTitle = "Already Paid Payments Report";
                const paymentsData = data?.data?.salePayments || [];
                const summaryData = data?.data?.summary || null;
                reportContent = (
                  <ReportTable
                    data={paymentsData}
                    summary={summaryData}
                    summaryType="already-paid"
                    columns={[
                      { title: "Type", dataIndex: "type", key: "type" },
                      { title: "Reference", dataIndex: "reference", key: "reference" },
                      { title: "Customer", dataIndex: "customer", key: "customer" },
                      { title: "Property", dataIndex: "property", key: "property" },
                      { title: "Amount", dataIndex: "amount", key: "amount", render: (value: number) => formatCurrency(value) },
                      { title: "Payment Date", dataIndex: "paymentDate", key: "paymentDate", render: (date: string) => dayjs(date).format("DD MMM YYYY") },
                      { title: "Payment Type", dataIndex: "paymentType", key: "paymentType" },
                      { title: "Status", dataIndex: "status", key: "status", render: (status: string) => (
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          background: status === "COMPLETED" ? "#10b98120" : "#64748b20",
                          color: status === "COMPLETED" ? "#10b981" : "#64748b",
                        }}>
                          {status?.charAt(0).toUpperCase() + status?.slice(1)}
                        </span>
                      )},
                    ]}
                    loading={false}
                    onExportExcel={() => handleExportExcel(paymentsData, "already-paid-payments")}
                    onExportPDF={() =>
                      handleExportPDF(
                        paymentsData,
                        "Already Paid Payments Report",
                        [
                          { title: "Type", dataIndex: "type" },
                          { title: "Reference", dataIndex: "reference" },
                          { title: "Customer", dataIndex: "customer" },
                          { title: "Property", dataIndex: "property" },
                          { title: "Amount", dataIndex: "amount" },
                          { title: "Payment Date", dataIndex: "paymentDate" },
                          { title: "Payment Type", dataIndex: "paymentType" },
                          { title: "Status", dataIndex: "status" },
                        ]
                      )
                    }
                  />
                );
              } else {
                data = await fetchSalesReport({
                  shop_id: values.shopId,
                  startDate: values.dateRange?.[0]?.toISOString(),
                  endDate: values.dateRange?.[1]?.toISOString(),
                  property_id: values.propertyId,
                  agent_id: values.agentId,
                  status: values.status,
                });
                reportTitle = "Sales Report";
                const salesData = data?.data?.sales || [];
                const summaryData = data?.data?.summary || null;
                reportContent = (
                  <ReportTable
                    data={salesData}
                    summary={summaryData}
                    columns={[
                      { title: "Sale Code", dataIndex: "saleCode", key: "saleCode" },
                      { title: "Property", dataIndex: "property", key: "property" },
                      { title: "Unit", dataIndex: "unit", key: "unit" },
                      { title: "Customer", dataIndex: "customer", key: "customer" },
                      { title: "Sale Price", dataIndex: "salePrice", key: "salePrice", render: (value: number) => formatCurrency(value) },
                      { title: "Total Paid", dataIndex: "totalPaid", key: "totalPaid", render: (value: number) => formatCurrency(value) },
                      { title: "Deposit Paid", dataIndex: "depositPaid", key: "depositPaid", render: (value: number) => formatCurrency(value) },
                      { title: "Balance", dataIndex: "balance", key: "balance", render: (value: number) => formatCurrency(value) },
                      { title: "Status", dataIndex: "status", key: "status", render: (status: string) => (
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          background: status === "completed" ? "#10b98120" : status === "reservation" ? "#f59e0b20" : "#64748b20",
                          color: status === "completed" ? "#10b981" : status === "reservation" ? "#f59e0b" : "#64748b",
                        }}>
                          {status?.charAt(0).toUpperCase() + status?.slice(1)}
                        </span>
                      )},
                      { title: "Sale Date", dataIndex: "saleDate", key: "saleDate", render: (date: string) => dayjs(date).format("DD MMM YYYY") },
                    ]}
                    loading={false}
                    onExportExcel={() => handleExportExcel(salesData, "sales")}
                    onExportPDF={() =>
                      handleExportPDF(
                        salesData,
                        "Sales Report",
                        [
                          { title: "Sale Code", dataIndex: "saleCode" },
                          { title: "Property", dataIndex: "property" },
                          { title: "Unit", dataIndex: "unit" },
                          { title: "Customer", dataIndex: "customer" },
                          { title: "Sale Price", dataIndex: "salePrice" },
                          { title: "Total Paid", dataIndex: "totalPaid" },
                          { title: "Deposit Paid", dataIndex: "depositPaid" },
                          { title: "Balance", dataIndex: "balance" },
                          { title: "Status", dataIndex: "status" },
                          { title: "Sale Date", dataIndex: "saleDate" },
                        ]
                      )
                    }
                    title="Sales Report"
                  />
                );
              }
              
              if (onReportGenerated) {
                onReportGenerated(reportTitle, reportContent);
              }
            } catch (error) {
              console.error("Error fetching report:", error);
            } finally {
              setLoading(false);
            }
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField presets={rangePresets} />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="reportType"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><FileTextOutlined /> Report Type</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="Sales Report" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="sales">Sales Report</Option>
                    <Option value="payment-plans">Payment Plans Due</Option>
                    <Option value="commissions">Commissions Due</Option>
                    <Option value="already-paid">Already Paid Payments</Option>
                  </Select>
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="propertyId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><HomeOutlined /> Property</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All properties" style={{ width: "100%", borderRadius: 8 }} options={properties} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="agentId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Agent</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All users" style={{ width: "100%", borderRadius: 8 }} options={allUsers} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="status"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><TagOutlined /> Status</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All statuses" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="completed">Completed</Option>
                    <Option value="pending">Pending</Option>
                    <Option value="cancelled">Cancelled</Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Report" icon={<PrinterOutlined />} disabled={loading} />
          </Form>
        );

      case "rentals":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            setLoading(true);
            try {
              const data = await fetchRentCollectionReport({
                shop_id: values.shopId,
                startDate: values.dateRange?.[0]?.toISOString(),
                endDate: values.dateRange?.[1]?.toISOString(),
                property_id: values.propertyId,
              });
              
              const collectionsData = data?.data?.collections || [];
              const summaryData = data?.data?.summary || null;
              const reportContent = (
                <ReportTable
                  data={collectionsData}
                  summary={summaryData}
                  summaryType="generic"
                  columns={[
                    { title: "Invoice Reference", dataIndex: "invoice_reference", key: "invoice_reference" },
                    { title: "Property", dataIndex: "property", key: "property" },
                    { title: "Unit", dataIndex: "unit", key: "unit" },
                    { title: "Tenant", dataIndex: "tenant", key: "tenant" },
                    { title: "Amount", dataIndex: "amount", key: "amount", render: (value: number) => formatCurrency(value) },
                    { title: "Paid Amount", dataIndex: "paid_amount", key: "paid_amount", render: (value: number) => formatCurrency(value) },
                    { title: "Balance", dataIndex: "balance", key: "balance", render: (value: number) => formatCurrency(value) },
                    { title: "Due Date", dataIndex: "due_date", key: "due_date", render: (date: string) => dayjs(date).format("DD MMM YYYY") },
                    { title: "Paid Date", dataIndex: "paid_date", key: "paid_date", render: (date: string) => dayjs(date).format("DD MMM YYYY") },
                    { title: "Status", dataIndex: "status", key: "status" },
                  ]}
                  loading={false}
                  onExportExcel={() => handleExportExcel(collectionsData, "rent-collection")}
                  onExportPDF={() =>
                    handleExportPDF(
                      collectionsData,
                      "Rent Collection Report",
                      [
                        { title: "Invoice Reference", dataIndex: "invoice_reference" },
                        { title: "Property", dataIndex: "property" },
                        { title: "Unit", dataIndex: "unit" },
                        { title: "Tenant", dataIndex: "tenant" },
                        { title: "Amount", dataIndex: "amount" },
                        { title: "Paid Amount", dataIndex: "paid_amount" },
                        { title: "Balance", dataIndex: "balance" },
                        { title: "Due Date", dataIndex: "due_date" },
                        { title: "Paid Date", dataIndex: "paid_date" },
                        { title: "Status", dataIndex: "status" },
                      ]
                    )
                  }
                />
              );
              
              if (onReportGenerated) {
                onReportGenerated("Rent Collection Report", reportContent);
              }
            } catch (error) {
              console.error("Error fetching report:", error);
            } finally {
              setLoading(false);
            }
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField presets={rangePresets} />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="propertyId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><HomeOutlined /> Property</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All properties" style={{ width: "100%", borderRadius: 8 }} options={properties} />
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Rent Collection Report" icon={<PrinterOutlined />} />
          </Form>
        );

      case "maintenance":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            setLoading(true);
            try {
              const data = await fetchMaintenanceReport({
                shop_id: values.shopId,
                startDate: values.dateRange?.[0]?.toISOString(),
                endDate: values.dateRange?.[1]?.toISOString(),
                property_id: values.propertyId,
                status: values.status,
                category_id: values.categoryId,
              });
              
              const ticketsData = data?.data?.tickets || [];
              const summaryData = data?.data?.summary || null;
              const reportContent = (
                <ReportTable
                  data={ticketsData}
                  summary={summaryData}
                  summaryType="generic"
                  columns={[
                    { title: "Ticket ID", dataIndex: "ticket_id", key: "ticket_id" },
                    { title: "Property", dataIndex: "property", key: "property" },
                    { title: "Unit", dataIndex: "unit", key: "unit" },
                    { title: "Category", dataIndex: "category", key: "category" },
                    { title: "Description", dataIndex: "description", key: "description" },
                    { title: "Estimated Cost", dataIndex: "estimated_cost", key: "estimated_cost", render: (value: number) => formatCurrency(value) },
                    { title: "Actual Cost", dataIndex: "actual_cost", key: "actual_cost", render: (value: number) => formatCurrency(value) },
                    { title: "Priority", dataIndex: "priority", key: "priority" },
                    { title: "Status", dataIndex: "status", key: "status" },
                    { title: "Created Date", dataIndex: "created_date", key: "created_date", render: (date: string) => dayjs(date).format("DD MMM YYYY") },
                  ]}
                  loading={false}
                  onExportExcel={() => handleExportExcel(ticketsData, "maintenance")}
                  onExportPDF={() =>
                    handleExportPDF(
                      ticketsData,
                      "Maintenance Report",
                      [
                        { title: "Ticket ID", dataIndex: "ticket_id" },
                        { title: "Property", dataIndex: "property" },
                        { title: "Unit", dataIndex: "unit" },
                        { title: "Category", dataIndex: "category" },
                        { title: "Description", dataIndex: "description" },
                        { title: "Estimated Cost", dataIndex: "estimated_cost" },
                        { title: "Actual Cost", dataIndex: "actual_cost" },
                        { title: "Priority", dataIndex: "priority" },
                        { title: "Status", dataIndex: "status" },
                        { title: "Created Date", dataIndex: "created_date" },
                      ]
                    )
                  }
                />
              );
              
              if (onReportGenerated) {
                onReportGenerated("Maintenance Report", reportContent);
              }
            } catch (error) {
              console.error("Error fetching report:", error);
            } finally {
              setLoading(false);
            }
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField presets={rangePresets} />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="propertyId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><HomeOutlined /> Property</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All properties" style={{ width: "100%", borderRadius: 8 }} options={properties} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="categoryId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><ToolOutlined /> Category</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All categories" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="plumbing">Plumbing</Option>
                    <Option value="electrical">Electrical</Option>
                    <Option value="hvac">HVAC</Option>
                    <Option value="painting">Painting</Option>
                  </Select>
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="status"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><TagOutlined /> Status</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All statuses" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="completed">Completed</Option>
                    <Option value="in-progress">In Progress</Option>
                    <Option value="pending">Pending</Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Maintenance Report" icon={<PrinterOutlined />} />
          </Form>
        );

      case "portfolio":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            setLoading(true);
            try {
              const data = await fetchPortfolioAnalysisReport({
                shop_id: values.shopId,
                startDate: values.dateRange?.[0]?.toISOString(),
                endDate: values.dateRange?.[1]?.toISOString(),
                property_id: values.propertyId,
              });
              
              const propertiesData = data?.data?.properties || [];
              const summaryData = data?.data?.summary || null;
              const reportContent = (
                <ReportTable
                  data={propertiesData}
                  summary={summaryData}
                  summaryType="generic"
                  columns={[
                    { title: "Property", dataIndex: "name", key: "name" },
                    { title: "Total Investment", dataIndex: "total_investment", key: "total_investment", render: (value: number) => formatCurrency(value) },
                    { title: "Current Value", dataIndex: "current_value", key: "current_value", render: (value: number) => formatCurrency(value) },
                    { title: "ROI", dataIndex: "roi", key: "roi", render: (value: number) => `${value?.toFixed(1)}%` },
                    { title: "Units Sold", dataIndex: "units_sold", key: "units_sold" },
                    { title: "Units Rented", dataIndex: "units_rented", key: "units_rented" },
                    { title: "Total Revenue", dataIndex: "total_revenue", key: "total_revenue", render: (value: number) => formatCurrency(value) },
                    { title: "Development Progress", dataIndex: "development_progress", key: "development_progress", render: (value: number) => `${value?.toFixed(1)}%` },
                    { title: "Status", dataIndex: "status", key: "status" },
                  ]}
                  loading={false}
                  onExportExcel={() => handleExportExcel(propertiesData, "portfolio-analysis")}
                  onExportPDF={() =>
                    handleExportPDF(
                      propertiesData,
                      "Portfolio Analysis Report",
                      [
                        { title: "Property", dataIndex: "name" },
                        { title: "Total Investment", dataIndex: "total_investment" },
                        { title: "Current Value", dataIndex: "current_value" },
                        { title: "ROI", dataIndex: "roi" },
                        { title: "Units Sold", dataIndex: "units_sold" },
                        { title: "Units Rented", dataIndex: "units_rented" },
                        { title: "Total Revenue", dataIndex: "total_revenue" },
                        { title: "Development Progress", dataIndex: "development_progress" },
                        { title: "Status", dataIndex: "status" },
                      ]
                    )
                  }
                />
              );
              
              if (onReportGenerated) {
                onReportGenerated("Portfolio Analysis Report", reportContent);
              }
            } catch (error) {
              console.error("Error fetching report:", error);
            } finally {
              setLoading(false);
            }
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField presets={rangePresets} />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="propertyId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><HomeOutlined /> Property</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All properties" style={{ width: "100%", borderRadius: 8 }} options={properties} />
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Portfolio Analysis Report" icon={<PrinterOutlined />} />
          </Form>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
        background: C.bg,
      }}>
        <div style={{
          background: C.primaryLight, borderRadius: 8,
          padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1,
        }}>
          <HomeOutlined />
        </div>
        <div>
          <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>Dala Reports</Text>
          {activeTabCfg && (
            <Text style={{ fontSize: 11, color: C.subText }}>
              {activeTabCfg.label}
            </Text>
          )}
        </div>
      </div>

      {/* ── Tab nav ─────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 18px 0" }}>
        <TabNav tabs={tabsWithAccess} active={activeTab} onChange={handleTabChange} />
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div style={{ padding: "0 18px 18px" }}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Reports;