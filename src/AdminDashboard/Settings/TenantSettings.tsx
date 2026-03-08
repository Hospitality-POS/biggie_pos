import { useEffect, useState } from "react";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  MailOutlined,
  PhoneOutlined,
  PictureOutlined,
  SettingOutlined,
  TagOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { PageContainer, ProCard } from "@ant-design/pro-components";
import {
  Button,
  ColorPicker,
  Form,
  Input,
  message,
  Radio,
  Result,
  Skeleton,
  Switch,
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

const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  orange: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
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

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={{
    fontSize: 10, fontWeight: 700, color: C.subText,
    textTransform: "uppercase", letterSpacing: "0.5px",
    display: "block", marginBottom: 10,
  }}>
    {children}
  </Text>
);

// ── Form section ──────────────────────────────────────────────────────────────
const FormSection: React.FC<{ label?: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{
    background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: 10, padding: "14px 14px 6px", marginBottom: 14,
  }}>
    {label && <SectionLabel>{label}</SectionLabel>}
    {children}
  </div>
);

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  active: { color: C.green, bg: "#f0fdf4", icon: <CheckCircleOutlined />, label: "Active" },
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
      padding: "3px 9px", textTransform: "uppercase",
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
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "6px 0", borderBottom: `1px solid ${C.border}`,
  }}>
    <Text style={{ fontSize: 11, color: C.subText }}>{label}</Text>
    <Text style={{ fontSize: 12, color: C.darkText, fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>
      {value || "—"}
    </Text>
  </div>
);

// ── Color preview swatch ──────────────────────────────────────────────────────
const ColorSwatch: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{
      width: 24, height: 24, borderRadius: 6,
      background: color, border: `1px solid ${C.border}`, flexShrink: 0,
    }} />
    <Text style={{ fontSize: 11, color: C.subText }}>{label}</Text>
    <Text style={{ fontSize: 11, color: C.darkText, fontFamily: "monospace", marginLeft: "auto" }}>{color}</Text>
  </div>
);

// ── Tab pill nav ──────────────────────────────────────────────────────────────
const TabNav: React.FC<{
  tabs: { key: string; label: React.ReactNode }[];
  active: string;
  onChange: (k: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div style={{
    display: "flex", gap: 6, flexWrap: "wrap",
    padding: "0 0 16px",
    borderBottom: `1px solid ${C.border}`,
    marginBottom: 20,
  }}>
    {tabs.map((t) => {
      const isActive = t.key === active;
      return (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            background: isActive ? C.primary : C.bg,
            color: isActive ? "#fff" : C.subText,
            border: `1px solid ${isActive ? C.primary : C.border}`,
            borderRadius: 8, padding: "7px 14px",
            fontSize: 12, fontWeight: isActive ? 700 : 500,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.15s",
          }}
        >
          {t.label}
        </button>
      );
    })}
  </div>
);

// ── Default colors ────────────────────────────────────────────────────────────
const DEFAULT_COLORS = {
  primary: "#6c1c2c",
  secondary: "#3b82f6",
  accent: "#8b5cf6",
  background: "#ffffff",
  text: "#0f172a",
};

