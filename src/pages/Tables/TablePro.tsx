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
import React, { useState, useEffect, useRef } from "react";
import { useAppSelector } from "src/store";
import fssanimation from "../../components/Loaders/fss loader.json";
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

  // Initialize with overview - always default to overview tab
  const [activeTabId, setActiveTabId] = useState("overview");

  // Get tenant primary color on component mount
  useEffect(() => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.primary_color) {
      setPrimaryColor(tenant.primary_color);
    }
  }, []);

  // Simplified tab management logic - single useEffect for tab management
  useEffect(() => {
    const isFirstVisit = localStorage.getItem("hasVisitedTablesBefore") !== "true";

    // Mark as visited for future visits
    if (isFirstVisit) {
      localStorage.setItem("hasVisitedTablesBefore", "true");
      // For first visit, always ensure overview tab is selected
      setActiveTabId("overview");
      localStorage.setItem("activeTableTabId", "overview");
    } else {
      // For returning visits, try to restore previous tab
      const savedTabId = localStorage.getItem("activeTableTabId");

      // Important: Default to "overview" if saved tab is null/undefined/empty
      if (savedTabId && savedTabId !== "undefined" && savedTabId !== "") {
        setActiveTabId(savedTabId);
      } else {
        // Ensure overview is selected and saved if we don't have a valid saved tab
        setActiveTabId("overview");
        localStorage.setItem("activeTableTabId", "overview");
      }
    }
  }, []);

  // Show login modal and blur background if companyCode is not present
  useEffect(() => {
    if (!storedCode) {
      setIsBackgroundBlurred(true);
      setOpen(true); // Open the login modal
      setSelectedProductId(null);
    }
  }, [storedCode]);

  // Save the activeTabId to localStorage whenever it changes
  useEffect(() => {
    // Only save valid non-empty tab IDs
    if (activeTabId && activeTabId !== "undefined" && activeTabId !== "") {
      localStorage.setItem("activeTableTabId", activeTabId);
    }
  }, [activeTabId]);

  const handleOpen = (productId) => {
    setOpen(true);
    setSelectedProductId(productId);
  };

  // IMPORTANT: Take 'activeTabId' out of the queryKey to prevent re-fetches
  // unless we really want to fetch for a specific table
  const queryKey = activeTabId === "overview"
    ? ["tables", "overview"]
    : ["tables", activeTabId];

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKey,
    queryFn: () => {
      if (storedCode) {
        return fetchTableUsequery({ id: activeTabId });
      }
      return []; // Return empty array if no storedCode
    },
    networkMode: "always",
    enabled: !!storedCode, // Disable query if storedCode is undefined
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
          >
            Add New Slot
          </Button>,
        ]}
      />
    </div>
  );

  const tabsItems = data?.map(
    (item) => ({
      key: `${item._id}`,
      tab: "Table",
      label: (
        <Space>
          <HolderOutlined />
          {item.name}
        </Space>
      ),
      children: [
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
            {item.tables.length > 0 ? (
              item.tables.map((T) => (
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
              ))
            ) : (
              <EmptyPage />
            )}
          </div>
        ) : (
          <EmptyPage />
        ),
      ],
    })
  );

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

    // Always ensure the overview tab is included first
    const allTabItems = [
      {
        key: "overview",
        tab: "Overview",
        label: (
          <Space>
            <AppstoreOutlined />
            Overview
          </Space>
        ),
        children: <DefaultView />,
      },
      ...(tabsItems || []),
    ];

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
            onChange: (key) => {
              // Set new active tab when user selects a different tab
              setActiveTabId(key);
            },
            activeKey: activeTabId,
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