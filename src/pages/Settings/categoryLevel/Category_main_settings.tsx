import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Space, Typography } from "antd";
import {
  ApartmentOutlined,
  FolderOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import MainCategorySettings from "./Main_category";
import SubCategorySettings from "./Sub_category";
import CategorySettings from "./CategorySettings";
import ModifiersSettings from "./ModifiersSettings";

const CategoryMainSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("mainCategory");

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  return (
    <ProCard
      bordered
      style={{ margin: "20px", padding: "16px" }}
      title={
        <Typography.Title
          level={4}
          style={{ display: "flex", alignItems: "center", margin: 0 }}
        >
          <ApartmentOutlined style={{ marginRight: 8 }} />
          Category Main Settings
        </Typography.Title>
      }
      tabs={{
        type: "card",
        activeKey: activeTab,
        onChange: handleTabChange,
      }}
    >
      <ProCard.TabPane
        key="mainCategory"
        tab={
          <Space>
            <FolderOutlined />
            Main Category
          </Space>
        }
      >
        <MainCategorySettings />
      </ProCard.TabPane>

      <ProCard.TabPane
        key="category2"
        tab={
          <Space>
            <FolderOutlined />
            Sub-Category
          </Space>
        }
      >
        <SubCategorySettings />
      </ProCard.TabPane>

      <ProCard.TabPane
        key="category1"
        tab={
          <Space>
            <SettingOutlined />
            Category
          </Space>
        }
      >
        <CategorySettings />
      </ProCard.TabPane>

      <ProCard.TabPane
        key="modifiers"
        tab={
          <Space>
            <SettingOutlined />
            Modifiers
          </Space>
        }
      >
        <ModifiersSettings />
      </ProCard.TabPane>
    </ProCard>
  );
};

export default CategoryMainSettings;