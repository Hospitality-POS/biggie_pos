import React, { useState } from "react";
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Col,
    Form,
    Input,
    Modal,
    Row,
    Space,
    Switch,
    Typography,
    notification,
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
    LoadingOutlined,
    SyncOutlined,
    AuditOutlined,
    WalletOutlined,
    MobileOutlined,
    RobotOutlined,
    MessageOutlined,
    GiftOutlined,
    CodeOutlined,
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

const { Text, Title } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────────
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

// ── App refresh — shows a countdown notification then reloads ─────────────────
const triggerAppRefresh = (queryClient: any, label = "Changes applied") => {
    let seconds = 3;

    // Open a persistent notification with a live countdown
    notification.open({
        key: "app-refresh",
        message: (
            <Text strong style={{ fontSize: 14, color: C.darkText }}>{label}</Text>
        ),
        description: (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <CheckCircleOutlined style={{ color: C.green, fontSize: 16 }} />
                    <Text style={{ fontSize: 13, color: C.subText }}>
                        Reloading in <span id="refresh-countdown" style={{ fontWeight: 700, color: C.primary }}>{seconds}s</span>…
                    </Text>
                </div>
                {/* Progress bar */}
                <div style={{ background: "#e2e8f0", borderRadius: 4, height: 4, overflow: "hidden" }}>
                    <div
                        id="refresh-progress"
                        style={{
                            height: "100%",
                            width: "100%",
                            background: `linear-gradient(90deg, ${C.green}, ${C.primary})`,
                            borderRadius: 4,
                            transition: "width 1s linear",
                        }}
                    />
                </div>
            </div>
        ),
        icon: <SyncOutlined spin style={{ color: C.green }} />,
        duration: 0,
        style: {
            borderRadius: 12,
            border: `1px solid ${C.green}30`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        },
    });

    // Animate countdown + progress bar
    const interval = setInterval(() => {
        seconds -= 1;
        const countdown = document.getElementById("refresh-countdown");
        const progress = document.getElementById("refresh-progress");
        if (countdown) countdown.textContent = `${seconds}s`;
        if (progress) progress.style.width = `${(seconds / 3) * 100}%`;

        if (seconds <= 0) {
            clearInterval(interval);
            notification.destroy("app-refresh");
            queryClient.clear();
            window.location.reload();
        }
    }, 1000);
};

