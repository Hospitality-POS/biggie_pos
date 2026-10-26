import { useEffect, useMemo, useState } from "react";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  IdcardOutlined,
  LoadingOutlined,
  MailOutlined,
  PercentageOutlined,
  PhoneOutlined,
  PictureOutlined,
  SettingOutlined,
  TagOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Button,
  ColorPicker,
  Form,
  Input,
  message,
  Result,
  Skeleton,
  Typography,
  Upload,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  fetchTenantDetails,
  getCurrentTenantId,
  updateTenant,
} from "@services/tenants";
import SettingsShell, { SettingSection } from "@components/Settings/SettingsShell";
import VatPanel from "@pages/Settings/taxes/VatPanel";
import CateringLevyPanel from "@pages/Settings/taxes/CateringLevyPanel";
import { CardLabel, PanelStack, panelCard } from "@pages/Settings/taxes/TaxPanelParts";
import { THEME_C, getPrimaryColor } from "@utils/getPrimaryColor";

const { Text } = Typography;

// ── Palette (Dynamic Getters) ────────────────────────────────────────────────
const C = THEME_C;

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  active: { color: "#059669", bg: "#ecfdf5", icon: <CheckCircleOutlined />, label: "Active" },
  pending_approval: { color: C.orange, bg: "#fffbeb", icon: <LoadingOutlined />, label: "Pending Approval" },
  suspended: { color: C.red, bg: "#fef2f2", icon: <CloseCircleOutlined />, label: "Suspended" },
  terminated: { color: C.subText, bg: C.bg, icon: <CloseCircleOutlined />, label: "Terminated" },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CFG[status] || { color: C.subText, bg: C.bg, icon: null, label: status };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 6, fontSize: 10, fontWeight: 700,
      padding: "2px 8px", textTransform: "uppercase",
      display: "inline-flex", alignItems: "center", gap: 5,
      whiteSpace: "nowrap",
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ── Info row ──────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
    padding: "9px 0", borderTop: `1px solid ${C.border}`,
  }}>
    <Text style={{ fontSize: 12, color: C.subText }}>{label}</Text>
    <Text style={{ fontSize: 13, color: C.darkText, fontWeight: 500, textAlign: "right" }}>
      {value || "—"}
    </Text>
  </div>
);

