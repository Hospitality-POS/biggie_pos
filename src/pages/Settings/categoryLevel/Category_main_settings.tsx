import React, { useState } from 'react';
import { ProCard } from '@ant-design/pro-components';
import CategorySettings from '../CategorySettings';

const { TabPane } = ProCard;

const Category2 = () => <div>Content for Category 2</div>;
const MainCategory = () => <div>Main Category Content</div>;

const CategoryMainSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('category1');

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  return (
    <ProCard
      tabs={{
        type: 'card',
      }}
    >
      <TabPane key="category2" tab="Category">
        <Category2 />
      </TabPane>
      <TabPane key="category1" tab="Sub-category">
        <CategorySettings/>
      </TabPane>
      <TabPane key="mainCategory" tab="Main Category">
        <MainCategory />
      </TabPane>
    </ProCard>
  );
};

export default CategoryMainSettings;