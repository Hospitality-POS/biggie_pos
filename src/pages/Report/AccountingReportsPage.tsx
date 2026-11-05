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
    getSupplierStatement, getARAgingReport, getAPAgingReport, getCateringLevyReport,
} from "@services/accounting/reports";
import { fetchCateringLevy } from "@services/systemsetup";
import CateringLevyReport from "./CateringLevyReport";
import { fetchAllCustomers } from "@services/customers";
import { fetchAllSuppliers } from "@services/supplier";
import { fetchAllShops } from "@services/shops";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { sendEmail } from "@services/emailReports";
import { getAllAccounts, ChartOfAccount } from "@services/accounting/accounts";
import AccountLedgerDrawer from "../ChartOfAccounts/AccountLedgerDrawer";
import ProjectSelect from "@components/accounting/ProjectSelect";
import ProjectsReport from "./ProjectsReport";
import { getProjectsReport } from "@services/accounting/projects";
import {
    PeriodFilter, AsOfFilter, GLPeriodFilter,
    ComparativePeriod, ComparativeAsOf, GLPeriodValue, suggestComparePeriod,
} from "./ReportFilters";
import {
    TrialBalanceTable, ProfitAndLossTable, BalanceSheetTable, GeneralLedgerTable,
    VATReportTable, CashFlowTable, AccountBalancesTable, CustomerStatementTable,
    SupplierStatementTable, ARAgingTable, APAgingTable,
    LedgerContext, splitProfitAndLoss,
} from "./ReportTables";
import dayjs, { Dayjs } from "dayjs";

const { Text } = Typography;

type ReportTab =
    | "profit-loss" | "balance-sheet" | "trial-balance" | "general-ledger"
    | "account-balances" | "vat" | "cash-flow" | "customer-statement"
    | "supplier-statement" | "ar-aging" | "ap-aging" | "catering-levy" | "projects";

const TAB_ITEMS = [
    { key: "profit-loss", label: "P&L" },
    { key: "projects", label: "Projects" },
    { key: "balance-sheet", label: "Balance Sheet" },
    { key: "trial-balance", label: "Trial Balance" },
    { key: "general-ledger", label: "General Ledger" },
    { key: "account-balances", label: "Account Balances" },
    { key: "vat", label: "VAT Report" },
    { key: "catering-levy", label: "Tourism Levy" },
    { key: "cash-flow", label: "Cash Flow" },
    { key: "customer-statement", label: "Customer Statement" },
    { key: "supplier-statement", label: "Supplier Statement" },
    { key: "ar-aging", label: "AR Aging" },
    { key: "ap-aging", label: "AP Aging" },
];

// Customer picker label — business customers keep their name in company_name
// (customer_name is optional), and the phone field is `phone`
const customerOptionLabel = (c: any) => {
    const name =
        c.customer_name?.trim() || c.company_name?.trim() || c.contact_person?.name?.trim() ||
        c.email || c.code || "Unnamed customer";
    return c.phone ? `${name} — ${c.phone}` : name;
};

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

// ── Comparative layout ────────────────────────────────────────────────────────
// Every comparative table on this page shares these column widths with a fixed
// table layout, so the Current / Compare / Variance columns line up across
// sections (Revenue vs Expenses, Assets vs Liabilities …) and with the
// grand-total bar underneath them.
const CMP_COL = { current: 170, compare: 170, variance: 210 } as const;
const CMP_MIN_WIDTH = 760; // below this the table scrolls horizontally instead of squashing
const CURRENT_COLOR = "#2563eb";
const COMPARE_COLOR = "#7c3aed";
const NUM_STYLE: React.CSSProperties = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

const VarianceCell: React.FC<{ current: number; compare: number; invertColors?: boolean; strong?: boolean }> = ({
    current, compare, invertColors = false, strong = false,
}) => {
    const diff = current - compare;
    const pct = compare !== 0 ? (diff / Math.abs(compare)) * 100 : null;
    const isNeutral = Math.abs(diff) < 0.005;
    const isPositive = diff > 0;
    const goodColor = invertColors ? "#dc2626" : "#059669";
    const badColor = invertColors ? "#059669" : "#dc2626";
    const color = isNeutral ? "#94a3b8" : isPositive ? goodColor : badColor;
    const showPct = pct !== null && !isNeutral;
    return (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
            <Text style={{ ...NUM_STYLE, fontSize: 13, color, fontWeight: strong ? 700 : 600 }}>
                {isNeutral ? "—" : `${isPositive ? "+" : "−"}${fmt(Math.abs(diff))}`}
            </Text>
            {/* Fixed-width pill (kept as a placeholder when empty) so the amounts stay right-aligned in one column */}
            <span style={{
                ...NUM_STYLE, display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 2,
                width: 68, fontSize: 10, lineHeight: "18px", borderRadius: 20,
                visibility: showPct ? "visible" : "hidden",
                background: `${color}14`, border: `1px solid ${color}40`, color,
            }}>
                {showPct && <>{isPositive ? <Up /> : <Down />}{Math.abs(pct!) >= 1000 ? `${Math.round(Math.abs(pct!)).toLocaleString()}%` : `${Math.abs(pct!).toFixed(1)}%`}</>}
            </span>
        </div>
    );
};

