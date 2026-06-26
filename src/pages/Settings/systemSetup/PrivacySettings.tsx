import React, { useEffect, useState } from "react";
import { Switch, Space, Typography, Alert, Spin } from "antd";
import { ProCard } from "@ant-design/pro-components";
import { LockOutlined, UnlockOutlined, DollarOutlined } from "@ant-design/icons";
import { fetchSystemSetupDetailsById, updateSystemSetup } from "../../../services/systemsetup";
import { fetchShop, updateShop } from "../../../services/shops";
import { message } from "antd";

const { Text } = Typography;

const C = { primary: "#6c1c2c", subText: "#64748b" };

const PrivacySettings: React.FC = () => {
  const [enablePrivacy, setEnablePrivacy] = useState(false);
  const [staffEarningEnabled, setStaffEarningEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updatingStaffEarning, setUpdatingStaffEarning] = useState(false);
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
      message.success(checked ? "Staff earning tracking enabled" : "Staff earning tracking disabled");
    } catch (error) {
      console.error("Failed to update staff earning setting:", error);
      message.error("Failed to update staff earning settings");
    } finally {
      setUpdatingStaffEarning(false);
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
