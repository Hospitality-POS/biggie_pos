import { ProCard } from "@ant-design/pro-components";
import { Typography, Space, Drawer, Button } from "antd";
import {
  DatabaseOutlined,
  ShopOutlined,
  TruckOutlined,
  FileTextOutlined,
  SwapOutlined,
  AppstoreOutlined,
  MenuOutlined,
  RightOutlined,
  MedicineBoxOutlined,
  LockOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import InventorySettings from "./InventorySettings";
import DeliverySettings from "./DeliverySettings";
import UomSettings from "./UomSettings";
import PurchaseOrderSettings from "./purchaseOrders/PurchaseOrderSettings";
import MaterialTransferSettings from "./MaterialTransferSettings";
import TopSellersReport from "../../../components/Analytics/TopSellersReport";
import { useSearchParams } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import React from "react";
import { getPermissionChecker } from "@utils/getPermissionChecker";

const { Text, Title } = Typography;

// ── POS mode helper ───────────────────────────────────────────────────────────
const isHospitalMode = (): boolean =>
  (localStorage.getItem("posMode") ?? "service") === "hospital";

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

// ── Tab config ────────────────────────────────────────────────────────────────
const getTabConfig = (hospital: boolean) => [
  {
    key: "uom",
    label: "Units of Measure",
    shortLabel: "UOM",
    icon: <DatabaseOutlined />,
    color: "#6366f1",
    bg: "#eef2ff",
    component: <UomSettings />,
    permissionKey: "UOM_VIEW",
  },
  {
    key: "inventory",
    label: hospital ? "Pharmacy Stock" : "Inventory",
    shortLabel: hospital ? "Pharmacy" : "Inventory",
    icon: hospital ? <MedicineBoxOutlined /> : <ShopOutlined />,
    color: "#10b981",
    bg: "#f0fdf4",
    component: <InventorySettings />,
    permissionKey: "INVENTORY_VIEW",
  },
  {
    key: "purchase-orders",
    label: hospital ? "Pharmacy Purchase Orders" : "Purchase Orders",
    shortLabel: "POs",
    icon: <FileTextOutlined />,
    color: "#6366f1",
    bg: "#eef2ff",
    component: <PurchaseOrderSettings />,
    permissionKey: "PURCHASE_ORDERS_VIEW",
  },
  {
    key: "delivery",
    label: hospital ? "Medicine Delivery" : "Delivery",
    shortLabel: hospital ? "Med. Delivery" : "Delivery",
    icon: <TruckOutlined />,
    color: "#3b82f6",
    bg: "#eff6ff",
    component: <DeliverySettings />,
    permissionKey: "DELIVERY_VIEW",
  },
  {
    key: "material-transfers",
    label: hospital ? "Medicine Transfers" : "Material Transfers",
    shortLabel: hospital ? "Med. Transfers" : "Transfers",
    icon: <SwapOutlined />,
    color: "#f97316",
    bg: "#fff7ed",
    component: <MaterialTransferSettings />,
    permissionKey: "TRANSFERS_VIEW",
  },
  {
    key: "top-sellers",
    label: "Top Sellers Report",
    shortLabel: "Top Sellers",
    icon: <BarChartOutlined />,
    color: "#722ed1",
    bg: "#f9f0ff",
    component: <TopSellersReport />,
    permissionKey: "INVENTORY_VIEW",
  },
];

// ── Locked tab placeholder ────────────────────────────────────────────────────
const LockedTab = ({ label }: { label: string }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "60px 24px", gap: 12,
    color: "#94a3b8", textAlign: "center",
  }}>
    <LockOutlined style={{ fontSize: 32, color: "#cbd5e1" }} />
    <Text style={{ fontSize: 14, color: "#94a3b8" }}>
      You don't have permission to access <strong>{label}</strong>.
    </Text>
    <Text style={{ fontSize: 12, color: "#cbd5e1" }}>
      Contact your administrator to request access.
    </Text>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
function InventoryMainSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hospital = isHospitalMode();

  // Admin users get can() === true for every key via makePermissionChecker
  const can = useMemo(() => getPermissionChecker(), []);
  const TAB_CONFIG = useMemo(() => getTabConfig(hospital), [hospital]);

  const rawTab = searchParams.get("tab") || "uom";
  const activeTab = useMemo(() => {
    const requested = TAB_CONFIG.find((t) => t.key === rawTab);
    if (requested && can(requested.permissionKey)) return rawTab;
    const first = TAB_CONFIG.find((t) => can(t.permissionKey));
    return first?.key ?? rawTab;
  }, [rawTab, TAB_CONFIG, can]);

  const handleTabChange = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    setSearchParams(next);
    setDrawerOpen(false);
  };

  const activeConfig = TAB_CONFIG.find((t) => t.key === activeTab) || TAB_CONFIG[0];

  const pageTitle = hospital ? "Pharmacy Management" : "Inventory Management";
  const pageSubtitle = hospital
    ? "Manage medicines, orders, deliveries & transfers"
    : "Manage stock, orders, deliveries & transfers";

  const tabItems = useMemo(
    () =>
      TAB_CONFIG.map((tab) => {
        const allowed = can(tab.permissionKey);
        return {
          key: tab.key,
          label: (
            <Space size={6} align="center">
              <span style={{
                color: activeTab === tab.key
                  ? allowed ? tab.color : "#cbd5e1"
                  : "#64748b",
                fontSize: 14, display: "flex", alignItems: "center",
              }}>
                {allowed ? tab.icon : <LockOutlined />}
              </span>
              <span style={{ fontSize: 13, color: allowed ? undefined : "#94a3b8" }}>
                {tab.label}
              </span>
            </Space>
          ),
          children: allowed ? tab.component : <LockedTab label={tab.label} />,
        };
      }),
    [activeTab, TAB_CONFIG, can]
  );

  const MobileTabDrawer = (
    <Drawer
      title={
        <Space size={8}>
          <div style={{
            background: hospital ? "#f0fdf4" : "#fff7ed",
            borderRadius: 8, padding: "5px 6px",
            color: hospital ? "#10b981" : "#f97316",
            fontSize: 14, lineHeight: 1,
          }}>
            {hospital ? <MedicineBoxOutlined /> : <AppstoreOutlined />}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
              {hospital ? "Pharmacy Sections" : "Inventory Sections"}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>
              Select a section to manage
            </div>
          </div>
        </Space>
      }
      placement="bottom"
      height="auto"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      styles={{
        body: { padding: "8px 0 28px" },
        header: { borderBottom: "1px solid #f1f5f9", padding: "14px 16px 12px" },
      }}
    >
      {TAB_CONFIG.map((tab) => {
        const isActive = activeTab === tab.key;
        const allowed = can(tab.permissionKey);
        return (
          <div
            key={tab.key}
            onClick={() => allowed && handleTabChange(tab.key)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", margin: "0 8px 4px", borderRadius: 10,
              background: isActive ? tab.bg : "transparent",
              border: isActive ? `1px solid ${tab.color}30` : "1px solid transparent",
              cursor: allowed ? "pointer" : "not-allowed",
              opacity: allowed ? 1 : 0.45,
              transition: "all 0.15s ease",
            }}
          >
            <Space size={12}>
              <div style={{
                background: isActive ? `${tab.color}20` : "#f1f5f9",
                borderRadius: 8, padding: "6px 7px",
                color: isActive ? tab.color : "#64748b",
                fontSize: 15, lineHeight: 1,
              }}>
                {allowed ? tab.icon : <LockOutlined />}
              </div>
              <div>
                <Text strong={isActive} style={{ fontSize: 14, color: isActive ? tab.color : "#374151" }}>
                  {tab.label}
                </Text>
                {!allowed && (
                  <Text style={{ fontSize: 11, color: "#94a3b8", display: "block" }}>
                    No access
                  </Text>
                )}
              </div>
            </Space>
            <Space size={8}>
              {isActive && allowed && (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: tab.color }} />
              )}
              <RightOutlined style={{ fontSize: 10, color: "#94a3b8" }} />
            </Space>
          </div>
        );
      })}
    </Drawer>
  );

  if (isMobile) {
    return (
      <div>
        <div style={{ marginBottom: 14 }}>
          <Space align="center" size={10}>
            <div style={{
              background: hospital ? "#f0fdf4" : "#fff7ed",
              borderRadius: 10, padding: "8px 10px",
              color: hospital ? "#10b981" : "#f97316",
              fontSize: 18, lineHeight: 1,
            }}>
              {hospital ? <MedicineBoxOutlined /> : <AppstoreOutlined />}
            </div>
            <div>
              <Title level={5} style={{ margin: 0, color: "#0f172a" }}>{pageTitle}</Title>
              <Text style={{ fontSize: 12, color: "#64748b" }}>{pageSubtitle}</Text>
            </div>
          </Space>
        </div>

        <div style={{
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
          padding: "10px 14px", marginBottom: 14,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}>
          <Space size={10}>
            <div style={{
              background: activeConfig.bg, borderRadius: 7,
              padding: "5px 6px", color: activeConfig.color, fontSize: 15, lineHeight: 1,
            }}>
              {activeConfig.icon}
            </div>
            <div>
              <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Active Section</Text>
              <Text strong style={{ fontSize: 13, color: "#0f172a" }}>{activeConfig.label}</Text>
            </div>
          </Space>
          <Button
            size="small" icon={<MenuOutlined />}
            onClick={() => setDrawerOpen(true)}
            style={{
              borderRadius: 7,
              background: `${activeConfig.color}10`,
              border: `1px solid ${activeConfig.color}30`,
              color: activeConfig.color,
              fontWeight: 500, fontSize: 12,
            }}
          >
            Switch
          </Button>
        </div>

        <div>
          {can(activeConfig.permissionKey)
            ? activeConfig.component
            : <LockedTab label={activeConfig.label} />}
        </div>
        {MobileTabDrawer}
      </div>
    );
  }

  return (
    <ProCard
      bordered
      headerBordered
      title={
        <Space size={10} align="center">
          <div style={{
            background: hospital ? "#f0fdf4" : "#fff7ed",
            borderRadius: 9, padding: "7px 8px",
            color: hospital ? "#10b981" : "#f97316",
            fontSize: 16, lineHeight: 1,
          }}>
            {hospital ? <MedicineBoxOutlined /> : <AppstoreOutlined />}
          </div>
          <div>
            <Title level={5} style={{ margin: 0, color: "#0f172a" }}>{pageTitle}</Title>
            <Text style={{ fontSize: 12, color: "#64748b" }}>{pageSubtitle}</Text>
          </div>
        </Space>
      }
      style={{ borderRadius: 12 }}
      tabs={{
        type: "card",
        activeKey: activeTab,
        onChange: handleTabChange,
        size: "middle",
        items: tabItems,
      }}
    />
  );
}

export default InventoryMainSettings;