const PeriodDot: React.FC<{ color: string }> = ({ color }) => (
    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 6, verticalAlign: "middle", boxShadow: "0 0 0 2px rgba(255,255,255,0.6)" }} />
);

const PeriodHeaders: React.FC<{ currentLabel: string; compareLabel: string }> = ({ currentLabel, compareLabel }) => (
    <Space style={{ marginBottom: 4 }} size={8} wrap>
        <Tag color="blue" style={{ borderRadius: 20, padding: "2px 12px", fontSize: 12, margin: 0 }}><PeriodDot color={CURRENT_COLOR} />Current: {currentLabel}</Tag>
        <Tag color="purple" style={{ borderRadius: 20, padding: "2px 12px", fontSize: 12, margin: 0 }}><PeriodDot color={COMPARE_COLOR} />Compare: {compareLabel}</Tag>
    </Space>
);

// Header label for a period column — inherits the table header's text colour
// (white on the themed header) and uses a dot to tie it to the period tag.
const PeriodColTitle: React.FC<{ label: string; color: string }> = ({ label, color }) => (
    <span style={{ whiteSpace: "nowrap" }}><PeriodDot color={color} />{label}</span>
);

interface ComparativeRow {
    _id?: string;
    account_name: string;
    account_code?: string;
    current: number;
    compare: number;
    invertColors?: boolean;
    tag?: string;
    tagColor?: string;
}

const AccountLabel: React.FC<{ row: ComparativeRow; strong?: boolean }> = ({ row, strong }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        {row.account_code && <Text style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace", flexShrink: 0, width: 40 }}>{row.account_code}</Text>}
        <Text strong={strong} ellipsis={{ tooltip: row.account_name }} style={{ fontSize: strong ? 14 : 13, minWidth: 0 }}>{row.account_name}</Text>
        {row.tag && <Tag color={row.tagColor || "default"} style={{ fontSize: 10, padding: "0 4px", lineHeight: "16px", margin: 0, flexShrink: 0 }}>{row.tag}</Tag>}
    </div>
);

const comparativeColumns = (currentLabel: string, compareLabel: string, accountTitle = "Account") => [
    { title: accountTitle, dataIndex: "account_name", ellipsis: true, render: (_: any, row: ComparativeRow) => <AccountLabel row={row} /> },
    { title: <PeriodColTitle label={currentLabel} color={CURRENT_COLOR} />, dataIndex: "current", width: CMP_COL.current, align: "right" as const, render: (v: number) => <Text style={{ ...NUM_STYLE, fontWeight: 600, fontSize: 13 }}>{fmt(v ?? 0)}</Text> },
    { title: <PeriodColTitle label={compareLabel} color={COMPARE_COLOR} />, dataIndex: "compare", width: CMP_COL.compare, align: "right" as const, render: (v: number) => <Text style={{ ...NUM_STYLE, fontSize: 13, color: "#64748b" }}>{fmt(v ?? 0)}</Text> },
    { title: "Variance", key: "variance", width: CMP_COL.variance, align: "right" as const, render: (_: any, row: ComparativeRow) => <VarianceCell current={row.current ?? 0} compare={row.compare ?? 0} invertColors={row.invertColors} /> },
];

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Text strong style={{ display: "block", fontSize: 13, marginBottom: 8, color: "#374151", textTransform: "uppercase", letterSpacing: 0.4 }}>{children}</Text>
);

const ComparativeTable: React.FC<{
    rows: ComparativeRow[];
    currentLabel: string;
    compareLabel: string;
    title?: string;
    showSummary?: boolean;
    totalLabel?: string;
    accountTitle?: string;
    /** Colour rule for the total row's variance (e.g. expenses rising is bad). */
    invertTotal?: boolean;
}> = ({ rows, currentLabel, compareLabel, title, showSummary, totalLabel = "Total", accountTitle, invertTotal }) => {
    const ledger = useContext(LedgerContext);
    const onAccountRow = (record: any) =>
        record?._id ? { onClick: () => ledger?.openLedger?.(record._id), style: { cursor: "pointer" } } : {};
    const totalInvert = invertTotal ?? (rows.length > 0 && rows.every((r) => r.invertColors));
    return (
    <div>
        {title && <SectionTitle>{title}</SectionTitle>}
        <Table
            size="small" pagination={false} tableLayout="fixed" scroll={{ x: CMP_MIN_WIDTH }}
            dataSource={rows.map((r, i) => ({ ...r, key: r.account_code || r._id || i }))}
            columns={comparativeColumns(currentLabel, compareLabel, accountTitle)}
            locale={{ emptyText: "No activity in either period" }}
            style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #f0f0f0" }}
            onRow={onAccountRow}
            summary={showSummary && rows.length > 0 ? () => {
                const totC = rows.reduce((s, r) => s + (r.current ?? 0), 0);
                const totCo = rows.reduce((s, r) => s + (r.compare ?? 0), 0);
                return (
                    <Table.Summary.Row style={{ background: "#f8fafc" }}>
                        <Table.Summary.Cell index={0}><Text strong>{totalLabel}</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right"><Text strong style={{ ...NUM_STYLE, color: CURRENT_COLOR }}>{fmt(totC)}</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right"><Text strong style={{ ...NUM_STYLE, color: COMPARE_COLOR }}>{fmt(totCo)}</Text></Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right"><VarianceCell current={totC} compare={totCo} invertColors={totalInvert} strong /></Table.Summary.Cell>
                    </Table.Summary.Row>
                );
            } : undefined}
        />
    </div>
    );
};

