import React, { useMemo } from "react";
import { App, Button, Drawer, Empty, Grid, Skeleton, Tag, Tooltip, Typography } from "antd";
import {
    BulbOutlined,
    CopyOutlined,
    ReloadOutlined,
    RobotOutlined,
    ShopOutlined,
    WarningOutlined,
    RiseOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { ThinkingOrb } from "thinking-orbs";
import { THEME_C } from "@utils/getPrimaryColor";
import { formatCurrency } from "@utils/formatters";
import { type AnalyticsData } from "@services/whatsappService";
import { fetchMarketplaceStats } from "@services/omnichannel/marketplace";

const { Text, Paragraph } = Typography;
const C = THEME_C;

interface Props {
    open: boolean;
    onClose: () => void;
    shopId: string;
    shopName?: string;
    days: number;
    stats?: AnalyticsData;
    loading: boolean;
    refreshing: boolean;
    onRefresh: () => void;
    marketplaceOn: boolean;
}

type InsightKind = "win" | "risk" | "tip";

// Split the AI's free text into bite-size points and tag each one so the
// drawer reads like a briefing rather than a wall of text.
const toPoints = (text: string): { kind: InsightKind; text: string }[] => {
    const lines = String(text || "")
        .replace(/\r/g, "")
        .split(/\n+/)
        .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").replace(/\*\*/g, "").trim())
        .filter((l) => l.length > 2);
    // One long paragraph → split into sentences. Avoids regex lookbehind, which
    // older Safari (< 16.4) can't parse — it breaks the whole bundle on macOS.
    const points = lines.length > 1
        ? lines
        : (lines[0] || "").replace(/([.!?])\s+(?=[A-Z])/g, "$1\n").split("\n").filter(Boolean);
    return points.map((p) => ({
        kind: /\b(slow|drop|declin|low|risk|delay|miss|unanswered|pending|backlog|concern|fail|poor|only)\b/i.test(p)
            ? "risk"
            : /\b(consider|should|recommend|try|improv|could|suggest|focus|add|enable|assign|follow up)\b/i.test(p)
                ? "tip"
                : "win",
        text: p,
    }));
};

const KIND_CFG: Record<InsightKind, { icon: React.ReactNode; color: string; bg: string; border: string; label: string }> = {
    win: { icon: <RiseOutlined />, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Going well" },
    risk: { icon: <WarningOutlined />, color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Watch" },
    tip: { icon: <BulbOutlined />, color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe", label: "Try this" },
};

const formatMinutes = (val?: number | null) => {
    if (val === undefined || val === null) return "--";
    if (val < 1) return `${Math.round(val * 60)}s`;
    if (val < 60) return `${Math.round(val)} min`;
    const h = Math.floor(val / 60);
    const m = Math.round(val % 60);
    return m ? `${h}h ${m}m` : `${h}h`;
};

/**
 * AI Insights as a side drawer, styled after Biashara AI — opened on demand
 * from Analytics instead of always taking space on the page.
 */
const InsightsDrawer: React.FC<Props> = ({
    open,
    onClose,
    shopId,
    shopName,
    days,
    stats,
    loading,
    refreshing,
    onRefresh,
    marketplaceOn,
}) => {
    const { message } = App.useApp();
    const isMobile = !Grid.useBreakpoint().md;

    const { data: mkt } = useQuery({
        queryKey: ["marketplace-stats", shopId, days],
        queryFn: () => fetchMarketplaceStats(shopId, days),
        enabled: open && marketplaceOn && !!shopId,
        staleTime: 30_000,
    });

    const points = useMemo(() => toPoints(stats?.insights || ""), [stats?.insights]);

    // Marketplace highlights computed from the numbers — no extra AI call.
    const mktPoints = useMemo(() => {
        if (!mkt) return [];
        const out: { kind: InsightKind; text: string }[] = [];
        if (mkt.orders === 0) {
            out.push({ kind: "tip", text: "No chat orders yet — add a MENU line to your welcome message and send a WhatsApp promo from the SMS or Email tab." });
            return out;
        }
        out.push({
            kind: "win",
            text: `${mkt.orders} chat order${mkt.orders === 1 ? "" : "s"} worth ${formatCurrency(mkt.revenue)} (avg ${formatCurrency(mkt.average_order_value)}).`,
        });
        if (mkt.top_items[0]) {
            out.push({ kind: "win", text: `Best seller in chat: ${mkt.top_items[0].name} (${mkt.top_items[0].quantity} sold).` });
        }
        const share = Math.round((mkt.assistant.orders / mkt.orders) * 100);
        out.push(
            share >= 50
                ? { kind: "win", text: `The assistant closed ${share}% of chat sales on its own.` }
                : { kind: "tip", text: `Only ${share}% of chat sales were self-serve — send customers the MENU flow from the Sell drawer to save agent time.` }
        );
        const waiting = mkt.active_flows.checkouts + mkt.active_flows.bookings;
        if (waiting > 0) {
            out.push({ kind: "risk", text: `${waiting} customer${waiting === 1 ? " is" : "s are"} mid-checkout or booking right now — check the chat banners in the inbox.` });
        }
        return out;
    }, [mkt]);

    const copyAll = async () => {
        const text = [...points, ...mktPoints].map((p) => `• ${p.text}`).join("\n");
        try {
            await navigator.clipboard.writeText(text);
            message.success("Insights copied");
        } catch {
            message.error("Couldn't copy");
        }
    };

    const header = (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        flexShrink: 0,
                    }}
                >
                    <RobotOutlined style={{ fontSize: 18, color: C.primary }} />
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Text strong style={{ fontSize: 15, color: "#0f172a", whiteSpace: "nowrap" }}>
                            AI Insights
                        </Text>
                        <Tag
                            style={{
                                fontSize: 9,
                                lineHeight: "15px",
                                padding: "0 5px",
                                borderRadius: 4,
                                fontWeight: 700,
                                margin: 0,
                                textTransform: "uppercase",
                                background: "#eef2ff",
                                borderColor: "#c7d2fe",
                                color: "#4f46e5",
                            }}
                        >
                            Last {days} days
                        </Tag>
                    </div>
                    <Text ellipsis style={{ fontSize: 11, color: "#64748b", display: "block" }}>
                        Omnichannel advisor for {shopName || "your store"}
                    </Text>
                </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <Tooltip title="Copy insights">
                    <Button size="small" type="text" icon={<CopyOutlined style={{ color: "#94a3b8" }} />} onClick={copyAll} disabled={!points.length} />
                </Tooltip>
                <Tooltip title="Refresh">
                    <Button size="small" type="text" icon={<ReloadOutlined spin={refreshing} style={{ color: "#94a3b8" }} />} onClick={onRefresh} />
                </Tooltip>
                <Button size="small" type="text" onClick={onClose} style={{ color: "#64748b", fontWeight: 600, fontSize: 13 }}>
                    ✕
                </Button>
            </div>
        </div>
    );

    const pointCard = (p: { kind: InsightKind; text: string }, i: number) => {
        const cfg = KIND_CFG[p.kind];
        return (
            <div
                key={i}
                style={{
                    display: "flex",
                    gap: 10,
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "10px 12px",
                    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                }}
            >
                <div
                    style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        color: cfg.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: 12,
                    }}
                >
                    {cfg.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                    <Text style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: 0.4 }}>
                        {cfg.label}
                    </Text>
                    <Paragraph style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "#334155" }}>{p.text}</Paragraph>
                </div>
            </div>
        );
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={isMobile ? "100%" : 480}
            closeIcon={null}
            title={header}
            styles={{
                body: { padding: 0, display: "flex", flexDirection: "column", height: "100%", background: "#f8fafc" },
                header: { padding: "12px 16px", background: "#ffffff", borderBottom: "1px solid #eef2f6" },
            }}
        >
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                {/* Hero */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 16 }}>
                    <div
                        style={{
                            width: 76,
                            height: 76,
                            borderRadius: 20,
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 10,
                            boxShadow: "0 8px 24px -4px rgba(15,23,42,0.06), 0 2px 6px -1px rgba(15,23,42,0.04)",
                        }}
                    >
                        <ThinkingOrb size={64} state={loading || refreshing ? "weaving" : "breathing"} theme="light" />
                    </div>
                    <Text strong style={{ fontSize: 15, color: "#0f172a" }}>
                        {loading || refreshing ? "Reading your conversations…" : "Here's what stands out"}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#64748b" }}>
                        Based on your WhatsApp inbox over the last {days} days
                    </Text>
                </div>

                {/* The numbers the insights are based on */}
                {stats && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
                        {[
                            { label: "Conversations", value: stats.totalConversations },
                            { label: "Resolved", value: `${stats.resolutionRate || 0}%` },
                            { label: "1st response", value: formatMinutes(stats.averageFirstResponseMinutes) },
                        ].map((s) => (
                            <div
                                key={s.label}
                                style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}
                            >
                                <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{s.value}</div>
                                <Text style={{ fontSize: 10.5, color: "#64748b" }}>{s.label}</Text>
                            </div>
                        ))}
                    </div>
                )}

                {loading || refreshing ? (
                    <Skeleton active paragraph={{ rows: 6 }} />
                ) : points.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{points.map(pointCard)}</div>
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No insights yet — they appear once you have some conversations" />
                )}

                {marketplaceOn && mktPoints.length > 0 && !loading && (
                    <div style={{ marginTop: 18 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                            <ShopOutlined style={{ color: "#16a34a" }} />
                            <Text strong style={{ fontSize: 12, color: "#0f172a" }}>WhatsApp Marketplace</Text>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{mktPoints.map(pointCard)}</div>
                    </div>
                )}
            </div>

            <div style={{ padding: "10px 16px", background: "#fff", borderTop: "1px solid #eef2f6", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 11, color: "#94a3b8" }}>AI-generated — check before acting on it.</Text>
                <Button size="small" icon={<ReloadOutlined />} loading={refreshing} onClick={onRefresh}>
                    Regenerate
                </Button>
            </div>
        </Drawer>
    );
};

export default InsightsDrawer;
