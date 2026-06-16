import {
  AppstoreOutlined,
  HolderOutlined,
  PlusOutlined,
  MenuOutlined,
  TableOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import SuccesssModal from "@components/MODALS/SuccessModal";
import TableCard from "@components/TableCard/TableCard";
import StaffModal from "@components/staffCard/LoginModal";
import { fetchTableUsequery } from "@services/tables";
import { useQuery } from "@tanstack/react-query";
import {
  ConfigProvider,
  Skeleton,
  Typography,
  Button,
  Spin,
  Space,
  Drawer,
  Empty,
} from "antd";
import Lottie from "lottie-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAppSelector } from "src/store";
import fssanimation from "../../components/Loaders/tables.json";
import EmptyPage from "@routes/EmptyPage";
import { useNavigate } from "react-router-dom";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { usePOSMode } from "@context/POSModeContext";
import HospitalPage from "@pages/Hospital/HospitalPage";
import HotelPage from "@pages/Hotel/HotelPage";
import React from "react";

const { Text, Title } = Typography;

// ── Mobile detection ──────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

// ── Skeletons ─────────────────────────────────────────────────────────────────
const TableSkeleton = () => (
  <Skeleton.Image active style={{ width: "100%", height: 100, borderRadius: 8 }} />
);

const LoadingTabContent = ({ isMobile }: { isMobile: boolean }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: isMobile
        ? "repeat(auto-fill, minmax(140px, 1fr))"
        : "repeat(auto-fill, minmax(300px, 1fr))",
      gap: isMobile ? 8 : 12,
      padding: isMobile ? 12 : 20,
      height: isMobile ? "auto" : "calc(100vh - 280px)",
      overflowY: "auto",
    }}
  >
    {[...Array(isMobile ? 6 : 4)].map((_, i) => (
      <TableSkeleton key={i} />
    ))}
  </div>
);

const LoadingTabs = () => (
  <div style={{ padding: "12px 0" }}>
    <Space size={12}>
      {[...Array(4)].map((_, i) => (
        <Skeleton.Button key={i} active style={{ width: 90, borderRadius: 6 }} />
      ))}
    </Space>
  </div>
);

// ── Mobile slot selector ──────────────────────────────────────────────────────
interface SlotSelectorProps {
  tabs: any[];
  activeKey: string;
  onChange: (key: string) => void;
  primaryColor: string;
  loading: boolean;
}

