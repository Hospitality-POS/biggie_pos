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
} from "@ant-design/icons";
import InventorySettings from "./InventorySettings";
import DeliverySettings from "./DeliverySettings";
import UomSettings from "./UomSettings";
import PurchaseOrderSettings from "./purchaseOrders/PurchaseOrderSettings";
import MaterialTransferSettings from "./MaterialTransferSettings";
import { useSearchParams } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import React from "react";

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
  },
  {
    key: "inventory",
    label: hospital ? "Pharmacy Stock" : "Inventory",
    shortLabel: hospital ? "Pharmacy" : "Inventory",
    icon: hospital ? <MedicineBoxOutlined /> : <ShopOutlined />,
    color: "#10b981",
    bg: "#f0fdf4",
    component: <InventorySettings />,
  },
  {
    key: "purchase-orders",
    label: hospital ? "Pharmacy Purchase Orders" : "Purchase Orders",
    shortLabel: "POs",
    icon: <FileTextOutlined />,
    color: "#6366f1",
    bg: "#eef2ff",
    component: <PurchaseOrderSettings />,
  },
  {
    key: "delivery",
    label: hospital ? "Medicine Delivery" : "Delivery",
    shortLabel: hospital ? "Med. Delivery" : "Delivery",
    icon: <TruckOutlined />,
    color: "#3b82f6",
    bg: "#eff6ff",
    component: <DeliverySettings />,
  },
  {
    key: "material-transfers",
    label: hospital ? "Medicine Transfers" : "Material Transfers",
    shortLabel: hospital ? "Med. Transfers" : "Transfers",
    icon: <SwapOutlined />,
    color: "#f97316",
    bg: "#fff7ed",
    component: <MaterialTransferSettings />,
  },
];

// ── Main component ────────────────────────────────────────────────────────────
function InventoryMainSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hospital = isHospitalMode();

  const TAB_CONFIG = useMemo(() => getTabConfig(hospital), [hospital]);

  const activeTab = searchParams.get("tab") || "uom";

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

  // ── Desktop tab items ─────────────────────────────────────────────────────
  const tabItems = useMemo(
    () =>
      TAB_CONFIG.map((tab) => ({
        key: tab.key,
        label: (
          <Space size={6} align="center">
            <span style={{
              color: activeTab === tab.key ? tab.color : "#64748b",
              fontSize: 14, display: "flex", alignItems: "center",
            }}>
              {tab.icon}
            </span>
            <span style={{ fontSize: 13 }}>{tab.label}</span>
          </Space>
        ),
        children: tab.component,
      })),
    [activeTab, TAB_CONFIG]
  );

  // ── Mobile tab picker drawer ──────────────────────────────────────────────
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
        return (
          <div
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", margin: "0 8px 4px", borderRadius: 10,
              background: isActive ? tab.bg : "transparent",
              border: isActive ? `1px solid ${tab.color}30` : "1px solid transparent",
              cursor: "pointer", transition: "all 0.15s ease",
            }}
          >
            <Space size={12}>
              <div style={{
                background: isActive ? `${tab.color}20` : "#f1f5f9",
                borderRadius: 8, padding: "6px 7px",
                color: isActive ? tab.color : "#64748b",
                fontSize: 15, lineHeight: 1,
              }}>
                {tab.icon}
              </div>
              <Text strong={isActive} style={{ fontSize: 14, color: isActive ? tab.color : "#374151" }}>
                {tab.label}
              </Text>
            </Space>
            <Space size={8}>
              {isActive && (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: tab.color }} />
              )}
              <RightOutlined style={{ fontSize: 10, color: "#94a3b8" }} />
            </Space>
          </div>
        );
      })}
    </Drawer>
  );

  // ── Mobile layout ─────────────────────────────────────────────────────────
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

        <div>{activeConfig.component}</div>
        {MobileTabDrawer}
      </div>
    );
  }

  // ── Desktop layout ────────────────────────────────────────────────────────
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