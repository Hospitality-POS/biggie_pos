import React, { useEffect, useState } from "react";
import { Switch, Space, Typography, Alert, Spin, Input, Button } from "antd";
import { ProCard } from "@ant-design/pro-components";
import { LockOutlined, UnlockOutlined, DollarOutlined, PrinterOutlined, InboxOutlined, SafetyCertificateOutlined, EyeInvisibleOutlined, EnvironmentOutlined, AppstoreOutlined, TeamOutlined, BarChartOutlined, TagOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { fetchSystemSetupDetailsById, updateSystemSetup } from "../../../services/systemsetup";
import { fetchShop, updateShop } from "../../../services/shops";
import { message } from "antd";
import { THEME_C } from "../../../utils/getPrimaryColor";

const { Text } = Typography;

const C = THEME_C;

// Small uppercase heading used to group related toggles together.
const SectionLabel: React.FC<{ text: string }> = ({ text }) => (
  <Text
    style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: "#94a3b8",
      display: "block",
      marginBottom: 10,
    }}
  >
    {text}
  </Text>
);

// One on/off setting: a colored icon, a plain-language title + description,
// and the switch itself. `children` can render extra fields that only show
// up while the setting is turned on (e.g. the warranty text boxes).
const ToggleRow: React.FC<{
  icon: React.ReactNode;
  color: string;
  bg: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  loading?: boolean;
  children?: React.ReactNode;
}> = ({ icon, color, bg, title, description, checked, onChange, loading, children }) => (
  <div
    style={{
      background: "#fff",
      border: `1px solid ${checked ? `${color}33` : "#e2e8f0"}`,
      borderRadius: 10,
      padding: "14px 16px",
      transition: "border-color 0.15s ease",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: bg,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 17,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: 14, display: "block", color: "#0f172a" }}>
          {title}
        </Text>
        <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginTop: 2, lineHeight: 1.5 }}>
          {description}
        </Text>
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        loading={loading}
        style={{ flexShrink: 0 }}
        checkedChildren="ON"
        unCheckedChildren="OFF"
      />
    </div>
    {children}
  </div>
);

const PrivacySettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [enablePrivacy, setEnablePrivacy] = useState(false);
  const [staffEarningEnabled, setStaffEarningEnabled] = useState(false);
  const [requirePaymentBeforePrint, setRequirePaymentBeforePrint] = useState(false);
  const [cartDeductionEnabled, setCartDeductionEnabled] = useState(false);
  const [hideServedByOthers, setHideServedByOthers] = useState(false);
  const [zoneInventoryEnabled, setZoneInventoryEnabled] = useState(false);
  const [showAllItemsOnPos, setShowAllItemsOnPos] = useState(false);
  const [allowCashierAddToOthersTables, setAllowCashierAddToOthersTables] = useState(true);
  const [reportPercentageEnabled, setReportPercentageEnabled] = useState(true);
  const [labelPrintingEnabled, setLabelPrintingEnabled] = useState(false);
  const [updatingLabelPrinting, setUpdatingLabelPrinting] = useState(false);
  const [warrantyEnabled, setWarrantyEnabled] = useState(false);
  const [warrantyDuration, setWarrantyDuration] = useState("6 MONTHS");
  const [warrantyLine1, setWarrantyLine1] = useState("This receipt is your warranty certificate");
  const [warrantyLine2, setWarrantyLine2] = useState("Please retain for warranty claims");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updatingStaffEarning, setUpdatingStaffEarning] = useState(false);
  const [updatingPaymentBeforePrint, setUpdatingPaymentBeforePrint] = useState(false);
  const [updatingCartDeduction, setUpdatingCartDeduction] = useState(false);
  const [updatingHideTables, setUpdatingHideTables] = useState(false);
  const [updatingZoneInventory, setUpdatingZoneInventory] = useState(false);
  const [updatingShowAllItems, setUpdatingShowAllItems] = useState(false);
  const [updatingCashierAddToOthers, setUpdatingCashierAddToOthers] = useState(false);
  const [updatingReportPercentage, setUpdatingReportPercentage] = useState(false);
  const [updatingWarranty, setUpdatingWarranty] = useState(false);
  const [systemSettingsId, setSystemSettingsId] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);

  const loadPrivacySetting = async () => {
    setLoading(true);
    try {
      const data = await fetchSystemSetupDetailsById();
      setEnablePrivacy(data?.enable_privacy || false);
      setSystemSettingsId(data?._id || null);
      
      // Load shop data for staff_earning_enabled
      const currentShopId = localStorage.getItem("shopId");
      if (currentShopId) {
        setShopId(currentShopId);
        const shopData = await fetchShop(currentShopId);
        setStaffEarningEnabled(shopData?.staff_earning_enabled || false);
        setRequirePaymentBeforePrint(shopData?.require_payment_before_print || false);
        setCartDeductionEnabled(shopData?.cart_inventory_deduction_enabled || false);
        setHideServedByOthers(shopData?.hide_tables_served_by_others || false);
        setZoneInventoryEnabled(shopData?.zone_inventory_enabled || false);
        setShowAllItemsOnPos(shopData?.pos_show_all_items || false);
        setAllowCashierAddToOthersTables(shopData?.allow_cashier_add_to_others_tables !== false);
        setReportPercentageEnabled(shopData?.report_percentage_enabled !== false);
        setLabelPrintingEnabled(shopData?.label_printing_enabled || false);
        const ws = shopData?.warranty_settings;
        setWarrantyEnabled(ws?.enabled || false);
        if (ws?.duration) setWarrantyDuration(ws.duration);
        if (ws?.line_1) setWarrantyLine1(ws.line_1);
        if (ws?.line_2) setWarrantyLine2(ws.line_2);
      }
    } catch (error) {
      console.error("Failed to fetch privacy setting:", error);
      message.error("Failed to load privacy settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrivacySetting();
  }, []);

  const handleTogglePrivacy = async (checked: boolean) => {
    if (!systemSettingsId) {
      message.error("System settings not found");
      return;
    }

    setUpdating(true);
    try {
      await updateSystemSetup({
        _id: systemSettingsId,
        data: { enable_privacy: checked },
      });
      setEnablePrivacy(checked);
      message.success(checked ? "Privacy mode enabled" : "Privacy mode disabled");
    } catch (error) {
      console.error("Failed to update privacy setting:", error);
      message.error("Failed to update privacy settings");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleHideTables = async (checked: boolean) => {
    if (!shopId) {
      message.error("Shop not found");
      return;
    }

    setUpdatingHideTables(true);
    try {
      await updateShop({
        _id: shopId,
        hide_tables_served_by_others: checked,
      });
      setHideServedByOthers(checked);
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      message.success(
        checked
          ? "Waiters now only see tables they are serving"
          : "Waiters can see all tables again"
      );
    } catch (error) {
      console.error("Failed to update hide-tables setting:", error);
      message.error("Failed to update hide-tables setting");
    } finally {
      setUpdatingHideTables(false);
    }
  };

  const handleToggleStaffEarning = async (checked: boolean) => {
    if (!shopId) {
      message.error("Shop not found");
      return;
    }

    setUpdatingStaffEarning(true);
    try {
      await updateShop({
        _id: shopId,
        staff_earning_enabled: checked,
      });
      setStaffEarningEnabled(checked);
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      message.success(checked ? "Staff earning tracking enabled" : "Staff earning tracking disabled");
    } catch (error) {
      console.error("Failed to update staff earning setting:", error);
      message.error("Failed to update staff earning settings");
    } finally {
      setUpdatingStaffEarning(false);
    }
  };

  const handleToggleRequirePaymentBeforePrint = async (checked: boolean) => {
    if (!shopId) {
      message.error("Shop not found");
      return;
    }

    setUpdatingPaymentBeforePrint(true);
    try {
      await updateShop({
        _id: shopId,
        require_payment_before_print: checked,
      });
      setRequirePaymentBeforePrint(checked);
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      message.success(
        checked
          ? "Payment must now be completed before the bill can be printed"
          : "The bill can now be printed without completing payment first"
      );
    } catch (error) {
      console.error("Failed to update payment-before-print setting:", error);
      message.error("Failed to update payment-before-print setting");
    } finally {
      setUpdatingPaymentBeforePrint(false);
    }
  };

  const saveWarrantySettings = async (enabled: boolean) => {
    await updateShop({
      _id: shopId,
      warranty_settings: {
        enabled,
        duration: warrantyDuration,
        line_1: warrantyLine1,
        line_2: warrantyLine2,
      },
    });
    queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
  };

  const handleToggleWarranty = async (checked: boolean) => {
    if (!shopId) {
      message.error("Shop not found");
      return;
    }

    setUpdatingWarranty(true);
    try {
      await saveWarrantySettings(checked);
      setWarrantyEnabled(checked);
      message.success(checked ? "Warranty details enabled" : "Warranty details disabled");
    } catch (error) {
      console.error("Failed to update warranty setting:", error);
      message.error("Failed to update warranty setting");
    } finally {
      setUpdatingWarranty(false);
    }
  };

  const handleSaveWarrantyDetails = async () => {
    if (!shopId) {
      message.error("Shop not found");
      return;
    }

    setUpdatingWarranty(true);
    try {
      await saveWarrantySettings(warrantyEnabled);
      message.success("Warranty details saved");
    } catch (error) {
      console.error("Failed to save warranty details:", error);
      message.error("Failed to save warranty details");
    } finally {
      setUpdatingWarranty(false);
    }
  };

  const handleToggleShowAllItems = async (checked: boolean) => {
    if (!shopId) {
      message.error("Shop not found");
      return;
    }

    setUpdatingShowAllItems(true);
    try {
      await updateShop({
        _id: shopId,
        pos_show_all_items: checked,
      });
      setShowAllItemsOnPos(checked);
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      message.success(
        checked
          ? "Order screen now shows all items"
          : "Order screen now shows categories"
      );
    } catch (error) {
      console.error("Failed to update POS item display setting:", error);
      message.error("Failed to update POS item display setting");
    } finally {
      setUpdatingShowAllItems(false);
    }
  };

  const handleToggleCashierAddToOthers = async (checked: boolean) => {
    if (!shopId) {
      message.error("Shop not found");
      return;
    }

    setUpdatingCashierAddToOthers(true);
    try {
      await updateShop({
        _id: shopId,
        allow_cashier_add_to_others_tables: checked,
      });
      setAllowCashierAddToOthersTables(checked);
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      message.success(
        checked
          ? "Cashiers can add items to any table"
          : "Cashiers can only add items to tables they are serving"
      );
    } catch (error) {
      console.error("Failed to update cashier table access setting:", error);
      message.error("Failed to update cashier table access setting");
    } finally {
      setUpdatingCashierAddToOthers(false);
    }
  };

  const handleToggleReportPercentage = async (checked: boolean) => {
    if (!shopId) {
      message.error("Shop not found");
      return;
    }

    setUpdatingReportPercentage(true);
    try {
      await updateShop({
        _id: shopId,
        report_percentage_enabled: checked,
      });
      setReportPercentageEnabled(checked);
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      message.success(
        checked
          ? "Top Earners will use percentage-based earnings"
          : "Top Earners will show total revenue per staff"
      );
    } catch (error) {
      console.error("Failed to update report settings:", error);
      message.error("Failed to update report settings");
    } finally {
      setUpdatingReportPercentage(false);
    }
  };

  const handleToggleLabelPrinting = async (checked: boolean) => {
    if (!shopId) {
      message.error("Shop not found");
      return;
    }

    setUpdatingLabelPrinting(true);
    try {
      await updateShop({
        _id: shopId,
        label_printing_enabled: checked,
      });
      setLabelPrintingEnabled(checked);
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      message.success(
        checked
          ? "Label printing enabled — retail POS shows a Labels button next to Scan"
          : "Label printing disabled"
      );
    } catch (error) {
      console.error("Failed to update label printing setting:", error);
      message.error("Failed to update label printing setting");
    } finally {
      setUpdatingLabelPrinting(false);
    }
  };

  const handleToggleCartDeduction = async (checked: boolean) => {
    if (!shopId) {
      message.error("Shop not found");
      return;
    }

    setUpdatingCartDeduction(true);
    try {
      await updateShop({
        _id: shopId,
        cart_inventory_deduction_enabled: checked,
      });
      setCartDeductionEnabled(checked);
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      message.success(
        checked
          ? "Cart-level inventory deductions enabled"
          : "Cart-level inventory deductions disabled"
      );
    } catch (error) {
      console.error("Failed to update cart deduction setting:", error);
      message.error("Failed to update cart deduction setting");
    } finally {
      setUpdatingCartDeduction(false);
    }
  };

  const handleToggleZoneInventory = async (checked: boolean) => {
    if (!shopId) {
      message.error("Shop not found");
      return;
    }

    setUpdatingZoneInventory(true);
    try {
      await updateShop({
        _id: shopId,
        zone_inventory_enabled: checked,
      });
      setZoneInventoryEnabled(checked);
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      message.success(
        checked
          ? "Zone-based inventory enabled"
          : "Zone-based inventory disabled"
      );
    } catch (error) {
      console.error("Failed to update zone inventory setting:", error);
      message.error("Failed to update zone inventory setting");
    } finally {
      setUpdatingZoneInventory(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ProCard
      bordered
      title={
        <Space>
          <LockOutlined style={{ color: C.primary }} />
          <Text strong>Privacy Settings</Text>
        </Space>
      }
      bodyStyle={{ padding: "14px 16px" }}
    >
      <Space direction="vertical" size={24} style={{ width: "100%" }}>
        {/* ── Order & Table Visibility ─────────────────────────────────── */}
        <div>
          <SectionLabel text="Order & Table Visibility" />
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <ToggleRow
              icon={enablePrivacy ? <LockOutlined /> : <UnlockOutlined />}
              color="#8b5cf6"
              bg="#f5f3ff"
              title={enablePrivacy ? "Staff Only See Their Own Orders" : "Everyone Sees All Orders"}
              description="Turn this on so each staff member only sees the carts and tables they personally started. Good for busy shops with many staff working at once."
              checked={enablePrivacy}
              onChange={handleTogglePrivacy}
              loading={updating}
            />

            <ToggleRow
              icon={<EyeInvisibleOutlined />}
              color="#f59e0b"
              bg="#fffbeb"
              title={hideServedByOthers ? "Waiters Only See Their Own Tables" : "Waiters See All Tables"}
              description="Turn this on so a waiter only sees the tables they are serving. Admins and cashiers can still see every table."
              checked={hideServedByOthers}
              onChange={handleToggleHideTables}
              loading={updatingHideTables}
            />

            <ToggleRow
              icon={<TeamOutlined />}
              color="#0ea5e9"
              bg="#f0f9ff"
              title={allowCashierAddToOthersTables ? "Cashiers Can Add Items to Any Table" : "Cashiers Restricted to Their Own Tables"}
              description="Turn this off so a cashier cannot add items to a table already being served by another waiter or cashier on the order screen. Admins are unaffected."
              checked={allowCashierAddToOthersTables}
              onChange={handleToggleCashierAddToOthers}
              loading={updatingCashierAddToOthers}
            />
          </Space>
        </div>

        {/* ── Order Screen ─────────────────────────────────────────────── */}
        <div>
          <SectionLabel text="Order Screen" />
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <ToggleRow
              icon={<AppstoreOutlined />}
              color="#a855f7"
              bg="#faf5ff"
              title={showAllItemsOnPos ? "Order Screen Shows All Items" : "Order Screen Shows Categories"}
              description="Turn this on to list every sellable item in one grid on the order screen instead of category cards. Staff can still tap a category to narrow the list."
              checked={showAllItemsOnPos}
              onChange={handleToggleShowAllItems}
              loading={updatingShowAllItems}
            />
          </Space>
        </div>

        {/* ── Billing ──────────────────────────────────────────────────── */}
        <div>
          <SectionLabel text="Billing" />
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <ToggleRow
              icon={<PrinterOutlined />}
              color="#3b82f6"
              bg="#eff6ff"
              title={requirePaymentBeforePrint ? "Must Pay Before Printing the Bill" : "Can Print Bill Before Payment"}
              description="Turn this on so cashiers cannot print a customer's bill until the order has been paid for."
              checked={requirePaymentBeforePrint}
              onChange={handleToggleRequirePaymentBeforePrint}
              loading={updatingPaymentBeforePrint}
            />

            <ToggleRow
              icon={<SafetyCertificateOutlined />}
              color="#0d9488"
              bg="#f0fdfa"
              title={warrantyEnabled ? "Showing Warranty on Receipts" : "Not Showing Warranty on Receipts"}
              description="Turn this on to print a short warranty note at the bottom of bills and receipts."
              checked={warrantyEnabled}
              onChange={handleToggleWarranty}
              loading={updatingWarranty}
            >
              {warrantyEnabled && (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px dashed #e2e8f0",
                  }}
                >
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <div>
                      <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 4 }}>
                        How long the warranty lasts
                      </Text>
                      <Input
                        value={warrantyDuration}
                        onChange={(e) => setWarrantyDuration(e.target.value)}
                        placeholder="e.g. 6 MONTHS"
                        style={{ maxWidth: 320 }}
                      />
                    </div>
                    <div>
                      <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 4 }}>
                        First line of text on the receipt
                      </Text>
                      <Input
                        value={warrantyLine1}
                        onChange={(e) => setWarrantyLine1(e.target.value)}
                        placeholder="e.g. This receipt is your warranty certificate"
                      />
                    </div>
                    <div>
                      <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 4 }}>
                        Second line of text on the receipt
                      </Text>
                      <Input
                        value={warrantyLine2}
                        onChange={(e) => setWarrantyLine2(e.target.value)}
                        placeholder="e.g. Please retain for warranty claims"
                      />
                    </div>
                    <Button
                      type="primary"
                      onClick={handleSaveWarrantyDetails}
                      loading={updatingWarranty}
                      style={{ background: C.primary }}
                    >
                      Save Warranty Text
                    </Button>
                  </Space>
                </div>
              )}
            </ToggleRow>
          </Space>
        </div>

        {/* ── Labels ───────────────────────────────────────────────────── */}
        <div>
          <SectionLabel text="Labels" />
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <ToggleRow
              icon={<TagOutlined />}
              color="#0ea5e9"
              bg="#f0f9ff"
              title={labelPrintingEnabled ? "Label Printing On" : "Label Printing Off"}
              description="Turn this on to add a Labels button next to Scan on the retail order screen, for printing price and barcode labels on a ZPL (Zebra) or TSPL (TSC, Xprinter) label printer connected through PrintAgent."
              checked={labelPrintingEnabled}
              onChange={handleToggleLabelPrinting}
              loading={updatingLabelPrinting}
            />
          </Space>
        </div>

        {/* ── Inventory ────────────────────────────────────────────────── */}
        <div>
          <SectionLabel text="Inventory" />
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <ToggleRow
              icon={<InboxOutlined />}
              color="#6366f1"
              bg="#eef2ff"
              title={cartDeductionEnabled ? "Manual Stock Deduction Allowed" : "Manual Stock Deduction Off"}
              description="Turn this on to let cashiers attach stock items to a cart item (e.g. ingredients for a dish) so they're used up automatically when the order is placed."
              checked={cartDeductionEnabled}
              onChange={handleToggleCartDeduction}
              loading={updatingCartDeduction}
            />

            <ToggleRow
              icon={<EnvironmentOutlined />}
              color="#f97316"
              bg="#fff7ed"
              title={zoneInventoryEnabled ? "Stock Divided by Zone" : "Stock Not Divided by Zone"}
              description="Turn this on to track stock separately for each area, like Bar, Patio or Store Room. Add a zone to a product's variants in Inventory, then sales and transfers will target that specific zone."
              checked={zoneInventoryEnabled}
              onChange={handleToggleZoneInventory}
              loading={updatingZoneInventory}
            />
          </Space>
        </div>

        {/* ── Staff & Reports ──────────────────────────────────────────── */}
        <div>
          <SectionLabel text="Staff & Reports" />
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <ToggleRow
              icon={<DollarOutlined />}
              color="#10b981"
              bg="#f0fdf4"
              title={staffEarningEnabled ? "Tracking Staff Earnings" : "Not Tracking Staff Earnings"}
              description="Turn this on to record how much each staff member earns per order. Set each staff member's cut in the cart screen."
              checked={staffEarningEnabled}
              onChange={handleToggleStaffEarning}
              loading={updatingStaffEarning}
            />

            <ToggleRow
              icon={<BarChartOutlined />}
              color="#f43f5e"
              bg="#fff1f2"
              title={reportPercentageEnabled ? "Top Earners Uses Percentage Split" : "Top Earners Shows Revenue per Staff"}
              description="Turn this on to split order totals using the staff/platform percentages in the Top Earners report. Turn it off to show each staff member's total revenue instead."
              checked={reportPercentageEnabled}
              onChange={handleToggleReportPercentage}
              loading={updatingReportPercentage}
            />
          </Space>
        </div>

        {/* Info Alert */}
        <Alert
          message="A quick note on Privacy Mode"
          description={
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Switched OFF:</strong> everyone can see every order and table.
              </div>
              <div>
                <strong>Switched ON:</strong> each staff member only sees the orders and tables they started — so people don't accidentally edit each other's work.
              </div>
            </div>
          }
          type="info"
          showIcon
        />
      </Space>
    </ProCard>
  );
};

export default PrivacySettings;
