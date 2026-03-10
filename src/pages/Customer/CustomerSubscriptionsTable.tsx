import { useEffect, useRef, useState } from "react";
import { ProTable, ProColumns, ActionType } from "@ant-design/pro-components";
import {
    Button, DatePicker, Drawer, Form, Input, InputNumber,
    Modal, Popconfirm, Progress, Select, Typography, message,
} from "antd";
import {
    CheckCircleOutlined, ClockCircleOutlined, CrownOutlined,
    DeleteOutlined, EditOutlined, EyeOutlined, FilterOutlined,
    GiftOutlined, ReloadOutlined, RiseOutlined, SaveOutlined,
    SearchOutlined, StarOutlined, StopOutlined, TeamOutlined,
    TrophyOutlined, UserOutlined, WalletOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
    fetchAllSubscriptions, deleteSubscription,
    updateSubscription, CustomerSubscription,
} from "@services/subscription";

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    red: "#ef4444",
    blue: "#3b82f6",
    orange: "#f59e0b",
    purple: "#8b5cf6",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

const fmt = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: any) => {
    if (typeof d === "string") {
        const dt = new Date(d);
        if (!isNaN(dt.getTime())) return dt.toLocaleDateString("en-GB");
    }
    return "—";
};

// ── Mobile hook ────────────────────────────────────────────────────────────
const useIsMobile = () => {
    const [v, setV] = useState(window.innerWidth < 768);
    useEffect(() => {
        const h = () => setV(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return v;
};

// ── CSS-only pills ─────────────────────────────────────────────────────────
const pill = (bg: string, color: string, border: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    borderRadius: 5, padding: "2px 8px",
    fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
    background: bg, color, border: `1px solid ${border}`,
});

const STATUS_CFG: Record<string, { bg: string; color: string; border: string; icon: React.ReactNode }> = {
    Active: { bg: "#f0fdf4", color: C.green, border: "#bbf7d0", icon: <CheckCircleOutlined /> },
    Expired: { bg: "#fffbeb", color: C.orange, border: "#fde68a", icon: <ClockCircleOutlined /> },
    Exhausted: { bg: C.bg, color: C.subText, border: C.border, icon: <StopOutlined /> },
    Cancelled: { bg: "#fef2f2", color: C.red, border: "#fecaca", icon: <StopOutlined /> },
};

const PAY_CFG: Record<string, { bg: string; color: string; border: string }> = {
    Paid: { bg: "#f0fdf4", color: C.green, border: "#bbf7d0" },
    Pending: { bg: "#fffbeb", color: C.orange, border: "#fde68a" },
    Refunded: { bg: "#eff6ff", color: C.blue, border: "#bfdbfe" },
    Failed: { bg: "#fef2f2", color: C.red, border: "#fecaca" },
};

const StatusTag = ({ status }: { status: string }) => {
    const s = STATUS_CFG[status] ?? STATUS_CFG.Exhausted;
    return <span style={pill(s.bg, s.color, s.border)}>{s.icon}{status}</span>;
};

const PayTag = ({ status }: { status: string }) => {
    const s = PAY_CFG[status] ?? PAY_CFG.Pending;
    return <span style={pill(s.bg, s.color, s.border)}>{status}</span>;
};

// ── Shared atoms ───────────────────────────────────────────────────────────
const SectionLabel = ({ text }: { text: string }) => (
    <span style={{
        display: "block", fontSize: 10, color: C.subText,
        textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8,
    }}>{text}</span>
);

const MetaRow = ({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) => (
    <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "7px 0", borderBottom: last ? "none" : `1px solid ${C.border}`,
    }}>
        <Text style={{ fontSize: 12, color: C.subText, flex: "0 0 130px" }}>{label}</Text>
        <div style={{ fontSize: 12, textAlign: "right" }}>{children}</div>
    </div>
);

const ModalTitle = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
            {icon}
        </div>
        <Text strong style={{ fontSize: 14, color: C.darkText }}>{label}</Text>
    </div>
);

// ── Analytics ──────────────────────────────────────────────────────────────
interface CustStat { name: string; phone?: string; count: number; spent: number; visits: number }
interface PkgStat { name: string; count: number; revenue: number }

interface Analytics {
    total: number; active: number; expired: number;
    cancelled: number; exhausted: number;
    totalRevenue: number; avgAmount: number;
    expiringThisWeek: number;
    topCustomers: CustStat[];
    topPackages: PkgStat[];
    awardCandidates: CustStat[];
}

