import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ActionType, ProFormInstance, ProTable } from "@ant-design/pro-components";
import {
    AlertOutlined, BarsOutlined, CheckCircleOutlined, EditOutlined,
    EnvironmentOutlined, EyeOutlined, GiftOutlined, HistoryOutlined,
    IdcardOutlined, MailOutlined, MoreOutlined, ReloadOutlined,
    SearchOutlined, StarFilled, TeamOutlined, TrophyOutlined,
    UserAddOutlined, UserOutlined, PhoneOutlined,
} from "@ant-design/icons";
import { App, Button, Drawer, Dropdown, Form, Input, Modal, Table, Typography } from "antd";
import { fetchAllCustomers, fetchAllGiftCards } from "@services/customers";
import ExpandedRowContent from "./ExpandableCustomer";
import GiftCardModal from "../../components/MODALS/pro/GiftCardModal";

const { Text } = Typography;

const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    red: "#ef4444",
    blue: "#3b82f6",
    orange: "#f59e0b",
    purple: "#8b5cf6",
    indigo: "#6366f1",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

const useIsMobile = () => {
    const [v, setV] = useState(window.innerWidth < 768);
    useEffect(() => {
        const h = () => setV(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return v;
};

const pill = (bg: string, color: string, border: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    borderRadius: 5, padding: "2px 8px",
    fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
    background: bg, color, border: `1px solid ${border}`,
});

const ModalTitle = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
            background: C.primaryLight, borderRadius: 7,
            padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1,
        }}>
            {icon}
        </div>
        <Text strong style={{ fontSize: 14, color: C.darkText }}>{label}</Text>
    </div>
);

const MetaRow = ({ label, children, last }: {
    label: string; children: React.ReactNode; last?: boolean;
}) => (
    <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "7px 0", borderBottom: last ? "none" : `1px solid ${C.border}`,
    }}>
        <Text style={{ fontSize: 11, color: C.subText, flex: "0 0 110px" }}>{label}</Text>
        <div style={{ fontSize: 12, textAlign: "right", flex: 1 }}>{children}</div>
    </div>
);

const KpiCard = ({ icon, label, value, sub, color, bg }: {
    icon: React.ReactNode; label: string; value: string | number;
    sub?: string; color: string; bg: string;
}) => (
    <div style={{
        flex: "1 1 130px", background: "#fff", border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color}`, borderRadius: 10, padding: "12px 14px",
    }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <div style={{ background: bg, borderRadius: 6, padding: "4px 5px", color, fontSize: 13, lineHeight: 1 }}>
                {icon}
            </div>
            <Text style={{ fontSize: 11, color: C.subText }}>{label}</Text>
        </div>
        <Text strong style={{ fontSize: 20, color: C.darkText, display: "block", lineHeight: 1.2 }}>{value}</Text>
        {sub && <Text style={{ fontSize: 11, color: C.subText }}>{sub}</Text>}
    </div>
);

const TopCustomerRow = ({ rank, name, visits, sub, last }: {
    rank: number; name: string; visits: number; sub?: string; last?: boolean;
}) => {
    const medals = ["#f59e0b", "#9ca3af", "#cd7f32"];
    const color = medals[rank - 1] || C.subText;
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 0", borderBottom: last ? "none" : `1px solid ${C.border}`,
        }}>
            <div style={{
                width: 20, height: 20, borderRadius: "50%",
                background: color, display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0,
            }}>
                <Text style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{rank}</Text>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 12, color: C.darkText, display: "block" }}>{name}</Text>
                {sub && <Text style={{ fontSize: 10, color: C.subText }}>{sub}</Text>}
            </div>
            <span style={pill("#eff6ff", C.blue, "#bfdbfe")}>
                {visits} visit{visits !== 1 ? "s" : ""}
            </span>
        </div>
    );
};

const ProgressRow = ({ label, count, total, color, last }: {
    label: string; count: number; total: number; color: string; last?: boolean;
}) => {
    const pct = total ? Math.round((count / total) * 100) : 0;
    return (
        <div style={{ padding: "6px 0", borderBottom: last ? "none" : `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: C.darkText }}>{label}</Text>
                <Text style={{ fontSize: 11, color, fontWeight: 600 }}>{count} ({pct}%)</Text>
            </div>
            <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
            </div>
        </div>
    );
};

const buildStats = (customers: any[]) => {
    const now = Date.now();
    let recent = 0, overdue = 0, never = 0;
    const visitCounts: { name: string; visits: number; location?: string }[] = [];

    customers.forEach(c => {
        const visits = c.visits || [];
        if (!visits.length) { never++; return; }
        const lastDate = visits.reduce((p: any, x: any) =>
            new Date(x.createdAt) > new Date(p.createdAt) ? x : p
        ).createdAt;
        const days = (now - new Date(lastDate).getTime()) / 86400000;
        if (days <= 14) recent++; else overdue++;
        visitCounts.push({ name: c.customer_name, visits: visits.length, location: c.location });
    });

    const topVisitors = [...visitCounts].sort((a, b) => b.visits - a.visits).slice(0, 5);

    const locMap: Record<string, number> = {};
    customers.forEach(c => { const l = c.location || "Unknown"; locMap[l] = (locMap[l] || 0) + 1; });
    const byLocation = Object.entries(locMap)
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count).slice(0, 4);

    return {
        total: customers.length,
        withEmail: customers.filter(c => c.email).length,
        withPhone: customers.filter(c => c.phone).length,
        recent, overdue, never, topVisitors, byLocation,
    };
};