// ── Integrations data ──────────────────────────────────────────────────────────
const INTEGRATIONS = [
    {
        id: "relia_pos",
        name: "Base Store",
        category: "Point of Sale",
        description: "Smart POS for seamless sales, inventory, and customer management.",
        longDescription: "Relia POS enables businesses to manage sales, handle shift operations, send notifications, and sync data in real-time with Relia Accounting and other Relia Suite products.",
        features: ["Sales", "Shift Management", "Notifications", "Inventory Management", "Customer Profiles", "Multi-branch Support", "Reports Dashboard"],
        benefits: ["Faster checkouts", "Accurate stock levels", "Better customer experience", "Centralized reporting"],
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
        longDescription: "Comprehensive accounting for Relia POS. Auto-sync sales, track expenses, and generate professional financial reports.",
        features: ["Auto POS Sync", "Chart of Accounts", "Double-Entry Bookkeeping", "Financial Reports", "Bank Reconciliation", "Multi-user Access"],
        benefits: ["Eliminate manual entry", "Real-time visibility", "Professional statements", "Better cash flow", "Tax-ready reports"],
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
        longDescription: "Relia Payroll helps you manage employee payments, statutory compliance (NHIF, NSSF, PAYE), and generate detailed reports seamlessly integrated with Relia Accounting.",
        features: ["Payslip Generation", "NHIF/NSSF/PAYE Automation", "Leave Management", "Employee Database", "Integration with Accounting"],
        benefits: ["Accurate payments", "Full compliance", "Reduced manual work", "Easy reporting", "HR efficiency"],
        pricing: "Coming Soon",
        setupTime: "N/A",
        status: "coming_soon",
        icon: FileProtectOutlined,
        color: C.orange,
        tags: ["Relia Suite", "Coming Soon"],
    },
    {
        id: "etims",
        name: "eTIMS",
        category: "KRA Tax Compliance",
        description: "Kenya Revenue Authority electronic Tax Invoice Management System integration.",
        longDescription: "eTIMS connects your POS and accounting directly to the Kenya Revenue Authority's electronic Tax Invoice Management System, automating tax invoice generation, real-time submission, and compliance reporting. Stay fully compliant without manual effort.",
        features: ["Automated Tax Invoice Generation", "Real-time KRA Submission", "VAT/PAYE Compliance", "Digital Receipts", "Audit Trail", "Integration with Accounting & POS"],
        benefits: ["Full KRA compliance", "Zero manual filing", "Reduced audit risk", "Accurate tax records", "Auto VAT reconciliation"],
        pricing: "Coming Soon",
        setupTime: "N/A",
        status: "coming_soon",
        icon: AuditOutlined,
        color: C.indigo,
        tags: ["KRA", "Tax", "Compliance", "Coming Soon"],
    },
    {
        id: "pesapal",
        name: "Pesapal",
        category: "Payment Processing",
        description: "Accept M-Pesa, cards, and mobile money payments seamlessly at checkout.",
        longDescription: "Pesapal is East Africa's leading payment gateway. Integrate M-Pesa, Visa, Mastercard, and Airtel Money into your POS checkout flow for fast, secure, and reliable payment processing.",
        features: ["M-Pesa STK Push", "Visa & Mastercard", "Airtel Money", "Payment Reconciliation", "Instant Notifications", "Sandbox & Production Modes"],
        benefits: ["Accept more payment methods", "Faster checkout", "Automatic reconciliation", "Trusted by thousands of businesses", "Secure & PCI compliant"],
        pricing: "Coming Soon",
        setupTime: "N/A",
        status: "coming_soon",
        icon: WalletOutlined,
        color: C.purple,
        tags: ["Payments", "M-Pesa", "Coming Soon"],
    },
    {
        id: "mpesa",
        name: "M-Pesa Direct",
        category: "Mobile Money",
        description: "Direct Safaricom M-Pesa STK Push integration for instant mobile payments.",
        longDescription: "M-Pesa Direct gives your business a native Safaricom Daraja API integration — trigger STK Push payments at checkout, receive instant payment confirmations, and reconcile automatically with your POS and accounting.",
        features: ["STK Push (Customer Prompt)", "C2B & B2C Payments", "Real-time Confirmations", "Automatic Reconciliation", "Paybill & Till Support", "Transaction Reports"],
        benefits: ["Fastest checkout in Kenya", "No third-party fees", "Real-time float tracking", "Native Safaricom integration", "Works offline for reconciliation"],
        pricing: "Coming Soon",
        setupTime: "N/A",
        status: "coming_soon",
        icon: MobileOutlined,
        color: "#00a651",
        tags: ["M-Pesa", "Safaricom", "Coming Soon"],
    },
    {
        id: "business_intelligence",
        name: "AI Assistant",
        category: "Business Intelligence",
        description: "AI-powered insights, forecasts, and smart recommendations for your business.",
        longDescription: "The Relia AI Assistant analyses your sales, inventory, and customer data to surface actionable insights — predict stock-outs, identify top performers, forecast revenue, and get plain-English answers to your business questions.",
        features: ["Natural Language Queries", "Revenue Forecasting", "Inventory Predictions", "Customer Behaviour Analysis", "Smart Alerts", "Automated Reports"],
        benefits: ["Make faster decisions", "Reduce dead stock", "Spot trends early", "Save hours on reporting", "Grow revenue intelligently"],
        pricing: "Coming Soon",
        setupTime: "N/A",
        status: "coming_soon",
        icon: RobotOutlined,
        color: C.indigo,
        tags: ["AI", "Analytics", "Coming Soon"],
    },
    {
        id: "sms_notifications",
        name: "SMS Notifications",
        category: "Customer Engagement",
        description: "Automated SMS alerts for orders, payments, and customer communications.",
        longDescription: "Send real-time SMS notifications to customers and staff — order confirmations, payment receipts, low-stock alerts, shift reminders, and custom marketing messages through Africa's Talking or your preferred SMS gateway.",
        features: ["Order Confirmation SMS", "Payment Receipts", "Low Stock Alerts", "Staff Shift Reminders", "Bulk SMS Campaigns", "Custom Templates"],
        benefits: ["Keep customers informed", "Reduce no-shows", "Improve staff communication", "Boost repeat business", "Works without internet"],
        pricing: "Coming Soon",
        setupTime: "N/A",
        status: "coming_soon",
        icon: MessageOutlined,
        color: C.blue,
        tags: ["SMS", "Notifications", "Coming Soon"],
    },
    {
        id: "loyalty_rewards",
        name: "Loyalty & Rewards",
        category: "Customer Retention",
        description: "Points, rewards, and loyalty programmes to keep customers coming back.",
        longDescription: "Relia Loyalty lets you build a branded rewards programme — customers earn points on every purchase, redeem them for discounts, and receive personalised offers. Fully integrated with your POS for zero friction at checkout.",
        features: ["Points on Every Purchase", "Reward Redemption at POS", "Tiered Membership Levels", "Birthday & Anniversary Rewards", "Referral Programmes", "Loyalty Analytics"],
        benefits: ["Increase repeat visits", "Boost average order value", "Reward your best customers", "Stand out from competitors", "Data-driven promotions"],
        pricing: "Coming Soon",
        setupTime: "N/A",
        status: "coming_soon",
        icon: GiftOutlined,
        color: C.orange,
        tags: ["Loyalty", "Rewards", "Coming Soon"],
    },
    {
        id: "developer_api",
        name: "Developer API",
        category: "Platform & Integrations",
        description: "REST API and webhooks to connect Relia with any third-party system.",
        longDescription: "The Relia Developer API gives you full programmatic access to orders, inventory, customers, payments, and reports. Build custom integrations, automate workflows, and connect Relia to your existing tools via REST endpoints and real-time webhooks.",
        features: ["RESTful API", "Webhook Events", "OAuth 2.0 Authentication", "Sandbox Environment", "SDK Libraries", "API Key Management"],
        benefits: ["Integrate any system", "Automate workflows", "Build custom apps", "Real-time data access", "Enterprise-ready security"],
        pricing: "Coming Soon",
        setupTime: "N/A",
        status: "coming_soon",
        icon: CodeOutlined,
        color: C.darkText,
        tags: ["API", "Developer", "Webhooks", "Coming Soon"],
    },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Text style={{ fontSize: 10, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 10 }}>
        {children}
    </Text>
);

