import React, { useState } from "react";
import { Alert, Card, Col, Collapse, Row, Space, Statistic, Table, Tag, Tooltip, Typography, Button } from "antd";
import { CheckCircleOutlined, WarningOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
    StatementVerifyResult,
    StatementGapReason,
    LedgerGapReason,
} from "@services/accounting/accounts";
import JournalEntryDetailDrawer from "../JournalEntry/JournalEntryDetailDrawer";

const { Text } = Typography;

// Result of verifying an account's ledger against an uploaded bank statement:
// the balance gap, what explains it, and the rows behind each part.

const fmt = (v: number | null | undefined) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmt(Math.abs(v))}`;
const fmtDate = (v: string) => (dayjs(v).isValid() ? dayjs(v).format("DD MMM YYYY") : v);
const isZero = (v: number | null | undefined) => Math.abs(v || 0) < 0.01;

const STATEMENT_GAP: Record<StatementGapReason, { label: string; color: string; hint: string }> = {
    not_imported: {
        label: "Not imported",
        color: "red",
        hint: "This row was never imported for this account — import it, then categorize and complete it",
    },
    imported_not_completed: {
        label: "Imported, not completed",
        color: "orange",
        hint: "It's in a bank import but not completed yet — categorize and complete it in Review Transactions",
    },
    excluded: {
        label: "Excluded",
        color: "default",
        hint: "It was excluded in Review Transactions, so it was never posted — restore it if it's real",
    },
    completed_entry_elsewhere: {
        label: "Completed, entry missing",
        color: "volcano",
        hint: "Marked completed, but no matching entry is on this account — run Check Journal Entries in Review Transactions",
    },
};

const LEDGER_GAP: Record<LedgerGapReason, { label: string; color: string; hint: string }> = {
    possible_duplicate: {
        label: "Possible duplicate",
        color: "red",
        hint: "Another entry has the same amount within a few days — one of them may be posted twice",
    },
    not_on_this_statement: {
        label: "Bank import, not on statement",
        color: "orange",
        hint: "Came from a bank import, but this statement doesn't have it — check the import's account and dates",
    },
    booked_directly: {
        label: "Booked directly",
        color: "gold",
        hint: "Posted from another source (journal, invoice, sale, payment…) — the bank never showed it, or it was booked to the wrong account",
    },
};

interface Props {
    result: StatementVerifyResult;
    /** Called after the books change (an entry edited from here) */
    onChanged?: () => void;
}

const LedgerStatementResult: React.FC<Props> = ({ result, onChanged }) => {
    const [viewEntryId, setViewEntryId] = useState<string | null>(null);
    const { counts, balances, explanation } = result;
    const hasBalances = balances.closing_difference !== null;
    const inBalance = hasBalances && isZero(balances.closing_difference);

    const parts: { label: string; value: number; hint: string }[] = [
        {
            label: "Opening balance difference",
            value: explanation.opening_difference || 0,
            hint: `The gap already existed on ${fmtDate(result.period.from)} — the cause is in an earlier period`,
        },
        {
            label: `On the statement, not in the books (${counts.missing_in_ledger})`,
            value: explanation.missing_in_ledger_net,
            hint: "Bank activity the ledger doesn't have yet",
        },
        {
            label: `In the books, not on the statement (${counts.missing_in_statement})`,
            value: explanation.missing_in_statement_net,
            hint: "Ledger entries the bank never showed",
        },
        {
            label: "Matched entries dated outside the statement period",
            value: explanation.period_boundary_net,
            hint: "Same transaction, but the entry date falls before or after the statement's dates",
        },
        ...(explanation.unexplained !== null && !isZero(explanation.unexplained)
            ? [{
                label: "Not explained by the rows",
                value: explanation.unexplained,
                hint: "Check the statement balances you entered, or the account's opening balance",
            }]
            : []),
    ].filter((p) => !isZero(p.value));

    return (
        <Space direction="vertical" style={{ width: "100%" }} size={20}>
            {/* ── Balances ── */}
            <Row gutter={12}>
                <Col span={8}>
                    <Card size="small" bordered>
                        <Statistic title="Statement closing" value={balances.statement_closing ?? "—"} precision={2} valueStyle={{ fontSize: 18 }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Opening {balances.statement_opening !== null ? fmt(balances.statement_opening) : "—"}
                        </Text>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" bordered>
                        <Statistic title="Ledger closing (balance sheet)" value={balances.ledger_closing} precision={2} valueStyle={{ fontSize: 18 }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>Opening {fmt(balances.ledger_opening)}</Text>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" bordered>
                        <Statistic
                            title="Difference (statement − ledger)"
                            value={hasBalances ? signed(balances.closing_difference || 0) : "—"}
                            valueStyle={{ fontSize: 18, color: !hasBalances ? undefined : inBalance ? "#52c41a" : "#cf1322" }}
                            prefix={hasBalances ? (inBalance ? <CheckCircleOutlined /> : <WarningOutlined />) : undefined}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {fmtDate(result.period.from)} – {fmtDate(result.period.to)}
                        </Text>
                    </Card>
                </Col>
            </Row>

            {/* ── Why ── */}
            {!hasBalances ? (
                <Alert
                    type="info"
                    showIcon
                    message="No statement balances"
                    description="Go back and map the running balance column, or type the statement's opening and closing balance, to see the balance difference explained."
                />
            ) : inBalance && parts.length === 0 ? (
                <Alert type="success" showIcon message="The ledger agrees with the statement" />
            ) : (
                <Alert
                    type={inBalance ? "info" : "warning"}
                    showIcon
                    message={
                        inBalance
                            ? "The closing balances agree, though some rows differ"
                            : `Why the ledger is ${signed(-(balances.closing_difference || 0))} against the statement`
                    }
                    description={
                        <Space direction="vertical" size={4} style={{ width: "100%" }}>
                            {parts.map((p) => (
                                <Tooltip key={p.label} title={p.hint} placement="left">
                                    <Row justify="space-between" style={{ cursor: "help" }}>
                                        <Text>{p.label}</Text>
                                        <Text strong style={{ color: p.value > 0 ? "#389e0d" : "#cf1322" }}>{signed(p.value)}</Text>
                                    </Row>
                                </Tooltip>
                            ))}
                            <Row justify="space-between" style={{ borderTop: "1px solid #e5e7eb", paddingTop: 4 }}>
                                <Text strong>Statement − ledger</Text>
                                <Text strong>{signed(balances.closing_difference || 0)}</Text>
                            </Row>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                + means the statement is higher than the books. Hover a line for what it means.
                            </Text>
                        </Space>
                    }
                />
            )}

            {/* ── Counts ── */}
            <Row gutter={12}>
                <Col span={6}>
                    <Card size="small"><Statistic title="Statement rows" value={counts.statement} valueStyle={{ fontSize: 16 }} /></Card>
                </Col>
                <Col span={6}>
                    <Card size="small">
                        <Statistic title="Matched" value={counts.matched} valueStyle={{ fontSize: 16, color: "#52c41a" }} />
                        {counts.matched_date_shifted > 0 && (
                            <Text type="secondary" style={{ fontSize: 11 }}>{counts.matched_date_shifted} on a different day</Text>
                        )}
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small"><Statistic title="Not in books" value={counts.missing_in_ledger} valueStyle={{ fontSize: 16, color: counts.missing_in_ledger ? "#cf1322" : undefined }} /></Card>
                </Col>
                <Col span={6}>
                    <Card size="small"><Statistic title="Not on statement" value={counts.missing_in_statement} valueStyle={{ fontSize: 16, color: counts.missing_in_statement ? "#fa8c16" : undefined }} /></Card>
                </Col>
            </Row>

            {/* ── On the statement, not in the books ── */}
            <div>
                <Space style={{ marginBottom: 8 }}>
                    <Text strong>On the statement, not in the books</Text>
                    <Tag color={counts.missing_in_ledger ? "error" : "success"}>{counts.missing_in_ledger}</Tag>
                </Space>
                <Table
                    rowKey={(r) => `stmt-${r.row_index}`}
                    dataSource={result.missing_in_ledger}
                    size="small"
                    pagination={{ pageSize: 10, hideOnSinglePage: true }}
                    scroll={{ x: 760 }}
                    locale={{ emptyText: "Every statement row is in the books" }}
                    columns={[
                        { title: "Date", dataIndex: "transaction_date", width: 110, render: fmtDate },
                        { title: "Description", dataIndex: "description", ellipsis: true },
                        { title: "Money out", dataIndex: "debit", width: 110, align: "right" as const, render: (v: number) => (v > 0 ? <Text type="danger">{fmt(v)}</Text> : <Text type="secondary">—</Text>) },
                        { title: "Money in", dataIndex: "credit", width: 110, align: "right" as const, render: (v: number) => (v > 0 ? <Text type="success">{fmt(v)}</Text> : <Text type="secondary">—</Text>) },
                        {
                            title: "Why",
                            dataIndex: "reason",
                            width: 200,
                            render: (r: StatementGapReason, row) => (
                                <Tooltip title={STATEMENT_GAP[r]?.hint}>
                                    <Space direction="vertical" size={0}>
                                        <Tag color={STATEMENT_GAP[r]?.color} style={{ margin: 0 }}>{STATEMENT_GAP[r]?.label || r}</Tag>
                                        {row.import_no && <Text type="secondary" style={{ fontSize: 11 }}>{row.import_no}</Text>}
                                    </Space>
                                </Tooltip>
                            ),
                        },
                    ]}
                />
            </div>

            {/* ── In the books, not on the statement ── */}
            <div>
                <Space style={{ marginBottom: 8 }}>
                    <Text strong>In the books, not on the statement</Text>
                    <Tag color={counts.missing_in_statement ? "warning" : "success"}>{counts.missing_in_statement}</Tag>
                </Space>
                <Table
                    rowKey={(r) => String(r.entry_id)}
                    dataSource={result.missing_in_statement}
                    size="small"
                    pagination={{ pageSize: 10, hideOnSinglePage: true }}
                    scroll={{ x: 860 }}
                    locale={{ emptyText: "Every ledger entry in the period is on the statement" }}
                    columns={[
                        { title: "Date", dataIndex: "entry_date", width: 110, render: fmtDate },
                        { title: "Entry", dataIndex: "entry_no", width: 120, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
                        { title: "Description", dataIndex: "description", ellipsis: true },
                        { title: "Source", dataIndex: "source", width: 110, render: (s: string) => <Tag style={{ fontSize: 11 }}>{(s || "").replace(/_/g, " ").toUpperCase()}</Tag> },
                        { title: "Money out", dataIndex: "money_out", width: 105, align: "right" as const, render: (v: number) => (v > 0 ? <Text type="danger">{fmt(v)}</Text> : <Text type="secondary">—</Text>) },
                        { title: "Money in", dataIndex: "money_in", width: 105, align: "right" as const, render: (v: number) => (v > 0 ? <Text type="success">{fmt(v)}</Text> : <Text type="secondary">—</Text>) },
                        {
                            title: "Why",
                            dataIndex: "reason",
                            width: 170,
                            render: (r: LedgerGapReason, row) => (
                                <Tooltip title={`${LEDGER_GAP[r]?.hint}${row.twin_entry_no ? ` (${row.twin_entry_no})` : ""}`}>
                                    <Tag color={LEDGER_GAP[r]?.color}>{LEDGER_GAP[r]?.label || r}</Tag>
                                </Tooltip>
                            ),
                        },
                        {
                            title: "",
                            key: "view",
                            width: 44,
                            render: (_: unknown, row) => (
                                <Tooltip title="View journal entry">
                                    <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setViewEntryId(String(row.entry_id))} />
                                </Tooltip>
                            ),
                        },
                    ]}
                />
            </div>

            {/* ── Matched on a different day ── */}
            {result.date_shifted.length > 0 && (
                <Collapse
                    items={[{
                        key: "shifted",
                        label: `${result.date_shifted.length} matched on a different day (within ${result.date_tolerance_days} days)`,
                        children: (
                            <Table
                                rowKey={(r) => `${r.entry_id}-${r.transaction_date}`}
                                dataSource={result.date_shifted}
                                size="small"
                                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                                columns={[
                                    { title: "Statement date", dataIndex: "transaction_date", width: 120, render: fmtDate },
                                    { title: "Entry date", dataIndex: "entry_date", width: 120, render: (v: string, r) => (
                                        <Space size={4}>
                                            {fmtDate(v)}
                                            {r.outside_period && <Tooltip title="Outside the statement period — part of the balance difference"><Tag color="orange" style={{ margin: 0 }}>outside</Tag></Tooltip>}
                                        </Space>
                                    ) },
                                    { title: "Description", dataIndex: "description", ellipsis: true },
                                    { title: "Amount", key: "amt", width: 110, align: "right" as const, render: (_: unknown, r) => fmt(r.debit || r.credit) },
                                    { title: "Entry", dataIndex: "entry_no", width: 120, render: (v: string, r) => (
                                        <Button size="small" type="link" style={{ padding: 0 }} onClick={() => setViewEntryId(String(r.entry_id))}>{v}</Button>
                                    ) },
                                ]}
                            />
                        ),
                    }]}
                />
            )}

            <JournalEntryDetailDrawer
                open={!!viewEntryId}
                entryId={viewEntryId}
                onClose={() => setViewEntryId(null)}
                onSuccess={() => onChanged?.()}
            />
        </Space>
    );
};

export default LedgerStatementResult;
