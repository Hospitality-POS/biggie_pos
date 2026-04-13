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
    CustomerServiceOutlined,
    PhoneOutlined,
    CommentOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
    fetchTenantDetails,
    enableAccounting,
    disableAccounting,
    enablePosIntegration,
    disablePosIntegration,
    enableBandu,
    disableBandu,
    enableMteja,
    disableMteja,
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
    teal: "#0d9488",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

// ── App refresh ────────────────────────────────────────────────────────────────
const triggerAppRefresh = (queryClient: any, label = "Changes applied") => {
    let seconds = 3;
    notification.open({
        key: "app-refresh",
        message: <Text strong style={{ fontSize: 14, color: C.darkText }}>{label}</Text>,
        description: (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <CheckCircleOutlined style={{ color: C.green, fontSize: 16 }} />
                    <Text style={{ fontSize: 13, color: C.subText }}>
                        Reloading in <span id="refresh-countdown" style={{ fontWeight: 700, color: C.primary }}>{seconds}s</span>…
                    </Text>
                </div>
                <div style={{ background: "#e2e8f0", borderRadius: 4, height: 4, overflow: "hidden" }}>
                    <div id="refresh-progress" style={{ height: "100%", width: "100%", background: `linear-gradient(90deg, ${C.green}, ${C.primary})`, borderRadius: 4, transition: "width 1s linear" }} />
                </div>
            </div>
        ),
        icon: <SyncOutlined spin style={{ color: C.green }} />,
        duration: 0,
        style: { borderRadius: 12, border: `1px solid ${C.green}30`, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" },
    });
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

// ── Integrations (Conversations removed — it lives inside the Mteja card) ─────
const INTEGRATIONS = [
    {
        id: "relia_pos",
        name: "Duka by Base",
        category: "Point of Sale",
        description: "Smart POS for seamless sales, inventory, and customer management.",
        longDescription: "Duka by Base enables businesses to manage sales, handle shift operations, send notifications, and sync data in real-time with Base Pesa and other Base Suite products.",
        features: ["Sales", "Shift Management", "Notifications", "Inventory Management", "Customer Profiles", "Multi-branch Support", "Reports Dashboard"],
        benefits: ["Faster checkouts", "Accurate stock levels", "Better customer experience", "Centralized reporting"],
        setupTime: "2 minutes",
        status: "available",
        icon: CreditCardOutlined,
        color: C.blue,
        tags: ["Base Suite", "Popular", "POS"],
    },
    {
        id: "relia_accounting",
        name: "Pesa by Base",
        category: "Accounting & Finance",
        description: "Complete accounting solution auto-integrated with your POS.",
        longDescription: "Comprehensive accounting for Duka by Base. Auto-sync sales, track expenses, and generate professional financial reports.",
        features: ["Auto POS Sync", "Chart of Accounts", "Double-Entry Bookkeeping", "Financial Reports", "Bank Reconciliation", "Multi-user Access"],
        benefits: ["Eliminate manual entry", "Real-time visibility", "Professional statements", "Better cash flow", "Tax-ready reports"],
        setupTime: "2 minutes",
        status: "available",
        icon: CalculatorOutlined,
        color: C.green,
        tags: ["Base Suite", "Auto-sync"],
    },
    {
        id: "relia_payroll",
        name: "Bandu by Base",
        category: "Human Resource & Payroll",
        description: "Automate salary calculations, payslips, statutory deductions, and HR management.",
        longDescription: "Bandu by Base helps you manage employee payments, statutory compliance (NHIF, NSSF, PAYE), leave management, attendance tracking, and generate detailed reports seamlessly integrated with Pesa by Base.",
        features: ["Leave Management", "Attendance Tracking", "Employee Database", "Shift Scheduling", "Integration with Pesa by Base"],
        comingSoonFeatures: ["Payslip Generation", "NHIF/NSSF/PAYE Automation"],
        benefits: ["Accurate payments", "Full compliance", "Reduced manual work", "Easy reporting", "HR efficiency"],
        setupTime: "5 minutes",
        status: "available",
        icon: FileProtectOutlined,
        color: C.orange,
        tags: ["Base Suite", "Payroll", "HR"],
    },
    {
        id: "mteja",
        name: "Mteja by Base",
        category: "CRM & Customer Engagement",
        description: "All-in-one CRM suite — SMS, loyalty rewards, and customer relationship tools in one platform.",
        longDescription: "Mteja by Base is your complete customer engagement suite. Manage customer relationships, run loyalty programmes, send automated SMS notifications, and build personalised marketing campaigns — all deeply integrated with Duka by Base and Pesa by Base.",
        features: ["Customer Relationship Management", "Order & Payment Alerts", "Referral Programmes", "Customer Analytics"],
        comingSoonFeatures: ["Loyalty Points & Rewards", "Tiered Membership Levels", "Automated SMS Notifications", "Bulk SMS Campaigns", "Birthday & Anniversary Rewards"],
        benefits: ["Increase repeat visits", "Boost average order value", "Keep customers informed", "Reward your best customers", "Data-driven promotions", "Reduce no-shows", "Works without internet for SMS"],
        setupTime: "5 minutes",
        status: "available",
        icon: CustomerServiceOutlined,
        color: C.primary,
        tags: ["Base Suite", "CRM", "Loyalty"],
    },
    {
        id: "etims",
        name: "eTIMS",
        category: "KRA Tax Compliance",
        description: "Kenya Revenue Authority electronic Tax Invoice Management System integration.",
        longDescription: "eTIMS connects your POS and accounting directly to the Kenya Revenue Authority's electronic Tax Invoice Management System, automating tax invoice generation, real-time submission, and compliance reporting. Stay fully compliant without manual effort.",
        features: ["Automated Tax Invoice Generation", "Real-time KRA Submission", "VAT/PAYE Compliance", "Digital Receipts", "Audit Trail", "Integration with Pesa by Base & Duka by Base"],
        benefits: ["Full KRA compliance", "Zero manual filing", "Reduced audit risk", "Accurate tax records", "Auto VAT reconciliation"],
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
        longDescription: "The Base AI Assistant analyses your sales, inventory, and customer data to surface actionable insights — predict stock-outs, identify top performers, forecast revenue, and get plain-English answers to your business questions.",
        features: ["Natural Language Queries", "Revenue Forecasting", "Inventory Predictions", "Customer Behaviour Analysis", "Smart Alerts", "Automated Reports"],
        benefits: ["Make faster decisions", "Reduce dead stock", "Spot trends early", "Save hours on reporting", "Grow revenue intelligently"],
        setupTime: "N/A",
        status: "coming_soon",
        icon: RobotOutlined,
        color: C.indigo,
        tags: ["AI", "Analytics", "Coming Soon"],
    },
    {
        id: "developer_api",
        name: "Developer API",
        category: "Platform & Integrations",
        description: "REST API and webhooks to connect Base Suite with any third-party system.",
        longDescription: "The Base Developer API gives you full programmatic access to orders, inventory, customers, payments, and reports. Build custom integrations, automate workflows, and connect Base Suite to your existing tools via REST endpoints and real-time webhooks.",
        features: ["RESTful API", "Webhook Events", "OAuth 2.0 Authentication", "Sandbox Environment", "SDK Libraries", "API Key Management"],
        benefits: ["Integrate any system", "Automate workflows", "Build custom apps", "Real-time data access", "Enterprise-ready security"],
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

const FeatureList: React.FC<{ items: string[]; comingSoonItems?: string[]; color: string }> = ({ items, comingSoonItems, color }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", background: color + "18", color, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CheckOutlined />
                </span>
                <Text style={{ fontSize: 12, color: C.darkText }}>{item}</Text>
            </div>
        ))}
        {comingSoonItems?.map((item, i) => (
            <div key={`cs-${i}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#f59e0b18", color: C.orange, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <LockOutlined />
                </span>
                <Text style={{ fontSize: 12, color: C.subText }}>{item}</Text>
                <span style={{ background: "#fff8ed", color: C.orange, borderRadius: 4, fontSize: 9, fontWeight: 700, padding: "1px 5px", border: `1px solid ${C.orange}30`, flexShrink: 0 }}>
                    Soon
                </span>
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

// ── Pricing pill ───────────────────────────────────────────────────────────────
const PricingPill: React.FC<{ status: string }> = ({ status }) => {
    if (status === "coming_soon") {
        return (
            <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "8px 12px", flex: 1,
            }}>
                <PhoneOutlined style={{ color: C.primary, fontSize: 12, flexShrink: 0 }} />
                <div>
                    <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>Pricing</Text>
                    <Text strong style={{ fontSize: 11, color: C.primary }}>Contact support</Text>
                </div>
            </div>
        );
    }
    return (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", flex: 1 }}>
            <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>Pricing</Text>
            <Text strong style={{ fontSize: 12, color: C.darkText }}>Contact support</Text>
        </div>
    );
};

// ── Conversations sub-feature panel (rendered inside the Mteja card) ───────────
const ConversationsSubFeature: React.FC<{
    isConversationsEnabled: boolean;
    isMtejaEnabled: boolean;
    enableLoading: boolean;
    disableLoading: boolean;
    onEnable: () => void;
    onDisable: () => void;
}> = ({ isConversationsEnabled, isMtejaEnabled, enableLoading, disableLoading, onEnable, onDisable }) => (
    <div style={{
        border: `1px solid ${isConversationsEnabled ? C.teal + "60" : C.border}`,
        borderRadius: 10,
        padding: "10px 12px",
        marginTop: 10,
        background: isConversationsEnabled ? `${C.teal}06` : C.bg,
        transition: "all 0.2s",
    }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: isConversationsEnabled ? `${C.teal}18` : "#f1f5f9",
                    color: isConversationsEnabled ? C.teal : C.subText,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, flexShrink: 0,
                }}>
                    <CommentOutlined />
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Text strong style={{ fontSize: 12, color: C.darkText }}>Conversations</Text>
                        {isConversationsEnabled && (
                            <span style={{
                                background: "#f0fdf4", color: C.green,
                                borderRadius: 5, fontSize: 9, fontWeight: 700,
                                padding: "1px 6px", display: "flex", alignItems: "center", gap: 3,
                            }}>
                                <CheckCircleOutlined style={{ fontSize: 9 }} /> On
                            </span>
                        )}
                    </div>
                    <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>
                        Omnichannel inbox — WhatsApp, SMS & web chat
                    </Text>
                </div>
            </div>

            {isMtejaEnabled ? (
                isConversationsEnabled ? (
                    <Button
                        size="small"
                        danger
                        icon={<PoweroffOutlined />}
                        loading={disableLoading}
                        onClick={onDisable}
                        style={{ borderRadius: 7, fontSize: 11, flexShrink: 0 }}
                    >
                        Disable
                    </Button>
                ) : (
                    <Button
                        size="small"
                        icon={<PlusOutlined />}
                        loading={enableLoading}
                        onClick={onEnable}
                        style={{
                            borderRadius: 7, fontSize: 11, flexShrink: 0,
                            background: C.teal, borderColor: C.teal, color: "#fff",
                        }}
                    >
                        Enable
                    </Button>
                )
            ) : (
                <span style={{
                    background: "#fff8ed", color: C.orange,
                    borderRadius: 6, fontSize: 10, fontWeight: 600,
                    padding: "3px 8px", border: `1px solid ${C.orange}30`,
                    display: "flex", alignItems: "center", gap: 3, flexShrink: 0,
                }}>
                    <LockOutlined style={{ fontSize: 9 }} /> Enable Mteja first
                </span>
            )}
        </div>
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
    // Conversations sub-feature props (only used for Mteja card)
    conversationsProps?: {
        isEnabled: boolean;
        enableLoading: boolean;
        disableLoading: boolean;
        onEnable: () => void;
        onDisable: () => void;
    };
}> = ({ integration, isEnabled, onEnable, onDisable, onLearnMore, enableLoading, disableLoading, conversationsProps }) => {
    const Icon = integration.icon;
    const isComingSoon = integration.status === "coming_soon";

    return (
        <Card
            style={{
                height: "100%", borderRadius: 14,
                border: isEnabled
                    ? `1.5px solid ${integration.color}`
                    : `1px solid ${C.border}`,
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
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {isEnabled && (
                        <span style={{ background: "#f0fdf4", color: C.green, borderRadius: 6, fontSize: 10, fontWeight: 700, padding: "3px 8px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                            <CheckCircleOutlined style={{ fontSize: 10 }} /> Enabled
                        </span>
                    )}
                    {isComingSoon && (
                        <span style={{ background: C.bg, color: C.subText, borderRadius: 6, fontSize: 10, fontWeight: 600, padding: "3px 8px" }}>Coming Soon</span>
                    )}
                </div>
            </div>

            <div style={{ marginBottom: 10 }}>
                <Text strong style={{ fontSize: 15, color: C.darkText, display: "block" }}>{integration.name}</Text>
                <Text style={{ fontSize: 11, color: C.subText }}>{integration.category}</Text>
            </div>

            <Text style={{ fontSize: 12, color: C.subText, lineHeight: 1.6, display: "block", marginBottom: 14, flex: conversationsProps ? 0 : 1 }}>
                {integration.description}
            </Text>

            {/* Conversations sub-feature — only shown on the Mteja card */}
            {conversationsProps && (
                <div style={{ flex: 1 }}>
                    <ConversationsSubFeature
                        isConversationsEnabled={conversationsProps.isEnabled}
                        isMtejaEnabled={isEnabled}
                        enableLoading={conversationsProps.enableLoading}
                        disableLoading={conversationsProps.disableLoading}
                        onEnable={conversationsProps.onEnable}
                        onDisable={conversationsProps.onDisable}
                    />
                </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, marginTop: 14 }}>
                {integration.tags.map((tag, i) => (
                    <span key={i} style={{ background: i === 0 ? integration.color + "14" : C.bg, color: i === 0 ? integration.color : C.subText, borderRadius: 5, fontSize: 10, fontWeight: 600, padding: "2px 7px", border: `1px solid ${i === 0 ? integration.color + "30" : C.border}` }}>
                        {tag}
                    </span>
                ))}
            </div>

            {/* Pricing + setup */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <PricingPill status={integration.status} />
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", flex: 1, textAlign: "right" }}>
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
                    <Button
                        type="primary"
                        block
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
    const isMteja = integration.id === "mteja";

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
                            <FeatureList items={integration.features} comingSoonItems={(integration as any).comingSoonFeatures} color={integration.color} />
                        </FormSection>
                    </Col>
                    <Col xs={24} sm={12}>
                        <FormSection style={{ height: "100%" }}>
                            <SectionLabel>Benefits</SectionLabel>
                            <FeatureList items={integration.benefits} color={C.green} />
                        </FormSection>
                    </Col>
                </Row>

                {/* Conversations callout inside Mteja learn-more */}
                {isMteja && (
                    <div style={{
                        display: "flex", alignItems: "flex-start", gap: 10,
                        background: `${C.teal}08`, border: `1px solid ${C.teal}30`,
                        borderRadius: 10, padding: "12px 14px",
                    }}>
                        <CommentOutlined style={{ color: C.teal, fontSize: 16, flexShrink: 0, marginTop: 1 }} />
                        <div>
                            <Text strong style={{ fontSize: 13, color: C.teal, display: "block" }}>Includes Conversations</Text>
                            <Text style={{ fontSize: 12, color: C.subText }}>
                                Once Mteja is enabled, you can activate the Conversations omnichannel inbox (WhatsApp, SMS, web chat) directly from the Mteja card on this page.
                            </Text>
                        </div>
                    </div>
                )}

                <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: C.primaryLight, border: `1px solid ${C.primary}20`,
                    borderRadius: 10, padding: "14px 16px",
                }}>
                    <PhoneOutlined style={{ color: C.primary, fontSize: 20, flexShrink: 0 }} />
                    <div>
                        <Text strong style={{ fontSize: 13, color: C.primary, display: "block" }}>Pricing available on request</Text>
                        <Text style={{ fontSize: 12, color: C.subText }}>
                            Contact our support team for a quote tailored to your business size and needs.
                        </Text>
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
    const [banduModalOpen, setBanduModalOpen] = useState(false);
    const [mtejaModalOpen, setMtejaModalOpen] = useState(false);
    const [conversationsModalOpen, setConversationsModalOpen] = useState(false);
    const [isUpdatingPesapal, setIsUpdatingPesapal] = useState(false);

    const [pesapalForm] = Form.useForm();
    const [accountingForm] = Form.useForm();
    const [posForm] = Form.useForm();
    const [banduForm] = Form.useForm();
    const [mtejaForm] = Form.useForm();
    const [conversationsForm] = Form.useForm();

    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const tenantId = getCurrentTenantId();

    const { data: tenantDetails } = useQuery({
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
        if (id === "relia_payroll") return t.modules?.payroll === true ? "enabled" : "not_enabled";
        if (id === "mteja") return t.modules?.crm === true ? "enabled" : "not_enabled";
        if (id === "conversations") return t.modules?.omnichannel === true ? "enabled" : "not_enabled";
        if (id === "pesapal") return t.use_pesapal === true || pesapalConfig?.data?.enabled === true ? "enabled" : "not_enabled";
        return "not_enabled";
    };

    const enabledCount = INTEGRATIONS.filter(i => getStatus(i.id) === "enabled").length;

    // ── Mutations ─────────────────────────────────────────────────────────────
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
            triggerAppRefresh(queryClient, "Pesa by Base enabled successfully");
        },
        onError: (e: any) => notification.error({ message: "Failed to enable Pesa by Base", description: e.message, style: { borderRadius: 12 } }),
    });

    const disableAccountingMutation = useMutation({
        mutationFn: () => disableAccounting(tenantId),
        onSuccess: () => triggerAppRefresh(queryClient, "Pesa by Base disabled"),
        onError: (e: any) => notification.error({ message: "Failed to disable Pesa by Base", description: e.message, style: { borderRadius: 12 } }),
    });

    const enablePosMutation = useMutation({
        mutationFn: (config: any) => enablePosIntegration(tenantId, config),
        onSuccess: () => {
            setPosModalOpen(false);
            posForm.resetFields();
            triggerAppRefresh(queryClient, "Duka by Base enabled successfully");
        },
        onError: (e: any) => notification.error({ message: "Failed to enable Duka by Base", description: e.message, style: { borderRadius: 12 } }),
    });

    const disablePosMutation = useMutation({
        mutationFn: () => disablePosIntegration(tenantId),
        onSuccess: () => triggerAppRefresh(queryClient, "Duka by Base disabled"),
        onError: (e: any) => notification.error({ message: "Failed to disable Duka by Base", description: e.message, style: { borderRadius: 12 } }),
    });

    const enableBanduMutation = useMutation({
        mutationFn: (values: any) => enableBandu(tenantId, values),
        onSuccess: () => {
            setBanduModalOpen(false);
            banduForm.resetFields();
            triggerAppRefresh(queryClient, "Bandu by Base enabled successfully");
        },
        onError: (e: any) => notification.error({ message: "Failed to enable Bandu by Base", description: e.message, style: { borderRadius: 12 } }),
    });

    const disableBanduMutation = useMutation({
        mutationFn: () => disableBandu(tenantId),
        onSuccess: () => triggerAppRefresh(queryClient, "Bandu by Base disabled"),
        onError: (e: any) => notification.error({ message: "Failed to disable Bandu by Base", description: e.message, style: { borderRadius: 12 } }),
    });

    const enableMtejaMutation = useMutation({
        mutationFn: (values: any) => enableMteja(tenantId, values),
        onSuccess: () => {
            setMtejaModalOpen(false);
            mtejaForm.resetFields();
            triggerAppRefresh(queryClient, "Mteja by Base enabled successfully");
        },
        onError: (e: any) => notification.error({ message: "Failed to enable Mteja by Base", description: e.message, style: { borderRadius: 12 } }),
    });

    const disableMtejaMutation = useMutation({
        mutationFn: () => disableMteja(tenantId),
        onSuccess: () => triggerAppRefresh(queryClient, "Mteja by Base disabled"),
        onError: (e: any) => notification.error({ message: "Failed to disable Mteja by Base", description: e.message, style: { borderRadius: 12 } }),
    });

    const enableConversationsMutation = useMutation({
        mutationFn: (values: any) => enableMteja(tenantId, { ...values, enable_omnichannel: true }),
        onSuccess: () => {
            setConversationsModalOpen(false);
            conversationsForm.resetFields();
            queryClient.invalidateQueries(["tenant", tenantId]);
            triggerAppRefresh(queryClient, "Conversations enabled successfully");
        },
        onError: (e: any) => notification.error({ message: "Failed to enable Conversations", description: e.message, style: { borderRadius: 12 } }),
    });

    const disableConversationsMutation = useMutation({
        mutationFn: () => disableMteja(tenantId, { disable_omnichannel_only: true }),
        onSuccess: () => {
            queryClient.invalidateQueries(["tenant", tenantId]);
            triggerAppRefresh(queryClient, "Conversations disabled");
        },
        onError: (e: any) => notification.error({ message: "Failed to disable Conversations", description: e.message, style: { borderRadius: 12 } }),
    });

    const handleEnable = (integration: (typeof INTEGRATIONS)[0]) => {
        if (getStatus(integration.id) === "enabled") {
            notification.info({ message: `${integration.name} is already enabled`, style: { borderRadius: 12 } });
            return;
        }
        if (integration.id === "relia_pos") { setPosModalOpen(true); return; }
        if (integration.id === "relia_accounting") { setAccountingModalOpen(true); return; }
        if (integration.id === "relia_payroll") { setBanduModalOpen(true); return; }
        if (integration.id === "mteja") { setMtejaModalOpen(true); return; }
        if (integration.id === "pesapal") { setPesapalModalOpen(true); setIsUpdatingPesapal(false); return; }
        notification.info({ message: "Coming soon", description: "This integration will be available soon.", style: { borderRadius: 12 } });
    };

    const handleDisable = (id: string) => {
        const cfg: Record<string, { title: string; content: string; onOk: () => Promise<void> }> = {
            relia_accounting: {
                title: "Disable Pesa by Base?",
                content: "This will stop auto-sync and hide accounting features. Your data will be preserved.",
                onOk: () => disableAccountingMutation.mutateAsync(),
            },
            relia_pos: {
                title: "Disable Duka by Base?",
                content: "This will stop the POS system integration. Are you sure?",
                onOk: () => disablePosMutation.mutateAsync(),
            },
            relia_payroll: {
                title: "Disable Bandu by Base?",
                content: "This will hide payroll and HR features. All employee records will be preserved.",
                onOk: () => disableBanduMutation.mutateAsync(),
            },
            mteja: {
                title: "Disable Mteja by Base?",
                content: "This will stop CRM, loyalty, and SMS features. If Conversations is active, it will also be disabled. Your customer data will be preserved.",
                onOk: () => disableMtejaMutation.mutateAsync(),
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
            title: c.title, content: c.content,
            okText: "Disable", okType: "danger",
            onOk: c.onOk,
            style: { borderRadius: 12 },
        });
    };

    const handleDisableConversations = () => {
        Modal.confirm({
            title: "Disable Conversations?",
            content: "This will hide the omnichannel inbox. Your conversation history will be preserved and can be re-enabled at any time.",
            okText: "Disable",
            okType: "danger",
            onOk: () => disableConversationsMutation.mutateAsync(),
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
                    Enhance your business with powerful integrations from the Base Suite.
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
                    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                        <PhoneOutlined style={{ color: C.subText, fontSize: 14 }} />
                        <Text style={{ fontSize: 12, color: C.subText }}>Contact support for pricing</Text>
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
                                    (integration.id === "relia_pos" && disablePosMutation.isPending) ||
                                    (integration.id === "relia_payroll" && disableBanduMutation.isPending) ||
                                    (integration.id === "mteja" && disableMtejaMutation.isPending)
                                }
                                // Inject Conversations controls only into the Mteja card
                                conversationsProps={integration.id === "mteja" ? {
                                    isEnabled: getStatus("conversations") === "enabled",
                                    enableLoading: enableConversationsMutation.isPending,
                                    disableLoading: disableConversationsMutation.isPending,
                                    onEnable: () => setConversationsModalOpen(true),
                                    onDisable: handleDisableConversations,
                                } : undefined}
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

            {/* Duka by Base Modal */}
            <Modal open={posModalOpen}
                onCancel={() => { setPosModalOpen(false); posForm.resetFields(); }}
                footer={null} style={{ top: 20 }} width="min(520px, 96vw)" destroyOnClose
                title={<ModalTitle icon={<CreditCardOutlined />} color={C.blue} title="Enable Duka by Base" />}
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
                        submitLabel="Enable Duka by Base" loading={enablePosMutation.isPending}
                        cancelDisabled={enablePosMutation.isPending} color={C.blue} icon={<CheckCircleOutlined />} />
                </Form>
            </Modal>

            {/* Pesa by Base Modal */}
            <Modal open={accountingModalOpen}
                onCancel={() => { setAccountingModalOpen(false); accountingForm.resetFields(); }}
                footer={null} style={{ top: 20 }} width="min(520px, 96vw)" destroyOnClose
                title={<ModalTitle icon={<CalculatorOutlined />} color={C.green} title="Enable Pesa by Base" />}
            >
                <Form form={accountingForm} layout="vertical" onFinish={v => enableAccountingMutation.mutate(v)}
                    initialValues={{ accept_terms: false, accept_charges: false }} style={{ paddingTop: 4 }}>
                    <Alert message="Auto-sync POS data and get complete financial visibility." type="success" showIcon style={{ marginBottom: 14, borderRadius: 8 }} />
                    <FormSection>
                        <SectionLabel>What's Included</SectionLabel>
                        <FeatureList items={["Auto POS sync", "Chart of accounts", "P&L, Balance Sheet, Cash Flow reports", "Invoice & bill management", "Bank reconciliation", "Tax reports (eTIMS ready)", "Multi-user access"]} color={C.green} />
                    </FormSection>
                    <div style={{ background: C.primaryLight, border: `1px solid ${C.primary}20`, borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                        <PhoneOutlined style={{ color: C.primary, fontSize: 16, flexShrink: 0 }} />
                        <div>
                            <Text strong style={{ fontSize: 13, color: C.primary, display: "block" }}>Pricing available on request</Text>
                            <Text style={{ fontSize: 12, color: C.subText }}>Contact our support team for a tailored quote.</Text>
                        </div>
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
                            <Checkbox style={{ fontSize: 12 }}>I acknowledge that additional charges may apply</Checkbox>
                        </Form.Item>
                    </FormSection>
                    <ModalFooter onCancel={() => { setAccountingModalOpen(false); accountingForm.resetFields(); }}
                        submitLabel="Enable Pesa by Base" loading={enableAccountingMutation.isPending}
                        cancelDisabled={enableAccountingMutation.isPending} color={C.green} icon={<CheckCircleOutlined />} />
                </Form>
            </Modal>

            {/* Bandu by Base Modal */}
            <Modal open={banduModalOpen}
                onCancel={() => { setBanduModalOpen(false); banduForm.resetFields(); }}
                footer={null} style={{ top: 20 }} width="min(520px, 96vw)" destroyOnClose
                title={<ModalTitle icon={<FileProtectOutlined />} color={C.orange} title="Enable Bandu by Base" />}
            >
                <Form form={banduForm} layout="vertical" onFinish={v => enableBanduMutation.mutate(v)}
                    initialValues={{ accept_terms: false, accept_charges: false }} style={{ paddingTop: 4 }}>
                    <Alert message="Automate payroll, statutory deductions, and HR operations." type="warning" showIcon style={{ marginBottom: 14, borderRadius: 8 }} />
                    <FormSection>
                        <SectionLabel>What's Included</SectionLabel>
                        <FeatureList
                            items={["Leave & attendance management", "Employee database", "Shift scheduling", "Integration with Pesa by Base"]}
                            comingSoonItems={["Payslip generation", "NHIF / NSSF / PAYE automation"]}
                            color={C.orange}
                        />
                    </FormSection>
                    <div style={{ background: "#fff8ed", border: `1px solid ${C.orange}30`, borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                        <PhoneOutlined style={{ color: C.orange, fontSize: 16, flexShrink: 0 }} />
                        <div>
                            <Text strong style={{ fontSize: 13, color: C.orange, display: "block" }}>Pricing available on request</Text>
                            <Text style={{ fontSize: 12, color: C.subText }}>Contact our support team for a tailored quote.</Text>
                        </div>
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
                            <Checkbox style={{ fontSize: 12 }}>I acknowledge that additional charges may apply</Checkbox>
                        </Form.Item>
                    </FormSection>
                    <ModalFooter onCancel={() => { setBanduModalOpen(false); banduForm.resetFields(); }}
                        submitLabel="Enable Bandu by Base" loading={enableBanduMutation.isPending}
                        cancelDisabled={enableBanduMutation.isPending} color={C.orange} icon={<CheckCircleOutlined />} />
                </Form>
            </Modal>

            {/* Mteja by Base Modal */}
            <Modal open={mtejaModalOpen}
                onCancel={() => { setMtejaModalOpen(false); mtejaForm.resetFields(); }}
                footer={null} style={{ top: 20 }} width="min(520px, 96vw)" destroyOnClose
                title={<ModalTitle icon={<CustomerServiceOutlined />} color={C.primary} title="Enable Mteja by Base" />}
            >
                <Form form={mtejaForm} layout="vertical" onFinish={v => enableMtejaMutation.mutate(v)}
                    initialValues={{ accept_terms: false, accept_charges: false }} style={{ paddingTop: 4 }}>
                    <Alert message="Engage customers with loyalty rewards, SMS, and CRM tools." type="info" showIcon style={{ marginBottom: 14, borderRadius: 8 }} />
                    <FormSection>
                        <SectionLabel>What's Included</SectionLabel>
                        <FeatureList
                            items={["Customer relationship management", "Order & payment alerts", "Referral programmes", "Customer analytics"]}
                            comingSoonItems={["Loyalty points & rewards", "Tiered membership levels", "Automated SMS notifications", "Bulk SMS campaigns", "Birthday & anniversary rewards"]}
                            color={C.primary}
                        />
                    </FormSection>
                    {/* Conversations upsell */}
                    <div style={{
                        display: "flex", alignItems: "flex-start", gap: 10,
                        background: `${C.teal}08`, border: `1px solid ${C.teal}30`,
                        borderRadius: 10, padding: "12px 14px", marginBottom: 14,
                    }}>
                        <CommentOutlined style={{ color: C.teal, fontSize: 16, flexShrink: 0, marginTop: 1 }} />
                        <div>
                            <Text strong style={{ fontSize: 13, color: C.teal, display: "block" }}>Includes Conversations</Text>
                            <Text style={{ fontSize: 12, color: C.subText }}>
                                Once Mteja is enabled, you can activate the Conversations omnichannel inbox directly from the Mteja card.
                            </Text>
                        </div>
                    </div>
                    <div style={{ background: C.primaryLight, border: `1px solid ${C.primary}20`, borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                        <PhoneOutlined style={{ color: C.primary, fontSize: 16, flexShrink: 0 }} />
                        <div>
                            <Text strong style={{ fontSize: 13, color: C.primary, display: "block" }}>Pricing available on request</Text>
                            <Text style={{ fontSize: 12, color: C.subText }}>Contact our support team for a tailored quote.</Text>
                        </div>
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
                            <Checkbox style={{ fontSize: 12 }}>I acknowledge that additional charges may apply</Checkbox>
                        </Form.Item>
                    </FormSection>
                    <ModalFooter onCancel={() => { setMtejaModalOpen(false); mtejaForm.resetFields(); }}
                        submitLabel="Enable Mteja by Base" loading={enableMtejaMutation.isPending}
                        cancelDisabled={enableMtejaMutation.isPending} color={C.primary} icon={<CheckCircleOutlined />} />
                </Form>
            </Modal>

            {/* Conversations Modal (triggered from within the Mteja card) */}
            <Modal open={conversationsModalOpen}
                onCancel={() => { setConversationsModalOpen(false); conversationsForm.resetFields(); }}
                footer={null} style={{ top: 20 }} width="min(520px, 96vw)" destroyOnClose
                title={<ModalTitle icon={<CommentOutlined />} color={C.teal} title="Enable Conversations" />}
            >
                <Form form={conversationsForm} layout="vertical"
                    onFinish={v => enableConversationsMutation.mutate(v)}
                    initialValues={{ accept_terms: false, accept_charges: false }}
                    style={{ paddingTop: 4 }}>

                    <Alert
                        message="Part of Mteja by Base"
                        description="Conversations is the omnichannel messaging module within Mteja. It adds a unified inbox to your existing Mteja CRM."
                        type="info"
                        showIcon
                        icon={<CustomerServiceOutlined />}
                        style={{ marginBottom: 14, borderRadius: 8 }}
                    />

                    <FormSection>
                        <SectionLabel>What's Included</SectionLabel>
                        <FeatureList
                            items={["Unified Inbox", "WhatsApp Business Integration", "SMS Channel", "Web Chat Widget", "Conversation Assignment", "Staff Collaboration", "Message Templates"]}
                            comingSoonItems={["AI Auto-Reply", "Chatbot Builder", "Broadcast Campaigns"]}
                            color={C.teal}
                        />
                    </FormSection>

                    <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        background: `${C.teal}08`, border: `1px solid ${C.teal}30`,
                        borderRadius: 10, padding: "12px 14px", marginBottom: 14,
                    }}>
                        <PhoneOutlined style={{ color: C.teal, fontSize: 16, flexShrink: 0 }} />
                        <div>
                            <Text strong style={{ fontSize: 13, color: C.teal, display: "block" }}>Pricing available on request</Text>
                            <Text style={{ fontSize: 12, color: C.subText }}>Contact our support team for a tailored quote.</Text>
                        </div>
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
                            <Checkbox style={{ fontSize: 12 }}>I acknowledge that additional charges may apply</Checkbox>
                        </Form.Item>
                    </FormSection>

                    <ModalFooter
                        onCancel={() => { setConversationsModalOpen(false); conversationsForm.resetFields(); }}
                        submitLabel="Enable Conversations"
                        loading={enableConversationsMutation.isPending}
                        cancelDisabled={enableConversationsMutation.isPending}
                        color={C.teal}
                        icon={<CheckCircleOutlined />}
                    />
                </Form>
            </Modal>
        </div>
    );
};

export default DiscoverPage;