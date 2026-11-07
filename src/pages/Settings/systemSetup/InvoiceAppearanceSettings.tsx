import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  ColorPicker,
  Form,
  Input,
  Segmented,
  Slider,
  Space,
  Spin,
  Switch,
  Typography,
  Upload,
  message,
} from "antd";
import { DeleteOutlined, FileTextOutlined, UploadOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchShop,
  removeShopInvoiceWatermark,
  updateShopInvoiceSettings,
  uploadShopInvoiceWatermark,
  type ShopInvoiceSettings,
} from "@services/shops";
import {
  InvoiceWatermark,
  ServicesBanner,
  type SystemDetails,
} from "@pages/OrderManagement/Invoices/InvoiceTemplates";

const { Text } = Typography;

const DEFAULTS: Required<Omit<ShopInvoiceSettings, "watermark_image_url">> & { watermark_image_url: string | null } = {
  watermark_enabled: false,
  watermark_source: "logo",
  watermark_image_url: null,
  watermark_opacity: 0.08,
  watermark_size: 70,
  services_enabled: false,
  services_title: "We Supply and Service",
  services_heading: "",
  services: [],
  services_address: "",
  website: "",
  primary_color: "#1F5C99",
  secondary_color: "#F7941D",
};

const tenantLogoUrl = (): string | undefined => {
  try {
    const t = JSON.parse(localStorage.getItem("tenant") || "null");
    return t?.tenant_logo?.url || undefined;
  } catch {
    return undefined;
  }
};

const MAX_MB = 5;

// A switch row: label + description on the left, toggle on the right
const ToggleRow: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  loading?: boolean;
  onChange: (v: boolean) => void;
}> = ({ title, description, checked, loading, onChange }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
    <div>
      <Text strong>{title}</Text>
      <div><Text type="secondary" style={{ fontSize: 12 }}>{description}</Text></div>
    </div>
    <Switch checked={checked} loading={loading} onChange={onChange} />
  </div>
);