const buildAnalytics = (data: CustomerSubscription[]): Analytics => {
    const total = data.length;
    const active = data.filter(s => s.status === "Active").length;
    const expired = data.filter(s => s.status === "Expired").length;
    const cancelled = data.filter(s => s.status === "Cancelled").length;
    const exhausted = data.filter(s => s.status === "Exhausted").length;
    const totalRevenue = data.reduce((sum, s) => sum + (s.purchase_amount || 0), 0);
    const avgAmount = total > 0 ? totalRevenue / total : 0;

    const now = dayjs();
    const in7 = now.add(7, "day");
    const expiringThisWeek = data.filter(s => {
        if (s.status !== "Active" || !s.end_date) return false;
        const end = dayjs(s.end_date);
        return end.isAfter(now) && end.isBefore(in7);
    }).length;

    const custMap: Record<string, CustStat> = {};
    data.forEach(s => {
        const key = s.customer_id?._id || s.customer_id?.customer_name || "unknown";
        const name = s.customer_id?.customer_name || "Unknown";
        const phone = s.customer_id?.phone ? String(s.customer_id.phone) : undefined;
        if (!custMap[key]) custMap[key] = { name, phone, count: 0, spent: 0, visits: 0 };
        custMap[key].count++;
        custMap[key].spent += s.purchase_amount || 0;
        custMap[key].visits += s.visits_used || 0;
    });

    const pkgMap: Record<string, PkgStat> = {};
    data.forEach(s => {
        const key = s.package_id?._id || s.package_id?.name || "unknown";
        const name = s.package_id?.name || "Unknown";
        if (!pkgMap[key]) pkgMap[key] = { name, count: 0, revenue: 0 };
        pkgMap[key].count++;
        pkgMap[key].revenue += s.purchase_amount || 0;
    });

    const topCustomers = Object.values(custMap).sort((a, b) => b.spent - a.spent).slice(0, 5);
    const topPackages = Object.values(pkgMap).sort((a, b) => b.count - a.count).slice(0, 5);
    const awardCandidates = Object.values(custMap).sort((a, b) => (b.visits + b.count * 10) - (a.visits + a.count * 10)).slice(0, 3);

    return { total, active, expired, cancelled, exhausted, totalRevenue, avgAmount, expiringThisWeek, topCustomers, topPackages, awardCandidates };
};