// ── Main component ────────────────────────────────────────────────────────────
function TenantSettings() {
  const [form] = Form.useForm();
  const [colorForm] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [activeTab, setActiveTab] = useState("basic");

  const params = useParams();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const tenantId = params.id || getCurrentTenantId();

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: tenantDetails, isLoading, refetch } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: () => fetchTenantDetails(tenantId),
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

    form.setFieldsValue({
      name: t.name,
      email: t.email,
      phone: t.phone,
      vat_standard_rate: t.vat_standard_rate,
      vat_pricing_mode: t.vat_pricing_mode,
      is_vat_enabled: t.is_vat_enabled,
    });

    if (t.color_scheme) {
      const scheme = { ...DEFAULT_COLORS, ...t.color_scheme };
      setColors(scheme);
      colorForm.setFieldsValue(scheme);
    }
  }, [tenantDetails, form, colorForm]);

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

  const handleColorChange = (hex: string, type: string) => {
    setColors((p) => ({ ...p, [type]: hex }));
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

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!tenantId) {
    return (
      <PageContainer title="Tenant Settings">
        <ProCard><Result status="404" title="Tenant ID not found" subTitle="Please make sure you're logged in." /></ProCard>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer title="Tenant Settings">
        <ProCard><Skeleton active paragraph={{ rows: 6 }} /></ProCard>
      </PageContainer>
    );
  }

  if (!tenantDetails?.data) {
    return (
      <PageContainer title="Tenant Settings">
        <ProCard><Result status="404" title="Tenant not found" subTitle="The tenant you're looking for does not exist." /></ProCard>
      </PageContainer>
    );
  }

  const tenant = tenantDetails.data;
  const subName = typeof tenant.subscription_id === "object"
    ? `${tenant.subscription_id.name} — KES ${tenant.subscription_id.price}`
    : null;

  // ── Tab definitions ───────────────────────────────────────────────────────
  const TABS = [
    { key: "basic", label: <><SettingOutlined /> Basic Info</> },
    { key: "vat", label: <><TagOutlined /> VAT Config</> },
    { key: "branding", label: <><PictureOutlined /> Logo & Branding</> },
  ];

  return (
    <PageContainer
      title={
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: C.primaryLight, borderRadius: 8, padding: "4px 6px", color: C.primary, fontSize: 16, lineHeight: 1 }}>
            <SettingOutlined />
          </div>
          Tenant Settings
        </span>
      }
      subTitle="Manage your business configuration and branding"
      style={{ minHeight: "100vh" }}
      childrenContentStyle={{ padding: 0 }}
    >
      <div style={{ width: "100%", padding: "0 0 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Overview card ──────────────────────────────────────────────── */}
        <div style={{
          background: "#fff", border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "16px",
          width: "100%", boxSizing: "border-box",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
            {/* Logo */}
            <div style={{ flexShrink: 0 }}>
              {tenant.tenant_logo?.url ? (
                <img
                  src={tenant.tenant_logo.url}
                  alt="logo"
                  style={{
                    width: 64, height: 64, borderRadius: 12,
                    objectFit: "contain",
                    border: `2px solid ${C.border}`,
                  }}
                />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: 12,
                  background: C.primaryLight,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.primary, fontSize: 24,
                  border: `2px solid ${C.primary}20`,
                }}>
                  <UserOutlined />
                </div>
              )}
            </div>

            {/* Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <Text strong style={{ fontSize: 15, color: C.darkText }}>{tenant.name}</Text>
                <StatusBadge status={tenant.subscription_status} />
              </div>
              <Text style={{ fontSize: 12, color: C.subText, display: "block", marginBottom: 8 }}>
                {tenant.tenant_code}
              </Text>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {tenant.subscription_cycle && (
                  <span style={{ background: "#eff6ff", color: C.blue, borderRadius: 5, fontSize: 10, fontWeight: 600, padding: "2px 8px" }}>
                    {tenant.subscription_cycle}
                  </span>
                )}
                {subName && (
                  <span style={{ background: "#f5f3ff", color: "#8b5cf6", borderRadius: 5, fontSize: 10, fontWeight: 600, padding: "2px 8px" }}>
                    {subName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Meta rows */}
          <div style={{ marginTop: 14 }}>
            <InfoRow label="Business Type" value={tenant.business_type_name || (typeof tenant.business_type === "object" ? tenant.business_type?.name : null)} />
            <InfoRow label="Business Size" value={tenant.business_size} />
            <InfoRow label="Created" value={new Date(tenant.createdAt).toLocaleDateString()} />
            {tenant.next_billing_date && (
              <InfoRow label="Next Billing" value={new Date(tenant.next_billing_date).toLocaleDateString()} />
            )}
          </div>
        </div>

        {/* ── Settings tabs ───────────────────────────────────────────────── */}
        <div style={{
          background: "#fff", border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "16px 16px 20px",
          width: "100%", boxSizing: "border-box",
        }}>
          <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {/* ── Basic Info ─────────────────────────────────────────────── */}
          {activeTab === "basic" && (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdateBasic}
              disabled={updateMutation.isLoading}
            >
              <FormSection label="Business Identity">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
                  <div style={{ flex: "1 1 240px", minWidth: 0, paddingRight: isMobile ? 0 : 8 }}>
                    <Form.Item label="Business Name" name="name" rules={[{ required: true, message: "Required" }]} style={{ marginBottom: 12 }}>
                      <Input prefix={<UserOutlined style={{ color: C.subText }} />} placeholder="Enter business name" style={{ borderRadius: 8, width: "100%" }} />
                    </Form.Item>
                  </div>
                  <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                    <Form.Item label="Email Address" name="email" rules={[{ required: true, message: "Required" }, { type: "email", message: "Invalid email" }]} style={{ marginBottom: 12 }}>
                      <Input prefix={<MailOutlined style={{ color: C.subText }} />} placeholder="Enter email address" style={{ borderRadius: 8, width: "100%" }} />
                    </Form.Item>
                  </div>
                  <div style={{ flex: "1 1 240px", minWidth: 0, paddingRight: isMobile ? 0 : 8 }}>
                    <Form.Item label="Phone Number" name="phone" rules={[{ required: true, message: "Required" }]} style={{ marginBottom: 6 }}>
                      <Input prefix={<PhoneOutlined style={{ color: C.subText }} />} placeholder="Enter phone number" style={{ borderRadius: 8, width: "100%" }} />
                    </Form.Item>
                  </div>
                </div>
              </FormSection>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updateMutation.isLoading}
                  icon={<CheckCircleOutlined />}
                  style={{ borderRadius: 8, background: C.primary, borderColor: C.primary }}
                >
                  Save Basic Info
                </Button>
              </div>
            </Form>
          )}

          {/* ── VAT Config ─────────────────────────────────────────────── */}
          {activeTab === "vat" && (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdateBasic}
              disabled={updateMutation.isLoading}
            >
              <FormSection label="VAT Status">
                <Form.Item name="is_vat_enabled" label="Enable VAT" valuePropName="checked" style={{ marginBottom: 6 }}>
                  <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
                </Form.Item>
              </FormSection>

              <FormSection label="Pricing Mode">
                <Form.Item name="vat_pricing_mode" label="Selling price of items" rules={[{ required: true }]} style={{ marginBottom: 6 }}>
                  <Radio.Group>
                    <Radio value="INCLUSIVE">Tax Inclusive</Radio>
                    <Radio value="EXCLUSIVE">Tax Exclusive</Radio>
                  </Radio.Group>
                </Form.Item>
              </FormSection>

              <FormSection label="VAT Rate">
                <Form.Item
                  name="vat_standard_rate"
                  label="Standard Rate"
                  rules={[{ required: true, message: "Required" }]}
                  style={{ marginBottom: 6 }}
                  extra={<Text style={{ fontSize: 11, color: C.subText }}>e.g. 0.16 for 16%</Text>}
                >
                  <Input
                    prefix={<TagOutlined style={{ color: C.subText }} />}
                    placeholder="0.16"
                    type="number" step="0.01" min="0" max="1"
                    style={{ borderRadius: 8, maxWidth: 240 }}
                  />
                </Form.Item>
              </FormSection>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updateMutation.isLoading}
                  icon={<CheckCircleOutlined />}
                  style={{ borderRadius: 8, background: C.primary, borderColor: C.primary }}
                >
                  Save Tax Settings
                </Button>
              </div>
            </Form>
          )}

          {/* ── Logo & Branding ────────────────────────────────────────── */}
          {activeTab === "branding" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Logo + Colors — stack on mobile, side by side on desktop */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>

                {/* Logo upload */}
                <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                  <FormSection label="Business Logo">
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px", background: "#fff",
                      border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 10,
                    }}>
                      {tenant.tenant_logo?.url ? (
                        <img
                          src={tenant.tenant_logo.url}
                          alt="logo"
                          style={{ width: 56, height: 56, borderRadius: 8, objectFit: "contain", border: `1px solid ${C.border}`, flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 56, height: 56, borderRadius: 8, flexShrink: 0,
                          background: C.primaryLight, display: "flex",
                          alignItems: "center", justifyContent: "center",
                          color: C.primary, fontSize: 22,
                        }}>
                          <PictureOutlined />
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>
                          {tenant.tenant_logo?.filename || "No logo uploaded"}
                        </Text>
                        {tenant.tenant_logo?.size && (
                          <Text style={{ fontSize: 11, color: C.subText }}>
                            {(tenant.tenant_logo.size / 1024).toFixed(1)} KB
                          </Text>
                        )}
                      </div>
                    </div>

                    <Upload
                      accept="image/*"
                      fileList={fileList}
                      beforeUpload={handleBeforeUpload}
                      disabled={updateMutation.isLoading}
                      maxCount={1}
                      showUploadList={false}
                      style={{ width: "100%" }}
                    >
                      <Button
                        block
                        icon={<UploadOutlined />}
                        loading={updateMutation.isLoading}
                        style={{ borderRadius: 8, height: 44, borderStyle: "dashed", borderColor: C.primary, color: C.primary, width: "100%" }}
                      >
                        {updateMutation.isLoading ? "Uploading..." : "Upload New Logo"}
                      </Button>
                    </Upload>
                    <Text style={{ fontSize: 11, color: C.subText, display: "block", marginTop: 8 }}>
                      PNG, JPG, SVG, WebP · Max 5MB
                    </Text>
                  </FormSection>
                </div>

                {/* Color scheme */}
                <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                  <FormSection label="Color Scheme">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
                      {[
                        { key: "primary", label: "Primary" },
                        { key: "secondary", label: "Secondary" },
                        { key: "accent", label: "Accent" },
                        { key: "background", label: "Background" },
                      ].map(({ key, label }) => (
                        <div key={key} style={{ flex: "1 1 120px", minWidth: 0, paddingRight: 8 }}>
                          <Form.Item label={label} style={{ marginBottom: 10 }}>
                            <ColorPicker
                              value={colors[key as keyof typeof colors]}
                              onChange={(c) => handleColorChange(c.toHexString(), key)}
                              showText
                              style={{ width: "100%" }}
                            />
                          </Form.Item>
                        </div>
                      ))}
                    </div>

                    <Button
                      block type="primary"
                      onClick={handleUpdateColors}
                      loading={updateMutation.isLoading}
                      icon={<CheckCircleOutlined />}
                      style={{ borderRadius: 8, background: C.primary, borderColor: C.primary, marginTop: 4 }}
                    >
                      Save Colors
                    </Button>
                  </FormSection>
                </div>
              </div>

              {/* Color preview */}
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <SectionLabel>Preview</SectionLabel>
                <div style={{
                  display: "flex", gap: 10, flexWrap: "wrap",
                  background: colors.background, borderRadius: 8,
                  padding: "14px", border: `1px solid ${C.border}`,
                  marginBottom: 12,
                }}>
                  {[
                    { color: colors.primary, label: "Primary" },
                    { color: colors.secondary, label: "Secondary" },
                    { color: colors.accent, label: "Accent" },
                  ].map(({ color, label }) => (
                    <div key={label} style={{
                      background: color, color: "#fff",
                      borderRadius: 7, padding: "8px 16px",
                      fontSize: 12, fontWeight: 600,
                    }}>
                      {label}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <ColorSwatch color={colors.primary} label="Primary" />
                  <ColorSwatch color={colors.secondary} label="Secondary" />
                  <ColorSwatch color={colors.accent} label="Accent" />
                  <ColorSwatch color={colors.background} label="Background" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

export default TenantSettings;