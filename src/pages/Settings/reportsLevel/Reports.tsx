import React, { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Form, InputNumber, Select, Typography } from "antd";
import {
  BarChartOutlined,
  CalendarOutlined,
  CarOutlined,
  FileExclamationOutlined,
  FileTextOutlined,
  HddOutlined,
  LockOutlined,
  PrinterOutlined,
  ShoppingOutlined,
  TagOutlined,
  UserOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import PurchaseReportModal from "@components/Reports/PurchaseReport";
import VoidReportModal from "@components/Reports/VoidReport";
import { fetchItemSalesReport } from "@services/reports";
import { fetchAllUsersByShopId } from "@services/users";
import { fetchAllCustomers } from "@services/customers";
import ItemSalesModal from "./ItemSalesModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTableLocation } from "@services/tables";
import DeliveryReportModal from "@components/Reports/DeliveryReport";
import InventoryUsageReportModal from "@components/Reports/InventoryUsageReport";
import { useReport } from "../hooks/useReport";
import { getPermissionChecker } from "@utils/getPermissionChecker";

const { RangePicker } = DatePicker;
const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Mobile hook ───────────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

// ── Tab config — each tab declares its required permission ────────────────────
const TAB_CFG = [
  {
    key: "sale",
    icon: <FileTextOutlined />,
    iconColor: C.green,
    label: "Item Sales",
    permissionKey: "REPORTS_ITEM_SALES",
  },
  {
    key: "purchase",
    icon: <ShoppingOutlined />,
    iconColor: C.orange,
    label: "Sales",
    permissionKey: "REPORTS_PURCHASE_SUMMARY",
  },
  {
    key: "voided",
    icon: <FileExclamationOutlined />,
    iconColor: C.red,
    label: "Voided Bills",
    permissionKey: "REPORTS_PURCHASE_SUMMARY",
  },
  {
    key: "delivery",
    icon: <CarOutlined />,
    iconColor: C.blue,
    label: "Delivery",
    permissionKey: "DELIVERY_VIEW",
  },
  {
    key: "inventory_usage",
    icon: <BarChartOutlined />,
    iconColor: C.purple,
    label: "Inventory Usage",
    permissionKey: "INVENTORY_VIEW_USAGE_BY_DATE",
  },
];

// ── Locked placeholder ────────────────────────────────────────────────────────
const LockedTab: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "60px 24px", gap: 12,
    color: "#94a3b8", textAlign: "center",
  }}>
    <LockOutlined style={{ fontSize: 32, color: "#cbd5e1" }} />
    <Text style={{ fontSize: 14, color: "#94a3b8" }}>
      You don't have permission to generate the <strong>{label}</strong> report.
    </Text>
    <Text style={{ fontSize: 12, color: "#cbd5e1" }}>
      Contact your administrator to request access.
    </Text>
  </div>
);

// ── Custom tab nav ────────────────────────────────────────────────────────────
const TabNav: React.FC<{
  tabs: (typeof TAB_CFG[number] & { allowed: boolean })[];
  active: string;
  onChange: (k: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div style={{
    display: "flex", gap: 6, flexWrap: "wrap",
    paddingBottom: 16, borderBottom: `1px solid ${C.border}`, marginBottom: 20,
  }}>
    {tabs.map((t) => {
      const on = t.key === active;
      return (
        <button
          key={t.key}
          onClick={() => t.allowed && onChange(t.key)}
          title={!t.allowed ? "You don't have permission to access this report" : undefined}
          style={{
            background: on ? C.primary : C.bg,
            color: on ? "#fff" : t.allowed ? C.subText : "#cbd5e1",
            border: `1px solid ${on ? C.primary : C.border}`,
            borderRadius: 8, padding: "7px 13px", fontSize: 12,
            fontWeight: on ? 700 : 500,
            cursor: t.allowed ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.15s", whiteSpace: "nowrap",
            opacity: t.allowed ? 1 : 0.5,
          }}
        >
          <span style={{ color: on ? "#fff" : t.allowed ? t.iconColor : "#cbd5e1", fontSize: 13 }}>
            {t.allowed ? t.icon : <LockOutlined />}
          </span>
          {t.label}
        </button>
      );
    })}
  </div>
);

// ── SectionLabel ──────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{
    display: "block", fontSize: 10, fontWeight: 700, color: C.subText,
    textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10,
  }}>
    {children}
  </span>
);

