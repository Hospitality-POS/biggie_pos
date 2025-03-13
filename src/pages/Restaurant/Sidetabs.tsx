import React, { useEffect, useState } from "react";
import { Menu, Button, Tooltip, Layout } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";

import "./Sidetab.css";

const { Sider } = Layout;

interface VerticalTabProps {
  handleSubCategoryChange: (subcategoryID: string) => void;
  subcategories: Array<{ _id: string; name: string }>;
}

const VerticalTabs: React.FC<VerticalTabProps> = ({ handleSubCategoryChange, subcategories }) => {
  const [selectedKey, setSelectedKey] = useState<string>('0');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.primary_color) {
      setPrimaryColor(tenant.primary_color);
    }
  }, []);


  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleChangeSubCategory = (subcategoryID: string) => {
    handleSubCategoryChange(subcategoryID);
    if (isMobile) setIsDrawerOpen(false);
  };

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
    if (isCollapsed && !isDrawerOpen) setIsCollapsed(false);
  };

  useEffect(() => {
    if (isMobile) {
      setIsDrawerOpen(false);
      setIsCollapsed(false);
    }
  }, [isMobile]);

  if (!subcategories?.length) return null;

  const siderStyle: React.CSSProperties = {
    position: 'relative',
    height: '100%',
    maxWidth: '33%',
    minWidth: isCollapsed ? '80px' : '200px',
    background: primaryColor,
    transition: 'all 0.3s ease-in-out',
    overflowY: 'auto',
    maxHeight: '100vh',
  };

  return (
    <>
      {isMobile && (
        <Button
          icon={<MenuOutlined />}
          onClick={toggleDrawer}
          style={{ position: 'fixed', left: '16px', top: '16px', zIndex: 1200 }}
        />
      )}
      <Sider
        width={180}
        collapsedWidth={80}
        collapsed={isCollapsed}
        collapsible={!isMobile}
        trigger={null}
        style={siderStyle}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px' }}>
          {!isMobile && (
            <Button
              type="text"
              icon={isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapse}
              style={{ color: 'white' }}
            />
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ background: 'transparent', borderRight: 'none' }}
          onSelect={({ key }) => setSelectedKey(key)}
          items={subcategories.map(subcateg => ({
            key: subcateg._id,
            icon: <AppstoreOutlined />,
            label: (
              <Tooltip title={isCollapsed ? subcateg.name : ''} placement="right" mouseEnterDelay={0.5}>
                <span>{subcateg.name}</span>
              </Tooltip>
            ),
            onClick: () => handleChangeSubCategory(subcateg._id),
            style: { color: 'white' },
          }))}
        />
      </Sider>
    </>
  );
};

export default VerticalTabs;
