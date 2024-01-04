import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import TableSettings from "./TableSettings";
import TableLocationSettings from "./Table_Locations";
import { AppstoreAddOutlined } from "@ant-design/icons";
import { Space } from "antd/lib";

const TableMainSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("table1");

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const tabsItems = [
    {
      key: "table1",
      tab: "Table",
      label: "Add New Table",
      children: <TableSettings />,
    },
    {
      key: "table2",
      tab: "loaction",
      label: "Add New Table Location",
      children: <TableLocationSettings />,
    },
  ];

  return (
    <ProCard
      style={{ height: "90vh" }}
      tabs={{
        type: "card",
        items: tabsItems,
        activeKey: activeTab,
        onChange: handleTabChange,
      }}
      title={
        <Space>
          <AppstoreAddOutlined />
          Tables Main Settings
        </Space>
      }
    />
  );
};

export default TableMainSettings;
