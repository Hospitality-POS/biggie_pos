import React, { useEffect, useState } from "react";
import {
  ApartmentOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Card } from "antd";
import UsersTable from "./UsersTable";
import RoleSettings from "./RoleSettings";
import PermissionSettings from "./PermissionSettings";
import HRAnalytics from "./HRAnalytics";
import Departments from "./Departments";
import { usePrimaryColor } from "@context/PrimaryColorContext";

const makeC = (primary: string) => ({
  primary,
  primaryLight: primary + "20",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  indigo: "#6366f1",
  purple: "#8b5cf6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
});

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

function UsersMainSettings() {
  const isMobile = useIsMobile();
  const rawPrimary = usePrimaryColor();
  const primary = (typeof rawPrimary === "string" && rawPrimary) ? rawPrimary : "#6c1c2c";
  const C = makeC(primary);

  const NAV_TABS = [
    { key: "users",       label: "Manage Users",      icon: <UserOutlined />,              color: C.primary },
    { key: "roles",       label: "Roles",              icon: <SafetyCertificateOutlined />, color: C.blue    },
    { key: "permissions", label: "Permission Matrix",  icon: <LockOutlined />,              color: C.indigo  },
    { key: "departments", label: "Departments",        icon: <ApartmentOutlined />,         color: C.purple  },
  ];

  const [activeTab, setActiveTab] = useState("users");

  return (
    <div style={{ padding: isMobile ? "0 0 80px" : 0 }}>

      {/* ── Attendance KPI strip (Bandu / payroll module only) ─────────────── */}
      <HRAnalytics />

      {/* ── Single navigation row (chips) ─────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 6, marginBottom: 0,
        flexWrap: isMobile ? "wrap" : "nowrap",
        background: "#fff",
        border: `1px solid ${C.border}`,
        borderBottom: "none",
        borderRadius: "10px 10px 0 0",
        padding: "10px 14px 0",
      }}>
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: isActive ? `${tab.color}15` : "transparent",
                border: "none",
                borderBottom: isActive ? `2.5px solid ${tab.color}` : "2.5px solid transparent",
                borderRadius: "6px 6px 0 0",
                padding: "8px 14px",
                cursor: "pointer",
                color: isActive ? tab.color : C.subText,
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                transition: "all 0.15s",
                marginBottom: -1,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 13, display: "flex" }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content area ──────────────────────────────────────────────────── */}
      <Card
        bordered
        style={{ borderRadius: "0 0 12px 12px", minHeight: 420 }}
        bodyStyle={{ padding: 0 }}
      >
        {activeTab === "users" && <UsersTable />}
        {activeTab === "roles" && (
          <div style={{ background: "#fafafa", borderRadius: "0 0 12px 12px", minHeight: 420 }}>
            <RoleSettings />
          </div>
        )}
        {activeTab === "permissions" && (
          <div style={{ background: "#fafafa", borderRadius: "0 0 12px 12px", minHeight: 420 }}>
            <PermissionSettings />
          </div>
        )}
        {activeTab === "departments" && (
          <div style={{ background: "#fafafa", borderRadius: "0 0 12px 12px", minHeight: 420 }}>
            <Departments />
          </div>
        )}
      </Card>
    </div>
  );
}

export default UsersMainSettings;
