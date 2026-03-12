import React, { useState } from "react";
import {
    Space, Typography, Alert, Spin, Select, App, Empty, Card, Tabs, Tag, Table, Badge, Row, Col, Statistic,
} from "antd";
import { BarChartOutlined, ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
    getTrialBalance, getProfitAndLoss, getBalanceSheet, getGeneralLedger,
    getAccountBalances, getVATReport, getCashFlowSummary, getCustomerStatement,
    getSupplierStatement, getARAgingReport, getAPAgingReport,
} from "@services/accounting/reports";
import { fetchAllCustomers } from "@services/customers";
import { fetchAllSuppliers } from "@services/supplier";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import {
    PeriodFilter, AsOfFilter, ExportButton, exportToCSV,
    ComparativePeriod, ComparativeAsOf, suggestComparePeriod,
} from "./ReportFilters";
import {
    TrialBalanceTable, ProfitAndLossTable, BalanceSheetTable, GeneralLedgerTable,
    VATReportTable, CashFlowTable, AccountBalancesTable, CustomerStatementTable,
    SupplierStatementTable, ARAgingTable, APAgingTable,
} from "./ReportTables";
import dayjs, { Dayjs } from "dayjs";

const { Text } = Typography;

type ReportTab =
    | "profit-loss" | "balance-sheet" | "trial-balance" | "general-ledger"
    | "account-balances" | "vat" | "cash-flow" | "customer-statement"
    | "supplier-statement" | "ar-aging" | "ap-aging";

const TAB_ITEMS = [
    { key: "profit-loss", label: "P&L" },
    { key: "balance-sheet", label: "Balance Sheet" },
    { key: "trial-balance", label: "Trial Balance" },
    { key: "general-ledger", label: "General Ledger" },
    { key: "account-balances", label: "Account Balances" },
    { key: "vat", label: "VAT Report" },
    { key: "cash-flow", label: "Cash Flow" },
    { key: "customer-statement", label: "Customer Statement" },
    { key: "supplier-statement", label: "Supplier Statement" },
    { key: "ar-aging", label: "AR Aging" },
    { key: "ap-aging", label: "AP Aging" },
];

