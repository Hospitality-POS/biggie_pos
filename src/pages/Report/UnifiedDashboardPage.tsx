import React, { useState } from "react";
import { Tabs } from "antd";
import { ShopOutlined, DollarOutlined, CustomerServiceOutlined, TeamOutlined, HomeOutlined } from "@ant-design/icons";
import DashboardAdminPage from "src/AdminDashboard/DashboardPage/DashboardPage";
import AccountingDashboardPage from "src/pages/AccountingDashboard/AccountingDashboardPage";
import MtejaDashboard from "src/pages/Dashboard/MtejaDashboard";
import BanduHRDashboard from "src/pages/BanduHR/BanduHRDashboard";
import UnifiedDalaDashboard from "src/pages/dala/UnifiedDalaDashboard";
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
const POSDashboardContent: React.FC = () => <DashboardAdminPage />;

// ── Accounting Dashboard Component ────────────────────────────────────────────────
const AccountingDashboardContent: React.FC = () => <AccountingDashboardPage />;

// ── Mteja Dashboard Component ─────────────────────────────────────────────────────
const MtejaDashboardContent: React.FC = () => <MtejaDashboard />;

// ── Bandu Dashboard Component ─────────────────────────────────────────────────────
const BanduDashboardContent: React.FC = () => <BanduHRDashboard />;

// ── Dala Dashboard Component ─────────────────────────────────────────────────────
const DalaDashboardContent: React.FC = () => <UnifiedDalaDashboard />;

// ── Main Unified Dashboard Page ──────────────────────────────────────────────────
const UnifiedDashboardPage: React.FC = () => {
  console.log("[UnifiedDashboardPage] Component mounted - START");

  const { hasDuka, hasPesa, hasMteja, hasBandu, hasDala } = getModuleFlags();
  const [activeTab, setActiveTab] = useState("pos");

  console.log("[UnifiedDashboardPage] Module flags:", { hasDuka, hasPesa, hasMteja, hasBandu, hasDala });

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
    ...(hasBandu
      ? [{
          key: "bandu",
          label: <><TeamOutlined /> Bandu</>,
          children: <BanduDashboardContent />,
        }]
      : []),
    ...(hasDala
      ? [{
          key: "dala",
          label: <><HomeOutlined /> Dala</>,
          children: <DalaDashboardContent />,
        }]
      : []),
  ];

  console.log("[UnifiedDashboardPage] Tab items:", tabItems);

  // Set default tab based on available modules
  React.useEffect(() => {
    if (hasDuka) setActiveTab("pos");
    else if (hasPesa) setActiveTab("accounting");
    else if (hasMteja) setActiveTab("mteja");
    else if (hasBandu) setActiveTab("bandu");
    else if (hasDala) setActiveTab("dala");
  }, [hasDuka, hasPesa, hasMteja, hasBandu, hasDala]);

  // Fallback: if no tabs, show message instead of defaulting to Duka
  if (tabItems.length === 0) {
    console.log("[UnifiedDashboardPage] No tabs detected, showing no modules message");
    return (
      <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>
        <TeamOutlined style={{ fontSize: 48, marginBottom: 16, color: "#94a3b8" }} />
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No modules enabled</div>
        <div style={{ fontSize: 14 }}>Please enable modules from the Discover page to view dashboards.</div>
      </div>
    );
  }

  console.log("[UnifiedDashboardPage] Final tab items:", tabItems);

  console.log("[UnifiedDashboardPage] Rendering tabs with activeTab:", activeTab);

  // The "Duka" tab already embeds its own Business Impact panel, so only show
  // the top-level one here when that tab isn't in play (avoids duplication).
  const showTopLevelBusinessImpact = activeTab !== "pos";

  return (
    <div style={{ padding: 24 }}>
      {showTopLevelBusinessImpact && (
        <BusinessImpact hasDuka={hasDuka} hasPesa={hasPesa} hasDala={hasDala} />
      )}

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
