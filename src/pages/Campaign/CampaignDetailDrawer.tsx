import React from "react";
import { Drawer, Skeleton, Tag, Typography } from "antd";
import { CalendarOutlined, NotificationOutlined } from "@ant-design/icons";
import { Campaign, CampaignStatus } from "@services/crm/campaigns";
import { useQuery } from "@tanstack/react-query";
import { getCampaignById } from "@services/crm/campaigns";

const { Text } = Typography;

const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    red: "#ef4444",
    blue: "#3b82f6",
    orange: "#f59e0b",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
} as const;

const STATUS_CFG: Record<CampaignStatus, { color: string; bg: string; border: string }> = {
    draft: { color: C.subText, bg: C.bg, border: C.border },
    scheduled: { color: C.blue, bg: "#eff6ff", border: "#bfdbfe" },
    active: { color: C.green, bg: "#f0fdf4", border: "#bbf7d0" },
    paused: { color: C.orange, bg: "#fffbeb", border: "#fed7aa" },
    completed: { color: "#8b5cf6", bg: "#faf5ff", border: "#e9d5ff" },
    cancelled: { color: C.red, bg: "#fef2f2", border: "#fecaca" },
};

interface CampaignDetailDrawerProps {
    open: boolean;
    onClose: () => void;
    campaign: Campaign | null;
}

