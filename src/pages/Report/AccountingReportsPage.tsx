import React, { useState, useContext, useMemo } from "react";
import {
    Space, Typography, Alert, Spin, Select, App, Empty, Card, Tabs, Tag, Table, Button,
    Modal, Input, message,
} from "antd";

const { Option } = Select;
import { BarChartOutlined, MailOutlined, DownloadOutlined } from "@ant-design/icons";
import { ArrowUpOutlined as Up, ArrowDownOutlined as Down } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
    getTrialBalance, getProfitAndLoss, getBalanceSheet, getGeneralLedger,
    getAccountBalances, getVATReport, getCashFlowSummary, getCustomerStatement,
    getSupplierStatement, getARAgingReport, getAPAgingReport,
} from "@services/accounting/reports";
import { fetchAllCustomers } from "@services/customers";
import { fetchAllSuppliers } from "@services/supplier";
import { fetchAllShops } from "@services/shops";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { sendEmail } from "@services/emailReports";
import { getAllAccounts, ChartOfAccount } from "@services/accounting/accounts";
import { getCurrentTenantId } from "@services/tenants";
import AccountLedgerDrawer from "../ChartOfAccounts/AccountLedgerDrawer";
import {
    PeriodFilter, AsOfFilter, GLPeriodFilter,
    ComparativePeriod, ComparativeAsOf, GLPeriodValue, suggestComparePeriod,
} from "./ReportFilters";
import {
    TrialBalanceTable, ProfitAndLossTable, BalanceSheetTable, GeneralLedgerTable,
    VATReportTable, CashFlowTable, AccountBalancesTable, CustomerStatementTable,
    SupplierStatementTable, ARAgingTable, APAgingTable,
    LedgerContext,
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

const fmt = (v: number) =>
    (v ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
                    {isPositive ? <Up /> : <Down />} {Math.abs(pct).toFixed(1)}%
                </Tag>
            )}
        </Space>
    );
};

const PeriodHeaders: React.FC<{ currentLabel: string; compareLabel: string }> = ({ currentLabel, compareLabel }) => (
    <Space style={{ marginBottom: 12 }} size={8}>
        <Tag color="blue" style={{ borderRadius: 20, padding: "2px 12px", fontSize: 12 }}>Current: {currentLabel}</Tag>
        <Tag color="purple" style={{ borderRadius: 20, padding: "2px 12px", fontSize: 12 }}>Compare: {compareLabel}</Tag>
    </Space>
);

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
}> = ({ rows, currentLabel, compareLabel, title, showSummary }) => {
    const ledger = useContext(LedgerContext);
    const onAccountRow = (record: any) =>
        record?.account_code ? { onClick: () => ledger?.openLedger?.(record.account_code), style: { cursor: "pointer" } } : {};
    return (
    <div style={{ marginBottom: 16 }}>
        {title && <Text strong style={{ display: "block", fontSize: 13, marginBottom: 8, color: "#374151" }}>{title}</Text>}
        <Table
            size="small" pagination={false}
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
                { title: <Text style={{ color: "#3b82f6", fontSize: 12 }}>{currentLabel}</Text>, dataIndex: "current", align: "right" as const, render: (v) => <Text style={{ fontWeight: 600, fontSize: 13 }}>{fmt(v ?? 0)}</Text> },
                { title: <Text style={{ color: "#7c3aed", fontSize: 12 }}>{compareLabel}</Text>, dataIndex: "compare", align: "right" as const, render: (v) => <Text style={{ fontSize: 13, color: "#64748b" }}>{fmt(v ?? 0)}</Text> },
                { title: "Variance", align: "right" as const, render: (_, row) => <VarianceCell current={row.current ?? 0} compare={row.compare ?? 0} invertColors={row.invertColors} /> },
            ]}
            style={{ borderRadius: 8, overflow: "hidden" }}
            onRow={onAccountRow}
            summary={showSummary ? () => {
                const totC = rows.reduce((s, r) => s + (r.current ?? 0), 0);
                const totCo = rows.reduce((s, r) => s + (r.compare ?? 0), 0);
                return (
                    <Table.Summary.Row style={{ background: "#f8fafc", fontWeight: 700 }}>
                        <Table.Summary.Cell index={0}><Text strong>Total</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right"><Text strong style={{ color: "#3b82f6" }}>{fmt(totC)}</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right"><Text strong style={{ color: "#7c3aed" }}>{fmt(totCo)}</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right"><VarianceCell current={totC} compare={totCo} /></Table.Summary.Cell>
                    </Table.Summary.Row>
                );
            } : undefined}
        />
    </div>
    );
};

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
    code && map[code] !== undefined ? map[code] : name && map[name] !== undefined ? map[name] : 0;

const makeDefaultPeriod = (): ComparativePeriod => {
    const primary: [Dayjs, Dayjs] = [dayjs().startOf("month"), dayjs().endOf("month")];
    return { primary, compare: suggestComparePeriod(primary) ?? primary, enabled: false };
};
const makeDefaultAsOf = (): ComparativeAsOf => ({
    primary: dayjs(), compare: dayjs().subtract(1, "year"), enabled: false,
});
const makeDefaultGLPeriod = (): GLPeriodValue => ({
    from: dayjs().subtract(3, "month").startOf("month").toISOString(),
    to: dayjs().endOf("month").toISOString(),
    label: "Last 3 Months",
});

