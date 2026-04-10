import React, { useEffect, useState } from "react";
import {
    Alert, Button, Card, Col, Divider, Form,
    InputNumber, Row, Select, Skeleton, Space,
    Switch, Tag, Tooltip, Typography,
} from "antd";
import {
    PrinterOutlined, SaveOutlined, InfoCircleOutlined,
    LockOutlined, ReloadOutlined, CheckCircleOutlined,
} from "@ant-design/icons";
import { fetchAllShops, updateShopPrintSettings } from "@services/shops";
import { useAppSelector } from "src/store";

const { Text, Title } = Typography;

const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    border: "#e2e8f0",
    subText: "#64748b",
    bg: "#f8fafc",
};

interface PrintSettings {
    enabled: boolean;
    global_print_limit: number | null;
    per_document_type_limits: {
        bill: number | null;
        receipt: number | null;
        invoice: number | null;
        quotation: number | null;
    };
    allow_reprint: boolean;
    reprint_requires_admin: boolean;
    reprint_requires_reason: boolean;
    save_on_print: boolean;
}

const DEFAULT_SETTINGS: PrintSettings = {
    enabled: false,
    global_print_limit: null,
    per_document_type_limits: { bill: null, receipt: null, invoice: null, quotation: null },
    allow_reprint: true,
    reprint_requires_admin: false,
    reprint_requires_reason: false,
    save_on_print: true,
};

const LimitInput: React.FC<{
    value?: number | null;
    onChange?: (v: number | null) => void;
    placeholder?: string;
}> = ({ value, onChange, placeholder = "Unlimited" }) => (
    <InputNumber
        min={1}
        max={999}
        value={value ?? undefined}
        onChange={(v) => onChange?.(v ?? null)}
        placeholder={placeholder}
        style={{ width: "100%" }}
        addonAfter={
            value ? (
                <Tooltip title="Clear (unlimited)">
                    <Button
                        type="link" size="small"
                        style={{ padding: 0, color: C.subText }}
                        onClick={() => onChange?.(null)}
                    >
                        ×
                    </Button>
                </Tooltip>
            ) : null
        }
    />
);

