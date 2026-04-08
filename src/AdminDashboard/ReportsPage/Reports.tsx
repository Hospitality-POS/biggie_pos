import React, { useEffect, useState } from "react";
import { Button, DatePicker, Form, InputNumber, Select, Spin, Typography } from "antd";
import {
  BarChartOutlined,
  CalendarOutlined,
  CarOutlined,
  DollarOutlined,
  FileExclamationOutlined,
  FileTextOutlined,
  HddOutlined,
  PrinterOutlined,
  ShoppingOutlined,
  ShopOutlined,
  UserOutlined,
  EnvironmentOutlined,
  TagOutlined,
} from "@ant-design/icons";
import PurchaseReportModal from "@components/Reports/PurchaseReport";
import VoidReportModal from "@components/Reports/VoidReport";
import VATReportModal from "@components/Reports/VATReport";
import { fetchItemSalesReport } from "@services/reports";
import { fetchAllUsersList } from "@services/users";
import ItemSalesModal from "./ItemSalesModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTableLocation } from "@services/tables";
import DeliveryReportModal from "@components/Reports/DeliveryReport";
import InventoryUsageReportModal from "@components/Reports/InventoryUsageReport";
import { useReport } from "@pages/Settings/hooks/useReport";
import { fetchAllShops } from "@services/shops";

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

// ── SectionLabel ──────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{
    display: "block", fontSize: 10, fontWeight: 700, color: C.subText,
    textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10,
  }}>
    {children}
  </span>
);

// ── Tab config ────────────────────────────────────────────────────────────────
const TAB_CFG = [
  { key: "sale", icon: <FileTextOutlined />, iconColor: C.green, label: "Item Sales" },
  { key: "purchase", icon: <ShoppingOutlined />, iconColor: C.orange, label: "Sales" },
  { key: "voided", icon: <FileExclamationOutlined />, iconColor: C.red, label: "Voided Bills" },
  { key: "delivery", icon: <CarOutlined />, iconColor: C.blue, label: "Delivery" },
  { key: "inventory_usage", icon: <BarChartOutlined />, iconColor: C.purple, label: "Inventory Usage" },
  { key: "vat", icon: <DollarOutlined />, iconColor: C.green, label: "VAT Summary" },
];

// ── Custom tab nav ────────────────────────────────────────────────────────────
const TabNav: React.FC<{
  tabs: typeof TAB_CFG;
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
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          background: on ? C.primary : C.bg,
          color: on ? "#fff" : C.subText,
          border: `1px solid ${on ? C.primary : C.border}`,
          borderRadius: 8, padding: "7px 13px", fontSize: 12,
          fontWeight: on ? 700 : 500, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          transition: "all 0.15s", whiteSpace: "nowrap",
        }}>
          <span style={{ color: on ? "#fff" : t.iconColor, fontSize: 13 }}>{t.icon}</span>
          {t.label}
        </button>
      );
    })}
  </div>
);

// ── Shared select fetchers ────────────────────────────────────────────────────
const useShopOptions = () => {
  const { data } = useQuery({
    queryKey: ["shops-for-reports"],
    queryFn: () => fetchAllShops({}),
    networkMode: "always",
  });
  return (data ?? []).map((e: any) => ({ label: e.name, value: e._id }));
};

const useUserOptions = () => {
  const { data } = useQuery({
    queryKey: ["users-for-reports"],
    queryFn: () => fetchAllUsersList({}),
    networkMode: "always",
  });
  return (data ?? []).map((e: any) => ({ label: e.username, value: e._id }));
};

