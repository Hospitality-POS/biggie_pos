import React, { useState } from "react";
import { Tabs, Typography } from "antd";
import { ShopOutlined, DollarOutlined, CustomerServiceOutlined, TeamOutlined, HomeOutlined } from "@ant-design/icons";
import Dashboard from "src/pages/Dashboard/Dashboard";
import AccountingDashboardPage from "src/pages/AccountingDashboard/AccountingDashboardPage";
import MtejaDashboard from "src/pages/Dashboard/MtejaDashboard";
import BanduHRDashboard from "src/pages/BanduHR/BanduHRDashboard";
import DalaDashboard from "src/pages/dala/Dashboard";
import BusinessImpact from "./BusinessImpact";

// ── Module activation checks ─────────────────────────────────────────────────────
const getModuleFlags = () => {
  try {
    const stored = localStorage.getItem("tenant");
    if (!stored) return { hasDuka: false, hasPesa: false, hasMteja: false, hasBandu: false, hasDala: false };
    const tenant = JSON.parse(stored);
    return {
      hasDuka: tenant?.pos_integration?.enabled === true,
      hasPesa: !!(tenant?.accounting_database?.enabled || tenant?.modules?.accounting),
      hasMteja: tenant?.modules?.crm === true,
      hasBandu: tenant?.modules?.bandu_hr === true || tenant?.modules?.payroll === true, // Support both flags for backward compatibility
      hasDala: tenant?.modules?.dala === true,
    };
  } catch {
    return { hasDuka: false, hasPesa: false, hasMteja: false, hasBandu: false, hasDala: false };
  }
};

// ── POS Dashboard Component ─────────────────────────────────────────────────────
const POSDashboardContent: React.FC = () => <Dashboard />;

// ── Accounting Dashboard Component ────────────────────────────────────────────────
const AccountingDashboardContent: React.FC = () => <AccountingDashboardPage />;

// ── Mteja Dashboard Component ─────────────────────────────────────────────────────
const MtejaDashboardContent: React.FC = () => <MtejaDashboard />;

// ── Bandu Dashboard Component ─────────────────────────────────────────────────────
const BanduDashboardContent: React.FC = () => <BanduHRDashboard />;

// ── Dala Dashboard Component ─────────────────────────────────────────────────────
const DalaDashboardContent: React.FC = () => <DalaDashboard />;

// ── Main Unified Shop Dashboard Page ─────────────────────────────────────────────
const UnifiedShopDashboardPage: React.FC = () => {
  const { hasDuka, hasPesa, hasMteja, hasBandu, hasDala } = getModuleFlags();
  const [activeTab, setActiveTab] = useState("pos");

  // Build tab items based on enabled modules
  const tabItems = [
    ...(hasDuka
      ? [{
          key: "pos",
          label: <><ShopOutlined /> Duka</>,
          children: <POSDashboardContent />,
        }]
      : []),
    ...(hasPesa
      ? [{
          key: "accounting",
          label: <><DollarOutlined /> Pesa</>,
          children: <AccountingDashboardContent />,
        }]
      : []),
    ...(hasMteja
      ? [{
          key: "mteja",
          label: <><CustomerServiceOutlined /> Mteja</>,
          children: <MtejaDashboardContent />,
        }]
      : []),
    ...(hasDala
      ? [{
          key: "dala",
          label: <><HomeOutlined /> Dala</>,
          children: <DalaDashboardContent />,
        }]
      : []),
    ...(hasBandu
      ? [{
          key: "bandu",
          label: <><TeamOutlined /> Bandu</>,
          children: <BanduDashboardContent />,
        }]
      : []),
  ];

  // Set default tab based on available modules
  React.useEffect(() => {
    if (hasDuka) setActiveTab("pos");
    else if (hasPesa) setActiveTab("accounting");
    else if (hasMteja) setActiveTab("mteja");
    else if (hasDala) setActiveTab("dala");
    else if (hasBandu) setActiveTab("bandu");
  }, [hasDuka, hasPesa, hasMteja, hasDala, hasBandu]);

  // Fallback: if no tabs, show message instead of defaulting to Duka
  if (tabItems.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>
        <TeamOutlined style={{ fontSize: 48, marginBottom: 16, color: "#94a3b8" }} />
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No modules enabled</div>
        <div style={{ fontSize: 14 }}>Please enable modules from the Discover page to view dashboards.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: "#f5f5f5", minHeight: "100%" }}>
      <Typography.Title level={3} style={{ marginBottom: 24, fontWeight: 600 }}>
        Home Dashboard
      </Typography.Title>

      <BusinessImpact hasDuka={hasDuka} hasPesa={hasPesa} hasDala={hasDala} />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
        tabBarStyle={{ marginBottom: 24 }}
      />
    </div>
  );
};

export default UnifiedShopDashboardPage;