// ── KPI card ───────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, color, bg }: {
    icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string; bg: string;
}) => (
    <div style={{
        flex: "1 1 130px", background: "#fff", border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color}`, borderRadius: 10, padding: "12px 14px",
    }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <div style={{ background: bg, borderRadius: 6, padding: "4px 5px", color, fontSize: 13, lineHeight: 1 }}>{icon}</div>
            <Text style={{ fontSize: 11, color: C.subText }}>{label}</Text>
        </div>
        <Text strong style={{ fontSize: 20, color: C.darkText, display: "block", lineHeight: 1.2 }}>{value}</Text>
        {sub && <Text style={{ fontSize: 11, color: C.subText }}>{sub}</Text>}
    </div>
);

// ── Analytics panel ────────────────────────────────────────────────────────
const AnalyticsPanel = ({ data }: { data: CustomerSubscription[] }) => {
    if (data.length === 0) return null;
    const a = buildAnalytics(data);

    const rankColors = ["#f59e0b", "#94a3b8", "#c2884e"];

    return (
        <div style={{ marginBottom: 20 }}>
            {/* KPI strip */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                <KpiCard icon={<TeamOutlined />} label="Total Subscriptions" value={a.total} color={C.blue} bg="#eff6ff" />
                <KpiCard icon={<CheckCircleOutlined />} label="Active" value={a.active} color={C.green} bg="#f0fdf4"
                    sub={`${a.total ? Math.round((a.active / a.total) * 100) : 0}% of total`} />
                <KpiCard icon={<ClockCircleOutlined />} label="Expiring (7 days)" value={a.expiringThisWeek} color={C.orange} bg="#fffbeb" />
                <KpiCard icon={<StopOutlined />} label="Cancelled" value={a.cancelled} color={C.red} bg="#fef2f2" />
                <KpiCard icon={<WalletOutlined />} label="Total Revenue" value={`KES ${fmt(a.totalRevenue)}`} color={C.purple} bg="#faf5ff"
                    sub={`Avg KES ${fmt(a.avgAmount)}`} />
            </div>

            {/* Three panels */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>

                {/* Top customers */}
                <div style={{ flex: "1 1 240px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                        <CrownOutlined style={{ color: C.orange, fontSize: 14 }} />
                        <Text strong style={{ fontSize: 13, color: C.darkText }}>Top Customers by Spend</Text>
                    </div>
                    {a.topCustomers.length === 0
                        ? <Text style={{ fontSize: 12, color: C.subText, fontStyle: "italic" }}>No data yet</Text>
                        : a.topCustomers.map((c, i) => (
                            <div key={i} style={{
                                display: "flex", alignItems: "center", gap: 8,
                                padding: "8px 0", borderBottom: i < a.topCustomers.length - 1 ? `1px solid ${C.border}` : "none",
                            }}>
                                <div style={{
                                    width: 22, height: 22, borderRadius: "50%",
                                    background: rankColors[i] || C.subText,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0,
                                }}>{i + 1}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <Text strong style={{ fontSize: 12, display: "block" }}>{c.name}</Text>
                                    {c.phone && <Text style={{ fontSize: 10, color: C.subText }}>{c.phone}</Text>}
                                </div>
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                    <Text strong style={{ fontSize: 12, color: C.green, display: "block" }}>KES {fmt(c.spent)}</Text>
                                    <Text style={{ fontSize: 10, color: C.subText }}>{c.count} sub{c.count !== 1 ? "s" : ""}</Text>
                                </div>
                            </div>
                        ))}
                </div>

                {/* Most popular packages */}
                <div style={{ flex: "1 1 200px", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                        <RiseOutlined style={{ color: C.blue, fontSize: 14 }} />
                        <Text strong style={{ fontSize: 13, color: C.darkText }}>Most Popular Packages</Text>
                    </div>
                    {a.topPackages.length === 0
                        ? <Text style={{ fontSize: 12, color: C.subText, fontStyle: "italic" }}>No data yet</Text>
                        : a.topPackages.map((p, i) => (
                            <div key={i} style={{ padding: "7px 0", borderBottom: i < a.topPackages.length - 1 ? `1px solid ${C.border}` : "none" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                    <Text style={{ fontSize: 12, flex: 1, marginRight: 8 }}>{p.name}</Text>
                                    <span style={pill("#eff6ff", C.blue, "#bfdbfe")}>{p.count}</span>
                                </div>
                                <Progress
                                    percent={Math.round((p.count / (a.topPackages[0]?.count || 1)) * 100)}
                                    showInfo={false} size="small" strokeColor={C.blue} trailColor={C.border}
                                />
                                <Text style={{ fontSize: 10, color: C.subText }}>KES {fmt(p.revenue)}</Text>
                            </div>
                        ))}
                </div>

                {/* Award candidates */}
                <div style={{
                    flex: "1 1 200px", background: "#fff", border: `1px solid ${C.border}`,
                    borderTop: `3px solid ${C.purple}`, borderRadius: 10, padding: "14px 16px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <TrophyOutlined style={{ color: C.purple, fontSize: 14 }} />
                        <Text strong style={{ fontSize: 13, color: C.darkText }}>Award Candidates</Text>
                    </div>
                    <Text style={{ fontSize: 11, color: C.subText, display: "block", marginBottom: 10 }}>
                        Loyal customers worth rewarding
                    </Text>
                    {a.awardCandidates.length === 0
                        ? <Text style={{ fontSize: 12, color: C.subText, fontStyle: "italic" }}>No data yet</Text>
                        : a.awardCandidates.map((c, i) => {
                            const awardIcon = i === 0 ? <TrophyOutlined style={{ color: C.purple }} />
                                : i === 1 ? <StarOutlined style={{ color: C.orange }} />
                                    : <GiftOutlined style={{ color: C.green }} />;
                            return (
                                <div key={i} style={{
                                    padding: "8px 10px", borderRadius: 8, marginBottom: 8,
                                    background: i === 0 ? "#faf5ff" : C.bg,
                                    border: `1px solid ${i === 0 ? "#e9d5ff" : C.border}`,
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                        <span style={{ fontSize: 12 }}>{awardIcon}</span>
                                        <Text strong style={{ fontSize: 12 }}>{c.name}</Text>
                                    </div>
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <Text style={{ fontSize: 10, color: C.subText }}>{c.visits} visits</Text>
                                        <Text style={{ fontSize: 10, color: C.green }}>KES {fmt(c.spent)}</Text>
                                        <Text style={{ fontSize: 10, color: C.purple }}>{c.count} subs</Text>
                                    </div>
                                </div>
                            );
                        })}
                </div>

            </div>
        </div>
    );
};

// ── Filter chips ───────────────────────────────────────────────────────────
const FilterChips = ({ filters, onClear, onClearAll }: {
    filters: any; onClear: (k: string | string[]) => void; onClearAll: () => void;
}) => {
    const chips: { key: string | string[]; label: string }[] = [];
    if (filters.status) chips.push({ key: "status", label: `Status: ${Array.isArray(filters.status) ? filters.status.join(", ") : filters.status}` });
    if (filters.start_date_from) chips.push({ key: ["start_date_from", "start_date_to"], label: `Date: ${filters.start_date_from} → ${filters.start_date_to}` });
    if (filters.customer_name) chips.push({ key: "customer_name", label: `Customer: ${filters.customer_name}` });
    if (filters.package_name) chips.push({ key: "package_name", label: `Package: ${filters.package_name}` });
    if (filters.search) chips.push({ key: "search", label: `Search: ${filters.search}` });
    if (filters.min_amount) chips.push({ key: "min_amount", label: `Min: KES ${filters.min_amount}` });
    if (filters.max_amount) chips.push({ key: "max_amount", label: `Max: KES ${filters.max_amount}` });
    if (!chips.length) return null;

    return (
        <div style={{
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6,
            padding: "10px 12px", background: "#f0fdf4", border: `1px solid #bbf7d0`,
            borderRadius: 8, marginBottom: 10,
        }}>
            <Text style={{ fontSize: 11, color: C.subText }}>Filters:</Text>
            {chips.map((c, i) => (
                <span key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 5, background: "#fff",
                    border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 8px", fontSize: 11,
                }}>
                    {c.label}
                    <span style={{ cursor: "pointer", color: C.subText, fontSize: 10 }}
                        onClick={() => onClear(c.key)}>✕</span>
                </span>
            ))}
            <Button type="link" size="small" onClick={onClearAll}
                style={{ padding: 0, height: "auto", fontSize: 11, color: C.red, marginLeft: "auto" }}>
                Clear All
            </Button>
        </div>
    );
};

