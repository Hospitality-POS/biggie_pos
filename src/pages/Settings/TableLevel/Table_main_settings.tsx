import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import TableLocationSettings from "./Table_Locations";
import { AppstoreAddOutlined, HolderOutlined } from "@ant-design/icons";
import { Space } from "antd/lib";
import TableSetting from "./Table_settings";

const TableMainSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("table1");

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const tabsItems = [
    {
      key: "table1",
      tab: "Table",
      label: (
        <>
          <HolderOutlined />
          All Tables
        </>
      ),
      children: <TableSetting />,
    },
    {
      key: "table2",
      tab: "loaction",

      label: (
        <>
          <HolderOutlined />
          All Table Locations
        </>
      ),
      children: <TableLocationSettings />,
    },
  ];

  return (
    <ProCard
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
