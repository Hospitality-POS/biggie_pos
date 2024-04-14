import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import TableLocationSettings from "./Table_Locations";
import { AppstoreAddOutlined, HolderOutlined } from "@ant-design/icons";
import { Space } from "antd/lib";
import TableSetting from "./Table_settings";

const TableMainSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("table2");

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const tabsItems = [
    {
      key: "table2",
      tab: "loaction",

      label: (
        <>
          <HolderOutlined />
          Locations
        </>
      ),
      children: <TableLocationSettings />,
    },
    {
      key: "table1",
      tab: "Table",
      label: (
        <>
          <HolderOutlined />
          Tables
        </>
      ),
      children: <TableSetting />,
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
