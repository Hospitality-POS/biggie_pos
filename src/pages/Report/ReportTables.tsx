import React from "react";
import {
    Table, Tag, Typography, Space, Alert, Statistic,
    Row, Col, Card, Divider, Badge, Progress,
} from "antd";
import {
    ArrowUpOutlined, ArrowDownOutlined,
    CheckCircleOutlined, WarningOutlined,
} from "@ant-design/icons";
import {
    TrialBalanceResponse, ProfitAndLossResponse, BalanceSheetResponse,
    GeneralLedgerResponse, VATReportResponse, CashFlowResponse,
    AccountBalancesResponse, CustomerStatementResponse, SupplierStatementResponse,
    ARAgingResponse, APAgingResponse, TrialBalanceRow, GeneralLedgerAccount, LedgerEntryLine,
} from "@services/accounting/reports";
import dayjs from "dayjs";

const { Text, Title } = Typography;

const fmt = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPE_COLORS: Record<string, string> = {
    ASSET: "blue", LIABILITY: "red", EQUITY: "purple", REVENUE: "green", EXPENSE: "orange",
};
const SOURCE_COLORS: Record<string, string> = {
    manual: "default", pos_sale: "blue", pos_subscription: "cyan",
    invoice: "green", bill: "orange", payment: "purple", reconciliation: "geekblue",
};

