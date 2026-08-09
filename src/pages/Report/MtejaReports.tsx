import React, { useState, useMemo } from "react";
import { Button, DatePicker, Form, Select, Typography, Spin, Empty, Table, Space, message } from "antd";
import { Modal } from "antd";
import {
  TeamOutlined,
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
  AimOutlined,
  RiseOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { getPermissionChecker } from "@utils/getPermissionChecker";
import {
  fetchCustomerMasterList,
  fetchLeadPipelineReport,
  fetchCampaignPerformanceReport,
  fetchSalesTargetsReport,
  fetchCustomerVisitReport,
  fetchLeadActivityReport,
} from "@services/mteja/reports";
import { fetchAllUsersList } from "@services/users";
import { fetchAllLeads } from "@services/crm/leads";
import { fetchAllCustomers } from "@services/customers";
import { formatCurrency } from "@utils/formatters";
import { exportToExcel, exportToPDF } from "@utils/exportUtils";
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
    key: "customers",
    icon: <UserOutlined />,
    iconColor: C.green,
    label: "Customers",
    permissionKey: "CRM_CUSTOMERS_VIEW",
  },
  {
    key: "leads",
    icon: <TeamOutlined />,
    iconColor: C.blue,
    label: "Leads",
    permissionKey: "CRM_LEADS_VIEW",
  },
  {
    key: "campaigns",
    icon: <AimOutlined />,
    iconColor: C.purple,
    label: "Campaigns",
    permissionKey: "CRM_CAMPAIGNS_VIEW",
  },
  {
    key: "sales",
    icon: <DollarOutlined />,
    iconColor: C.orange,
    label: "Sales Targets",
    permissionKey: "CRM_SALES_TARGETS_VIEW",
  },
  {
    key: "visits",
    icon: <CalendarOutlined />,
    iconColor: C.red,
    label: "Visits",
    permissionKey: "CRM_VISITS_VIEW",
  },
  {
    key: "activities",
    icon: <FileTextOutlined />,
    iconColor: C.subText,
    label: "Activities",
    permissionKey: "CRM_ACTIVITIES_VIEW",
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

// ── Report Table Component ────────────────────────────────────────────────────
const ReportTable: React.FC<{
  data: any[];
  columns: any[];
  loading: boolean;
  onExportExcel: () => void;
  onExportPDF: () => void;
  summary?: any;
  summaryType?: "generic";
  reportType?: string;
}> = ({ data, columns, loading, onExportExcel, onExportPDF, summary, summaryType, reportType }) => (
  <div>
    {summary && summaryType === "generic" && (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        {summary.totalLeads !== undefined && (
          <SummaryCard label="Total Leads" value={String(summary.totalLeads || 0)} color={C.primary} bg={C.primaryLight} icon={<TeamOutlined />} />
        )}
        {summary.totalCustomers !== undefined && (
          <SummaryCard label="Total Customers" value={String(summary.totalCustomers || 0)} color={C.primary} bg={C.primaryLight} icon={<UserOutlined />} />
        )}
        {summary.totalEstimatedValue !== undefined && (
          <SummaryCard label="Total Estimated Value" value={formatCurrency(summary.totalEstimatedValue || 0)} color={C.green} bg="#f0fdf4" icon={<DollarOutlined />} />
        )}
        {summary.convertedCount !== undefined && (
          <SummaryCard label="Converted" value={String(summary.convertedCount || 0)} color={C.blue} bg="#eff6ff" icon={<CheckCircleOutlined />} />
        )}
        {summary.conversionRate !== undefined && (
          <SummaryCard label="Conversion Rate" value={`${(summary.conversionRate || 0).toFixed(1)}%`} color={C.orange} bg="#fffbeb" icon={<RiseOutlined />} />
        )}
      </div>
    )}
    
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
        rowKey={reportType === "leads" ? "leadId" : reportType === "customers" ? "customerId" : "_id"}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} items` }}
        size="small"
        scroll={{ x: 1200, y: 400 }}
        style={{ margin: 0, fontSize: 13 }}
      />
    </div>
  </div>
);

interface MtejaReportsProps {
  onReportGenerated?: (title: string, content: React.ReactNode) => void;
}

// ── Main component ────────────────────────────────────────────────────────────
const MtejaReports: React.FC<MtejaReportsProps> = ({ onReportGenerated }) => {
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

  // ── Fetch leads for dropdown ───────────────────────────────────────────────
  const { data: leadsData } = useQuery({
    queryKey: ["leads"],
    queryFn: () => fetchAllLeads(),
  });

  const leads = useMemo(() => {
    if (!leadsData) return [];
    const leadsList = Array.isArray(leadsData) ? leadsData : leadsData.leads || [];
    return leadsList.map((lead: any) => ({
      value: lead._id,
      label: lead.lead_name || lead.company_name || lead.contact_person || "Unknown Lead",
    }));
  }, [leadsData]);

  // ── Fetch customers for dropdown ───────────────────────────────────────────
  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchAllCustomers(),
  });

  const customers = useMemo(() => {
    if (!customersData) return [];
    const customersList = Array.isArray(customersData) ? customersData : customersData.data || [];
    return customersList.map((customer: any) => ({
      value: customer._id,
      label: customer.customer_name || customer.name || customer.email || "Unknown Customer",
    }));
  }, [customersData]);

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
      case "customers":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            setLoading(true);
            try {
              const data = await fetchCustomerMasterList({
                shop_id: values.shopId,
                lifecycle_stage: values.lifecycleStage,
                assigned_to: values.assignedTo,
                source: values.source,
                type: values.type,
                tag: values.tag,
              });
              
              const customersData = data?.data?.customers || [];
              const summaryData = data?.data || null;
              const reportContent = (
                <ReportTable
                  data={customersData}
                  summary={summaryData}
                  summaryType="generic"
                  reportType="customers"
                  columns={[
                    { title: "Customer Name", dataIndex: "customerName", key: "customerName" },
                    { title: "Email", dataIndex: "email", key: "email" },
                    { title: "Phone", dataIndex: "phone", key: "phone" },
                    { title: "Code", dataIndex: "code", key: "code" },
                    { title: "Lifecycle Stage", dataIndex: "lifecycleStage", key: "lifecycleStage" },
                    { title: "Source", dataIndex: "source", key: "source" },
                    { title: "Type", dataIndex: "type", key: "type" },
                    { title: "Tags", dataIndex: "tags", key: "tags", render: (tags: string[]) => tags?.join(", ") || "-" },
                    { title: "City", dataIndex: "city", key: "city" },
                    { title: "Country", dataIndex: "country", key: "country" },
                    { title: "Created Date", dataIndex: "createdAt", key: "createdAt", render: (date: string) => dayjs(date).format("DD MMM YYYY") },
                  ]}
                  loading={false}
                  onExportExcel={() => handleExportExcel(customersData, "customer-master-list")}
                  onExportPDF={() =>
                    handleExportPDF(
                      customersData,
                      "Customer Master List",
                      [
                        { title: "Customer Name", dataIndex: "customerName" },
                        { title: "Email", dataIndex: "email" },
                        { title: "Phone", dataIndex: "phone" },
                        { title: "Code", dataIndex: "code" },
                        { title: "Lifecycle Stage", dataIndex: "lifecycleStage" },
                        { title: "Source", dataIndex: "source" },
                        { title: "Type", dataIndex: "type" },
                        { title: "Tags", dataIndex: "tags" },
                        { title: "City", dataIndex: "city" },
                        { title: "Country", dataIndex: "country" },
                        { title: "Created Date", dataIndex: "createdAt" },
                      ]
                    )
                  }
                />
              );
              
              if (onReportGenerated) {
                onReportGenerated("Customer Master List", reportContent);
              }
            } catch (error: any) {
              console.error("Error fetching report:", error);
              if (error?.response?.status === 404) {
                message.warning("This report is not yet available. Please contact your administrator.", 5);
              } else {
                message.error("Failed to generate report. Please try again.");
              }
            } finally {
              setLoading(false);
            }
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="lifecycleStage"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><TagOutlined /> Lifecycle Stage</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All stages" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="lead">Lead</Option>
                    <Option value="prospect">Prospect</Option>
                    <Option value="customer">Customer</Option>
                    <Option value="churned">Churned</Option>
                  </Select>
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="assignedTo"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Assigned To</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All users" style={{ width: "100%", borderRadius: 8 }} options={agents} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="source"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><RiseOutlined /> Source</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All sources" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="website">Website</Option>
                    <Option value="referral">Referral</Option>
                    <Option value="social">Social Media</Option>
                    <Option value="walk-in">Walk-in</Option>
                  </Select>
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="type"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><FileTextOutlined /> Type</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All types" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="individual">Individual</Option>
                    <Option value="business">Business</Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Customer Master List" icon={<PrinterOutlined />} disabled={loading} loading={loading} />
          </Form>
        );

      case "leads":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            setLoading(true);
            try {
              const data = await fetchLeadPipelineReport({
                shop_id: values.shopId,
                startDate: values.dateRange?.[0]?.toISOString(),
                endDate: values.dateRange?.[1]?.toISOString(),
                stage: values.stage,
                source: values.source,
                assigned_to: values.assignedTo,
                campaign_id: values.campaignId,
              });
              
              const leadsData = data?.data?.leads || [];
              const summaryData = data?.data?.summary || null;
              const reportContent = (
                <ReportTable
                  data={leadsData}
                  summary={summaryData}
                  summaryType="generic"
                  reportType="leads"
                  columns={[
                    { title: "Lead Name", dataIndex: "leadName", key: "leadName" },
                    { title: "Email", dataIndex: "email", key: "email" },
                    { title: "Phone", dataIndex: "phone", key: "phone" },
                    { title: "Stage", dataIndex: "stage", key: "stage", render: (stage: string) => (
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        background: stage === "won" ? "#10b98120" : stage === "lost" ? "#ef444420" : "#64748b20",
                        color: stage === "won" ? "#10b981" : stage === "lost" ? "#ef4444" : "#64748b",
                      }}>
                        {stage?.charAt(0).toUpperCase() + stage?.slice(1)}
                      </span>
                    )},
                    { title: "Source", dataIndex: "source", key: "source" },
                    { title: "Converted", dataIndex: "convertedToCustomer", key: "convertedToCustomer" },
                    { title: "Estimated Value", dataIndex: "estimatedValue", key: "estimatedValue", render: (value: number) => formatCurrency(value) },
                    { title: "Probability", dataIndex: "probability", key: "probability", render: (value: number) => `${value}%` },
                    { title: "Activity Count", dataIndex: "activityCount", key: "activityCount" },
                    { title: "Created Date", dataIndex: "createdAt", key: "createdAt", render: (date: string) => dayjs(date).format("DD MMM YYYY") },
                  ]}
                  loading={false}
                  onExportExcel={() => handleExportExcel(leadsData, "lead-pipeline")}
                  onExportPDF={() =>
                    handleExportPDF(
                      leadsData,
                      "Lead Pipeline Report",
                      [
                        { title: "Lead Name", dataIndex: "leadName" },
                        { title: "Email", dataIndex: "email" },
                        { title: "Phone", dataIndex: "phone" },
                        { title: "Stage", dataIndex: "stage" },
                        { title: "Source", dataIndex: "source" },
                        { title: "Converted", dataIndex: "convertedToCustomer" },
                        { title: "Estimated Value", dataIndex: "estimatedValue" },
                        { title: "Probability", dataIndex: "probability" },
                        { title: "Activity Count", dataIndex: "activityCount" },
                        { title: "Created Date", dataIndex: "createdAt" },
                      ]
                    )
                  }
                />
              );
              
              if (onReportGenerated) {
                onReportGenerated("Lead Pipeline Report", reportContent);
              }
            } catch (error: any) {
              console.error("Error fetching report:", error);
              if (error?.response?.status === 404) {
                message.warning("This report is not yet available. Please contact your administrator.", 5);
              } else {
                message.error("Failed to generate report. Please try again.");
              }
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
                  name="stage"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><TagOutlined /> Stage</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All stages" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="new">New</Option>
                    <Option value="contacted">Contacted</Option>
                    <Option value="qualified">Qualified</Option>
                    <Option value="proposal">Proposal</Option>
                    <Option value="won">Won</Option>
                    <Option value="lost">Lost</Option>
                  </Select>
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="source"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><RiseOutlined /> Source</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All sources" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="website">Website</Option>
                    <Option value="referral">Referral</Option>
                    <Option value="social">Social Media</Option>
                  </Select>
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="assignedTo"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Assigned To</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All users" style={{ width: "100%", borderRadius: 8 }} options={agents} />
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Lead Pipeline Report" icon={<PrinterOutlined />} disabled={loading} loading={loading} />
          </Form>
        );

      case "campaigns":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            setLoading(true);
            try {
              const data = await fetchCampaignPerformanceReport({
                shop_id: values.shopId,
                startDate: values.dateRange?.[0]?.toISOString(),
                endDate: values.dateRange?.[1]?.toISOString(),
                status: values.status,
              });
              
              const campaignsData = data?.data?.campaigns || [];
              const reportContent = (
                <ReportTable
                  data={campaignsData}
                  columns={[
                    { title: "Campaign Name", dataIndex: "name", key: "name" },
                    { title: "Type", dataIndex: "type", key: "type" },
                    { title: "Status", dataIndex: "status", key: "status" },
                    { title: "Budget", dataIndex: "budget", key: "budget" },
                    { title: "Actual Spend", dataIndex: "actual_spend", key: "actual_spend" },
                    { title: "ROI", dataIndex: "roi", key: "roi" },
                    { title: "Leads Generated", dataIndex: "leads_generated", key: "leads_generated" },
                    { title: "Conversions", dataIndex: "conversions", key: "conversions" },
                    { title: "Start Date", dataIndex: "start_date", key: "start_date" },
                    { title: "End Date", dataIndex: "end_date", key: "end_date" },
                  ]}
                  loading={false}
                  onExportExcel={() => handleExportExcel(campaignsData, "campaign-performance")}
                  onExportPDF={() =>
                    handleExportPDF(
                      campaignsData,
                      "Campaign Performance Report",
                      [
                        { title: "Campaign Name", dataIndex: "name" },
                        { title: "Type", dataIndex: "type" },
                        { title: "Status", dataIndex: "status" },
                        { title: "Budget", dataIndex: "budget" },
                        { title: "Actual Spend", dataIndex: "actual_spend" },
                        { title: "ROI", dataIndex: "roi" },
                        { title: "Leads Generated", dataIndex: "leads_generated" },
                        { title: "Conversions", dataIndex: "conversions" },
                        { title: "Start Date", dataIndex: "start_date" },
                        { title: "End Date", dataIndex: "end_date" },
                      ]
                    )
                  }
                  title="Campaign Performance Report"
                />
              );
              
              if (onReportGenerated) {
                onReportGenerated("Campaign Performance Report", reportContent);
              }
            } catch (error: any) {
              console.error("Error fetching report:", error);
              if (error?.response?.status === 404) {
                message.warning("This report is not yet available. Please contact your administrator.", 5);
              } else {
                message.error("Failed to generate report. Please try again.");
              }
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
                  name="status"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><TagOutlined /> Status</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All statuses" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="active">Active</Option>
                    <Option value="scheduled">Scheduled</Option>
                    <Option value="completed">Completed</Option>
                    <Option value="cancelled">Cancelled</Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Campaign Performance Report" icon={<PrinterOutlined />} disabled={loading} loading={loading} />
          </Form>
        );

      case "sales":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            setLoading(true);
            try {
              const data = await fetchSalesTargetsReport({
                shop_id: values.shopId,
                assigned_to: values.assignedTo,
                period: values.period,
                year: values.year,
              });
              
              const targetsData = data?.data?.targets || [];
              const reportContent = (
                <ReportTable
                  data={targetsData}
                  columns={[
                    { title: "Target Name", dataIndex: "name", key: "name" },
                    { title: "Assigned To", dataIndex: "assigned_to", key: "assigned_to" },
                    { title: "Target Revenue", dataIndex: "target_revenue", key: "target_revenue" },
                    { title: "Actual Revenue", dataIndex: "actual_revenue", key: "actual_revenue" },
                    { title: "Target Customers", dataIndex: "target_customers", key: "target_customers" },
                    { title: "Actual Customers", dataIndex: "actual_customers", key: "actual_customers" },
                    { title: "Achievement Rate", dataIndex: "achievement_rate", key: "achievement_rate" },
                    { title: "Period", dataIndex: "period", key: "period" },
                    { title: "Year", dataIndex: "year", key: "year" },
                  ]}
                  loading={false}
                  onExportExcel={() => handleExportExcel(targetsData, "sales-targets")}
                  onExportPDF={() =>
                    handleExportPDF(
                      targetsData,
                      "Sales Target vs Actual Report",
                      [
                        { title: "Target Name", dataIndex: "name" },
                        { title: "Assigned To", dataIndex: "assigned_to" },
                        { title: "Target Revenue", dataIndex: "target_revenue" },
                        { title: "Actual Revenue", dataIndex: "actual_revenue" },
                        { title: "Target Customers", dataIndex: "target_customers" },
                        { title: "Actual Customers", dataIndex: "actual_customers" },
                        { title: "Achievement Rate", dataIndex: "achievement_rate" },
                        { title: "Period", dataIndex: "period" },
                        { title: "Year", dataIndex: "year" },
                      ]
                    )
                  }
                  title="Sales Target vs Actual Report"
                />
              );
              
              if (onReportGenerated) {
                onReportGenerated("Sales Target vs Actual Report", reportContent);
              }
            } catch (error: any) {
              console.error("Error fetching report:", error);
              if (error?.response?.status === 404) {
                message.warning("This report is not yet available. Please contact your administrator.", 5);
              } else {
                message.error("Failed to generate report. Please try again.");
              }
            } finally {
              setLoading(false);
            }
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="assignedTo"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Assigned To</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All users" style={{ width: "100%", borderRadius: 8 }} options={agents} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="period"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><CalendarOutlined /> Period</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All periods" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="monthly">Monthly</Option>
                    <Option value="quarterly">Quarterly</Option>
                    <Option value="yearly">Yearly</Option>
                  </Select>
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="year"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><DollarOutlined /> Year</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All years" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value={2023}>2023</Option>
                    <Option value={2024}>2024</Option>
                    <Option value={2025}>2025</Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Sales Target vs Actual Report" icon={<PrinterOutlined />} disabled={loading} loading={loading} />
          </Form>
        );

      case "visits":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            setLoading(true);
            try {
              const data = await fetchCustomerVisitReport({
                shop_id: values.shopId,
                startDate: values.dateRange?.[0]?.toISOString(),
                endDate: values.dateRange?.[1]?.toISOString(),
                customer_id: values.customerId,
                assigned_to: values.assignedTo,
              });
              
              const visitsData = data?.data?.visits || [];
              const reportContent = (
                <ReportTable
                  data={visitsData}
                  columns={[
                    { title: "Customer", dataIndex: "customer", key: "customer" },
                    { title: "Visit Type", dataIndex: "visit_type", key: "visit_type" },
                    { title: "Purpose", dataIndex: "purpose", key: "purpose" },
                    { title: "Outcome", dataIndex: "outcome", key: "outcome" },
                    { title: "Assigned To", dataIndex: "assigned_to", key: "assigned_to" },
                    { title: "Follow-up Date", dataIndex: "follow_up_date", key: "follow_up_date" },
                    { title: "Visit Date", dataIndex: "visit_date", key: "visit_date" },
                    { title: "Status", dataIndex: "status", key: "status" },
                  ]}
                  loading={false}
                  onExportExcel={() => handleExportExcel(visitsData, "customer-visits")}
                  onExportPDF={() =>
                    handleExportPDF(
                      visitsData,
                      "Customer Visit Report",
                      [
                        { title: "Customer", dataIndex: "customer" },
                        { title: "Visit Type", dataIndex: "visit_type" },
                        { title: "Purpose", dataIndex: "purpose" },
                        { title: "Outcome", dataIndex: "outcome" },
                        { title: "Assigned To", dataIndex: "assigned_to" },
                        { title: "Follow-up Date", dataIndex: "follow_up_date" },
                        { title: "Visit Date", dataIndex: "visit_date" },
                        { title: "Status", dataIndex: "status" },
                      ]
                    )
                  }
                  title="Customer Visit Report"
                />
              );
              
              if (onReportGenerated) {
                onReportGenerated("Customer Visit Report", reportContent);
              }
            } catch (error: any) {
              console.error("Error fetching report:", error);
              if (error?.response?.status === 404) {
                message.warning("This report is not yet available. Please contact your administrator.", 5);
              } else {
                message.error("Failed to generate report. Please try again.");
              }
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
                  name="customerId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Customer</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All customers" style={{ width: "100%", borderRadius: 8 }} options={customers} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="assignedTo"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Assigned To</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All users" style={{ width: "100%", borderRadius: 8 }} options={agents} />
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Customer Visit Report" icon={<PrinterOutlined />} disabled={loading} loading={loading} />
          </Form>
        );

      case "activities":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            setLoading(true);
            try {
              const data = await fetchLeadActivityReport({
                shop_id: values.shopId,
                startDate: values.dateRange?.[0]?.toISOString(),
                endDate: values.dateRange?.[1]?.toISOString(),
                lead_id: values.leadId,
                activity_type: values.activityType,
                assigned_to: values.assignedTo,
              });
              
              const activitiesData = data?.data?.activities || [];
              const reportContent = (
                <ReportTable
                  data={activitiesData}
                  columns={[
                    { title: "Lead", dataIndex: "lead", key: "lead" },
                    { title: "Activity Type", dataIndex: "activity_type", key: "activity_type" },
                    { title: "Description", dataIndex: "description", key: "description" },
                    { title: "Outcome", dataIndex: "outcome", key: "outcome" },
                    { title: "Assigned To", dataIndex: "assigned_to", key: "assigned_to" },
                    { title: "Activity Date", dataIndex: "activity_date", key: "activity_date" },
                    { title: "Status", dataIndex: "status", key: "status" },
                  ]}
                  loading={false}
                  onExportExcel={() => handleExportExcel(activitiesData, "lead-activities")}
                  onExportPDF={() =>
                    handleExportPDF(
                      activitiesData,
                      "Lead Activity Report",
                      [
                        { title: "Lead", dataIndex: "lead" },
                        { title: "Activity Type", dataIndex: "activity_type" },
                        { title: "Description", dataIndex: "description" },
                        { title: "Outcome", dataIndex: "outcome" },
                        { title: "Assigned To", dataIndex: "assigned_to" },
                        { title: "Activity Date", dataIndex: "activity_date" },
                        { title: "Status", dataIndex: "status" },
                      ]
                    )
                  }
                  title="Lead Activity Report"
                />
              );
              
              if (onReportGenerated) {
                onReportGenerated("Lead Activity Report", reportContent);
              }
            } catch (error: any) {
              console.error("Error fetching report:", error);
              if (error?.response?.status === 404) {
                message.warning("This report is not yet available. Please contact your administrator.", 5);
              } else {
                message.error("Failed to generate report. Please try again.");
              }
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
                  name="leadId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><TeamOutlined /> Lead</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All leads" style={{ width: "100%", borderRadius: 8 }} options={leads} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="activityType"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><FileTextOutlined /> Activity Type</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All types" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="call">Call</Option>
                    <Option value="email">Email</Option>
                    <Option value="meeting">Meeting</Option>
                    <Option value="visit">Visit</Option>
                  </Select>
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="assignedTo"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Assigned To</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All users" style={{ width: "100%", borderRadius: 8 }} options={agents} />
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Lead Activity Report" icon={<PrinterOutlined />} disabled={loading} loading={loading} />
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
          <TeamOutlined />
        </div>
        <div>
          <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>Mteja CRM Reports</Text>
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

export default MtejaReports;
