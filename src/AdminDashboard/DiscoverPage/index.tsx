import React, { useState } from "react";
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Col,
    Divider,
    Form,
    Input,
    Modal,
    Row,
    Space,
    Switch,
    Typography,
} from "antd";
import {
    ApiOutlined,
    CalculatorOutlined,
    CheckCircleOutlined,
    CheckOutlined,
    CreditCardOutlined,
    FileProtectOutlined,
    InfoCircleOutlined,
    LockOutlined,
    PoweroffOutlined,
    PlusOutlined,
    RocketOutlined,
    TeamOutlined,
    ThunderboltOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
    fetchTenantDetails,
    enableAccounting,
    disableAccounting,
    enablePosIntegration,
    disablePosIntegration,
    getCurrentTenantId,
} from "@services/tenants";
import pesapalApi from "@services/pesapalApi";

const { Text, Title, Paragraph } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    orange: "#f59e0b",
    red: "#ef4444",
    blue: "#3b82f6",
    indigo: "#6366f1",
    purple: "#8b5cf6",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

// ── Integrations data ─────────────────────────────────────────────────────────
const INTEGRATIONS = [
    {
        id: "relia_pos",
        name: "Base Store",
        category: "Point of Sale",
        description: "Smart POS for seamless sales, inventory, and customer management.",
        longDescription:
            "Relia POS enables businesses to manage sales, handle shift operations, send notifications, and sync data in real-time with Relia Accounting and other Relia Suite products.",
        features: [
            "Sales",
            "Shift Management",
            "Notifications",
            "Inventory Management",
            "Customer Profiles",
            "Multi-branch Support",
            "Reports Dashboard",
        ],
        benefits: [
            "Faster checkouts",
            "Accurate stock levels",
            "Better customer experience",
            "Centralized reporting",
        ],
        pricing: "KES 3,000/month",
        setupTime: "2 minutes",
        status: "available",
        icon: CreditCardOutlined,
        color: C.blue,
        tags: ["Relia Suite", "Popular", "POS"],
    },
    {
        id: "relia_accounting",
        name: "Base Pesa",
        category: "Accounting & Finance",
        description: "Complete accounting solution auto-integrated with your POS.",
        longDescription:
            "Comprehensive accounting for Relia POS. Auto-sync sales, track expenses, and generate professional financial reports.",
        features: [
            "Auto POS Sync",
            "Chart of Accounts",
            "Double-Entry Bookkeeping",
            "Financial Reports",
            "Bank Reconciliation",
            "Multi-user Access",
        ],
        benefits: [
            "Eliminate manual entry",
            "Real-time visibility",
            "Professional statements",
            "Better cash flow",
            "Tax-ready reports",
        ],
        pricing: "KES 2,000/month",
        setupTime: "2 minutes",
        status: "available",
        icon: CalculatorOutlined,
        color: C.green,
        tags: ["Relia Suite", "Auto-sync"],
    },
    {
        id: "relia_payroll",
        name: "Base Team",
        category: "Human Resource & Payroll",
        description: "Automate salary calculations, payslips, and statutory deductions.",
        longDescription:
            "Relia Payroll helps you manage employee payments, statutory compliance (NHIF, NSSF, PAYE), and generate detailed reports seamlessly integrated with Relia Accounting.",
        features: [
            "Payslip Generation",
            "NHIF/NSSF/PAYE Automation",
            "Leave Management",
            "Employee Database",
            "Integration with Accounting",
        ],
        benefits: [
            "Accurate payments",
            "Full compliance",
            "Reduced manual work",
            "Easy reporting",
            "HR efficiency",
        ],
        pricing: "Coming Soon",
        setupTime: "N/A",
        status: "coming_soon",
        icon: FileProtectOutlined,
        color: C.orange,
        tags: ["Relia Suite", "Coming Soon"],
    },
    {
        id: "relia_clients",
        name: "Base Clients",
        category: "Customer Relationship",
        description: "Manage clients, loyalty programs, and personalized engagement.",
        longDescription:
            "Base Clients helps you manage customer data, track purchases, and reward loyalty with points and special offers across all your stores.",
        features: [
            "Client Database",
            "Loyalty Programs",
            "Reward Points Tracking",
            "Purchase History",
            "Integration with POS",
        ],
        benefits: [
            "Improved customer retention",
            "Boost repeat sales",
            "Personalized promotions",
            "Better customer insights",
        ],
        pricing: "KES 1,500/month",
        setupTime: "N/A",
        status: "coming_soon",
        icon: TeamOutlined,
        color: C.purple,
        tags: ["Relia Suite", "CRM", "Coming Soon"],
    },
];

