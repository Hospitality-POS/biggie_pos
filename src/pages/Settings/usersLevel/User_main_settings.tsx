import React, { useEffect, useState } from "react";
import {
  ApartmentOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Typography } from "antd";
import UsersTable from "./UsersTable";
import RoleSettings from "./RoleSettings";
import PermissionSettings from "./PermissionSettings";
import HRAnalytics from "./HRAnalytics";
import Departments from "./Departments";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { getPrimaryColor } from "../../../utils/getPrimaryColor";
import { HScroll } from "@pages/OmniChannel/shared/ui";

const { Text } = Typography;

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

type TabKey = "users" | "roles" | "permissions" | "departments";

function UsersMainSettings() {
  const isMobile = useIsMobile();
  const rawPrimary = usePrimaryColor();
  const primary = typeof rawPrimary === "string" && rawPrimary ? rawPrimary : getPrimaryColor();
  const [activeTab, setActiveTab] = useState<TabKey>("users");

  const NAV_TABS: { key: TabKey; label: string; hint: string; icon: React.ReactNode }[] = [
    { key: "users", label: "Staff", hint: "Add people, set their role, branch and status", icon: <UserOutlined /> },
    { key: "roles", label: "Roles", hint: "Create roles such as cashier, waiter or manager", icon: <SafetyCertificateOutlined /> },
    { key: "permissions", label: "Permissions", hint: "Choose exactly what each role can see and do", icon: <LockOutlined /> },
    { key: "departments", label: "Departments", hint: "Group staff into teams", icon: <ApartmentOutlined /> },
  ];
  const active = NAV_TABS.find((t) => t.key === activeTab)!;

  return (
    <div style={{ padding: isMobile ? "0 0 80px" : 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: isMobile ? 12 : 16 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${primary}14`,
            color: primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          <TeamOutlined />
        </div>
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ fontSize: isMobile ? 17 : 19, color: "#0f172a", display: "block", lineHeight: 1.2 }}>
            Staff management
          </Text>
          <Text style={{ fontSize: 12.5, color: "#64748b" }}>
            Your team, what they can access, and how they're organised
          </Text>
        </div>
      </div>

      {/* Attendance KPI strip (Bandu / payroll module only) */}
      <HRAnalytics />

      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Section switcher */}
        <div style={{ padding: isMobile ? "10px 10px 0" : "12px 16px 0", borderBottom: "1px solid #f1f5f9" }}>
          <HScroll gap={6} padding="0 0 10px">
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 999,
                    border: `1px solid ${isActive ? primary : "#e2e8f0"}`,
                    background: isActive ? `${primary}12` : "#fff",
                    color: isActive ? primary : "#475569",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 13,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ display: "flex", fontSize: 13 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </HScroll>
          {!isMobile && (
            <Text style={{ fontSize: 12, color: "#94a3b8", display: "block", paddingBottom: 10, marginTop: -2 }}>
              {active.hint}
            </Text>
          )}
        </div>

        {/* Section content */}
        <div style={{ minHeight: 420, background: activeTab === "users" ? "#fff" : "#fafafa" }}>
          {activeTab === "users" && <UsersTable />}
          {activeTab === "roles" && <RoleSettings />}
          {activeTab === "permissions" && <PermissionSettings />}
          {activeTab === "departments" && <Departments />}
        </div>
      </div>
    </div>
  );
}

export default UsersMainSettings;
