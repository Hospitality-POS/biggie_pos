import React, { useState } from "react";
import { Button, Space, Tooltip, Typography } from "antd";
import {
    ThunderboltOutlined, CheckOutlined, PlusCircleOutlined, WarningOutlined, CloseOutlined, RightOutlined,
} from "@ant-design/icons";
import type { AssistPattern, ImportAssist } from "@services/accounting/bankStatementImport";

const { Text } = Typography;

export type AssistTab = "suggestions" | "patterns" | "watchouts";

interface Props {
    assist?: ImportAssist;
    readOnly?: boolean;
    busy?: string | null;
    /** Categorize every suggestion that is 80%+ sure */
    onAcceptSure: () => void;
    onCreateRule: (p: AssistPattern) => void;
    onOpen: (tab: AssistTab) => void;
}

const Nudge: React.FC<{
    icon: React.ReactNode;
    color: string;
    children: React.ReactNode;
    actions: React.ReactNode;
    onDismiss: () => void;
}> = ({ icon, color, children, actions, onDismiss }) => (
    <div
        style={{
            flex: "1 1 260px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 10px",
            background: "#fff",
            border: `1px solid ${color}40`,
            borderLeft: `3px solid ${color}`,
            borderRadius: 8,
            minWidth: 0,
        }}
    >
        <span style={{ color, fontSize: 16, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4 }}>{children}</div>
        <Space size={4} style={{ flexShrink: 0 }}>
            {actions}
            <Tooltip title="Hide">
                <Button size="small" type="text" icon={<CloseOutlined style={{ fontSize: 10 }} />} onClick={onDismiss} />
            </Tooltip>
        </Space>
    </div>
);

/**
 * Smart Assist nudges shown right on the review screen — no need to open
 * anything: lines it can categorize from history, a payee worth a rule, and
 * lines that look off. Each nudge has its action; "Review" opens the detail.
 */
const SmartAssistBar: React.FC<Props> = ({ assist, readOnly, busy, onAcceptSure, onCreateRule, onOpen }) => {
    const [hidden, setHidden] = useState<Set<string>>(new Set());
    if (!assist) return null;

    const sure = assist.suggestions.filter((s) => s.confidence >= 80);
    const others = assist.suggestions.length - sure.length;
    // The payee most worth a rule: has lines waiting here, then the most frequent
    const rulePattern = assist.patterns.find((p) => p.suggested_rule && p.uncategorized_here > 0) ?? assist.patterns.find((p) => p.suggested_rule);
    const watchouts = assist.watchouts;
    const hide = (k: string) => setHidden((h) => new Set(h).add(k));

    const nudges: React.ReactNode[] = [];

    if (assist.suggestions.length && !hidden.has("suggest")) {
        nudges.push(
            <Nudge
                key="suggest"
                icon={<ThunderboltOutlined />}
                color="#722ed1"
                onDismiss={() => hide("suggest")}
                actions={
                    <>
                        {!readOnly && sure.length > 0 && (
                            <Button size="small" type="primary" icon={<CheckOutlined />} loading={busy === "sure"} onClick={onAcceptSure}
                                style={{ background: "#722ed1", borderColor: "#722ed1" }}>
                                Accept {sure.length}
                            </Button>
                        )}
                        <Button size="small" onClick={() => onOpen("suggestions")}>Review</Button>
                    </>
                }
            >
                <Text strong style={{ fontSize: 12.5 }}>
                    {sure.length
                        ? `${sure.length} line${sure.length === 1 ? "" : "s"} match how you categorized before`
                        : `${assist.suggestions.length} suggestion${assist.suggestions.length === 1 ? "" : "s"} ready`}
                </Text>
                <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                    {others > 0 ? `${others} more to check · ` : ""}
                    {assist.summary.without_history > 0
                        ? `${assist.summary.without_history} new payee${assist.summary.without_history === 1 ? "" : "s"} — the AI can help`
                        : "Suggested accounts show in the table"}
                </Text>
            </Nudge>
        );
    }

    if (rulePattern?.suggested_rule && !hidden.has(`rule-${rulePattern.key}`)) {
        const acc = rulePattern.suggested_rule.actions;
        nudges.push(
            <Nudge
                key="rule"
                icon={<PlusCircleOutlined />}
                color="#1677ff"
                onDismiss={() => hide(`rule-${rulePattern.key}`)}
                actions={
                    <>
                        {!readOnly && (
                            <Button size="small" type="primary" ghost loading={busy === `rule-${rulePattern.key}`} onClick={() => onCreateRule(rulePattern)}>
                                Create rule
                            </Button>
                        )}
                        <Tooltip title="All recurring payees">
                            <Button size="small" icon={<RightOutlined />} onClick={() => onOpen("patterns")} />
                        </Tooltip>
                    </>
                }
            >
                <Text strong style={{ fontSize: 12.5 }}>
                    {rulePattern.label} comes up {rulePattern.cadence ? rulePattern.cadence.label.toLowerCase() : `${rulePattern.count} times`}
                </Text>
                <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                    Always categorize it to {acc.account_code} {acc.account_name}?
                    {rulePattern.uncategorized_here ? ` (${rulePattern.uncategorized_here} waiting here)` : ""}
                </Text>
            </Nudge>
        );
    }

    if (watchouts.length && !hidden.has("watch")) {
        nudges.push(
            <Nudge
                key="watch"
                icon={<WarningOutlined />}
                color={watchouts.some((w) => w.severity === "high") ? "#cf1322" : "#d48806"}
                onDismiss={() => hide("watch")}
                actions={<Button size="small" onClick={() => onOpen("watchouts")}>Review</Button>}
            >
                <Text strong style={{ fontSize: 12.5 }}>
                    {watchouts.length} thing{watchouts.length === 1 ? "" : "s"} look{watchouts.length === 1 ? "s" : ""} off
                </Text>
                <Text type="secondary" ellipsis={{ tooltip: watchouts[0].title }} style={{ fontSize: 12, display: "block" }}>
                    {watchouts[0].title}
                </Text>
            </Nudge>
        );
    }

    if (!nudges.length) return null;
    return <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>{nudges}</div>;
};

export default SmartAssistBar;
