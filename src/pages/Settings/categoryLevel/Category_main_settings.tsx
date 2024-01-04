import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import CategorySettings from "./CategorySettings";
import { Space } from "antd/lib";
import { ApartmentOutlined } from "@ant-design/icons";

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
      tab: "category",
      label: "All Categorys",
      children: <CategorySettings />,
    },
    {
      key: "category2",
      tab: "Sub-category",
      label: "All Sub-Categorys",
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
      style={{ height: "90vh" }}
      tabs={{
        type: "card",
        items: tabsItems,
        activeKey: activeTab,
        onChange: handleTabChange,
      }}
      title={
        <Space>
          <ApartmentOutlined />
          Category Main Settings
        </Space>
      }
    />
  );
};

export default CategoryMainSettings;
