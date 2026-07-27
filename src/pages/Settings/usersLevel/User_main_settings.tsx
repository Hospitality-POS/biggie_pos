import React, { useEffect, useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
  ApartmentOutlined,
  LockOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { Badge, Space, Tag, Typography } from "antd";
import UsersTable from "./UsersTable";
import RoleSettings from "./RoleSettings";
import PermissionSettings from "./PermissionSettings";
import HRAnalytics from "./HRAnalytics";
import Departments from "./Departments";

const { Text } = Typography;

const C = {
  primary: "#6c1c2c",
  green: "#10b981",
  blue: "#3b82f6",
  indigo: "#6366f1",
  orange: "#f59e0b",
  purple: "#8b5cf6",
  darkText: "#0f172a",
};

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

const isBanduEnabled = (): boolean => {
  try {
    const t = JSON.parse(localStorage.getItem("tenant") || "{}");
    return t?.modules?.payroll === true && t?.bandu_settings?.accepted_terms === true;
  } catch { return false; }
};

const TabLabel: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  badge?: number;
  comingSoon?: boolean;
}> = ({ icon, label, color, badge, comingSoon }) => (
  <Space size={6}>
    <span style={{ color, fontSize: 13, lineHeight: 1, display: "flex" }}>{icon}</span>
    <Text style={{ fontSize: 13, fontWeight: 500, color: C.darkText }}>{label}</Text>
    {badge != null && badge > 0 && <Badge count={badge} size="small" style={{ background: C.primary }} />}
    {comingSoon && (
      <Tag style={{
        background: "#f0f9ff", color: C.blue, border: "none",
        borderRadius: 4, fontSize: 9, fontWeight: 700,
        padding: "1px 5px", letterSpacing: "0.3px",
        textTransform: "uppercase", lineHeight: "14px",
      }}>
        Soon
      </Tag>
    )}
  </Space>
);

const TabContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: "#fafafa", borderRadius: 8, minHeight: 400 }}>
    {children}
  </div>
);

function UsersMainSettings() {
  const isMobile = useIsMobile();
  const banduEnabled = isBanduEnabled();

  return (
    <div>
      <HRAnalytics isMobile={isMobile} />

      <ProCard
        bordered
        style={{ borderRadius: 12 }}
        tabs={{
          type: "card",
          defaultActiveKey: "users",
          size: "middle",
          style: { marginBottom: 0 },
        }}
      >
        {/* Users */}
        <ProCard.TabPane
          key="users"
          tab={<TabLabel icon={<UserOutlined />} label="Users" color={C.green} />}
        >
          <TabContent><UsersTable /></TabContent>
        </ProCard.TabPane>

        {/* Roles */}
        <ProCard.TabPane
          key="roles"
          tab={<TabLabel icon={<UsergroupAddOutlined />} label="Roles" color={C.blue} />}
        >
          <TabContent><RoleSettings /></TabContent>
        </ProCard.TabPane>

        {/* Permissions */}
        <ProCard.TabPane
          key="permissions"
          tab={<TabLabel icon={<LockOutlined />} label="Permissions" color={C.indigo} />}
        >
          <TabContent><PermissionSettings /></TabContent>
        </ProCard.TabPane>

        {/* Departments */}
        <ProCard.TabPane
          key="departments"
          tab={<TabLabel icon={<ApartmentOutlined />} label="Departments" color={C.purple} />}
        >
          <TabContent><Departments /></TabContent>
        </ProCard.TabPane>

        {/* Bandu tabs */}
        {/* Leave Requests tab hidden */}
        {/* {banduEnabled && (
          <ProCard.TabPane
            key="leave"
            tab={<TabLabel icon={<CalendarOutlined />} label="Leave Requests" color={C.primary} badge={pendingLeaveCount} />}
          >
            <TabContent><LeaveManagement /></TabContent>
          </ProCard.TabPane>
        )} */}
      </ProCard>
    </div>
  );
}

export default UsersMainSettings;