const AnalyticsPanel = ({ customers }: { customers: any[] }) => {
    if (!customers.length) return null;
    const s = buildStats(customers);

    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <KpiCard icon={<TeamOutlined />} label="Total Customers" value={s.total}
                    sub={`${s.withPhone} with phone`} color={C.blue} bg="#eff6ff" />
                <KpiCard icon={<CheckCircleOutlined />} label="Recent Visitors" value={s.recent}
                    sub={`${s.total ? Math.round((s.recent / s.total) * 100) : 0}% visited in 14d`}
                    color={C.green} bg="#f0fdf4" />
                <KpiCard icon={<AlertOutlined />} label="Overdue" value={s.overdue}
                    sub="last visit > 14 days" color={C.orange} bg="#fffbeb" />
                <KpiCard icon={<UserOutlined />} label="Never Visited" value={s.never}
                    sub="no visit recorded" color={C.red} bg="#fef2f2" />
                <KpiCard icon={<MailOutlined />} label="With Email" value={s.withEmail}
                    sub={`${s.total ? Math.round((s.withEmail / s.total) * 100) : 0}% reachable`}
                    color={C.purple} bg="#faf5ff" />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{
                    flex: "1 1 240px", background: "#fff",
                    border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <TrophyOutlined style={{ color: C.orange, fontSize: 13 }} />
                        <Text strong style={{ fontSize: 12, color: C.darkText }}>Top Visitors</Text>
                    </div>
                    {s.topVisitors.length === 0
                        ? <Text style={{ fontSize: 12, color: C.subText }}>No visit data</Text>
                        : s.topVisitors.map((c, i) => (
                            <TopCustomerRow key={i} rank={i + 1} name={c.name}
                                visits={c.visits} sub={c.location}
                                last={i === s.topVisitors.length - 1} />
                        ))
                    }
                </div>

                <div style={{
                    flex: "1 1 220px", background: "#fff",
                    border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <EnvironmentOutlined style={{ color: C.primary, fontSize: 13 }} />
                        <Text strong style={{ fontSize: 12, color: C.darkText }}>By Location</Text>
                    </div>
                    {s.byLocation.length === 0
                        ? <Text style={{ fontSize: 12, color: C.subText }}>No location data</Text>
                        : s.byLocation.map((loc, i) => (
                            <ProgressRow key={i} label={loc.location} count={loc.count}
                                total={s.total} color={C.primary}
                                last={i === s.byLocation.length - 1} />
                        ))
                    }
                </div>

                <div style={{
                    flex: "1 1 200px", background: "#fff",
                    border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <StarFilled style={{ color: C.blue, fontSize: 13 }} />
                        <Text strong style={{ fontSize: 12, color: C.darkText }}>Visit Health</Text>
                    </div>
                    <ProgressRow label="Recent (≤14d)" count={s.recent} total={s.total} color={C.green} />
                    <ProgressRow label="Overdue (>14d)" count={s.overdue} total={s.total} color={C.orange} />
                    <ProgressRow label="Never visited" count={s.never} total={s.total} color={C.red} last />
                </div>
            </div>
        </div>
    );
};

const VisitBadge = ({ visits }: { visits: any[] }) => {
    const lastVisitDate = visits?.[0]?.createdAt ? new Date(visits[0].createdAt) : null;
    if (!lastVisitDate)
        return <span style={pill(C.bg, C.subText, C.border)}><AlertOutlined />No Visits</span>;
    const days = (Date.now() - lastVisitDate.getTime()) / 86400000;
    return days > 14
        ? <span style={pill("#fef2f2", C.red, "#fecaca")}><AlertOutlined />Overdue</span>
        : <span style={pill("#f0fdf4", C.green, "#bbf7d0")}><CheckCircleOutlined />Recent</span>;
};

const GiftStatusBadge = ({ active }: { active: boolean }) => (
    <span style={active
        ? pill("#f0fdf4", C.green, "#bbf7d0")
        : pill("#fef2f2", C.red, "#fecaca")}>
        {active ? "Active" : "Inactive"}
    </span>
);

type GiftTab = "all" | "nonCustomers" | "customers";
const GIFT_TABS: { key: GiftTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "nonCustomers", label: "Non-Customer" },
    { key: "customers", label: "Customer" },
];

const TabNav = ({ active, onChange }: { active: GiftTab; onChange: (k: GiftTab) => void }) => (
    <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {GIFT_TABS.map(({ key, label }) => {
            const isActive = key === active;
            return (
                <button key={key} onClick={() => onChange(key)} style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "5px 14px", borderRadius: 20, cursor: "pointer",
                    fontSize: 12, fontWeight: isActive ? 600 : 400, outline: "none",
                    border: isActive ? `1.5px solid ${C.primary}` : `1px solid ${C.border}`,
                    background: isActive ? C.primary : "#fff",
                    color: isActive ? "#fff" : C.subText,
                    transition: "all 0.15s",
                }}>
                    {label}
                </button>
            );
        })}
    </div>
);

const MobileCustomerCard = ({ record, onEdit, onIssueGiftCard, onViewGiftCards, showGiftCards }: {
    record: any; onEdit?: () => void;
    onIssueGiftCard: () => void; onViewGiftCards: () => void;
    showGiftCards: boolean;
}) => {
    const lv = (() => {
        const visits = record.visits || [];
        if (!visits.length) return null;
        return visits.reduce((prev: any, curr: any) =>
            new Date(curr.createdAt) > new Date(prev.createdAt) ? curr : prev
        ).createdAt;
    })();

    return (
        <div style={{
            background: "#fff", border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "12px 14px", marginBottom: 10,
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>
                        {record.customer_name}
                    </Text>
                    <Text copyable style={{ fontSize: 11, color: C.subText }}>{record.code}</Text>
                </div>
                <VisitBadge visits={record.visits || []} />
            </div>
            <div style={{ background: C.bg, borderRadius: 8, padding: "4px 10px", marginBottom: 10 }}>
                {record.phone && (
                    <MetaRow label="Phone">
                        <Text copyable style={{ fontSize: 12 }}>{record.phone}</Text>
                    </MetaRow>
                )}
                {record.email && (
                    <MetaRow label="Email">
                        <Text copyable style={{ fontSize: 12, color: C.subText }}>{record.email}</Text>
                    </MetaRow>
                )}
                {record.location && (
                    <MetaRow label="Location">
                        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                            <EnvironmentOutlined style={{ color: C.subText, fontSize: 11 }} />
                            <Text style={{ fontSize: 12 }}>{record.location}</Text>
                        </div>
                    </MetaRow>
                )}
                {record.kra_pin && (
                    <MetaRow label="KRA PIN">
                        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                            <IdcardOutlined style={{ color: C.subText, fontSize: 11 }} />
                            <Text style={{ fontSize: 12 }}>{record.kra_pin}</Text>
                        </div>
                    </MetaRow>
                )}
                <MetaRow label="Last Visit" last>
                    <Text style={{ fontSize: 12, color: C.subText }}>
                        {lv ? new Date(lv).toLocaleString("en-GB") : "No visits"}
                    </Text>
                </MetaRow>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
                {onEdit && (
                    <Button size="small" icon={<EditOutlined />} onClick={onEdit}
                        style={{ flex: 1, borderRadius: 7, height: 32, fontSize: 11, color: C.primary, borderColor: C.primary }}>
                        Edit
                    </Button>
                )}
                {showGiftCards && (
                    <>
                        <Button size="small" icon={<GiftOutlined />} onClick={onIssueGiftCard}
                            style={{ flex: 1, borderRadius: 7, height: 32, fontSize: 11 }}>
                            Gift Card
                        </Button>
                        <Button size="small" icon={<HistoryOutlined />} onClick={onViewGiftCards}
                            style={{ flex: 1, borderRadius: 7, height: 32, fontSize: 11, color: C.subText }}>
                            History
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

const GiftCardMobileCard = ({ card, onPreview, onShare }: {
    card: any; onPreview: () => void; onShare: () => void;
}) => (
    <div style={{
        background: "#fff", border: `1px solid ${C.border}`,
        borderRadius: 10, padding: "12px 14px", marginBottom: 10,
    }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <Text strong style={{ fontSize: 14, color: C.green }}>
                KES {(card.amount || 0).toLocaleString()}
            </Text>
            <GiftStatusBadge active={card.status} />
        </div>
        <div style={{ background: C.bg, borderRadius: 8, padding: "4px 10px", marginBottom: 10 }}>
            <MetaRow label="Recipient">
                <Text style={{ fontSize: 12 }}>
                    {card.customer_name || card.customer_id?.customer_name || "Non-Customer"}
                </Text>
            </MetaRow>
            {card.email && (
                <MetaRow label="Email">
                    <Text style={{ fontSize: 12, color: C.subText }}>{card.email}</Text>
                </MetaRow>
            )}
            <MetaRow label="Issue Date">
                <Text style={{ fontSize: 12 }}>
                    {card.createdAt ? new Date(card.createdAt).toLocaleDateString("en-GB") : "—"}
                </Text>
            </MetaRow>
            <MetaRow label="Expiry" last>
                <Text style={{ fontSize: 12 }}>
                    {card.expiry_date ? new Date(card.expiry_date).toLocaleDateString("en-GB") : "—"}
                </Text>
            </MetaRow>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
            <Button size="small" icon={<EyeOutlined />} onClick={onPreview}
                style={{ flex: 1, borderRadius: 7, height: 32, fontSize: 11, color: C.primary, borderColor: C.primary }}>
                Preview
            </Button>
            <Button size="small" icon={<MailOutlined />} onClick={onShare}
                style={{ flex: 1, borderRadius: 7, height: 32, fontSize: 11 }}>
                Share
            </Button>
        </div>
    </div>
);

// ── Module helper ──────────────────────────────────────────────────────────
const getModules = () => {
    try {
        const tenant = JSON.parse(localStorage.getItem("tenant") || "{}");
        return {
            hasPOS: tenant?.pos_integration?.enabled === true,
            hasAccounting: tenant?.modules?.accounting === true,
        };
    } catch {
        return { hasPOS: false, hasAccounting: false };
    }
};

interface CustomerTableProps {
    nonCustomerEnabled?: boolean;
    onEditCustomer?: (customer: any) => void;
}
interface CustomerTableHandle { reload: () => void }

const CustomerTable = forwardRef<CustomerTableHandle, CustomerTableProps>(
    ({ nonCustomerEnabled = false, onEditCustomer }, ref) => {
        const isMobile = useIsMobile();
        const actionRef = useRef<ActionType>();
        const formRef = useRef<ProFormInstance>();
        const [searchForm] = Form.useForm();

        // ── Gift cards are a POS feature — hide when accounting-only ──────────
        const { hasPOS } = getModules();
        const giftCardsEnabled = nonCustomerEnabled && hasPOS;

        const [giftCardOpen, setGiftCardOpen] = useState(false);
        const [newRecipientOpen, setNewRecipientOpen] = useState(false);
        const [previewOpen, setPreviewOpen] = useState(false);
        const [sendEmailOpen, setSendEmailOpen] = useState(false);
        const [viewGiftCardsOpen, setViewGiftCardsOpen] = useState(false);
        const [allGiftCardsOpen, setAllGiftCardsOpen] = useState(false);
        const [activeGiftTab, setActiveGiftTab] = useState<GiftTab>("all");

        const [currentCustomer, setCurrentCustomer] = useState<any>(null);
        const [currentGiftCard, setCurrentGiftCard] = useState<any>(null);
        const [customerGiftCards, setCustomerGiftCards] = useState<any[]>([]);
        const [allGiftCards, setAllGiftCards] = useState<any[]>([]);
        const [loadingGiftCards, setLoadingGiftCards] = useState(false);
        const [loadingAllGiftCards, setLoadingAllGiftCards] = useState(false);
        const [clientName, setClientName] = useState("BasePoint Cloud");

        const [allCustomers, setAllCustomers] = useState<any[]>([]);
        const [mobileData, setMobileData] = useState<any[]>([]);
        const [mobileTotal, setMobileTotal] = useState(0);
        const [mobilePage, setMobilePage] = useState(1);
        const [mobileLoading, setMobileLoading] = useState(false);
        const [mobileSearch, setMobileSearch] = useState("");
        const [mobilePhoneSearch, setMobilePhoneSearch] = useState("");
        const [mobileEmailSearch, setMobileEmailSearch] = useState("");

        const { message: messageApi } = App.useApp();

        useImperativeHandle(ref, () => ({
            reload: () => {
                actionRef.current?.reload();
                loadAllForStats();
                if (isMobile) loadMobileData(1, mobileSearch, mobilePhoneSearch, mobileEmailSearch);
            },
        }));

        useEffect(() => {
            const stored = localStorage.getItem("tenant");
            const tenant = stored ? JSON.parse(stored) : null;
            setClientName(tenant?.name || "BasePoint Cloud");
        }, []);

        const loadAllForStats = async () => {
            try {
                const res = await fetchAllCustomers({ current: 1, pageSize: 500 });
                setAllCustomers(Array.isArray(res) ? res : res?.data || []);
            } catch { /* silent */ }
        };

        useEffect(() => { loadAllForStats(); }, []);

        const loadMobileData = async (page: number, name?: string, phone?: string, email?: string) => {
            setMobileLoading(true);
            try {
                const params: any = { current: page, pageSize: 15 };
                if (name) params.customer_name = name;
                if (phone) params.phone = phone;
                if (email) params.email = email;

                const res = await fetchAllCustomers(params);
                const incoming = Array.isArray(res) ? res : res?.data || [];
                const total = Array.isArray(res) ? incoming.length : res?.total || incoming.length;
                setMobileData(prev => page === 1 ? incoming : [...prev, ...incoming]);
                setMobileTotal(total);
                setMobilePage(page);
            } catch {
                messageApi.error("Failed to load customers");
            } finally {
                setMobileLoading(false);
            }
        };

        useEffect(() => { if (isMobile) loadMobileData(1); }, [isMobile]);

        const handleMobileSearch = () => {
            setMobileData([]);
            loadMobileData(1, mobileSearch, mobilePhoneSearch, mobileEmailSearch);
        };

        const clearMobileSearch = () => {
            setMobileSearch("");
            setMobilePhoneSearch("");
            setMobileEmailSearch("");
            setMobileData([]);
            loadMobileData(1, "", "", "");
        };

        const getLastVisit = (visits: any[]) => {
            if (!visits?.length) return null;
            return visits.reduce((p: any, c: any) =>
                new Date(c.createdAt) > new Date(p.createdAt) ? c : p
            ).createdAt;
        };

        const openGiftCardModal = (r: any) => { setCurrentCustomer(r); setGiftCardOpen(true); };

        const openGiftCardsHistory = async (r: any) => {
            setCurrentCustomer(r); setViewGiftCardsOpen(true); setLoadingGiftCards(true);
            try { setCustomerGiftCards(await fetchAllGiftCards(r._id)); }
            catch { messageApi.error("Failed to load gift cards"); }
            finally { setLoadingGiftCards(false); }
        };

        const openAllGiftCards = async () => {
            setAllGiftCardsOpen(true); setLoadingAllGiftCards(true);
            try { setAllGiftCards(await fetchAllGiftCards()); }
            catch { messageApi.error("Failed to load gift cards"); }
            finally { setLoadingAllGiftCards(false); }
        };

        const handleGiftCardCreated = (card: any) => {
            if (card.customer_id && currentCustomer) setCustomerGiftCards(prev => [...prev, card]);
            if (allGiftCards.length > 0) setAllGiftCards(prev => [...prev, card]);
        };

        const giftCardColumns = [
            {
                title: "Amount", dataIndex: "amount", key: "amount",
                render: (v: number) => (
                    <Text strong style={{ fontSize: 12, color: C.green }}>KES {(v || 0).toLocaleString()}</Text>
                ),
            },
            {
                title: "Recipient", key: "recipient",
                render: (_: any, r: any) => (
                    <Text style={{ fontSize: 12 }}>
                        {r.customer_name || r.customer_id?.customer_name || "Non-Customer"}
                    </Text>
                ),
            },
            {
                title: "Email", dataIndex: "email", key: "email",
                render: (v: string) => <Text style={{ fontSize: 12, color: C.subText }}>{v || "—"}</Text>,
            },
            {
                title: "Issue Date", dataIndex: "createdAt", key: "createdAt",
                render: (d: string) => (
                    <Text style={{ fontSize: 12 }}>{d ? new Date(d).toLocaleDateString("en-GB") : "—"}</Text>
                ),
            },
            {
                title: "Expiry", dataIndex: "expiry_date", key: "expiry_date",
                render: (d: string) => (
                    <Text style={{ fontSize: 12 }}>{d ? new Date(d).toLocaleDateString("en-GB") : "—"}</Text>
                ),
            },
            {
                title: "Status", dataIndex: "status", key: "status",
                render: (active: boolean) => <GiftStatusBadge active={active} />,
            },
            {
                title: "Actions", key: "actions",
                render: (_: any, r: any) => (
                    <div style={{ display: "flex", gap: 6 }}>
                        <Button size="small" icon={<EyeOutlined />} style={{ borderRadius: 6, fontSize: 11 }}
                            onClick={() => {
                                setCurrentGiftCard(r);
                                if (r.customer_id) setCurrentCustomer({ _id: r.customer_id });
                                setPreviewOpen(true);
                            }}>
                            Preview
                        </Button>
                        <Button size="small" icon={<MailOutlined />} style={{ borderRadius: 6, fontSize: 11 }}
                            onClick={() => { setCurrentGiftCard(r); setSendEmailOpen(true); }}>
                            Share
                        </Button>
                    </div>
                ),
            },
        ];

        const columns = [
            {
                title: "Code", dataIndex: "code", copyable: true,
                fieldProps: { placeholder: "Customer Code" },
                render: (text: string) => <Text copyable strong style={{ fontSize: 12 }}>{text}</Text>,
            },
            {
                title: "Name", dataIndex: "customer_name",
                fieldProps: { placeholder: "Customer Name" },
                render: (text: string) => <Text strong style={{ fontSize: 12 }}>{text}</Text>,
            },
            {
                title: "Email", dataIndex: "email", copyable: true,
                fieldProps: { placeholder: "Search by email..." },
                render: (text: string) => (
                    <Text style={{ fontSize: 12, color: C.subText }}>{text || "—"}</Text>
                ),
            },
            {
                title: "Phone", dataIndex: "phone", copyable: true,
                fieldProps: { placeholder: "Search by phone..." },
                render: (phone: string) => <Text style={{ fontSize: 12 }}>{phone || "—"}</Text>,
            },
                        {
                title: "Street Address", dataIndex: ["address", "street"], search: false,
                render: (street: string) => (
                    <Text style={{ fontSize: 12, color: C.subText }}>
                        {street || "—"}
                    </Text>
                ),
            },
            {
                title: "City", dataIndex: ["address", "city"], search: false,
                render: (city: string) => (
                    <Text style={{ fontSize: 12, color: C.subText }}>
                        {city || "—"}
                    </Text>
                ),
            },
            {
                title: "County", dataIndex: ["address", "county"], search: false,
                render: (county: string) => (
                    <Text style={{ fontSize: 12, color: C.subText }}>
                        {county || "—"}
                    </Text>
                ),
            },
            {
                title: "KRA PIN", dataIndex: "kra_pin", search: false,
                render: (pin: string) =>
                    pin ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <IdcardOutlined style={{ color: C.subText, fontSize: 11 }} />
                            <Text style={{ fontSize: 12 }}>{pin}</Text>
                        </div>
                    ) : <Text style={{ fontSize: 12, color: C.subText }}>—</Text>,
            },
            {
                title: "Status", dataIndex: "lastVisit", hideInSearch: true,
                render: (_: any, record: any) => <VisitBadge visits={record.visits || []} />,
            },
            {
                title: "Last Visit", key: "lastVisit", search: false,
                render: (_: any, record: any) => {
                    const lv = getLastVisit(record.visits || []);
                    return (
                        <Text style={{ fontSize: 12, color: C.subText }}>
                            {lv ? new Date(lv).toLocaleString("en-GB") : "No visits"}
                        </Text>
                    );
                },
            },
            {
                title: "Actions", key: "actions", search: false, fixed: "right" as const, width: 56,
                render: (_: any, record: any) => (
                    <Dropdown trigger={["click"]} menu={{
                        items: [
                            ...(onEditCustomer ? [{
                                key: "edit", icon: <EditOutlined />, label: "Edit Customer",
                                onClick: () => onEditCustomer(record),
                            }] : []),
                            // ── Gift card actions — only when POS is enabled ──
                            ...(giftCardsEnabled ? [
                                { key: "issue", icon: <GiftOutlined />, label: "Issue Gift Card", onClick: () => openGiftCardModal(record) },
                                { key: "history", icon: <HistoryOutlined />, label: "View Gift Cards", onClick: () => openGiftCardsHistory(record) },
                            ] : []),
                        ],
                    }}>
                        <Button type="text" icon={<MoreOutlined />} style={{ borderRadius: 6 }} />
                    </Dropdown>
                ),
            },
        ];

        const tabData: Record<GiftTab, any[]> = {
            all: allGiftCards,
            nonCustomers: allGiftCards.filter(c => !c.customer_id),
            customers: allGiftCards.filter(c => c.customer_id),
        };

        const GiftCardsContent = ({ cards, loading, emptyText }: {
            cards: any[]; loading: boolean; emptyText: string;
        }) => {
            if (loading) return (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <Text style={{ color: C.subText }}>Loading…</Text>
                </div>
            );
            if (!cards.length) return (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                    <GiftOutlined style={{ fontSize: 28, color: C.border, display: "block", margin: "0 auto 8px" }} />
                    <Text style={{ color: C.subText, fontSize: 13 }}>{emptyText}</Text>
                </div>
            );
            if (isMobile) return (
                <div>
                    {cards.map((card, i) => (
                        <GiftCardMobileCard
                            key={card._id || i} card={card}
                            onPreview={() => {
                                setCurrentGiftCard(card);
                                if (card.customer_id) setCurrentCustomer({ _id: card.customer_id });
                                setPreviewOpen(true);
                            }}
                            onShare={() => { setCurrentGiftCard(card); setSendEmailOpen(true); }}
                        />
                    ))}
                </div>
            );
            return (
                <Table
                    columns={giftCardColumns} dataSource={cards}
                    rowKey="_id" size="small" scroll={{ x: 760 }}
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText }}
                />
            );
        };

        // ── Gift card overlays — only rendered when POS is enabled ────────────
        const Overlays = (
            <>
                {giftCardsEnabled && (
                    <>
                        <GiftCardModal
                            currentCustomer={currentCustomer}
                            isGiftCardModalVisible={giftCardOpen}
                            setIsGiftCardModalVisible={setGiftCardOpen}
                            isNewRecipientModalVisible={newRecipientOpen}
                            setIsNewRecipientModalVisible={setNewRecipientOpen}
                            isPreviewModalVisible={previewOpen}
                            setIsPreviewModalVisible={setPreviewOpen}
                            isSendEmailModalVisible={sendEmailOpen}
                            setIsSendEmailModalVisible={setSendEmailOpen}
                            currentGiftCard={currentGiftCard}
                            setCurrentGiftCard={setCurrentGiftCard}
                            onGiftCardCreated={handleGiftCardCreated}
                            clientName={clientName}
                            primaryColor={C.primary}
                        />

                        {isMobile ? (
                            <Drawer open={viewGiftCardsOpen} onClose={() => setViewGiftCardsOpen(false)}
                                placement="bottom" height="auto" destroyOnClose
                                styles={{ body: { padding: "16px 16px 0" }, footer: { padding: "12px 16px" } }}
                                title={<ModalTitle icon={<GiftOutlined />} label={`Gift Cards — ${currentCustomer?.customer_name || ""}`} />}
                                footer={
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <Button block onClick={() => setViewGiftCardsOpen(false)} style={{ borderRadius: 8, height: 44 }}>Close</Button>
                                        <Button block type="primary" icon={<GiftOutlined />}
                                            onClick={() => { setViewGiftCardsOpen(false); openGiftCardModal(currentCustomer); }}
                                            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 44 }}>
                                            Issue Gift Card
                                        </Button>
                                    </div>
                                }>
                                <div style={{ maxHeight: "55vh", overflow: "auto", paddingBottom: 16 }}>
                                    <GiftCardsContent cards={customerGiftCards} loading={loadingGiftCards}
                                        emptyText="No gift cards for this customer" />
                                </div>
                            </Drawer>
                        ) : (
                            <Modal open={viewGiftCardsOpen} onCancel={() => setViewGiftCardsOpen(false)}
                                destroyOnClose style={{ top: 20 }} width="min(900px, 96vw)"
                                styles={{ body: { padding: "16px 20px", maxHeight: "70vh", overflow: "auto" } }}
                                title={<ModalTitle icon={<GiftOutlined />} label={`Gift Cards — ${currentCustomer?.customer_name || ""}`} />}
                                footer={[
                                    <Button key="close" onClick={() => setViewGiftCardsOpen(false)} style={{ borderRadius: 8 }}>Close</Button>,
                                    <Button key="new" type="primary" icon={<GiftOutlined />}
                                        onClick={() => { setViewGiftCardsOpen(false); openGiftCardModal(currentCustomer); }}
                                        style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
                                        Issue New Gift Card
                                    </Button>,
                                ]}>
                                <GiftCardsContent cards={customerGiftCards} loading={loadingGiftCards}
                                    emptyText="No gift cards for this customer" />
                            </Modal>
                        )}

                        {isMobile ? (
                            <Drawer open={allGiftCardsOpen} onClose={() => setAllGiftCardsOpen(false)}
                                placement="bottom" height="auto" destroyOnClose
                                styles={{ body: { padding: "16px 16px 0" }, footer: { padding: "12px 16px" } }}
                                title={<ModalTitle icon={<BarsOutlined />} label="All Gift Certificates" />}
                                footer={
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <Button block onClick={() => setAllGiftCardsOpen(false)} style={{ borderRadius: 8, height: 44 }}>Close</Button>
                                        <Button block type="primary" icon={<UserAddOutlined />}
                                            onClick={() => { setAllGiftCardsOpen(false); setNewRecipientOpen(true); }}
                                            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 44 }}>
                                            Non-Customer Card
                                        </Button>
                                    </div>
                                }>
                                <div style={{ maxHeight: "60vh", overflow: "auto", paddingBottom: 16 }}>
                                    <TabNav active={activeGiftTab} onChange={setActiveGiftTab} />
                                    <GiftCardsContent cards={tabData[activeGiftTab]} loading={loadingAllGiftCards}
                                        emptyText="No gift cards found" />
                                </div>
                            </Drawer>
                        ) : (
                            <Modal open={allGiftCardsOpen} onCancel={() => setAllGiftCardsOpen(false)}
                                destroyOnClose style={{ top: 20 }} width="min(960px, 96vw)"
                                styles={{ body: { padding: "16px 20px", maxHeight: "70vh", overflow: "auto" } }}
                                title={<ModalTitle icon={<BarsOutlined />} label="All Gift Certificates" />}
                                footer={[
                                    <Button key="close" onClick={() => setAllGiftCardsOpen(false)} style={{ borderRadius: 8 }}>Close</Button>,
                                    <Button key="new" type="primary" icon={<UserAddOutlined />}
                                        onClick={() => { setAllGiftCardsOpen(false); setNewRecipientOpen(true); }}
                                        style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
                                        New Non-Customer Gift Card
                                    </Button>,
                                ]}>
                                <TabNav active={activeGiftTab} onChange={setActiveGiftTab} />
                                <GiftCardsContent cards={tabData[activeGiftTab]} loading={loadingAllGiftCards}
                                    emptyText="No gift cards found" />
                            </Modal>
                        )}
                    </>
                )}
            </>
        );

        // ── Mobile layout ─────────────────────────────────────────────────────
        if (isMobile) {
            return (
                <App>
                    <AnalyticsPanel customers={allCustomers} />

                    {giftCardsEnabled && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                            <Button icon={<BarsOutlined />} onClick={openAllGiftCards}
                                style={{ flex: "1 1 160px", borderRadius: 8, height: 38 }}>
                                All Gift Certificates
                            </Button>
                            <Button type="primary" icon={<UserAddOutlined />}
                                onClick={() => setNewRecipientOpen(true)}
                                style={{ flex: "1 1 160px", background: C.primary, borderColor: C.primary, borderRadius: 8, height: 38 }}>
                                Non-Customer Gift Card
                            </Button>
                        </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                        <div>
                            <Text strong style={{ fontSize: 15, color: C.darkText, display: "block" }}>Customer List</Text>
                            <Text style={{ fontSize: 11, color: C.subText }}>{mobileTotal} total</Text>
                        </div>
                        <Button icon={<ReloadOutlined />}
                            onClick={() => { setMobileData([]); loadMobileData(1, mobileSearch, mobilePhoneSearch, mobileEmailSearch); loadAllForStats(); }}
                            style={{ borderRadius: 8 }} />
                    </div>

                    {/* Search inputs for mobile */}
                    <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        <Input
                            prefix={<SearchOutlined style={{ color: C.subText }} />}
                            placeholder="Search by name or code..."
                            value={mobileSearch}
                            onChange={e => setMobileSearch(e.target.value)}
                            allowClear
                            style={{ borderRadius: 8 }}
                        />
                        <Input
                            prefix={<PhoneOutlined style={{ color: C.subText }} />}
                            placeholder="Search by phone number..."
                            value={mobilePhoneSearch}
                            onChange={e => setMobilePhoneSearch(e.target.value)}
                            allowClear
                            style={{ borderRadius: 8 }}
                        />
                        <Input
                            prefix={<MailOutlined style={{ color: C.subText }} />}
                            placeholder="Search by email..."
                            value={mobileEmailSearch}
                            onChange={e => setMobileEmailSearch(e.target.value)}
                            allowClear
                            style={{ borderRadius: 8 }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                            <Button type="primary" onClick={handleMobileSearch} style={{ flex: 1, borderRadius: 8 }}>
                                Search
                            </Button>
                            <Button onClick={clearMobileSearch} style={{ flex: 1, borderRadius: 8 }}>
                                Clear
                            </Button>
                        </div>
                    </div>

                    {mobileData.length === 0 && !mobileLoading && (
                        <div style={{
                            background: "#fff", border: `1px solid ${C.border}`,
                            borderRadius: 10, padding: "32px 16px", textAlign: "center",
                        }}>
                            <Text style={{ color: C.subText, fontSize: 13 }}>No customers found</Text>
                        </div>
                    )}

                    {mobileData.map(record => (
                        <MobileCustomerCard
                            key={record._id} record={record}
                            onEdit={onEditCustomer ? () => onEditCustomer(record) : undefined}
                            onIssueGiftCard={() => openGiftCardModal(record)}
                            onViewGiftCards={() => openGiftCardsHistory(record)}
                            showGiftCards={giftCardsEnabled}
                        />
                    ))}

                    {mobileData.length < mobileTotal && (
                        <Button block loading={mobileLoading}
                            onClick={() => loadMobileData(mobilePage + 1, mobileSearch, mobilePhoneSearch, mobileEmailSearch)}
                            style={{ borderRadius: 8, marginTop: 4, borderColor: C.border }}>
                            Load More
                        </Button>
                    )}

                    {Overlays}
                </App>
            );
        }

        // ── Desktop layout ────────────────────────────────────────────────────
        return (
            <App>
                <AnalyticsPanel customers={allCustomers} />

                {giftCardsEnabled && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                        <Button icon={<BarsOutlined />} onClick={openAllGiftCards} style={{ borderRadius: 8 }}>
                            View All Gift Certificates
                        </Button>
                        <Button type="primary" icon={<UserAddOutlined />}
                            onClick={() => setNewRecipientOpen(true)}
                            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}>
                            Create Gift Card for Non-Customer
                        </Button>
                    </div>
                )}

                <ProTable
                    rowKey="_id"
                    columns={columns}
                    request={async (params) => {
                        const data = await fetchAllCustomers(params);
                        loadAllForStats();
                        return { data, success: true, total: data.length };
                    }}
                    actionRef={actionRef}
                    formRef={formRef}
                    cardBordered={false}
                    pagination={{
                        pageSize: 10, showQuickJumper: true, showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} customers`,
                    }}
                    search={{ searchText: "Search", resetText: "Reset", labelWidth: "auto" }}
                    headerTitle={<Text strong style={{ fontSize: 14, color: C.darkText }}>Customer List</Text>}
                    tableAlertRender={({ selectedRowKeys }) => (
                        <Text style={{ fontSize: 12 }}>Selected: {selectedRowKeys.length}</Text>
                    )}
                    expandable={{ expandedRowRender: (record) => <ExpandedRowContent record={record} /> }}
                    options={{ fullScreen: true, reload: () => { actionRef.current?.reload(); loadAllForStats(); } }}
                    scroll={{ x: "100%" }}
                    rowSelection={{ alwaysShowAlert: false }}
                    size="small"
                />

                {Overlays}
            </App>
        );
    }
);

CustomerTable.displayName = "CustomerTable";
export default CustomerTable;