const MobileSlotSelector: React.FC<SlotSelectorProps> = ({
  tabs, activeKey, onChange, primaryColor, loading,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeTab = tabs.find((t) => t.key === activeKey);
  const slots = tabs.filter((t) => t.key !== "overview");

  return (
    <>
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        <Space size={8}>
          <div
            style={{
              background: `${primaryColor}15`,
              borderRadius: 7,
              padding: "5px 6px",
              color: primaryColor,
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            {activeKey === "overview" ? <AppstoreOutlined /> : <HolderOutlined />}
          </div>
          <div>
            <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Active Slot</Text>
            <Text strong style={{ fontSize: 13, color: "#0f172a" }}>
              {activeKey === "overview" ? "Overview" : activeTab?.label?.props?.children?.[1] || "Select Slot"}
            </Text>
          </div>
        </Space>
        <Button
          size="small"
          icon={<MenuOutlined />}
          onClick={() => setDrawerOpen(true)}
          style={{
            borderRadius: 7,
            background: `${primaryColor}10`,
            border: `1px solid ${primaryColor}30`,
            color: primaryColor,
            fontWeight: 500,
            fontSize: 12,
          }}
        >
          {loading ? "Loading…" : `${slots.length} Slots`}
        </Button>
      </div>

      <Drawer
        title={
          <Space size={8}>
            <div
              style={{
                background: `${primaryColor}15`,
                borderRadius: 7,
                padding: "5px 7px",
                color: primaryColor,
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              <TableOutlined />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Staff Slots</div>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>
                Select a slot to view its customer tables
              </div>
            </div>
          </Space>
        }
        placement="bottom"
        height="auto"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{
          body: { padding: "8px 0 24px" },
          header: { borderBottom: "1px solid #f1f5f9", padding: "16px 16px 12px" },
        }}
      >
        <div
          onClick={() => { onChange("overview"); setDrawerOpen(false); }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", margin: "0 8px 4px", borderRadius: 10,
            background: activeKey === "overview" ? `${primaryColor}10` : "transparent",
            border: activeKey === "overview" ? `1px solid ${primaryColor}30` : "1px solid transparent",
            cursor: "pointer",
          }}
        >
          <Space size={10}>
            <div
              style={{
                background: activeKey === "overview" ? `${primaryColor}20` : "#f1f5f9",
                borderRadius: 7, padding: "5px 6px",
                color: activeKey === "overview" ? primaryColor : "#64748b",
                fontSize: 14, lineHeight: 1,
              }}
            >
              <AppstoreOutlined />
            </div>
            <Text
              strong={activeKey === "overview"}
              style={{ fontSize: 14, color: activeKey === "overview" ? primaryColor : "#374151" }}
            >
              Overview
            </Text>
          </Space>
          {activeKey === "overview" && (
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: primaryColor }} />
          )}
        </div>

        {loading ? (
          <div style={{ padding: "16px" }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton.Button key={i} active block style={{ marginBottom: 8, height: 48, borderRadius: 10 }} />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <Empty description="No slots configured" style={{ padding: "24px 0" }} />
        ) : (
          slots.map((slot) => {
            const isActive = activeKey === slot.key;
            return (
              <div
                key={slot.key}
                onClick={() => { onChange(slot.key); setDrawerOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", margin: "0 8px 4px", borderRadius: 10,
                  background: isActive ? `${primaryColor}10` : "transparent",
                  border: isActive ? `1px solid ${primaryColor}30` : "1px solid transparent",
                  cursor: "pointer", transition: "all 0.15s ease",
                }}
              >
                <Space size={10}>
                  <div
                    style={{
                      background: isActive ? `${primaryColor}20` : "#f1f5f9",
                      borderRadius: 7, padding: "5px 6px",
                      color: isActive ? primaryColor : "#64748b",
                      fontSize: 14, lineHeight: 1,
                    }}
                  >
                    <HolderOutlined />
                  </div>
                  <Text
                    strong={isActive}
                    style={{ fontSize: 14, color: isActive ? primaryColor : "#374151" }}
                  >
                    {slot.label?.props?.children?.[1] || `Slot ${slot.key}`}
                  </Text>
                </Space>
                <Space size={8}>
                  {isActive && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: primaryColor }} />
                  )}
                  <RightOutlined style={{ fontSize: 10, color: "#94a3b8" }} />
                </Space>
              </div>
            );
          })
        )}
      </Drawer>
    </>
  );
};