// ── Filter drawer ──────────────────────────────────────────────────────────
const FilterDrawer = ({ open, onClose, onApply, onReset, form }: {
    open: boolean; onClose: () => void; onApply: (v: any) => void; onReset: () => void; form: any;
}) => (
    <Drawer open={open} onClose={onClose} placement="bottom" height="auto"
        destroyOnClose
        styles={{ body: { padding: "16px 16px 0" }, footer: { padding: "12px 16px" } }}
        title={<ModalTitle icon={<FilterOutlined />} label="Filter Subscriptions" />}
        footer={
            <div style={{ display: "flex", gap: 10 }}>
                <Button block onClick={onReset} style={{ borderRadius: 8, height: 44 }}>Reset</Button>
                <Button block type="primary" onClick={() => form.submit()}
                    style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 44 }}>
                    Apply Filters
                </Button>
            </div>
        }
    >
        <Form form={form} layout="vertical" onFinish={onApply} style={{ paddingBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Form.Item name="customer_name" label="Customer Name" style={{ flex: "1 1 200px", marginBottom: 12 }}>
                    <Input placeholder="Enter customer name" style={{ borderRadius: 8 }} />
                </Form.Item>
                <Form.Item name="package_name" label="Package Name" style={{ flex: "1 1 200px", marginBottom: 12 }}>
                    <Input placeholder="Enter package name" style={{ borderRadius: 8 }} />
                </Form.Item>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Form.Item name="status" label="Status" style={{ flex: "1 1 200px", marginBottom: 12 }}>
                    <Select mode="multiple" allowClear placeholder="Select status" options={[
                        { label: "Active", value: "Active" }, { label: "Expired", value: "Expired" },
                        { label: "Exhausted", value: "Exhausted" }, { label: "Cancelled", value: "Cancelled" },
                    ]} />
                </Form.Item>
                <Form.Item name="date_range" label="Start Date Range" style={{ flex: "1 1 200px", marginBottom: 12 }}>
                    <RangePicker style={{ width: "100%", borderRadius: 8 }} format="DD MMM YYYY" />
                </Form.Item>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Form.Item name="min_amount" label="Min Amount (KES)" style={{ flex: "1 1 140px", marginBottom: 12 }}>
                    <InputNumber min={0} style={{ width: "100%", borderRadius: 8 }} placeholder="0" />
                </Form.Item>
                <Form.Item name="max_amount" label="Max Amount (KES)" style={{ flex: "1 1 140px", marginBottom: 12 }}>
                    <InputNumber min={0} style={{ width: "100%", borderRadius: 8 }} placeholder="0" />
                </Form.Item>
            </div>
        </Form>
    </Drawer>
);

// ── Details modal ──────────────────────────────────────────────────────────
const DetailsModal = ({ open, sub, onClose }: {
    open: boolean; sub: CustomerSubscription | null; onClose: () => void;
}) => {
    if (!sub) return null;
    const total = sub.total_visits_allowed || 0;
    const used = sub.visits_used || 0;
    const remaining = sub.visits_remaining || 0;
    const pct = total > 0 ? Math.round((used / total) * 100) : 0;

    return (
        <Modal open={open} onCancel={onClose} destroyOnClose
            style={{ top: 20 }} width="min(640px, 96vw)"
            styles={{ body: { padding: "20px 24px" } }}
            title={<ModalTitle icon={<EyeOutlined />} label={`Subscription — ${sub.subscription_code || ""}`} />}
            footer={<Button onClick={onClose} style={{ borderRadius: 8 }}>Close</Button>}
        >
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                    { label: "Total Visits", value: total, color: C.blue },
                    { label: "Visits Used", value: used, color: C.orange },
                    { label: "Visits Remaining", value: remaining, color: remaining > 0 ? C.green : C.red },
                ].map(s => (
                    <div key={s.label} style={{
                        flex: "1 1 100px", background: "#fff", border: `1px solid ${C.border}`,
                        borderLeft: `3px solid ${s.color}`, borderRadius: 8, padding: "10px 12px",
                    }}>
                        <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>{s.label}</Text>
                        <Text strong style={{ fontSize: 18, color: s.color }}>{s.value}</Text>
                    </div>
                ))}
            </div>
            {total > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={{ fontSize: 11, color: C.subText }}>Visit usage</Text>
                        <Text style={{ fontSize: 11, color: C.subText }}>{pct}%</Text>
                    </div>
                    <Progress percent={pct} showInfo={false} size="small"
                        strokeColor={pct >= 100 ? C.red : C.primary} trailColor={C.border} />
                </div>
            )}
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px" }}>
                <MetaRow label="Code"><Text copyable strong style={{ fontSize: 12 }}>{sub.subscription_code || "—"}</Text></MetaRow>
                <MetaRow label="Customer">
                    <div>
                        <Text strong style={{ fontSize: 12 }}>{sub.customer_id?.customer_name || "—"}</Text>
                        {sub.customer_id?.phone && <div style={{ fontSize: 11, color: C.subText }}>{String(sub.customer_id.phone)}</div>}
                    </div>
                </MetaRow>
                <MetaRow label="Package">
                    <div>
                        <Text strong style={{ fontSize: 12 }}>{sub.package_id?.name || "—"}</Text>
                        {sub.package_id?.code && <div style={{ fontSize: 11, color: C.subText }}>{sub.package_id.code}</div>}
                    </div>
                </MetaRow>
                <MetaRow label="Purchase Amount"><Text strong style={{ color: C.green, fontSize: 12 }}>KES {fmt(sub.purchase_amount || 0)}</Text></MetaRow>
                <MetaRow label="Payment Status"><PayTag status={sub.payment_status || "Pending"} /></MetaRow>
                <MetaRow label="Start Date"><Text style={{ fontSize: 12 }}>{fmtDate(sub.start_date)}</Text></MetaRow>
                <MetaRow label="End Date"><Text style={{ fontSize: 12 }}>{fmtDate(sub.end_date)}</Text></MetaRow>
                <MetaRow label="Status"><StatusTag status={sub.status} /></MetaRow>
                {sub.cancellation_reason && (
                    <MetaRow label="Cancellation" last>
                        <Text style={{ fontSize: 12 }}>{sub.cancellation_reason}</Text>
                    </MetaRow>
                )}
            </div>
        </Modal>
    );
};

