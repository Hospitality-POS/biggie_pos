import { ProCard } from "@ant-design/pro-components";
import { HolderOutlined, UsergroupAddOutlined } from "@ant-design/icons";
import { Space } from "antd/lib";
import UsersTable from "./UsersTable";

function UsersMainSettings() {
  const tabsItems = [
      {
      key: "table1",
      tab: "Table",
      label: <Space><HolderOutlined/>All Users</Space>,
      children: <UsersTable />,
    },
  ];
  return (
    <>
      <ProCard
        title={<Space><UsergroupAddOutlined/>Users Main Settings</Space>}
        tabs={{
          type: "card",
          items: tabsItems,
        }}
      />
    </>
  );
}

export default UsersMainSettings;