// ── Mobile table grid ─────────────────────────────────────────────────────────
const MobileTableGrid: React.FC<{ children: React.ReactNode; empty?: boolean }> = ({ children, empty }) => {
  if (empty) return <EmptyPage />;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 8,
        padding: "8px 0",
      }}
    >
      {children}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export default function TablePro() {
  const [open, setOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [isBackgroundBlurred, setIsBackgroundBlurred] = useState(false);

  const { user } = useAppSelector((state) => state.auth);
  const { openModal: successmodal, loading } = useAppSelector((state) => state.order);
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const { isRetailMode, isHospitalMode, isHotelMode, isModeLoading } = usePOSMode();
  const isMobile = useIsMobile();

  const storedCode = localStorage.getItem("companyCode");

  const DEFAULT_TAB = "overview";
  const STORAGE_KEY = "activeTableTabId";
  const VISIT_KEY = "hasVisitedTablesBefore";

  const [activeTabId, setActiveTabId] = useState(DEFAULT_TAB);

  const setValidActiveTab = useCallback((tabId: any) => {
    const validTabId =
      tabId && tabId !== "undefined" && tabId !== "null" && String(tabId).trim() !== ""
        ? tabId
        : DEFAULT_TAB;
    setActiveTabId(validTabId);
    localStorage.setItem(STORAGE_KEY, validTabId);
    return validTabId;
  }, []);

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

  const queryKey = useMemo(
    () => (activeTabId === DEFAULT_TAB ? ["tables", "overview"] : ["tables", activeTabId]),
    [activeTabId]
  );

  const handleOpen = useCallback((productId: any) => {
    setOpen(true);
    setSelectedProductId(productId);
  }, []);

  const handleTabChange = useCallback(
    (key: any) => {
      if (key && key !== "undefined" && key !== "null" && String(key).trim() !== "") {
        setValidActiveTab(key);
      } else {
        setValidActiveTab(DEFAULT_TAB);
      }
    },
    [setValidActiveTab]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => {
      if (storedCode) return fetchTableUsequery({ id: activeTabId });
      return [];
    },
    networkMode: "always",
    enabled: !!storedCode && !isRetailMode && !isHospitalMode && !isModeLoading,
    retry: 2,
    retryDelay: 1000,
  });

  // ── Overview tab content ──────────────────────────────────────────────────
  const overviewContent = (
    <div
      style={{
        height: isMobile ? "auto" : "calc(100vh - 280px)",
        minHeight: isMobile ? 240 : undefined,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f8fafc", borderRadius: 10,
        padding: isMobile ? "32px 16px" : 20,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <div
          style={{
            background: `${primaryColor}15`, borderRadius: "50%",
            width: 72, height: 72,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <AppstoreOutlined style={{ fontSize: 32, color: primaryColor }} />
        </div>
        <Title level={isMobile ? 5 : 4} style={{ color: "#0f172a", marginBottom: 6 }}>
          Slots Management
        </Title>
        <Text style={{ fontSize: 13, color: "#64748b", display: "block", marginBottom: 20 }}>
          {isMobile
            ? "Tap a slot from the selector above to view its customer tables."
            : "Select a staff slot from the tabs above to view its customer tables."}
        </Text>
        <Button
          type="primary"
          onClick={() => navigate("/table-settings")}
          icon={<PlusOutlined />}
          disabled={user?.role !== "admin" && user?.role !== "cashier"}
          style={{
            backgroundColor: primaryColor,
            borderColor: primaryColor,
            borderRadius: 8,
            fontWeight: 500,
          }}
        >
          Add New Slot
        </Button>
      </div>
    </div>
  );

  // ── Tab items ─────────────────────────────────────────────────────────────
  const generateTabItems = useMemo(() => {
    const dynamicTabs =
      data?.map((item: any) => ({
        key: `${item._id}`,
        tab: "Table",
        label: (
          <Space size={4}>
            <HolderOutlined />
            {item.name || "Unnamed"}
          </Space>
        ),
        children:
          item?.tables && item.tables.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(auto-fill, minmax(140px, 1fr))"
                  : "repeat(auto-fill, minmax(280px, 1fr))",
                gap: isMobile ? 8 : 16,
                padding: isMobile ? "8px 0" : "16px 0",
                height: isMobile ? "auto" : "calc(100vh - 280px)",
                overflowY: isMobile ? "visible" : "auto",
                alignItems: "start",
              }}
            >
              {item.tables.map((T: any) => {
                console.log(`🔍 [TablePro] Passing to TableCard: ${T.name}, isLocked=${T.isLocked}`);
                return <TableCard key={T._id} item={T} openModal={handleOpen} />;
              })}
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
          <Space size={4}>
            <AppstoreOutlined />
            Overview
          </Space>
        ),
        children: overviewContent,
      },
      ...dynamicTabs,
    ];
  }, [data, primaryColor, user?.role, navigate, isMobile, handleOpen]);

  useEffect(() => {
    if (!isLoading && data) {
      const tabKeys = generateTabItems.map((item: any) => item.key);
      if (!tabKeys.includes(activeTabId)) setValidActiveTab(DEFAULT_TAB);
    }
  }, [data, isLoading, activeTabId, generateTabItems]);

  const safeActiveTabId = generateTabItems.some((item: any) => item.key === activeTabId)
    ? activeTabId
    : DEFAULT_TAB;

  const activeTabContent = generateTabItems.find((t: any) => t.key === safeActiveTabId)?.children;

  // ── Early returns ─────────────────────────────────────────────────────────
  if (successmodal) return <SuccesssModal />;

  if (loading) {
    return (
      <div style={{ display: "grid", placeContent: "center", marginTop: 80 }}>
        <Lottie animationData={fssanimation} loop={true} height={20} width={20} />
      </div>
    );
  }

  if (isModeLoading) {
    return (
      <div style={{ display: "grid", placeContent: "center", height: "60vh" }}>
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  if (isError) return <EmptyPage />;

  // ── Hotel mode ────────────────────────────────────────────────────────────
  if (isHotelMode) {
    return (
      <>
        <HotelPage />
        {selectedProductId && (
          <StaffModal setOpen={setOpen} open={open} tbl={selectedProductId} showButton={true} />
        )}
      </>
    );
  }

  // ── Hospital mode ─────────────────────────────────────────────────────────
  if (isHospitalMode) {
    return (
      <>
        <HospitalPage />
        {selectedProductId && (
          <StaffModal setOpen={setOpen} open={open} tbl={selectedProductId} showButton={true} />
        )}
      </>
    );
  }

  // ── Retail mode ───────────────────────────────────────────────────────────
  if (isRetailMode) {
    return (
      <>
        <HospitalPage mode="retail" />
        {selectedProductId && (
          <StaffModal setOpen={setOpen} open={open} tbl={selectedProductId} showButton={true} />
        )}
      </>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <style>{`
          .table-pro-mobile { padding: 0; }
          .table-pro-mobile .ant-pro-card { border-radius: 0 !important; }
        `}</style>

        <div style={{ padding: "0 0 80px" }}>
          <div style={{ marginBottom: 12 }}>
            <Space align="center" size={8}>
              <div
                style={{
                  background: `${primaryColor}15`, borderRadius: 9,
                  padding: "7px 8px", color: primaryColor, fontSize: 16, lineHeight: 1,
                }}
              >
                <AppstoreOutlined />
              </div>
              <div>
                <Text strong style={{ fontSize: 15, color: "#0f172a", display: "block" }}>Tables</Text>
                <Text style={{ fontSize: 11, color: "#94a3b8" }}>Manage customer slots</Text>
              </div>
            </Space>
          </div>

          <MobileSlotSelector
            tabs={generateTabItems}
            activeKey={safeActiveTabId}
            onChange={handleTabChange}
            primaryColor={primaryColor}
            loading={isLoading}
          />

          <div style={{ minHeight: 200 }}>
            {isLoading ? <LoadingTabContent isMobile={true} /> : activeTabContent}
          </div>
        </div>

        {selectedProductId && (
          <StaffModal setOpen={setOpen} open={open} tbl={selectedProductId} showButton={true} />
        )}
      </>
    );
  }

  // ── Desktop layout ────────────────────────────────────────────────────────
  const cardTitle = (
    <Space size={8} align="center">
      <div
        style={{
          background: `${primaryColor}15`, borderRadius: 8,
          padding: "6px 7px", color: primaryColor, fontSize: 16, lineHeight: 1,
        }}
      >
        <AppstoreOutlined />
      </div>
      <Text strong style={{ fontSize: 15, color: "#0f172a" }}>Tables</Text>
    </Space>
  );

  return (
    <>
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
        {isLoading ? (
          <ProCard title={cardTitle} bordered boxShadow style={{ borderRadius: 12 }}>
            <LoadingTabs />
            <LoadingTabContent isMobile={false} />
          </ProCard>
        ) : (
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
            style={{ borderRadius: 12 }}
          />
        )}
      </ConfigProvider>

      {selectedProductId && (
        <StaffModal setOpen={setOpen} open={open} tbl={selectedProductId} showButton={true} />
      )}
    </>
  );
}