const FeatureList: React.FC<{ items: string[]; color: string }> = ({ items, color }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", background: color + "18", color, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CheckOutlined />
                </span>
                <Text style={{ fontSize: 12, color: C.darkText }}>{item}</Text>
            </div>
        ))}
    </div>
);

const FormSection: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 14px 6px", marginBottom: 14, ...style }}>
        {children}
    </div>
);

const ModalTitle: React.FC<{ icon: React.ReactNode; color: string; title: string }> = ({ icon, color, title }) => (
    <Space size={8}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color + "18", color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            {icon}
        </div>
        <Text strong style={{ fontSize: 13, color: C.darkText }}>{title}</Text>
    </Space>
);

const ModalFooter: React.FC<{
    onCancel: () => void;
    submitLabel: string;
    loading?: boolean;
    color?: string;
    icon?: React.ReactNode;
    cancelDisabled?: boolean;
}> = ({ onCancel, submitLabel, loading, color, icon, cancelDisabled }) => (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
        <Button onClick={onCancel} disabled={cancelDisabled} style={{ borderRadius: 8 }}>Cancel</Button>
        <Button type="primary" htmlType="submit" icon={icon} loading={loading}
            style={{ borderRadius: 8, background: color || C.primary, borderColor: color || C.primary }}>
            {submitLabel}
        </Button>
    </div>
);

