import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Alert, Badge, Button, Drawer, Empty, Popconfirm, Progress, Segmented, Space, Spin, Tabs, Tag, Tooltip, Typography,
} from "antd";
import {
    BulbOutlined, CheckOutlined, CloseOutlined, ThunderboltOutlined, SyncOutlined, RobotOutlined, HistoryOutlined,
    WarningOutlined, CopyOutlined, ClockCircleOutlined, StopOutlined, PlusCircleOutlined, SafetyCertificateOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
    getImportAssist,
    categorizeTransaction,
    bulkCategorize,
    createCategorizationRule,
    reApplyRules,
    excludeTransaction,
    type AssistSuggestion,
    type AssistPattern,
    type AssistWatchout,
} from "@services/accounting/bankStatementImport";

const { Text } = Typography;

const fmt = (n: number) => (n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const confidenceColor = (c: number) => (c >= 80 ? "#389e0d" : c >= 60 ? "#d48806" : "#8c8c8c");

interface Props {
    open: boolean;
    /** Tab to show when opened from a nudge or a row flag */
    initialTab?: "suggestions" | "patterns" | "watchouts";
    onClose: () => void;
    importId?: string;
    shopId: string;
    /** The statement's bank account — new rules apply to it only */
    bankAccountId: string;
    /** Locked imports (voided / fully completed) can't be changed */
    readOnly?: boolean;
    onChanged: () => void;
}

/**
 * Smart Assist for one bank statement import: learns from how this bank
 * account's lines were categorized before and suggests accounts, spots
 * recurring payees (and turns them into rules), and flags lines that look off.
 */
const SmartAssistDrawer: React.FC<Props> = ({ open, initialTab = "suggestions", onClose, importId, shopId, bankAccountId, readOnly, onChanged }) => {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<string>(initialTab);
    useEffect(() => {
        if (open) setTab(initialTab);
    }, [open, initialTab]);
    const [useAi, setUseAi] = useState(false);
    const [minConfidence, setMinConfidence] = useState<number>(0);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState<string | null>(null);

    const { data, isFetching, refetch } = useQuery({
        queryKey: ["import-assist", importId, useAi],
        queryFn: () => getImportAssist(importId!, { ai: useAi }),
        enabled: open && !!importId,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
    });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ["import-detail", importId] });
        queryClient.invalidateQueries({ queryKey: ["import-assist", importId] });
        onChanged();
    };

    const suggestions = useMemo(
        () => (data?.suggestions ?? []).filter((s) => !dismissed.has(s.txn_id) && s.confidence >= minConfidence),
        [data, dismissed, minConfidence]
    );

    const accept = async (s: AssistSuggestion) => {
        setBusy(s.txn_id);
        try {
            await categorizeTransaction(importId!, s.txn_id, {
                account_id: s.account_id,
                account_code: s.account_code,
                account_name: s.account_name,
            });
            setDismissed((d) => new Set(d).add(s.txn_id));
            refresh();
        } finally {
            setBusy(null);
        }
    };

    // One call per account: bulk categorize assigns a single account
    const acceptAll = async () => {
        setBusy("all");
        try {
            const byAccount = new Map<string, string[]>();
            for (const s of suggestions) byAccount.set(s.account_id, [...(byAccount.get(s.account_id) ?? []), s.txn_id]);
            for (const [account_id, txn_ids] of byAccount) {
                const s = suggestions.find((x) => x.account_id === account_id);
                await bulkCategorize(importId!, { account_id, account_code: s?.account_code, account_name: s?.account_name, txn_ids });
            }
            setDismissed((d) => new Set([...d, ...suggestions.map((s) => s.txn_id)]));
            refresh();
        } finally {
            setBusy(null);
        }
    };

    const createRule = async (p: AssistPattern) => {
        if (!p.suggested_rule) return;
        setBusy(`rule-${p.key}`);
        try {
            await createCategorizationRule({
                shop_id: shopId,
                name: p.suggested_rule.name,
                is_active: true,
                match_type: p.suggested_rule.match_type,
                conditions: p.suggested_rule.conditions,
                actions: p.suggested_rule.actions,
                apply_to: p.suggested_rule.apply_to,
                transaction_handling: "recognized",
                auto_categorize: true,
                associate_accounts: "custom",
                associated_account_id: [bankAccountId],
            });
            // Categorize the matching lines in this statement straight away
            if (!readOnly) await reApplyRules(importId!, { reset_categorized: false });
            refresh();
        } finally {
            setBusy(null);
        }
    };

    const exclude = async (w: AssistWatchout) => {
        if (!w.txn_id) return;
        setBusy(`w-${w.txn_id}`);
        try {
            await excludeTransaction(importId!, w.txn_id);
            refresh();
        } finally {
            setBusy(null);
        }
    };

    const summary = data?.summary;

    // ── Suggestions tab ──────────────────────────────────────────────────────
    const suggestionsTab = (
        <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <Segmented
                    size="small"
                    value={minConfidence}
                    onChange={(v) => setMinConfidence(Number(v))}
                    options={[
                        { label: "All", value: 0 },
                        { label: "Sure (80%+)", value: 80 },
                        { label: "Likely (60%+)", value: 60 },
                    ]}
                />
                <div style={{ flex: 1 }} />
                {!readOnly && suggestions.length > 0 && (
                    <Popconfirm
                        title={`Categorize ${suggestions.length} line${suggestions.length === 1 ? "" : "s"} as suggested?`}
                        description="You can still change any of them afterwards."
                        onConfirm={acceptAll}
                        okText="Accept all"
                    >
                        <Button type="primary" size="small" icon={<CheckOutlined />} loading={busy === "all"}>
                            Accept {suggestions.length} shown
                        </Button>
                    </Popconfirm>
                )}
            </div>

            {summary && summary.without_history > 0 && (
                <Alert
                    type="info"
                    showIcon
                    icon={<RobotOutlined />}
                    style={{ marginBottom: 12 }}
                    message={`${summary.without_history} line${summary.without_history === 1 ? " has" : "s have"} no similar history yet`}
                    description={
                        data?.ai.available
                            ? "Ask the AI to suggest accounts for them from your chart of accounts. AI suggestions are marked and capped at 70% — check them before accepting."
                            : "Categorize them by hand — the assistant learns from it and will suggest the same next time."
                    }
                    action={
                        data?.ai.available && !useAi ? (
                            <Button size="small" icon={<RobotOutlined />} onClick={() => setUseAi(true)}>
                                Ask AI
                            </Button>
                        ) : undefined
                    }
                />
            )}
            {data?.ai.error && <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={data.ai.error} />}

            {suggestions.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={summary?.uncategorized ? "No suggestions at this level" : "Nothing left to categorize 🎉"}
                />
            ) : (
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    {suggestions.map((s) => (
                        <div key={s.txn_id} style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <Typography.Paragraph ellipsis={{ rows: 1, tooltip: s.txn?.description }} style={{ margin: 0, fontSize: 13 }}>
                                        {s.txn?.description}
                                    </Typography.Paragraph>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {s.txn ? dayjs(s.txn.date).format("DD MMM YYYY") : ""}
                                    </Text>
                                </div>
                                <Text strong style={{ color: s.txn?.direction === "debit" ? "#cf1322" : "#389e0d", whiteSpace: "nowrap", fontSize: 13 }}>
                                    {s.txn?.direction === "debit" ? "−" : "+"}{fmt(s.txn?.amount ?? 0)}
                                </Text>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                                <Tag color="blue" style={{ margin: 0 }}>
                                    {s.account_code} {s.account_name}
                                </Tag>
                                <Tooltip title={`${s.confidence}% sure`}>
                                    <Progress
                                        percent={s.confidence}
                                        size="small"
                                        steps={5}
                                        strokeColor={confidenceColor(s.confidence)}
                                        format={(p) => <span style={{ fontSize: 11 }}>{p}%</span>}
                                        style={{ margin: 0 }}
                                    />
                                </Tooltip>
                                {s.source === "ai" ? (
                                    <Tooltip title={s.reason || "Suggested by the AI"}>
                                        <Tag icon={<RobotOutlined />} color="purple" style={{ margin: 0 }}>AI</Tag>
                                    </Tooltip>
                                ) : (
                                    <Tooltip
                                        title={
                                            <div>
                                                <div style={{ marginBottom: 4 }}>
                                                    Used {s.based_on} time{s.based_on === 1 ? "" : "s"} for similar lines
                                                    {s.disagreeing ? ` (${s.disagreeing} went elsewhere)` : ""}:
                                                </div>
                                                {s.examples.map((e, i) => (
                                                    <div key={i} style={{ fontSize: 11 }}>
                                                        {dayjs(e.date).format("DD MMM YY")} · {e.description} · {fmt(e.amount)}
                                                    </div>
                                                ))}
                                            </div>
                                        }
                                    >
                                        <Tag icon={<HistoryOutlined />} style={{ margin: 0 }}>
                                            {s.based_on} similar
                                        </Tag>
                                    </Tooltip>
                                )}
                                <div style={{ flex: 1 }} />
                                {!readOnly && (
                                    <Space size={4}>
                                        <Tooltip title="Not right — hide this suggestion">
                                            <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => setDismissed((d) => new Set(d).add(s.txn_id))} />
                                        </Tooltip>
                                        <Button size="small" type="primary" ghost icon={<CheckOutlined />} loading={busy === s.txn_id} onClick={() => accept(s)}>
                                            Accept
                                        </Button>
                                    </Space>
                                )}
                            </div>
                        </div>
                    ))}
                </Space>
            )}
        </div>
    );

    // ── Patterns tab ─────────────────────────────────────────────────────────
    const patternsTab = (data?.patterns ?? []).length === 0 ? (
        <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No repeating payees yet — patterns appear once the same payee shows up 3+ times across months."
        />
    ) : (
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {data!.patterns.map((p) => (
                <div key={`${p.direction}-${p.key}`} style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0 }}>
                            <Text strong style={{ fontSize: 13.5 }}>{p.label}</Text>
                            <div style={{ fontSize: 11.5, color: "#8c8c8c" }}>
                                {p.direction === "debit" ? "Money out" : "Money in"} · {p.count} times over {p.months} months
                                {p.cadence ? ` · ${p.cadence.label}` : ""}
                            </div>
                        </div>
                        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <Text strong style={{ color: p.direction === "debit" ? "#cf1322" : "#389e0d" }}>~{fmt(p.typical_amount)}</Text>
                            <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                                {fmt(p.min_amount)} – {fmt(p.max_amount)}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        {p.top_account ? (
                            <Tooltip title={`${p.consistency}% of these went to this account`}>
                                <Tag color="blue" style={{ margin: 0 }}>
                                    {p.top_account.account_code} {p.top_account.account_name} · {p.consistency}%
                                </Tag>
                            </Tooltip>
                        ) : (
                            <Tag style={{ margin: 0 }}>Not categorized yet</Tag>
                        )}
                        {p.uncategorized_here > 0 && (
                            <Tag color="gold" style={{ margin: 0 }}>{p.uncategorized_here} to categorize here</Tag>
                        )}
                        <div style={{ flex: 1 }} />
                        {p.covered_by_rule ? (
                            <Tooltip title={`Rule “${p.covered_by_rule.name}” already categorizes these`}>
                                <Tag icon={<SafetyCertificateOutlined />} color="green" style={{ margin: 0 }}>Rule in place</Tag>
                            </Tooltip>
                        ) : p.suggested_rule ? (
                            <Popconfirm
                                title="Create this rule?"
                                description={
                                    <div style={{ maxWidth: 280, fontSize: 12 }}>
                                        <div><strong>{p.suggested_rule.name}</strong></div>
                                        When a {p.direction === "debit" ? "withdrawal" : "deposit"} on this bank account contains “
                                        {p.suggested_rule.conditions[0]?.value}”, categorize it to {p.suggested_rule.actions.account_code}{" "}
                                        {p.suggested_rule.actions.account_name} — on future imports too.
                                    </div>
                                }
                                onConfirm={() => createRule(p)}
                                okText="Create rule"
                            >
                                <Button size="small" icon={<PlusCircleOutlined />} loading={busy === `rule-${p.key}`}>
                                    Create rule
                                </Button>
                            </Popconfirm>
                        ) : (
                            <Tooltip title="Categorize these the same way a few times and a rule will be suggested">
                                <Tag style={{ margin: 0 }}>Mixed accounts</Tag>
                            </Tooltip>
                        )}
                    </div>
                </div>
            ))}
        </Space>
    );

    // ── Watch-outs tab ───────────────────────────────────────────────────────
    const watchIcon = (w: AssistWatchout) =>
        w.type === "duplicate" ? <CopyOutlined /> : w.type === "missing_recurring" ? <ClockCircleOutlined /> : <WarningOutlined />;
    const watchoutsTab = (data?.watchouts ?? []).length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing unusual in this statement" />
    ) : (
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {data!.watchouts.map((w, i) => (
                <Alert
                    key={`${w.type}-${w.txn_id ?? i}`}
                    type={w.severity === "high" ? "error" : "warning"}
                    showIcon
                    icon={watchIcon(w)}
                    message={w.title}
                    description={w.detail}
                    action={
                        w.type === "duplicate" && w.txn_id && !readOnly ? (
                            <Popconfirm title="Exclude this line?" description="It stays in the import but won't be posted." onConfirm={() => exclude(w)} okText="Exclude">
                                <Button size="small" danger icon={<StopOutlined />} loading={busy === `w-${w.txn_id}`}>
                                    Exclude
                                </Button>
                            </Popconfirm>
                        ) : undefined
                    }
                />
            ))}
        </Space>
    );

    const stat = (label: string, value: React.ReactNode, color: string) => (
        <div style={{ flex: "1 1 110px", background: `${color}0d`, border: `1px solid ${color}33`, borderRadius: 8, padding: "8px 10px" }}>
            <Text style={{ fontSize: 11, color: "#8c8c8c", display: "block" }}>{label}</Text>
            <Text strong style={{ fontSize: 18, color }}>{value}</Text>
        </div>
    );

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={640}
            destroyOnClose
            title={
                <Space>
                    <ThunderboltOutlined style={{ color: "#722ed1" }} />
                    <span>Smart Assist</span>
                </Space>
            }
            extra={
                <Button size="small" icon={<SyncOutlined spin={isFetching} />} onClick={() => refetch()}>
                    Refresh
                </Button>
            }
        >
            {!data ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
                    <Spin tip={useAi ? "Asking the AI…" : "Looking at your history…"} />
                </div>
            ) : (
                <>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                        <BulbOutlined /> Learns from {summary!.history_lines.toLocaleString()} earlier line
                        {summary!.history_lines === 1 ? "" : "s"} on this bank account — the more you categorize, the better it gets.
                    </Text>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                        {stat("Suggestions", `${summary!.suggested}/${summary!.uncategorized}`, "#1677ff")}
                        {stat("Sure (80%+)", summary!.high_confidence, "#389e0d")}
                        {stat("Rules to create", summary!.rules_to_create, "#722ed1")}
                        {stat("Watch-outs", summary!.watchouts, summary!.watchouts ? "#cf1322" : "#8c8c8c")}
                    </div>
                    <Spin spinning={isFetching}>
                        <Tabs
                            activeKey={tab}
                            onChange={setTab}
                            items={[
                                {
                                    key: "suggestions",
                                    label: <Badge count={suggestions.length} size="small" offset={[8, -2]}>Suggestions</Badge>,
                                    children: suggestionsTab,
                                },
                                {
                                    key: "patterns",
                                    label: <Badge count={summary!.rules_to_create} size="small" offset={[8, -2]} color="#722ed1">Recurring</Badge>,
                                    children: patternsTab,
                                },
                                {
                                    key: "watchouts",
                                    label: <Badge count={summary!.watchouts} size="small" offset={[8, -2]}>Watch-outs</Badge>,
                                    children: watchoutsTab,
                                },
                            ]}
                        />
                    </Spin>
                </>
            )}
        </Drawer>
    );
};

export default SmartAssistDrawer;
