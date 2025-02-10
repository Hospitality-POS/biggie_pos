import React, { useCallback, useEffect, useState } from "react";
import { Menu, Button, Tooltip, Layout } from "antd";
import { useAppDispatch, useAppSelector } from "../../store";
import { fetchCategoriesByID } from "../../features/Category/CategoryActions";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";

import "./Sidetab.css";

const { Sider } = Layout;

interface VerticalTabProps {
  handleSub: () => void;
}

interface SubCategory {
  _id: string;
  name: string;
}

const VerticalTabs: React.FC<VerticalTabProps> = ({ handleSub }) => {
  const dispatch = useAppDispatch();
  const { subCategory: Subcategories } = useAppSelector((state) => state.Categories);

  const [selectedKey, setSelectedKey] = useState<string>('0');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleChangeSubCategory = (subcategoryID: string) => {
    dispatch(fetchCategoriesByID(subcategoryID));
    handleSub();
    if (isMobile) {
      setIsDrawerOpen(false);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
    if (isCollapsed && !isDrawerOpen) {
      setIsCollapsed(false);
    }
  };

  const subId = "6525f8292d06da587b70d5db";

  const fetchProductsBySub = useCallback(async () => {
    return dispatch(fetchCategoriesByID(subId));
  }, [dispatch]);

  useEffect(() => {
    fetchProductsBySub();
  }, [fetchProductsBySub]);

  useEffect(() => {
    if (isMobile) {
      setIsDrawerOpen(false);
      setIsCollapsed(false);
    }
  }, [isMobile]);

  if (!Subcategories?.length) {
    return null;
  }

  const siderStyle: React.CSSProperties = {
    position: isMobile ? 'fixed' : 'relative',
    height: '730px',
    transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.3s ease-in-out',
    background: '#6c1c2c',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '8px',
    backgroundColor: '#5a1724',
    borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
  };

  const scrollContainerStyle: React.CSSProperties = {
    height: 'calc(100% - 56px)',
    overflowY: 'auto',
  };

  const menuStyle: React.CSSProperties = {
    height: '100%',
    background: 'transparent',
    borderRight: 'none',
  };

  const menuItemStyle: React.CSSProperties = {
    margin: 0,
    height: '48px',
    lineHeight: '48px',
    color: 'white',
  };

  const mobileButtonStyle: React.CSSProperties = {
    position: 'fixed',
    left: '16px',
    top: '16px',
    zIndex: 1200,
    backgroundColor: '#6c1c2c',
    borderColor: 'transparent',
    color: 'white',
  };

  return (
    <>
      {isMobile && (
        <Button
          icon={<MenuOutlined />}
          onClick={toggleDrawer}
          style={mobileButtonStyle}
        />
      )}

      <Sider
        width={250}
        collapsedWidth={60}
        collapsed={isCollapsed}
        collapsible={!isMobile}
        trigger={null}
        style={siderStyle}
      >
        <div style={headerStyle}>
          {!isMobile && (
            <Button
              type="text"
              icon={isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapse}
              style={{ color: 'white' }}
            />
          )}
        </div>

        <div style={scrollContainerStyle}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            style={menuStyle}
            onSelect={({ key }) => setSelectedKey(key)}
            items={Subcategories.map((subcateg: SubCategory, index: number) => ({
              key: subcateg?._id,
              icon: <AppstoreOutlined />,
              label: (
                <Tooltip
                  title={isCollapsed ? subcateg.name : ''}
                  placement="right"
                  mouseEnterDelay={0.5}
                >
                  <span>{subcateg.name}</span>
                </Tooltip>
              ),
              onClick: () => handleChangeSubCategory(subcateg._id),
              style: menuItemStyle,
            }))}
          />
        </div>
      </Sider>

      {isMobile && isDrawerOpen && (
        <div
          onClick={toggleDrawer}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1,
          }}
        />
      )}
    </>
  );
};

export default VerticalTabs;