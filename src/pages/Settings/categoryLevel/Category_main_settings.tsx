import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import CategorySettings from "./CategorySettings";
import { Space } from "antd/lib";
import { ApartmentOutlined, HolderOutlined } from "@ant-design/icons";
import SubCategorySettings from "./Sub_category";
import MainCategorySettings from "./Main_category";
import { Typography } from "antd";
import ModifiersSettings from "./ModifiersSettings";


const CategoryMainSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("mainCategory");

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const tabsItems = [
    {
      key: "mainCategory",
      tab: "Main Category",
      label:<Space><HolderOutlined/>Main Category</Space>,
      children: <MainCategorySettings />,
    },
    {
      key: "category2",
      tab: "Sub-category",
      label: <Space><HolderOutlined/>Sub-Category</Space>,
      children: <SubCategorySettings />,
    },
    {
      key: "category1",
      tab: "category",
      label: <Space><HolderOutlined/>Category</Space>,
      children: <CategorySettings />,
    },
    {
      key: "modifiers",
      tab: "Modifiers",
      label: <Space><HolderOutlined/>Modifiers</Space>,
      children: <ModifiersSettings />,
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