// ── App refresh helper ────────────────────────────────────────────────────────
const triggerAppRefresh = (queryClient: any) => {
    queryClient.clear();
    setTimeout(() => window.location.reload(), 800);
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

// ── Feature list ──────────────────────────────────────────────────────────────
const FeatureList: React.FC<{ items: string[]; color: string }> = ({ items, color }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: color + "18", color, fontSize: 9,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                    <CheckOutlined />
                </span>
                <Text style={{ fontSize: 12, color: C.darkText }}>{item}</Text>
            </div>
        ))}
    </div>
);

// ── Integration card ──────────────────────────────────────────────────────────
const IntegrationCard: React.FC<{
    integration: (typeof INTEGRATIONS)[0];
    isEnabled: boolean;
    onEnable: () => void;
    onDisable: () => void;
    onLearnMore: () => void;
    enableLoading?: boolean;
    disableLoading?: boolean;
}> = ({ integration, isEnabled, onEnable, onDisable, onLearnMore, enableLoading, disableLoading }) => {
    const Icon = integration.icon;
    const isComingSoon = integration.status === "coming_soon";

    return (
        <Card
            style={{
                height: "100%", borderRadius: 14,
                border: isEnabled ? `1.5px solid ${integration.color}` : `1px solid ${C.border}`,
                boxShadow: isEnabled ? `0 4px 20px ${integration.color}20` : "0 1px 4px rgba(0,0,0,0.04)",
                background: isEnabled ? `${integration.color}03` : "#fff",
                transition: "box-shadow 0.2s, border-color 0.2s",
            }}
            bodyStyle={{ padding: "18px 20px", height: "100%", display: "flex", flexDirection: "column" }}
        >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: integration.color + "18",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: integration.color, fontSize: 22, flexShrink: 0,
                }}>
                    <Icon />
                </div>

                {isEnabled && (
                    <span style={{
                        background: "#f0fdf4", color: C.green,
                        borderRadius: 6, fontSize: 10, fontWeight: 700,
                        padding: "3px 8px", textTransform: "uppercase",
                        display: "flex", alignItems: "center", gap: 4,
                    }}>
                        <CheckCircleOutlined style={{ fontSize: 10 }} /> Enabled
                    </span>
                )}
                {isComingSoon && (
                    <span style={{
                        background: C.bg, color: C.subText,
                        borderRadius: 6, fontSize: 10, fontWeight: 600,
                        padding: "3px 8px",
                    }}>
                        Coming Soon
                    </span>
                )}
            </div>

            {/* Name + category */}
            <div style={{ marginBottom: 10 }}>
                <Text strong style={{ fontSize: 15, color: C.darkText, display: "block" }}>
                    {integration.name}
                </Text>
                <Text style={{ fontSize: 11, color: C.subText }}>{integration.category}</Text>
            </div>

            {/* Description */}
            <Text style={{ fontSize: 12, color: C.subText, lineHeight: 1.6, display: "block", marginBottom: 14, flex: 1 }}>
                {integration.description}
            </Text>

            {/* Tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {integration.tags.map((tag, i) => (
                    <span key={i} style={{
                        background: i === 0 ? integration.color + "14" : C.bg,
                        color: i === 0 ? integration.color : C.subText,
                        borderRadius: 5, fontSize: 10, fontWeight: 600,
                        padding: "2px 7px", border: `1px solid ${i === 0 ? integration.color + "30" : C.border}`,
                    }}>
                        {tag}
                    </span>
                ))}
            </div>

            {/* Pricing / setup row */}
            <div style={{
                display: "flex", justifyContent: "space-between",
                padding: "8px 12px", background: C.bg,
                borderRadius: 8, marginBottom: 14, border: `1px solid ${C.border}`,
            }}>
                <div>
                    <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>Pricing</Text>
                    <Text strong style={{ fontSize: 12, color: C.darkText }}>{integration.pricing}</Text>
                </div>
                <div style={{ textAlign: "right" }}>
                    <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>Setup</Text>
                    <Text strong style={{ fontSize: 12, color: C.darkText }}>{integration.setupTime}</Text>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {isEnabled ? (
                    <Button
                        danger block
                        icon={<PoweroffOutlined />}
                        loading={disableLoading}
                        onClick={onDisable}
                        style={{ borderRadius: 8 }}
                    >
                        Disable
                    </Button>
                ) : (
                    <Button
                        type="primary" block
                        icon={isComingSoon ? <LockOutlined /> : <PlusOutlined />}
                        disabled={isComingSoon}
                        loading={enableLoading}
                        onClick={onEnable}
                        style={{
                            borderRadius: 8,
                            background: isComingSoon ? undefined : integration.color,
                            borderColor: isComingSoon ? undefined : integration.color,
                        }}
                    >
                        {isComingSoon ? "Coming Soon" : "Enable"}
                    </Button>
                )}
                <Button
                    block
                    icon={<InfoCircleOutlined />}
                    onClick={onLearnMore}
                    style={{ borderRadius: 8, borderColor: C.border }}
                >
                    Learn More
                </Button>
            </div>
        </Card>
    );
};

