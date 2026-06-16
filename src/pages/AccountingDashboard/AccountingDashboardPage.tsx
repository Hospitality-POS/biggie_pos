import React, { useState } from "react";
import { ProCard } from "@ant-design/pro-components";
import {
    Row,
    Col,
    Typography,
    Space,
    Select,
    Badge,
    Tag,
    Table,
    Spin,
    Alert,
    Progress,
    Tooltip,
    Button,
    App,
} from "antd";
import {
    ArrowUpOutlined,
    ArrowDownOutlined,
    DollarOutlined,
    BankOutlined,
    FileTextOutlined,
    WarningOutlined,
    SyncOutlined,
    DashboardOutlined,
    RiseOutlined,
    FallOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as ReTooltip,
    ResponsiveContainer,
    Legend,
    Cell,
    PieChart,
    Pie,
} from "recharts";
import {
    getAccountingDashboard,
    PLTrendMonth,
    RecentJournalEntry,
    TopExpenseAccount,
    CashAccount,
    DashboardSalesReceiptsSummary,
} from "@services/accounting/accountingDashboard";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import dayjs from "dayjs";

const { Text, Title } = Typography;

// ── Helpers ───────────────────────────────────────────────────────────────────

const getShopId = (): string => {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        // Returns empty string for admin users — backend handles no-shop-id gracefully
        return user?.shop_id || user?.shopId || user?.shop || user?.branchId || user?.branch_id || "";
    } catch {
        return "";
    }
};

const fmt = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtK = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return fmt(v);
};

const SOURCE_COLORS: Record<string, string> = {
    manual: "#6366f1",
    pos_sale: "#3b82f6",
    pos_subscription: "#06b6d4",
    invoice: "#10b981",
    bill: "#f59e0b",
    payment: "#8b5cf6",
    reconciliation: "#6366f1",
};

const EXPENSE_PALETTE = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

const MONTH_LABELS: string[] = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KPICardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    bg: string;
    pctChange?: number | null;
    suffix?: string;
    prefix?: string;
}