// ── Edit drawer ────────────────────────────────────────────────────────────
const EditDrawer = ({ open, sub, form, updating, onClose, onSubmit }: {
    open: boolean; sub: CustomerSubscription | null; form: any;
    updating: boolean; onClose: () => void; onSubmit: (v: any) => void;
}) => (
    <Drawer open={open} onClose={onClose} placement="right" width="min(480px, 96vw)"
        destroyOnClose
        styles={{ body: { padding: "20px 24px", paddingBottom: 100 }, footer: { padding: "12px 16px" } }}
        title={<ModalTitle icon={<EditOutlined />} label={`Edit — ${sub?.subscription_code || ""}`} />}
        footer={
            <div style={{ display: "flex", gap: 10 }}>
                <Button block onClick={onClose} style={{ borderRadius: 8, height: 40 }}>Cancel</Button>
                <Button block type="primary" loading={updating} icon={<SaveOutlined />}
                    onClick={() => form.submit()}
                    style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 40, fontWeight: 500 }}>
                    Update Subscription
                </Button>
            </div>
        }
    >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 14px 6px", marginBottom: 14 }}>
                <SectionLabel text="Visit Details" />
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {[
                        { name: "total_visits_allowed", label: "Total Visits", min: 1 },
                        { name: "visits_used", label: "Visits Used", min: 0 },
                        { name: "visits_remaining", label: "Visits Remaining", min: 0 },
                    ].map(f => (
                        <Form.Item key={f.name} name={f.name} label={f.label} rules={[{ required: true }]} style={{ flex: "1 1 120px", marginBottom: 12 }}>
                            <InputNumber min={f.min} style={{ width: "100%", borderRadius: 8 }} />
                        </Form.Item>
                    ))}
                </div>
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 14px 6px", marginBottom: 14 }}>
                <SectionLabel text="Dates & Amount" />
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]} style={{ flex: "1 1 160px", marginBottom: 12 }}>
                        <DatePicker style={{ width: "100%", borderRadius: 8 }} format="DD/MM/YYYY" />
                    </Form.Item>
                    <Form.Item name="end_date" label="End Date" rules={[{ required: true }]} style={{ flex: "1 1 160px", marginBottom: 12 }}>
                        <DatePicker style={{ width: "100%", borderRadius: 8 }} format="DD/MM/YYYY" />
                    </Form.Item>
                </div>
                <Form.Item name="purchase_amount" label="Purchase Amount (KES)" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                    <InputNumber min={0} style={{ width: "100%", borderRadius: 8 }} placeholder="0.00" />
                </Form.Item>
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 14px 6px", marginBottom: 14 }}>
                <SectionLabel text="Status" />
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Form.Item name="status" label="Subscription Status" rules={[{ required: true }]} style={{ flex: "1 1 160px", marginBottom: 12 }}>
                        <Select options={[
                            { label: "Active", value: "Active" }, { label: "Expired", value: "Expired" },
                            { label: "Exhausted", value: "Exhausted" }, { label: "Cancelled", value: "Cancelled" },
                        ]} />
                    </Form.Item>
                    <Form.Item name="payment_status" label="Payment Status" rules={[{ required: true }]} style={{ flex: "1 1 160px", marginBottom: 12 }}>
                        <Select options={[
                            { label: "Paid", value: "Paid" }, { label: "Pending", value: "Pending" },
                            { label: "Refunded", value: "Refunded" }, { label: "Failed", value: "Failed" },
                        ]} />
                    </Form.Item>
                </div>
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 14px 6px", marginBottom: 14 }}>
                <SectionLabel text="Cancellation & Refund (Optional)" />
                <Form.Item name="cancellation_reason" label="Cancellation Reason" style={{ marginBottom: 12 }}>
                    <Input.TextArea rows={3} placeholder="Enter reason if applicable" style={{ borderRadius: 8 }} />
                </Form.Item>
                <Form.Item name="refund_amount" label="Refund Amount (KES)" style={{ marginBottom: 12 }}>
                    <InputNumber min={0} style={{ width: "100%", borderRadius: 8 }} placeholder="0.00" />
                </Form.Item>
            </div>
            <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>
                Updating subscription details may affect related orders and payments.
            </Text>
        </Form>
    </Drawer>
);

