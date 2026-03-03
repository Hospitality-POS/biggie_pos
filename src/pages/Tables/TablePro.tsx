import { AppstoreOutlined, HolderOutlined, PlusOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import SuccesssModal from "@components/MODALS/SuccessModal";
import TableCard from "@components/TableCard/TableCard";
import StaffModal from "@components/staffCard/LoginModal";
import { fetchTableUsequery } from "@services/tables";
import { useQuery } from "@tanstack/react-query";
import { ConfigProvider, Skeleton, Typography, Result, Button, Spin } from "antd";
import { Space } from "antd/lib";
import Lottie from "lottie-react";
import { useState, useEffect, useMemo } from "react";
import { useAppSelector } from "src/store";
import fssanimation from "../../components/Loaders/tables.json";
import EmptyPage from "@routes/EmptyPage";
import { useNavigate } from "react-router-dom";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { usePOSMode } from "@context/POSModeContext";
import RestaurantPage from "@pages/Restaurant/Restuarant";

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
  const [isBackgroundBlurred, setIsBackgroundBlurred] = useState(false);

  const { user } = useAppSelector((state) => state.auth);
  const { openModal: successmodal, loading } = useAppSelector((state) => state.order);
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const { isRetailMode, isModeLoading } = usePOSMode();  // ← isModeLoading

  const storedCode = localStorage.getItem("companyCode");

  const DEFAULT_TAB = "overview";
  const STORAGE_KEY = "activeTableTabId";
  const VISIT_KEY = "hasVisitedTablesBefore";

  const [activeTabId, setActiveTabId] = useState(DEFAULT_TAB);

  const setValidActiveTab = (tabId) => {
    const validTabId =
      tabId && tabId !== "undefined" && tabId !== "null" && tabId.trim() !== ""
        ? tabId
        : DEFAULT_TAB;
    setActiveTabId(validTabId);
    localStorage.setItem(STORAGE_KEY, validTabId);
    return validTabId;
  };

  useEffect(() => {
    const isFirstVisit = localStorage.getItem(VISIT_KEY) !== "true";
    if (isFirstVisit) {
      localStorage.setItem(VISIT_KEY, "true");
      setValidActiveTab(DEFAULT_TAB);
    } else {
      const savedTabId = localStorage.getItem(STORAGE_KEY);
      setValidActiveTab(savedTabId);
    }
  }, []);

  useEffect(() => {
    if (!storedCode) {
      setIsBackgroundBlurred(true);
      setOpen(true);
      setSelectedProductId(null);
    }
  }, [storedCode]);

  const queryKey = useMemo(() => {
    return activeTabId === DEFAULT_TAB
      ? ["tables", "overview"]
      : ["tables", activeTabId];
  }, [activeTabId, DEFAULT_TAB]);

  const handleOpen = (productId) => {
    setOpen(true);
    setSelectedProductId(productId);
  };

  const handleTabChange = (key) => {
    if (key && key !== "undefined" && key !== "null" && key.trim() !== "") {
      setValidActiveTab(key);
    } else {
      setValidActiveTab(DEFAULT_TAB);
    }
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: () => {
      if (storedCode) {
        return fetchTableUsequery({ id: activeTabId });
      }
      return [];
    },
    networkMode: "always",
    enabled: !!storedCode && !isRetailMode && !isModeLoading,  // ← wait for mode
    retry: 2,
    retryDelay: 1000,
  });

  const generateTabItems = useMemo(() => {
    const dynamicTabs =
      data?.map((item) => ({
        key: `${item._id}`,
        tab: "Table",
        label: (
          <Space>
            <HolderOutlined />
            {item.name || "Unnamed Table"}
          </Space>
        ),
        children:
          item?.tables && item?.tables.length > 0 ? (
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
        children: (
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
              icon={<AppstoreOutlined style={{ fontSize: "64px", color: primaryColor }} />}
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
        ),
      },
      ...dynamicTabs,
    ];
  }, [data, primaryColor, user?.role, navigate]);

  useEffect(() => {
    if (!isLoading && data) {
      const tabKeys = generateTabItems.map((item) => item.key);
      if (!tabKeys.includes(activeTabId)) {
        setValidActiveTab(DEFAULT_TAB);
      }
    }
  }, [data, isLoading, activeTabId, generateTabItems]);

  // ─── Early returns ──────────────────────────────────────────────────────────
  if (successmodal) return <SuccesssModal />;

  if (loading) {
    return (
      <div style={{ display: "grid", placeContent: "center", marginTop: "80px" }}>
        <Lottie animationData={fssanimation} loop={true} height={20} width={20} />
      </div>
    );
  }

  // ─── Wait for shop mode to load from server ─────────────────────────────────
  if (isModeLoading) {
    return (
      <div style={{ display: "grid", placeContent: "center", height: "60vh" }}>
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  if (isError) return <EmptyPage />;

  // ─── Retail mode ────────────────────────────────────────────────────────────
  if (isRetailMode) {
    return (
      <>
        <RestaurantPage />
        {selectedProductId && (
          <StaffModal setOpen={setOpen} open={open} tbl={selectedProductId} />
        )}
      </>
    );
  }

  // ─── Restaurant mode ─────────────────────────────────────────────────────────
  const safeActiveTabId = generateTabItems.some((item) => item.key === activeTabId)
    ? activeTabId
    : DEFAULT_TAB;

  const cardTitle = (
    <Typography.Text style={{ fontSize: "18px" }}>
      <AppstoreOutlined /> Tables
    </Typography.Text>
  );

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
          <ProCard title={cardTitle} bordered boxShadow>
            <LoadingTabs />
            <LoadingTabContent />
          </ProCard>
        </ConfigProvider>
      );
    }

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
          title={cardTitle}
          tabs={{
            type: "card",
            items: generateTabItems,
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