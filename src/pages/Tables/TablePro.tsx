import { AppstoreOutlined, HolderOutlined, PlusOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import SuccesssModal from "@components/MODALS/SuccessModal";
import TableCard from "@components/TableCard/TableCard";
import StaffModal from "@components/staffCard/LoginModal";
import { fetchTableUsequery } from "@services/tables";
import { useQuery } from "@tanstack/react-query";
import { ConfigProvider, Skeleton, Typography, Result, Button } from "antd";
import { Space } from "antd/lib";
import Lottie from "lottie-react";
import React, { useState, useEffect } from "react";
import { useAppSelector } from "src/store";
import fssanimation from "../../components/Loaders/tables.json";
import EmptyPage from "@routes/EmptyPage";
import { useNavigate } from "react-router-dom";

const TableSkeleton = () => <Skeleton.Image active style={{ width: "50%", height: "100px" }} />;

const LoadingTabContent = () => (
  <div
    className="wrapper2"
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: "4px",
      padding: "20px",
      height: "calc(100vh - 280px)",
      overflowY: "auto",
    }}
  >
    {[...Array(4)].map((_, index) => (
      <TableSkeleton key={index} />
    ))}
  </div>
);

const LoadingTabs = () => (
  <div style={{ padding: "16px 0" }}>
    <Space size={16}>
      <Skeleton.Button active style={{ width: 100, borderRadius: 4 }} />
      <Skeleton.Button active style={{ width: 100, borderRadius: 4 }} />
      <Skeleton.Button active style={{ width: 100, borderRadius: 4 }} />
      <Skeleton.Button active style={{ width: 100, borderRadius: 4 }} />
    </Space>
  </div>
);

