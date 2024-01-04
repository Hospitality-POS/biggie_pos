import { ProCard } from "@ant-design/pro-components";
import { UsergroupAddOutlined } from "@ant-design/icons";
import { Space } from "antd/lib";
import UsersList from "./UsersList";

function UsersMainSettings() {
  const tabsItems = [
    {
      key: "table1",
      tab: "Table",
      label: "All Users",
      children: <UsersList />,
    },
  ];
  return (
    <>
      <ProCard
        style={{ height: "90vh" }}
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