// ── Formatting ─────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
    (v ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Period label ───────────────────────────────────────────────────────────────
const buildPeriodLabel = (period: [Dayjs | null, Dayjs | null] | Dayjs | null): string => {
    if (!period) return "Period";
    if (dayjs.isDayjs(period)) return (period as Dayjs).format("DD MMM YYYY");
    const [f, t] = period as [Dayjs | null, Dayjs | null];
    if (!f || !t) return "Period";
    if (f.year() === t.year() && f.month() === 0 && t.month() === 11) return f.format("YYYY");
    if (f.isSame(f.startOf("month"), "day") && t.isSame(t.endOf("month"), "day") && f.month() === t.month())
        return f.format("MMM YYYY");
    return `${f.format("DD MMM YY")} – ${t.format("DD MMM YY")}`;
};

// ── Variance cell ──────────────────────────────────────────────────────────────
const VarianceCell: React.FC<{ current: number; compare: number; invertColors?: boolean }> = ({
    current, compare, invertColors = false,
}) => {
    const diff = current - compare;
    const pct = compare !== 0 ? (diff / Math.abs(compare)) * 100 : null;
    const isNeutral = diff === 0;
    const isPositive = diff > 0;
    const goodColor = invertColors ? "#ef4444" : "#10b981";
    const badColor = invertColors ? "#10b981" : "#ef4444";
    const color = isNeutral ? "#94a3b8" : isPositive ? goodColor : badColor;

    return (
        <Space size={4} style={{ justifyContent: "flex-end", width: "100%" }}>
            <Text style={{ fontSize: 12, color, fontWeight: 600 }}>
                {isNeutral ? "—" : `${isPositive ? "+" : ""}${fmt(diff)}`}
            </Text>
            {pct !== null && !isNeutral && (
                <Tag style={{ fontSize: 10, borderRadius: 20, padding: "0 6px", margin: 0, background: `${color}18`, border: `1px solid ${color}40`, color }}>
                    {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{" "}{Math.abs(pct).toFixed(1)}%
                </Tag>
            )}
        </Space>
    );
};

// ── Period header badges ───────────────────────────────────────────────────────
const PeriodHeaders: React.FC<{ currentLabel: string; compareLabel: string }> = ({ currentLabel, compareLabel }) => (
    <Space style={{ marginBottom: 12 }} size={8}>
        <Tag color="blue" style={{ borderRadius: 20, padding: "2px 12px", fontSize: 12 }}>Current: {currentLabel}</Tag>
        <Tag color="purple" style={{ borderRadius: 20, padding: "2px 12px", fontSize: 12 }}>Compare: {compareLabel}</Tag>
    </Space>
);

// ── Generic comparative table ──────────────────────────────────────────────────
interface ComparativeRow {
    account_name: string;
    account_code?: string;
    current: number;
    compare: number;
    invertColors?: boolean;
    tag?: string;
    tagColor?: string;
}

const ComparativeTable: React.FC<{
    rows: ComparativeRow[];
    currentLabel: string;
    compareLabel: string;
    title?: string;
    showSummary?: boolean;
}> = ({ rows, currentLabel, compareLabel, title, showSummary }) => (
    <div style={{ marginBottom: 16 }}>
        {title && <Text strong style={{ display: "block", fontSize: 13, marginBottom: 8, color: "#374151" }}>{title}</Text>}
        <Table
            size="small"
            pagination={false}
            dataSource={rows.map((r, i) => ({ ...r, key: i }))}
            columns={[
                {
                    title: "Account", dataIndex: "account_name",
                    render: (name, row) => (
                        <Space size={6}>
                            {row.account_code && <Text style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{row.account_code}</Text>}
                            <Text style={{ fontSize: 13 }}>{name}</Text>
                            {row.tag && <Tag color={row.tagColor || "default"} style={{ fontSize: 10, padding: "0 4px" }}>{row.tag}</Tag>}
                        </Space>
                    ),
                },
                {
                    title: <Text style={{ color: "#3b82f6", fontSize: 12 }}>{currentLabel}</Text>,
                    dataIndex: "current", align: "right" as const,
                    render: (v) => <Text style={{ fontWeight: 600, fontSize: 13 }}>{fmt(v ?? 0)}</Text>,
                },
                {
                    title: <Text style={{ color: "#7c3aed", fontSize: 12 }}>{compareLabel}</Text>,
                    dataIndex: "compare", align: "right" as const,
                    render: (v) => <Text style={{ fontSize: 13, color: "#64748b" }}>{fmt(v ?? 0)}</Text>,
                },
                {
                    title: "Variance", align: "right" as const,
                    render: (_, row) => <VarianceCell current={row.current ?? 0} compare={row.compare ?? 0} invertColors={row.invertColors} />,
                },
            ]}
            style={{ borderRadius: 8, overflow: "hidden" }}
            summary={showSummary ? () => {
                const totCurrent = rows.reduce((s, r) => s + (r.current ?? 0), 0);
                const totCompare = rows.reduce((s, r) => s + (r.compare ?? 0), 0);
                return (
                    <Table.Summary.Row style={{ background: "#f8fafc", fontWeight: 700 }}>
                        <Table.Summary.Cell index={0}><Text strong>Total</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right"><Text strong style={{ color: "#3b82f6" }}>{fmt(totCurrent)}</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right"><Text strong style={{ color: "#7c3aed" }}>{fmt(totCompare)}</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right"><VarianceCell current={totCurrent} compare={totCompare} /></Table.Summary.Cell>
                    </Table.Summary.Row>
                );
            } : undefined}
        />
    </div>
);

// ── Build compare map (keyed by account_code first, fallback account_name) ─────
const buildCompareMap = (rows: any[], valueKey: string | ((r: any) => number)) => {
    const map: Record<string, number> = {};
    (rows || []).forEach((r: any) => {
        const val = typeof valueKey === "function" ? valueKey(r) : (r[valueKey] ?? 0);
        if (r.account_code) map[r.account_code] = val;
        if (r.account_name) map[r.account_name] = val;
    });
    return map;
};

const lookupCompare = (map: Record<string, number>, code?: string, name?: string): number =>
    (code && map[code] !== undefined ? map[code] : (name && map[name] !== undefined ? map[name] : 0));

// ── Default state builders ─────────────────────────────────────────────────────
const makeDefaultPeriod = (): ComparativePeriod => {
    const primary: [Dayjs, Dayjs] = [dayjs().startOf("month"), dayjs().endOf("month")];
    return { primary, compare: suggestComparePeriod(primary) ?? primary, enabled: false };
};

const makeDefaultAsOf = (): ComparativeAsOf => ({
    primary: dayjs(),
    compare: dayjs().subtract(1, "year"),
    enabled: false,
});

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════
const AccountingReportsPage: React.FC = () => {
    const primaryColor = usePrimaryColor();
    const [activeTab, setActiveTab] = useState<ReportTab>("profit-loss");

    // ── State ─────────────────────────────────────────────────────────────────
    const [plPeriod, setPlPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [tbPeriod, setTbPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [glPeriod, setGlPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [vatPeriod, setVatPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [cfPeriod, setCfPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [custPeriod, setCustPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [suppPeriod, setSuppPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [arPeriod, setArPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [apPeriod, setApPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());

    const [bsAsOf, setBsAsOf] = useState<ComparativeAsOf>(makeDefaultAsOf());
    const [abAsOf, setAbAsOf] = useState<ComparativeAsOf>(makeDefaultAsOf());

    const [customerId, setCustomerId] = useState<string | undefined>();
    const [supplierId, setSupplierId] = useState<string | undefined>();
    const [compareCustomerId, setCompareCustomerId] = useState<string | undefined>();
    const [compareSupplierId, setCompareSupplierId] = useState<string | undefined>();

    const [runKey, setRunKey] = useState<Record<ReportTab, number>>({
        "profit-loss": 0, "balance-sheet": 0, "trial-balance": 0,
        "general-ledger": 0, "account-balances": 0, "vat": 0, "cash-flow": 0,
        "customer-statement": 0, "supplier-statement": 0, "ar-aging": 0, "ap-aging": 0,
    });

    const run = (tab: ReportTab) => setRunKey((p) => ({ ...p, [tab]: p[tab] + 1 }));
    const isReady = (tab: ReportTab) => runKey[tab] > 0;

    const cp = (obj: Record<string, any>) =>
        Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));

    // ── Primary queries ───────────────────────────────────────────────────────
    const plQ = useQuery({ queryKey: ["rpt-pl", plPeriod.primary, runKey["profit-loss"]], queryFn: () => getProfitAndLoss(cp({ from: plPeriod.primary[0]?.toISOString(), to: plPeriod.primary[1]?.toISOString() })), enabled: isReady("profit-loss"), retry: 1 });
    const bsQ = useQuery({ queryKey: ["rpt-bs", bsAsOf.primary, runKey["balance-sheet"]], queryFn: () => getBalanceSheet(bsAsOf.primary?.toISOString()), enabled: isReady("balance-sheet"), retry: 1 });
    const tbQ = useQuery({ queryKey: ["rpt-tb", tbPeriod.primary, runKey["trial-balance"]], queryFn: () => getTrialBalance(cp({ from: tbPeriod.primary[0]?.toISOString(), to: tbPeriod.primary[1]?.toISOString() })), enabled: isReady("trial-balance"), retry: 1 });
    const glQ = useQuery({ queryKey: ["rpt-gl", glPeriod.primary, runKey["general-ledger"]], queryFn: () => getGeneralLedger(cp({ from: glPeriod.primary[0]?.toISOString(), to: glPeriod.primary[1]?.toISOString() })), enabled: isReady("general-ledger"), retry: 1 });
    const abQ = useQuery({ queryKey: ["rpt-ab", abAsOf.primary, runKey["account-balances"]], queryFn: () => getAccountBalances(cp({ as_of: abAsOf.primary?.toISOString() })), enabled: isReady("account-balances"), retry: 1 });
    const vatQ = useQuery({ queryKey: ["rpt-vat", vatPeriod.primary, runKey["vat"]], queryFn: () => getVATReport(cp({ from: vatPeriod.primary[0]?.toISOString(), to: vatPeriod.primary[1]?.toISOString() })), enabled: isReady("vat"), retry: 1 });
    const cfQ = useQuery({ queryKey: ["rpt-cf", cfPeriod.primary, runKey["cash-flow"]], queryFn: () => getCashFlowSummary(cp({ from: cfPeriod.primary[0]?.toISOString(), to: cfPeriod.primary[1]?.toISOString() })), enabled: isReady("cash-flow"), retry: 1 });
    const custQ = useQuery({ queryKey: ["rpt-cust", customerId, custPeriod.primary, runKey["customer-statement"]], queryFn: () => getCustomerStatement(customerId!, cp({ from: custPeriod.primary[0]?.toISOString(), to: custPeriod.primary[1]?.toISOString() })), enabled: !!customerId && isReady("customer-statement"), retry: 1 });
    const suppQ = useQuery({ queryKey: ["rpt-supp", supplierId, suppPeriod.primary, runKey["supplier-statement"]], queryFn: () => getSupplierStatement(supplierId!, cp({ from: suppPeriod.primary[0]?.toISOString(), to: suppPeriod.primary[1]?.toISOString() })), enabled: !!supplierId && isReady("supplier-statement"), retry: 1 });
    const arQ = useQuery({ queryKey: ["rpt-ar", arPeriod.primary, runKey["ar-aging"]], queryFn: () => getARAgingReport(cp({ as_of_date: arPeriod.primary[1]?.toISOString() })), enabled: isReady("ar-aging"), retry: 1 });
    const apQ = useQuery({ queryKey: ["rpt-ap", apPeriod.primary, runKey["ap-aging"]], queryFn: () => getAPAgingReport(cp({ as_of_date: apPeriod.primary[1]?.toISOString() })), enabled: isReady("ap-aging"), retry: 1 });

    // ── Compare queries ───────────────────────────────────────────────────────
    const plQC = useQuery({ queryKey: ["rpt-pl-c", plPeriod.compare, runKey["profit-loss"]], queryFn: () => getProfitAndLoss(cp({ from: plPeriod.compare[0]?.toISOString(), to: plPeriod.compare[1]?.toISOString() })), enabled: plPeriod.enabled && isReady("profit-loss") && !!plPeriod.compare[0], retry: 1 });
    const bsQC = useQuery({ queryKey: ["rpt-bs-c", bsAsOf.compare, runKey["balance-sheet"]], queryFn: () => getBalanceSheet(bsAsOf.compare?.toISOString()), enabled: bsAsOf.enabled && isReady("balance-sheet") && !!bsAsOf.compare, retry: 1 });
    const tbQC = useQuery({ queryKey: ["rpt-tb-c", tbPeriod.compare, runKey["trial-balance"]], queryFn: () => getTrialBalance(cp({ from: tbPeriod.compare[0]?.toISOString(), to: tbPeriod.compare[1]?.toISOString() })), enabled: tbPeriod.enabled && isReady("trial-balance") && !!tbPeriod.compare[0], retry: 1 });
    const glQC = useQuery({ queryKey: ["rpt-gl-c", glPeriod.compare, runKey["general-ledger"]], queryFn: () => getGeneralLedger(cp({ from: glPeriod.compare[0]?.toISOString(), to: glPeriod.compare[1]?.toISOString() })), enabled: glPeriod.enabled && isReady("general-ledger") && !!glPeriod.compare[0], retry: 1 });
    const abQC = useQuery({ queryKey: ["rpt-ab-c", abAsOf.compare, runKey["account-balances"]], queryFn: () => getAccountBalances(cp({ as_of: abAsOf.compare?.toISOString() })), enabled: abAsOf.enabled && isReady("account-balances") && !!abAsOf.compare, retry: 1 });
    const vatQC = useQuery({ queryKey: ["rpt-vat-c", vatPeriod.compare, runKey["vat"]], queryFn: () => getVATReport(cp({ from: vatPeriod.compare[0]?.toISOString(), to: vatPeriod.compare[1]?.toISOString() })), enabled: vatPeriod.enabled && isReady("vat") && !!vatPeriod.compare[0], retry: 1 });
    const cfQC = useQuery({ queryKey: ["rpt-cf-c", cfPeriod.compare, runKey["cash-flow"]], queryFn: () => getCashFlowSummary(cp({ from: cfPeriod.compare[0]?.toISOString(), to: cfPeriod.compare[1]?.toISOString() })), enabled: cfPeriod.enabled && isReady("cash-flow") && !!cfPeriod.compare[0], retry: 1 });
    const custQC = useQuery({ queryKey: ["rpt-cust-c", compareCustomerId ?? customerId, custPeriod.compare, runKey["customer-statement"]], queryFn: () => getCustomerStatement((compareCustomerId ?? customerId)!, cp({ from: custPeriod.compare[0]?.toISOString(), to: custPeriod.compare[1]?.toISOString() })), enabled: custPeriod.enabled && !!(compareCustomerId ?? customerId) && isReady("customer-statement") && !!custPeriod.compare[0], retry: 1 });
    const suppQC = useQuery({ queryKey: ["rpt-supp-c", compareSupplierId ?? supplierId, suppPeriod.compare, runKey["supplier-statement"]], queryFn: () => getSupplierStatement((compareSupplierId ?? supplierId)!, cp({ from: suppPeriod.compare[0]?.toISOString(), to: suppPeriod.compare[1]?.toISOString() })), enabled: suppPeriod.enabled && !!(compareSupplierId ?? supplierId) && isReady("supplier-statement") && !!suppPeriod.compare[0], retry: 1 });
    const arQC = useQuery({ queryKey: ["rpt-ar-c", arPeriod.compare, runKey["ar-aging"]], queryFn: () => getARAgingReport(cp({ as_of_date: arPeriod.compare[1]?.toISOString() })), enabled: arPeriod.enabled && isReady("ar-aging") && !!arPeriod.compare[0], retry: 1 });
    const apQC = useQuery({ queryKey: ["rpt-ap-c", apPeriod.compare, runKey["ap-aging"]], queryFn: () => getAPAgingReport(cp({ as_of_date: apPeriod.compare[1]?.toISOString() })), enabled: apPeriod.enabled && isReady("ap-aging") && !!apPeriod.compare[0], retry: 1 });

    const { data: customersRaw } = useQuery({ queryKey: ["customers-select-rpt"], queryFn: () => fetchAllCustomers({}), enabled: activeTab === "customer-statement" || activeTab === "ar-aging" });
    const { data: suppliersRaw } = useQuery({ queryKey: ["suppliers-select-rpt"], queryFn: () => fetchAllSuppliers({}), enabled: activeTab === "supplier-statement" || activeTab === "ap-aging" });
    const customers = Array.isArray(customersRaw) ? customersRaw : [];
    const suppliers = Array.isArray(suppliersRaw) ? suppliersRaw : [];

    const Loading = () => <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>;
    const EmptyState = () => <Empty description="Run the report to see results" style={{ padding: 40 }} />;

    // ── Comparative helpers ───────────────────────────────────────────────────

    // Merge two account arrays into ComparativeRow[]
    const mergeRows = (
        primary: any[], compare: any[],
        valueKey: string | ((r: any) => number),
        invertColors = false
    ): ComparativeRow[] => {
        const cMap = buildCompareMap(compare, valueKey);
        return (primary || []).map((r: any) => ({
            account_code: r.account_code,
            account_name: r.account_name,
            current: typeof valueKey === "function" ? valueKey(r) : (r[valueKey] ?? 0),
            compare: lookupCompare(cMap, r.account_code, r.account_name),
            invertColors,
            tag: r.account_type,
            tagColor: { ASSET: "blue", LIABILITY: "red", EQUITY: "purple", REVENUE: "green", EXPENSE: "orange" }[r.account_type as string],
        }));
    };

    // ── Comparative renderers ─────────────────────────────────────────────────

    const renderComparativePL = () => {
        if (!plQ.data || !plQC.data) return null;
        const cl = buildPeriodLabel(plPeriod.primary);
        const cm = buildPeriodLabel(plPeriod.compare);
        const netCurrent = plQ.data.net_profit ?? ((plQ.data.revenue?.total_revenue || 0) - (plQ.data.expenses?.total_expenses || 0));
        const netCompare = plQC.data.net_profit ?? ((plQC.data.revenue?.total_revenue || 0) - (plQC.data.expenses?.total_expenses || 0));
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable title="Revenue" rows={mergeRows(plQ.data.revenue?.accounts, plQC.data.revenue?.accounts, "amount", false)} currentLabel={cl} compareLabel={cm} showSummary />
                <ComparativeTable title="Expenses" rows={mergeRows(plQ.data.expenses?.accounts, plQC.data.expenses?.accounts, "amount", true)} currentLabel={cl} compareLabel={cm} showSummary />
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px" }}>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <Text strong style={{ fontSize: 14 }}>Net Profit / Loss</Text>
                        <Space size={16}>
                            <Text strong style={{ fontSize: 14, color: "#3b82f6" }}>{fmt(netCurrent)}</Text>
                            <Text style={{ fontSize: 14, color: "#7c3aed" }}>{fmt(netCompare)}</Text>
                            <VarianceCell current={netCurrent} compare={netCompare} />
                        </Space>
                    </Space>
                </div>
            </Space>
        );
    };

    const renderComparativeTB = () => {
        if (!tbQ.data || !tbQC.data) return null;
        const cl = buildPeriodLabel(tbPeriod.primary);
        const cm = buildPeriodLabel(tbPeriod.compare);

        // Build compare lookup keyed by account_code AND account_name
        // Use period_debit / period_credit as the comparable values
        const cMap: Record<string, any> = {};
        (tbQC.data.rows || []).forEach((r: any) => {
            const key = r.account_code || r.account_name;
            cMap[key] = r;
            if (r.account_code) cMap[r.account_code] = r;
            if (r.account_name) cMap[r.account_name] = r;
        });

        const TYPE_COLORS: Record<string, string> = { ASSET: "blue", LIABILITY: "red", EQUITY: "purple", REVENUE: "green", EXPENSE: "orange" };

        const columns = [
            { title: "Code", dataIndex: "account_code", width: 80, render: (v: string) => <Text style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{v}</Text> },
            {
                title: "Account", dataIndex: "account_name",
                render: (v: string, r: any) => (
                    <Space size={4}>
                        <Text style={{ fontSize: 13 }}>{v}</Text>
                        {r.account_type && <Tag color={TYPE_COLORS[r.account_type]} style={{ fontSize: 10, padding: "0 4px" }}>{r.account_type}</Tag>}
                    </Space>
                ),
            },
            {
                title: <Text style={{ color: "#3b82f6", fontSize: 11 }}>Debit ({cl})</Text>,
                align: "right" as const,
                render: (_: any, r: any) => <Text style={{ fontWeight: 600, fontSize: 12, color: "#cf1322" }}>{r.period_debit > 0 ? fmt(r.period_debit) : "—"}</Text>,
            },
            {
                title: <Text style={{ color: "#3b82f6", fontSize: 11 }}>Credit ({cl})</Text>,
                align: "right" as const,
                render: (_: any, r: any) => <Text style={{ fontWeight: 600, fontSize: 12, color: "#389e0d" }}>{r.period_credit > 0 ? fmt(r.period_credit) : "—"}</Text>,
            },
            {
                title: <Text style={{ color: "#7c3aed", fontSize: 11 }}>Debit ({cm})</Text>,
                align: "right" as const,
                render: (_: any, r: any) => {
                    const c = cMap[r.account_code] || cMap[r.account_name];
                    const val = c?.period_debit ?? 0;
                    return <Text style={{ fontSize: 12, color: "#64748b" }}>{val > 0 ? fmt(val) : "—"}</Text>;
                },
            },
            {
                title: <Text style={{ color: "#7c3aed", fontSize: 11 }}>Credit ({cm})</Text>,
                align: "right" as const,
                render: (_: any, r: any) => {
                    const c = cMap[r.account_code] || cMap[r.account_name];
                    const val = c?.period_credit ?? 0;
                    return <Text style={{ fontSize: 12, color: "#64748b" }}>{val > 0 ? fmt(val) : "—"}</Text>;
                },
            },
            {
                title: "Δ Net",
                align: "right" as const,
                render: (_: any, r: any) => {
                    const c = cMap[r.account_code] || cMap[r.account_name];
                    const currNet = (r.period_debit ?? 0) - (r.period_credit ?? 0);
                    const compNet = (c?.period_debit ?? 0) - (c?.period_credit ?? 0);
                    return <VarianceCell current={currNet} compare={compNet} />;
                },
            },
        ];

        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <Table
                    size="small"
                    pagination={{ pageSize: 30, showSizeChanger: true }}
                    dataSource={(tbQ.data.rows || []).map((r: any, i: number) => ({ ...r, key: i }))}
                    columns={columns}
                    scroll={{ x: 900 }}
                    style={{ borderRadius: 8, overflow: "hidden" }}
                    summary={() => {
                        const totDr = (tbQ.data.rows || []).reduce((s: number, r: any) => s + (r.period_debit ?? 0), 0);
                        const totCr = (tbQ.data.rows || []).reduce((s: number, r: any) => s + (r.period_credit ?? 0), 0);
                        const cDr = (tbQC.data.rows || []).reduce((s: number, r: any) => s + (r.period_debit ?? 0), 0);
                        const cCr = (tbQC.data.rows || []).reduce((s: number, r: any) => s + (r.period_credit ?? 0), 0);
                        return (
                            <Table.Summary.Row style={{ background: "#f8fafc", fontWeight: 700 }}>
                                <Table.Summary.Cell index={0} colSpan={2}><Text strong>Totals</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={2} align="right"><Text strong style={{ color: "#cf1322" }}>{fmt(totDr)}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={3} align="right"><Text strong style={{ color: "#389e0d" }}>{fmt(totCr)}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={4} align="right"><Text style={{ color: "#64748b" }}>{fmt(cDr)}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={5} align="right"><Text style={{ color: "#64748b" }}>{fmt(cCr)}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={6} align="right"><VarianceCell current={totDr - totCr} compare={cDr - cCr} /></Table.Summary.Cell>
                            </Table.Summary.Row>
                        );
                    }}
                />
            </Space>
        );
    };

    const renderComparativeBS = () => {
        if (!bsQ.data || !bsQC.data) return null;
        const cl = buildPeriodLabel(bsAsOf.primary);
        const cm = buildPeriodLabel(bsAsOf.compare);
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable title="Assets" rows={mergeRows(bsQ.data.assets?.accounts, bsQC.data.assets?.accounts, "balance", false)} currentLabel={cl} compareLabel={cm} showSummary />
                <ComparativeTable title="Liabilities" rows={mergeRows(bsQ.data.liabilities?.accounts, bsQC.data.liabilities?.accounts, "balance", true)} currentLabel={cl} compareLabel={cm} showSummary />
                <ComparativeTable title="Equity" rows={mergeRows(bsQ.data.equity?.accounts, bsQC.data.equity?.accounts, "balance", false)} currentLabel={cl} compareLabel={cm} showSummary />
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px" }}>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <Text strong style={{ fontSize: 14 }}>Total Assets</Text>
                        <Space size={16}>
                            <Text strong style={{ fontSize: 14, color: "#3b82f6" }}>{fmt(bsQ.data.totals?.total_assets ?? 0)}</Text>
                            <Text style={{ fontSize: 14, color: "#7c3aed" }}>{fmt(bsQC.data.totals?.total_assets ?? 0)}</Text>
                            <VarianceCell current={bsQ.data.totals?.total_assets ?? 0} compare={bsQC.data.totals?.total_assets ?? 0} />
                        </Space>
                    </Space>
                </div>
            </Space>
        );
    };

    const renderComparativeGL = () => {
        if (!glQ.data || !glQC.data) return null;
        const cl = buildPeriodLabel(glPeriod.primary);
        const cm = buildPeriodLabel(glPeriod.compare);
        // Map compare accounts by account_code
        const cAccMap: Record<string, any> = {};
        (glQC.data.accounts || []).forEach((a: any) => { cAccMap[a.account_code] = a; cAccMap[a.account_name] = a; });

        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable
                    title="Account Activity"
                    rows={(glQ.data.accounts || []).map((a: any) => {
                        const ca = cAccMap[a.account_code] || cAccMap[a.account_name];
                        return {
                            account_code: a.account_code,
                            account_name: a.account_name,
                            current: a.total_debit - a.total_credit,
                            compare: ca ? (ca.total_debit - ca.total_credit) : 0,
                        };
                    })}
                    currentLabel={cl} compareLabel={cm} showSummary
                />
            </Space>
        );
    };

    const renderComparativeAB = () => {
        if (!abQ.data || !abQC.data) return null;
        const cl = buildPeriodLabel(abAsOf.primary);
        const cm = buildPeriodLabel(abAsOf.compare);
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable
                    title="Account Balances"
                    rows={mergeRows(abQ.data.accounts, abQC.data.accounts, "balance", false)}
                    currentLabel={cl} compareLabel={cm} showSummary
                />
            </Space>
        );
    };

    const renderComparativeVAT = () => {
        if (!vatQ.data || !vatQC.data) return null;
        const cl = buildPeriodLabel(vatPeriod.primary);
        const cm = buildPeriodLabel(vatPeriod.compare);
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable
                    title="VAT Summary"
                    rows={[
                        { account_name: "Output VAT (Collected)", current: vatQ.data.summary?.vat_collected ?? 0, compare: vatQC.data.summary?.vat_collected ?? 0 },
                        { account_name: "Input VAT (Paid)", current: vatQ.data.summary?.vat_paid ?? 0, compare: vatQC.data.summary?.vat_paid ?? 0, invertColors: true },
                        { account_name: "Net VAT Payable", current: vatQ.data.summary?.net_vat_payable ?? 0, compare: vatQC.data.summary?.net_vat_payable ?? 0 },
                    ]}
                    currentLabel={cl} compareLabel={cm}
                />
            </Space>
        );
    };

    const renderComparativeCF = () => {
        if (!cfQ.data || !cfQC.data) return null;
        const cl = buildPeriodLabel(cfPeriod.primary);
        const cm = buildPeriodLabel(cfPeriod.compare);
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable
                    title="Cash Flow by Account"
                    rows={mergeRows(cfQ.data.accounts, cfQC.data.accounts, "net_cash_flow", false)}
                    currentLabel={cl} compareLabel={cm} showSummary
                />
                <ComparativeTable
                    title="Summary"
                    rows={[
                        { account_name: "Total Inflows", current: cfQ.data.totals?.total_inflows ?? 0, compare: cfQC.data.totals?.total_inflows ?? 0 },
                        { account_name: "Total Outflows", current: cfQ.data.totals?.total_outflows ?? 0, compare: cfQC.data.totals?.total_outflows ?? 0, invertColors: true },
                        { account_name: "Net Cash Flow", current: cfQ.data.totals?.net_cash_flow ?? 0, compare: cfQC.data.totals?.net_cash_flow ?? 0 },
                    ]}
                    currentLabel={cl} compareLabel={cm}
                />
            </Space>
        );
    };

    const renderComparativeCust = () => {
        if (!custQ.data || !custQC.data) return null;
        const cl = buildPeriodLabel(custPeriod.primary);
        const cm = buildPeriodLabel(custPeriod.compare);
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable
                    title="Customer Summary"
                    rows={[
                        { account_name: "Total Invoiced", current: custQ.data.summary?.total_invoiced ?? 0, compare: custQC.data.summary?.total_invoiced ?? 0 },
                        { account_name: "Total Paid", current: custQ.data.summary?.total_paid ?? 0, compare: custQC.data.summary?.total_paid ?? 0 },
                        { account_name: "Balance", current: custQ.data.summary?.closing_balance ?? 0, compare: custQC.data.summary?.closing_balance ?? 0 },
                    ]}
                    currentLabel={cl} compareLabel={cm}
                />
            </Space>
        );
    };

    const renderComparativeSupp = () => {
        if (!suppQ.data || !suppQC.data) return null;
        const cl = buildPeriodLabel(suppPeriod.primary);
        const cm = buildPeriodLabel(suppPeriod.compare);
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable
                    title="Supplier Summary"
                    rows={[
                        { account_name: "Total Billed", current: suppQ.data.summary?.total_billed ?? 0, compare: suppQC.data.summary?.total_billed ?? 0 },
                        { account_name: "Total Paid", current: suppQ.data.summary?.total_paid ?? 0, compare: suppQC.data.summary?.total_paid ?? 0 },
                        { account_name: "Balance", current: suppQ.data.summary?.closing_balance ?? 0, compare: suppQC.data.summary?.closing_balance ?? 0 },
                    ]}
                    currentLabel={cl} compareLabel={cm}
                />
            </Space>
        );
    };

    const renderComparativeAR = () => {
        if (!arQ.data || !arQC.data) return null;
        const cl = buildPeriodLabel(arPeriod.primary);
        const cm = buildPeriodLabel(arPeriod.compare);
        const cCustMap: Record<string, any> = {};
        (arQC.data.customers || []).forEach((c: any) => { cCustMap[c.customer_id] = c; });
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable
                    title="AR Outstanding by Customer"
                    rows={(arQ.data.customers || []).map((c: any) => ({
                        account_name: c.customer_name,
                        current: c.total ?? 0,
                        compare: cCustMap[c.customer_id]?.total ?? 0,
                    }))}
                    currentLabel={cl} compareLabel={cm} showSummary
                />
            </Space>
        );
    };

    const renderComparativeAP = () => {
        if (!apQ.data || !apQC.data) return null;
        const cl = buildPeriodLabel(apPeriod.primary);
        const cm = buildPeriodLabel(apPeriod.compare);
        const cSuppMap: Record<string, any> = {};
        (apQC.data.suppliers || []).forEach((s: any) => { cSuppMap[s.supplier_id] = s; });
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable
                    title="AP Outstanding by Supplier"
                    rows={(apQ.data.suppliers || []).map((s: any) => ({
                        account_name: s.supplier_name,
                        current: s.total ?? 0,
                        compare: cSuppMap[s.supplier_id]?.total ?? 0,
                        invertColors: true,
                    }))}
                    currentLabel={cl} compareLabel={cm} showSummary
                />
            </Space>
        );
    };

    // ── Tab content ───────────────────────────────────────────────────────────
    const isLoading = (pQ: any, cQ: any, enabled: boolean) => pQ.isFetching || (enabled && cQ.isFetching);

    const renderContent = () => {
        switch (activeTab) {

            case "profit-loss": return <>
                <PeriodFilter value={plPeriod} onChange={setPlPeriod} onRun={() => run("profit-loss")} loading={isLoading(plQ, plQC, plPeriod.enabled)} supportComparative
                    extra={plQ.data && !plPeriod.enabled && <ExportButton onExport={() => exportToCSV("profit_and_loss", [...(plQ.data!.revenue?.accounts || []).map((a: any) => ({ section: "Revenue", ...a })), ...(plQ.data!.expenses?.accounts || []).map((a: any) => ({ section: "Expense", ...a }))])} />}
                />
                {plQ.isFetching ? <Loading /> : plPeriod.enabled && plQ.data && plQC.data ? renderComparativePL() : plQ.data ? <ProfitAndLossTable data={plQ.data} /> : <EmptyState />}
            </>;

            case "balance-sheet": return <>
                <AsOfFilter value={bsAsOf} onChange={setBsAsOf} onRun={() => run("balance-sheet")} loading={isLoading(bsQ, bsQC, bsAsOf.enabled)} supportComparative
                    extra={bsQ.data && !bsAsOf.enabled && <ExportButton onExport={() => exportToCSV("balance_sheet", [...(bsQ.data!.assets?.accounts || []).map((a: any) => ({ section: "Asset", ...a })), ...(bsQ.data!.liabilities?.accounts || []).map((a: any) => ({ section: "Liability", ...a })), ...(bsQ.data!.equity?.accounts || []).map((a: any) => ({ section: "Equity", ...a }))])} />}
                />
                {bsQ.isFetching ? <Loading /> : bsAsOf.enabled && bsQ.data && bsQC.data ? renderComparativeBS() : bsQ.data ? <BalanceSheetTable data={bsQ.data} /> : <EmptyState />}
            </>;

            case "trial-balance": return <>
                <PeriodFilter value={tbPeriod} onChange={setTbPeriod} onRun={() => run("trial-balance")} loading={isLoading(tbQ, tbQC, tbPeriod.enabled)} supportComparative
                    extra={tbQ.data && !tbPeriod.enabled && <ExportButton onExport={() => exportToCSV("trial_balance", tbQ.data!.rows || [])} />}
                />
                {tbQ.isFetching ? <Loading /> : tbPeriod.enabled && tbQ.data && tbQC.data ? renderComparativeTB() : tbQ.data ? <TrialBalanceTable data={tbQ.data} /> : <EmptyState />}
            </>;

            case "general-ledger": return <>
                <PeriodFilter value={glPeriod} onChange={setGlPeriod} onRun={() => run("general-ledger")} loading={isLoading(glQ, glQC, glPeriod.enabled)} supportComparative />
                {glQ.isFetching ? <Loading /> : glPeriod.enabled && glQ.data && glQC.data ? renderComparativeGL() : glQ.data ? <GeneralLedgerTable data={glQ.data} /> : <EmptyState />}
            </>;

            case "account-balances": return <>
                <AsOfFilter value={abAsOf} onChange={setAbAsOf} onRun={() => run("account-balances")} loading={isLoading(abQ, abQC, abAsOf.enabled)} supportComparative
                    extra={abQ.data && !abAsOf.enabled && <ExportButton onExport={() => exportToCSV("account_balances", abQ.data!.accounts || [])} />}
                />
                {abQ.isFetching ? <Loading /> : abAsOf.enabled && abQ.data && abQC.data ? renderComparativeAB() : abQ.data ? <AccountBalancesTable data={abQ.data} /> : <EmptyState />}
            </>;

            case "vat": return <>
                <PeriodFilter value={vatPeriod} onChange={setVatPeriod} onRun={() => run("vat")} loading={isLoading(vatQ, vatQC, vatPeriod.enabled)} supportComparative
                    extra={vatQ.data && !vatPeriod.enabled && <ExportButton onExport={() => exportToCSV("vat_report", vatQ.data!.transactions || [])} />}
                />
                {vatQ.isFetching ? <Loading /> : vatPeriod.enabled && vatQ.data && vatQC.data ? renderComparativeVAT() : vatQ.data ? <VATReportTable data={vatQ.data} /> : <EmptyState />}
            </>;

            case "cash-flow": return <>
                <PeriodFilter value={cfPeriod} onChange={setCfPeriod} onRun={() => run("cash-flow")} loading={isLoading(cfQ, cfQC, cfPeriod.enabled)} supportComparative
                    extra={cfQ.data && !cfPeriod.enabled && <ExportButton onExport={() => exportToCSV("cash_flow", cfQ.data!.accounts || [])} />}
                />
                {cfQ.isFetching ? <Loading /> : cfPeriod.enabled && cfQ.data && cfQC.data ? renderComparativeCF() : cfQ.data ? <CashFlowTable data={cfQ.data} /> : <EmptyState />}
            </>;

            case "customer-statement": return <>
                <Space style={{ marginBottom: 12 }} wrap>
                    <Select showSearch placeholder="Select customer…" value={customerId} onChange={setCustomerId} style={{ width: 260, borderRadius: 8 }} optionFilterProp="label"
                        options={customers.map((c: any) => ({ label: `${c.customer_name}${c.customer_phone ? ` — ${c.customer_phone}` : ""}`, value: c._id }))} />
                    {custPeriod.enabled && (
                        <Select showSearch placeholder="Compare customer (optional)…" value={compareCustomerId} onChange={setCompareCustomerId} allowClear style={{ width: 260, borderRadius: 8 }} optionFilterProp="label"
                            options={customers.map((c: any) => ({ label: `${c.customer_name}${c.customer_phone ? ` — ${c.customer_phone}` : ""}`, value: c._id }))} />
                    )}
                </Space>
                <PeriodFilter value={custPeriod} onChange={setCustPeriod} onRun={() => { if (customerId) run("customer-statement"); }} loading={isLoading(custQ, custQC, custPeriod.enabled)} supportComparative
                    extra={custQ.data && !custPeriod.enabled && <ExportButton onExport={() => exportToCSV("customer_statement", custQ.data!.transactions || [])} />}
                />
                {!customerId && <Alert type="info" showIcon message="Select a customer to generate their statement." style={{ marginBottom: 12 }} />}
                {custQ.isFetching ? <Loading /> : custPeriod.enabled && custQ.data && custQC.data ? renderComparativeCust() : custQ.data ? <CustomerStatementTable data={custQ.data} /> : !customerId ? null : <EmptyState />}
            </>;

            case "supplier-statement": return <>
                <Space style={{ marginBottom: 12 }} wrap>
                    <Select showSearch placeholder="Select supplier…" value={supplierId} onChange={setSupplierId} style={{ width: 260, borderRadius: 8 }} optionFilterProp="label"
                        options={suppliers.map((s: any) => ({ label: `${s.name}${s.phone ? ` — ${s.phone}` : ""}`, value: s._id }))} />
                    {suppPeriod.enabled && (
                        <Select showSearch placeholder="Compare supplier (optional)…" value={compareSupplierId} onChange={setCompareSupplierId} allowClear style={{ width: 260, borderRadius: 8 }} optionFilterProp="label"
                            options={suppliers.map((s: any) => ({ label: `${s.name}${s.phone ? ` — ${s.phone}` : ""}`, value: s._id }))} />
                    )}
                </Space>
                <PeriodFilter value={suppPeriod} onChange={setSuppPeriod} onRun={() => { if (supplierId) run("supplier-statement"); }} loading={isLoading(suppQ, suppQC, suppPeriod.enabled)} supportComparative
                    extra={suppQ.data && !suppPeriod.enabled && <ExportButton onExport={() => exportToCSV("supplier_statement", suppQ.data!.transactions || [])} />}
                />
                {!supplierId && <Alert type="info" showIcon message="Select a supplier to generate their statement." style={{ marginBottom: 12 }} />}
                {suppQ.isFetching ? <Loading /> : suppPeriod.enabled && suppQ.data && suppQC.data ? renderComparativeSupp() : suppQ.data ? <SupplierStatementTable data={suppQ.data} /> : !supplierId ? null : <EmptyState />}
            </>;

            case "ar-aging": return <>
                <PeriodFilter value={arPeriod} onChange={setArPeriod} onRun={() => run("ar-aging")} loading={isLoading(arQ, arQC, arPeriod.enabled)} supportComparative />
                {arQ.isFetching ? <Loading /> : arPeriod.enabled && arQ.data && arQC.data ? renderComparativeAR() : arQ.data ? <ARAgingTable data={arQ.data} /> : <EmptyState />}
            </>;

            case "ap-aging": return <>
                <PeriodFilter value={apPeriod} onChange={setApPeriod} onRun={() => run("ap-aging")} loading={isLoading(apQ, apQC, apPeriod.enabled)} supportComparative />
                {apQ.isFetching ? <Loading /> : apPeriod.enabled && apQ.data && apQC.data ? renderComparativeAP() : apQ.data ? <APAgingTable data={apQ.data} /> : <EmptyState />}
            </>;

            default: return <EmptyState />;
        }
    };

    return (
        <App>
            <Card bordered styles={{ body: { padding: 0 } }}
                title={<Space><BarChartOutlined style={{ fontSize: 18, color: primaryColor }} /><Text strong style={{ fontSize: 16 }}>Accounting Reports</Text></Space>}
            >
                <Tabs activeKey={activeTab} onChange={(k) => setActiveTab(k as ReportTab)} type="card" size="small" items={TAB_ITEMS} style={{ padding: "0 16px" }} tabBarStyle={{ marginBottom: 0 }} />
                <div style={{ padding: 16 }}>{renderContent()}</div>
            </Card>
        </App>
    );
};

export default AccountingReportsPage;