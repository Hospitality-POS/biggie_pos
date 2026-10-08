import {
  AppstoreOutlined,
  AimOutlined,
  HolderOutlined,
  LoadingOutlined,
  PlusOutlined,
  MenuOutlined,
  TableOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import SuccesssModal from "@components/MODALS/SuccessModal";
import TableCard from "@components/TableCard/TableCard";
import StaffModal from "@components/staffCard/LoginModal";
import { fetchTableUsequery, addNewTable } from "@services/tables";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from "react";
import { useAppSelector } from "src/store";
import fssanimation from "../../components/Loaders/tables.json";
import EmptyPage from "@routes/EmptyPage";
import { useNavigate } from "react-router-dom";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { usePOSMode } from "@context/POSModeContext";
import QuickAddTableModal from "@components/MODALS/pro/QuickAddTableModal";

const HospitalPage = lazy(() => import("@pages/Hospital/HospitalPage"));
const HotelPage = lazy(() => import("@pages/Hotel/HotelPage"));

const { Text, Title } = Typography;

// Key for the trailing "+ New Location" pseudo-tab in the locations tab bar
const ADD_LOCATION_TAB = "__add_location__";

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

// ── "Add table" tile rendered inside each location's grid ────────────────────
const AddTableTile: React.FC<{
  onClick: () => void;
  primaryColor: string;
  isMobile: boolean;
  loading?: boolean;
}> = ({ onClick, primaryColor, isMobile, loading }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    style={{
      minHeight: isMobile ? 96 : 120,
      borderRadius: 10,
      border: `1.5px dashed ${primaryColor}55`,
      background: `${primaryColor}08`,
      color: primaryColor,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      cursor: loading ? "wait" : "pointer",
      fontWeight: 600,
      fontSize: isMobile ? 12 : 13,
      transition: "all 0.15s ease",
      opacity: loading ? 0.7 : 1,
    }}
  >
    {loading ? (
      <LoadingOutlined style={{ fontSize: 18 }} />
    ) : (
      <PlusOutlined style={{ fontSize: 18 }} />
    )}
    Add Table
  </button>
);

// ── Mobile slot selector ──────────────────────────────────────────────────────
interface SlotSelectorProps {
  tabs: any[];
  activeKey: string;
  onChange: (key: string) => void;
  primaryColor: string;
  loading: boolean;
  onAddLocation?: () => void;
}

const MobileSlotSelector: React.FC<SlotSelectorProps> = ({
  tabs, activeKey, onChange, primaryColor, loading, onAddLocation,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeTab = tabs.find((t) => t.key === activeKey);
  const slots = tabs.filter((t) => t.key !== "overview" && t.key !== ADD_LOCATION_TAB);

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

        {onAddLocation && (
          <div
            onClick={() => { setDrawerOpen(false); onAddLocation(); }}
            style={{
              display: "flex", alignItems: "center",
              padding: "12px 16px", margin: "4px 8px 0", borderRadius: 10,
              border: `1.5px dashed ${primaryColor}55`,
              background: `${primaryColor}08`,
              color: primaryColor,
              cursor: "pointer", transition: "all 0.15s ease",
            }}
          >
            <Space size={10}>
              <div
                style={{
                  background: `${primaryColor}20`,
                  borderRadius: 7, padding: "5px 6px",
                  color: primaryColor,
                  fontSize: 14, lineHeight: 1,
                }}
              >
                <PlusOutlined />
              </div>
              <Text strong style={{ fontSize: 14, color: primaryColor }}>
                New Location
              </Text>
            </Space>
          </div>
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
  const [quickAdd, setQuickAdd] = useState<{
    mode: "table" | "location";
    locationId?: string;
    locationName?: string;
  } | null>(null);
  const [addingTableFor, setAddingTableFor] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { user } = useAppSelector((state) => state.auth);
  const { openModal: successmodal, loading } = useAppSelector((state) => state.order);
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const { isRetailMode, isHospitalMode, isHotelMode, isModeLoading } = usePOSMode();
  const isMobile = useIsMobile();
  const canManageSlots = user?.role === "admin" || user?.role === "cashier" || user?.role === "waiter";

  const storedCode = localStorage.getItem("companyCode");

  const DEFAULT_TAB = "overview";
  const STORAGE_KEY = "activeTableTabId";
  const VISIT_KEY = "hasVisitedTablesBefore";

  const [activeTabId, setActiveTabId] = useState(() => {
    const isFirstVisit = localStorage.getItem(VISIT_KEY) !== "true";
    if (isFirstVisit) {
      localStorage.setItem(VISIT_KEY, "true");
      return DEFAULT_TAB;
    }
    const savedTabId = localStorage.getItem(STORAGE_KEY);
    return savedTabId && savedTabId !== "undefined" && savedTabId !== "null" && String(savedTabId).trim() !== ""
      ? savedTabId
      : DEFAULT_TAB;
  });

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
    if (!storedCode) {
      setIsBackgroundBlurred(true);
      setOpen(true);
      setSelectedProductId(null);
    }
  }, [storedCode]);

  // Keyed by user — the fetcher applies per-user privacy filtering, so the
  // cache entry must not be shared between logins.
  const currentUserKey = (user as any)?._id || user?.id || "anon";
  const queryKey = useMemo(
    () => ["tables", currentUserKey, activeTabId === DEFAULT_TAB ? "overview" : activeTabId],
    [activeTabId, currentUserKey]
  );

  const handleOpen = useCallback((productId: any) => {
    setOpen(true);
    setSelectedProductId(productId);
  }, []);

  const handleTabChange = useCallback(
    (key: any) => {
      // The trailing "+ New Location" pseudo-tab opens the quick-add modal
      // instead of becoming the active tab.
      if (key === ADD_LOCATION_TAB) {
        setQuickAdd({ mode: "location" });
        return;
      }
      if (key && key !== "undefined" && key !== "null" && String(key).trim() !== "") {
        setValidActiveTab(key);
      } else {
        setValidActiveTab(DEFAULT_TAB);
      }
    },
    [setValidActiveTab]
  );

  // Instant add: derive the next table name from the location's naming
  // pattern (last "L7" → "L8", "Table 12" → "Table 13") and create it
  // without opening a modal. Falls back to the name-only modal when the
  // location has no numeric-suffixed table names to follow.
  const handleInstantAddTable = useCallback(
    async (location: any) => {
      const tables = (location?.tables || []).filter((T: any) => !T.isDisabled);

      // Pattern from the LAST numbered table; number = max for that prefix
      let prefix: string | null = null;
      let width = 0;
      for (let i = tables.length - 1; i >= 0 && prefix === null; i--) {
        const m = String(tables[i]?.name ?? "").match(/^(.*?)(\d+)$/);
        if (m) {
          prefix = m[1];
          width = m[2].length;
        }
      }
      if (prefix === null) {
        setQuickAdd({ mode: "table", locationId: location._id, locationName: location.name });
        return;
      }

      let max = 0;
      for (const T of tables) {
        const m = String(T?.name ?? "").match(/^(.*?)(\d+)$/);
        if (m && m[1] === prefix) max = Math.max(max, parseInt(m[2], 10));
      }
      const nextName = `${prefix}${String(max + 1).padStart(width, "0")}`;

      setAddingTableFor(location._id);
      try {
        await addNewTable({ name: nextName, locatedAt: location._id });
        queryClient.invalidateQueries({ queryKey: ["tables"] });
        setValidActiveTab(location._id);
      } catch {
        // service already surfaces an error message
      } finally {
        setAddingTableFor(null);
      }
    },
    [queryClient, setValidActiveTab]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => {
      if (storedCode) return fetchTableUsequery({ id: activeTabId });
      return [];
    },
    networkMode: "always",
    enabled: !!storedCode && !isRetailMode && !isHospitalMode && !isModeLoading,
    staleTime: 30 * 1000,
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
        <Space size={8} wrap>
          <Button
            type="primary"
            onClick={() => setQuickAdd({ mode: "table" })}
            icon={<PlusOutlined />}
            disabled={!canManageSlots}
            style={{
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              borderRadius: 8,
              fontWeight: 500,
            }}
          >
            Quick Add Table
          </Button>
          <Button
            onClick={() => setQuickAdd({ mode: "location" })}
            icon={<AimOutlined />}
            disabled={!canManageSlots}
            style={{ borderRadius: 8, fontWeight: 500 }}
          >
            New Location
          </Button>
          {(user?.role === "admin" || user?.role === "cashier") && (
            <Button
              onClick={() => navigate("/table-settings")}
              style={{ borderRadius: 8, fontWeight: 500 }}
            >
              Slot Settings
            </Button>
          )}
        </Space>
      </div>
    </div>
  );

  // ── Tab items ─────────────────────────────────────────────────────────────
  const generateTabItems = useMemo(() => {
    const dynamicTabs =
      data?.filter((item: any) => !item.isDisabled)?.map((item: any) => ({
        key: `${item._id}`,
        tab: "Table",
        label: (
          <Space size={4}>
            <HolderOutlined />
            {item.name || "Unnamed"}
          </Space>
        ),
        children: (() => {
          const tables = (item?.tables || []).filter((T: any) => !T.isDisabled);
          if (!tables.length && !canManageSlots) return <EmptyPage />;
          return (
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
              {tables.map((T: any) => {
                console.log(`🔍 [TablePro] Passing to TableCard: ${T.name}, isLocked=${T.isLocked}`);
                return <TableCard key={T._id} item={T} openModal={handleOpen} />;
              })}
              {canManageSlots && (
                <AddTableTile
                  isMobile={isMobile}
                  primaryColor={primaryColor}
                  loading={addingTableFor === item._id}
                  onClick={() => handleInstantAddTable(item)}
                />
              )}
            </div>
          );
        })(),
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
      // Trailing "+ New Location" pseudo-tab — opens the quick-add modal,
      // it never becomes the active tab (intercepted in handleTabChange)
      ...(canManageSlots
        ? [
            {
              key: ADD_LOCATION_TAB,
              tab: "add",
              label: (
                <Space size={4}>
                  <PlusOutlined />
                  New Location
                </Space>
              ),
              children: null,
            },
          ]
        : []),
    ];
  }, [data, primaryColor, user?.role, navigate, isMobile, handleOpen, canManageSlots, addingTableFor, handleInstantAddTable]);

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
      <Suspense
        fallback={
          <div style={{ display: "grid", placeContent: "center", height: "60vh" }}>
            <Spin size="large" tip="Loading Hotel Mode..." />
          </div>
        }
      >
        <HotelPage />
        {selectedProductId && (
          <StaffModal setOpen={setOpen} open={open} tbl={selectedProductId} showButton={true} />
        )}
      </Suspense>
    );
  }

  // ── Hospital mode ─────────────────────────────────────────────────────────
  if (isHospitalMode) {
    return (
      <Suspense
        fallback={
          <div style={{ display: "grid", placeContent: "center", height: "60vh" }}>
            <Spin size="large" tip="Loading Hospital Mode..." />
          </div>
        }
      >
        <HospitalPage />
        {selectedProductId && (
          <StaffModal setOpen={setOpen} open={open} tbl={selectedProductId} showButton={true} />
        )}
      </Suspense>
    );
  }

  // ── Retail mode ───────────────────────────────────────────────────────────
  if (isRetailMode) {
    return (
      <Suspense
        fallback={
          <div style={{ display: "grid", placeContent: "center", height: "60vh" }}>
            <Spin size="large" tip="Loading Retail Mode..." />
          </div>
        }
      >
        <HospitalPage mode="retail" />
        {selectedProductId && (
          <StaffModal setOpen={setOpen} open={open} tbl={selectedProductId} showButton={true} />
        )}
      </Suspense>
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
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setQuickAdd({ mode: "table" })}
              disabled={!canManageSlots}
              style={{
                backgroundColor: primaryColor,
                borderColor: primaryColor,
                borderRadius: 8,
                fontWeight: 500,
              }}
            >
              Add
            </Button>
          </div>

          <MobileSlotSelector
            tabs={generateTabItems}
            activeKey={safeActiveTabId}
            onChange={handleTabChange}
            primaryColor={primaryColor}
            loading={isLoading}
            onAddLocation={canManageSlots ? () => setQuickAdd({ mode: "location" }) : undefined}
          />

          <div style={{ minHeight: 200 }}>
            {isLoading ? <LoadingTabContent isMobile={true} /> : activeTabContent}
          </div>
        </div>

        <QuickAddTableModal
          open={!!quickAdd}
          mode={quickAdd?.mode}
          fixedLocationId={quickAdd?.locationId}
          fixedLocationName={quickAdd?.locationName}
          defaultLocationId={safeActiveTabId !== DEFAULT_TAB ? safeActiveTabId : undefined}
          onClose={() => setQuickAdd(null)}
          onCreated={setValidActiveTab}
        />

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
              itemColor: "rgba(255, 255, 255, 0.85)",
              itemActiveColor: primaryColor,
              itemHoverColor: "#ffffff",
              itemSelectedColor: primaryColor,
              cardBg: primaryColor,
            },
          },
        }}
      >
        {isLoading ? (
          <ProCard title={cardTitle} style={{ borderRadius: 12, boxShadow: "none", border: "none" }}>
            <LoadingTabs />
            <LoadingTabContent isMobile={false} />
          </ProCard>
        ) : (
          <ProCard
            title={cardTitle}
            extra={
              <Space size={8}>
                <Button
                  icon={<AimOutlined />}
                  onClick={() => setQuickAdd({ mode: "location" })}
                  disabled={!canManageSlots}
                  style={{ borderRadius: 8, fontWeight: 500 }}
                >
                  Location
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setQuickAdd({ mode: "table" })}
                  disabled={!canManageSlots}
                  style={{
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                    borderRadius: 8,
                    fontWeight: 500,
                  }}
                >
                  Add Table
                </Button>
              </Space>
            }
            tabs={{
              type: "card",
              items: generateTabItems,
              onChange: handleTabChange,
              activeKey: safeActiveTabId,
              destroyInactiveTabPane: false,
            }}
            style={{ borderRadius: 12, boxShadow: "none", border: "none" }}
          />
        )}
      </ConfigProvider>

      <QuickAddTableModal
        open={!!quickAdd}
        mode={quickAdd?.mode}
        fixedLocationId={quickAdd?.locationId}
        fixedLocationName={quickAdd?.locationName}
        defaultLocationId={safeActiveTabId !== DEFAULT_TAB ? safeActiveTabId : undefined}
        onClose={() => setQuickAdd(null)}
        onCreated={setValidActiveTab}
      />

      {selectedProductId && (
        <StaffModal setOpen={setOpen} open={open} tbl={selectedProductId} showButton={true} />
      )}
    </>
  );
}