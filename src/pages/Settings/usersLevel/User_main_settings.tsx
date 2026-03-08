import { ProCard } from "@ant-design/pro-components";
import { LockOutlined, UserOutlined, UsergroupAddOutlined } from "@ant-design/icons";
import { Space, Typography } from "antd";
import UsersTable from "./UsersTable";
import RoleSettings from "./RoleSettings";
import PermissionSettings from "./PermissionSettings";

const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  blue: "#3b82f6",
  indigo: "#6366f1",
  subText: "#64748b",
  darkText: "#0f172a",
};

// ── Tab label ─────────────────────────────────────────────────────────────────
const TabLabel: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
}> = ({ icon, label, color }) => (
  <Space size={6}>
    <span style={{ color, fontSize: 13, lineHeight: 1, display: "flex" }}>{icon}</span>
    <Text style={{ fontSize: 13, fontWeight: 500, color: C.darkText }}>{label}</Text>
  </Space>
);

// ── Tab content wrapper ───────────────────────────────────────────────────────
const TabContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: "#fafafa", borderRadius: 8, minHeight: 400 }}>
    {children}
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
function UsersMainSettings() {
  return (
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
      <ProCard.TabPane
        key="users"
        tab={<TabLabel icon={<UserOutlined />} label="Users" color={C.green} />}
      >
        <TabContent>
          <UsersTable />
        </TabContent>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="roles"
        tab={<TabLabel icon={<UsergroupAddOutlined />} label="Roles" color={C.blue} />}
      >
        <TabContent>
          <RoleSettings />
        </TabContent>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="permissions"
        tab={<TabLabel icon={<LockOutlined />} label="Permissions" color={C.indigo} />}
      >
        <TabContent>
          <PermissionSettings />
        </TabContent>
      </ProCard.TabPane>
    </ProCard>
  );
}

export default UsersMainSettings;