const InvoiceAppearanceSettings: React.FC = () => {
  const shopId = localStorage.getItem("shopId");
  const queryClient = useQueryClient();
  const logoUrl = tenantLogoUrl();

  const { data: shopData, isLoading } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => fetchShop(shopId!),
    enabled: !!shopId,
  });

  const [s, setS] = useState(DEFAULTS);
  const [servicesText, setServicesText] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const saved = (shopData?.invoice_settings || {}) as ShopInvoiceSettings;
    const merged = { ...DEFAULTS, ...saved };
    setS(merged);
    setServicesText((merged.services || []).join("\n"));
  }, [shopData]);

  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) => setS((p) => ({ ...p, [k]: v }));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["shop", shopId] });

  const save = async (patch: ShopInvoiceSettings, key: string, okMsg = "Invoice appearance saved") => {
    if (!shopId) return;
    setSavingKey(key);
    try {
      await updateShopInvoiceSettings(shopId, patch);
      await refresh();
      message.success(okMsg);
    } catch {
      message.error("Failed to save invoice appearance");
      refresh();
    } finally {
      setSavingKey(null);
    }
  };

  const parsedServices = useMemo(
    () => servicesText.split("\n").map((x) => x.trim()).filter(Boolean),
    [servicesText]
  );

  const handleUpload = async (file: File) => {
    if (!shopId) return false;
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      message.error("Use a PNG, JPEG or WebP image");
      return false;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      message.error(`Image must be ${MAX_MB}MB or smaller`);
      return false;
    }
    setUploading(true);
    try {
      await uploadShopInvoiceWatermark(shopId, file);
      await refresh();
      message.success("Watermark image uploaded");
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Failed to upload watermark image");
    } finally {
      setUploading(false);
    }
    return false; // handled manually — stop antd's own upload
  };

  const handleRemoveImage = async () => {
    if (!shopId) return;
    setUploading(true);
    try {
      await removeShopInvoiceWatermark(shopId);
      await refresh();
      message.success("Watermark image removed");
    } catch {
      message.error("Failed to remove watermark image");
    } finally {
      setUploading(false);
    }
  };

  // Settings as the invoice templates will see them — drives the previews
  const previewSys: SystemDetails = {
    tenant_logo: logoUrl ? { url: logoUrl } : undefined,
    invoice_settings: { ...s, services: parsedServices },
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  const customUrl = s.watermark_image_url;
  const watermarkMissing =
    s.watermark_enabled && (s.watermark_source === "custom" ? !customUrl : !logoUrl);

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={5} style={{ marginBottom: 4 }}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        Invoice Appearance
      </Typography.Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 20, fontSize: 13 }}>
        Applies to all A4 invoice templates under Orders → Invoices. The Letterhead template also uses the brand colours below.
      </Text>

      {/* ── Watermark ─────────────────────────────────────────── */}
      <Card size="small" title="Watermark" style={{ maxWidth: 760, marginBottom: 16 }}>
        <ToggleRow
          title={s.watermark_enabled ? "Watermark is on" : "Watermark is off"}
          description="Print a faded image across the middle of every invoice."
          checked={s.watermark_enabled}
          loading={savingKey === "watermark_enabled"}
          onChange={(v) => {
            set("watermark_enabled", v);
            save({ watermark_enabled: v }, "watermark_enabled", v ? "Watermark enabled" : "Watermark disabled");
          }}
        />

        {s.watermark_enabled && (
          <div style={{ marginTop: 16, display: "flex", gap: 24, flexWrap: "wrap" }}>
            <Form layout="vertical" style={{ flex: "1 1 320px" }}>
              <Form.Item label="Watermark image">
                <Segmented
                  value={s.watermark_source}
                  onChange={(v) => {
                    const src = v as "logo" | "custom";
                    set("watermark_source", src);
                    save({ watermark_source: src }, "watermark_source");
                  }}
                  options={[
                    { label: "Business logo", value: "logo" },
                    { label: "Another image", value: "custom" },
                  ]}
                />
              </Form.Item>

              {s.watermark_source === "logo" && !logoUrl && (
                <Text type="warning" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                  No business logo is set, so nothing will print. Upload another image instead.
                </Text>
              )}

              {s.watermark_source === "custom" && (
                <Form.Item extra={`PNG, JPEG or WebP, up to ${MAX_MB}MB. A transparent PNG looks best.`}>
                  <Space wrap>
                    <Upload
                      accept="image/png,image/jpeg,image/webp"
                      showUploadList={false}
                      beforeUpload={handleUpload}
                      disabled={uploading}
                    >
                      <Button icon={<UploadOutlined />} loading={uploading}>
                        {customUrl ? "Replace image" : "Upload image"}
                      </Button>
                    </Upload>
                    {customUrl && (
                      <Button danger icon={<DeleteOutlined />} onClick={handleRemoveImage} disabled={uploading}>
                        Remove
                      </Button>
                    )}
                  </Space>
                </Form.Item>
              )}

              <Form.Item label={`Strength (${Math.round((s.watermark_opacity ?? 0.08) * 100)}%)`}>
                <Slider
                  min={2}
                  max={50}
                  value={Math.round((s.watermark_opacity ?? 0.08) * 100)}
                  onChange={(v: number) => set("watermark_opacity", v / 100)}
                  onChangeComplete={(v: number) => save({ watermark_opacity: v / 100 }, "watermark_opacity")}
                  tooltip={{ formatter: (v) => `${v}%` }}
                />
              </Form.Item>
              <Form.Item label={`Size (${s.watermark_size}% of page width)`} style={{ marginBottom: 0 }}>
                <Slider
                  min={20}
                  max={100}
                  value={s.watermark_size}
                  onChange={(v: number) => set("watermark_size", v)}
                  onChangeComplete={(v: number) => save({ watermark_size: v }, "watermark_size")}
                  tooltip={{ formatter: (v) => `${v}%` }}
                />
              </Form.Item>
            </Form>

            {/* Mini A4 preview */}
            <div style={{ flex: "0 0 170px" }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Preview</Text>
              <div
                style={{
                  position: "relative",
                  width: 170,
                  height: 240,
                  marginTop: 6,
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 4,
                  overflow: "hidden",
                  padding: 14,
                  boxSizing: "border-box",
                }}
              >
                {[90, 60, 75, 100, 100, 100, 100, 55, 40].map((w, i) => (
                  <div key={i} style={{ height: 5, width: `${w}%`, background: "#cbd5e1", borderRadius: 2, marginBottom: 12 }} />
                ))}
                <InvoiceWatermark sys={previewSys} />
                {watermarkMissing && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#94a3b8", textAlign: "center", padding: 12 }}>
                    No image yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Services banner ───────────────────────────────────── */}
      <Card size="small" title="Services Banner" style={{ maxWidth: 760, marginBottom: 16 }}>
        <ToggleRow
          title={s.services_enabled ? "Services are shown on invoices" : "Services are not shown on invoices"}
          description="Print the services you offer in a banner at the bottom of every invoice."
          checked={s.services_enabled}
          loading={savingKey === "services_enabled"}
          onChange={(v) => {
            set("services_enabled", v);
            save({ services_enabled: v }, "services_enabled", v ? "Services banner enabled" : "Services banner disabled");
          }}
        />

        {s.services_enabled && (
          <Form layout="vertical" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Form.Item label="Title" style={{ flex: "1 1 220px" }}>
                <Input
                  value={s.services_title}
                  onChange={(e) => set("services_title", e.target.value)}
                  placeholder="e.g. We Supply and Service"
                  maxLength={60}
                />
              </Form.Item>
              <Form.Item label="Heading" style={{ flex: "1 1 220px" }}>
                <Input
                  value={s.services_heading}
                  onChange={(e) => set("services_heading", e.target.value)}
                  placeholder="e.g. Lifts & Escalators"
                  maxLength={60}
                />
              </Form.Item>
            </div>
            <Form.Item label="Services" extra="One per line. More than four are split into two columns.">
              <Input.TextArea
                value={servicesText}
                onChange={(e) => setServicesText(e.target.value)}
                autoSize={{ minRows: 4, maxRows: 10 }}
                placeholder={"Hospital Elevators\nDumbwaiter\nFreight Elevator"}
              />
            </Form.Item>
            <Form.Item label="Address line" extra="Printed in a bar under the services. Leave blank to hide.">
              <Input
                value={s.services_address}
                onChange={(e) => set("services_address", e.target.value)}
                placeholder="e.g. Watermark Business Park, Karen, Ground Floor, Unit 4."
                maxLength={140}
              />
            </Form.Item>

            <Text type="secondary" style={{ fontSize: 12 }}>Preview</Text>
            <div style={{ marginTop: 6, marginBottom: 16, border: "1px solid #e2e8f0", padding: 8, background: "#fff" }}>
              <ServicesBanner sys={previewSys} />
            </div>

            <Button
              type="primary"
              loading={savingKey === "services"}
              onClick={() =>
                save(
                  {
                    services_title: s.services_title,
                    services_heading: s.services_heading,
                    services: parsedServices,
                    services_address: s.services_address,
                  },
                  "services",
                  "Services banner saved"
                )
              }
            >
              Save services
            </Button>
          </Form>
        )}
      </Card>

      {/* ── Letterhead ────────────────────────────────────────── */}
      <Card size="small" title="Letterhead & Brand Colours" style={{ maxWidth: 760 }}>
        <Form layout="vertical">
          <Form.Item label="Website" extra="Shown in the Letterhead template header next to your phone and email.">
            <Input
              value={s.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="e.g. www.example.com"
              maxLength={100}
            />
          </Form.Item>
          <Space size={24} wrap style={{ marginBottom: 16 }}>
            <div>
              <Text style={{ display: "block", marginBottom: 6 }}>Primary colour</Text>
              <ColorPicker
                value={s.primary_color}
                onChange={(c) => set("primary_color", c.toHexString())}
                showText
              />
            </div>
            <div>
              <Text style={{ display: "block", marginBottom: 6 }}>Accent colour</Text>
              <ColorPicker
                value={s.secondary_color}
                onChange={(c) => set("secondary_color", c.toHexString())}
                showText
              />
            </div>
          </Space>
          <div>
            <Button
              type="primary"
              loading={savingKey === "letterhead"}
              onClick={() =>
                save(
                  { website: s.website, primary_color: s.primary_color, secondary_color: s.secondary_color },
                  "letterhead",
                  "Letterhead saved"
                )
              }
            >
              Save letterhead
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default InvoiceAppearanceSettings;