// ── Modal title ───────────────────────────────────────────────────────────────
const ModalTitle: React.FC<{ icon: React.ReactNode; color: string; title: string }> = ({ icon, color, title }) => (
    <Space size={8}>
        <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: color + "18", color,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>
            {icon}
        </div>
        <Text strong style={{ fontSize: 13, color: C.darkText }}>{title}</Text>
    </Space>
);

// ── Form section ──────────────────────────────────────────────────────────────
const FormSection: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <div style={{
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: "14px 14px 6px", marginBottom: 14, ...style,
    }}>
        {children}
    </div>
);

// ── Learn More Modal ──────────────────────────────────────────────────────────
const LearnMoreModal: React.FC<{
    integration: (typeof INTEGRATIONS)[0] | null;
    open: boolean;
    onClose: () => void;
}> = ({ integration, open, onClose }) => {
    if (!integration) return null;
    const Icon = integration.icon;
    const isComingSoon = integration.status === "coming_soon";

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            style={{ top: 20 }}
            width="min(660px, 96vw)"
            destroyOnClose
            title={<ModalTitle icon={<Icon />} color={integration.color} title={integration.name} />}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
                {isComingSoon && (
                    <Alert
                        message="Coming Soon"
                        description="This integration is under development. Stay tuned for updates!"
                        type="warning"
                        showIcon
                    />
                )}

                {/* Description */}
                <FormSection>
                    <SectionLabel>About</SectionLabel>
                    <Text style={{ fontSize: 13, color: C.darkText, lineHeight: 1.7 }}>
                        {integration.longDescription}
                    </Text>
                </FormSection>

                <Row gutter={14}>
                    {/* Features */}
                    <Col xs={24} sm={12}>
                        <FormSection style={{ height: "100%" }}>
                            <SectionLabel>Features</SectionLabel>
                            <FeatureList items={integration.features} color={integration.color} />
                        </FormSection>
                    </Col>

                    {/* Benefits */}
                    <Col xs={24} sm={12}>
                        <FormSection style={{ height: "100%" }}>
                            <SectionLabel>Benefits</SectionLabel>
                            <FeatureList items={integration.benefits} color={C.green} />
                        </FormSection>
                    </Col>
                </Row>

                {/* Pricing row */}
                <div style={{ display: "flex", gap: 10 }}>
                    <div style={{
                        flex: 1, background: C.bg, border: `1px solid ${C.border}`,
                        borderRadius: 10, padding: "12px 14px",
                    }}>
                        <Text style={{ fontSize: 10, color: C.subText, display: "block", marginBottom: 4 }}>Pricing</Text>
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>{integration.pricing}</Text>
                    </div>
                    <div style={{
                        flex: 1, background: C.bg, border: `1px solid ${C.border}`,
                        borderRadius: 10, padding: "12px 14px",
                    }}>
                        <Text style={{ fontSize: 10, color: C.subText, display: "block", marginBottom: 4 }}>Setup Time</Text>
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>{integration.setupTime}</Text>
                    </div>
                </div>

                <Button block onClick={onClose} style={{ borderRadius: 8 }}>Close</Button>
            </div>
        </Modal>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const DiscoverPage: React.FC = () => {
    const [selectedIntegration, setSelectedIntegration] = useState<(typeof INTEGRATIONS)[0] | null>(null);
    const [learnMoreOpen, setLearnMoreOpen] = useState(false);
    const [pesapalModalOpen, setPesapalModalOpen] = useState(false);
    const [accountingModalOpen, setAccountingModalOpen] = useState(false);
    const [posModalOpen, setPosModalOpen] = useState(false);
    const [isUpdatingPesapal, setIsUpdatingPesapal] = useState(false);

    const [pesapalForm] = Form.useForm();
    const [accountingForm] = Form.useForm();
    const [posForm] = Form.useForm();

    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const tenantId = getCurrentTenantId();

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: tenantDetails, refetch: refetchTenant } = useQuery({
        queryKey: ["tenant", tenantId],
        queryFn: () => fetchTenantDetails(tenantId),
        enabled: !!tenantId,
        refetchOnWindowFocus: false,
        staleTime: 0,
        cacheTime: 0,
    });

    const { data: pesapalConfig } = useQuery({
        queryKey: ["pesapalConfig", tenantId],
        queryFn: () => pesapalApi.getConfig(tenantId),
        enabled: !!tenantId,
        refetchOnWindowFocus: false,
    });

    // ── Status helper ─────────────────────────────────────────────────────────
    const getStatus = (id: string): "enabled" | "not_enabled" => {
        if (!tenantDetails?.data) return "not_enabled";
        const t = tenantDetails.data;
        if (id === "relia_pos")
            return t.pos_integration?.enabled === true ? "enabled" : "not_enabled";
        if (id === "relia_accounting")
            return t.modules?.accounting === true ? "enabled" : "not_enabled";
        if (id === "pesapal")
            return t.use_pesapal === true || pesapalConfig?.data?.enabled === true
                ? "enabled" : "not_enabled";
        return "not_enabled";
    };

    const enabledCount = INTEGRATIONS.filter((i) => getStatus(i.id) === "enabled").length;

    // ── Mutations ─────────────────────────────────────────────────────────────
    const pesapalMutation = useMutation({
        mutationFn: (values: any) => pesapalApi.configure(tenantId, values),
        onSuccess: () => {
            message.success("Pesapal configured successfully");
            setPesapalModalOpen(false);
            setIsUpdatingPesapal(false);
            pesapalForm.resetFields();
            queryClient.invalidateQueries(["pesapalConfig", tenantId]);
            queryClient.invalidateQueries(["tenant", tenantId]);
            refetchTenant();
        },
        onError: (e: any) => message.error(e.message || "Failed to configure Pesapal"),
    });

    const enableAccountingMutation = useMutation({
        mutationFn: (values: any) => enableAccounting(tenantId, { terms_acceptance: values }),
        onSuccess: () => {
            message.success("Accounting enabled! Refreshing...");
            setAccountingModalOpen(false);
            accountingForm.resetFields();
            triggerAppRefresh(queryClient);
        },
        onError: (e: any) => message.error(e.message || "Failed to enable accounting"),
    });

    const disableAccountingMutation = useMutation({
        mutationFn: () => disableAccounting(tenantId),
        onSuccess: () => { message.success("Accounting disabled. Refreshing..."); triggerAppRefresh(queryClient); },
        onError: (e: any) => message.error(e.message || "Failed to disable accounting"),
    });

    const enablePosMutation = useMutation({
        mutationFn: (config: any) => enablePosIntegration(tenantId, config),
        onSuccess: () => {
            message.success("POS enabled! Refreshing...");
            setPosModalOpen(false);
            posForm.resetFields();
            triggerAppRefresh(queryClient);
        },
        onError: (e: any) => message.error(e.message || "Failed to enable POS"),
    });

    const disablePosMutation = useMutation({
        mutationFn: () => disablePosIntegration(tenantId),
        onSuccess: () => { message.success("POS disabled. Refreshing..."); triggerAppRefresh(queryClient); },
        onError: (e: any) => message.error(e.message || "Failed to disable POS"),
    });

    // ── Enable handler ────────────────────────────────────────────────────────
    const handleEnable = (integration: (typeof INTEGRATIONS)[0]) => {
        if (getStatus(integration.id) === "enabled") {
            message.info(`${integration.name} is already enabled`);
            return;
        }
        if (integration.id === "relia_pos") { setPosModalOpen(true); return; }
        if (integration.id === "relia_accounting") { setAccountingModalOpen(true); return; }
        if (integration.id === "pesapal") { setPesapalModalOpen(true); setIsUpdatingPesapal(false); return; }
        message.info("This integration will be available soon");
    };

    // ── Disable handler ───────────────────────────────────────────────────────
    const handleDisable = (id: string) => {
        const cfg: Record<string, { title: string; content: string; onOk: () => void }> = {
            relia_accounting: {
                title: "Disable Accounting?",
                content: "This will stop auto-sync and hide accounting features. Your data will be preserved.",
                onOk: () => disableAccountingMutation.mutate(),
            },
            relia_pos: {
                title: "Disable POS Integration?",
                content: "This will stop the POS system integration. Are you sure?",
                onOk: () => disablePosMutation.mutate(),
            },
            pesapal: {
                title: "Disable Pesapal?",
                content: "This will stop payment processing through Pesapal. Are you sure?",
                onOk: async () => {
                    try {
                        await pesapalApi.disable(tenantId);
                        message.success("Pesapal disabled");
                        queryClient.invalidateQueries(["pesapalConfig", tenantId]);
                        queryClient.invalidateQueries(["tenant", tenantId]);
                        refetchTenant();
                    } catch {
                        message.error("Failed to disable Pesapal");
                    }
                },
            },
        };
        const c = cfg[id];
        if (!c) return;
        Modal.confirm({
            title: c.title,
            content: c.content,
            okText: "Disable",
            okType: "danger",
            onOk: c.onOk,
        });
    };

    // ── Modal footer ──────────────────────────────────────────────────────────
    const ModalFooter: React.FC<{
        onCancel: () => void;
        submitLabel: string;
        loading?: boolean;
        color?: string;
        icon?: React.ReactNode;
        cancelDisabled?: boolean;
    }> = ({ onCancel, submitLabel, loading, color, icon, cancelDisabled }) => (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
            <Button onClick={onCancel} disabled={cancelDisabled} style={{ borderRadius: 8 }}>
                Cancel
            </Button>
            <Button
                type="primary"
                htmlType="submit"
                icon={icon}
                loading={loading}
                style={{
                    borderRadius: 8,
                    background: color || C.primary,
                    borderColor: color || C.primary,
                }}
            >
                {submitLabel}
            </Button>
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: "20px 16px", maxWidth: 1400, margin: "0 auto" }}>

            {/* Page header */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{
                        background: C.primaryLight, borderRadius: 10,
                        padding: "6px 8px", color: C.primary, fontSize: 20, lineHeight: 1,
                    }}>
                        <ApiOutlined />
                    </div>
                    <Title level={4} style={{ margin: 0, color: C.darkText }}>Discover Integrations</Title>
                </div>
                <Text style={{ fontSize: 13, color: C.subText, display: "block", marginBottom: 14 }}>
                    Enhance your business with powerful integrations from the Relia Suite.
                </Text>

                {/* Summary strip */}
                <div style={{
                    display: "flex", gap: 10, flexWrap: "wrap",
                }}>
                    <div style={{
                        background: C.primaryLight, border: `1px solid ${C.primary}20`,
                        borderRadius: 8, padding: "8px 14px",
                        display: "flex", alignItems: "center", gap: 8,
                    }}>
                        <ThunderboltOutlined style={{ color: C.primary, fontSize: 14 }} />
                        <Text strong style={{ fontSize: 12, color: C.primary }}>
                            {enabledCount} Active
                        </Text>
                    </div>
                    <div style={{
                        background: C.bg, border: `1px solid ${C.border}`,
                        borderRadius: 8, padding: "8px 14px",
                        display: "flex", alignItems: "center", gap: 8,
                    }}>
                        <RocketOutlined style={{ color: C.subText, fontSize: 14 }} />
                        <Text style={{ fontSize: 12, color: C.subText }}>
                            {INTEGRATIONS.length} Total Integrations
                        </Text>
                    </div>
                </div>
            </div>

            {/* Integration cards */}
            <Row gutter={[16, 16]}>
                {INTEGRATIONS.map((integration) => {
                    const isEnabled = getStatus(integration.id) === "enabled";
                    return (
                        <Col xs={24} sm={24} md={12} lg={8} key={integration.id}>
                            <IntegrationCard
                                integration={integration}
                                isEnabled={isEnabled}
                                onEnable={() => handleEnable(integration)}
                                onDisable={() => handleDisable(integration.id)}
                                onLearnMore={() => { setSelectedIntegration(integration); setLearnMoreOpen(true); }}
                                disableLoading={
                                    (integration.id === "relia_accounting" && disableAccountingMutation.isPending) ||
                                    (integration.id === "relia_pos" && disablePosMutation.isPending)
                                }
                            />
                        </Col>
                    );
                })}
            </Row>

            {/* ── Learn More Modal ─────────────────────────────────────────────── */}
            <LearnMoreModal
                integration={selectedIntegration}
                open={learnMoreOpen}
                onClose={() => { setLearnMoreOpen(false); setSelectedIntegration(null); }}
            />

            {/* ── Pesapal Modal ────────────────────────────────────────────────── */}
            <Modal
                open={pesapalModalOpen}
                onCancel={() => { setPesapalModalOpen(false); setIsUpdatingPesapal(false); pesapalForm.resetFields(); }}
                footer={null}
                style={{ top: 20 }}
                width="min(520px, 96vw)"
                destroyOnClose
                title={
                    <ModalTitle
                        icon={<CreditCardOutlined />}
                        color={C.blue}
                        title={isUpdatingPesapal ? "Update Pesapal" : "Configure Pesapal"}
                    />
                }
            >
                <Form
                    form={pesapalForm}
                    layout="vertical"
                    onFinish={(values) => pesapalMutation.mutate(values)}
                    style={{ paddingTop: 4 }}
                >
                    <Alert
                        message="Enter your merchant credentials from pesapal.com"
                        type="info"
                        showIcon
                        style={{ marginBottom: 14, borderRadius: 8 }}
                    />

                    <FormSection>
                        <SectionLabel>Credentials</SectionLabel>
                        <Form.Item name="consumer_key" label="Consumer Key" rules={[{ required: true, message: "Required" }]} style={{ marginBottom: 12 }}>
                            <Input.Password placeholder="Consumer key" style={{ borderRadius: 8 }} />
                        </Form.Item>
                        <Form.Item name="consumer_secret" label="Consumer Secret" rules={[{ required: true, message: "Required" }]} style={{ marginBottom: 6 }}>
                            <Input.Password placeholder="Consumer secret" style={{ borderRadius: 8 }} />
                        </Form.Item>
                    </FormSection>

                    <FormSection>
                        <SectionLabel>Environment</SectionLabel>
                        <Form.Item name="is_sandbox" label="Mode" valuePropName="checked" style={{ marginBottom: 6 }}>
                            <Switch checkedChildren="Sandbox" unCheckedChildren="Production" />
                        </Form.Item>
                    </FormSection>

                    <ModalFooter
                        onCancel={() => { setPesapalModalOpen(false); pesapalForm.resetFields(); }}
                        submitLabel={isUpdatingPesapal ? "Update" : "Configure"}
                        loading={pesapalMutation.isPending}
                        color={C.blue}
                        icon={<CheckCircleOutlined />}
                    />
                </Form>
            </Modal>

            {/* ── POS Modal ────────────────────────────────────────────────────── */}
            <Modal
                open={posModalOpen}
                onCancel={() => { setPosModalOpen(false); posForm.resetFields(); }}
                footer={null}
                style={{ top: 20 }}
                width="min(520px, 96vw)"
                destroyOnClose
                title={<ModalTitle icon={<CreditCardOutlined />} color={C.blue} title="Enable POS Integration" />}
            >
                <Form
                    form={posForm}
                    layout="vertical"
                    onFinish={(values) => enablePosMutation.mutate(values)}
                    initialValues={{ auto_sync: true, sync_interval: 3600000 }}
                    style={{ paddingTop: 4 }}
                >
                    <Alert
                        message="Connect your POS with accounting for seamless data sync."
                        type="info"
                        showIcon
                        style={{ marginBottom: 14, borderRadius: 8 }}
                    />

                    <FormSection>
                        <SectionLabel>What's Included</SectionLabel>
                        <FeatureList
                            items={[
                                "Real-time sales sync",
                                "Inventory management",
                                "Customer data integration",
                                "Payment reconciliation",
                                "Multi-branch support",
                            ]}
                            color={C.blue}
                        />
                    </FormSection>

                    <FormSection>
                        <SectionLabel>Configuration</SectionLabel>
                        <Form.Item name="auto_sync" label="Auto Sync" valuePropName="checked" style={{ marginBottom: 12 }}>
                            <Switch checkedChildren="On" unCheckedChildren="Off" />
                        </Form.Item>
                        <Form.Item
                            name="sync_interval"
                            label="Sync Interval (ms)"
                            rules={[{ required: true, message: "Required" }]}
                            style={{ marginBottom: 6 }}
                        >
                            <Input type="number" placeholder="3600000 (1 hour)" style={{ borderRadius: 8 }} />
                        </Form.Item>
                    </FormSection>

                    <ModalFooter
                        onCancel={() => { setPosModalOpen(false); posForm.resetFields(); }}
                        submitLabel="Enable POS"
                        loading={enablePosMutation.isPending}
                        cancelDisabled={enablePosMutation.isPending}
                        color={C.blue}
                        icon={<CheckCircleOutlined />}
                    />
                </Form>
            </Modal>

            {/* ── Accounting Modal ──────────────────────────────────────────────── */}
            <Modal
                open={accountingModalOpen}
                onCancel={() => { setAccountingModalOpen(false); accountingForm.resetFields(); }}
                footer={null}
                style={{ top: 20 }}
                width="min(520px, 96vw)"
                destroyOnClose
                title={<ModalTitle icon={<CalculatorOutlined />} color={C.green} title="Enable Accounting" />}
            >
                <Form
                    form={accountingForm}
                    layout="vertical"
                    onFinish={(values) => enableAccountingMutation.mutate(values)}
                    initialValues={{ accept_terms: false, accept_charges: false }}
                    style={{ paddingTop: 4 }}
                >
                    <Alert
                        message="Auto-sync POS data and get complete financial visibility."
                        type="success"
                        showIcon
                        style={{ marginBottom: 14, borderRadius: 8 }}
                    />

                    <FormSection>
                        <SectionLabel>What's Included</SectionLabel>
                        <FeatureList
                            items={[
                                "Auto POS sync",
                                "Chart of accounts",
                                "P&L, Balance Sheet, Cash Flow reports",
                                "Invoice & bill management",
                                "Bank reconciliation",
                                "Tax reports (eTIMS ready)",
                                "Multi-user access",
                            ]}
                            color={C.green}
                        />
                    </FormSection>

                    <div style={{
                        background: "#fffbeb", border: `1px solid ${C.orange}30`,
                        borderRadius: 10, padding: "12px 14px", marginBottom: 14,
                    }}>
                        <Text strong style={{ fontSize: 13, color: C.orange, display: "block", marginBottom: 2 }}>
                            KES 2,000/month
                        </Text>
                        <Text style={{ fontSize: 12, color: C.subText }}>
                            Additional charges may apply based on usage.
                        </Text>
                    </div>

                    <FormSection>
                        <SectionLabel>Agreement</SectionLabel>
                        <Form.Item
                            name="accept_terms"
                            valuePropName="checked"
                            rules={[{ validator: (_, v) => v ? Promise.resolve() : Promise.reject("Required") }]}
                            style={{ marginBottom: 10 }}
                        >
                            <Checkbox style={{ fontSize: 12 }}>
                                I accept the <a href="/terms" target="_blank" rel="noreferrer">terms and conditions</a>
                            </Checkbox>
                        </Form.Item>
                        <Form.Item
                            name="accept_charges"
                            valuePropName="checked"
                            rules={[{ validator: (_, v) => v ? Promise.resolve() : Promise.reject("Required") }]}
                            style={{ marginBottom: 6 }}
                        >
                            <Checkbox style={{ fontSize: 12 }}>
                                I acknowledge that additional charges may apply
                            </Checkbox>
                        </Form.Item>
                    </FormSection>

                    <ModalFooter
                        onCancel={() => { setAccountingModalOpen(false); accountingForm.resetFields(); }}
                        submitLabel="Enable Accounting"
                        loading={enableAccountingMutation.isPending}
                        cancelDisabled={enableAccountingMutation.isPending}
                        color={C.green}
                        icon={<CheckCircleOutlined />}
                    />
                </Form>
            </Modal>
        </div>
    );
};

export default DiscoverPage;