// ── Mobile subscription card ───────────────────────────────────────────────
const MobileCard = ({ record, onView, onEdit, onDelete, deleting }: {
    record: CustomerSubscription;
    onView: () => void; onEdit: () => void; onDelete: () => void; deleting: boolean;
}) => {
    const total = record.total_visits_allowed || 0;
    const used = record.visits_used || 0;
    const remaining = record.visits_remaining || 0;
    const pct = total > 0 ? Math.round((used / total) * 100) : 0;

    return (
        <div style={{
            background: "#fff", border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "12px 14px", marginBottom: 10,
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <Text copyable strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>
                        {record.subscription_code}
                    </Text>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                        <UserOutlined style={{ fontSize: 10, color: C.subText }} />
                        <Text style={{ fontSize: 11, color: C.subText }}>{record.customer_id?.customer_name || "—"}</Text>
                    </div>
                </div>
                <StatusTag status={record.status} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: C.subText }}>{record.package_id?.name || "—"}</Text>
                <Text strong style={{ fontSize: 13, color: C.green }}>KES {fmt(record.purchase_amount || 0)}</Text>
            </div>

            {total > 0 && (
                <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <Text style={{ fontSize: 11, color: C.subText }}>Visits: {used}/{total}</Text>
                        <Text style={{ fontSize: 11, color: remaining > 0 ? C.green : C.red }}>{remaining} remaining</Text>
                    </div>
                    <Progress percent={pct} showInfo={false} size="small"
                        strokeColor={pct >= 100 ? C.red : C.primary} trailColor={C.border} />
                </div>
            )}

            <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: C.subText }}>
                    Start: <span style={{ color: C.darkText }}>{fmtDate(record.start_date)}</span>
                </Text>
                <Text style={{ fontSize: 11, color: C.subText }}>
                    End: <span style={{ color: C.darkText }}>{fmtDate(record.end_date)}</span>
                </Text>
            </div>

            <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                <Button size="small" icon={<EyeOutlined />} onClick={onView}
                    style={{ flex: 1, borderRadius: 7, height: 32, fontSize: 12, color: C.blue, borderColor: C.blue }}>
                    View
                </Button>
                <Button size="small" icon={<EditOutlined />} onClick={onEdit}
                    style={{ flex: 1, borderRadius: 7, height: 32, fontSize: 12, color: C.primary, borderColor: C.primary }}>
                    Edit
                </Button>
                <Popconfirm title="Delete this subscription?" description="This action cannot be undone."
                    onConfirm={onDelete} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
                    <Button size="small" danger icon={<DeleteOutlined />} loading={deleting}
                        style={{ flex: 1, borderRadius: 7, height: 32, fontSize: 12 }}>
                        Delete
                    </Button>
                </Popconfirm>
            </div>
        </div>
    );
};

