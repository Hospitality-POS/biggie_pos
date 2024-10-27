import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Space, Typography } from "antd";
import {
  ApartmentOutlined,
  FolderOutlined,
  SettingOutlined,
  AppstoreOutlined,
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
      title={
        <Typography.Title
          level={4}
          style={{
            display: "flex",
            alignItems: "center",
            margin: 0,
          }}
        >
          <ApartmentOutlined style={{ marginRight: 8 }} />
          Category Main Settings
        </Typography.Title>
      }
      tabs={{
        type: "card",
        activeKey: activeTab,
        onChange: handleTabChange,
        size: "large",
      }}
    >
      <ProCard.TabPane
        key="mainCategory"
        tab={
          <Space>
            <AppstoreOutlined style={{ color: "#52c41a" }} />
            <Typography.Text>Main Category</Typography.Text>
          </Space>
        }
      >
        <div
          style={{
            padding: "0",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
          }}
        >
          <MainCategorySettings />
        </div>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="category2"
        tab={
          <Space>
            <FolderOutlined style={{ color: "#faad14" }} />
            <Typography.Text>Sub-Category</Typography.Text>
          </Space>
        }
      >
        <div
          style={{
            padding: "0",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
          }}
        >
          <SubCategorySettings />
        </div>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="category1"
        tab={
          <Space>
            <FolderOutlined style={{ color: "#1890ff" }} />
            <Typography.Text>Category</Typography.Text>
          </Space>
        }
      >
        <div
          style={{
            padding: "0",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
          }}
        >
          <CategorySettings />
        </div>
      </ProCard.TabPane>

      <ProCard.TabPane
        key="modifiers"
        tab={
          <Space>
            <SettingOutlined style={{ color: "#eb2f96" }} />
            <Typography.Text>Modifiers</Typography.Text>
          </Space>
        }
      >
        <div
          style={{
            padding: "0",
            backgroundColor: "#fafafa",
            borderRadius: "8px",
          }}
        >
          <ModifiersSettings />
        </div>
      </ProCard.TabPane>
    </ProCard>
  );
};

export default CategoryMainSettings;
