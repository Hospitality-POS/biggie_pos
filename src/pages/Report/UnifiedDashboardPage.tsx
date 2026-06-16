import React, { useState } from "react";
import { Tabs } from "antd";
import DashboardAdminPage from "src/AdminDashboard/DashboardPage/DashboardPage";
import AccountingDashboardPage from "src/pages/AccountingDashboard/AccountingDashboardPage";
import MtejaDashboard from "src/pages/Dashboard/MtejaDashboard";
import BanduDashboardPage from "src/pages/hr/BanduDashboardPage";
import UnifiedDalaDashboard from "src/pages/dala/UnifiedDalaDashboard";

// ── Module activation checks ─────────────────────────────────────────────────────
const getModuleFlags = () => {
  try {
    const stored = localStorage.getItem("tenant");
    if (!stored) return { hasDuka: true, hasPesa: false, hasMteja: false, hasBandu: false, hasDala: false };
    const tenant = JSON.parse(stored);
    return {
      hasDuka: tenant?.pos_integration?.enabled === true,
      hasPesa: !!(tenant?.accounting_database?.enabled || tenant?.modules?.accounting),
      hasMteja: tenant?.modules?.crm === true,
      hasBandu: tenant?.modules?.payroll === true,
      hasDala: tenant?.modules?.dala === true,
    };
  } catch {
    return { hasDuka: true, hasPesa: false, hasMteja: false, hasBandu: false, hasDala: false };
  }
};

// ── POS Dashboard Component ─────────────────────────────────────────────────────
const POSDashboardContent: React.FC = () => <DashboardAdminPage />;

// ── Accounting Dashboard Component ────────────────────────────────────────────────
const AccountingDashboardContent: React.FC = () => <AccountingDashboardPage />;

// ── Mteja Dashboard Component ─────────────────────────────────────────────────────
const MtejaDashboardContent: React.FC = () => <MtejaDashboard />;

// ── Bandu Dashboard Component ─────────────────────────────────────────────────────
const BanduDashboardContent: React.FC = () => <BanduDashboardPage />;

// ── Dala Dashboard Component ─────────────────────────────────────────────────────
const DalaDashboardContent: React.FC = () => <UnifiedDalaDashboard />;

// ── Main Unified Dashboard Page ──────────────────────────────────────────────────
const UnifiedDashboardPage: React.FC = () => {
  console.log("[UnifiedDashboardPage] Component mounted - START");

  const { hasDuka, hasPesa, hasMteja, hasBandu, hasDala } = getModuleFlags();
  const [activeTab, setActiveTab] = useState("pos");

  console.log("[UnifiedDashboardPage] Module flags:", { hasDuka, hasPesa, hasMteja, hasBandu, hasDala });

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
          label: "Bandu",
          children: <BanduDashboardContent />,
        }]
      : []),
    ...(hasDala
      ? [{
          key: "dala",
          label: "Dala Dashboard",
          children: <DalaDashboardContent />,
        }]
      : []),
  ];

  console.log("[UnifiedDashboardPage] Tab items:", tabItems);

  // Fallback: if no tabs, show POS dashboard by default
  if (tabItems.length === 0) {
    console.log("[UnifiedDashboardPage] No tabs detected, using fallback POS dashboard");
    tabItems = [{
      key: "pos",
      label: "POS Dashboard",
      children: <POSDashboardContent />,
    }];
  }

  console.log("[UnifiedDashboardPage] Final tab items:", tabItems);

  // Set default tab based on available modules
  React.useEffect(() => {
    if (hasDuka) setActiveTab("pos");
    else if (hasPesa) setActiveTab("accounting");
    else if (hasMteja) setActiveTab("mteja");
    else if (hasBandu) setActiveTab("bandu");
    else if (hasDala) setActiveTab("dala");
  }, [hasDuka, hasPesa, hasMteja, hasBandu, hasDala]);

  console.log("[UnifiedDashboardPage] Rendering tabs with activeTab:", activeTab);

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

export default UnifiedDashboardPage;