// ── Shared select fetchers ────────────────────────────────────────────────────
const useUserOptions = () => {
  const shopId = localStorage.getItem("shopId");
  const { data } = useQuery({
    queryKey: ["reports-users-shop"],
    queryFn: () => fetchAllUsersByShopId(),
    networkMode: "always",
    enabled: !!shopId,
  });
  return (data ?? []).map((e: any) => ({ label: e.username, value: e._id }));
};

const useCustomerOptions = () => {
  const shopId = localStorage.getItem("shopId");
  const { data } = useQuery({
    queryKey: ["reports-customers"],
    queryFn: () => fetchAllCustomers(),
    networkMode: "always",
    enabled: !!shopId,
  });
  const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
  return list.map((c: any) => ({ label: c.customer_name || c.name, value: c._id }));
};

const useLocationOptions = () => {
  const { data } = useQuery({
    queryKey: ["reports-locations"],
    queryFn: () => getTableLocation({}),
    networkMode: "always",
  });
  return (data ?? []).map((e: any) => ({ label: e.name, value: e._id }));
};

// ── Shared field components ───────────────────────────────────────────────────
const DateRangeField: React.FC<{
  rangePresets: any[];
  onChange?: (dates: any) => void;
}> = ({ rangePresets, onChange }) => (
  <Form.Item
    name="dateRange"
    label={
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}>
        <CalendarOutlined /> Date & Time Range
      </span>
    }
    rules={[{ required: true, message: "Please select a date & time range" }]}
    style={{ marginBottom: 14 }}
  >
    <RangePicker
      showTime={{ format: "HH:mm" }}
      format="YYYY-MM-DD HH:mm"
      presets={rangePresets}
      onChange={onChange}
      style={{ width: "100%", borderRadius: 8 }}
    />
  </Form.Item>
);

const GenerateButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
  onClick?: () => void;
}> = ({ label, icon, disabled, onClick }) => (
  <Form.Item style={{ marginBottom: 0 }}>
    <Button
      type="primary" htmlType="submit"
      icon={icon} disabled={disabled}
      onClick={onClick}
      style={{
        background: C.primary, borderColor: C.primary,
        borderRadius: 8, height: 40, fontWeight: 600,
        fontSize: 13, width: "100%",
      }}
    >
      {label}
    </Button>
  </Form.Item>
);