// ── 1. Trial Balance ───────────────────────────────────────────────────────────
export const TrialBalanceTable: React.FC<{ data: TrialBalanceResponse }> = ({ data }) => {
    const columns = [
        { title: "Code", dataIndex: "account_code", key: "code", width: 90, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
        {
            title: "Account", dataIndex: "account_name", key: "name",
            render: (v: string, r: TrialBalanceRow) => (
                <Space size={4}>
                    <Text>{v}</Text>
                    <Tag color={TYPE_COLORS[r.account_type]} style={{ fontSize: 10, padding: "0 4px" }}>{r.account_type}</Tag>
                </Space>
            ),
        },
        { title: "Subtype", dataIndex: "account_subtype", key: "subtype", width: 160, render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v || "—"}</Text> },
        { title: "Opening Balance", dataIndex: "opening_balance", key: "ob", width: 130, align: "right" as const, render: (v: number) => <Text style={{ fontSize: 12 }}>{fmt(v)}</Text> },
        { title: "Period Debit", dataIndex: "period_debit", key: "pd", width: 120, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#cf1322" }}>{fmt(v)}</Text> : "—" },
        { title: "Period Credit", dataIndex: "period_credit", key: "pc", width: 120, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> : "—" },
        { title: "Closing Debit", dataIndex: "closing_debit", key: "cd", width: 120, align: "right" as const, render: (v: number) => v > 0 ? <Text strong style={{ color: "#cf1322" }}>{fmt(v)}</Text> : "—" },
        { title: "Closing Credit", dataIndex: "closing_credit", key: "cc", width: 120, align: "right" as const, render: (v: number) => v > 0 ? <Text strong style={{ color: "#389e0d" }}>{fmt(v)}</Text> : "—" },
    ];
    return (
        <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}><Card size="small" bordered><Statistic title="Total Debit" value={data.totals.total_debit} precision={2} prefix="KES" valueStyle={{ color: "#cf1322", fontSize: 16 }} /></Card></Col>
                <Col span={6}><Card size="small" bordered><Statistic title="Total Credit" value={data.totals.total_credit} precision={2} prefix="KES" valueStyle={{ color: "#389e0d", fontSize: 16 }} /></Card></Col>
                <Col span={6}>
                    <Card size="small" bordered style={{ background: data.is_balanced ? "#f6ffed" : "#fff2f0", borderColor: data.is_balanced ? "#b7eb8f" : "#ffa39e" }}>
                        <Statistic title="Difference" value={Math.abs(data.totals.difference)} precision={2} prefix="KES" valueStyle={{ color: data.is_balanced ? "#389e0d" : "#cf1322", fontSize: 16 }} suffix={data.is_balanced ? <CheckCircleOutlined /> : <WarningOutlined />} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" bordered>
                        <div style={{ paddingTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Books Status</Text>
                            <div style={{ marginTop: 8 }}>
                                <Badge status={data.is_balanced ? "success" : "error"} text={<Text strong style={{ fontSize: 15 }}>{data.is_balanced ? "Balanced ✓" : "Unbalanced ✗"}</Text>} />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
            <Table rowKey={(r) => r.account_code} dataSource={data.rows} columns={columns} size="small" pagination={{ pageSize: 30, showSizeChanger: true }} scroll={{ x: 950 }}
                summary={() => (
                    <Table.Summary fixed>
                        <Table.Summary.Row style={{ background: "#fafafa", fontWeight: 700 }}>
                            <Table.Summary.Cell index={0} colSpan={3}><Text strong>Totals</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={3} />
                            <Table.Summary.Cell index={4} align="right"><Text strong style={{ color: "#cf1322" }}>{fmt(data.totals.total_debit)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={5} align="right"><Text strong style={{ color: "#389e0d" }}>{fmt(data.totals.total_credit)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={6} colSpan={2} />
                        </Table.Summary.Row>
                    </Table.Summary>
                )}
            />
        </>
    );
};

// ── 2. Profit & Loss ──────────────────────────────────────────────────────────
export const ProfitAndLossTable: React.FC<{ data: ProfitAndLossResponse }> = ({ data }) => {
    const revenueRows = data.revenue.accounts.map((a) => ({ ...a, _section: "Revenue" }));
    const expenseRows = data.expenses.accounts.map((a) => ({ ...a, _section: "Expense" }));
    const amountCols = (color: string) => [
        { title: "Code", dataIndex: "account_code", width: 90, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
        { title: "Account", dataIndex: "account_name" },
        { title: "Subtype", dataIndex: "account_subtype", width: 160, render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v || "—"}</Text> },
        { title: "Amount", dataIndex: "amount", align: "right" as const, width: 150, render: (v: number) => <Text strong style={{ color }}>{fmt(v)}</Text> },
    ];
    return (
        <>
            <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col span={8}><Card size="small" bordered style={{ background: "#f6ffed", borderColor: "#b7eb8f" }}><Statistic title="Total Revenue" value={data.revenue.total_revenue} precision={2} prefix="KES" valueStyle={{ color: "#389e0d", fontSize: 18 }} suffix={<ArrowUpOutlined />} /></Card></Col>
                <Col span={8}><Card size="small" bordered style={{ background: "#fff2f0", borderColor: "#ffa39e" }}><Statistic title="Total Expenses" value={data.expenses.total_expenses} precision={2} prefix="KES" valueStyle={{ color: "#cf1322", fontSize: 18 }} suffix={<ArrowDownOutlined />} /></Card></Col>
                <Col span={8}><Card size="small" bordered style={{ background: data.is_profit ? "#f6ffed" : "#fff2f0", borderColor: data.is_profit ? "#b7eb8f" : "#ffa39e" }}><Statistic title={data.is_profit ? "Net Profit" : "Net Loss"} value={Math.abs(data.net_profit)} precision={2} prefix="KES" valueStyle={{ color: data.is_profit ? "#389e0d" : "#cf1322", fontSize: 20, fontWeight: 700 }} /></Card></Col>
            </Row>
            <Text strong style={{ fontSize: 14, display: "block", marginBottom: 8, color: "#389e0d" }}>Revenue</Text>
            <Table rowKey="account_code" dataSource={revenueRows} pagination={false} size="small" style={{ marginBottom: 20 }} columns={amountCols("#389e0d")}
                summary={() => (<Table.Summary.Row style={{ background: "#f6ffed" }}><Table.Summary.Cell index={0} colSpan={3}><Text strong>Total Revenue</Text></Table.Summary.Cell><Table.Summary.Cell index={3} align="right"><Text strong style={{ color: "#389e0d", fontSize: 14 }}>{fmt(data.revenue.total_revenue)}</Text></Table.Summary.Cell></Table.Summary.Row>)}
            />
            <Text strong style={{ fontSize: 14, display: "block", marginBottom: 8, color: "#cf1322" }}>Expenses</Text>
            <Table rowKey="account_code" dataSource={expenseRows} pagination={false} size="small" columns={amountCols("#cf1322")}
                summary={() => (<Table.Summary.Row style={{ background: "#fff2f0" }}><Table.Summary.Cell index={0} colSpan={3}><Text strong>Total Expenses</Text></Table.Summary.Cell><Table.Summary.Cell index={3} align="right"><Text strong style={{ color: "#cf1322", fontSize: 14 }}>{fmt(data.expenses.total_expenses)}</Text></Table.Summary.Cell></Table.Summary.Row>)}
            />
        </>
    );
};

// ── 3. Balance Sheet ───────────────────────────────────────────────────────────
export const BalanceSheetTable: React.FC<{ data: BalanceSheetResponse }> = ({ data }) => {
    const section = (title: string, rows: any[], total: number, color: string) => (
        <div style={{ marginBottom: 24 }}>
            <Text strong style={{ fontSize: 14, color, display: "block", marginBottom: 8 }}>{title}</Text>
            <Table rowKey="account_code" dataSource={rows} pagination={false} size="small"
                columns={[
                    { title: "Code", dataIndex: "account_code", width: 90, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
                    { title: "Account", dataIndex: "account_name" },
                    { title: "Subtype", dataIndex: "account_subtype", width: 160, render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v || "—"}</Text> },
                    { title: "Balance", dataIndex: "balance", align: "right" as const, width: 140, render: (v: number) => <Text style={{ color }}>{fmt(v)}</Text> },
                ]}
                summary={() => (<Table.Summary.Row style={{ background: "#fafafa" }}><Table.Summary.Cell index={0} colSpan={3}><Text strong>Total {title}</Text></Table.Summary.Cell><Table.Summary.Cell index={3} align="right"><Text strong style={{ color, fontSize: 14 }}>{fmt(total)}</Text></Table.Summary.Cell></Table.Summary.Row>)}
            />
        </div>
    );
    return (
        <>
            <Alert type={data.is_balanced ? "success" : "error"} showIcon message={data.is_balanced ? `Balance Sheet is balanced as of ${dayjs(data.as_of).format("DD MMM YYYY")}` : `Balance Sheet is UNBALANCED — difference: KES ${fmt(data.totals.difference)}`} style={{ marginBottom: 20 }} />
            <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col span={8}><Card size="small" bordered><Statistic title="Total Assets" value={data.totals.total_assets} precision={2} prefix="KES" valueStyle={{ color: "#1d39c4", fontSize: 16 }} /></Card></Col>
                <Col span={8}><Card size="small" bordered><Statistic title="Liabilities + Equity" value={data.totals.total_liabilities_and_equity} precision={2} prefix="KES" valueStyle={{ color: "#1d39c4", fontSize: 16 }} /></Card></Col>
                <Col span={8}><Card size="small" bordered style={{ background: data.is_balanced ? "#f6ffed" : "#fff2f0" }}><Statistic title="Difference" value={Math.abs(data.totals.difference)} precision={2} prefix="KES" valueStyle={{ color: data.is_balanced ? "#389e0d" : "#cf1322", fontSize: 16 }} /></Card></Col>
            </Row>
            {section("Assets", data.assets.accounts, data.assets.total_assets, "#1d39c4")}
            {section("Liabilities", data.liabilities.accounts, data.liabilities.total_liabilities, "#cf1322")}
            {section("Equity", data.equity.accounts, data.equity.total_equity, "#722ed1")}
        </>
    );
};

// ── 4. General Ledger ─────────────────────────────────────────────────────────
export const GeneralLedgerTable: React.FC<{ data: GeneralLedgerResponse }> = ({ data }) => {
    const lineColumns = [
        { title: "Date", dataIndex: "entry_date", width: 100, render: (d: string) => dayjs(d).format("DD MMM YYYY") },
        { title: "Entry No.", dataIndex: "entry_no", width: 120, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
        { title: "Description", dataIndex: "description", ellipsis: true },
        { title: "Reference", dataIndex: "reference", width: 110, render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v || "—"}</Text> },
        { title: "Source", dataIndex: "source", width: 120, render: (s: string) => <Tag color={SOURCE_COLORS[s] || "default"} style={{ fontSize: 10 }}>{s?.replace(/_/g, " ").toUpperCase()}</Tag> },
        { title: "Debit", dataIndex: "debit", width: 110, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#cf1322", fontSize: 12 }}>{fmt(v)}</Text> : "—" },
        { title: "Credit", dataIndex: "credit", width: 110, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#389e0d", fontSize: 12 }}>{fmt(v)}</Text> : "—" },
        { title: "Balance", dataIndex: "balance", width: 120, align: "right" as const, render: (v: number) => <Text strong style={{ color: v >= 0 ? "#1d39c4" : "#cf1322", fontSize: 12 }}>{fmt(Math.abs(v))}</Text> },
    ];
    return (
        <>
            {data.accounts.map((acc: GeneralLedgerAccount) => (
                <div key={acc.account_code} style={{ marginBottom: 32 }}>
                    <Space style={{ marginBottom: 8 }} wrap>
                        <Text code style={{ fontSize: 12 }}>{acc.account_code}</Text>
                        <Text strong style={{ fontSize: 14 }}>{acc.account_name}</Text>
                        <Tag color={TYPE_COLORS[acc.account_type]}>{acc.account_type}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>Opening: KES {fmt(acc.opening_balance)} | Closing: KES {fmt(acc.closing_balance)} | DR: {fmt(acc.total_debit)} | CR: {fmt(acc.total_credit)}</Text>
                    </Space>
                    <Table rowKey={(r, i) => `${r.entry_no}-${i}`} dataSource={acc.lines} columns={lineColumns} pagination={false} size="small" scroll={{ x: 800 }} />
                </div>
            ))}
        </>
    );
};

// ── 5. VAT Report ─────────────────────────────────────────────────────────────
export const VATReportTable: React.FC<{ data: VATReportResponse }> = ({ data }) => {
    const { summary, by_source, transactions } = data;
    const sourceRows = Object.entries(by_source).map(([src, vals]) => ({ source: src, collected: vals.collected, paid: vals.paid, net: vals.collected - vals.paid }));
    return (
        <>
            <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col span={6}><Card size="small" bordered style={{ background: "#f6ffed" }}><Statistic title="VAT Collected (Output)" value={summary.vat_collected} precision={2} prefix="KES" valueStyle={{ color: "#389e0d", fontSize: 16 }} /></Card></Col>
                <Col span={6}><Card size="small" bordered style={{ background: "#fff7e6" }}><Statistic title="VAT Paid (Input)" value={summary.vat_paid} precision={2} prefix="KES" valueStyle={{ color: "#fa8c16", fontSize: 16 }} /></Card></Col>
                <Col span={6}><Card size="small" bordered style={{ background: summary.net_vat_payable >= 0 ? "#fff2f0" : "#f6ffed" }}><Statistic title="Net VAT Payable" value={Math.abs(summary.net_vat_payable)} precision={2} prefix="KES" valueStyle={{ color: summary.net_vat_payable >= 0 ? "#cf1322" : "#389e0d", fontSize: 16 }} suffix={summary.net_vat_payable < 0 ? "(Refund)" : ""} /></Card></Col>
                <Col span={6}><Card size="small" bordered><Text type="secondary" style={{ fontSize: 12, display: "block" }}>VAT Account</Text><Text code style={{ fontSize: 14 }}>{summary.vat_account_code}</Text></Card></Col>
            </Row>
            <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>By Source</Text>
            <Table rowKey="source" dataSource={sourceRows} pagination={false} size="small" style={{ marginBottom: 24 }}
                columns={[
                    { title: "Source", dataIndex: "source", render: (s: string) => <Tag color={SOURCE_COLORS[s] || "default"}>{s.replace(/_/g, " ").toUpperCase()}</Tag> },
                    { title: "Collected", dataIndex: "collected", align: "right" as const, render: (v: number) => <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> },
                    { title: "Paid", dataIndex: "paid", align: "right" as const, render: (v: number) => <Text style={{ color: "#fa8c16" }}>{fmt(v)}</Text> },
                    { title: "Net", dataIndex: "net", align: "right" as const, render: (v: number) => <Text strong style={{ color: v >= 0 ? "#cf1322" : "#389e0d" }}>{fmt(Math.abs(v))}</Text> },
                ]}
            />
            <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>Transactions</Text>
            <Table rowKey="entry_no" dataSource={transactions} pagination={{ pageSize: 20, showSizeChanger: true }} size="small" scroll={{ x: 750 }}
                columns={[
                    { title: "Date", dataIndex: "entry_date", width: 110, render: (d: string) => dayjs(d).format("DD MMM YYYY") },
                    { title: "Entry No.", dataIndex: "entry_no", width: 120, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
                    { title: "Description", dataIndex: "description", ellipsis: true },
                    { title: "Source", dataIndex: "source", width: 120, render: (s: string) => <Tag color={SOURCE_COLORS[s] || "default"} style={{ fontSize: 10 }}>{s.replace(/_/g, " ").toUpperCase()}</Tag> },
                    { title: "VAT Collected", dataIndex: "vat_collected", align: "right" as const, width: 120, render: (v: number) => v > 0 ? <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> : "—" },
                    { title: "VAT Paid", dataIndex: "vat_paid", align: "right" as const, width: 110, render: (v: number) => v > 0 ? <Text style={{ color: "#fa8c16" }}>{fmt(v)}</Text> : "—" },
                ]}
            />
        </>
    );
};

// ── 6. Cash Flow ──────────────────────────────────────────────────────────────
export const CashFlowTable: React.FC<{ data: CashFlowResponse }> = ({ data }) => (
    <>
        <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col span={8}><Card size="small" bordered style={{ background: "#f6ffed" }}><Statistic title="Total Inflows" value={data.totals.total_inflows} precision={2} prefix="KES" valueStyle={{ color: "#389e0d", fontSize: 16 }} suffix={<ArrowUpOutlined />} /></Card></Col>
            <Col span={8}><Card size="small" bordered style={{ background: "#fff2f0" }}><Statistic title="Total Outflows" value={data.totals.total_outflows} precision={2} prefix="KES" valueStyle={{ color: "#cf1322", fontSize: 16 }} suffix={<ArrowDownOutlined />} /></Card></Col>
            <Col span={8}><Card size="small" bordered style={{ background: data.totals.net_cash_flow >= 0 ? "#f6ffed" : "#fff2f0" }}><Statistic title="Net Cash Flow" value={Math.abs(data.totals.net_cash_flow)} precision={2} prefix="KES" valueStyle={{ color: data.totals.net_cash_flow >= 0 ? "#389e0d" : "#cf1322", fontSize: 16 }} suffix={data.totals.net_cash_flow < 0 ? "(Outflow)" : "(Inflow)"} /></Card></Col>
        </Row>
        <Table rowKey="account_code" dataSource={data.accounts} pagination={false} size="small" scroll={{ x: 800 }}
            columns={[
                { title: "Code", dataIndex: "account_code", width: 90, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
                { title: "Account", dataIndex: "account_name" },
                { title: "Subtype", dataIndex: "account_subtype", width: 140, render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v || "—"}</Text> },
                { title: "Opening", dataIndex: "opening_balance", width: 120, align: "right" as const, render: (v: number) => fmt(v) },
                { title: "Inflows", dataIndex: "inflows", width: 120, align: "right" as const, render: (v: number) => <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> },
                { title: "Outflows", dataIndex: "outflows", width: 120, align: "right" as const, render: (v: number) => <Text style={{ color: "#cf1322" }}>{fmt(v)}</Text> },
                { title: "Net Cash Flow", dataIndex: "net_cash_flow", width: 130, align: "right" as const, render: (v: number) => <Text strong style={{ color: v >= 0 ? "#389e0d" : "#cf1322" }}>{fmt(Math.abs(v))}</Text> },
                { title: "Closing", dataIndex: "closing_balance", width: 120, align: "right" as const, render: (v: number) => <Text strong style={{ color: "#1d39c4" }}>{fmt(v)}</Text> },
            ]}
        />
    </>
);

// ── 7. Account Balances ───────────────────────────────────────────────────────
export const AccountBalancesTable: React.FC<{ data: AccountBalancesResponse }> = ({ data }) => (
    <>
        <Row gutter={12} style={{ marginBottom: 20 }}>
            {Object.entries(data.summary).map(([key, val]) => (
                <Col span={4} key={key}>
                    <Card size="small" bordered>
                        <Statistic title={key.replace("total_", "").toUpperCase()} value={parseFloat(val as string) || 0} precision={2} prefix="KES" valueStyle={{ fontSize: 13, color: TYPE_COLORS[key.replace("total_", "").toUpperCase()] || "#333" }} />
                    </Card>
                </Col>
            ))}
        </Row>
        <Table rowKey="account_code" dataSource={data.accounts} pagination={{ pageSize: 30, showSizeChanger: true }} size="small" scroll={{ x: 900 }}
            columns={[
                { title: "Code", dataIndex: "account_code", width: 90, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
                { title: "Account", dataIndex: "account_name" },
                { title: "Type", dataIndex: "account_type", width: 100, render: (v: string) => <Tag color={TYPE_COLORS[v]}>{v}</Tag> },
                { title: "Subtype", dataIndex: "account_subtype", width: 150, render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v || "—"}</Text> },
                { title: "Normal", dataIndex: "normal_balance", width: 80, render: (v: string) => <Tag color={v === "DEBIT" ? "blue" : "green"} style={{ fontSize: 10 }}>{v}</Tag> },
                { title: "Opening", dataIndex: "opening_balance", width: 110, align: "right" as const, render: (v: number) => fmt(v) },
                { title: "Total DR", dataIndex: "total_debit", width: 110, align: "right" as const, render: (v: number) => <Text style={{ color: "#cf1322" }}>{fmt(v)}</Text> },
                { title: "Total CR", dataIndex: "total_credit", width: 110, align: "right" as const, render: (v: number) => <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> },
                { title: "Balance", dataIndex: "balance", width: 120, align: "right" as const, render: (v: number) => <Text strong style={{ color: "#1d39c4" }}>{fmt(v)}</Text> },
            ]}
        />
    </>
);

// ── 8. Customer Statement ─────────────────────────────────────────────────────
export const CustomerStatementTable: React.FC<{ data: CustomerStatementResponse }> = ({ data }) => {
    const { customer, summary, transactions } = data;
    const TXN_COLORS: Record<string, string> = { Invoice: "blue", Payment: "green", "Credit Note": "cyan", Bill: "orange", "Debit Note": "red" };
    return (
        <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                    <Card size="small" bordered>
                        <Text strong style={{ fontSize: 14 }}>{customer.customer_name}</Text>
                        {customer.email && <div><Text type="secondary" style={{ fontSize: 12 }}>{customer.email}</Text></div>}
                        {customer.phone && <div><Text type="secondary" style={{ fontSize: 12 }}>{customer.phone}</Text></div>}
                        {customer.code && <div><Text code style={{ fontSize: 11 }}>{customer.code}</Text></div>}
                    </Card>
                </Col>
                <Col span={12}>
                    <Row gutter={8}>
                        <Col span={8}><Card size="small" bordered><Statistic title="Invoiced" value={summary.total_invoiced} precision={2} prefix="KES" valueStyle={{ fontSize: 13, color: "#1890ff" }} /></Card></Col>
                        <Col span={8}><Card size="small" bordered><Statistic title="Paid" value={summary.total_paid} precision={2} prefix="KES" valueStyle={{ fontSize: 13, color: "#389e0d" }} /></Card></Col>
                        <Col span={8}><Card size="small" bordered style={{ background: summary.closing_balance > 0 ? "#fff2f0" : "#f6ffed" }}><Statistic title={summary.balance_label} value={Math.abs(summary.closing_balance)} precision={2} prefix="KES" valueStyle={{ fontSize: 13, color: summary.closing_balance > 0 ? "#cf1322" : "#389e0d", fontWeight: 700 }} /></Card></Col>
                    </Row>
                </Col>
            </Row>
            <Table rowKey={(r, i) => `${r.document_id}-${i}`} dataSource={transactions} pagination={{ pageSize: 20, showSizeChanger: true }} size="small" scroll={{ x: 750 }}
                columns={[
                    { title: "Date", dataIndex: "date", width: 110, render: (d: string) => dayjs(d).format("DD MMM YYYY") },
                    { title: "Type", dataIndex: "type", width: 110, render: (v: string) => <Tag color={TXN_COLORS[v] || "default"} style={{ fontSize: 10 }}>{v}</Tag> },
                    { title: "Reference", dataIndex: "reference", width: 120 },
                    { title: "Description", dataIndex: "description", ellipsis: true },
                    { title: "Debit", dataIndex: "debit", width: 110, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#cf1322" }}>{fmt(v)}</Text> : "—" },
                    { title: "Credit", dataIndex: "credit", width: 110, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> : "—" },
                    { title: "Balance", dataIndex: "balance", width: 120, align: "right" as const, render: (v: number) => <Text strong style={{ color: v > 0 ? "#cf1322" : "#389e0d" }}>{fmt(Math.abs(v))}</Text> },
                ]}
            />
        </>
    );
};

// ── 9. Supplier Statement ─────────────────────────────────────────────────────
export const SupplierStatementTable: React.FC<{ data: SupplierStatementResponse }> = ({ data }) => {
    const { supplier, summary, transactions } = data;
    const TXN_COLORS: Record<string, string> = { Invoice: "blue", Payment: "green", "Credit Note": "cyan", Bill: "orange", "Debit Note": "red" };
    return (
        <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                    <Card size="small" bordered>
                        <Text strong style={{ fontSize: 14 }}>{supplier.name}</Text>
                        {supplier.email && <div><Text type="secondary" style={{ fontSize: 12 }}>{supplier.email}</Text></div>}
                        {supplier.phone && <div><Text type="secondary" style={{ fontSize: 12 }}>{supplier.phone}</Text></div>}
                    </Card>
                </Col>
                <Col span={12}>
                    <Row gutter={8}>
                        <Col span={8}><Card size="small" bordered><Statistic title="Total Billed" value={summary.total_billed} precision={2} prefix="KES" valueStyle={{ fontSize: 13, color: "#fa8c16" }} /></Card></Col>
                        <Col span={8}><Card size="small" bordered><Statistic title="Total Paid" value={summary.total_paid} precision={2} prefix="KES" valueStyle={{ fontSize: 13, color: "#389e0d" }} /></Card></Col>
                        <Col span={8}><Card size="small" bordered style={{ background: summary.closing_balance > 0 ? "#fff7e6" : "#f6ffed" }}><Statistic title={summary.balance_label} value={Math.abs(summary.closing_balance)} precision={2} prefix="KES" valueStyle={{ fontSize: 13, color: summary.closing_balance > 0 ? "#fa8c16" : "#389e0d", fontWeight: 700 }} /></Card></Col>
                    </Row>
                </Col>
            </Row>
            <Table rowKey={(r, i) => `${r.document_id}-${i}`} dataSource={transactions} pagination={{ pageSize: 20, showSizeChanger: true }} size="small" scroll={{ x: 750 }}
                columns={[
                    { title: "Date", dataIndex: "date", width: 110, render: (d: string) => dayjs(d).format("DD MMM YYYY") },
                    { title: "Type", dataIndex: "type", width: 110, render: (v: string) => <Tag color={TXN_COLORS[v] || "default"} style={{ fontSize: 10 }}>{v}</Tag> },
                    { title: "Reference", dataIndex: "reference", width: 120 },
                    { title: "Description", dataIndex: "description", ellipsis: true },
                    { title: "Debit", dataIndex: "debit", width: 110, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#cf1322" }}>{fmt(v)}</Text> : "—" },
                    { title: "Credit", dataIndex: "credit", width: 110, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> : "—" },
                    { title: "Balance", dataIndex: "balance", width: 120, align: "right" as const, render: (v: number) => <Text strong style={{ color: v > 0 ? "#fa8c16" : "#389e0d" }}>{fmt(Math.abs(v))}</Text> },
                ]}
            />
        </>
    );
};

// ── 10. AR Aging ──────────────────────────────────────────────────────────────
export const ARAgingTable: React.FC<{ data: ARAgingResponse }> = ({ data }) => (
    <>
        <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}><Card size="small" bordered style={{ background: "#fff2f0" }}><Statistic title="Total AR Outstanding" value={data.summary.grand_total || 0} precision={2} prefix="KES" valueStyle={{ color: "#cf1322", fontSize: 18, fontWeight: 700 }} /></Card></Col>
            <Col span={8}><Card size="small" bordered><Statistic title="Customers with Outstanding" value={data.total_customers_with_outstanding} valueStyle={{ fontSize: 20 }} /></Card></Col>
            <Col span={8}><Card size="small" bordered><Text type="secondary" style={{ fontSize: 12, display: "block" }}>As of</Text><Text strong style={{ fontSize: 16 }}>{dayjs(data.as_of).format("DD MMM YYYY")}</Text></Card></Col>
        </Row>
        {data.customers.map((cust) => (
            <div key={cust.customer_id} style={{ marginBottom: 24 }}>
                <Space style={{ marginBottom: 6 }}>
                    <Text strong>{cust.customer_name}</Text>
                    {cust.email && <Text type="secondary" style={{ fontSize: 12 }}>{cust.email}</Text>}
                    <Text strong style={{ color: "#cf1322" }}>KES {fmt(cust.total)}</Text>
                </Space>
                <Table rowKey="invoice_no" dataSource={cust.invoices} pagination={false} size="small" scroll={{ x: 700 }}
                    columns={[
                        { title: "Invoice No.", dataIndex: "invoice_no", width: 130, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
                        { title: "Issue Date", dataIndex: "issue_date", width: 110, render: (d: string) => dayjs(d).format("DD MMM YYYY") },
                        { title: "Due Date", dataIndex: "due_date", width: 110, render: (d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—" },
                        { title: "Amount", dataIndex: "grand_total", width: 110, align: "right" as const, render: (v: number) => fmt(v) },
                        { title: "Paid", dataIndex: "amount_paid", width: 110, align: "right" as const, render: (v: number) => <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> },
                        { title: "Balance Due", dataIndex: "amount_due", width: 120, align: "right" as const, render: (v: number) => <Text strong style={{ color: "#cf1322" }}>{fmt(v)}</Text> },
                        { title: "Days Overdue", dataIndex: "days_overdue", width: 110, align: "right" as const, render: (v: number) => <Tag color={v > 90 ? "red" : v > 30 ? "orange" : "default"}>{v}d</Tag> },
                        { title: "Bucket", dataIndex: "bucket", width: 90, render: (v: string) => <Tag style={{ fontSize: 10 }}>{v}</Tag> },
                    ]}
                />
            </div>
        ))}
    </>
);

// ── 11. AP Aging ──────────────────────────────────────────────────────────────
export const APAgingTable: React.FC<{ data: APAgingResponse }> = ({ data }) => (
    <>
        <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}><Card size="small" bordered style={{ background: "#fff7e6" }}><Statistic title="Total AP Outstanding" value={data.summary.grand_total || 0} precision={2} prefix="KES" valueStyle={{ color: "#fa8c16", fontSize: 18, fontWeight: 700 }} /></Card></Col>
            <Col span={8}><Card size="small" bordered><Statistic title="Suppliers with Outstanding" value={data.total_suppliers_with_outstanding} valueStyle={{ fontSize: 20 }} /></Card></Col>
            <Col span={8}><Card size="small" bordered><Text type="secondary" style={{ fontSize: 12, display: "block" }}>As of</Text><Text strong style={{ fontSize: 16 }}>{dayjs(data.as_of).format("DD MMM YYYY")}</Text></Card></Col>
        </Row>
        {data.suppliers.map((sup) => (
            <div key={sup.supplier_id} style={{ marginBottom: 24 }}>
                <Space style={{ marginBottom: 6 }}>
                    <Text strong>{sup.supplier_name}</Text>
                    {sup.email && <Text type="secondary" style={{ fontSize: 12 }}>{sup.email}</Text>}
                    <Text strong style={{ color: "#fa8c16" }}>KES {fmt(sup.total)}</Text>
                </Space>
                <Table rowKey="bill_id" dataSource={sup.bills} pagination={false} size="small" scroll={{ x: 700 }}
                    columns={[
                        { title: "Bill No.", dataIndex: "invoice_no", width: 130, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
                        { title: "Issue Date", dataIndex: "issue_date", width: 110, render: (d: string) => dayjs(d).format("DD MMM YYYY") },
                        { title: "Due Date", dataIndex: "due_date", width: 110, render: (d: string) => d ? dayjs(d).format("DD MMM YYYY") : "—" },
                        { title: "Amount", dataIndex: "grand_total", width: 110, align: "right" as const, render: (v: number) => fmt(v) },
                        { title: "Paid", dataIndex: "amount_paid", width: 110, align: "right" as const, render: (v: number) => <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> },
                        { title: "Balance Due", dataIndex: "amount_due", width: 120, align: "right" as const, render: (v: number) => <Text strong style={{ color: "#fa8c16" }}>{fmt(v)}</Text> },
                        { title: "Days Overdue", dataIndex: "days_overdue", width: 110, align: "right" as const, render: (v: number) => <Tag color={v > 90 ? "red" : v > 30 ? "orange" : "default"}>{v}d</Tag> },
                        { title: "Bucket", dataIndex: "bucket", width: 90, render: (v: string) => <Tag style={{ fontSize: 10 }}>{v}</Tag> },
                    ]}
                />
            </div>
        ))}
    </>
);