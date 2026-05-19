import React, { useState, useMemo } from 'react';
import { Button, DatePicker, Form, Select, Typography, Spin, Empty } from 'antd';
import {
  HomeOutlined,
  DollarOutlined,
  CalendarOutlined,
  ToolOutlined,
  FileTextOutlined,
  PrinterOutlined,
  UserOutlined,
  EnvironmentOutlined,
  TagOutlined,
  LockOutlined,
  HddOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getPermissionChecker } from '@utils/getPermissionChecker';

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
    label: "Sales Reports",
    permissionKey: "DALA_SALES_VIEW",
  },
  {
    key: "rentals",
    icon: <HomeOutlined />,
    iconColor: C.blue,
    label: "Rental Reports",
    permissionKey: "DALA_RENTALS_VIEW",
  },
  {
    key: "lease",
    icon: <CalendarOutlined />,
    iconColor: C.purple,
    label: "Lease Reports",
    permissionKey: "DALA_LEASES_VIEW",
  },
  {
    key: "maintenance",
    icon: <ToolOutlined />,
    iconColor: C.orange,
    label: "Maintenance Reports",
    permissionKey: "DALA_MAINTENANCE_VIEW",
  },
  {
    key: "financial",
    icon: <FileTextOutlined />,
    iconColor: C.red,
    label: "Financial Reports",
    permissionKey: "DALA_REPORTS_VIEW",
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
}> = ({ onChange }) => (
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
      style={{ width: "100%", borderRadius: 8 }}
    />
  </Form.Item>
);

const GenerateButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
  onClick?: () => void;
}> = ({ label, icon, disabled, onClick }) => (
  <Form.Item style={{ marginBottom: 0 }}>
    <Button
      type="primary" htmlType="submit"
      icon={icon} disabled={disabled}
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

// ── Main component ────────────────────────────────────────────────────────────
const Reports: React.FC = () => {
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
  const [modalOpen, setModalOpen] = useState(false);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setModalOpen(false);
    form.resetFields();
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    const { dateRange } = values;
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setModalOpen(true);
    }, 1500);
    
    return true;
  };

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
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="propertyId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><HomeOutlined /> Property</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All properties" style={{ width: "100%", borderRadius: 8 }} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="agentId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Agent</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All agents" style={{ width: "100%", borderRadius: 8 }} />
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
            <GenerateButton label="Generate Sales Report" icon={<PrinterOutlined />} disabled={loading} />
          </Form>
        );

      case "rentals":
        return (
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="propertyId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><HomeOutlined /> Property</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All properties" style={{ width: "100%", borderRadius: 8 }} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="tenantId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Tenant</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All tenants" style={{ width: "100%", borderRadius: 8 }} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="paymentStatus"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><DollarOutlined /> Payment Status</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All statuses" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="paid">Paid</Option>
                    <Option value="pending">Pending</Option>
                    <Option value="overdue">Overdue</Option>
                    <Option value="partial">Partial</Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Rental Report" icon={<PrinterOutlined />} disabled={loading} />
          </Form>
        );

      case "lease":
        return (
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="propertyId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><HomeOutlined /> Property</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All properties" style={{ width: "100%", borderRadius: 8 }} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="tenantId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Tenant</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All tenants" style={{ width: "100%", borderRadius: 8 }} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="leaseStatus"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><TagOutlined /> Status</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All statuses" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="active">Active</Option>
                    <Option value="expiring">Expiring</Option>
                    <Option value="expired">Expired</Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Lease Report" icon={<PrinterOutlined />} disabled={loading} />
          </Form>
        );

      case "maintenance":
        return (
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="propertyId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><HomeOutlined /> Property</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All properties" style={{ width: "100%", borderRadius: 8 }} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="maintenanceType"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><ToolOutlined /> Type</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="All types" style={{ width: "100%", borderRadius: 8 }}>
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
            <GenerateButton label="Generate Maintenance Report" icon={<PrinterOutlined />} disabled={loading} />
          </Form>
        );

      case "financial":
        return (
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="propertyId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><HomeOutlined /> Property</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All properties" style={{ width: "100%", borderRadius: 8 }} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="reportType"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><FileTextOutlined /> Report Type</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select allowClear placeholder="Select type" style={{ width: "100%", borderRadius: 8 }}>
                    <Option value="income">Income Statement</Option>
                    <Option value="expense">Expense Report</Option>
                    <Option value="profit">Profit & Loss</Option>
                    <Option value="cashflow">Cash Flow</Option>
                  </Select>
                </Form.Item>
              </div>
            </div>
            <GenerateButton label="Generate Financial Report" icon={<PrinterOutlined />} disabled={loading} />
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
          <HddOutlined />
        </div>
        <div>
          <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>Property Management Reports</Text>
          {activeTabCfg && (
            <Text style={{ fontSize: 11, color: C.subText }}>
              <span style={{ color: activeTabCfg.iconColor }}>{activeTabCfg.icon}</span>
              {" "}{activeTabCfg.label}
            </Text>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "18px 18px 20px" }}>
        <TabNav tabs={tabsWithAccess} active={activeTab} onChange={handleTabChange} />

        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 16px 10px" }}>
          <SectionLabel>
            {activeTabCfg?.allowed ? "Report Filters" : "Access Restricted"}
          </SectionLabel>
          {renderTabContent()}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000,
        }}>
          <Spin size="large" />
        </div>
      )}
    </div>
  );
};

export default Reports;
