import React, { useState } from "react";
import {
    Space, Typography, Alert, Spin, Select, App, Empty, Card, Tabs,
} from "antd";
import { BarChartOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
    getTrialBalance, getProfitAndLoss, getBalanceSheet, getGeneralLedger,
    getAccountBalances, getVATReport, getCashFlowSummary, getCustomerStatement,
    getSupplierStatement, getARAgingReport, getAPAgingReport,
} from "@services/accounting/reports";
import { fetchAllCustomers } from "@services/customers";
import { fetchAllSuppliers } from "@services/supplier";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import { PeriodFilter, AsOfFilter, ExportButton, exportToCSV } from "./ReportFilters";
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

const AccountingReportsPage: React.FC = () => {
    const primaryColor = usePrimaryColor();
    const [activeTab, setActiveTab] = useState<ReportTab>("profit-loss");

    const defaultPeriod: [Dayjs, Dayjs] = [dayjs().startOf("month"), dayjs().endOf("month")];

    const [plPeriod, setPlPeriod] = useState<[Dayjs | null, Dayjs | null]>(defaultPeriod);
    const [tbPeriod, setTbPeriod] = useState<[Dayjs | null, Dayjs | null]>(defaultPeriod);
    const [glPeriod, setGlPeriod] = useState<[Dayjs | null, Dayjs | null]>(defaultPeriod);
    const [vatPeriod, setVatPeriod] = useState<[Dayjs | null, Dayjs | null]>(defaultPeriod);
    const [cfPeriod, setCfPeriod] = useState<[Dayjs | null, Dayjs | null]>(defaultPeriod);
    const [custPeriod, setCustPeriod] = useState<[Dayjs | null, Dayjs | null]>(defaultPeriod);
    const [suppPeriod, setSuppPeriod] = useState<[Dayjs | null, Dayjs | null]>(defaultPeriod);

    const [bsAsOf, setBsAsOf] = useState<Dayjs | null>(dayjs());
    const [abAsOf, setAbAsOf] = useState<Dayjs | null>(dayjs());
    const [arAsOf, setArAsOf] = useState<Dayjs | null>(dayjs());
    const [apAsOf, setApAsOf] = useState<Dayjs | null>(dayjs());

    const [customerId, setCustomerId] = useState<string | undefined>();
    const [supplierId, setSupplierId] = useState<string | undefined>();

    const [runKey, setRunKey] = useState<Record<ReportTab, number>>({
        "profit-loss": 0, "balance-sheet": 0, "trial-balance": 0,
        "general-ledger": 0, "account-balances": 0, "vat": 0, "cash-flow": 0,
        "customer-statement": 0, "supplier-statement": 0, "ar-aging": 0, "ap-aging": 0,
    });

    const run = (tab: ReportTab) => setRunKey((p) => ({ ...p, [tab]: p[tab] + 1 }));
    const enabled = (tab: ReportTab) => runKey[tab] > 0;

    // ── Helper: Clean params (remove undefined values) ────────────────────────
    const cleanParams = (obj: Record<string, any>) => {
        return Object.fromEntries(
            Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
        );
    };

    // ── Queries ───────────────────────────────────────────────────────────────
    const plQ = useQuery({
        queryKey: ["rpt-pl", plPeriod, runKey["profit-loss"]],
        queryFn: () => getProfitAndLoss(
            cleanParams({
                from: plPeriod[0]?.toISOString(),
                to: plPeriod[1]?.toISOString(),
            })
        ),
        enabled: enabled("profit-loss"),
        retry: 1,
    });

    const bsQ = useQuery({
        queryKey: ["rpt-bs", bsAsOf, runKey["balance-sheet"]],
        queryFn: () => getBalanceSheet(bsAsOf?.toISOString()),
        enabled: enabled("balance-sheet"),
        retry: 1,
    });

    const tbQ = useQuery({
        queryKey: ["rpt-tb", tbPeriod, runKey["trial-balance"]],
        queryFn: () => getTrialBalance(
            cleanParams({
                from: tbPeriod[0]?.toISOString(),
                to: tbPeriod[1]?.toISOString(),
            })
        ),
        enabled: enabled("trial-balance"),
        retry: 1,
    });

    const glQ = useQuery({
        queryKey: ["rpt-gl", glPeriod, runKey["general-ledger"]],
        queryFn: () => getGeneralLedger(
            cleanParams({
                from: glPeriod[0]?.toISOString(),
                to: glPeriod[1]?.toISOString(),
            })
        ),
        enabled: enabled("general-ledger"),
        retry: 1,
    });

    const abQ = useQuery({
        queryKey: ["rpt-ab", abAsOf, runKey["account-balances"]],
        queryFn: () => getAccountBalances(),
        enabled: enabled("account-balances"),
        retry: 1,
    });

    const vatQ = useQuery({
        queryKey: ["rpt-vat", vatPeriod, runKey["vat"]],
        queryFn: () => getVATReport(
            cleanParams({
                from: vatPeriod[0]?.toISOString(),
                to: vatPeriod[1]?.toISOString(),
            })
        ),
        enabled: enabled("vat"),
        retry: 1,
    });

    const cfQ = useQuery({
        queryKey: ["rpt-cf", cfPeriod, runKey["cash-flow"]],
        queryFn: () => getCashFlowSummary(
            cleanParams({
                from: cfPeriod[0]?.toISOString(),
                to: cfPeriod[1]?.toISOString(),
            })
        ),
        enabled: enabled("cash-flow"),
        retry: 1,
    });

    const custQ = useQuery({
        queryKey: ["rpt-cust", customerId, custPeriod, runKey["customer-statement"]],
        queryFn: () => getCustomerStatement(
            customerId!,
            cleanParams({
                from: custPeriod[0]?.toISOString(),
                to: custPeriod[1]?.toISOString(),
            })
        ),
        enabled: !!customerId && enabled("customer-statement"),
        retry: 1,
    });

    const suppQ = useQuery({
        queryKey: ["rpt-supp", supplierId, suppPeriod, runKey["supplier-statement"]],
        queryFn: () => getSupplierStatement(
            supplierId!,
            cleanParams({
                from: suppPeriod[0]?.toISOString(),
                to: suppPeriod[1]?.toISOString(),
            })
        ),
        enabled: !!supplierId && enabled("supplier-statement"),
        retry: 1,
    });

    const arQ = useQuery({
        queryKey: ["rpt-ar", arAsOf, runKey["ar-aging"]],
        queryFn: () => getARAgingReport(
            cleanParams({
                as_of_date: arAsOf?.toISOString(),
            })
        ),
        enabled: enabled("ar-aging"),
        retry: 1,
    });

    const apQ = useQuery({
        queryKey: ["rpt-ap", apAsOf, runKey["ap-aging"]],
        queryFn: () => getAPAgingReport(
            cleanParams({
                as_of_date: apAsOf?.toISOString(),
            })
        ),
        enabled: enabled("ap-aging"),
        retry: 1,
    });

    const { data: customersRaw } = useQuery({
        queryKey: ["customers-select-rpt"],
        queryFn: () => fetchAllCustomers({}),
        enabled: activeTab === "customer-statement" || activeTab === "ar-aging",
    });
    const customers = Array.isArray(customersRaw) ? customersRaw : [];

    const { data: suppliersRaw } = useQuery({
        queryKey: ["suppliers-select-rpt"],
        queryFn: () => fetchAllSuppliers({}),
        enabled: activeTab === "supplier-statement" || activeTab === "ap-aging",
    });
    const suppliers = Array.isArray(suppliersRaw) ? suppliersRaw : [];

    // ── Render helpers ────────────────────────────────────────────────────────
    const Loading = () => (
        <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>
    );
    const Empty_ = () => (
        <Empty description="Run the report to see results" style={{ padding: 40 }} />
    );

    // ── Tab content ───────────────────────────────────────────────────────────
    const renderContent = () => {
        switch (activeTab) {

            case "profit-loss":
                return <>
                    <PeriodFilter value={plPeriod} onChange={setPlPeriod} onRun={() => run("profit-loss")} loading={plQ.isFetching}
                        extra={plQ.data && <ExportButton onExport={() => exportToCSV("profit_and_loss", [
                            ...plQ.data!.revenue.accounts.map((a) => ({ section: "Revenue", ...a })),
                            ...plQ.data!.expenses.accounts.map((a) => ({ section: "Expense", ...a })),
                        ])} />}
                    />
                    {plQ.isFetching ? <Loading /> : plQ.data ? <ProfitAndLossTable data={plQ.data} /> : <Empty_ />}
                </>;

            case "balance-sheet":
                return <>
                    <AsOfFilter value={bsAsOf} onChange={setBsAsOf} onRun={() => run("balance-sheet")} loading={bsQ.isFetching}
                        extra={bsQ.data && <ExportButton onExport={() => exportToCSV("balance_sheet", [
                            ...bsQ.data!.assets.accounts.map((a) => ({ section: "Asset", ...a })),
                            ...bsQ.data!.liabilities.accounts.map((a) => ({ section: "Liability", ...a })),
                            ...bsQ.data!.equity.accounts.map((a) => ({ section: "Equity", ...a })),
                        ])} />}
                    />
                    {bsQ.isFetching ? <Loading /> : bsQ.data ? <BalanceSheetTable data={bsQ.data} /> : <Empty_ />}
                </>;

            case "trial-balance":
                return <>
                    <PeriodFilter value={tbPeriod} onChange={setTbPeriod} onRun={() => run("trial-balance")} loading={tbQ.isFetching}
                        extra={tbQ.data && <ExportButton onExport={() => exportToCSV("trial_balance", tbQ.data!.rows)} />}
                    />
                    {tbQ.isFetching ? <Loading /> : tbQ.data ? <TrialBalanceTable data={tbQ.data} /> : <Empty_ />}
                </>;

            case "general-ledger":
                return <>
                    <PeriodFilter value={glPeriod} onChange={setGlPeriod} onRun={() => run("general-ledger")} loading={glQ.isFetching} />
                    {glQ.isFetching ? <Loading /> : glQ.data ? <GeneralLedgerTable data={glQ.data} /> : <Empty_ />}
                </>;

            case "account-balances":
                return <>
                    <AsOfFilter value={abAsOf} onChange={setAbAsOf} onRun={() => run("account-balances")} loading={abQ.isFetching}
                        extra={abQ.data && <ExportButton onExport={() => exportToCSV("account_balances", abQ.data!.accounts)} />}
                    />
                    {abQ.isFetching ? <Loading /> : abQ.data ? <AccountBalancesTable data={abQ.data} /> : <Empty_ />}
                </>;

            case "vat":
                return <>
                    <PeriodFilter value={vatPeriod} onChange={setVatPeriod} onRun={() => run("vat")} loading={vatQ.isFetching}
                        extra={vatQ.data && <ExportButton onExport={() => exportToCSV("vat_report", vatQ.data!.transactions)} />}
                    />
                    {vatQ.isFetching ? <Loading /> : vatQ.data ? <VATReportTable data={vatQ.data} /> : <Empty_ />}
                </>;

            case "cash-flow":
                return <>
                    <PeriodFilter value={cfPeriod} onChange={setCfPeriod} onRun={() => run("cash-flow")} loading={cfQ.isFetching}
                        extra={cfQ.data && <ExportButton onExport={() => exportToCSV("cash_flow", cfQ.data!.accounts)} />}
                    />
                    {cfQ.isFetching ? <Loading /> : cfQ.data ? <CashFlowTable data={cfQ.data} /> : <Empty_ />}
                </>;

            case "customer-statement":
                return <>
                    <Space style={{ marginBottom: 16 }} wrap>
                        <Select
                            showSearch
                            placeholder="Select customer…"
                            value={customerId}
                            onChange={setCustomerId}
                            style={{ width: 300 }}
                            optionFilterProp="label"
                            options={customers.map((c: any) => ({
                                label: `${c.customer_name}${c.customer_phone ? ` — ${c.customer_phone}` : ""}`,
                                value: c._id,
                            }))}
                        />
                    </Space>
                    <PeriodFilter
                        value={custPeriod}
                        onChange={setCustPeriod}
                        onRun={() => { if (customerId) run("customer-statement"); }}
                        loading={custQ.isFetching}
                        extra={custQ.data && <ExportButton onExport={() => exportToCSV("customer_statement", custQ.data!.transactions)} />}
                    />
                    {!customerId && <Alert type="info" showIcon message="Select a customer to generate their statement." style={{ marginBottom: 12 }} />}
                    {custQ.isFetching ? <Loading /> : custQ.data ? <CustomerStatementTable data={custQ.data} /> : !customerId ? null : <Empty_ />}
                </>;

            case "supplier-statement":
                return <>
                    <Space style={{ marginBottom: 16 }} wrap>
                        <Select
                            showSearch
                            placeholder="Select supplier…"
                            value={supplierId}
                            onChange={setSupplierId}
                            style={{ width: 300 }}
                            optionFilterProp="label"
                            options={suppliers.map((s: any) => ({
                                label: `${s.name}${s.phone ? ` — ${s.phone}` : ""}`,
                                value: s._id,
                            }))}
                        />
                    </Space>
                    <PeriodFilter
                        value={suppPeriod}
                        onChange={setSuppPeriod}
                        onRun={() => { if (supplierId) run("supplier-statement"); }}
                        loading={suppQ.isFetching}
                        extra={suppQ.data && <ExportButton onExport={() => exportToCSV("supplier_statement", suppQ.data!.transactions)} />}
                    />
                    {!supplierId && <Alert type="info" showIcon message="Select a supplier to generate their statement." style={{ marginBottom: 12 }} />}
                    {suppQ.isFetching ? <Loading /> : suppQ.data ? <SupplierStatementTable data={suppQ.data} /> : !supplierId ? null : <Empty_ />}
                </>;

            case "ar-aging":
                return <>
                    <AsOfFilter value={arAsOf} onChange={setArAsOf} onRun={() => run("ar-aging")} loading={arQ.isFetching} />
                    {arQ.isFetching ? <Loading /> : arQ.data ? <ARAgingTable data={arQ.data} /> : <Empty_ />}
                </>;

            case "ap-aging":
                return <>
                    <AsOfFilter value={apAsOf} onChange={setApAsOf} onRun={() => run("ap-aging")} loading={apQ.isFetching} />
                    {apQ.isFetching ? <Loading /> : apQ.data ? <APAgingTable data={apQ.data} /> : <Empty_ />}
                </>;

            default:
                return <Empty_ />;
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <App>
            <Card
                bordered
                styles={{ body: { padding: 0 } }}
                title={
                    <Space>
                        <BarChartOutlined style={{ fontSize: 18, color: primaryColor }} />
                        <Text strong style={{ fontSize: 16 }}>Accounting Reports</Text>
                    </Space>
                }
            >
                {/* Tabs outside content — no swallowing */}
                <Tabs
                    activeKey={activeTab}
                    onChange={(k) => setActiveTab(k as ReportTab)}
                    type="card"
                    size="small"
                    items={TAB_ITEMS}
                    style={{ padding: "0 16px" }}
                    tabBarStyle={{ marginBottom: 0 }}
                />

                {/* Content always renders independently */}
                <div style={{ padding: 16 }}>
                    {renderContent()}
                </div>
            </Card>
        </App>
    );
};

export default AccountingReportsPage;