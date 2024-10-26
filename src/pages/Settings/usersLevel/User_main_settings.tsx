import { ProCard } from "@ant-design/pro-components";
import { UserOutlined, UsergroupAddOutlined } from "@ant-design/icons";
import { Space } from "antd";
import UsersTable from "./UsersTable";
import RoleSettings from "./RoleSettings";

function UsersMainSettings() {
  return (
    <ProCard
      bordered
      title={
        <Space align="center">
          <UsergroupAddOutlined />
          <span style={{ fontSize: 18, fontWeight: 500 }}>
            Users Main Settings
          </span>
        </Space>
      }
      tabs={{
        type: "card",
        defaultActiveKey: "users",
      }}
    >
      <ProCard.TabPane
        key="users"
        tab={
          <Space>
            <UserOutlined />
            <span>Users</span>
          </Space>
        }
      >
        <UsersTable />
      </ProCard.TabPane>
      <ProCard.TabPane
        key="roles"
        tab={
          <Space>
            <UsergroupAddOutlined />
            <span>Roles</span>
          </Space>
        }
      >
        <RoleSettings />
      </ProCard.TabPane>
    </ProCard>
  );
}

export default UsersMainSettings;