const KPICard: React.FC<KPICardProps> = ({
    title, value, icon, color, bg, pctChange, suffix, prefix = "KES",
}) => (
    <div
        style={{
            background: bg,
            borderRadius: 12,
            padding: "20px 24px",
            height: "100%",
            position: "relative",
            overflow: "hidden",
        }}
    >
        {/* decorative circle */}
        <div
            style={{
                position: "absolute",
                right: -20,
                top: -20,
                width: 90,
                height: 90,
                borderRadius: "50%",
                background: `${color}22`,
            }}
        />
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Space align="center">
                <div
                    style={{
                        background: `${color}20`,
                        borderRadius: 8,
                        padding: "6px 8px",
                        color,
                        fontSize: 18,
                        lineHeight: 1,
                    }}
                >
                    {icon}
                </div>
                <Text style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{title}</Text>
            </Space>
            <Text
                strong
                style={{ fontSize: 22, color: "#0f172a", display: "block", lineHeight: 1.2 }}
            >
                {prefix} {fmtK(value)}
                {suffix && <span style={{ fontSize: 13, marginLeft: 4, color: "#64748b" }}>{suffix}</span>}
            </Text>
            {pctChange !== null && pctChange !== undefined && (
                <Space size={4}>
                    {pctChange >= 0 ? (
                        <ArrowUpOutlined style={{ color: "#10b981", fontSize: 11 }} />
                    ) : (
                        <ArrowDownOutlined style={{ color: "#ef4444", fontSize: 11 }} />
                    )}
                    <Text style={{ fontSize: 11, color: pctChange >= 0 ? "#10b981" : "#ef4444" }}>
                        {Math.abs(pctChange)}% vs last year
                    </Text>
                </Space>
            )}
        </Space>
    </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const AccountingDashboardPage: React.FC = () => {
    const shopId = getShopId();
    const primaryColor = usePrimaryColor();
    const now = dayjs();

    const [fiscalYear, setFiscalYear] = useState(now.year());
    const [fiscalMonth, setFiscalMonth] = useState(now.month() + 1);

    const { data, isLoading, isFetching, isError, refetch } = useQuery({
        queryKey: ["accounting-dashboard", shopId, fiscalYear, fiscalMonth],
        queryFn: () => getAccountingDashboard({ shop_id: shopId, fiscal_year: fiscalYear, fiscal_month: fiscalMonth }),
        enabled: true,
        retry: 1,
    });

    // ── Year options ───────────────────────────────────────────────────────────

    const yearOptions = Array.from({ length: 5 }, (_, i) => {
        const y = now.year() - i;
        return { label: String(y), value: y };
    });

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
        label: MONTH_LABELS[i + 1],
        value: i + 1,
    }));

    if (isLoading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
                <Spin size="large" />
                <span style={{ color: "#64748b", fontSize: 13 }}>Loading accounting dashboard…</span>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div style={{ padding: 40 }}>
                <Alert
                    type="error"
                    showIcon
                    message="Failed to load accounting dashboard"
                    description="Could not connect to the accounting service. Check your connection and try again."
                    action={
                        <Button size="small" onClick={() => refetch()}>
                            Retry
                        </Button>
                    }
                />
            </div>
        );
    }

    const {
        overview,
        journal_summary,
        pl_trend,
        cash_positions,
        ar_ap_summary,
        notes_summary,
        recent_entries,
        top_expense_accounts,
        vat_summary,
        reconciliation_status,
        sales_receipts_summary,
    } = data;

    // ── Chart data ─────────────────────────────────────────────────────────────

    const plChartData = pl_trend.map((m: PLTrendMonth) => ({
        name: m.label,
        Revenue: m.revenue,
        Expenses: m.expenses,
        "Net P/L": m.net_profit,
    }));

    const pieData = Object.entries(journal_summary.by_source).map(([src, val]) => ({
        name: src.replace(/_/g, " "),
        value: val.count,
        color: SOURCE_COLORS[src] || "#94a3b8",
    }));

    const netVatPayable = vat_summary.net_vat_payable;

    // ── Recent entries columns ─────────────────────────────────────────────────

    const recentCols = [
        {
            title: "Entry",
            dataIndex: "entry_no",
            width: 110,
            render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
        },
        {
            title: "Date",
            dataIndex: "entry_date",
            width: 100,
            render: (d: string) => dayjs(d).format("DD MMM YY"),
        },
        {
            title: "Description",
            dataIndex: "description",
            ellipsis: true,
            render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
        },
        {
            title: "Source",
            dataIndex: "source",
            width: 110,
            render: (s: string) => (
                <Tag
                    style={{
                        background: `${SOURCE_COLORS[s] || "#94a3b8"}18`,
                        color: SOURCE_COLORS[s] || "#64748b",
                        border: "none",
                        fontSize: 10,
                        borderRadius: 4,
                    }}
                >
                    {s?.replace(/_/g, " ").toUpperCase()}
                </Tag>
            ),
        },
        {
            title: "Amount",
            dataIndex: "total_debit",
            width: 120,
            align: "right" as const,
            render: (v: number) => (
                <Text strong style={{ fontSize: 12, color: "#1d39c4" }}>
                    {fmtK(v)}
                </Text>
            ),
        },
    ];

    return (
        <App>
            <div style={{ padding: "0 0 24px" }}>

                {/* ── Header ── */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 24,
                    }}
                >
                    <Space align="center" size={12}>
                        <div
                            style={{
                                background: `${primaryColor}15`,
                                borderRadius: 10,
                                padding: "8px 10px",
                                color: primaryColor,
                                fontSize: 20,
                            }}
                        >
                            <DashboardOutlined />
                        </div>
                        <div>
                            <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
                                Accounting Dashboard
                            </Title>
                            <Text style={{ fontSize: 12, color: "#64748b" }}>
                                {MONTH_LABELS[fiscalMonth]} {fiscalYear} · Financial overview
                            </Text>
                        </div>
                    </Space>

                    <Space>
                        <Select
                            value={fiscalMonth}
                            onChange={setFiscalMonth}
                            options={monthOptions}
                            style={{ width: 80 }}
                            size="small"
                        />
                        <Select
                            value={fiscalYear}
                            onChange={setFiscalYear}
                            options={yearOptions}
                            style={{ width: 90 }}
                            size="small"
                        />
                        <Button
                            size="small"
                            icon={<SyncOutlined spin={isFetching} />}
                            onClick={() => refetch()}
                        >
                            Refresh
                        </Button>
                    </Space>
                </div>

                {/* ── Section 1: KPI Cards ── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Revenue"
                            value={overview.revenue.amount}
                            icon={<RiseOutlined />}
                            color="#10b981"
                            bg="#f0fdf4"
                            pctChange={overview.revenue.vs_prev_year}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Expenses"
                            value={overview.expenses.amount}
                            icon={<FallOutlined />}
                            color="#ef4444"
                            bg="#fef2f2"
                            pctChange={overview.expenses.vs_prev_year}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title={overview.net_profit.is_profit ? "Net Profit" : "Net Loss"}
                            value={Math.abs(overview.net_profit.amount)}
                            icon={<DollarOutlined />}
                            color={overview.net_profit.is_profit ? "#6366f1" : "#ef4444"}
                            bg={overview.net_profit.is_profit ? "#eef2ff" : "#fef2f2"}
                            pctChange={overview.net_profit.vs_prev_year}
                            suffix={`${overview.profit_margin}% margin`}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Total Assets"
                            value={overview.total_assets}
                            icon={<BankOutlined />}
                            color="#3b82f6"
                            bg="#eff6ff"
                            pctChange={null}
                        />
                    </Col>
                </Row>

                {/* ── Section 2: P&L Trend + Journal Source Pie ── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} lg={16}>
                        <ProCard
                            title={<Text strong>P&L Trend — Last 6 Months</Text>}
                            bordered
                            bodyStyle={{ paddingTop: 8 }}
                            size="small"
                        >
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={plChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                                    <ReTooltip
                                        formatter={(val: number) => [`KES ${fmt(val)}`, undefined]}
                                        contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                                    />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                                    <Line type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2.5} dot={false} />
                                    <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                                    <Line type="monotone" dataKey="Net P/L" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                                </LineChart>
                            </ResponsiveContainer>
                        </ProCard>
                    </Col>

                    <Col xs={24} lg={8}>
                        <ProCard
                            title={<Text strong>Entries by Source</Text>}
                            bordered
                            bodyStyle={{ paddingTop: 8 }}
                            size="small"
                        >
                            {pieData.length > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height={140}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={58}
                                                innerRadius={30}
                                            >
                                                {pieData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <ReTooltip
                                                formatter={(v: number, name: string) => [v, name]}
                                                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ marginTop: 8 }}>
                                        {pieData.map((e, i) => (
                                            <div
                                                key={i}
                                                style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}
                                            >
                                                <Space size={6}>
                                                    <div
                                                        style={{
                                                            width: 8, height: 8, borderRadius: "50%",
                                                            background: e.color, flexShrink: 0,
                                                        }}
                                                    />
                                                    <Text style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>
                                                        {e.name}
                                                    </Text>
                                                </Space>
                                                <Text style={{ fontSize: 11, fontWeight: 600 }}>{e.value}</Text>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 12 }}>
                                    No entries this period
                                </div>
                            )}
                        </ProCard>
                    </Col>
                </Row>

                {/* ── Section 3: AR/AP + Cash + VAT ── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>

                    {/* AR / AP */}
                    <Col xs={24} lg={8}>
                        <ProCard title={<Text strong>Receivables & Payables</Text>} bordered size="small">
                            <Space direction="vertical" size={16} style={{ width: "100%" }}>
                                <div
                                    style={{
                                        background: "#f0fdf4",
                                        borderRadius: 8,
                                        padding: "12px 16px",
                                    }}
                                >
                                    <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>
                                        Accounts Receivable
                                    </Text>
                                    <Text strong style={{ fontSize: 20, color: "#10b981" }}>
                                        KES {fmtK(ar_ap_summary.accounts_receivable.total_outstanding)}
                                    </Text>
                                    <div style={{ marginTop: 6, display: "flex", gap: 16 }}>
                                        <div>
                                            <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Invoiced</Text>
                                            <Text style={{ fontSize: 12, color: "#1d39c4" }}>
                                                {fmtK(ar_ap_summary.accounts_receivable.period_invoiced)}
                                            </Text>
                                        </div>
                                        <div>
                                            <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Collected</Text>
                                            <Text style={{ fontSize: 12, color: "#10b981" }}>
                                                {fmtK(ar_ap_summary.accounts_receivable.period_collected)}
                                            </Text>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        background: "#fef2f2",
                                        borderRadius: 8,
                                        padding: "12px 16px",
                                    }}
                                >
                                    <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>
                                        Accounts Payable
                                    </Text>
                                    <Text strong style={{ fontSize: 20, color: "#ef4444" }}>
                                        KES {fmtK(ar_ap_summary.accounts_payable.total_outstanding)}
                                    </Text>
                                    <div style={{ marginTop: 6, display: "flex", gap: 16 }}>
                                        <div>
                                            <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Billed</Text>
                                            <Text style={{ fontSize: 12, color: "#ef4444" }}>
                                                {fmtK(ar_ap_summary.accounts_payable.period_billed)}
                                            </Text>
                                        </div>
                                        <div>
                                            <Text style={{ fontSize: 10, color: "#64748b", display: "block" }}>Paid</Text>
                                            <Text style={{ fontSize: 12, color: "#10b981" }}>
                                                {fmtK(ar_ap_summary.accounts_payable.period_paid)}
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            </Space>
                        </ProCard>
                    </Col>

                    {/* Cash Positions */}
                    <Col xs={24} lg={8}>
                        <ProCard
                            title={<Text strong>Cash Positions</Text>}
                            extra={
                                <Text strong style={{ color: "#3b82f6", fontSize: 14 }}>
                                    KES {fmtK(cash_positions.total_cash)}
                                </Text>
                            }
                            bordered
                            size="small"
                        >
                            <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                {cash_positions.accounts.length === 0 ? (
                                    <Text type="secondary" style={{ fontSize: 12 }}>No bank accounts configured</Text>
                                ) : (
                                    cash_positions.accounts.map((acc: CashAccount, i: number) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "8px 10px",
                                                background: "#f8fafc",
                                                borderRadius: 8,
                                                borderLeft: `3px solid ${primaryColor}`,
                                            }}
                                        >
                                            <Space direction="vertical" size={0}>
                                                <Text style={{ fontSize: 12, fontWeight: 600 }}>{acc.account_name}</Text>
                                                {acc.bank_name && (
                                                    <Text style={{ fontSize: 10, color: "#94a3b8" }}>{acc.bank_name}</Text>
                                                )}
                                            </Space>
                                            <Text
                                                strong
                                                style={{
                                                    fontSize: 13,
                                                    color: acc.current_balance >= 0 ? "#0f172a" : "#ef4444",
                                                }}
                                            >
                                                KES {fmtK(acc.current_balance)}
                                            </Text>
                                        </div>
                                    ))
                                )}
                            </Space>
                        </ProCard>
                    </Col>

                    {/* VAT Summary */}
                    <Col xs={24} lg={8}>
                        <ProCard title={<Text strong>VAT Summary</Text>} bordered size="small">
                            <Space direction="vertical" size={10} style={{ width: "100%" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f0fdf4", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>VAT Collected</Text>
                                    <Text strong style={{ color: "#10b981" }}>KES {fmtK(vat_summary.vat_collected)}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#fff7ed", borderRadius: 8 }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }}>VAT Paid (Input)</Text>
                                    <Text strong style={{ color: "#f59e0b" }}>KES {fmtK(vat_summary.vat_paid)}</Text>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "12px",
                                        background: netVatPayable >= 0 ? "#fef2f2" : "#f0fdf4",
                                        borderRadius: 8,
                                        border: `1px solid ${netVatPayable >= 0 ? "#fecaca" : "#bbf7d0"}`,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: 600 }}>
                                        {netVatPayable >= 0 ? "Net VAT Payable" : "VAT Refund Due"}
                                    </Text>
                                    <Text strong style={{ fontSize: 16, color: netVatPayable >= 0 ? "#ef4444" : "#10b981" }}>
                                        KES {fmtK(Math.abs(netVatPayable))}
                                    </Text>
                                </div>

                                {/* Journal entry count pills */}
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                                    <Tooltip title="Draft entries">
                                        <div style={{ background: "#f1f5f9", borderRadius: 6, padding: "4px 10px", fontSize: 11 }}>
                                            📝 {journal_summary.draft_count} Draft
                                        </div>
                                    </Tooltip>
                                    <Tooltip title="Posted entries">
                                        <div style={{ background: "#f0fdf4", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#10b981" }}>
                                            ✓ {journal_summary.posted_count} Posted
                                        </div>
                                    </Tooltip>
                                    {journal_summary.voided_count > 0 && (
                                        <Tooltip title="Voided entries">
                                            <div style={{ background: "#fef2f2", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#ef4444" }}>
                                                ✗ {journal_summary.voided_count} Voided
                                            </div>
                                        </Tooltip>
                                    )}
                                </div>
                            </Space>
                        </ProCard>
                    </Col>
                </Row>

                {/* ── Section 5: Sales Receipts Summary ── */}
                {sales_receipts_summary && (
                    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                        <Col xs={24} lg={8}>
                            <ProCard title={<Text strong>Sales Receipts Overview</Text>} bordered size="small">
                                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f0fdf4", borderRadius: 8 }}>
                                        <Text style={{ fontSize: 12, color: "#64748b" }}>Posted</Text>
                                        <Text strong style={{ color: "#10b981" }}>KES {fmtK(sales_receipts_summary.total_posted)}</Text>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#fff7ed", borderRadius: 8 }}>
                                        <Text style={{ fontSize: 12, color: "#64748b" }}>Pending</Text>
                                        <Text strong style={{ color: "#f59e0b" }}>KES {fmtK(sales_receipts_summary.total_pending)}</Text>
                                    </div>
                                    {sales_receipts_summary.total_voided > 0 && (
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#fef2f2", borderRadius: 8 }}>
                                            <Text style={{ fontSize: 12, color: "#64748b" }}>Voided</Text>
                                            <Text strong style={{ color: "#ef4444" }}>KES {fmtK(sales_receipts_summary.total_voided)}</Text>
                                        </div>
                                    )}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "#eef2ff", borderRadius: 8, border: "1px solid #c7d2fe" }}>
                                        <Text style={{ fontSize: 12, fontWeight: 600 }}>VAT Collected</Text>
                                        <Text strong style={{ fontSize: 16, color: "#6366f1" }}>
                                            KES {fmtK(sales_receipts_summary.total_vat_collected)}
                                        </Text>
                                    </div>
                                </Space>
                            </ProCard>
                        </Col>

                        <Col xs={24} lg={16}>
                            <ProCard title={<Text strong>Sales Receipts by Payment Method</Text>} bordered size="small">
                                {Object.keys(sales_receipts_summary.by_payment_method).length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: 12 }}>
                                        No sales receipts this period
                                    </div>
                                ) : (
                                    <Row gutter={[12, 12]}>
                                        {Object.entries(sales_receipts_summary.by_payment_method).map(([method, data]) => (
                                            <Col xs={12} sm={8} key={method}>
                                                <div
                                                    style={{
                                                        background: "#f8fafc",
                                                        borderRadius: 8,
                                                        padding: "12px",
                                                        borderLeft: `3px solid ${primaryColor}`,
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>
                                                        {method.replace(/_/g, " ")}
                                                    </Text>
                                                    <Text strong style={{ fontSize: 16, color: "#0f172a", display: "block" }}>
                                                        KES {fmtK(data.total)}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                                                        {data.count} receipt{data.count !== 1 ? "s" : ""}
                                                    </Text>
                                                </div>
                                            </Col>
                                        ))}
                                    </Row>
                                )}
                            </ProCard>
                        </Col>
                    </Row>
                )}

                {/* ── Section 4: Top Expenses Bar + Notes Summary ── */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} lg={14}>
                        <ProCard title={<Text strong>Top Expense Accounts</Text>} bordered size="small" bodyStyle={{ paddingTop: 8 }}>
                            {top_expense_accounts.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: 12 }}>
                                    No expenses this period
                                </div>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart
                                            data={top_expense_accounts}
                                            layout="vertical"
                                            margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                            <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                                            <YAxis
                                                type="category"
                                                dataKey="account_name"
                                                width={130}
                                                tick={{ fontSize: 10, fill: "#64748b" }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "…" : v}
                                            />
                                            <ReTooltip
                                                formatter={(v: number) => [`KES ${fmt(v)}`, "Amount"]}
                                                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                                            />
                                            <Bar dataKey="total_amount" radius={[0, 4, 4, 0]}>
                                                {top_expense_accounts.map((_: TopExpenseAccount, i: number) => (
                                                    <Cell key={i} fill={EXPENSE_PALETTE[i % EXPENSE_PALETTE.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>

                                    <Space direction="vertical" size={6} style={{ width: "100%", marginTop: 8 }}>
                                        {top_expense_accounts.map((acc: TopExpenseAccount, i: number) => (
                                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <div
                                                    style={{
                                                        width: 8, height: 8, borderRadius: "50%",
                                                        background: EXPENSE_PALETTE[i % EXPENSE_PALETTE.length],
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                <Text style={{ fontSize: 11, flex: 1, color: "#475569" }}>{acc.account_name}</Text>
                                                <Progress
                                                    percent={acc.percentage}
                                                    showInfo={false}
                                                    strokeColor={EXPENSE_PALETTE[i % EXPENSE_PALETTE.length]}
                                                    style={{ width: 80, margin: 0 }}
                                                    size="small"
                                                />
                                                <Text style={{ fontSize: 11, width: 40, textAlign: "right", color: "#0f172a", fontWeight: 600 }}>
                                                    {acc.percentage}%
                                                </Text>
                                            </div>
                                        ))}
                                    </Space>
                                </>
                            )}
                        </ProCard>
                    </Col>

                    <Col xs={24} lg={10}>
                        <ProCard title={<Text strong>Credit & Debit Notes</Text>} bordered size="small">
                            <Space direction="vertical" size={12} style={{ width: "100%" }}>
                                {/* Credit Notes */}
                                <div>
                                    <Text style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>
                                        Credit Notes
                                    </Text>
                                    {Object.entries(notes_summary.by_type.CREDIT_NOTE || {}).map(([status, val]) => (
                                        <div key={status} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                            <Space size={6}>
                                                <Badge
                                                    status={
                                                        status === "Applied" ? "success" :
                                                            status === "Approved" ? "processing" :
                                                                status === "Voided" ? "error" : "default"
                                                    }
                                                />
                                                <Text style={{ fontSize: 12 }}>{status}</Text>
                                            </Space>
                                            <Space>
                                                <Text style={{ fontSize: 12, color: "#64748b" }}>×{val.count}</Text>
                                                <Text strong style={{ fontSize: 12, color: "#10b981" }}>
                                                    KES {fmtK(val.total)}
                                                </Text>
                                            </Space>
                                        </div>
                                    ))}
                                    <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 6, paddingTop: 6 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <Text style={{ fontSize: 11, color: "#64748b" }}>Total Credit Notes</Text>
                                            <Text strong style={{ color: "#10b981", fontSize: 12 }}>
                                                KES {fmtK(notes_summary.total_credit_notes)}
                                            </Text>
                                        </div>
                                    </div>
                                </div>

                                {/* Debit Notes */}
                                <div>
                                    <Text style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>
                                        Debit Notes
                                    </Text>
                                    {Object.entries(notes_summary.by_type.DEBIT_NOTE || {}).map(([status, val]) => (
                                        <div key={status} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                            <Space size={6}>
                                                <Badge
                                                    status={
                                                        status === "Applied" ? "success" :
                                                            status === "Approved" ? "processing" :
                                                                status === "Voided" ? "error" : "default"
                                                    }
                                                />
                                                <Text style={{ fontSize: 12 }}>{status}</Text>
                                            </Space>
                                            <Space>
                                                <Text style={{ fontSize: 12, color: "#64748b" }}>×{val.count}</Text>
                                                <Text strong style={{ fontSize: 12, color: "#f59e0b" }}>
                                                    KES {fmtK(val.total)}
                                                </Text>
                                            </Space>
                                        </div>
                                    ))}
                                    <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 6, paddingTop: 6 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <Text style={{ fontSize: 11, color: "#64748b" }}>Net Adjustment</Text>
                                            <Text
                                                strong
                                                style={{
                                                    fontSize: 12,
                                                    color: notes_summary.net_adjustment >= 0 ? "#10b981" : "#ef4444",
                                                }}
                                            >
                                                KES {fmtK(Math.abs(notes_summary.net_adjustment))}
                                            </Text>
                                        </div>
                                    </div>
                                </div>

                                {/* Pending approval alert */}
                                {notes_summary.pending_approval > 0 && (
                                    <Alert
                                        type="warning"
                                        showIcon
                                        icon={<WarningOutlined />}
                                        message={`${notes_summary.pending_approval} note${notes_summary.pending_approval > 1 ? "s" : ""} pending approval`}
                                        style={{ padding: "4px 10px", fontSize: 12 }}
                                    />
                                )}
                            </Space>
                        </ProCard>
                    </Col>
                </Row>

                {/* ── Section 5: Recent Entries + Reconciliation Status ── */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={16}>
                        <ProCard
                            title={<Text strong>Recent Journal Entries</Text>}
                            extra={
                                <Text style={{ fontSize: 11, color: "#94a3b8" }}>Last 5 posted</Text>
                            }
                            bordered
                            size="small"
                            bodyStyle={{ padding: 0 }}
                        >
                            <Table
                                rowKey="_id"
                                dataSource={recent_entries.slice(0, 5)}
                                columns={recentCols}
                                pagination={false}
                                size="small"
                                locale={{ emptyText: "No posted entries this period" }}
                            />
                        </ProCard>
                    </Col>

                    <Col xs={24} lg={8}>
                        <ProCard
                            title={<Text strong>Reconciliation Status</Text>}
                            bordered
                            size="small"
                        >
                            <Space direction="vertical" size={10} style={{ width: "100%" }}>
                                {/* Summary pills */}
                                <Row gutter={8}>
                                    <Col span={8}>
                                        <div style={{ textAlign: "center", background: "#f8fafc", borderRadius: 8, padding: "8px 4px" }}>
                                            <Text strong style={{ fontSize: 18, display: "block", color: "#64748b" }}>
                                                {reconciliation_status.open_count}
                                            </Text>
                                            <Text style={{ fontSize: 10, color: "#94a3b8" }}>Open</Text>
                                        </div>
                                    </Col>
                                    <Col span={8}>
                                        <div style={{ textAlign: "center", background: "#eff6ff", borderRadius: 8, padding: "8px 4px" }}>
                                            <Text strong style={{ fontSize: 18, display: "block", color: "#3b82f6" }}>
                                                {reconciliation_status.in_progress_count}
                                            </Text>
                                            <Text style={{ fontSize: 10, color: "#94a3b8" }}>In Progress</Text>
                                        </div>
                                    </Col>
                                    <Col span={8}>
                                        <div style={{ textAlign: "center", background: "#f0fdf4", borderRadius: 8, padding: "8px 4px" }}>
                                            <Text strong style={{ fontSize: 18, display: "block", color: "#10b981" }}>
                                                {reconciliation_status.completed_this_year}
                                            </Text>
                                            <Text style={{ fontSize: 10, color: "#94a3b8" }}>Done YTD</Text>
                                        </div>
                                    </Col>
                                </Row>

                                {/* Attention needed */}
                                {reconciliation_status.attention_needed > 0 && (
                                    <Alert
                                        type="warning"
                                        showIcon
                                        message={`${reconciliation_status.attention_needed} session${reconciliation_status.attention_needed > 1 ? "s" : ""} need attention`}
                                        style={{ padding: "4px 10px", fontSize: 12 }}
                                    />
                                )}

                                {/* Open sessions list */}
                                {reconciliation_status.open_sessions.length === 0 ? (
                                    <Text style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", display: "block", paddingTop: 8 }}>
                                        All accounts reconciled ✓
                                    </Text>
                                ) : (
                                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                                        {reconciliation_status.open_sessions.map((s, i) => {
                                            const accName =
                                                typeof s.account_id === "object"
                                                    ? s.account_id?.account_name
                                                    : s.account_name;

                                            const isBalanced = Math.abs(s.difference) < 0.001;

                                            return (
                                                <div
                                                    key={i}
                                                    style={{
                                                        padding: "8px 10px",
                                                        background: "#f8fafc",
                                                        borderRadius: 8,
                                                        borderLeft: `3px solid ${s.status === "In Progress" ? "#3b82f6" : "#94a3b8"}`,
                                                    }}
                                                >
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                        <Text style={{ fontSize: 11, fontWeight: 600 }}>{accName || s.account_name}</Text>
                                                        <Badge
                                                            status={s.status === "In Progress" ? "processing" : "default"}
                                                            text={<Text style={{ fontSize: 10 }}>{s.status}</Text>}
                                                        />
                                                    </div>
                                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                        <Text style={{ fontSize: 10, color: "#94a3b8" }}>
                                                            {dayjs(s.period_start).format("DD MMM")} — {dayjs(s.period_end).format("DD MMM YYYY")}
                                                        </Text>
                                                        <Text
                                                            style={{
                                                                fontSize: 10,
                                                                color: isBalanced ? "#10b981" : "#ef4444",
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {isBalanced
                                                                ? "Balanced ✓"
                                                                : `Diff: KES ${fmtK(Math.abs(s.difference))}`}
                                                        </Text>
                                                    </div>
                                                    {s.unmatched_count > 0 && (
                                                        <div style={{ marginTop: 3 }}>
                                                            <Text style={{ fontSize: 10, color: "#f59e0b" }}>
                                                                {s.unmatched_count} unmatched · {s.matched_count} matched
                                                            </Text>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </Space>
                                )}
                            </Space>
                        </ProCard>
                    </Col>
                </Row>

            </div>
        </App>
    );
};

export default AccountingDashboardPage;