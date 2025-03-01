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
  // Initialize the activeTabId from localStorage, falling back to "overview" if not found
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const savedTabId = localStorage.getItem("activeTableTabId");
    return savedTabId || "overview";
  });
  const [isBackgroundBlurred, setIsBackgroundBlurred] = useState(false);
  const { openModal: successmodal, loading } = useAppSelector(
    (state) => state.order
  );

  const navigate = useNavigate();

  const storedCode = localStorage.getItem("companyCode");
  console.log('nice', storedCode);

  // Show login modal and blur background if companyCode is not present
  useEffect(() => {
    if (!storedCode) {
      // console.log('nice e', storedCode);
      setIsBackgroundBlurred(true);
      setOpen(true); // Open the login modal
      setSelectedProductId('undefined'); // Ensure it's null to open modal without a specific product
    }
  }, [storedCode]);

  useEffect(() => {
    console.log('open state:', open);
  }, [open]);

  // Save the activeTabId to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("activeTableTabId", activeTabId);
  }, [activeTabId]);

  const handleOpen = (productId: React.SetStateAction<null>) => {
    setOpen(true);
    setSelectedProductId(productId);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tables", activeTabId],
    queryFn: () => {
      // Only fetch if storedCode is not undefined
      if (storedCode) {
        return fetchTableUsequery({ id: activeTabId });
      }
      return []; // Return empty array if no storedCode
    },
    networkMode: "always",
    enabled: !!storedCode, // Disable query if storedCode is undefined
  });

  useEffect(() => {
    if (data && data.length > 0 && activeTabId === "overview") {
      // Only set the activeTabId if we're on the overview and data is available
      const savedTabId = localStorage.getItem("activeTableTabId");
      if (savedTabId && savedTabId !== "overview") {
        // Check if saved tab exists in the data
        const tabExists = data.some((item) => item._id === savedTabId);
        if (tabExists) {
          setActiveTabId(savedTabId);
        } else {
          setActiveTabId(data[0]._id);
        }
      } else {
        setActiveTabId(data[0]._id);
      }
    }
  }, [data, activeTabId]);

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
          <AppstoreOutlined style={{ fontSize: "64px", color: "#6c1c2c" }} />
        }
        title="Welcome to Slots Management"
        subTitle="Please select a staff slot from above to view its Customer Slots"
        extra={[
          <Button
            type="primary"
            onClick={() => navigate("/table-settings")}
            style={{ backgroundColor: "#6c1c2c" }}
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
    (item: { _id: string; name: string; tables?: any[] }) => ({
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
                cardBg: "#6c1c2c",
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
              cardBg: "#6c1c2c",
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
            onChange: (key) => setActiveTabId(key),
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