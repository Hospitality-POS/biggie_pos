import React, { useEffect, useState } from "react";
import { Switch, Space, Typography, Alert, Spin, message } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  FormOutlined,
  ScheduleOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  SolutionOutlined,
  CarryOutOutlined,
  ContactsOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { fetchSystemSetupDetailsById, updateSystemSetup } from "../../../services/systemsetup";
import { FORMS_SETTINGS_QUERY_KEY } from "../../../hooks/useFormsSettings";
import { THEME_C } from "../../../utils/getPrimaryColor";

const { Text } = Typography;

const C = THEME_C;

type FormsFlag =
  | "enabled"
  | "client_forms_enabled"
  | "client_plans_enabled"
  | "require_form_before_checkout"
  | "employee_forms_enabled"
  | "employee_plans_enabled"
  | "contact_forms_enabled";

type FormsSettingsState = Record<FormsFlag, boolean>;

// Mirrors the API defaults: the add-on itself is off; once it is on, client
// and contact forms are available straight away and HR switches its own on.
const DEFAULTS: FormsSettingsState = {
  enabled: false,
  client_forms_enabled: true,
  client_plans_enabled: true,
  require_form_before_checkout: false,
  employee_forms_enabled: false,
  employee_plans_enabled: false,
  contact_forms_enabled: true,
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

interface FormsSettingsProps {
  /** The tenant has POS customers (Duka / Pesa / Mteja) */
  hasClients: boolean;
  /** The tenant has Bandu HR */
  hasEmployees: boolean;
  /** The tenant has Mteja (contact forms for leads and non-customers) */
  hasContacts?: boolean;
}

const FormsSettings: React.FC<FormsSettingsProps> = ({ hasClients, hasEmployees, hasContacts = false }) => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<FormsSettingsState>(DEFAULTS);
  const [systemSettingsId, setSystemSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<FormsFlag | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchSystemSetupDetailsById(true);
        setSystemSettingsId(data?._id || null);
        setSettings({ ...DEFAULTS, ...data?.forms_settings });
      } catch (error) {
        console.error("Failed to fetch forms settings:", error);
        message.error("Failed to load Forms & Plans settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggle = (flag: FormsFlag, successMsg: (checked: boolean) => string) =>
    async (checked: boolean) => {
      if (!systemSettingsId) {
        message.error("System settings not found");
        return;
      }

      setUpdating(flag);
      try {
        const result = await updateSystemSetup({
          _id: systemSettingsId,
          data: { forms_settings: { [flag]: checked } },
        });
        // updateSystemSetup swallows errors and returns undefined
        if (!result) return;
        setSettings((prev) => ({ ...prev, [flag]: checked }));
        // The Duka and Bandu menus show Forms & Plans from these flags
        queryClient.invalidateQueries({ queryKey: [FORMS_SETTINGS_QUERY_KEY] });
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
  const where = [hasClients && "Duka", hasEmployees && "Bandu HR", hasContacts && "Mteja"]
    .filter(Boolean)
    .join(", ")
    .replace(/, ([^,]*)$/, " and $1");

  return (
    <ProCard
      bordered
      title={
        <Space>
          <FormOutlined style={{ color: C.primary }} />
          <Text strong>Forms & Plans</Text>
        </Space>
      }
      bodyStyle={{ padding: "14px 16px" }}
    >
      <Space direction="vertical" size={24} style={{ width: "100%" }}>
        <div>
          <SectionLabel text="Add-on" />
          <ToggleRow
            icon={<FormOutlined />}
            color="#8b5cf6"
            bg="#f5f3ff"
            title={settings.enabled ? "Forms & Plans Add-on Active" : "Forms & Plans Add-on Off"}
            description={`Upload your paper forms (PDF, Word or a photo), approve them, and have people fill and e-sign them on a tablet or through a link — with plans to follow up. Adds Forms & Plans to ${where || "your workspace"}.`}
            checked={settings.enabled}
            onChange={handleToggle("enabled", (c) => (c ? "Forms & Plans activated" : "Forms & Plans turned off"))}
            loading={updating === "enabled"}
          />
        </div>

        {hasClients && (
          <div>
            <SectionLabel text="Clients (Duka)" />
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <ToggleRow
                icon={<SolutionOutlined />}
                color="#ec4899"
                bg="#fdf2f8"
                title="Client Forms"
                description="Consultation, intake and consent forms your customers fill in and e-sign. The signed PDF is kept on the customer's profile."
                checked={settings.client_forms_enabled}
                onChange={handleToggle("client_forms_enabled", (c) => (c ? "Client Forms turned on" : "Client Forms turned off"))}
                loading={updating === "client_forms_enabled"}
                disabled={off}
              />

              <ToggleRow
                icon={<ScheduleOutlined />}
                color="#0d9488"
                bg="#f0fdfa"
                title="Client Plans"
                description="Treatment or service plans for each customer — sessions with dates, notes and sign-off — started from a signed form or the customer's profile."
                checked={settings.client_plans_enabled}
                onChange={handleToggle("client_plans_enabled", (c) => (c ? "Client Plans turned on" : "Client Plans turned off"))}
                loading={updating === "client_plans_enabled"}
                disabled={off}
              />

              <ToggleRow
                icon={<SafetyCertificateOutlined />}
                color="#f59e0b"
                bg="#fffbeb"
                title="Remind Staff to Collect Signed Forms"
                description="Warn the cashier at checkout when a service needs a form the customer has not signed yet."
                checked={settings.require_form_before_checkout}
                onChange={handleToggle("require_form_before_checkout", (c) =>
                  c ? "Checkout will warn about unsigned forms" : "Checkout will no longer warn about unsigned forms"
                )}
                loading={updating === "require_form_before_checkout"}
                disabled={off || !settings.client_forms_enabled}
              />
            </Space>
          </div>
        )}

        {hasEmployees && (
          <div>
            <SectionLabel text="Employees (Bandu HR)" />
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <ToggleRow
                icon={<TeamOutlined />}
                color="#2563eb"
                bg="#eff6ff"
                title="Employee Forms"
                description="Onboarding forms, policy acknowledgements, NDAs and incident reports — signed by the employee and countersigned by HR, with the PDF on the employee's file."
                checked={settings.employee_forms_enabled}
                onChange={handleToggle("employee_forms_enabled", (c) => (c ? "Employee Forms turned on" : "Employee Forms turned off"))}
                loading={updating === "employee_forms_enabled"}
                disabled={off}
              />

              <ToggleRow
                icon={<CarryOutOutlined />}
                color="#16a34a"
                bg="#f0fdf4"
                title="Onboarding & Training Plans"
                description="Step-by-step onboarding or training plans for each employee — steps with dates, notes and sign-off by a supervisor or trainer."
                checked={settings.employee_plans_enabled}
                onChange={handleToggle("employee_plans_enabled", (c) =>
                  c ? "Onboarding & Training Plans turned on" : "Onboarding & Training Plans turned off"
                )}
                loading={updating === "employee_plans_enabled"}
                disabled={off}
              />
            </Space>
          </div>
        )}

        {hasContacts && (
          <div>
            <SectionLabel text="Contacts (Mteja)" />
            <ToggleRow
              icon={<ContactsOutlined />}
              color="#059669"
              bg="#ecfdf5"
              title="Contact Forms & Consents"
              description="Data protection consent, marketing opt-ins, photo releases, waivers, NDAs and agreements for leads and people who aren't customers — signed on a tablet or from a link, with ready-made templates."
              checked={settings.contact_forms_enabled}
              onChange={handleToggle("contact_forms_enabled", (c) => (c ? "Contact Forms turned on" : "Contact Forms turned off"))}
              loading={updating === "contact_forms_enabled"}
              disabled={off}
            />
          </div>
        )}

        <Alert
          type="info"
          showIcon
          message="Only for businesses who need it"
          description="This add-on stays off unless you switch it on here. Turning something off hides its menus but keeps every form, signature and plan already saved."
        />
      </Space>
    </ProCard>
  );
};

export default FormsSettings;