// ── Main ───────────────────────────────────────────────────────────────────
const CustomerSubscriptionsTable: React.FC = () => {
    const isMobile = useIsMobile();
    const actionRef = useRef<ActionType>();
    const filtersRef = useRef<any>({});

    const [filters, setFilters] = useState<any>({});
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedSub, setSelectedSub] = useState<CustomerSubscription | null>(null);
    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    const [editingSub, setEditingSub] = useState<CustomerSubscription | null>(null);
    const [updating, setUpdating] = useState(false);

    const [mobileData, setMobileData] = useState<CustomerSubscription[]>([]);
    const [mobileTotal, setMobileTotal] = useState(0);
    const [mobilePage, setMobilePage] = useState(1);
    const [mobileLoading, setMobileLoading] = useState(false);
    const [allData, setAllData] = useState<CustomerSubscription[]>([]);

    const [filterForm] = Form.useForm();
    const [searchForm] = Form.useForm();
    const [editForm] = Form.useForm();

    const loadAllData = async () => {
        try {
            const res = await fetchAllSubscriptions({ page: 1, limit: 500 });
            setAllData(res.subscriptions || []);
        } catch { /* silent */ }
    };

    useEffect(() => { loadAllData(); }, []);

    const loadMobileData = async (page: number, f?: any) => {
        const active = f ?? filtersRef.current;
        setMobileLoading(true);
        try {
            const req: any = { page, limit: 15, ...active };
            Object.keys(req).forEach(k => { if (req[k] == null) delete req[k]; });
            const res = await fetchAllSubscriptions(req);
            setMobileData(prev => page === 1 ? (res.subscriptions || []) : [...prev, ...(res.subscriptions || [])]);
            setMobileTotal(res.totalSubscriptions || 0);
            setMobilePage(page);
        } catch {
            message.error("Failed to load subscriptions");
        } finally {
            setMobileLoading(false);
        }
    };

    useEffect(() => { if (isMobile) loadMobileData(1); }, [isMobile]);

    const fetchSubscriptions = async (params: any) => {
        try {
            const req: any = { page: params.current || 1, limit: params.pageSize || 20, ...filtersRef.current };
            Object.keys(req).forEach(k => { if (req[k] == null) delete req[k]; });
            const res = await fetchAllSubscriptions(req);
            return { data: res.subscriptions || [], success: true, total: res.totalSubscriptions || 0 };
        } catch {
            message.error("Failed to load subscriptions");
            return { data: [], success: false, total: 0 };
        }
    };

    const applyFilters = (f: any) => {
        filtersRef.current = f;
        setFilters(f);
        if (isMobile) { setMobileData([]); loadMobileData(1, f); }
        else actionRef.current?.reload();
    };

    const handleViewDetails = (r: CustomerSubscription) => { setSelectedSub(r); setDetailsModalOpen(true); };

    const handleEdit = (r: CustomerSubscription) => {
        setEditingSub(r);
        editForm.setFieldsValue({
            ...r,
            start_date: r.start_date ? dayjs(r.start_date) : null,
            end_date: r.end_date ? dayjs(r.end_date) : null,
        });
        setEditDrawerOpen(true);
    };

    const handleEditSubmit = async (values: any) => {
        if (!editingSub) return;
        setUpdating(true);
        try {
            const payload: any = { ...values, start_date: values.start_date?.toISOString(), end_date: values.end_date?.toISOString() };
            Object.keys(payload).forEach(k => { if (payload[k] == null) delete payload[k]; });
            await updateSubscription(editingSub._id, payload);
            message.success("Subscription updated successfully");
            setEditDrawerOpen(false); setEditingSub(null); editForm.resetFields();
            loadAllData();
            if (isMobile) { setMobileData([]); loadMobileData(1); } else actionRef.current?.reload();
        } catch (e: any) {
            message.error(e.message || "Failed to update subscription");
        } finally { setUpdating(false); }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await deleteSubscription(id);
            message.success("Subscription deleted");
            loadAllData();
            if (isMobile) { setMobileData(prev => prev.filter(s => s._id !== id)); setMobileTotal(t => t - 1); }
            else actionRef.current?.reload();
        } catch (e: any) {
            message.error(e.message || "Failed to delete subscription");
        } finally { setDeletingId(null); }
    };

    const handleSearch = (values: any) => {
        const f = { ...filtersRef.current };
        if (values.search) f.search = values.search; else delete f.search;
        applyFilters(f);
    };

    const handleFilterApply = (values: any) => {
        const f: any = { ...filtersRef.current };
        ["status", "start_date_from", "start_date_to", "customer_name", "package_name", "min_amount", "max_amount"].forEach(k => delete f[k]);
        if (values.status?.length) f.status = values.status;
        if (values.customer_name) f.customer_name = values.customer_name;
        if (values.package_name) f.package_name = values.package_name;
        if (values.min_amount) f.min_amount = values.min_amount;
        if (values.max_amount) f.max_amount = values.max_amount;
        if (values.date_range?.length === 2) {
            f.start_date_from = dayjs(values.date_range[0]).format("YYYY-MM-DD");
            f.start_date_to = dayjs(values.date_range[1]).format("YYYY-MM-DD");
        }
        applyFilters(f); setFilterDrawerOpen(false);
    };

    const handleFilterReset = () => { filterForm.resetFields(); searchForm.resetFields(); applyFilters({}); setFilterDrawerOpen(false); };

    const clearFilter = (key: string | string[]) => {
        const f = { ...filtersRef.current };
        (Array.isArray(key) ? key : [key]).forEach(k => delete f[k]);
        applyFilters(f);
    };

    const activeCount = Object.keys(filters).length;

    const columns: ProColumns<CustomerSubscription>[] = [
        {
            title: "Code", dataIndex: "subscription_code", key: "code", width: 150, fixed: "left",
            render: (text) => <Text copyable strong style={{ fontSize: 12 }}>{text}</Text>,
        },
        {
            title: "Customer", dataIndex: ["customer_id", "customer_name"], key: "customer", width: 180, ellipsis: true,
            render: (text, record) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Text strong style={{ fontSize: 12 }}>{text}</Text>
                    {record.customer_id?.phone && <Text style={{ fontSize: 11, color: C.subText }}>{String(record.customer_id.phone)}</Text>}
                </div>
            ),
        },
        {
            title: "Package", dataIndex: ["package_id", "name"], key: "package", width: 180, ellipsis: true,
            render: (text, record) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Text strong style={{ fontSize: 12 }}>{text}</Text>
                    {record.package_id?.code && <Text style={{ fontSize: 11, color: C.subText }}>{record.package_id.code}</Text>}
                </div>
            ),
        },
        {
            title: "Visits", key: "visits", width: 170,
            render: (_, r) => {
                const total = r.total_visits_allowed || 0;
                const used = r.visits_used || 0;
                if (!total) return <Text style={{ fontSize: 12, color: C.subText, fontStyle: "italic" }}>N/A</Text>;
                const pct = Math.round((used / total) * 100);
                return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <Text style={{ fontSize: 12 }}>{used} / {total} used</Text>
                        <Progress percent={pct} size="small" showInfo={false}
                            strokeColor={pct >= 100 ? C.red : C.primary} trailColor={C.border} />
                    </div>
                );
            },
        },
        {
            title: "Remaining", dataIndex: "visits_remaining", key: "remaining", width: 100, align: "center",
            render: (v) => {
                const n = v || 0;
                return <span style={pill(n > 0 ? "#eff6ff" : "#fef2f2", n > 0 ? C.blue : C.red, n > 0 ? "#bfdbfe" : "#fecaca")}>{n}</span>;
            },
        },
        {
            title: "Amount", dataIndex: "purchase_amount", key: "amount", width: 130, align: "right",
            render: (v) => <Text strong style={{ fontSize: 12, color: C.green }}>KES {fmt(v || 0)}</Text>,
        },
        {
            title: "Start", dataIndex: "start_date", key: "start_date", width: 110,
            render: (_, r) => <Text style={{ fontSize: 12 }}>{fmtDate(r.start_date)}</Text>,
        },
        {
            title: "End", dataIndex: "end_date", key: "end_date", width: 110,
            render: (_, r) => <Text style={{ fontSize: 12 }}>{fmtDate(r.end_date)}</Text>,
        },
        {
            title: "Status", dataIndex: "status", key: "status", width: 120,
            render: (status) => <StatusTag status={status} />,
        },
        {
            title: "Actions", key: "actions", width: 110, fixed: "right",
            render: (_, record) => (
                <div style={{ display: "flex", gap: 4 }}>
                    <Button size="small" type="text" icon={<EyeOutlined style={{ color: C.blue }} />}
                        onClick={() => handleViewDetails(record)} style={{ borderRadius: 6 }} />
                    <Button size="small" type="text" icon={<EditOutlined style={{ color: C.primary }} />}
                        onClick={() => handleEdit(record)} style={{ borderRadius: 6 }} />
                    <Popconfirm title="Delete this subscription?" description="This action cannot be undone."
                        onConfirm={() => handleDelete(record._id)} okText="Delete" cancelText="Cancel"
                        okButtonProps={{ danger: true }}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />}
                            loading={deletingId === record._id} style={{ borderRadius: 6 }} />
                    </Popconfirm>
                </div>
            ),
        },
    ];

    const SearchBar = (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <Form form={searchForm} layout="inline" onFinish={handleSearch}
                style={{ display: "flex", flex: 1, gap: 8, margin: 0 }}>
                <Form.Item name="search" style={{ flex: 1, margin: 0, minWidth: 180 }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: C.subText }} />}
                        placeholder="Search code, customer, package…"
                        allowClear style={{ borderRadius: 8 }}
                        onChange={e => { if (!e.target.value) handleSearch({ search: "" }); }}
                    />
                </Form.Item>
                <Button htmlType="submit" type="primary" icon={<SearchOutlined />}
                    style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
                    {!isMobile && "Search"}
                </Button>
            </Form>
            <Button icon={<FilterOutlined />} onClick={() => setFilterDrawerOpen(true)}
                style={{
                    borderRadius: 8, flexShrink: 0,
                    borderColor: activeCount > 0 ? C.primary : C.border,
                    color: activeCount > 0 ? C.primary : C.darkText,
                }}>
                Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </Button>
            <Button icon={<ReloadOutlined />}
                onClick={() => { loadAllData(); isMobile ? loadMobileData(1) : actionRef.current?.reload(); }}
                style={{ borderRadius: 8, flexShrink: 0 }} />
        </div>
    );

    const Overlays = (
        <>
            <FilterDrawer open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}
                onApply={handleFilterApply} onReset={handleFilterReset} form={filterForm} />
            <DetailsModal open={detailsModalOpen} sub={selectedSub}
                onClose={() => { setDetailsModalOpen(false); setSelectedSub(null); }} />
            <EditDrawer open={editDrawerOpen} sub={editingSub} form={editForm}
                updating={updating}
                onClose={() => { setEditDrawerOpen(false); setEditingSub(null); editForm.resetFields(); }}
                onSubmit={handleEditSubmit} />
        </>
    );

    // ── Mobile ─────────────────────────────────────────────────────────────
    if (isMobile) {
        return (
            <div>
                <AnalyticsPanel data={allData} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                    <div>
                        <Text strong style={{ fontSize: 15, color: C.darkText, display: "block" }}>Subscriptions</Text>
                        <Text style={{ fontSize: 11, color: C.subText }}>{mobileTotal} total</Text>
                    </div>
                </div>
                {SearchBar}
                <FilterChips filters={filters} onClear={clearFilter} onClearAll={handleFilterReset} />

                {mobileData.length === 0 && !mobileLoading && (
                    <div style={{
                        background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10,
                        padding: "32px 16px", textAlign: "center",
                    }}>
                        <Text style={{ color: C.subText, fontSize: 13 }}>No subscriptions found</Text><br />
                        <Button size="small" onClick={handleFilterReset} style={{ marginTop: 10, borderRadius: 8 }}>
                            Adjust Filters
                        </Button>
                    </div>
                )}

                {mobileData.map(r => (
                    <MobileCard key={r._id} record={r}
                        onView={() => handleViewDetails(r)}
                        onEdit={() => handleEdit(r)}
                        onDelete={() => handleDelete(r._id)}
                        deleting={deletingId === r._id}
                    />
                ))}

                {mobileData.length < mobileTotal && (
                    <Button block loading={mobileLoading}
                        onClick={() => loadMobileData(mobilePage + 1)}
                        style={{ borderRadius: 8, marginTop: 4, borderColor: C.border }}>
                        Load More
                    </Button>
                )}
                {Overlays}
            </div>
        );
    }

    // ── Desktop ────────────────────────────────────────────────────────────
    return (
        <div>
            <AnalyticsPanel data={allData} />
            {SearchBar}
            <FilterChips filters={filters} onClear={clearFilter} onClearAll={handleFilterReset} />
            <ProTable<CustomerSubscription>
                columns={columns}
                actionRef={actionRef}
                request={fetchSubscriptions}
                rowKey="_id"
                search={false}
                toolBarRender={false}
                pagination={{
                    defaultPageSize: 20, showSizeChanger: true, showQuickJumper: true,
                    pageSizeOptions: ["10", "20", "50", "100"],
                    showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
                }}
                scroll={{ x: 1400 }}
                options={{ density: true, fullScreen: true, reload: () => actionRef.current?.reload() }}
                size="small"
                cardBordered={false}
            />
            {Overlays}
        </div>
    );
};

export default CustomerSubscriptionsTable;