// Grand-total bar (Net Profit, Total Assets …) laid out on the exact same
// column grid as the ComparativeTables above it.
const TOTAL_BAR_TONES = {
    final: { bg: "#f1f5f9", border: "#e2e8f0" },
    subtotal: { bg: "#eff6ff", border: "#bfdbfe" },
} as const;

const ComparativeTotalBar: React.FC<{ label: string; current: number; compare: number; invertColors?: boolean; tone?: keyof typeof TOTAL_BAR_TONES }> = ({
    label, current, compare, invertColors, tone = "final",
}) => (
    <Table
        size="small" pagination={false} showHeader={false} tableLayout="fixed" scroll={{ x: CMP_MIN_WIDTH }}
        dataSource={[{ key: "total", account_name: label, current, compare }]}
        style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${TOTAL_BAR_TONES[tone].border}` }}
        onRow={() => ({ style: { background: TOTAL_BAR_TONES[tone].bg } })}
        columns={[
            { dataIndex: "account_name", render: (v: string) => <Text strong style={{ fontSize: 14 }}>{v}</Text> },
            { dataIndex: "current", width: CMP_COL.current, align: "right" as const, render: (v: number) => <Text strong style={{ ...NUM_STYLE, fontSize: 14, color: CURRENT_COLOR }}>{fmt(v)}</Text> },
            { dataIndex: "compare", width: CMP_COL.compare, align: "right" as const, render: (v: number) => <Text strong style={{ ...NUM_STYLE, fontSize: 14, color: COMPARE_COLOR }}>{fmt(v)}</Text> },
            { key: "variance", width: CMP_COL.variance, align: "right" as const, render: () => <VarianceCell current={current} compare={compare} invertColors={invertColors} strong /> },
        ]}
    />
);

const ComparativeLayout: React.FC<{ cl: string; cm: string; children: React.ReactNode }> = ({ cl, cm, children }) => (
    <Space direction="vertical" style={{ width: "100%" }} size={20}>
        <PeriodHeaders currentLabel={cl} compareLabel={cm} />
        {children}
    </Space>
);

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
    const [levyPeriod, setLevyPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
    const [projPeriod, setProjPeriod] = useState<ComparativePeriod>(makeDefaultPeriod());
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

    const shopIdForLedger = selectedBranchId || "";

    const accountsQ = useQuery({
        queryKey: ["coa-lookup", shopIdForLedger || "all"],
        queryFn: () => getAllAccounts(
            shopIdForLedger ? { shop_id: shopIdForLedger } : ({} as any)
        ),
        enabled: true,
    });

    const accountMap = useMemo(() => {
        const map: Record<string, ChartOfAccount> = {};
        accountsQ.data?.accounts?.forEach((a: any) => {
            map[a.account_code] = a;
            map[String(a._id)] = a;
            map[a.account_name] = a;
        });
        return map;
    }, [accountsQ.data]);

    const openLedger = (accountKey: string) => {
        const account = accountMap[accountKey];
        if (!account) {
            message.error(`Account ${accountKey} not found.`);
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
        "customer-statement": 0, "supplier-statement": 0, "ar-aging": 0, "ap-aging": 0, "catering-levy": 0, "projects": 0,
    });

    // Profit & Loss per project (undefined = whole business)
    const [plProjectId, setPlProjectId] = useState<string | undefined>();

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
    const plQ = useQuery({ queryKey: ["rpt-pl", plPeriod.primary, selectedBranchId, plProjectId, runKey["profit-loss"]], queryFn: () => getProfitAndLoss(buildQueryParams({ from: plPeriod.primary[0]?.toISOString(), to: plPeriod.primary[1]?.toISOString(), project_id: plProjectId })), enabled: isReady("profit-loss"), retry: 1 });
    const bsQ = useQuery({ queryKey: ["rpt-bs", bsAsOf.primary, selectedBranchId, runKey["balance-sheet"]], queryFn: () => getBalanceSheet(buildQueryParams({ as_of: bsAsOf.primary?.toISOString() })), enabled: isReady("balance-sheet"), retry: 1 });
    const tbQ = useQuery({ queryKey: ["rpt-tb", tbPeriod.primary, selectedBranchId, runKey["trial-balance"]], queryFn: () => getTrialBalance(buildQueryParams({ from: tbPeriod.primary[0]?.toISOString(), to: tbPeriod.primary[1]?.toISOString() })), enabled: isReady("trial-balance"), retry: 1 });
    const abQ = useQuery({ queryKey: ["rpt-ab", abAsOf.primary, selectedBranchId, runKey["account-balances"]], queryFn: () => getAccountBalances(buildQueryParams({ as_of: abAsOf.primary?.toISOString() })), enabled: isReady("account-balances"), retry: 1 });
    const vatQ = useQuery({ queryKey: ["rpt-vat", vatPeriod.primary, selectedBranchId, runKey["vat"]], queryFn: () => getVATReport(buildQueryParams({ from: vatPeriod.primary[0]?.toISOString(), to: vatPeriod.primary[1]?.toISOString() })), enabled: isReady("vat"), retry: 1 });
    const projQ = useQuery({ queryKey: ["rpt-projects", projPeriod.primary, selectedBranchId, runKey["projects"]], queryFn: () => getProjectsReport(buildQueryParams({ from: projPeriod.primary[0]?.toISOString(), to: projPeriod.primary[1]?.toISOString() })), enabled: isReady("projects"), retry: 1 });
    const levyQ = useQuery({ queryKey: ["rpt-levy", levyPeriod.primary, selectedBranchId, runKey["catering-levy"]], queryFn: () => getCateringLevyReport(buildQueryParams({ from: levyPeriod.primary[0]?.toISOString(), to: levyPeriod.primary[1]?.toISOString() })), enabled: isReady("catering-levy"), retry: 1 });
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
    const plQC = useQuery({ queryKey: ["rpt-pl-c", plPeriod.compare, selectedBranchId, plProjectId, runKey["profit-loss"]], queryFn: () => getProfitAndLoss(buildQueryParams({ from: plPeriod.compare[0]?.toISOString(), to: plPeriod.compare[1]?.toISOString(), project_id: plProjectId })), enabled: plPeriod.enabled && isReady("profit-loss") && !!plPeriod.compare[0], retry: 1 });
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

    // Tourism Levy tab only when the levy is on business-wide or for any branch
    const { data: businessLevy } = useQuery({ queryKey: ["catering-levy"], queryFn: fetchCateringLevy, retry: 1 });
    const levyActive = !!businessLevy?.enabled || shops.some((s: any) => s?.tax_settings?.catering_levy_enabled);
    const tabItems = TAB_ITEMS.filter((t) => t.key !== "catering-levy" || levyActive);

    const Loading = () => <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>;
    const EmptyState = () => <Empty description="Run the report to see results" style={{ padding: 40 }} />;
    const isLoading = (pQ: any, cQ: any, enabled: boolean) => pQ.isFetching || (enabled && cQ.isFetching);

    const ACCOUNT_TAG_COLORS: Record<string, string> = { ASSET: "blue", LIABILITY: "red", EQUITY: "purple", REVENUE: "green", EXPENSE: "orange" };
    const rowKey = (r: any) => r?.account_code || r?.account_name;
    const rowValue = (r: any, valueKey: string | ((r: any) => number)) =>
        (typeof valueKey === "function" ? valueKey(r) : r?.[valueKey]) ?? 0;

    // Union of both periods: accounts that only had activity in the compare
    // period are kept (current = 0), otherwise the compare totals would not
    // reconcile with the report's own totals.
    const mergeRows = (primary: any[], compare: any[], valueKey: string | ((r: any) => number), invertColors = false): ComparativeRow[] => {
        const cMap = buildCompareMap(compare, valueKey);
        const toRow = (r: any, current: number, cmp: number): ComparativeRow => ({
            _id: r._id,
            account_code: r.account_code,
            account_name: r.account_name,
            current,
            compare: cmp,
            invertColors,
            tag: r.account_type,
            tagColor: ACCOUNT_TAG_COLORS[r.account_type],
        });
        const seen = new Set<string>();
        const rows = (primary || []).map((r: any) => {
            seen.add(rowKey(r));
            return toRow(r, rowValue(r, valueKey), lookupCompare(cMap, r.account_code, r.account_name));
        });
        (compare || []).forEach((r: any) => {
            if (seen.has(rowKey(r))) return;
            seen.add(rowKey(r));
            rows.push(toRow(r, 0, rowValue(r, valueKey)));
        });
        return rows.sort((a, b) => (a.account_code || "").localeCompare(b.account_code || "", undefined, { numeric: true }));
    };

    // ── Comparative renderers ─────────────────────────────────────────────────
    // Same sections as the standard P&L (Income → COGS → Gross Profit →
    // Operating Expense → Operating Profit → Non Operating → Net), each
    // merged across both periods.
    const renderComparativePL = () => {
        if (!plQ.data || !plQC.data) return null;
        const cl = buildPeriodLabel(plPeriod.primary), cm = buildPeriodLabel(plPeriod.compare);
        const cur = splitProfitAndLoss(plQ.data), cmp = splitProfitAndLoss(plQC.data);
        const section = (title: string, totalLabel: string, curRows: any[], cmpRows: any[], isCost: boolean, always = false) => {
            const rows = mergeRows(curRows, cmpRows, "amount", isCost);
            if (!always && rows.length === 0) return null;
            return <ComparativeTable title={title} totalLabel={totalLabel} rows={rows} currentLabel={cl} compareLabel={cm} showSummary invertTotal={isCost} />;
        };
        return (
            <ComparativeLayout cl={cl} cm={cm}>
                {section("Income", "Total for Income", cur.incomeRows, cmp.incomeRows, false, true)}
                {section("Cost of Goods Sold", "Total for Cost of Goods Sold", cur.cogsRows, cmp.cogsRows, true)}
                <ComparativeTotalBar tone="subtotal" label="Gross Profit" current={cur.grossProfit} compare={cmp.grossProfit} />
                {section("Operating Expense", "Total for Operating Expense", cur.opExpenseRows, cmp.opExpenseRows, true, true)}
                <ComparativeTotalBar tone="subtotal" label="Operating Profit" current={cur.opProfit} compare={cmp.opProfit} />
                {section("Non Operating Income", "Total for Non Operating Income", cur.nonOpIncRows, cmp.nonOpIncRows, false)}
                {section("Non Operating Expense", "Total for Non Operating Expense", cur.nonOpExpRows, cmp.nonOpExpRows, true)}
                <ComparativeTotalBar label="Net Profit / Loss" current={cur.netProfit} compare={cmp.netProfit} />
            </ComparativeLayout>
        );
    };

    const renderComparativeBS = () => {
        if (!bsQ.data || !bsQC.data) return null;
        const cl = buildPeriodLabel(bsAsOf.primary), cm = buildPeriodLabel(bsAsOf.compare);
        return (
            <ComparativeLayout cl={cl} cm={cm}>
                <ComparativeTable title="Assets" totalLabel="Total Assets" rows={mergeRows(bsQ.data.assets?.accounts, bsQC.data.assets?.accounts, "balance", false)} currentLabel={cl} compareLabel={cm} showSummary />
                <ComparativeTable title="Liabilities" totalLabel="Total Liabilities" rows={mergeRows(bsQ.data.liabilities?.accounts, bsQC.data.liabilities?.accounts, "balance", true)} currentLabel={cl} compareLabel={cm} showSummary invertTotal />
                <ComparativeTable title="Equity" totalLabel="Total Equity" rows={mergeRows(bsQ.data.equity?.accounts, bsQC.data.equity?.accounts, "balance", false)} currentLabel={cl} compareLabel={cm} showSummary />
                <ComparativeTotalBar label="Total Assets" current={bsQ.data.totals?.total_assets ?? 0} compare={bsQC.data.totals?.total_assets ?? 0} />
            </ComparativeLayout>
        );
    };

    const renderComparativeTB = () => {
        if (!tbQ.data || !tbQC.data) return null;
        const cl = buildPeriodLabel(tbPeriod.primary), cm = buildPeriodLabel(tbPeriod.compare);
        const cMap: Record<string, any> = {};
        (tbQC.data.rows || []).forEach((r: any) => { if (r.account_code) cMap[r.account_code] = r; if (r.account_name) cMap[r.account_name] = r; });
        const seen = new Set((tbQ.data.rows || []).map(rowKey));
        const rows = [
            ...(tbQ.data.rows || []),
            // accounts that only moved in the compare period
            ...(tbQC.data.rows || []).filter((r: any) => !seen.has(rowKey(r))).map((r: any) => ({ account_code: r.account_code, account_name: r.account_name, account_type: r.account_type, period_debit: 0, period_credit: 0 })),
        ].sort((a: any, b: any) => (a.account_code || "").localeCompare(b.account_code || "", undefined, { numeric: true }));
        const cmpOf = (r: any) => cMap[r.account_code] || cMap[r.account_name];
        const money = (v: number, color: string, strong = false) =>
            <Text style={{ ...NUM_STYLE, fontWeight: strong ? 600 : 400, fontSize: 12, color: v > 0 ? color : "#cbd5e1" }}>{v > 0 ? fmt(v) : "—"}</Text>;
        const sum = (list: any[], k: string) => list.reduce((s, r) => s + (r?.[k] ?? 0), 0);
        const tot = { dc: sum(rows, "period_debit"), cc: sum(rows, "period_credit"), dp: sum(tbQC.data.rows || [], "period_debit"), cp: sum(tbQC.data.rows || [], "period_credit") };
        const MONEY_W = 130;
        const groupTitle = (label: string, color: string) => <PeriodColTitle label={label} color={color} />;
        return (
            <ComparativeLayout cl={cl} cm={cm}>
                <Table size="small" pagination={{ pageSize: 50, showSizeChanger: true }} tableLayout="fixed" bordered
                    dataSource={rows.map((r: any, i: number) => ({ ...r, key: rowKey(r) || i }))}
                    scroll={{ x: 1040 }}
                    style={{ borderRadius: 8, overflow: "hidden" }}
                    columns={[
                        { title: "Code", dataIndex: "account_code", width: 80, render: (v: string) => <Text style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{v}</Text> },
                        { title: "Account", dataIndex: "account_name", ellipsis: true, render: (v: string, r: any) => <AccountLabel row={{ account_name: v, current: 0, compare: 0, tag: r.account_type, tagColor: ACCOUNT_TAG_COLORS[r.account_type] }} /> },
                        {
                            title: groupTitle(cl, CURRENT_COLOR), align: "center" as const, children: [
                                { title: "Debit", key: "dc", width: MONEY_W, align: "right" as const, render: (_: any, r: any) => money(r.period_debit ?? 0, "#0f172a", true) },
                                { title: "Credit", key: "cc", width: MONEY_W, align: "right" as const, render: (_: any, r: any) => money(r.period_credit ?? 0, "#0f172a", true) },
                            ],
                        },
                        {
                            title: groupTitle(cm, COMPARE_COLOR), align: "center" as const, children: [
                                { title: "Debit", key: "dp", width: MONEY_W, align: "right" as const, render: (_: any, r: any) => money(cmpOf(r)?.period_debit ?? 0, "#64748b") },
                                { title: "Credit", key: "cp", width: MONEY_W, align: "right" as const, render: (_: any, r: any) => money(cmpOf(r)?.period_credit ?? 0, "#64748b") },
                            ],
                        },
                        { title: "Δ Net (Dr − Cr)", key: "delta", width: CMP_COL.variance, align: "right" as const, render: (_: any, r: any) => { const c = cmpOf(r); return <VarianceCell current={(r.period_debit ?? 0) - (r.period_credit ?? 0)} compare={(c?.period_debit ?? 0) - (c?.period_credit ?? 0)} />; } },
                    ]}
                    summary={() => (
                        <Table.Summary fixed>
                            <Table.Summary.Row style={{ background: "#f8fafc" }}>
                                <Table.Summary.Cell index={0} colSpan={2}><Text strong>Total</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={2} align="right"><Text strong style={{ ...NUM_STYLE, color: CURRENT_COLOR }}>{fmt(tot.dc)}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={3} align="right"><Text strong style={{ ...NUM_STYLE, color: CURRENT_COLOR }}>{fmt(tot.cc)}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={4} align="right"><Text strong style={{ ...NUM_STYLE, color: COMPARE_COLOR }}>{fmt(tot.dp)}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={5} align="right"><Text strong style={{ ...NUM_STYLE, color: COMPARE_COLOR }}>{fmt(tot.cp)}</Text></Table.Summary.Cell>
                                <Table.Summary.Cell index={6} align="right"><VarianceCell current={tot.dc - tot.cc} compare={tot.dp - tot.cp} strong /></Table.Summary.Cell>
                            </Table.Summary.Row>
                        </Table.Summary>
                    )}
                />
            </ComparativeLayout>
        );
    };

    const renderComparativeVAT = () => {
        if (!vatQ.data || !vatQC.data) return null;
        const cl = buildPeriodLabel(vatPeriod.primary), cm = buildPeriodLabel(vatPeriod.compare);
        return (
            <ComparativeLayout cl={cl} cm={cm}>
                <ComparativeTable title="VAT Summary" accountTitle="Item" rows={[
                    { account_name: "Output VAT (Collected)", current: vatQ.data.summary?.vat_collected ?? 0, compare: vatQC.data.summary?.vat_collected ?? 0 },
                    { account_name: "Input VAT (Paid)", current: vatQ.data.summary?.vat_paid ?? 0, compare: vatQC.data.summary?.vat_paid ?? 0, invertColors: true },
                ]} currentLabel={cl} compareLabel={cm} />
                <ComparativeTotalBar label="Net VAT Payable" current={vatQ.data.summary?.net_vat_payable ?? 0} compare={vatQC.data.summary?.net_vat_payable ?? 0} />
            </ComparativeLayout>
        );
    };

    const renderComparativeCF = () => {
        if (!cfQ.data || !cfQC.data) return null;
        const cl = buildPeriodLabel(cfPeriod.primary), cm = buildPeriodLabel(cfPeriod.compare);
        return (
            <ComparativeLayout cl={cl} cm={cm}>
                <ComparativeTable title="Cash Flow by Account" totalLabel="Net Cash Flow" rows={mergeRows(cfQ.data.accounts, cfQC.data.accounts, "net_cash_flow", false)} currentLabel={cl} compareLabel={cm} showSummary />
                <ComparativeTable title="Summary" accountTitle="Item" rows={[
                    { account_name: "Total Inflows", current: cfQ.data.totals?.total_inflows ?? 0, compare: cfQC.data.totals?.total_inflows ?? 0 },
                    { account_name: "Total Outflows", current: cfQ.data.totals?.total_outflows ?? 0, compare: cfQC.data.totals?.total_outflows ?? 0, invertColors: true },
                ]} currentLabel={cl} compareLabel={cm} />
                <ComparativeTotalBar label="Net Cash Flow" current={cfQ.data.totals?.net_cash_flow ?? 0} compare={cfQC.data.totals?.net_cash_flow ?? 0} />
            </ComparativeLayout>
        );
    };

    const renderComparativeAB = () => {
        if (!abQ.data || !abQC.data) return null;
        const cl = buildPeriodLabel(abAsOf.primary), cm = buildPeriodLabel(abAsOf.compare);
        return (
            <ComparativeLayout cl={cl} cm={cm}>
                <ComparativeTable title="Account Balances" rows={mergeRows(abQ.data.accounts, abQC.data.accounts, "balance", false)} currentLabel={cl} compareLabel={cm} showSummary />
            </ComparativeLayout>
        );
    };

    const renderComparativeCust = () => {
        if (!custQ.data || !custQC.data) return null;
        const cl = buildPeriodLabel(custPeriod.primary), cm = buildPeriodLabel(custPeriod.compare);
        return (
            <ComparativeLayout cl={cl} cm={cm}>
                <ComparativeTable title="Customer Summary" accountTitle="Item" rows={[
                    { account_name: "Total Invoiced", current: custQ.data.summary?.total_invoiced ?? 0, compare: custQC.data.summary?.total_invoiced ?? 0 },
                    { account_name: "Total Paid", current: custQ.data.summary?.total_paid ?? 0, compare: custQC.data.summary?.total_paid ?? 0 },
                ]} currentLabel={cl} compareLabel={cm} />
                <ComparativeTotalBar label="Closing Balance" current={custQ.data.summary?.closing_balance ?? 0} compare={custQC.data.summary?.closing_balance ?? 0} />
            </ComparativeLayout>
        );
    };

    const renderComparativeSupp = () => {
        if (!suppQ.data || !suppQC.data) return null;
        const cl = buildPeriodLabel(suppPeriod.primary), cm = buildPeriodLabel(suppPeriod.compare);
        return (
            <ComparativeLayout cl={cl} cm={cm}>
                <ComparativeTable title="Supplier Summary" accountTitle="Item" rows={[
                    { account_name: "Total Billed", current: suppQ.data.summary?.total_billed ?? 0, compare: suppQC.data.summary?.total_billed ?? 0 },
                    { account_name: "Total Paid", current: suppQ.data.summary?.total_paid ?? 0, compare: suppQC.data.summary?.total_paid ?? 0 },
                ]} currentLabel={cl} compareLabel={cm} />
                <ComparativeTotalBar label="Closing Balance" current={suppQ.data.summary?.closing_balance ?? 0} compare={suppQC.data.summary?.closing_balance ?? 0} />
            </ComparativeLayout>
        );
    };

    // Aging: union of parties across both dates so cleared balances still show.
    const mergeParties = (cur: any[], cmp: any[], idKey: string, nameKey: string, invertColors: boolean): ComparativeRow[] => {
        const cMap: Record<string, any> = {};
        (cmp || []).forEach((p: any) => { cMap[p[idKey]] = p; });
        const seen = new Set<string>();
        const rows: ComparativeRow[] = (cur || []).map((p: any) => {
            seen.add(p[idKey]);
            return { account_name: p[nameKey], current: p.total ?? 0, compare: cMap[p[idKey]]?.total ?? 0, invertColors };
        });
        (cmp || []).forEach((p: any) => {
            if (!seen.has(p[idKey])) rows.push({ account_name: p[nameKey], current: 0, compare: p.total ?? 0, invertColors });
        });
        return rows.sort((a, b) => b.current - a.current);
    };

    const renderComparativeAR = () => {
        if (!arQ.data || !arQC.data) return null;
        const cl = buildPeriodLabel(arPeriod.primary), cm = buildPeriodLabel(arPeriod.compare);
        return (
            <ComparativeLayout cl={cl} cm={cm}>
                <ComparativeTable title="AR Outstanding by Customer" accountTitle="Customer" totalLabel="Total Outstanding"
                    rows={mergeParties(arQ.data.customers, arQC.data.customers, "customer_id", "customer_name", false)}
                    currentLabel={cl} compareLabel={cm} showSummary />
            </ComparativeLayout>
        );
    };

    const renderComparativeAP = () => {
        if (!apQ.data || !apQC.data) return null;
        const cl = buildPeriodLabel(apPeriod.primary), cm = buildPeriodLabel(apPeriod.compare);
        return (
            <ComparativeLayout cl={cl} cm={cm}>
                <ComparativeTable title="AP Outstanding by Supplier" accountTitle="Supplier" totalLabel="Total Outstanding"
                    rows={mergeParties(apQ.data.suppliers, apQC.data.suppliers, "supplier_id", "supplier_name", true)}
                    currentLabel={cl} compareLabel={cm} showSummary />
            </ComparativeLayout>
        );
    };

    // ── Tab content ───────────────────────────────────────────────────────────
    const renderContent = () => {
        switch (activeTab) {

            case "profit-loss": return <>
                <PeriodFilter value={plPeriod} onChange={setPlPeriod} onRun={() => run("profit-loss")} loading={isLoading(plQ, plQC, plPeriod.enabled)} supportComparative extra={<Space wrap size={8}><ProjectSelect includeClosed placeholder="All projects" value={plProjectId} onChange={(v) => { setPlProjectId(v); run("profit-loss"); }} style={{ width: 200 }} /><FilterControls /></Space>} />
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

            case "projects": return <>
                <PeriodFilter value={projPeriod} onChange={setProjPeriod} onRun={() => run("projects")} loading={projQ.isFetching} supportComparative={false} />
                {projQ.isFetching ? <Loading /> : projQ.data ? (
                    <ProjectsReport
                        data={projQ.data}
                        onViewProfitAndLoss={(id) => {
                            setPlProjectId(id);
                            setPlPeriod({ ...plPeriod, primary: projPeriod.primary, enabled: false });
                            setActiveTab("profit-loss");
                            run("profit-loss");
                        }}
                    />
                ) : <EmptyState />}
            </>;

            case "catering-levy": return <>
                <PeriodFilter value={levyPeriod} onChange={setLevyPeriod} onRun={() => run("catering-levy")} loading={levyQ.isFetching} supportComparative={false} />
                {levyQ.isFetching ? <Loading /> : levyQ.data ? <CateringLevyReport data={levyQ.data} showBranches={!selectedBranchId} /> : <EmptyState />}
            </>;

            case "cash-flow": return <>
                <PeriodFilter value={cfPeriod} onChange={setCfPeriod} onRun={() => run("cash-flow")} loading={isLoading(cfQ, cfQC, cfPeriod.enabled)} supportComparative extra={<FilterControls />} />
                {cfQ.isFetching ? <Loading /> : cfPeriod.enabled && cfQ.data && cfQC.data ? renderComparativeCF() : cfQ.data ? <CashFlowTable data={cfQ.data} /> : <EmptyState />}
            </>;

            case "customer-statement": return <>
                <Space style={{ marginBottom: 12 }} wrap>
                    <Select showSearch placeholder="Select customer…" value={customerId} onChange={setCustomerId} style={{ width: 260, borderRadius: 8 }} optionFilterProp="label"
                        options={customers.map((c: any) => ({ label: customerOptionLabel(c), value: c._id }))} />
                    {custPeriod.enabled && (
                        <Select showSearch placeholder="Compare customer (optional)…" value={compareCustomerId} onChange={setCompareCustomerId} allowClear style={{ width: 260, borderRadius: 8 }} optionFilterProp="label"
                            options={customers.map((c: any) => ({ label: customerOptionLabel(c), value: c._id }))} />
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
            case "projects":
                if (!projQ.data) return empty;
                return [
                    ...projQ.data.projects.map((p) => ({ Project: p.name, Code: p.code || "", Status: p.status, "Income (KES)": p.revenue, "Expenses (KES)": p.expenses, "Net Profit (KES)": p.net_profit, "Margin (%)": p.margin_pct ?? "", "Budget (KES)": p.budget || "", "Budget Used (%)": p.budget_used_pct ?? "", Transactions: p.transactions })),
                    { Project: "Not tagged to a project", Code: "", Status: "", "Income (KES)": projQ.data.untagged.revenue, "Expenses (KES)": projQ.data.untagged.expenses, "Net Profit (KES)": projQ.data.untagged.net_profit, "Margin (%)": "", "Budget (KES)": "", "Budget Used (%)": "", Transactions: projQ.data.untagged.transactions },
                ];
            case "catering-levy":
                if (!levyQ.data) return empty;
                return levyQ.data.documents.map((d) => ({ Date: dayjs(d.date).format("DD MMM YYYY"), Type: d.type, Number: d.number, Customer: d.customer, Branch: d.shop_name, "Net Sale (KES)": d.base, "Rate (%)": parseFloat((d.rate * 100).toFixed(2)), Exempt: d.exempt ? "Yes" : "No", "Levy (KES)": d.exempt ? 0 : d.levy, Status: d.status }));
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
            case "projects":
                return projPeriod.primary;
            case "catering-levy":
                return levyPeriod.primary;
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
        : [null, dayjs(activePeriod).endOf("day")];

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
                                    "customer-statement": 0, "supplier-statement": 0, "ar-aging": 0, "ap-aging": 0, "catering-levy": 0, "projects": 0,
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
                                        "customer-statement": 0, "supplier-statement": 0, "ar-aging": 0, "ap-aging": 0, "catering-levy": 0, "projects": 0,
                                    });
                                }}
                            >
                                Clear Branch
                            </Button>
                        )}
                    </Space>
                </div>
            )}

                <Tabs activeKey={activeTab} onChange={(k) => setActiveTab(k as ReportTab)} type="card" size="small" items={tabItems} style={{ padding: "0 16px" }} tabBarStyle={{ marginBottom: 0 }} />
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