const useLocationOptions = () => {
  const { data } = useQuery({
    queryKey: ["locations-for-reports"],
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

const ShopField: React.FC = () => {
  const options = useShopOptions();
  return (
    <Form.Item
      name="shop_id"
      label={
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}>
          <ShopOutlined /> Branch
        </span>
      }
      style={{ marginBottom: 14 }}
    >
      <Select
        showSearch placeholder="All branches" allowClear
        options={options}
        filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
        style={{ width: "100%", borderRadius: 8 }}
      />
    </Form.Item>
  );
};

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
const AdminReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("sale");
  const [form] = Form.useForm();
  const [queryKey, setQueryKey] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const shopOptions = useShopOptions();
  const userOptions = useUserOptions();
  const locationOptions = useLocationOptions();

  const {
    onClosePurchaseModal, generateReportHandler, isGenerateButtonDisabled,
    rangePresets, openPurchaseModal,
    setSalesDateTimeRange, setPurchaseDateTimeRange,
    purchaseDateTimeRange, salesDateTimeRange,
    setOpenSalesModal, setOpenPurchaseModal,
    openVoidedModal, setVoidedDateTimeRange, setOpenVoidedModal, onCloseVoidedModal, voidedDateTimeRange,
    setDeliveryDateTimeRange, onCloseDeliveryModal, deliveryDateTimeRange, openDeliveryModal,
    openInventoryUsageModal, setOpenInventoryUsageModal, setInventoryUsageDateTimeRange, onCloseInventoryUsageModal, inventoryUsageDateTimeRange,
    openVATModal, setVATDateTimeRange, setOpenVATModal, onCloseVATModal, vatDateTimeRange,
    setParams,
  } = useReport(activeTab);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setOpenSalesModal(false);
    setOpenPurchaseModal(false);
    setOpenVoidedModal(false);
    setOpenVATModal(false);
    setOpenInventoryUsageModal(false);
    setModalOpen(false);
    form.resetFields();
  };

  const onFinish = async (values: any) => {
    const { dateRange, servedBy, commission, locationId, shop_id } = values;
    const [startDate, endDate] = dateRange || [];

    setSalesDateTimeRange([
      dateRange?.[0]?.format("YYYY-MM-DD HH:mm") || "",
      dateRange?.[1]?.format("YYYY-MM-DD HH:mm") || "",
    ]);
    setParams({ shop_id });

    if (startDate) {
      setQueryKey({
        startDate: startDate?.format("YYYY-MM-DD HH:mm") || "",
        endDate: endDate?.format("YYYY-MM-DD HH:mm") || "",
        servedBy, commission, locationId, shop_id,
      });
      queryClient.invalidateQueries(["itemsales"]);
    }
    return true;
  };

  const { data: salesData, isLoading: salesLoading } = useQuery(
    ["itemsales", queryKey],
    () => fetchItemSalesReport(queryKey),
    { enabled: !!queryKey, networkMode: "always" }
  );

  // ── Per-tab content ───────────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {

      case "sale":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            await onFinish(values);
            setModalOpen(true);
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField rangePresets={rangePresets} />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <ShopField />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="servedBy"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><UserOutlined /> Created By</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All users" options={userOptions} style={{ width: "100%", borderRadius: 8 }}
                    filterOption={(i, o) => (o?.label ?? "").toLowerCase().includes(i.toLowerCase())} />
                </Form.Item>
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <Form.Item
                  name="locationId"
                  label={<span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.subText }}><EnvironmentOutlined /> Served By</span>}
                  style={{ marginBottom: 14 }}
                >
                  <Select showSearch allowClear placeholder="All locations" options={locationOptions} style={{ width: "100%", borderRadius: 8 }}
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
              data={salesData}
              loading={salesLoading && !!queryKey}
              startDate={salesDateTimeRange[0]}
              endDate={salesDateTimeRange[1]}

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
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <ShopField />
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
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <ShopField />
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
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <ShopField />
              </div>
            </div>
            <GenerateButton label="Generate Delivery Report" icon={<CarOutlined />} disabled={isGenerateButtonDisabled} onClick={generateReportHandler} />
            <DeliveryReportModal openM={openDeliveryModal} onCloseM={onCloseDeliveryModal} startDate={deliveryDateTimeRange[0]} endDate={deliveryDateTimeRange[1]} />
          </Form>
        );

      case "inventory_usage":
        return (
          <Form form={form} layout="vertical" onFinish={async (values) => {
            await onFinish(values);
            setOpenInventoryUsageModal(true);
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField rangePresets={rangePresets}
                  onChange={(dates) => setInventoryUsageDateTimeRange([
                    dates?.[0]?.format("YYYY-MM-DD HH:mm") || "",
                    dates?.[1]?.format("YYYY-MM-DD HH:mm") || "",
                  ])} />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <ShopField />
              </div>
            </div>
            <GenerateButton label="Generate Inventory Usage Report" icon={<BarChartOutlined />} disabled={isGenerateButtonDisabled} onClick={generateReportHandler} />
            <InventoryUsageReportModal openM={openInventoryUsageModal} onCloseM={onCloseInventoryUsageModal} startDate={inventoryUsageDateTimeRange[0]} endDate={inventoryUsageDateTimeRange[1]} />
          </Form>
        );

      case "vat":
        return (
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <DateRangeField rangePresets={rangePresets}
                  onChange={(dates) => setVATDateTimeRange([
                    dates?.[0]?.format("YYYY-MM-DD HH:mm") || "",
                    dates?.[1]?.format("YYYY-MM-DD HH:mm") || "",
                  ])} />
              </div>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <ShopField />
              </div>
            </div>
            <GenerateButton label="Generate VAT Report" icon={<DollarOutlined />} disabled={isGenerateButtonDisabled} onClick={generateReportHandler} />
            <VATReportModal openM={openVATModal} onCloseM={onCloseVATModal} startDate={vatDateTimeRange[0]} endDate={vatDateTimeRange[1]} />
          </Form>
        );

      default:
        return null;
    }
  };

  const activeCfg = TAB_CFG.find((t) => t.key === activeTab);

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
          {activeCfg && (
            <Text style={{ fontSize: 11, color: C.subText }}>
              <span style={{ color: activeCfg.iconColor }}>{activeCfg.icon}</span>
              {" "}{activeCfg.label}
            </Text>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "18px 18px 20px" }}>
        <TabNav tabs={TAB_CFG} active={activeTab} onChange={handleTabChange} />

        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 16px 10px" }}>
          <SectionLabel>Report Filters</SectionLabel>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminReports;