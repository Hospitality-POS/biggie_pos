import { ProCard } from "@ant-design/pro-components";
import { UserOutlined, UsergroupAddOutlined, LockOutlined } from "@ant-design/icons";
import { Space, Typography, Divider } from "antd";
import UsersTable from "./UsersTable";
import RoleSettings from "./RoleSettings";
import PermissionSettings from "./PermissionSettings";

const { Text } = Typography;

function UsersMainSettings() {
  return (
    <ProCard
      bordered
      title={
        <Typography.Title
          level={4}
          style={{
            display: "flex",
            alignItems: "center",
            margin: 0,
            fontWeight: "bold",
          }}
        >
          <UsergroupAddOutlined style={{ marginRight: 8 }} />
          Users Main Settings
        </Typography.Title>
      }
      tabs={{
        type: "card",
        defaultActiveKey: "users",
        size: "large",
      }}
    >
      <ProCard.TabPane
        key="users"
        tab={
          <Space>
            <UserOutlined style={{ color: "#52c41a" }} />
            <Text style={{ fontWeight: "lighter" }}>Users</Text>
          </Space>
        }
      >
        <div
          style={{
            padding: "0",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
          }}
        >
          <UsersTable />
        </div>
      </ProCard.TabPane>
      <ProCard.TabPane
        key="roles"
        tab={
          <Space>
            <UsergroupAddOutlined style={{ color: "#1890ff" }} />
            <Text style={{ fontWeight: "normal" }}>Roles</Text>
          </Space>
        }
      >
        <div
          style={{
            padding: "0",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
          }}
        >
          <RoleSettings />
        </div>
      </ProCard.TabPane>


      <ProCard.TabPane
        key="permissions"
        tab={
          <Space>
            <LockOutlined style={{ color: "#1890ff" }} />
            <Text style={{ fontWeight: "normal" }}>Permissions</Text>
          </Space>
        }
      >
        <div
          style={{
            padding: "0",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
          }}
        >
          <PermissionSettings />
        </div>
      </ProCard.TabPane>

      <Divider style={{ margin: 0 }} />
    </ProCard>
  );
}

export default UsersMainSettings;
