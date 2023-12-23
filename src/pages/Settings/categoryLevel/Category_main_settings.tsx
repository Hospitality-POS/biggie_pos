import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import CategorySettings from "./CategorySettings";

const Category2 = () => <div>Content for Category 2</div>;
const MainCategory = () => <div>Main Category Content</div>;

const CategoryMainSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("category1");

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const tabsItems = [
    {
      key: "category1",
      tab: "Sub-category",
      label: "Sub-Category",
      children: <CategorySettings />,
    },
    {
      key: "category2",
      tab: "Category",
      label: "Category",
      children: <Category2 />,
    },
    {
      key: "mainCategory",
      tab: "Main Category",
      label: "Main Category",
      children: <MainCategory />,
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
      title="Category Main Settings"
    />
  );
};

export default CategoryMainSettings;
