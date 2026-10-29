import React, { useState } from "react";
import {
    Alert, Button, Card, Col, Collapse, Row, Space, Switch, Table, Tag, Tooltip, Typography,
} from "antd";
import { CheckCircleOutlined, EyeOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
    StatementVerifyResult,
    StatementVerifyDay,
    StatementTally,
    StatementGapReason,
    LedgerGapReason,
} from "@services/accounting/accounts";
import JournalEntryDetailDrawer from "../JournalEntry/JournalEntryDetailDrawer";

const { Text } = Typography;

// Result of checking an account's ledger against an uploaded bank statement
// for one period: totals to the cent, then day by day — how many transactions
// each side has and which ones don't match.

const fmt = (v: number | null | undefined) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmt(Math.abs(v))}`;
const signedCount = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0");
const fmtDay = (v: string) => (dayjs(v).isValid() ? dayjs(v).format("ddd DD MMM YYYY") : v);
const isZero = (v: number | null | undefined) => Math.abs(v || 0) < 0.005;
const diffColor = (v: number) => (isZero(v) ? "#52c41a" : "#cf1322");

const STATEMENT_GAP: Record<StatementGapReason, { label: string; color: string; hint: string }> = {
    not_imported: { label: "Not imported", color: "red", hint: "Never imported for this account — import it, then categorize and complete it" },
    imported_not_completed: { label: "Imported, not completed", color: "orange", hint: "In a bank import but not completed — categorize and complete it in Review Transactions" },
    excluded: { label: "Excluded", color: "default", hint: "Excluded in Review Transactions, so never posted — restore it if it's real" },
    completed_entry_elsewhere: { label: "Completed, entry missing", color: "volcano", hint: "Marked completed, but no entry this day on this account — run Check Journal Entries in Review Transactions" },
    booked_other_day: { label: "Booked on another day", color: "gold", hint: "The ledger has the same amount on a nearby day — fix the entry's date" },
};

const LEDGER_GAP: Record<LedgerGapReason, { label: string; color: string; hint: string }> = {
    possible_duplicate: { label: "Possible duplicate", color: "red", hint: "Another entry has the same amount on the same day — one may be posted twice" },
    not_on_this_statement: { label: "Bank import, not on statement", color: "orange", hint: "Came from a bank import, but the statement doesn't have it this day" },
    booked_directly: { label: "Booked directly", color: "gold", hint: "Posted from another source (journal, invoice, sale, payment…) — the bank doesn't show it" },
    on_statement_other_day: { label: "On statement another day", color: "gold", hint: "The statement has the same amount on a nearby day — fix the entry's date" },
};

const moneyCell = (v: number, type?: "danger" | "success") =>
    isZero(v) ? <Text type="secondary">—</Text> : <Text type={type}>{fmt(v)}</Text>;

interface Props {
    result: StatementVerifyResult;
    /** Called after the books change (an entry edited from here) */
    onChanged?: () => void;
}

const LedgerStatementResult: React.FC<Props> = ({ result, onChanged }) => {
    const [viewEntryId, setViewEntryId] = useState<string | null>(null);
    const [onlyDiffering, setOnlyDiffering] = useState(true);
    const { totals, balances, explanation } = result;

    const dayDiffers = (d: StatementVerifyDay) => d.missing_in_ledger > 0 || d.missing_in_statement > 0;
    const differingDays = result.by_day.filter(dayDiffers);
    const days = onlyDiffering ? differingDays : result.by_day;
    const allMatch = differingDays.length === 0;

    // ── Period totals: statement, ledger, difference ──
    const totalRows: (StatementTally & { key: string; label: React.ReactNode })[] = [
        { key: "s", label: "Bank statement", ...totals.statement },
        { key: "l", label: "Ledger (books)", ...totals.ledger },
        {
            key: "d",
            label: <Text strong>Difference (statement − ledger)</Text>,
            count: totals.statement.count - totals.ledger.count,
            money_in: totals.statement.money_in - totals.ledger.money_in,
            money_out: totals.statement.money_out - totals.ledger.money_out,
            net: totals.statement.net - totals.ledger.net,
        },
        { key: "mil", label: "On statement, not in ledger", ...totals.missing_in_ledger },
        { key: "mis", label: "In ledger, not on statement", ...totals.missing_in_statement },
    ];

    const ledgerGapTable = (rows: StatementVerifyResult["missing_in_statement"], showDay: boolean) => (
        <Table
            rowKey={(r) => String(r.entry_id)}
            dataSource={rows}
            size="small"
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            scroll={{ x: 820 }}
            locale={{ emptyText: "Every ledger entry is on the statement" }}
            columns={[
                ...(showDay ? [{ title: "Date", dataIndex: "day", width: 120, render: fmtDay }] : []),
                { title: "Entry", dataIndex: "entry_no", width: 120, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
                { title: "Description", dataIndex: "description", ellipsis: true },
                { title: "Source", dataIndex: "source", width: 110, render: (s: string) => <Tag style={{ fontSize: 11 }}>{(s || "").replace(/_/g, " ").toUpperCase()}</Tag> },
                { title: "Money out", dataIndex: "money_out", width: 110, align: "right" as const, render: (v: number) => moneyCell(v, "danger") },
                { title: "Money in", dataIndex: "money_in", width: 110, align: "right" as const, render: (v: number) => moneyCell(v, "success") },
                {
                    title: "Why",
                    dataIndex: "reason",
                    width: 180,
                    render: (r: LedgerGapReason, row) => (
                        <Tooltip title={`${LEDGER_GAP[r]?.hint}${row.twin_entry_no ? ` (${row.twin_entry_no})` : ""}${row.other_day ? ` — statement: ${fmtDay(row.other_day)}` : ""}`}>
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
    );

    const statementGapTable = (rows: StatementVerifyResult["missing_in_ledger"], showDay: boolean) => (
        <Table
            rowKey={(r) => `stmt-${r.row_index}`}
            dataSource={rows}
            size="small"
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            scroll={{ x: 760 }}
            locale={{ emptyText: "Every statement row is in the ledger" }}
            columns={[
                ...(showDay ? [{ title: "Date", dataIndex: "day", width: 120, render: fmtDay }] : []),
                { title: "Description", dataIndex: "description", ellipsis: true },
                { title: "Reference", dataIndex: "reference", width: 110, ellipsis: true, render: (v: string) => v || "—" },
                { title: "Money out", dataIndex: "debit", width: 110, align: "right" as const, render: (v: number) => moneyCell(v, "danger") },
                { title: "Money in", dataIndex: "credit", width: 110, align: "right" as const, render: (v: number) => moneyCell(v, "success") },
                {
                    title: "Why",
                    dataIndex: "reason",
                    width: 200,
                    render: (r: StatementGapReason, row) => (
                        <Tooltip title={`${STATEMENT_GAP[r]?.hint}${row.other_day ? ` — ledger: ${fmtDay(row.other_day)}${row.other_entry_no ? ` (${row.other_entry_no})` : ""}` : ""}`}>
                            <Space direction="vertical" size={0}>
                                <Tag color={STATEMENT_GAP[r]?.color} style={{ margin: 0 }}>{STATEMENT_GAP[r]?.label || r}</Tag>
                                {row.import_no && <Text type="secondary" style={{ fontSize: 11 }}>{row.import_no}</Text>}
                            </Space>
                        </Tooltip>
                    ),
                },
            ]}
        />
    );

    return (
        <Space direction="vertical" style={{ width: "100%" }} size={20}>
            {/* ── Headline ── */}
            <Alert
                type={allMatch ? "success" : "warning"}
                showIcon
                icon={allMatch ? <CheckCircleOutlined /> : <WarningOutlined />}
                message={
                    allMatch
                        ? `Every day from ${fmtDay(result.period.from)} to ${fmtDay(result.period.to)} matches`
                        : `${differingDays.length} day${differingDays.length === 1 ? "" : "s"} don't match — ${totals.missing_in_ledger.count} statement row${totals.missing_in_ledger.count === 1 ? "" : "s"} not in the ledger, ${totals.missing_in_statement.count} ledger entr${totals.missing_in_statement.count === 1 ? "y" : "ies"} not on the statement`
                }
                description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {fmtDay(result.period.from)} – {fmtDay(result.period.to)}. Matched on the same day, same amount and direction.
                        {result.statement_rows_outside_period > 0 &&
                            ` ${result.statement_rows_outside_period} statement row${result.statement_rows_outside_period === 1 ? " is" : "s are"} outside this period and ignored.`}
                    </Text>
                }
            />

            {/* ── Period totals ── */}
            <Table
                rowKey="key"
                dataSource={totalRows}
                size="small"
                pagination={false}
                bordered
                rowClassName={(r) => (r.key === "d" ? "ant-table-row-selected" : "")}
                columns={[
                    { title: "Period totals", dataIndex: "label" },
                    {
                        title: "Transactions",
                        dataIndex: "count",
                        width: 110,
                        align: "right" as const,
                        render: (v: number, r) => (r.key === "d" ? <Text strong style={{ color: diffColor(v) }}>{signedCount(v)}</Text> : v),
                    },
                    {
                        title: "Money in",
                        dataIndex: "money_in",
                        width: 140,
                        align: "right" as const,
                        render: (v: number, r) => (r.key === "d" ? <Text strong style={{ color: diffColor(v) }}>{signed(v)}</Text> : fmt(v)),
                    },
                    {
                        title: "Money out",
                        dataIndex: "money_out",
                        width: 140,
                        align: "right" as const,
                        render: (v: number, r) => (r.key === "d" ? <Text strong style={{ color: diffColor(v) }}>{signed(v)}</Text> : fmt(v)),
                    },
                    {
                        title: "Net",
                        dataIndex: "net",
                        width: 140,
                        align: "right" as const,
                        render: (v: number, r) => (r.key === "d" ? <Text strong style={{ color: diffColor(v) }}>{signed(v)}</Text> : signed(v)),
                    },
                ]}
            />

            {/* ── Day by day ── */}
            <div>
                <Space style={{ marginBottom: 8, width: "100%", justifyContent: "space-between" }}>
                    <Text strong>Day by day</Text>
                    <Space size={6}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Only days that don't match</Text>
                        <Switch size="small" checked={onlyDiffering} onChange={setOnlyDiffering} />
                    </Space>
                </Space>
                <Table
                    rowKey="day"
                    dataSource={days}
                    size="small"
                    bordered
                    pagination={{ pageSize: 31, hideOnSinglePage: true }}
                    scroll={{ x: 860 }}
                    locale={{ emptyText: "Every day matches" }}
                    expandable={{
                        rowExpandable: dayDiffers,
                        expandedRowRender: (d) => (
                            <Space direction="vertical" style={{ width: "100%" }} size={12}>
                                {d.missing_in_ledger > 0 && (
                                    <div>
                                        <Text strong style={{ fontSize: 12 }}>On the statement, not in the ledger ({d.missing_in_ledger})</Text>
                                        {statementGapTable(result.missing_in_ledger.filter((r) => r.day === d.day), false)}
                                    </div>
                                )}
                                {d.missing_in_statement > 0 && (
                                    <div>
                                        <Text strong style={{ fontSize: 12 }}>In the ledger, not on the statement ({d.missing_in_statement})</Text>
                                        {ledgerGapTable(result.missing_in_statement.filter((r) => r.day === d.day), false)}
                                    </div>
                                )}
                            </Space>
                        ),
                    }}
                    columns={[
                        { title: "Date", dataIndex: "day", width: 130, render: fmtDay },
                        {
                            title: "Transactions",
                            children: [
                                { title: "Statement", key: "sc", width: 85, align: "right" as const, render: (_: unknown, d: StatementVerifyDay) => d.statement.count },
                                { title: "Ledger", key: "lc", width: 75, align: "right" as const, render: (_: unknown, d: StatementVerifyDay) => d.ledger.count },
                                {
                                    title: "Diff",
                                    key: "cd",
                                    width: 65,
                                    align: "right" as const,
                                    render: (_: unknown, d: StatementVerifyDay) => (
                                        <Text strong style={{ color: diffColor(d.count_difference) }}>{signedCount(d.count_difference)}</Text>
                                    ),
                                },
                            ],
                        },
                        {
                            title: "Net amount",
                            children: [
                                { title: "Statement", key: "sn", width: 120, align: "right" as const, render: (_: unknown, d: StatementVerifyDay) => signed(d.statement.net) },
                                { title: "Ledger", key: "ln", width: 120, align: "right" as const, render: (_: unknown, d: StatementVerifyDay) => signed(d.ledger.net) },
                                {
                                    title: "Diff",
                                    key: "nd",
                                    width: 115,
                                    align: "right" as const,
                                    render: (_: unknown, d: StatementVerifyDay) => (
                                        <Text strong style={{ color: diffColor(d.net_difference) }}>{signed(d.net_difference)}</Text>
                                    ),
                                },
                            ],
                        },
                        {
                            title: "Unmatched",
                            key: "um",
                            width: 150,
                            render: (_: unknown, d: StatementVerifyDay) =>
                                dayDiffers(d) ? (
                                    <Space size={4} wrap>
                                        {d.missing_in_ledger > 0 && (
                                            <Tooltip title="On the statement, not in the ledger">
                                                <Tag color="red" style={{ margin: 0 }}>{d.missing_in_ledger} not in ledger</Tag>
                                            </Tooltip>
                                        )}
                                        {d.missing_in_statement > 0 && (
                                            <Tooltip title="In the ledger, not on the statement">
                                                <Tag color="orange" style={{ margin: 0 }}>{d.missing_in_statement} not on statement</Tag>
                                            </Tooltip>
                                        )}
                                    </Space>
                                ) : (
                                    <Tag color="success" style={{ margin: 0 }}>Matches</Tag>
                                ),
                        },
                    ]}
                />
            </div>

            {/* ── Balances ── */}
            <Card size="small" title="Balances">
                <Row gutter={16}>
                    <Col span={8}>
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Statement</Text>
                        <Text>Opening {balances.statement_opening !== null ? fmt(balances.statement_opening) : "—"}</Text>
                        <br />
                        <Text>Closing {balances.statement_closing !== null ? fmt(balances.statement_closing) : "—"}</Text>
                    </Col>
                    <Col span={8}>
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Ledger (balance sheet)</Text>
                        <Text>Opening {fmt(balances.ledger_opening)}</Text>
                        <br />
                        <Text>Closing {fmt(balances.ledger_closing)}</Text>
                    </Col>
                    <Col span={8}>
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Difference (statement − ledger)</Text>
                        {balances.closing_difference === null ? (
                            <Text type="secondary">Add the statement balances to compare</Text>
                        ) : (
                            <>
                                <Text>Opening <Text strong style={{ color: diffColor(balances.opening_difference || 0) }}>{signed(balances.opening_difference || 0)}</Text></Text>
                                <br />
                                <Text>Closing <Text strong style={{ color: diffColor(balances.closing_difference) }}>{signed(balances.closing_difference)}</Text></Text>
                            </>
                        )}
                    </Col>
                </Row>
                {balances.closing_difference !== null && !isZero(balances.closing_difference) && (
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                        Closing gap = opening gap {signed(explanation.opening_difference || 0)} + not in ledger {signed(explanation.missing_in_ledger_net)} + not on statement {signed(explanation.missing_in_statement_net)}
                        {explanation.unexplained !== null && !isZero(explanation.unexplained) && ` + other ${signed(explanation.unexplained)} (check the balances entered)`}
                    </Text>
                )}
            </Card>

            {/* ── Every unmatched transaction ── */}
            {!allMatch && (
                <Collapse
                    items={[
                        {
                            key: "mil",
                            label: `All statement rows not in the ledger (${totals.missing_in_ledger.count}) — in ${fmt(totals.missing_in_ledger.money_in)} / out ${fmt(totals.missing_in_ledger.money_out)}`,
                            children: statementGapTable(result.missing_in_ledger, true),
                        },
                        {
                            key: "mis",
                            label: `All ledger entries not on the statement (${totals.missing_in_statement.count}) — in ${fmt(totals.missing_in_statement.money_in)} / out ${fmt(totals.missing_in_statement.money_out)}`,
                            children: ledgerGapTable(result.missing_in_statement, true),
                        },
                    ]}
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