const PrintSettingsTab: React.FC = () => {
    const { user } = useAppSelector((s) => s.auth);
    const [form] = Form.useForm<PrintSettings>();
    const [shops, setShops] = useState<any[]>([]);
    const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [allowReprint, setAllowReprint] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await fetchAllShops();
                const list = Array.isArray(data) ? data : data?.data || [];
                setShops(list);
                // Auto-select if single shop or user has a shop
                if (list.length === 1) {
                    selectShop(list[0]);
                } else if (user?.shop_id) {
                    const match = list.find((s: any) => s._id === user.shop_id);
                    if (match) selectShop(match);
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const selectShop = (shop: any) => {
        setSelectedShopId(shop._id);
        const s: PrintSettings = {
            enabled: shop.print_settings?.enabled ?? false,
            global_print_limit: shop.print_settings?.global_print_limit ?? null,
            per_document_type_limits: {
                bill: shop.print_settings?.per_document_type_limits?.bill ?? null,
                receipt: shop.print_settings?.per_document_type_limits?.receipt ?? null,
                invoice: shop.print_settings?.per_document_type_limits?.invoice ?? null,
                quotation: shop.print_settings?.per_document_type_limits?.quotation ?? null,
            },
            allow_reprint: shop.print_settings?.allow_reprint ?? true,
            reprint_requires_admin: shop.print_settings?.reprint_requires_admin ?? false,
            reprint_requires_reason: shop.print_settings?.reprint_requires_reason ?? false,
            save_on_print: shop.print_settings?.save_on_print ?? true,
        };
        form.setFieldsValue(s);
        setEnabled(s.enabled);
        setAllowReprint(s.allow_reprint);
    };

    const handleSave = async () => {
        if (!selectedShopId) return;
        const values = await form.validateFields();
        setSaving(true);
        try {
            const ok = await updateShopPrintSettings(selectedShopId, values);
            if (ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
                // Refresh shops list to reflect saved state
                const data = await fetchAllShops();
                const list = Array.isArray(data) ? data : data?.data || [];
                setShops(list);
                const updated = list.find((s: any) => s._id === selectedShopId);
                if (updated) selectShop(updated);
            }
        } finally {
            setSaving(false);
        }
    };

    const selectedShop = shops.find((s) => s._id === selectedShopId);

    return (
        <div style={{ padding: "16px 0" }}>
            {/* ── Shop selector ──────────────────────────────────────────────── */}
            {shops.length > 1 && (
                <Card
                    size="small"
                    style={{ marginBottom: 16, borderRadius: 10, border: `1px solid ${C.border}` }}
                    bodyStyle={{ padding: "12px 16px" }}
                >
                    <Space align="center">
                        <Text style={{ fontSize: 13, color: C.subText }}>Configure settings for:</Text>
                        <Select
                            style={{ minWidth: 200 }}
                            placeholder="Select shop"
                            value={selectedShopId}
                            onChange={(id) => {
                                const shop = shops.find((s) => s._id === id);
                                if (shop) selectShop(shop);
                            }}
                            options={shops.map((s) => ({ label: s.name, value: s._id }))}
                        />
                    </Space>
                </Card>
            )}

            {loading ? (
                <Skeleton active paragraph={{ rows: 8 }} />
            ) : !selectedShopId ? (
                <Alert
                    type="info" showIcon
                    message="Select a shop above to configure its print settings."
                    style={{ borderRadius: 8 }}
                />
            ) : (
                <Form form={form} layout="vertical" initialValues={DEFAULT_SETTINGS}>
                    {/* ── Master switch ─────────────────────────────────────────── */}
                    <Card
                        size="small"
                        style={{ marginBottom: 16, borderRadius: 10, border: `1px solid ${C.border}` }}
                        bodyStyle={{ padding: "14px 16px" }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                                <Text strong style={{ fontSize: 14 }}>Enable Print Controls</Text>
                                <br />
                                <Text style={{ fontSize: 12, color: C.subText }}>
                                    When off, printing is unrestricted and nothing is tracked.
                                </Text>
                            </div>
                            <Form.Item name="enabled" valuePropName="checked" style={{ margin: 0 }}>
                                <Switch
                                    checkedChildren="On"
                                    unCheckedChildren="Off"
                                    style={{ background: enabled ? C.primary : undefined }}
                                    onChange={(v) => setEnabled(v)}
                                />
                            </Form.Item>
                        </div>
                    </Card>

                    {enabled && (
                        <>
                            {/* ── Save on print ──────────────────────────────────────── */}
                            <Card
                                size="small"
                                style={{ marginBottom: 16, borderRadius: 10, border: `1px solid ${C.border}` }}
                                bodyStyle={{ padding: "14px 16px" }}
                            >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div>
                                        <Text strong style={{ fontSize: 13 }}>Save document on every print</Text>
                                        <br />
                                        <Text style={{ fontSize: 12, color: C.subText }}>
                                            Stores a snapshot of each document for audit and reprint history.
                                        </Text>
                                    </div>
                                    <Form.Item name="save_on_print" valuePropName="checked" style={{ margin: 0 }}>
                                        <Switch checkedChildren="Yes" unCheckedChildren="No" style={{ background: undefined }} />
                                    </Form.Item>
                                </div>
                            </Card>

                            {/* ── Print limits ───────────────────────────────────────── */}
                            <Card
                                size="small"
                                title={
                                    <Space>
                                        <PrinterOutlined style={{ color: C.primary }} />
                                        <Text strong style={{ fontSize: 13 }}>Print Limits</Text>
                                        <Tooltip title="Set how many times a document can be printed. Leave blank for unlimited.">
                                            <InfoCircleOutlined style={{ color: C.subText, fontSize: 12 }} />
                                        </Tooltip>
                                    </Space>
                                }
                                style={{ marginBottom: 16, borderRadius: 10, border: `1px solid ${C.border}` }}
                                bodyStyle={{ padding: "14px 16px" }}
                            >
                                <Form.Item
                                    name="global_print_limit"
                                    label={
                                        <Space>
                                            <Text style={{ fontSize: 13 }}>Global limit (all document types)</Text>
                                            <Tag style={{ fontSize: 10, borderRadius: 4 }}>Fallback</Tag>
                                        </Space>
                                    }
                                    extra="Applied when no per-type limit is set. Leave blank for unlimited."
                                >
                                    <LimitInput />
                                </Form.Item>

                                <Divider style={{ margin: "12px 0" }}>
                                    <Text style={{ fontSize: 11, color: C.subText }}>Per document type (overrides global)</Text>
                                </Divider>

                                <Row gutter={[12, 0]}>
                                    {(["bill", "receipt", "invoice", "quotation"] as const).map((type) => (
                                        <Col span={12} key={type}>
                                            <Form.Item
                                                name={["per_document_type_limits", type]}
                                                label={<Text style={{ fontSize: 12, textTransform: "capitalize" }}>{type}</Text>}
                                            >
                                                <LimitInput placeholder="Unlimited" />
                                            </Form.Item>
                                        </Col>
                                    ))}
                                </Row>
                            </Card>

                            {/* ── Reprint settings ───────────────────────────────────── */}
                            <Card
                                size="small"
                                title={
                                    <Space>
                                        <LockOutlined style={{ color: C.primary }} />
                                        <Text strong style={{ fontSize: 13 }}>Reprint Controls</Text>
                                    </Space>
                                }
                                style={{ marginBottom: 16, borderRadius: 10, border: `1px solid ${C.border}` }}
                                bodyStyle={{ padding: "14px 16px" }}
                            >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                                    <div>
                                        <Text strong style={{ fontSize: 13 }}>Allow reprinting</Text>
                                        <br />
                                        <Text style={{ fontSize: 12, color: C.subText }}>If off, each document can only be printed once.</Text>
                                    </div>
                                    <Form.Item name="allow_reprint" valuePropName="checked" style={{ margin: 0 }}>
                                        <Switch
                                            checkedChildren="Yes" unCheckedChildren="No"
                                            onChange={(v) => setAllowReprint(v)}
                                        />
                                    </Form.Item>
                                </div>

                                {allowReprint && (
                                    <>
                                        <Divider style={{ margin: "0 0 12px" }} />
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                            <div>
                                                <Text style={{ fontSize: 13 }}>Require reason for reprint</Text>
                                                <br />
                                                <Text style={{ fontSize: 12, color: C.subText }}>Staff must enter a reason before reprinting.</Text>
                                            </div>
                                            <Form.Item name="reprint_requires_reason" valuePropName="checked" style={{ margin: 0 }}>
                                                <Switch checkedChildren="Yes" unCheckedChildren="No" />
                                            </Form.Item>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div>
                                                <Text style={{ fontSize: 13 }}>Require admin approval</Text>
                                                <br />
                                                <Text style={{ fontSize: 12, color: C.subText }}>Only admins can authorize a reprint.</Text>
                                            </div>
                                            <Form.Item name="reprint_requires_admin" valuePropName="checked" style={{ margin: 0 }}>
                                                <Switch checkedChildren="Yes" unCheckedChildren="No" />
                                            </Form.Item>
                                        </div>
                                    </>
                                )}
                            </Card>
                        </>
                    )}

                    {/* ── Save button ────────────────────────────────────────────── */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                        {saved && (
                            <Tag
                                icon={<CheckCircleOutlined />}
                                color="success"
                                style={{ display: "flex", alignItems: "center", gap: 4, borderRadius: 6, padding: "4px 10px", fontSize: 12 }}
                            >
                                Saved
                            </Tag>
                        )}
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={saving}
                            onClick={handleSave}
                            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}
                        >
                            Save Print Settings
                        </Button>
                    </div>
                </Form>
            )}
        </div>
    );
};

export default PrintSettingsTab;