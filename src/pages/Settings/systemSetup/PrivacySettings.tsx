import React, { useEffect, useState } from "react";
import { Switch, Space, Typography, Alert, Spin, Input, Button } from "antd";
import { ProCard } from "@ant-design/pro-components";
import { LockOutlined, UnlockOutlined, DollarOutlined, PrinterOutlined, InboxOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { fetchSystemSetupDetailsById, updateSystemSetup } from "../../../services/systemsetup";
import { fetchShop, updateShop } from "../../../services/shops";
import { message } from "antd";
import { THEME_C } from "../../../utils/getPrimaryColor";

const { Text } = Typography;

const C = THEME_C;

const PrivacySettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [enablePrivacy, setEnablePrivacy] = useState(false);
  const [staffEarningEnabled, setStaffEarningEnabled] = useState(false);
  const [requirePaymentBeforePrint, setRequirePaymentBeforePrint] = useState(false);
  const [cartDeductionEnabled, setCartDeductionEnabled] = useState(false);
  const [warrantyEnabled, setWarrantyEnabled] = useState(false);
  const [warrantyDuration, setWarrantyDuration] = useState("6 MONTHS");
  const [warrantyLine1, setWarrantyLine1] = useState("This receipt is your warranty certificate");
  const [warrantyLine2, setWarrantyLine2] = useState("Please retain for warranty claims");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updatingStaffEarning, setUpdatingStaffEarning] = useState(false);
  const [updatingPaymentBeforePrint, setUpdatingPaymentBeforePrint] = useState(false);
  const [updatingCartDeduction, setUpdatingCartDeduction] = useState(false);
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
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Privacy Toggle */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 15, display: "block", marginBottom: 6 }}>
                {enablePrivacy ? (
                  <Space>
                    <LockOutlined />
                    Privacy Mode Enabled
                  </Space>
                ) : (
                  <Space>
                    <UnlockOutlined />
                    Privacy Mode Disabled
                  </Space>
                )}
              </Text>
              <Text style={{ fontSize: 13, color: C.subText, display: "block" }}>
                When enabled, users only see carts and tables they have opened or have items in.
              </Text>
            </div>
            <Switch
              checked={enablePrivacy}
              onChange={handleTogglePrivacy}
              loading={updating}
              style={{ minWidth: 48, marginLeft: 16 }}
              checkedChildren="ON"
              unCheckedChildren="OFF"
            />
          </div>
        </div>

        {/* Staff Earning Toggle */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 15, display: "block", marginBottom: 6 }}>
                {staffEarningEnabled ? (
                  <Space>
                    <DollarOutlined />
                    Staff Earning Tracking Enabled
                  </Space>
                ) : (
                  <Space>
                    <DollarOutlined />
                    Staff Earning Tracking Disabled
                  </Space>
                )}
              </Text>
              <Text style={{ fontSize: 13, color: C.subText, display: "block" }}>
                When enabled, orders will calculate and store earnings per staff member. Configure earnings in the cart drawer.
              </Text>
            </div>
            <Switch
              checked={staffEarningEnabled}
              onChange={handleToggleStaffEarning}
              loading={updatingStaffEarning}
              style={{ minWidth: 48, marginLeft: 16 }}
              checkedChildren="ON"
              unCheckedChildren="OFF"
            />
          </div>
        </div>

        {/* Require Payment Before Print Toggle */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 15, display: "block", marginBottom: 6 }}>
                <Space>
                  <PrinterOutlined />
                  {requirePaymentBeforePrint
                    ? "Payment Required Before Printing Bill"
                    : "Payment Not Required Before Printing Bill"}
                </Space>
              </Text>
              <Text style={{ fontSize: 13, color: C.subText, display: "block" }}>
                When enabled, cashiers cannot print the bill until payment has been completed for the cart. The cart shows "Pending Print" while payment is outstanding, and printing unlocks as soon as payment is recorded.
              </Text>
            </div>
            <Switch
              checked={requirePaymentBeforePrint}
              onChange={handleToggleRequirePaymentBeforePrint}
              loading={updatingPaymentBeforePrint}
              style={{ minWidth: 48, marginLeft: 16 }}
              checkedChildren="ON"
              unCheckedChildren="OFF"
            />
          </div>
        </div>

        {/* Warranty Details Toggle */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 15, display: "block", marginBottom: 6 }}>
                <Space>
                  <SafetyCertificateOutlined />
                  {warrantyEnabled
                    ? "Warranty Details Enabled"
                    : "Warranty Details Disabled"}
                </Space>
              </Text>
              <Text style={{ fontSize: 13, color: C.subText, display: "block" }}>
                When enabled, a warranty block is printed on bills and receipts. Cashiers can also hide it per print from the bill modal.
              </Text>
            </div>
            <Switch
              checked={warrantyEnabled}
              onChange={handleToggleWarranty}
              loading={updatingWarranty}
              style={{ minWidth: 48, marginLeft: 16 }}
              checkedChildren="ON"
              unCheckedChildren="OFF"
            />
          </div>

          {/* Warranty details form — only when enabled */}
          {warrantyEnabled && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px dashed #e2e8f0",
              }}
            >
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <div>
                  <Text style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                    Warranty Duration
                  </Text>
                  <Input
                    value={warrantyDuration}
                    onChange={(e) => setWarrantyDuration(e.target.value)}
                    placeholder="e.g. 6 MONTHS"
                    style={{ maxWidth: 320 }}
                  />
                </div>
                <div>
                  <Text style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                    Footer Line 1
                  </Text>
                  <Input
                    value={warrantyLine1}
                    onChange={(e) => setWarrantyLine1(e.target.value)}
                    placeholder="e.g. This receipt is your warranty certificate"
                  />
                </div>
                <div>
                  <Text style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                    Footer Line 2
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
                  Save Warranty Details
                </Button>
              </Space>
            </div>
          )}
        </div>

        {/* Cart-Level Inventory Deduction Toggle */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 15, display: "block", marginBottom: 6 }}>
                <Space>
                  <InboxOutlined />
                  {cartDeductionEnabled
                    ? "Cart-Level Inventory Deduction Enabled"
                    : "Cart-Level Inventory Deduction Disabled"}
                </Space>
              </Text>
              <Text style={{ fontSize: 13, color: C.subText, display: "block" }}>
                When enabled, each cart item shows a "Deduct" option in the cart drawer. Cashiers can attach one or more inventory items (including specific variants) to be deducted from stock when the order is placed.
              </Text>
            </div>
            <Switch
              checked={cartDeductionEnabled}
              onChange={handleToggleCartDeduction}
              loading={updatingCartDeduction}
              style={{ minWidth: 48, marginLeft: 16 }}
              checkedChildren="ON"
              unCheckedChildren="OFF"
            />
          </div>
        </div>

        {/* Info Alert */}
        <Alert
          message="How Privacy Mode Works"
          description={
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>When Privacy Mode is OFF:</strong> All users can see all carts and tables in the system.
              </div>
              <div>
                <strong>When Privacy Mode is ON:</strong> Users only see carts and tables they have created or have items in. This helps prevent accidental interference with other users' orders.
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