// ── Main component ────────────────────────────────────────────────────────────
const Reports: React.FC = () => {
  // Admin bypass via makePermissionChecker(isAdmin=true)
  const can = useMemo(() => getPermissionChecker(), []);

  // Attach allowed flag to every tab
  const tabsWithAccess = useMemo(
    () => TAB_CFG.map((t) => ({ ...t, allowed: can(t.permissionKey) })),
    [can]
  );

  // Default to first tab the user can actually access
  const defaultTab = useMemo(
    () => tabsWithAccess.find((t) => t.allowed)?.key ?? TAB_CFG[0].key,
    [tabsWithAccess]
  );

  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [form] = Form.useForm();
  const [queryKey, setQueryKey] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const queryClient = useQueryClient();

  const userOptions = useUserOptions();
  const customerOptions = useCustomerOptions();
  const locationOptions = useLocationOptions();

  const {
    onClosePurchaseModal, generateReportHandler, isGenerateButtonDisabled,
    rangePresets, openPurchaseModal,
    setSalesDateTimeRange, setPurchaseDateTimeRange,
    purchaseDateTimeRange, salesDateTimeRange,
    setOpenSalesModal, setOpenPurchaseModal,
    openVoidedModal, setVoidedDateTimeRange, setOpenVoidedModal, onCloseVoidedModal, voidedDateTimeRange,
    setDeliveryDateTimeRange, onCloseDeliveryModal, deliveryDateTimeRange, openDeliveryModal,
    openInventoryUsageModal, setOpenInventoryUsageModal, setInventoryUsageDateTimeRange,
    onCloseInventoryUsageModal, inventoryUsageDateTimeRange,
  } = useReport(activeTab);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setOpenSalesModal(false);
    setOpenPurchaseModal(false);
    setOpenVoidedModal(false);
    setOpenInventoryUsageModal(false);
    setModalOpen(false);
    setSelectedCustomer(null);
    setQueryKey(null);
    form.resetFields();
  };

  const { data: customersRaw } = useQuery({
    queryKey: ["reports-customers"],
    queryFn: () => fetchAllCustomers(),
    networkMode: "always",
    enabled: !!localStorage.getItem("shopId"),
  });

  const onFinish = async (values: any) => {
    const { dateRange, servedBy, commission, locationId, shop_id, customerId } = values;
    const [startDate, endDate] = dateRange || [];

    setSalesDateTimeRange([
      dateRange?.[0]?.format("YYYY-MM-DD HH:mm") || "",
      dateRange?.[1]?.format("YYYY-MM-DD HH:mm") || "",
    ]);

    if (customerId) {
      const list = Array.isArray(customersRaw) ? customersRaw : (customersRaw as any)?.data ?? [];
      const found = list.find((c: any) => c._id === customerId);
      setSelectedCustomer(found
        ? { id: customerId, name: found.customer_name || found.name }
        : { id: customerId, name: "Selected Customer" });
    } else {
      setSelectedCustomer(null);
    }

    if (startDate) {
      setQueryKey({
        startDate: startDate?.format("YYYY-MM-DD HH:mm") || "",
        endDate: endDate?.format("YYYY-MM-DD HH:mm") || "",
        servedBy, commission, locationId, shop_id,
        customer_id: customerId || undefined,
      });
      queryClient.invalidateQueries(["itemsales"]);
    }
    return true;
  };

  const { data: itemSalesData, isLoading: salesLoading } = useQuery(
    ["itemsales", queryKey],
    () => fetchItemSalesReport(queryKey),
    { enabled: !!queryKey, networkMode: "always" }
  );

  // const { data: itemSalesData, isLoading: salesLoading } = useQuery(
  //   ["itemsales", queryKey],
  //   () => fetchItemSalesReport(queryKey),
  //   { enabled: !!queryKey, networkMode: "always", retry: 2, initialData: { success: true, data: [] } }
  // );

  const salesReportData = React.useMemo(() => {
    if (!itemSalesData) return [];
    if ((itemSalesData as any).success && Array.isArray((itemSalesData as any).data)) return (itemSalesData as any).data;
    if (Array.isArray(itemSalesData)) return itemSalesData;
    if ((itemSalesData as any).data && Array.isArray((itemSalesData as any).data)) return (itemSalesData as any).data;
    return [];
  }, [itemSalesData]);

  // ── Active tab config (with allowed flag) ─────────────────────────────────
  const activeTabCfg = tabsWithAccess.find((t) => t.key === activeTab);

  // ── Per-tab content ───────────────────────────────────────────────────────
  const renderTabContent = () => {
    // Block rendering if user lacks permission — even if they somehow land here
    if (!activeTabCfg?.allowed) {
      return <LockedTab label={activeTabCfg?.label ?? activeTab} />;
    }

    switch (activeTab) {
      case "sale":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => { await onFinish(values); setModalOpen(true); }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField rangePresets={rangePresets} />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="servedBy"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Served By</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All users" options={userOptions}
                    style={{ width: "100%", borderRadius: 8 }}
                    filterOption={(i, o) => (o?.label ?? "").toLowerCase().includes(i.toLowerCase())} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="locationId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><EnvironmentOutlined /> Service Location</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All locations" options={locationOptions}
                    style={{ width: "100%", borderRadius: 8 }}
                    filterOption={(i, o) => (o?.label ?? "").toLowerCase().includes(i.toLowerCase())} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="customerId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Customer</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All customers" options={customerOptions}
                    style={{ width: "100%", borderRadius: 8 }}
                    filterOption={(i, o) => (o?.label ?? "").toLowerCase().includes(i.toLowerCase())} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                <Form.Item
                  name="commission"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><TagOutlined /> Commission</span>}
                  style={{ marginBottom: 14 }}
                >
                  <InputNumber
                    placeholder="0%" min={0} max={100}
                    formatter={(v) => `${v}%`}
                    parser={(v) => v!.replace("%", "") as any}
                    style={{ width: "100%", borderRadius: 8 }}
                  />
                </Form.Item>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary" htmlType="submit"
                  icon={<PrinterOutlined />}
                  style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 40, fontWeight: 600, fontSize: 13 }}
                >
                  Generate Item Sales Report
                </Button>
              </Form.Item>
            </div>
            <ItemSalesModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              data={salesReportData}
              loading={salesLoading && !!queryKey}
              startDate={salesDateTimeRange[0]}
              endDate={salesDateTimeRange[1]}
              customerName={selectedCustomer?.name || null}
            />
          </Form>
        );

      case "purchase":
        return (
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField rangePresets={rangePresets}
                  onChange={(dates) => setPurchaseDateTimeRange([
                    dates?.[0]?.format("YYYY-MM-DD HH:mm") || "",
                    dates?.[1]?.format("YYYY-MM-DD HH:mm") || "",
                  ])} />
              </div>
            </div>
            <GenerateButton label="Generate Sales Report" icon={<PrinterOutlined />} disabled={isGenerateButtonDisabled} onClick={generateReportHandler} />
            <PurchaseReportModal openM={openPurchaseModal} onCloseM={onClosePurchaseModal} startDate={purchaseDateTimeRange[0]} endDate={purchaseDateTimeRange[1]} />
          </Form>
        );

      case "voided":
        return (
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField rangePresets={rangePresets}
                  onChange={(dates) => setVoidedDateTimeRange([
                    dates?.[0]?.format("YYYY-MM-DD HH:mm") || "",
                    dates?.[1]?.format("YYYY-MM-DD HH:mm") || "",
                  ])} />
              </div>
            </div>
            <GenerateButton label="Generate Voided Report" icon={<PrinterOutlined />} disabled={isGenerateButtonDisabled} onClick={generateReportHandler} />
            <VoidReportModal openM={openVoidedModal} onCloseM={onCloseVoidedModal} startDate={voidedDateTimeRange[0]} endDate={voidedDateTimeRange[1]} />
          </Form>
        );

      case "delivery":
        return (
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField rangePresets={rangePresets}
                  onChange={(dates) => setDeliveryDateTimeRange([
                    dates?.[0]?.format("YYYY-MM-DD HH:mm") || "",
                    dates?.[1]?.format("YYYY-MM-DD HH:mm") || "",
                  ])} />
              </div>
            </div>
            <GenerateButton label="Generate Delivery Report" icon={<CarOutlined />} disabled={isGenerateButtonDisabled} onClick={generateReportHandler} />
            <DeliveryReportModal openM={openDeliveryModal} onCloseM={onCloseDeliveryModal} startDate={deliveryDateTimeRange[0]} endDate={deliveryDateTimeRange[1]} />
          </Form>
        );

      case "inventory_usage":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => { await onFinish(values); setOpenInventoryUsageModal(true); }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField rangePresets={rangePresets}
                  onChange={(dates) => setInventoryUsageDateTimeRange([
                    dates?.[0]?.format("YYYY-MM-DD HH:mm") || "",
                    dates?.[1]?.format("YYYY-MM-DD HH:mm") || "",
                  ])} />
              </div>
            </div>
            <GenerateButton label="Generate Inventory Usage Report" icon={<BarChartOutlined />} disabled={isGenerateButtonDisabled} onClick={generateReportHandler} />
            <InventoryUsageReportModal openM={openInventoryUsageModal} onCloseM={onCloseInventoryUsageModal} startDate={inventoryUsageDateTimeRange[0]} endDate={inventoryUsageDateTimeRange[1]} />
          </Form>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
        background: C.bg,
      }}>
        <div style={{
          background: C.primaryLight, borderRadius: 8,
          padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1,
        }}>
          <HddOutlined />
        </div>
        <div>
          <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>Generate Reports</Text>
          {activeTabCfg && (
            <Text style={{ fontSize: 11, color: C.subText }}>
              <span style={{ color: activeTabCfg.iconColor }}>{activeTabCfg.icon}</span>
              {" "}{activeTabCfg.label}
            </Text>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "18px 18px 20px" }}>
        <TabNav tabs={tabsWithAccess} active={activeTab} onChange={handleTabChange} />

        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 16px 10px" }}>
          <SectionLabel>
            {activeTabCfg?.allowed ? "Report Filters" : "Access Restricted"}
          </SectionLabel>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Reports;