// ══════════════════════════════════════════════════════════════════════════════
const AccountingReportsPage: React.FC = () => {
    const primaryColor = usePrimaryColor();
    const [activeTab, setActiveTab] = useState<ReportTab>("profit-loss");
    
    // Check if we're on the admin route (show branch filter) or branch route (hide branch filter)
    const isAdminRoute = window.location.pathname.startsWith('/admin/accounting/reports');

    // ── Filter state ──────────────────────────────────────────────────────────
    const [plPeriod, setPlPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [tbPeriod, setTbPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [vatPeriod, setVatPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [cfPeriod, setCfPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [custPeriod, setCustPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [suppPeriod, setSuppPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [arPeriod, setArPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [apPeriod, setApPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [bsAsOf, setBsAsOf] = useState<ComparativeAsOf>(makeDefaultAsOf());
    const [abAsOf, setAbAsOf] = useState<ComparativeAsOf>(makeDefaultAsOf());

    // GL uses its own simple period — NO comparison
    const [glPeriod, setGlPeriod] = useState<GLPeriodValue>(makeDefaultGLPeriod());

    const [customerId, setCustomerId] = useState<string | undefined>();
    const [supplierId, setSupplierId] = useState<string | undefined>();
    const [compareCustomerId, setCompareCustomerId] = useState<string | undefined>();
    const [compareSupplierId, setCompareSupplierId] = useState<string | undefined>();
    
    // Branch filter state
    const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>();

    // Shared accounting filters
    const yearOptions = Array.from({ length: 10 }, (_, i) => dayjs().year() - 5 + i);
    const [financialYear, setFinancialYear] = useState<number | undefined>(dayjs().year());
    const [accountingMethod, setAccountingMethod] = useState<"accrual" | "cash">("accrual");
    const [displayBy, setDisplayBy] = useState<"customer" | "quarters" | "years" | "total">("total");

    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [ledgerAccount, setLedgerAccount] = useState<ChartOfAccount | null>(null);

    const shopIdForLedger = selectedBranchId || getCurrentTenantId() || "";

    const accountsQ = useQuery({
        queryKey: ["coa-lookup", shopIdForLedger],
        queryFn: () => getAllAccounts({ shop_id: shopIdForLedger }),
        enabled: !!shopIdForLedger,
    });

    const accountMap = useMemo(() => {
        const map: Record<string, ChartOfAccount> = {};
        accountsQ.data?.accounts?.forEach((a: any) => { map[a.account_code] = a; });
        return map;
    }, [accountsQ.data]);

    const openLedger = (accountCode: string) => {
        const account = accountMap[accountCode];
        if (!account) {
            message.error(`Account ${accountCode} not found.`);
            return;
        }
        setLedgerAccount(account);
        setLedgerOpen(true);
    };

    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [emailTo, setEmailTo] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailNote, setEmailNote] = useState("");
    const [sendingEmail, setSendingEmail] = useState(false);

    const [runKey, setRunKey] = useState<Record<ReportTab, number>>({
        "profit-loss": 0, "balance-sheet": 0, "trial-balance": 0,
        "general-ledger": 0, "account-balances": 0, "vat": 0, "cash-flow": 0,
        "customer-statement": 0, "supplier-statement": 0, "ar-aging": 0, "ap-aging": 0,
    });

    const run = (tab: ReportTab) => setRunKey((p) => ({ ...p, [tab]: p[tab] + 1 }));
    const isReady = (tab: ReportTab) => runKey[tab] > 0;
    const cp = (obj: Record<string, any>) =>
        Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));

    // Helper to build query parameters with branch and shared filters
    const buildQueryParams = (params: Record<string, any>) => {
        const cleanParams = cp(params);
        if (selectedBranchId) cleanParams.shop_id = selectedBranchId;
        // financial_year should only be used for as-of / non-period reports;
        // period reports (P&L, TB, etc.) already have from/to and should not
        // pull in the whole financial year.
        if (financialYear && !cleanParams.from && !cleanParams.to) cleanParams.financial_year = financialYear;
        if (accountingMethod) cleanParams.method = accountingMethod;
        if (displayBy) cleanParams.display_by = displayBy;
        return cleanParams;
    };

    // ── Primary queries ───────────────────────────────────────────────────────
    const plQ = useQuery({ queryKey: ["rpt-pl", plPeriod.primary, selectedBranchId, runKey["profit-loss"]], queryFn: () => getProfitAndLoss(buildQueryParams({ from: plPeriod.primary[0]?.toISOString(), to: plPeriod.primary[1]?.toISOString() })), enabled: isReady("profit-loss"), retry: 1 });
    const bsQ = useQuery({ queryKey: ["rpt-bs", bsAsOf.primary, selectedBranchId, runKey["balance-sheet"]], queryFn: () => getBalanceSheet(buildQueryParams({ as_of: bsAsOf.primary?.toISOString() })), enabled: isReady("balance-sheet"), retry: 1 });
    const tbQ = useQuery({ queryKey: ["rpt-tb", tbPeriod.primary, selectedBranchId, runKey["trial-balance"]], queryFn: () => getTrialBalance(buildQueryParams({ from: tbPeriod.primary[0]?.toISOString(), to: tbPeriod.primary[1]?.toISOString() })), enabled: isReady("trial-balance"), retry: 1 });
    const abQ = useQuery({ queryKey: ["rpt-ab", abAsOf.primary, selectedBranchId, runKey["account-balances"]], queryFn: () => getAccountBalances(buildQueryParams({ as_of: abAsOf.primary?.toISOString() })), enabled: isReady("account-balances"), retry: 1 });
    const vatQ = useQuery({ queryKey: ["rpt-vat", vatPeriod.primary, selectedBranchId, runKey["vat"]], queryFn: () => getVATReport(buildQueryParams({ from: vatPeriod.primary[0]?.toISOString(), to: vatPeriod.primary[1]?.toISOString() })), enabled: isReady("vat"), retry: 1 });
    const cfQ = useQuery({ queryKey: ["rpt-cf", cfPeriod.primary, selectedBranchId, runKey["cash-flow"]], queryFn: () => getCashFlowSummary(buildQueryParams({ from: cfPeriod.primary[0]?.toISOString(), to: cfPeriod.primary[1]?.toISOString() })), enabled: isReady("cash-flow"), retry: 1 });
    const custQ = useQuery({ queryKey: ["rpt-cust", customerId, custPeriod.primary, selectedBranchId, runKey["customer-statement"]], queryFn: () => getCustomerStatement(customerId!, buildQueryParams({ from: custPeriod.primary[0]?.toISOString(), to: custPeriod.primary[1]?.toISOString() })), enabled: !!customerId && isReady("customer-statement"), retry: 1 });
    const suppQ = useQuery({ queryKey: ["rpt-supp", supplierId, suppPeriod.primary, selectedBranchId, runKey["supplier-statement"]], queryFn: () => getSupplierStatement(supplierId!, buildQueryParams({ from: suppPeriod.primary[0]?.toISOString(), to: suppPeriod.primary[1]?.toISOString() })), enabled: !!supplierId && isReady("supplier-statement"), retry: 1 });
    const arQ = useQuery({ queryKey: ["rpt-ar", arPeriod.primary, selectedBranchId, runKey["ar-aging"]], queryFn: () => getARAgingReport(buildQueryParams({ as_of_date: arPeriod.primary[1]?.toISOString() })), enabled: isReady("ar-aging"), retry: 1 });
    const apQ = useQuery({ queryKey: ["rpt-ap", apPeriod.primary, selectedBranchId, runKey["ap-aging"]], queryFn: () => getAPAgingReport(buildQueryParams({ as_of_date: apPeriod.primary[1]?.toISOString() })), enabled: isReady("ap-aging"), retry: 1 });

    // GL — simple query, no compare
    const glQ = useQuery({
        queryKey: ["rpt-gl", glPeriod.from, glPeriod.to, selectedBranchId, runKey["general-ledger"]],
        queryFn: () => getGeneralLedger(buildQueryParams({ from: glPeriod.from, to: glPeriod.to })),
        enabled: isReady("general-ledger"),
        retry: 1,
    });

    // ── Compare queries (all reports except GL) ───────────────────────────────
    const plQC = useQuery({ queryKey: ["rpt-pl-c", plPeriod.compare, selectedBranchId, runKey["profit-loss"]], queryFn: () => getProfitAndLoss(buildQueryParams({ from: plPeriod.compare[0]?.toISOString(), to: plPeriod.compare[1]?.toISOString() })), enabled: plPeriod.enabled && isReady("profit-loss") && !!plPeriod.compare[0], retry: 1 });
    const bsQC = useQuery({ queryKey: ["rpt-bs-c", bsAsOf.compare, selectedBranchId, runKey["balance-sheet"]], queryFn: () => getBalanceSheet(buildQueryParams({ as_of: bsAsOf.compare?.toISOString() })), enabled: bsAsOf.enabled && isReady("balance-sheet") && !!bsAsOf.compare, retry: 1 });
    const tbQC = useQuery({ queryKey: ["rpt-tb-c", tbPeriod.compare, selectedBranchId, runKey["trial-balance"]], queryFn: () => getTrialBalance(buildQueryParams({ from: tbPeriod.compare[0]?.toISOString(), to: tbPeriod.compare[1]?.toISOString() })), enabled: tbPeriod.enabled && isReady("trial-balance") && !!tbPeriod.compare[0], retry: 1 });
    const abQC = useQuery({ queryKey: ["rpt-ab-c", abAsOf.compare, selectedBranchId, runKey["account-balances"]], queryFn: () => getAccountBalances(buildQueryParams({ as_of: abAsOf.compare?.toISOString() })), enabled: abAsOf.enabled && isReady("account-balances") && !!abAsOf.compare, retry: 1 });
    const vatQC = useQuery({ queryKey: ["rpt-vat-c", vatPeriod.compare, selectedBranchId, runKey["vat"]], queryFn: () => getVATReport(buildQueryParams({ from: vatPeriod.compare[0]?.toISOString(), to: vatPeriod.compare[1]?.toISOString() })), enabled: vatPeriod.enabled && isReady("vat") && !!vatPeriod.compare[0], retry: 1 });
    const cfQC = useQuery({ queryKey: ["rpt-cf-c", cfPeriod.compare, selectedBranchId, runKey["cash-flow"]], queryFn: () => getCashFlowSummary(buildQueryParams({ from: cfPeriod.compare[0]?.toISOString(), to: cfPeriod.compare[1]?.toISOString() })), enabled: cfPeriod.enabled && isReady("cash-flow") && !!cfPeriod.compare[0], retry: 1 });
    const custQC = useQuery({ queryKey: ["rpt-cust-c", compareCustomerId ?? customerId, custPeriod.compare, selectedBranchId, runKey["customer-statement"]], queryFn: () => getCustomerStatement((compareCustomerId ?? customerId)!, buildQueryParams({ from: custPeriod.compare[0]?.toISOString(), to: custPeriod.compare[1]?.toISOString() })), enabled: custPeriod.enabled && !!(compareCustomerId ?? customerId) && isReady("customer-statement") && !!custPeriod.compare[0], retry: 1 });
    const suppQC = useQuery({ queryKey: ["rpt-supp-c", compareSupplierId ?? supplierId, suppPeriod.compare, selectedBranchId, runKey["supplier-statement"]], queryFn: () => getSupplierStatement((compareSupplierId ?? supplierId)!, buildQueryParams({ from: suppPeriod.compare[0]?.toISOString(), to: suppPeriod.compare[1]?.toISOString() })), enabled: suppPeriod.enabled && !!(compareSupplierId ?? supplierId) && isReady("supplier-statement") && !!suppPeriod.compare[0], retry: 1 });
    const arQC = useQuery({ queryKey: ["rpt-ar-c", arPeriod.compare, selectedBranchId, runKey["ar-aging"]], queryFn: () => getARAgingReport(buildQueryParams({ as_of_date: arPeriod.compare[1]?.toISOString() })), enabled: arPeriod.enabled && isReady("ar-aging") && !!arPeriod.compare[0], retry: 1 });
    const apQC = useQuery({ queryKey: ["rpt-ap-c", apPeriod.compare, selectedBranchId, runKey["ap-aging"]], queryFn: () => getAPAgingReport(buildQueryParams({ as_of_date: apPeriod.compare[1]?.toISOString() })), enabled: apPeriod.enabled && isReady("ap-aging") && !!apPeriod.compare[0], retry: 1 });

    const { data: customersRaw } = useQuery({ queryKey: ["customers-select-rpt"], queryFn: () => fetchAllCustomers({}), enabled: activeTab === "customer-statement" || activeTab === "ar-aging" });
    const { data: suppliersRaw } = useQuery({ queryKey: ["suppliers-select-rpt"], queryFn: () => fetchAllSuppliers({}), enabled: activeTab === "supplier-statement" || activeTab === "ap-aging" });
    const { data: shopsRaw } = useQuery({ queryKey: ["shops-select-rpt"], queryFn: () => fetchAllShops({}) });
    const customers = Array.isArray(customersRaw) ? customersRaw : [];
    const suppliers = Array.isArray(suppliersRaw) ? suppliersRaw : [];
    const shops = Array.isArray(shopsRaw) ? shopsRaw : [];

    const Loading = () => <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>;
    const EmptyState = () => <Empty description="Run the report to see results" style={{ padding: 40 }} />;
    const isLoading = (pQ: any, cQ: any, enabled: boolean) => pQ.isFetching || (enabled && cQ.isFetching);

    const mergeRows = (primary: any[], compare: any[], valueKey: string | ((r: any) => number), invertColors = false): ComparativeRow[] => {
        const cMap = buildCompareMap(compare, valueKey);
        return (primary || []).map((r: any) => ({
            account_code: r.account_code,
            account_name: r.account_name,
            current: typeof valueKey === "function" ? valueKey(r) : (r[valueKey] ?? 0),
            compare: lookupCompare(cMap, r.account_code, r.account_name),
            invertColors,
            tag: r.account_type,
            tagColor: ({ ASSET: "blue", LIABILITY: "red", EQUITY: "purple", REVENUE: "green", EXPENSE: "orange" } as any)[r.account_type],
        }));
    };

    // ── Comparative renderers (unchanged from original) ───────────────────────
    const renderComparativePL = () => {
        if (!plQ.data || !plQC.data) return null;
        const cl = buildPeriodLabel(plPeriod.primary), cm = buildPeriodLabel(plPeriod.compare);
        const netC = plQ.data.net_profit ?? 0, netCo = plQC.data.net_profit ?? 0;
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable title="Revenue" rows={mergeRows(plQ.data.revenue?.accounts, plQC.data.revenue?.accounts, "amount", false)} currentLabel={cl} compareLabel={cm} showSummary />
                <ComparativeTable title="Expenses" rows={mergeRows(plQ.data.expenses?.accounts, plQC.data.expenses?.accounts, "amount", true)} currentLabel={cl} compareLabel={cm} showSummary />
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px" }}>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <Text strong style={{ fontSize: 14 }}>Net Profit / Loss</Text>
                        <Space size={16}>
                            <Text strong style={{ fontSize: 14, color: "#3b82f6" }}>{fmt(netC)}</Text>
                            <Text style={{ fontSize: 14, color: "#7c3aed" }}>{fmt(netCo)}</Text>
                            <VarianceCell current={netC} compare={netCo} />
                        </Space>
                    </Space>
                </div>
            </Space>
        );
    };

    const renderComparativeBS = () => {
        if (!bsQ.data || !bsQC.data) return null;
        const cl = buildPeriodLabel(bsAsOf.primary), cm = buildPeriodLabel(bsAsOf.compare);
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

    const renderComparativeTB = () => {
        if (!tbQ.data || !tbQC.data) return null;
        const cl = buildPeriodLabel(tbPeriod.primary), cm = buildPeriodLabel(tbPeriod.compare);
        const cMap: Record<string, any> = {};
        (tbQC.data.rows || []).forEach((r: any) => { if (r.account_code) cMap[r.account_code] = r; if (r.account_name) cMap[r.account_name] = r; });
        const TYPE_COLORS: Record<string, string> = { ASSET: "blue", LIABILITY: "red", EQUITY: "purple", REVENUE: "green", EXPENSE: "orange" };
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <Table size="small" pagination={{ pageSize: 30, showSizeChanger: true }}
                    dataSource={(tbQ.data.rows || []).map((r: any, i: number) => ({ ...r, key: i }))}
                    scroll={{ x: 900 }}
                    columns={[
                        { title: "Code", dataIndex: "account_code", width: 80, render: (v: string) => <Text style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{v}</Text> },
                        { title: "Account", dataIndex: "account_name", render: (v: string, r: any) => <Space size={4}><Text style={{ fontSize: 13 }}>{v}</Text>{r.account_type && <Tag color={TYPE_COLORS[r.account_type]} style={{ fontSize: 10, padding: "0 4px" }}>{r.account_type}</Tag>}</Space> },
                        { title: <Text style={{ color: "#3b82f6", fontSize: 11 }}>DR ({cl})</Text>, align: "right" as const, render: (_: any, r: any) => <Text style={{ fontWeight: 600, fontSize: 12, color: "#cf1322" }}>{r.period_debit > 0 ? fmt(r.period_debit) : "—"}</Text> },
                        { title: <Text style={{ color: "#3b82f6", fontSize: 11 }}>CR ({cl})</Text>, align: "right" as const, render: (_: any, r: any) => <Text style={{ fontWeight: 600, fontSize: 12, color: "#389e0d" }}>{r.period_credit > 0 ? fmt(r.period_credit) : "—"}</Text> },
                        { title: <Text style={{ color: "#7c3aed", fontSize: 11 }}>DR ({cm})</Text>, align: "right" as const, render: (_: any, r: any) => { const c = cMap[r.account_code] || cMap[r.account_name]; return <Text style={{ fontSize: 12, color: "#64748b" }}>{(c?.period_debit ?? 0) > 0 ? fmt(c.period_debit) : "—"}</Text>; } },
                        { title: <Text style={{ color: "#7c3aed", fontSize: 11 }}>CR ({cm})</Text>, align: "right" as const, render: (_: any, r: any) => { const c = cMap[r.account_code] || cMap[r.account_name]; return <Text style={{ fontSize: 12, color: "#64748b" }}>{(c?.period_credit ?? 0) > 0 ? fmt(c.period_credit) : "—"}</Text>; } },
                        { title: "Δ Net", align: "right" as const, render: (_: any, r: any) => { const c = cMap[r.account_code] || cMap[r.account_name]; return <VarianceCell current={(r.period_debit ?? 0) - (r.period_credit ?? 0)} compare={(c?.period_debit ?? 0) - (c?.period_credit ?? 0)} />; } },
                    ]}
                />
            </Space>
        );
    };

    const renderComparativeVAT = () => {
        if (!vatQ.data || !vatQC.data) return null;
        const cl = buildPeriodLabel(vatPeriod.primary), cm = buildPeriodLabel(vatPeriod.compare);
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable title="VAT Summary" rows={[
                    { account_name: "Output VAT (Collected)", current: vatQ.data.summary?.vat_collected ?? 0, compare: vatQC.data.summary?.vat_collected ?? 0 },
                    { account_name: "Input VAT (Paid)", current: vatQ.data.summary?.vat_paid ?? 0, compare: vatQC.data.summary?.vat_paid ?? 0, invertColors: true },
                    { account_name: "Net VAT Payable", current: vatQ.data.summary?.net_vat_payable ?? 0, compare: vatQC.data.summary?.net_vat_payable ?? 0 },
                ]} currentLabel={cl} compareLabel={cm} />
            </Space>
        );
    };

    const renderComparativeCF = () => {
        if (!cfQ.data || !cfQC.data) return null;
        const cl = buildPeriodLabel(cfPeriod.primary), cm = buildPeriodLabel(cfPeriod.compare);
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable title="Cash Flow by Account" rows={mergeRows(cfQ.data.accounts, cfQC.data.accounts, "net_cash_flow", false)} currentLabel={cl} compareLabel={cm} showSummary />
                <ComparativeTable title="Summary" rows={[
                    { account_name: "Total Inflows", current: cfQ.data.totals?.total_inflows ?? 0, compare: cfQC.data.totals?.total_inflows ?? 0 },
                    { account_name: "Total Outflows", current: cfQ.data.totals?.total_outflows ?? 0, compare: cfQC.data.totals?.total_outflows ?? 0, invertColors: true },
                    { account_name: "Net Cash Flow", current: cfQ.data.totals?.net_cash_flow ?? 0, compare: cfQC.data.totals?.net_cash_flow ?? 0 },
                ]} currentLabel={cl} compareLabel={cm} />
            </Space>
        );
    };

    const renderComparativeAB = () => {
        if (!abQ.data || !abQC.data) return null;
        const cl = buildPeriodLabel(abAsOf.primary), cm = buildPeriodLabel(abAsOf.compare);
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable title="Account Balances" rows={mergeRows(abQ.data.accounts, abQC.data.accounts, "balance", false)} currentLabel={cl} compareLabel={cm} showSummary />
            </Space>
        );
    };

    const renderComparativeCust = () => {
        if (!custQ.data || !custQC.data) return null;
        const cl = buildPeriodLabel(custPeriod.primary), cm = buildPeriodLabel(custPeriod.compare);
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable title="Customer Summary" rows={[
                    { account_name: "Total Invoiced", current: custQ.data.summary?.total_invoiced ?? 0, compare: custQC.data.summary?.total_invoiced ?? 0 },
                    { account_name: "Total Paid", current: custQ.data.summary?.total_paid ?? 0, compare: custQC.data.summary?.total_paid ?? 0 },
                    { account_name: "Balance", current: custQ.data.summary?.closing_balance ?? 0, compare: custQC.data.summary?.closing_balance ?? 0 },
                ]} currentLabel={cl} compareLabel={cm} />
            </Space>
        );
    };

    const renderComparativeSupp = () => {
        if (!suppQ.data || !suppQC.data) return null;
        const cl = buildPeriodLabel(suppPeriod.primary), cm = buildPeriodLabel(suppPeriod.compare);
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable title="Supplier Summary" rows={[
                    { account_name: "Total Billed", current: suppQ.data.summary?.total_billed ?? 0, compare: suppQC.data.summary?.total_billed ?? 0 },
                    { account_name: "Total Paid", current: suppQ.data.summary?.total_paid ?? 0, compare: suppQC.data.summary?.total_paid ?? 0 },
                    { account_name: "Balance", current: suppQ.data.summary?.closing_balance ?? 0, compare: suppQC.data.summary?.closing_balance ?? 0 },
                ]} currentLabel={cl} compareLabel={cm} />
            </Space>
        );
    };

    const renderComparativeAR = () => {
        if (!arQ.data || !arQC.data) return null;
        const cl = buildPeriodLabel(arPeriod.primary), cm = buildPeriodLabel(arPeriod.compare);
        const cMap: Record<string, any> = {};
        (arQC.data.customers || []).forEach((c: any) => { cMap[c.customer_id] = c; });
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable title="AR Outstanding by Customer"
                    rows={(arQ.data.customers || []).map((c: any) => ({ account_name: c.customer_name, current: c.total ?? 0, compare: cMap[c.customer_id]?.total ?? 0 }))}
                    currentLabel={cl} compareLabel={cm} showSummary />
            </Space>
        );
    };

    const renderComparativeAP = () => {
        if (!apQ.data || !apQC.data) return null;
        const cl = buildPeriodLabel(apPeriod.primary), cm = buildPeriodLabel(apPeriod.compare);
        const cMap: Record<string, any> = {};
        (apQC.data.suppliers || []).forEach((s: any) => { cMap[s.supplier_id] = s; });
        return (
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <PeriodHeaders currentLabel={cl} compareLabel={cm} />
                <ComparativeTable title="AP Outstanding by Supplier"
                    rows={(apQ.data.suppliers || []).map((s: any) => ({ account_name: s.supplier_name, current: s.total ?? 0, compare: cMap[s.supplier_id]?.total ?? 0, invertColors: true }))}
                    currentLabel={cl} compareLabel={cm} showSummary />
            </Space>
        );
    };

    // ── Tab content ───────────────────────────────────────────────────────────
    const renderContent = () => {
        switch (activeTab) {

            case "profit-loss": return <>
                <PeriodFilter value={plPeriod} onChange={setPlPeriod} onRun={() => run("profit-loss")} loading={isLoading(plQ, plQC, plPeriod.enabled)} supportComparative extra={<FilterControls />} />
                {plQ.isFetching ? <Loading /> : plPeriod.enabled && plQ.data && plQC.data ? renderComparativePL() : plQ.data ? <ProfitAndLossTable data={plQ.data} period={{ from: plPeriod.primary[0]?.toISOString(), to: plPeriod.primary[1]?.toISOString() }} /> : <EmptyState />}
            </>;

            case "balance-sheet": return <>
                <AsOfFilter value={bsAsOf} onChange={setBsAsOf} onRun={() => run("balance-sheet")} loading={isLoading(bsQ, bsQC, bsAsOf.enabled)} supportComparative extra={<FilterControls />} />
                {bsQ.isFetching ? <Loading /> : bsAsOf.enabled && bsQ.data && bsQC.data ? renderComparativeBS() : bsQ.data ? <BalanceSheetTable data={bsQ.data} /> : <EmptyState />}
            </>;

            case "trial-balance": return <>
                <PeriodFilter value={tbPeriod} onChange={setTbPeriod} onRun={() => run("trial-balance")} loading={isLoading(tbQ, tbQC, tbPeriod.enabled)} supportComparative extra={<FilterControls />} />
                {tbQ.isFetching ? <Loading /> : tbPeriod.enabled && tbQ.data && tbQC.data ? renderComparativeTB() : tbQ.data ? <TrialBalanceTable data={tbQ.data} /> : <EmptyState />}
            </>;

            // ── GENERAL LEDGER: GLPeriodFilter only, NO comparison ────────────
            case "general-ledger": return <>
                <GLPeriodFilter value={glPeriod} onChange={setGlPeriod} onRun={() => run("general-ledger")} loading={glQ.isFetching} extra={<FilterControls />} />
                {glQ.isFetching ? <Loading /> : glQ.data ? <GeneralLedgerTable data={glQ.data} period={{ from: glPeriod.from, to: glPeriod.to }} /> : <EmptyState />}
            </>;

            case "account-balances": return <>
                <AsOfFilter value={abAsOf} onChange={setAbAsOf} onRun={() => run("account-balances")} loading={isLoading(abQ, abQC, abAsOf.enabled)} supportComparative extra={<FilterControls />} />
                {abQ.isFetching ? <Loading /> : abAsOf.enabled && abQ.data && abQC.data ? renderComparativeAB() : abQ.data ? <AccountBalancesTable data={abQ.data} /> : <EmptyState />}
            </>;

            case "vat": return <>
                <PeriodFilter value={vatPeriod} onChange={setVatPeriod} onRun={() => run("vat")} loading={isLoading(vatQ, vatQC, vatPeriod.enabled)} supportComparative extra={<FilterControls />} />
                {vatQ.isFetching ? <Loading /> : vatPeriod.enabled && vatQ.data && vatQC.data ? renderComparativeVAT() : vatQ.data ? <VATReportTable data={vatQ.data} /> : <EmptyState />}
            </>;

            case "cash-flow": return <>
                <PeriodFilter value={cfPeriod} onChange={setCfPeriod} onRun={() => run("cash-flow")} loading={isLoading(cfQ, cfQC, cfPeriod.enabled)} supportComparative extra={<FilterControls />} />
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
                <PeriodFilter value={custPeriod} onChange={setCustPeriod} onRun={() => { if (customerId) run("customer-statement"); }} loading={isLoading(custQ, custQC, custPeriod.enabled)} supportComparative extra={<FilterControls />} />

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
                <PeriodFilter value={suppPeriod} onChange={setSuppPeriod} onRun={() => { if (supplierId) run("supplier-statement"); }} loading={isLoading(suppQ, suppQC, suppPeriod.enabled)} supportComparative extra={<FilterControls />} />

                {!supplierId && <Alert type="info" showIcon message="Select a supplier to generate their statement." style={{ marginBottom: 12 }} />}
                {suppQ.isFetching ? <Loading /> : suppPeriod.enabled && suppQ.data && suppQC.data ? renderComparativeSupp() : suppQ.data ? <SupplierStatementTable data={suppQ.data} /> : !supplierId ? null : <EmptyState />}
            </>;

            case "ar-aging": return <>
                <PeriodFilter value={arPeriod} onChange={setArPeriod} onRun={() => run("ar-aging")} loading={isLoading(arQ, arQC, arPeriod.enabled)} supportComparative extra={<FilterControls />} />
                {arQ.isFetching ? <Loading /> : arPeriod.enabled && arQ.data && arQC.data ? renderComparativeAR() : arQ.data ? <ARAgingTable data={arQ.data} /> : <EmptyState />}
            </>;

            case "ap-aging": return <>
                <PeriodFilter value={apPeriod} onChange={setApPeriod} onRun={() => run("ap-aging")} loading={isLoading(apQ, apQC, apPeriod.enabled)} supportComparative extra={<FilterControls />} />
                {apQ.isFetching ? <Loading /> : apPeriod.enabled && apQ.data && apQC.data ? renderComparativeAP() : apQ.data ? <APAgingTable data={apQ.data} /> : <EmptyState />}
            </>;

            default: return <EmptyState />;
        }
    };

    // ── CSV / email helpers ─────────────────────────────────────────────────────
    const getReportRows = (tab: ReportTab): Record<string, any>[] => {
        const empty: Record<string, any>[] = [];
        switch (tab) {
            case "profit-loss":
                if (!plQ.data) return empty;
                return [
                    ...plQ.data.revenue.accounts.map((a: any) => ({ Section: "Revenue", Code: a.account_code, Account: a.account_name, Amount: a.amount })),
                    ...plQ.data.expenses.accounts.map((a: any) => ({ Section: "Expenses", Code: a.account_code, Account: a.account_name, Amount: a.amount })),
                ];
            case "balance-sheet":
                if (!bsQ.data) return empty;
                return [
                    ...bsQ.data.assets.accounts.map((a: any) => ({ Section: "Assets", Code: a.account_code, Account: a.account_name, Balance: a.balance })),
                    ...bsQ.data.liabilities.accounts.map((a: any) => ({ Section: "Liabilities", Code: a.account_code, Account: a.account_name, Balance: a.balance })),
                    ...bsQ.data.equity.accounts.map((a: any) => ({ Section: "Equity", Code: a.account_code, Account: a.account_name, Balance: a.balance })),
                ];
            case "trial-balance":
                if (!tbQ.data) return empty;
                return tbQ.data.rows.map((r: any) => ({ Code: r.account_code, Account: r.account_name, Type: r.account_type, "Closing Debit": r.closing_debit, "Closing Credit": r.closing_credit }));
            case "general-ledger":
                if (!glQ.data) return empty;
                return glQ.data.accounts.flatMap((acc: any) => acc.lines.map((l: any) => ({ Account: `${acc.account_code} - ${acc.account_name}`, Date: dayjs(l.entry_date).format("DD MMM YYYY"), "Entry No.": l.entry_no, Description: l.description, Debit: l.debit, Credit: l.credit, Balance: l.balance })));
            case "account-balances":
                if (!abQ.data) return empty;
                return abQ.data.accounts.map((a: any) => ({ Code: a.account_code, Account: a.account_name, Type: a.account_type, Normal: a.normal_balance, "Opening (KES)": a.opening_balance, "Total DR (KES)": a.total_debit, "Total CR (KES)": a.total_credit, "Balance (KES)": a.balance }));
            case "vat":
                if (!vatQ.data) return empty;
                return vatQ.data.transactions.map((t: any) => ({ Date: dayjs(t.entry_date).format("DD MMM YYYY"), "Entry No.": t.entry_no, Description: t.description, Source: t.source, "VAT Collected (KES)": t.vat_collected, "VAT Paid (KES)": t.vat_paid }));
            case "cash-flow":
                if (!cfQ.data) return empty;
                return cfQ.data.accounts.map((a: any) => ({ Code: a.account_code, Account: a.account_name, "Opening (KES)": a.opening_balance, "Inflows (KES)": a.inflows, "Outflows (KES)": a.outflows, "Net (KES)": a.net_cash_flow, "Closing (KES)": a.closing_balance }));
            case "customer-statement":
                if (!custQ.data) return empty;
                return custQ.data.transactions.map((t: any) => ({ Date: dayjs(t.date).format("DD MMM YYYY"), Type: t.type, Reference: t.reference, Description: t.description, "Debit (KES)": t.debit, "Credit (KES)": t.credit, "Balance (KES)": t.balance }));
            case "supplier-statement":
                if (!suppQ.data) return empty;
                return suppQ.data.transactions.map((t: any) => ({ Date: dayjs(t.date).format("DD MMM YYYY"), Type: t.type, Reference: t.reference, Description: t.description, "Debit (KES)": t.debit, "Credit (KES)": t.credit, "Balance (KES)": t.balance }));
            case "ar-aging":
                if (!arQ.data) return empty;
                return arQ.data.customers.map((c: any) => ({ Customer: c.customer_name, ...c.buckets, "Total (KES)": c.total }));
            case "ap-aging":
                if (!apQ.data) return empty;
                return apQ.data.suppliers.map((s: any) => ({ Supplier: s.supplier_name, ...s.buckets, "Total (KES)": s.total }));
            default:
                return empty;
        }
    };

    const getCurrentPeriod = (): any => {
        switch (activeTab) {
            case "balance-sheet":
            case "account-balances":
                return bsAsOf.primary;
            case "general-ledger":
                return [dayjs(glPeriod.from), dayjs(glPeriod.to)];
            case "trial-balance":
                return tbPeriod.primary;
            case "vat":
                return vatPeriod.primary;
            case "cash-flow":
                return cfPeriod.primary;
            case "customer-statement":
                return custPeriod.primary;
            case "supplier-statement":
                return suppPeriod.primary;
            case "ar-aging":
                return arPeriod.primary;
            case "ap-aging":
                return apPeriod.primary;
            case "profit-loss":
            default:
                return plPeriod.primary;
        }
    };

    const buildCsvString = (rows: Record<string, any>[], periodLabel?: string) => {
        if (!rows.length) return "";
        const headers = Object.keys(rows[0]);
        const escape = (val: any) => {
            const str = String(val ?? "").replace(/"/g, '""');
            return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
        };
        const lines = [
            ...(periodLabel ? [`Report Period: ${periodLabel}`] : []),
            headers.join(","),
            ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
        ];
        return lines.join("\n");
    };

    const handleExportCSV = () => {
        const rows = getReportRows(activeTab);
        if (!rows.length) {
            message.info("Run the report first to export data.");
            return;
        }
        const period = buildPeriodLabel(getCurrentPeriod());
        const csv = buildCsvString(rows, period);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${activeTab}_${dayjs().format("YYYY-MM-DD")}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const buildEmailHtml = (rows: Record<string, any>[], periodLabel?: string) => {
        if (!rows.length) return "<p>No data</p>";
        const headers = Object.keys(rows[0]);
        const head = `<tr style="background:#f0f0f0">${headers.map((h) => `<th style="padding:8px 12px;border:1px solid #ddd">${h}</th>`).join("")}</tr>`;
        const body = rows.map((r) => `<tr>${headers.map((h) => `<td style="padding:6px 12px;border:1px solid #ddd">${r[h] ?? ""}</td>`).join("")}</tr>`).join("");
        return `
            <p>${periodLabel ? `<strong>Period:</strong> ${periodLabel}<br>` : ""}${emailNote ? `<br>${emailNote}<br>` : ""}</p>
            <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px">${head}${body}</table>
        `;
    };

    const handleSendEmail = async () => {
        if (!emailTo || !emailSubject) {
            message.error("Recipient and subject are required.");
            return;
        }
        const rows = getReportRows(activeTab);
        if (!rows.length) {
            message.info("Run the report first before emailing.");
            return;
        }
        const period = buildPeriodLabel(getCurrentPeriod());
        const csv = buildCsvString(rows, period);
        const base64 = window.btoa(unescape(encodeURIComponent(csv)));
        const htmlTable = buildEmailHtml(rows, period);
        setSendingEmail(true);
        try {
            await sendEmail({
                to: emailTo,
                subject: emailSubject,
                intro: `Please find the attached ${activeTab.replace(/-/g, " ")} report.`,
                htmlTable,
                bannerLabel: "Accounting Report",
                bannerType: "Financial",
                attachments: [{
                    filename: `${activeTab}_${dayjs().format("YYYY-MM-DD")}.csv`,
                    content: base64,
                    contentType: "text/csv",
                }],
            });
            setEmailModalOpen(false);
            setEmailTo("");
            setEmailSubject("");
            setEmailNote("");
        } finally {
            setSendingEmail(false);
        }
    };

    const FilterControls: React.FC = () => (
        <Space wrap align="center" size={8}>
            <Select
                placeholder="Financial Year"
                value={financialYear}
                onChange={(v) => { setFinancialYear(v); run(activeTab); }}
                style={{ width: 130 }}
                allowClear
            >
                {yearOptions.map((y) => (
                    <Option key={y} value={y}>{y}</Option>
                ))}
            </Select>
            <Select
                value={accountingMethod}
                onChange={(v) => { setAccountingMethod(v); run(activeTab); }}
                style={{ width: 140 }}
            >
                <Option value="accrual">Accrual</Option>
                <Option value="cash">Cash</Option>
            </Select>
            <Select
                value={displayBy}
                onChange={(v) => { setDisplayBy(v); run(activeTab); }}
                style={{ width: 150 }}
            >
                <Option value="customer">Customer</Option>
                <Option value="quarters">Quarters</Option>
                <Option value="years">Years</Option>
                <Option value="total">Total</Option>
            </Select>
        </Space>
    );

    const activePeriod = getCurrentPeriod();
    const ledgerPeriod: [Dayjs | null, Dayjs | null] = Array.isArray(activePeriod)
        ? activePeriod
        : [dayjs(activePeriod).startOf("month"), dayjs(activePeriod).endOf("month")];

    return (
        <App>
            <LedgerContext.Provider value={{ openLedger }}>
            <Card bordered styles={{ body: { padding: 0 } }}
                title={<Space><BarChartOutlined style={{ fontSize: 18, color: primaryColor }} /><Text strong style={{ fontSize: 16 }}>Reports</Text></Space>}
                extra={
                    <Space wrap align="center" size={8}>
                        <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>
                            Export CSV
                        </Button>
                        <Button icon={<MailOutlined />} onClick={() => setEmailModalOpen(true)}>
                            Email Report
                        </Button>
                    </Space>
                }
            >
                {isAdminRoute && (
                <div style={{ padding: "16px 16px 0 16px" }}>
                    <Space size={12} align="center">
                        <Text strong style={{ fontSize: 14 }}>Filter by Branch:</Text>
                        <Select
                            placeholder="All Branches"
                            value={selectedBranchId}
                            onChange={(value) => {
                                setSelectedBranchId(value);
                                // Reset all reports to force re-run with new branch filter
                                setRunKey({
                                    "profit-loss": 0, "balance-sheet": 0, "trial-balance": 0,
                                    "general-ledger": 0, "account-balances": 0, "vat": 0, "cash-flow": 0,
                                    "customer-statement": 0, "supplier-statement": 0, "ar-aging": 0, "ap-aging": 0,
                                });
                            }}
                            allowClear
                            style={{ width: 200 }}
                            showSearch
                            filterOption={(input, option) =>
                                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {shops.map((shop: any) => (
                                <Option key={shop._id} value={shop._id}>
                                    {shop.name}
                                </Option>
                            ))}
                        </Select>
                        {selectedBranchId && (
                            <Button
                                size="small"
                                onClick={() => {
                                    setSelectedBranchId(undefined);
                                    // Reset all reports to force re-run
                                    setRunKey({
                                        "profit-loss": 0, "balance-sheet": 0, "trial-balance": 0,
                                        "general-ledger": 0, "account-balances": 0, "vat": 0, "cash-flow": 0,
                                        "customer-statement": 0, "supplier-statement": 0, "ar-aging": 0, "ap-aging": 0,
                                    });
                                }}
                            >
                                Clear Branch
                            </Button>
                        )}
                    </Space>
                </div>
            )}

                <Tabs activeKey={activeTab} onChange={(k) => setActiveTab(k as ReportTab)} type="card" size="small" items={TAB_ITEMS} style={{ padding: "0 16px" }} tabBarStyle={{ marginBottom: 0 }} />
                <div style={{ padding: 16 }}>{renderContent()}</div>

                <Modal
                    title="Email Accounting Report"
                    open={emailModalOpen}
                    onCancel={() => setEmailModalOpen(false)}
                    onOk={handleSendEmail}
                    okButtonProps={{ loading: sendingEmail }}
                    okText="Send"
                >
                    <Space direction="vertical" style={{ width: "100%" }} size={12}>
                        <Input
                            placeholder="Recipient email"
                            value={emailTo}
                            onChange={(e) => setEmailTo(e.target.value)}
                        />
                        <Input
                            placeholder="Subject"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                        />
                        <Input.TextArea
                            rows={3}
                            placeholder="Optional note"
                            value={emailNote}
                            onChange={(e) => setEmailNote(e.target.value)}
                        />
                    </Space>
                </Modal>
                <AccountLedgerDrawer open={ledgerOpen} onClose={() => setLedgerOpen(false)} account={ledgerAccount} shopId={shopIdForLedger} initialFrom={ledgerPeriod[0]} initialTo={ledgerPeriod[1]} />
            </Card>
            </LedgerContext.Provider>
        </App>
    );
};

export default AccountingReportsPage;