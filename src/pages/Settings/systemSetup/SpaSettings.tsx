import React, { useEffect, useState } from "react";
import { Switch, Space, Typography, Alert, Spin, message } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  HeartOutlined,
  FormOutlined,
  ScheduleOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { fetchSystemSetupDetailsById, updateSystemSetup } from "../../../services/systemsetup";
import { SPA_SETTINGS_QUERY_KEY } from "../../../hooks/useSpaSettings";
import { THEME_C } from "../../../utils/getPrimaryColor";

const { Text } = Typography;

const C = THEME_C;

type SpaFlag =
  | "enabled"
  | "client_forms_enabled"
  | "treatment_plans_enabled"
  | "require_form_before_checkout";

type SpaSettingsState = Record<SpaFlag, boolean>;

// Mirrors the API defaults: the add-on itself is off, but once a client
// switches it on both features are available straight away.
const DEFAULTS: SpaSettingsState = {
  enabled: false,
  client_forms_enabled: true,
  treatment_plans_enabled: true,
  require_form_before_checkout: false,
};

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

const ToggleRow: React.FC<{
  icon: React.ReactNode;
  color: string;
  bg: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  loading?: boolean;
  disabled?: boolean;
}> = ({ icon, color, bg, title, description, checked, onChange, loading, disabled }) => (
  <div
    style={{
      background: "#fff",
      border: `1px solid ${checked && !disabled ? `${color}33` : "#e2e8f0"}`,
      borderRadius: 10,
      padding: "14px 16px",
      opacity: disabled ? 0.55 : 1,
      transition: "border-color 0.15s ease, opacity 0.15s ease",
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
        disabled={disabled}
        style={{ flexShrink: 0 }}
        checkedChildren="ON"
        unCheckedChildren="OFF"
      />
    </div>
  </div>
);

const SpaSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SpaSettingsState>(DEFAULTS);
  const [systemSettingsId, setSystemSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<SpaFlag | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchSystemSetupDetailsById(true);
        setSystemSettingsId(data?._id || null);
        setSettings({ ...DEFAULTS, ...(data?.spa_settings ?? {}) });
      } catch (error) {
        console.error("Failed to fetch spa settings:", error);
        message.error("Failed to load Spa & Wellness settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggle = (flag: SpaFlag, successMsg: (checked: boolean) => string) =>
    async (checked: boolean) => {
      if (!systemSettingsId) {
        message.error("System settings not found");
        return;
      }

      setUpdating(flag);
      try {
        const result = await updateSystemSetup({
          _id: systemSettingsId,
          data: { spa_settings: { [flag]: checked } },
        });
        // updateSystemSetup swallows errors and returns undefined
        if (!result) return;
        setSettings((prev) => ({ ...prev, [flag]: checked }));
        // The Duka menu shows Client Forms from these flags
        queryClient.invalidateQueries({ queryKey: [SPA_SETTINGS_QUERY_KEY] });
        message.success(successMsg(checked));
      } finally {
        setUpdating(null);
      }
    };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Spin size="large" />
      </div>
    );
  }

  const off = !settings.enabled;

  return (
    <ProCard
      bordered
      title={
        <Space>
          <HeartOutlined style={{ color: C.primary }} />
          <Text strong>Spa & Wellness</Text>
        </Space>
      }
      bodyStyle={{ padding: "14px 16px" }}
    >
      <Space direction="vertical" size={24} style={{ width: "100%" }}>
        <div>
          <SectionLabel text="Add-on" />
          <ToggleRow
            icon={<HeartOutlined />}
            color="#ec4899"
            bg="#fdf2f8"
            title={settings.enabled ? "Spa & Wellness Add-on Active" : "Spa & Wellness Add-on Off"}
            description="Turn this on for spas, salons and wellness centres. It adds client consultation & consent forms with e-signatures, and treatment plans for each customer, to Duka."
            checked={settings.enabled}
            onChange={handleToggle("enabled", (c) =>
              c ? "Spa & Wellness add-on activated" : "Spa & Wellness add-on turned off"
            )}
            loading={updating === "enabled"}
          />
        </div>

        <div>
          <SectionLabel text="Features" />
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <ToggleRow
              icon={<FormOutlined />}
              color="#8b5cf6"
              bg="#f5f3ff"
              title="Client Forms"
              description="Upload consultation and consent forms (PDF, Word or a photo), review and approve them, then have clients fill and e-sign them on a tablet or through a link."
              checked={settings.client_forms_enabled}
              onChange={handleToggle("client_forms_enabled", (c) =>
                c ? "Client Forms turned on" : "Client Forms turned off"
              )}
              loading={updating === "client_forms_enabled"}
              disabled={off}
            />

            <ToggleRow
              icon={<ScheduleOutlined />}
              color="#0d9488"
              bg="#f0fdfa"
              title="Treatment Plans"
              description="Build treatment plans for each customer — sessions, products used and progress notes — straight from a signed form or the customer's profile."
              checked={settings.treatment_plans_enabled}
              onChange={handleToggle("treatment_plans_enabled", (c) =>
                c ? "Treatment Plans turned on" : "Treatment Plans turned off"
              )}
              loading={updating === "treatment_plans_enabled"}
              disabled={off}
            />

            <ToggleRow
              icon={<SafetyCertificateOutlined />}
              color="#f59e0b"
              bg="#fffbeb"
              title="Remind Staff to Collect Signed Forms"
              description="Turn this on to warn the cashier at checkout when a service needs a consent form the customer has not signed yet."
              checked={settings.require_form_before_checkout}
              onChange={handleToggle("require_form_before_checkout", (c) =>
                c ? "Checkout will warn about unsigned forms" : "Checkout will no longer warn about unsigned forms"
              )}
              loading={updating === "require_form_before_checkout"}
              disabled={off || !settings.client_forms_enabled}
            />
          </Space>
        </div>

        <Alert
          type="info"
          showIcon
          message="Only for clients who need it"
          description="This add-on stays off unless you switch it on here. Turning it off hides the Spa menus but keeps every form, signature and treatment plan already saved."
        />
      </Space>
    </ProCard>
  );
};

export default SpaSettings;
