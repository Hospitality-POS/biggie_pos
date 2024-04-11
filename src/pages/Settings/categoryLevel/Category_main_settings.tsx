import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import CategorySettings from "./CategorySettings";
import { Space } from "antd/lib";
import { ApartmentOutlined, HolderOutlined } from "@ant-design/icons";
import SubCategorySettings from "./Sub_category";
import MainCategorySettings from "./Main_category";
import { Typography } from "antd";

const Category2 = () => <div>Content for Category 2</div>;
const MainCategory = () => <div>Main Category Content</div>;

const CategoryMainSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("category1");

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const tabsItems = [
    {
      key: "mainCategory",
      tab: "Main Category",
      label:<><HolderOutlined/>Main Category</>,
      children: <MainCategorySettings />,
    },
    {
      key: "category2",
      tab: "Sub-category",
      label: <><HolderOutlined/>Sub-Category</>,
      children: <SubCategorySettings />,
    },
    {
      key: "category1",
      tab: "category",
      label: <><HolderOutlined/>Categorys</>,
      children: <CategorySettings />,
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
          <Typography.Title level={4}>
            <ApartmentOutlined /> Category Main Settings
          </Typography.Title>
        </Space>
      }
    />
  );
};

export default CategoryMainSettings;
