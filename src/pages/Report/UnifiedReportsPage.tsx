import React, { useState, useEffect } from "react";
import { Tabs, Typography, Empty } from "antd";
import {
  ShoppingOutlined,
  AccountBookOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import AdminReports from "src/AdminDashboard/ReportsPage/Reports";
import AccountingReportsPage from "./AccountingReportsPage";
import MtejaReports from "./MtejaReports";
import BanduReports from "./BanduReports";

const { Text } = Typography;

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

// ── Bandu/HR Report Components ─────────────────────────────────────────────────────
const BanduReportsContent: React.FC = () => <BanduReports />;

// ── Mteja/CRM Report Components ────────────────────────────────────────────────────
const MtejaReportsContent: React.FC = () => <MtejaReports />;

// ── Main Unified Reports Page ─────────────────────────────────────────────────────
const UnifiedReportsPage: React.FC = () => {
  const [moduleFlags, setModuleFlags] = useState(getModuleFlags());
  const [activeModuleTab, setActiveModuleTab] = useState<string>("duka");

  useEffect(() => {
    const handleStorageChange = () => {
      setModuleFlags(getModuleFlags());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Set initial tab based on available modules
  useEffect(() => {
    if (moduleFlags.hasDuka) setActiveModuleTab("duka");
    else if (moduleFlags.hasPesa) setActiveModuleTab("pesa");
    else if (moduleFlags.hasMteja) setActiveModuleTab("mteja");
    else if (moduleFlags.hasBandu) setActiveModuleTab("bandu");
  }, [moduleFlags]);

  // Build tab items dynamically based on enabled modules
  const tabItems = [
    ...(moduleFlags.hasDuka
      ? [
          {
            key: "duka",
            label: "Duka (Store)",
            icon: <ShoppingOutlined />,
            children: <AdminReports />,
          },
        ]
      : []),
    ...(moduleFlags.hasPesa
      ? [
          {
            key: "pesa",
            label: "Pesa (Accounting)",
            icon: <AccountBookOutlined />,
            children: <AccountingReportsPage />,
          },
        ]
      : []),
    ...(moduleFlags.hasMteja
      ? [
          {
            key: "mteja",
            label: "Mteja (CRM)",
            icon: <TeamOutlined />,
            children: <MtejaReportsContent />,
          },
        ]
      : []),
    ...(moduleFlags.hasBandu
      ? [
          {
            key: "bandu",
            label: "Bandu (HR)",
            icon: <TeamOutlined />,
            children: <BanduReportsContent />,
          },
        ]
      : []),
  ];

  // If no modules are enabled, show empty state
  if (tabItems.length === 0) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <Empty
          description={
            <div>
              <Text strong style={{ fontSize: 16, display: "block", marginBottom: 8 }}>
                No Reports Available
              </Text>
              <Text style={{ color: "#64748b" }}>
                Enable modules from the Discover page to access their reports.
              </Text>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: 20 }}>
        <Text strong style={{ fontSize: 20, color: "#0f172a" }}>
          Reports Center
        </Text>
        <Text style={{ display: "block", color: "#64748b", fontSize: 13, marginTop: 4 }}>
          Generate and view reports across all your enabled modules
        </Text>
      </div>

      <Tabs
        activeKey={activeModuleTab}
        onChange={setActiveModuleTab}
        items={tabItems}
        size="large"
        tabBarStyle={{ marginBottom: 24 }}
      />
    </div>
  );
};

export default UnifiedReportsPage;