export default function TablePro() {
  const [open, setOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const { user } = useAppSelector((state) => state.auth);
  const [primaryColor, setPrimaryColor] = useState("#6c1c2c");
  const [isBackgroundBlurred, setIsBackgroundBlurred] = useState(false);
  const { openModal: successmodal, loading } = useAppSelector((state) => state.order);
  const navigate = useNavigate();
  const storedCode = localStorage.getItem("companyCode");

  // Constants for tab management
  const DEFAULT_TAB = "overview";
  const STORAGE_KEY = "activeTableTabId";
  const VISIT_KEY = "hasVisitedTablesBefore";

  // Initialize with overview - always default to overview tab
  const [activeTabId, setActiveTabId] = useState(DEFAULT_TAB);

  // Helper function to validate and set tab
  const setValidActiveTab = (tabId) => {
    // Ensure we always have a valid tab ID
    const validTabId = tabId && tabId !== "undefined" && tabId !== "null" && tabId.trim() !== ""
      ? tabId
      : DEFAULT_TAB;

    setActiveTabId(validTabId);
    localStorage.setItem(STORAGE_KEY, validTabId);
    return validTabId;
  };

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.primary_color) {
      setPrimaryColor(tenant.primary_color);
    }
  }, []);

  // Enhanced tab management logic with better validation
  useEffect(() => {
    const isFirstVisit = localStorage.getItem(VISIT_KEY) !== "true";

    if (isFirstVisit) {
      // Mark as visited for future visits
      localStorage.setItem(VISIT_KEY, "true");
      // For first visit, always ensure overview tab is selected
      setValidActiveTab(DEFAULT_TAB);
    } else {
      // For returning visits, try to restore previous tab with validation
      const savedTabId = localStorage.getItem(STORAGE_KEY);
      setValidActiveTab(savedTabId);
    }
  }, []);

  // Show login modal and blur background if companyCode is not present
  useEffect(() => {
    if (!storedCode) {
      setIsBackgroundBlurred(true);
      setOpen(true);
      setSelectedProductId(null);
    }
  }, [storedCode]);

  const handleOpen = (productId) => {
    setOpen(true);
    setSelectedProductId(productId);
  };

  // Enhanced tab change handler with validation
  const handleTabChange = (key) => {
    if (key && key !== "undefined" && key !== "null" && key.trim() !== "") {
      setValidActiveTab(key);
    } else {
      // Fallback to default tab if invalid key
      setValidActiveTab(DEFAULT_TAB);
    }
  };

  // Query setup with better error handling
  const queryKey = activeTabId === DEFAULT_TAB
    ? ["tables", "overview"]
    : ["tables", activeTabId];

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: () => {
      if (storedCode) {
        return fetchTableUsequery({ id: activeTabId });
      }
      return [];
    },
    networkMode: "always",
    enabled: !!storedCode,
    retry: 2,
    retryDelay: 1000,
  });

  if (successmodal) {
    return <SuccesssModal />;
  }

  const DefaultView = () => (
    <div
      style={{
        height: "calc(100vh - 280px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fafafa",
        borderRadius: "8px",
        padding: "20px",
      }}
    >
      <Result
        icon={
          <AppstoreOutlined style={{ fontSize: "64px", color: primaryColor }} />
        }
        title="Welcome to Slots Management"
        subTitle="Please select a staff slot from above to view its Customer Slots"
        extra={[
          <Button
            type="primary"
            onClick={() => navigate("/table-settings")}
            style={{ backgroundColor: primaryColor }}
            icon={<PlusOutlined />}
            disabled={user?.role !== "admin" && user?.role !== "cashier"}
            key="add-slot"
          >
            Add New Slot
          </Button>,
        ]}
      />
    </div>
  );

  // Enhanced tab items generation with better error handling
  const generateTabItems = () => {
    const dynamicTabs = data?.map((item) => ({
      key: `${item._id}`,
      tab: "Table",
      label: (
        <Space>
          <HolderOutlined />
          {item.name || 'Unnamed Table'}
        </Space>
      ),
      children: item?.tables && item?.tables.length > 0 ? (
        <div
          className="wrapper2"
          style={{
            display: "grid",
            rowGap: 30,
            height: "calc(100vh - 280px)",
            overflowY: "auto",
            alignItems: "start",
          }}
        >
          {item.tables.map((T) => (
            <div
              key={T._id}
              className="card"
              style={{
                display: "flex",
                justifyContent: "flex-start",
                marginTop: "0px",
                flexWrap: "wrap",
                width: "100%",
                bottom: 0,
              }}
            >
              <TableCard key={T._id} item={T} openModal={handleOpen} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyPage />
      ),
    })) || [];

    // Always ensure the overview tab is included first
    return [
      {
        key: DEFAULT_TAB,
        tab: "Overview",
        label: (
          <Space>
            <AppstoreOutlined />
            Overview
          </Space>
        ),
        children: <DefaultView />,
      },
      ...dynamicTabs,
    ];
  };

  // Validation effect to ensure active tab exists in available tabs
  useEffect(() => {
    if (!isLoading && data) {
      const allTabItems = generateTabItems();
      const tabKeys = allTabItems.map(item => item.key);

      // Check if current active tab exists in available tabs
      if (!tabKeys.includes(activeTabId)) {
        console.warn(`Active tab '${activeTabId}' not found in available tabs. Falling back to default.`);
        setValidActiveTab(DEFAULT_TAB);
      }
    }
  }, [data, isLoading, activeTabId]);

  if (loading) {
    return (
      <div
        style={{
          display: "grid",
          placeContent: "center",
          placeSelf: "auto",
          marginTop: "80px",
        }}
      >
        <Lottie
          animationData={fssanimation}
          loop={true}
          height={20}
          width={20}
        />
      </div>
    );
  }

  if (isError) {
    return <EmptyPage />;
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <ConfigProvider
          theme={{
            components: {
              Tabs: {
                itemColor: "#fff",
                itemActiveColor: "#000",
                itemHoverColor: "#aa846f",
                itemSelectedColor: "#000",
                cardBg: primaryColor,
              },
            },
          }}
        >
          <ProCard
            title={
              <Typography.Text style={{ fontSize: "18px" }}>
                <AppstoreOutlined /> Tables
              </Typography.Text>
            }
            bordered
            boxShadow
          >
            <LoadingTabs />
            <LoadingTabContent />
          </ProCard>
        </ConfigProvider>
      );
    }

    const allTabItems = generateTabItems();

    // Final safety check - ensure we have a valid active tab
    const safeActiveTabId = allTabItems.some(item => item.key === activeTabId)
      ? activeTabId
      : DEFAULT_TAB;

    return (
      <ConfigProvider
        theme={{
          components: {
            Tabs: {
              itemColor: "#fff",
              itemActiveColor: "#000",
              itemHoverColor: "#aa846f",
              itemSelectedColor: "#000",
              cardBg: primaryColor,
            },
          },
        }}
      >
        <ProCard
          title={
            <Typography.Text style={{ fontSize: "18px" }}>
              <AppstoreOutlined /> Tables
            </Typography.Text>
          }
          tabs={{
            type: "card",
            items: allTabItems,
            onChange: handleTabChange,
            activeKey: safeActiveTabId,
            destroyInactiveTabPane: false,
          }}
          bordered
          boxShadow
        />
      </ConfigProvider>
    );
  };

  return (
    <>
      {renderContent()}
      {selectedProductId && (
        <StaffModal setOpen={setOpen} open={open} tbl={selectedProductId} />
      )}
    </>
  );
}