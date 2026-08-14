import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ActionType } from "@ant-design/pro-components";
import {
  ApartmentOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { Card, Typography } from "antd";
import UsersTable from "./UsersTable";
import RoleSettings from "./RoleSettings";
import PermissionSettings from "./PermissionSettings";
import HRAnalytics from "./HRAnalytics";
import Departments from "./Departments";
import AddEditProUserModal from "@components/MODALS/pro/AddEditProUserModal";
import { fetchAllUsersList } from "@services/users";
import { usePrimaryColor } from "@context/PrimaryColorContext";

const { Text, Title } = Typography;

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
  const location = useLocation();
  const rawPrimary = usePrimaryColor();
  const primary = (typeof rawPrimary === "string" && rawPrimary) ? rawPrimary : "#6c1c2c";
  const C = makeC(primary);

  // At /staff-management the view is scoped to the current branch
  const isShopLevel = location.pathname === "/staff-management";
  const currentShopId = localStorage.getItem("shopId");

  const NAV_TABS = [
    { key: "users",       label: "Manage Users",      icon: <UserOutlined />,              color: C.primary },
    { key: "roles",       label: "Roles",              icon: <SafetyCertificateOutlined />, color: C.blue    },
    { key: "permissions", label: "Permission Matrix",  icon: <LockOutlined />,              color: C.indigo  },
    { key: "departments", label: "Departments",        icon: <ApartmentOutlined />,         color: C.purple  },
  ];

  const usersTableRef = useRef<ActionType | null>(null);
  const [activeTab, setActiveTab] = useState("users");
  const [stats, setStats] = useState({ total: 0, active: 0, suspended: 0, terminated: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = async () => {
    try {
      const result = await fetchAllUsersList({ returnPagination: true, pageSize: 1000 });
      const data = result?.users || [];
      let arr = Array.isArray(data) ? data : [];

      // Branch-level view: only count staff belonging to this shop
      if (isShopLevel && currentShopId) {
        arr = arr.filter((u: any) =>
          u.shop_id?._id === currentShopId || u.shop_id === currentShopId
        );
      }

      setStats({
        total:      arr.length,
        active:     arr.filter((u: any) => !u.status || u.status === "Active").length,
        suspended:  arr.filter((u: any) => u.status === "Suspended").length,
        terminated: arr.filter((u: any) => u.status === "Terminated").length,
      });
    } catch { /* silent */ } finally { setStatsLoading(false); }
  };

  useEffect(() => { loadStats(); }, [isShopLevel, currentShopId]);

  const handleUserAdded = () => {
    (usersTableRef as any).current?.reload?.();
    loadStats();
  };

  return (
    <div style={{ padding: isMobile ? "0 0 80px" : 0 }}>

      {/* ── Page header banner ────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 60%, ${primary}bb 100%)`,
        borderRadius: 14,
        padding: isMobile ? "20px 16px 18px" : "24px 28px 22px",
        marginBottom: 16,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* decorative circles */}
        <div style={{ position: "absolute", right: -30, top: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 60, bottom: -50, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />

        {/* Title + CTA row */}
        <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: statsLoading ? 0 : 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "5px 7px", display: "flex", alignItems: "center" }}>
                <UsergroupAddOutlined style={{ color: "#fff", fontSize: 18 }} />
              </div>
              <Title level={4} style={{ margin: 0, color: "#fff", fontWeight: 700, letterSpacing: -0.3 }}>
                Crew Management
              </Title>
            </div>
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
              Create users, assign roles and control module access
            </Text>
          </div>

          <AddEditProUserModal
            actionRef={usersTableRef as any}
            onUserSaved={handleUserAdded}
            onSuccess={handleUserAdded}
          />
        </div>

        {/* Stats pills */}
        {!statsLoading && (
          <div style={{ display: "flex", gap: isMobile ? 8 : 10, flexWrap: "wrap" }}>
            {[
              { label: "Total",      value: stats.total,      color: "#fff",     bg: "rgba(255,255,255,0.12)", dot: false },
              { label: "Active",     value: stats.active,     color: "#6ee7b7",  bg: "rgba(16,185,129,0.18)",  dot: true  },
              { label: "Suspended",  value: stats.suspended,  color: "#fde68a",  bg: "rgba(245,158,11,0.18)",  dot: true  },
              { label: "Terminated", value: stats.terminated, color: "#fca5a5",  bg: "rgba(239,68,68,0.18)",   dot: true  },
            ].map((s) => (
              <div key={s.label} style={{
                display: "flex", alignItems: "center", gap: s.dot ? 6 : 0,
                background: s.bg, borderRadius: 8, padding: "5px 11px",
              }}>
                {s.dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, flexShrink: 0 }} />}
                <Text style={{ fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</Text>
                <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginLeft: 5, whiteSpace: "nowrap" }}>{s.label}</Text>
              </div>
            ))}
          </div>
        )}
      </div>

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
        {activeTab === "users" && (
          <UsersTable
            actionRef={usersTableRef as React.RefObject<ActionType>}
            onUserChange={loadStats}
          />
        )}
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