const TenantLogo: React.FC<{ url?: string; size: number }> = ({ url, size }) =>
  url ? (
    <img
      src={url}
      alt="logo"
      style={{ width: size, height: size, borderRadius: 10, objectFit: "contain", border: `1px solid ${C.border}`, background: "#fff", flexShrink: 0 }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      background: C.primaryLight, color: C.primary, fontSize: size * 0.4,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <UserOutlined />
    </div>
  );

// ── Default colors ────────────────────────────────────────────────────────────
const getDefaultColors = () => ({
  primary: getPrimaryColor(),
  secondary: "#14EF4A",
  accent: "#1F2B5D",
  background: "#ffffff",
  text: "#0f172a",
});

// ── Main component ────────────────────────────────────────────────────────────
function TenantSettings() {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [colors, setColors] = useState(getDefaultColors);
  const [activeTab, setActiveTab] = useState("basic");

  const params = useParams();
  const queryClient = useQueryClient();
  const tenantId = params.id || getCurrentTenantId();

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: tenantDetails, isLoading, refetch } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: () => fetchTenantDetails(tenantId!),
    enabled: !!tenantId,
    refetchOnWindowFocus: false,
    networkMode: "always",
  });

  // ── Mutation ──────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTenant(id, data),
    onSuccess: () => {
      message.success("Settings updated successfully");
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantId] });
      refetch();
    },
    onError: () => message.error("Failed to update settings"),
  });

  // ── Populate form on load ─────────────────────────────────────────────────
  useEffect(() => {
    if (!tenantDetails?.data) return;
    const t = tenantDetails.data;
    form.setFieldsValue({ name: t.name, email: t.email, phone: t.phone });
    if (t.color_scheme) setColors({ ...getDefaultColors(), ...t.color_scheme });
  }, [tenantDetails, form]);

  // ── Load colors from localStorage on mount ────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tenant");
      if (stored) {
        const t = JSON.parse(stored);
        if (t.color_scheme) setColors((p) => ({ ...p, ...t.color_scheme }));
      }
    } catch { /* silent */ }
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUpdateBasic = (values: any) => {
    if (!tenantId) { message.error("Tenant ID not found"); return; }
    updateMutation.mutate({ id: tenantId, data: values });
  };

  const handleUpdateColors = () => {
    if (!tenantId) { message.error("Tenant ID not found"); return; }
    updateMutation.mutate({
      id: tenantId,
      data: { color_scheme: colors, primary_color: colors.primary },
    });
  };

  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/svg+xml", "image/webp"];

  const handleBeforeUpload = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      message.error("Only image files allowed (JPEG, PNG, GIF, SVG, WebP)");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error("File size must be less than 5MB");
      return false;
    }
    if (!tenantId) { message.error("Tenant ID not found"); return false; }

    const formData = new FormData();
    formData.append("logo", file);
    formData.append("color_scheme", JSON.stringify(colors));
    formData.append("primary_color", colors.primary);

    updateMutation.mutateAsync({ id: tenantId, data: formData })
      .then(() => { message.success("Logo uploaded successfully"); setFileList([]); })
      .catch(() => { message.error("Failed to upload logo"); setFileList([]); });

    return false;
  };

  const tenant = tenantDetails?.data;
  const saving = updateMutation.isLoading;

  // ── Panels ────────────────────────────────────────────────────────────────
  const renderBasic = () => (
    // Two columns on wide screens so the panel uses the full content width
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16, alignItems: "start" }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleUpdateBasic}
        disabled={saving}
        requiredMark={false}
        initialValues={{ name: tenant?.name, email: tenant?.email, phone: tenant?.phone }}
      >
        <div style={panelCard}>
          <CardLabel>Business identity</CardLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", columnGap: 14, marginTop: 12 }}>
            <Form.Item label="Business name" name="name" rules={[{ required: true, message: "Required" }]}>
              <Input prefix={<UserOutlined style={{ color: C.subText }} />} placeholder="Business name" />
            </Form.Item>
            <Form.Item label="Email address" name="email" rules={[{ required: true, message: "Required" }, { type: "email", message: "Invalid email" }]}>
              <Input prefix={<MailOutlined style={{ color: C.subText }} />} placeholder="Email address" />
            </Form.Item>
            <Form.Item label="Phone number" name="phone" rules={[{ required: true, message: "Required" }]} style={{ marginBottom: 4 }}>
              <Input prefix={<PhoneOutlined style={{ color: C.subText }} />} placeholder="Phone number" />
            </Form.Item>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <Button type="primary" htmlType="submit" loading={saving} icon={<CheckCircleOutlined />} style={{ borderRadius: 8 }}>
            Save Basic Info
          </Button>
        </div>
      </Form>

      <div style={panelCard}>
        <CardLabel>Account</CardLabel>
        <div style={{ marginTop: 6 }}>
          <InfoRow label="Business code" value={tenant?.tenant_code} />
          <InfoRow label="Status" value={tenant?.subscription_status ? <StatusBadge status={tenant.subscription_status} /> : null} />
          <InfoRow
            label="Subscription"
            value={typeof tenant?.subscription_id === "object"
              ? `${tenant.subscription_id.name} · KES ${tenant.subscription_id.price}${tenant.subscription_cycle ? ` / ${tenant.subscription_cycle}` : ""}`
              : tenant?.subscription_cycle}
          />
          <InfoRow label="Business type" value={tenant?.business_type_name || (typeof tenant?.business_type === "object" ? tenant?.business_type?.name : null)} />
          <InfoRow label="Business size" value={tenant?.business_size} />
          <InfoRow label="Created" value={tenant?.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : null} />
          {tenant?.next_billing_date && (
            <InfoRow label="Next billing" value={new Date(tenant.next_billing_date).toLocaleDateString()} />
          )}
        </div>
      </div>
    </div>
  );

  const renderBranding = () => (
    <PanelStack>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {/* Logo upload */}
        <div style={{ ...panelCard, flex: "1 1 260px", minWidth: 0 }}>
          <CardLabel>Business logo</CardLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0" }}>
            {tenant?.tenant_logo?.url ? (
              <TenantLogo url={tenant.tenant_logo.url} size={56} />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: 10, flexShrink: 0,
                background: C.primaryLight, color: C.primary, fontSize: 22,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <PictureOutlined />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>
                {tenant?.tenant_logo?.filename || "No logo uploaded"}
              </Text>
              <Text style={{ fontSize: 11, color: C.subText }}>
                {tenant?.tenant_logo?.size ? `${(tenant.tenant_logo.size / 1024).toFixed(1)} KB · ` : ""}PNG, JPG, SVG, WebP · max 5MB
              </Text>
            </div>
          </div>
          <Upload
            accept="image/*"
            fileList={fileList}
            beforeUpload={handleBeforeUpload}
            disabled={saving}
            maxCount={1}
            showUploadList={false}
            style={{ width: "100%" }}
          >
            <Button block icon={<UploadOutlined />} loading={saving} style={{ borderRadius: 8, borderStyle: "dashed", width: "100%" }}>
              {saving ? "Uploading…" : "Upload new logo"}
            </Button>
          </Upload>
        </div>

        {/* Color scheme */}
        <div style={{ ...panelCard, flex: "1 1 260px", minWidth: 0 }}>
          <CardLabel>Color scheme</CardLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
            {[
              { key: "primary", label: "Primary" },
              { key: "secondary", label: "Secondary" },
              { key: "accent", label: "Accent" },
              { key: "background", label: "Background" },
            ].map(({ key, label }) => (
              <div key={key}>
                <Text style={{ fontSize: 12, color: C.subText, display: "block", marginBottom: 4 }}>{label}</Text>
                <ColorPicker
                  value={colors[key as keyof typeof colors]}
                  onChange={(c) => setColors((p) => ({ ...p, [key]: c.toHexString() }))}
                  showText
                  style={{ width: "100%", justifyContent: "flex-start" }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div style={panelCard}>
        <CardLabel>Preview</CardLabel>
        <div style={{
          display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12,
          background: colors.background, borderRadius: 10,
          padding: 14, border: `1px solid ${C.border}`,
        }}>
          {[
            { color: colors.primary, label: "Primary" },
            { color: colors.secondary, label: "Secondary" },
            { color: colors.accent, label: "Accent" },
          ].map(({ color, label }) => (
            <div key={label} style={{ background: color, color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600 }}>
              {label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button type="primary" onClick={handleUpdateColors} loading={saving} icon={<CheckCircleOutlined />} style={{ borderRadius: 8 }}>
          Save Colors
        </Button>
      </div>
    </PanelStack>
  );

  const sections = useMemo<SettingSection[]>(() => [
    {
      key: "basic",
      label: "Basic Info",
      description: "Business name, contacts & account",
      icon: <IdcardOutlined />,
      color: "#3b82f6",
      bg: "#eff6ff",
      group: "Business",
      render: renderBasic,
    },
    {
      key: "branding",
      label: "Logo & Branding",
      description: "Logo and app colors",
      icon: <PictureOutlined />,
      color: "#8b5cf6",
      bg: "#f5f3ff",
      group: "Business",
      render: renderBranding,
    },
    {
      key: "vat",
      label: "VAT",
      description: "VAT rate & pricing for all branches",
      icon: <TagOutlined />,
      color: "#2563eb",
      bg: "#eff6ff",
      group: "Taxes",
      render: () => <VatPanel scope="business" />,
    },
    {
      key: "catering-levy",
      label: "Catering Levy",
      description: "Tourism levy for all branches",
      icon: <PercentageOutlined />,
      color: "#0d9488",
      bg: "#f0fdfa",
      group: "Taxes",
      render: () => <CateringLevyPanel scope="business" />,
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [tenant, colors, fileList, saving]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!tenantId) {
    return <Result status="404" title="Tenant ID not found" subTitle="Please make sure you're logged in." />;
  }

  if (isLoading) {
    return <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 8 }} /></div>;
  }

  if (!tenant) {
    return <Result status="404" title="Tenant not found" subTitle="The tenant you're looking for does not exist." />;
  }

  // Business summary at the top of the sidebar
  const summary = (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 10px 14px", margin: "0 4px 6px",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <TenantLogo url={tenant.tenant_logo?.url} size={40} />
      <div style={{ minWidth: 0 }}>
        <Text strong style={{ fontSize: 13, color: C.darkText, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {tenant.name}
        </Text>
        <StatusBadge status={tenant.subscription_status} />
      </div>
    </div>
  );

  return (
    <SettingsShell
      title="Settings"
      subtitle={`Business profile, branding and taxes for ${tenant.name}`}
      icon={<SettingOutlined />}
      sections={sections}
      activeKey={activeTab}
      onChange={setActiveTab}
      sidebarHeader={summary}
    />
  );
}

export default TenantSettings;