// ── Integration card ───────────────────────────────────────────────────────────
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
                <div style={{ width: 48, height: 48, borderRadius: 12, background: integration.color + "18", display: "flex", alignItems: "center", justifyContent: "center", color: integration.color, fontSize: 22, flexShrink: 0 }}>
                    <Icon />
                </div>
                {isEnabled && (
                    <span style={{ background: "#f0fdf4", color: C.green, borderRadius: 6, fontSize: 10, fontWeight: 700, padding: "3px 8px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                        <CheckCircleOutlined style={{ fontSize: 10 }} /> Enabled
                    </span>
                )}
                {isComingSoon && (
                    <span style={{ background: C.bg, color: C.subText, borderRadius: 6, fontSize: 10, fontWeight: 600, padding: "3px 8px" }}>Coming Soon</span>
                )}
            </div>

            <div style={{ marginBottom: 10 }}>
                <Text strong style={{ fontSize: 15, color: C.darkText, display: "block" }}>{integration.name}</Text>
                <Text style={{ fontSize: 11, color: C.subText }}>{integration.category}</Text>
            </div>

            <Text style={{ fontSize: 12, color: C.subText, lineHeight: 1.6, display: "block", marginBottom: 14, flex: 1 }}>
                {integration.description}
            </Text>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {integration.tags.map((tag, i) => (
                    <span key={i} style={{ background: i === 0 ? integration.color + "14" : C.bg, color: i === 0 ? integration.color : C.subText, borderRadius: 5, fontSize: 10, fontWeight: 600, padding: "2px 7px", border: `1px solid ${i === 0 ? integration.color + "30" : C.border}` }}>
                        {tag}
                    </span>
                ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: C.bg, borderRadius: 8, marginBottom: 14, border: `1px solid ${C.border}` }}>
                <div>
                    <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>Pricing</Text>
                    <Text strong style={{ fontSize: 12, color: C.darkText }}>{integration.pricing}</Text>
                </div>
                <div style={{ textAlign: "right" }}>
                    <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>Setup</Text>
                    <Text strong style={{ fontSize: 12, color: C.darkText }}>{integration.setupTime}</Text>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {isEnabled ? (
                    <Button danger block icon={<PoweroffOutlined />} loading={disableLoading} onClick={onDisable} style={{ borderRadius: 8 }}>
                        Disable
                    </Button>
                ) : (
                    <Button type="primary" block
                        icon={isComingSoon ? <LockOutlined /> : <PlusOutlined />}
                        disabled={isComingSoon}
                        loading={enableLoading}
                        onClick={onEnable}
                        style={{ borderRadius: 8, background: isComingSoon ? undefined : integration.color, borderColor: isComingSoon ? undefined : integration.color }}
                    >
                        {isComingSoon ? "Coming Soon" : "Enable"}
                    </Button>
                )}
                <Button block icon={<InfoCircleOutlined />} onClick={onLearnMore} style={{ borderRadius: 8, borderColor: C.border }}>
                    Learn More
                </Button>
            </div>
        </Card>
    );
};

// ── Learn More Modal ───────────────────────────────────────────────────────────
const LearnMoreModal: React.FC<{
    integration: (typeof INTEGRATIONS)[0] | null;
    open: boolean;
    onClose: () => void;
}> = ({ integration, open, onClose }) => {
    if (!integration) return null;
    const Icon = integration.icon;
    const isComingSoon = integration.status === "coming_soon";

    return (
        <Modal open={open} onCancel={onClose} footer={null} style={{ top: 20 }} width="min(660px, 96vw)" destroyOnClose
            title={<ModalTitle icon={<Icon />} color={integration.color} title={integration.name} />}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
                {isComingSoon && <Alert message="Coming Soon" description="This integration is under development. Stay tuned for updates!" type="warning" showIcon />}
                <FormSection>
                    <SectionLabel>About</SectionLabel>
                    <Text style={{ fontSize: 13, color: C.darkText, lineHeight: 1.7 }}>{integration.longDescription}</Text>
                </FormSection>
                <Row gutter={14}>
                    <Col xs={24} sm={12}>
                        <FormSection style={{ height: "100%" }}>
                            <SectionLabel>Features</SectionLabel>
                            <FeatureList items={integration.features} color={integration.color} />
                        </FormSection>
                    </Col>
                    <Col xs={24} sm={12}>
                        <FormSection style={{ height: "100%" }}>
                            <SectionLabel>Benefits</SectionLabel>
                            <FeatureList items={integration.benefits} color={C.green} />
                        </FormSection>
                    </Col>
                </Row>
                <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                        <Text style={{ fontSize: 10, color: C.subText, display: "block", marginBottom: 4 }}>Pricing</Text>
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>{integration.pricing}</Text>
                    </div>
                    <div style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                        <Text style={{ fontSize: 10, color: C.subText, display: "block", marginBottom: 4 }}>Setup Time</Text>
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>{integration.setupTime}</Text>
                    </div>
                </div>
                <Button block onClick={onClose} style={{ borderRadius: 8 }}>Close</Button>
            </div>
        </Modal>
    );
};

// ── Main page ──────────────────────────────────────────────────────────────────
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

    const getStatus = (id: string): "enabled" | "not_enabled" => {
        if (!tenantDetails?.data) return "not_enabled";
        const t = tenantDetails.data;
        if (id === "relia_pos") return t.pos_integration?.enabled === true ? "enabled" : "not_enabled";
        if (id === "relia_accounting") return t.modules?.accounting === true ? "enabled" : "not_enabled";
        if (id === "pesapal") return t.use_pesapal === true || pesapalConfig?.data?.enabled === true ? "enabled" : "not_enabled";
        return "not_enabled";
    };

    const enabledCount = INTEGRATIONS.filter(i => getStatus(i.id) === "enabled").length;

    // ── Mutations — all use triggerAppRefresh on success ──────────────────────
    const pesapalMutation = useMutation({
        mutationFn: (values: any) => pesapalApi.configure(tenantId, values),
        onSuccess: () => {
            setPesapalModalOpen(false);
            pesapalForm.resetFields();
            queryClient.invalidateQueries(["pesapalConfig", tenantId]);
            queryClient.invalidateQueries(["tenant", tenantId]);
            triggerAppRefresh(queryClient, "Pesapal configured successfully");
        },
        onError: (e: any) => notification.error({ message: "Failed to configure Pesapal", description: e.message, style: { borderRadius: 12 } }),
    });

    const enableAccountingMutation = useMutation({
        mutationFn: (values: any) => enableAccounting(tenantId, { terms_acceptance: values }),
        onSuccess: () => {
            setAccountingModalOpen(false);
            accountingForm.resetFields();
            triggerAppRefresh(queryClient, "Accounting enabled successfully");
        },
        onError: (e: any) => notification.error({ message: "Failed to enable Accounting", description: e.message, style: { borderRadius: 12 } }),
    });

    const disableAccountingMutation = useMutation({
        mutationFn: () => disableAccounting(tenantId),
        onSuccess: () => triggerAppRefresh(queryClient, "Accounting disabled"),
        onError: (e: any) => notification.error({ message: "Failed to disable Accounting", description: e.message, style: { borderRadius: 12 } }),
    });

    const enablePosMutation = useMutation({
        mutationFn: (config: any) => enablePosIntegration(tenantId, config),
        onSuccess: () => {
            setPosModalOpen(false);
            posForm.resetFields();
            triggerAppRefresh(queryClient, "POS enabled successfully");
        },
        onError: (e: any) => notification.error({ message: "Failed to enable POS", description: e.message, style: { borderRadius: 12 } }),
    });

    const disablePosMutation = useMutation({
        mutationFn: () => disablePosIntegration(tenantId),
        onSuccess: () => triggerAppRefresh(queryClient, "POS disabled"),
        onError: (e: any) => notification.error({ message: "Failed to disable POS", description: e.message, style: { borderRadius: 12 } }),
    });

    const handleEnable = (integration: (typeof INTEGRATIONS)[0]) => {
        if (getStatus(integration.id) === "enabled") {
            notification.info({ message: `${integration.name} is already enabled`, style: { borderRadius: 12 } });
            return;
        }
        if (integration.id === "relia_pos") { setPosModalOpen(true); return; }
        if (integration.id === "relia_accounting") { setAccountingModalOpen(true); return; }
        if (integration.id === "pesapal") { setPesapalModalOpen(true); setIsUpdatingPesapal(false); return; }
        notification.info({ message: "Coming soon", description: "This integration will be available soon.", style: { borderRadius: 12 } });
    };

    const handleDisable = (id: string) => {
        // onOk must return a Promise so Modal.confirm shows its own loading
        // spinner and stays open until the mutation resolves/rejects
        const cfg: Record<string, { title: string; content: string; onOk: () => Promise<void> }> = {
            relia_accounting: {
                title: "Disable Accounting?",
                content: "This will stop auto-sync and hide accounting features. Your data will be preserved.",
                onOk: () => disableAccountingMutation.mutateAsync(),
            },
            relia_pos: {
                title: "Disable POS Integration?",
                content: "This will stop the POS system integration. Are you sure?",
                onOk: () => disablePosMutation.mutateAsync(),
            },
            pesapal: {
                title: "Disable Pesapal?",
                content: "This will stop payment processing through Pesapal. Are you sure?",
                onOk: async () => {
                    await pesapalApi.disable(tenantId);
                    queryClient.invalidateQueries(["pesapalConfig", tenantId]);
                    queryClient.invalidateQueries(["tenant", tenantId]);
                    triggerAppRefresh(queryClient, "Pesapal disabled");
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
            // Returning the promise keeps the modal's OK button in loading state
            // until the API call finishes — then triggerAppRefresh takes over
            onOk: c.onOk,
            style: { borderRadius: 12 },
        });
    };

    return (
        <div style={{ padding: "20px 16px", maxWidth: 1400, margin: "0 auto" }}>

            {/* Page header */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 10, padding: "6px 8px", color: C.primary, fontSize: 20, lineHeight: 1 }}>
                        <ApiOutlined />
                    </div>
                    <Title level={4} style={{ margin: 0, color: C.darkText }}>Discover Integrations</Title>
                </div>
                <Text style={{ fontSize: 13, color: C.subText, display: "block", marginBottom: 14 }}>
                    Enhance your business with powerful integrations from the Relia Suite.
                </Text>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ background: C.primaryLight, border: `1px solid ${C.primary}20`, borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                        <ThunderboltOutlined style={{ color: C.primary, fontSize: 14 }} />
                        <Text strong style={{ fontSize: 12, color: C.primary }}>{enabledCount} Active</Text>
                    </div>
                    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                        <RocketOutlined style={{ color: C.subText, fontSize: 14 }} />
                        <Text style={{ fontSize: 12, color: C.subText }}>{INTEGRATIONS.length} Total Integrations</Text>
                    </div>
                </div>
            </div>

            {/* Cards */}
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

            {/* Learn More */}
            <LearnMoreModal integration={selectedIntegration} open={learnMoreOpen}
                onClose={() => { setLearnMoreOpen(false); setSelectedIntegration(null); }} />

            {/* Pesapal Modal */}
            <Modal open={pesapalModalOpen}
                onCancel={() => { setPesapalModalOpen(false); setIsUpdatingPesapal(false); pesapalForm.resetFields(); }}
                footer={null} style={{ top: 20 }} width="min(520px, 96vw)" destroyOnClose
                title={<ModalTitle icon={<CreditCardOutlined />} color={C.blue} title={isUpdatingPesapal ? "Update Pesapal" : "Configure Pesapal"} />}
            >
                <Form form={pesapalForm} layout="vertical" onFinish={v => pesapalMutation.mutate(v)} style={{ paddingTop: 4 }}>
                    <Alert message="Enter your merchant credentials from pesapal.com" type="info" showIcon style={{ marginBottom: 14, borderRadius: 8 }} />
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
                    <ModalFooter onCancel={() => { setPesapalModalOpen(false); pesapalForm.resetFields(); }}
                        submitLabel={isUpdatingPesapal ? "Update" : "Configure"}
                        loading={pesapalMutation.isPending} color={C.blue} icon={<CheckCircleOutlined />} />
                </Form>
            </Modal>

            {/* POS Modal */}
            <Modal open={posModalOpen}
                onCancel={() => { setPosModalOpen(false); posForm.resetFields(); }}
                footer={null} style={{ top: 20 }} width="min(520px, 96vw)" destroyOnClose
                title={<ModalTitle icon={<CreditCardOutlined />} color={C.blue} title="Enable POS Integration" />}
            >
                <Form form={posForm} layout="vertical" onFinish={v => enablePosMutation.mutate(v)}
                    initialValues={{ auto_sync: true, sync_interval: 3600000 }} style={{ paddingTop: 4 }}>
                    <Alert message="Connect your POS with accounting for seamless data sync." type="info" showIcon style={{ marginBottom: 14, borderRadius: 8 }} />
                    <FormSection>
                        <SectionLabel>What's Included</SectionLabel>
                        <FeatureList items={["Real-time sales sync", "Inventory management", "Customer data integration", "Payment reconciliation", "Multi-branch support"]} color={C.blue} />
                    </FormSection>
                    <FormSection>
                        <SectionLabel>Configuration</SectionLabel>
                        <Form.Item name="auto_sync" label="Auto Sync" valuePropName="checked" style={{ marginBottom: 12 }}>
                            <Switch checkedChildren="On" unCheckedChildren="Off" />
                        </Form.Item>
                        <Form.Item name="sync_interval" label="Sync Interval (ms)" rules={[{ required: true, message: "Required" }]} style={{ marginBottom: 6 }}>
                            <Input type="number" placeholder="3600000 (1 hour)" style={{ borderRadius: 8 }} />
                        </Form.Item>
                    </FormSection>
                    <ModalFooter onCancel={() => { setPosModalOpen(false); posForm.resetFields(); }}
                        submitLabel="Enable POS" loading={enablePosMutation.isPending}
                        cancelDisabled={enablePosMutation.isPending} color={C.blue} icon={<CheckCircleOutlined />} />
                </Form>
            </Modal>

            {/* Accounting Modal */}
            <Modal open={accountingModalOpen}
                onCancel={() => { setAccountingModalOpen(false); accountingForm.resetFields(); }}
                footer={null} style={{ top: 20 }} width="min(520px, 96vw)" destroyOnClose
                title={<ModalTitle icon={<CalculatorOutlined />} color={C.green} title="Enable Accounting" />}
            >
                <Form form={accountingForm} layout="vertical" onFinish={v => enableAccountingMutation.mutate(v)}
                    initialValues={{ accept_terms: false, accept_charges: false }} style={{ paddingTop: 4 }}>
                    <Alert message="Auto-sync POS data and get complete financial visibility." type="success" showIcon style={{ marginBottom: 14, borderRadius: 8 }} />
                    <FormSection>
                        <SectionLabel>What's Included</SectionLabel>
                        <FeatureList items={["Auto POS sync", "Chart of accounts", "P&L, Balance Sheet, Cash Flow reports", "Invoice & bill management", "Bank reconciliation", "Tax reports (eTIMS ready)", "Multi-user access"]} color={C.green} />
                    </FormSection>
                    <div style={{ background: "#fffbeb", border: `1px solid ${C.orange}30`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                        <Text strong style={{ fontSize: 13, color: C.orange, display: "block", marginBottom: 2 }}>KES 2,000/month</Text>
                        <Text style={{ fontSize: 12, color: C.subText }}>Additional charges may apply based on usage.</Text>
                    </div>
                    <FormSection>
                        <SectionLabel>Agreement</SectionLabel>
                        <Form.Item name="accept_terms" valuePropName="checked"
                            rules={[{ validator: (_, v) => v ? Promise.resolve() : Promise.reject("Required") }]}
                            style={{ marginBottom: 10 }}>
                            <Checkbox style={{ fontSize: 12 }}>
                                I accept the <a href="/terms" target="_blank" rel="noreferrer">terms and conditions</a>
                            </Checkbox>
                        </Form.Item>
                        <Form.Item name="accept_charges" valuePropName="checked"
                            rules={[{ validator: (_, v) => v ? Promise.resolve() : Promise.reject("Required") }]}
                            style={{ marginBottom: 6 }}>
                            <Checkbox style={{ fontSize: 12 }}>
                                I acknowledge that additional charges may apply
                            </Checkbox>
                        </Form.Item>
                    </FormSection>
                    <ModalFooter onCancel={() => { setAccountingModalOpen(false); accountingForm.resetFields(); }}
                        submitLabel="Enable Accounting" loading={enableAccountingMutation.isPending}
                        cancelDisabled={enableAccountingMutation.isPending} color={C.green} icon={<CheckCircleOutlined />} />
                </Form>
            </Modal>
        </div>
    );
};

export default DiscoverPage;