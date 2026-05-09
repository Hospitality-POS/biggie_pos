import React, { useState } from "react";
import { Tabs } from "antd";
import Dashboard from "src/pages/Dashboard/Dashboard";
import AccountingDashboardPage from "src/pages/AccountingDashboard/AccountingDashboardPage";
import MtejaDashboard from "src/pages/Dashboard/MtejaDashboard";
import BanduHRDashboard from "src/pages/Report/BanduDashboard";

// ── Module activation checks ─────────────────────────────────────────────────────
const getModuleFlags = () => {
  try {
    const stored = localStorage.getItem("tenant");
    if (!stored) return { hasDuka: true, hasPesa: false, hasMteja: false, hasBandu: false };
    const tenant = JSON.parse(stored);
    return {
      hasDuka: tenant?.pos_integration?.enabled === true,
      hasPesa: !!(tenant?.accounting_database?.enabled || tenant?.modules?.accounting),
      hasMteja: tenant?.modules?.crm === true,
      hasBandu: tenant?.modules?.payroll === true,
    };
  } catch {
    return { hasDuka: true, hasPesa: false, hasMteja: false, hasBandu: false };
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

// ── Main Unified Shop Dashboard Page ─────────────────────────────────────────────
const UnifiedShopDashboardPage: React.FC = () => {
  const { hasDuka, hasPesa, hasMteja, hasBandu } = getModuleFlags();
  const [activeTab, setActiveTab] = useState("pos");

  // Build tab items based on enabled modules
  let tabItems = [
    ...(hasDuka
      ? [{
          key: "pos",
          label: "POS Dashboard",
          children: <POSDashboardContent />,
        }]
      : []),
    ...(hasPesa
      ? [{
          key: "accounting",
          label: "Accounting Dashboard",
          children: <AccountingDashboardContent />,
        }]
      : []),
    ...(hasMteja
      ? [{
          key: "mteja",
          label: "Mteja Dashboard",
          children: <MtejaDashboardContent />,
        }]
      : []),
    ...(hasBandu
      ? [{
          key: "bandu",
          label: "Bandu HR Dashboard",
          children: <BanduDashboardContent />,
        }]
      : []),
  ];

  // Fallback: if no tabs, show POS dashboard by default
  if (tabItems.length === 0) {
    tabItems = [{
      key: "pos",
      label: "POS Dashboard",
      children: <POSDashboardContent />,
    }];
  }

  // Set default tab based on available modules
  React.useEffect(() => {
    if (hasDuka) setActiveTab("pos");
    else if (hasPesa) setActiveTab("accounting");
    else if (hasMteja) setActiveTab("mteja");
    else if (hasBandu) setActiveTab("bandu");
  }, [hasDuka, hasPesa, hasMteja, hasBandu]);

  return (
    <div style={{ padding: 24 }}>
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