export const CampaignDetailDrawer: React.FC<CampaignDetailDrawerProps> = ({
    open, onClose, campaign,
}) => {
    // Fetch full detail (targets + budgets + lead_stats) when drawer opens
    const shop_id = JSON.parse(localStorage.getItem("shop") || "{}")?._id || "";
    const { data: full, isLoading } = useQuery({
        queryKey: ["campaign-detail", campaign?._id],
        queryFn: () => getCampaignById(campaign!._id, shop_id),
        enabled: open && !!campaign?._id,
        staleTime: 30_000,
    });

    const c = full ?? campaign;
    if (!c) return null;

    const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.draft;
    const roi = c.actual_spend && c.actual_spend > 0
        ? (((c.actual_revenue ?? 0) - c.actual_spend) / c.actual_spend * 100).toFixed(1)
        : null;

    return (
        <Drawer
            open={open}
            onClose={onClose}
            placement="right"
            width="min(560px, 98vw)"
            destroyOnClose
            styles={{ body: { padding: "16px 20px", background: C.bg } }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
                        <NotificationOutlined />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 14, display: "block" }}>{c.name}</Text>
                        <Tag style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 10, borderRadius: 8 }}>
                            {c.status.toUpperCase()}
                        </Tag>
                    </div>
                </div>
            }
        >
            {isLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : (
                <>
                    {/* KPI row */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                        {[
                            { title: "Budget", value: c.budget ? `KES ${c.budget.toLocaleString()}` : "—" },
                            { title: "Spend", value: c.actual_spend ? `KES ${c.actual_spend.toLocaleString()}` : "—" },
                            { title: "Leads", value: c.actual_leads ?? 0 },
                            { title: "Conversions", value: c.actual_conversions ?? 0 },
                            { title: "Revenue", value: c.actual_revenue ? `KES ${c.actual_revenue.toLocaleString()}` : "—" },
                            { title: "ROI", value: roi ? `${roi}%` : "—" },
                        ].map(k => (
                            <div key={k.title} style={{ flex: "1 1 130px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                                <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>{k.title}</Text>
                                <Text strong style={{ fontSize: 15, color: C.darkText }}>{k.value}</Text>
                            </div>
                        ))}
                    </div>

                    {/* Details */}
                    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                        {c.start_date && (
                            <div style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                                <CalendarOutlined style={{ color: C.primary }} />
                                <Text style={{ fontSize: 12 }}>
                                    {new Date(c.start_date).toLocaleDateString("en-GB")}
                                    {c.end_date ? ` → ${new Date(c.end_date).toLocaleDateString("en-GB")}` : ""}
                                </Text>
                            </div>
                        )}
                        {(c as any).department_id && (
                            <div style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                                <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>Department</Text>
                                <Text style={{ fontSize: 12 }}>
                                    {typeof (c as any).department_id === "object"
                                        ? (c as any).department_id?.name
                                        : (c as any).department_id}
                                </Text>
                            </div>
                        )}
                        {c.target_audience && (
                            <div style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                                <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>Target Audience</Text>
                                <Text style={{ fontSize: 12 }}>{c.target_audience}</Text>
                            </div>
                        )}
                        {c.tags?.length ? (
                            <div style={{ padding: "6px 0", borderBottom: c.description ? `1px solid ${C.border}` : "none" }}>
                                <Text style={{ fontSize: 10, color: C.subText, display: "block", marginBottom: 4 }}>Tags</Text>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                    {c.tags.map(t => (
                                        <Tag key={t} style={{ fontSize: 10, borderRadius: 4, border: "none", background: "#f1f5f9" }}>{t}</Tag>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        {c.description && (
                            <div style={{ padding: "6px 0" }}>
                                <Text style={{ fontSize: 10, color: C.subText, display: "block" }}>Description</Text>
                                <Text style={{ fontSize: 12 }}>{c.description}</Text>
                            </div>
                        )}
                    </div>

                    {/* Lead stage breakdown */}
                    {(full?.lead_stats ?? []).length > 0 && (
                        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                            <Text strong style={{ fontSize: 11, color: C.primary, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 10 }}>
                                Lead Pipeline Breakdown
                            </Text>
                            {full!.lead_stats!.map(s => (
                                <div key={s._id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                                    <Text style={{ fontSize: 12, textTransform: "capitalize" }}>{s._id}</Text>
                                    <div style={{ display: "flex", gap: 16 }}>
                                        <Text style={{ fontSize: 12, color: C.subText }}>{s.count} leads</Text>
                                        <Text style={{ fontSize: 12, color: C.green }}>KES {s.total_value?.toLocaleString() ?? 0}</Text>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Targets scoped to this campaign */}
                    {(full?.targets ?? []).length > 0 && (
                        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                            <Text strong style={{ fontSize: 11, color: C.primary, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 10 }}>
                                Campaign Targets ({full!.targets!.length})
                            </Text>
                            {full!.targets!.map((t: any) => (
                                <div key={t._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                                    <div>
                                        <Text style={{ fontSize: 12, fontWeight: 500 }}>{t.name}</Text>
                                        <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>
                                            {t.type?.replace(/_/g, " ")} · {t.user_id?.fullname || t.team || "Team"}
                                        </Text>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <Text style={{ fontSize: 12, color: (t.achievement_percentage ?? 0) >= 100 ? C.green : C.orange, fontWeight: 600 }}>
                                            {(t.achievement_percentage ?? 0).toFixed(1)}%
                                        </Text>
                                        <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>
                                            {t.actual_value?.toLocaleString()} / {t.target_value?.toLocaleString()}
                                        </Text>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Budgets scoped to this campaign */}
                    {(full?.budgets ?? []).length > 0 && (
                        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                            <Text strong style={{ fontSize: 11, color: C.primary, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 10 }}>
                                Campaign Budgets ({full!.budgets!.length})
                            </Text>
                            {full!.budgets!.map((b: any) => {
                                const variance = (b.actual_revenue ?? 0) - (b.budgeted_revenue ?? 0);
                                return (
                                    <div key={b._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                                        <div>
                                            <Text style={{ fontSize: 12, fontWeight: 500 }}>{b.name}</Text>
                                            <Text style={{ fontSize: 11, color: C.subText, display: "block", textTransform: "capitalize" }}>{b.status} · {b.period}</Text>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <Text style={{ fontSize: 12, color: variance >= 0 ? C.green : C.red, fontWeight: 600 }}>
                                                {variance >= 0 ? "+" : ""}KES {variance.toLocaleString()}
                                            </Text>
                                            <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>variance</Text>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </Drawer>
    );
};