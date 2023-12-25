import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import TableSettings from "./TableSettings";


const Location = () => <div>Content for location</div>;

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
      children: <Location />,
    },
  ];

  return (
    <ProCard
      tabs={{
        type: 'card',
        items: tabsItems,
        activeKey: activeTab,
        onChange: handleTabChange,
      }}
      title="Tables Main Settings"
    />
  );
};

export default TableMainSettings;
