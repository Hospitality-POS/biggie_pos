import { useEffect, useState } from "react";
import {
    App, Button, Input, Modal, Table, Tag, Tooltip, Typography,
} from "antd";
import {
    EyeOutlined, GiftOutlined, MailOutlined, ReloadOutlined,
    SearchOutlined, UserAddOutlined, UserOutlined,
    CheckCircleOutlined, ClockCircleOutlined, StopOutlined,
} from "@ant-design/icons";
import { fetchAllGiftCards, fetchAllCustomers } from "@services/customers";
import GiftCardModal from "../../components/MODALS/pro/GiftCardModal";

const { Text } = Typography;

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("en-KE");

const isExpired = (card: any) =>
    card.expiry_date && new Date(card.expiry_date) < new Date();

// ── Sub-tab type ────────────────────────────────────────────────────────────
type GiftTab = "all" | "customers" | "nonCustomers";

// ── Small KPI card ─────────────────────────────────────────────────────────
const KpiCard = ({
    icon, label, value, sub, color, bg,
}: {
    icon: React.ReactNode; label: string;
    value: string | number; sub?: string;
    color: string; bg: string;
}) => (
    <div style={{
        flex: "1 1 130px",
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderTop: `3px solid ${color}`,
        borderRadius: 10,
        padding: "12px 14px",
    }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <div style={{ background: bg, borderRadius: 6, padding: "4px 5px", color, fontSize: 13, lineHeight: 1 }}>
                {icon}
            </div>
            <Text style={{ fontSize: 11, color: "#64748b" }}>{label}</Text>
        </div>
        <Text strong style={{ fontSize: 20, color: "#0f172a", display: "block", lineHeight: 1.2 }}>{value}</Text>
        {sub && <Text style={{ fontSize: 11, color: "#64748b" }}>{sub}</Text>}
    </div>
);

// ── Status badge ───────────────────────────────────────────────────────────
const StatusBadge = ({ card }: { card: any }) => {
    if (isExpired(card))
        return <Tag color="default" icon={<ClockCircleOutlined />} style={{ fontSize: 10 }}>Expired</Tag>;
    if (!card.status)
        return <Tag color="red" icon={<StopOutlined />} style={{ fontSize: 10 }}>Inactive</Tag>;
    return <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontSize: 10 }}>Active</Tag>;
};

// ── Sub-tab nav ────────────────────────────────────────────────────────────
const TabNav = ({
    active, onChange, primaryColor, counts,
}: {
    active: GiftTab;
    onChange: (k: GiftTab) => void;
    primaryColor: string;
    counts: { all: number; customers: number; nonCustomers: number };
}) => {
    const tabs: { key: GiftTab; label: string }[] = [
        { key: "all", label: `All (${counts.all})` },
        { key: "customers", label: `Customers (${counts.customers})` },
        { key: "nonCustomers", label: `Non-Customer (${counts.nonCustomers})` },
    ];
    return (
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {tabs.map(({ key, label }) => {
                const isActive = key === active;
                return (
                    <button
                        key={key}
                        onClick={() => onChange(key)}
                        style={{
                            padding: "5px 14px", borderRadius: 20, cursor: "pointer",
                            fontSize: 12, fontWeight: isActive ? 600 : 400, outline: "none",
                            border: isActive ? `1.5px solid ${primaryColor}` : "1px solid #e2e8f0",
                            background: isActive ? primaryColor : "#fff",
                            color: isActive ? "#fff" : "#64748b",
                        }}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
};

// ── Main component ─────────────────────────────────────────────────────────
interface GiftCardsTabProps {
    primaryColor?: string;
}

export default function GiftCardsTab({ primaryColor = "#6c1c2c" }: GiftCardsTabProps) {
    const { message: messageApi } = App.useApp();

    // ── Gift card state ────────────────────────────────────────────────────
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<GiftTab>("all");
    const [search, setSearch] = useState("");

    // ── Modal state ────────────────────────────────────────────────────────
    const [giftCardOpen, setGiftCardOpen] = useState(false);
    const [newRecipientOpen, setNewRecipientOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [sendEmailOpen, setSendEmailOpen] = useState(false);
    const [currentGiftCard, setCurrentGiftCard] = useState<any>(null);
    const [currentCustomer, setCurrentCustomer] = useState<any>(null);

    // ── Customer picker ────────────────────────────────────────────────────
    const [pickerOpen, setPickerOpen] = useState(false);
    const [allCustomers, setAllCustomers] = useState<any[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [pickerSearch, setPickerSearch] = useState("");

    // ── clientName from tenant ─────────────────────────────────────────────
    const [clientName, setClientName] = useState("BasePoint Cloud");
    useEffect(() => {
        try {
            const t = JSON.parse(localStorage.getItem("tenant") || "{}");
            setClientName(t?.company_name || "BasePoint Cloud");
        } catch { /* ignore */ }
    }, []);

    // ── Load all gift cards ────────────────────────────────────────────────
    const loadCards = async () => {
        setLoading(true);
        try {
            const data = await fetchAllGiftCards();
            setCards(Array.isArray(data) ? data : data?.data || []);
        } catch {
            messageApi.error("Failed to load gift cards");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadCards(); }, []);

    // ── Customer picker loader ─────────────────────────────────────────────
    const openCustomerPicker = async () => {
        setPickerSearch("");
        setPickerOpen(true);
        if (allCustomers.length) return;
        setLoadingCustomers(true);
        try {
            const res = await fetchAllCustomers({});
            setAllCustomers(
                Array.isArray(res) ? res : res?.data || []
            );
        } catch {
            messageApi.error("Could not load customers");
        } finally {
            setLoadingCustomers(false);
        }
    };

    const pickCustomer = (customer: any) => {
        setCurrentCustomer(customer);
        setPickerOpen(false);
        setGiftCardOpen(true);
    };

    // ── Gift card created callback ─────────────────────────────────────────
    const handleCreated = (card: any) => {
        setCards((prev) => [card, ...prev]);
    };

    // ── KPI calculations ───────────────────────────────────────────────────
    const totalCards = cards.length;
    const activeCards = cards.filter((c) => c.status && !isExpired(c)).length;
    const expiredCards = cards.filter(isExpired).length;
    const totalValue = cards.reduce((s, c) => s + (c.amount || 0), 0);
    const redeemedValue = cards.reduce((s, c) => s + (c.amount_redeemed || 0), 0);

    // ── Filtered cards ─────────────────────────────────────────────────────
    const tabFiltered = cards.filter((c) =>
        tab === "customers" ? !!c.customer_id
            : tab === "nonCustomers" ? !c.customer_id
                : true
    );
    const displayed = tabFiltered.filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            (c.code || "").toLowerCase().includes(q) ||
            (c.customer_name || "").toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q)
        );
    });

    const counts = {
        all: cards.length,
        customers: cards.filter((c) => !!c.customer_id).length,
        nonCustomers: cards.filter((c) => !c.customer_id).length,
    };

    // ── Table columns ──────────────────────────────────────────────────────
    const columns = [
        {
            title: "Code",
            dataIndex: "code",
            key: "code",
            render: (v: string) => (
                <Text copyable strong style={{ fontSize: 12, fontFamily: "monospace", color: primaryColor }}>
                    {v}
                </Text>
            ),
        },
        {
            title: "Recipient",
            key: "recipient",
            render: (_: any, r: any) => (
                <div>
                    <Text strong style={{ fontSize: 12 }}>
                        {r.customer_name || r.customer_id?.customer_name || "Non-Customer"}
                    </Text>
                    {r.email && (
                        <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>
                            {r.email}
                        </Text>
                    )}
                </div>
            ),
        },
        {
            title: "Amount",
            dataIndex: "amount",
            key: "amount",
            render: (v: number) => (
                <Text strong style={{ fontSize: 12, color: "#10b981" }}>
                    KES {fmt(v || 0)}
                </Text>
            ),
        },
        {
            title: "Message",
            key: "message",
            render: (_: any, r: any) => {
                const msg = r.personalized_message || r.message || "";
                if (!msg) return <Text style={{ color: "#94a3b8", fontSize: 11 }}>—</Text>;
                const truncated = msg.length > 40 ? msg.slice(0, 40) + "…" : msg;
                return (
                    <Tooltip title={msg} placement="topLeft">
                        <Text style={{ fontSize: 11, color: "#64748b", fontStyle: "italic", cursor: "default" }}>
                            "{truncated}"
                        </Text>
                    </Tooltip>
                );
            },
        },
        {
            title: "Issued",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (d: string) => (
                <Text style={{ fontSize: 12 }}>
                    {d ? new Date(d).toLocaleDateString("en-GB") : "—"}
                </Text>
            ),
        },
        {
            title: "Expiry",
            dataIndex: "expiry_date",
            key: "expiry_date",
            render: (d: string) => {
                const expired = d && new Date(d) < new Date();
                return (
                    <Text style={{ fontSize: 12, color: expired ? "#ef4444" : undefined }}>
                        {d ? new Date(d).toLocaleDateString("en-GB") : "—"}
                    </Text>
                );
            },
        },
        {
            title: "Status",
            key: "status",
            render: (_: any, r: any) => <StatusBadge card={r} />,
        },
        {
            title: "Actions",
            key: "actions",
            render: (_: any, r: any) => (
                <div style={{ display: "flex", gap: 6 }}>
                    <Button
                        size="small" icon={<EyeOutlined />}
                        style={{ borderRadius: 6, fontSize: 11, color: primaryColor, borderColor: primaryColor }}
                        onClick={() => {
                            setCurrentGiftCard(r);
                            if (r.customer_id) setCurrentCustomer({ _id: r.customer_id });
                            setPreviewOpen(true);
                        }}
                    >
                        Preview
                    </Button>
                    <Button
                        size="small" icon={<MailOutlined />}
                        style={{ borderRadius: 6, fontSize: 11 }}
                        onClick={() => {
                            setCurrentGiftCard(r);
                            setSendEmailOpen(true);
                        }}
                    >
                        Share
                    </Button>
                </div>
            ),
        },
    ];

    // ── Customer picker filtered list ─────────────────────────────────────
    const filteredCustomers = allCustomers.filter((c) => {
        if (!pickerSearch) return true;
        const q = pickerSearch.toLowerCase();
        return (
            (c.customer_name || "").toLowerCase().includes(q) ||
            (c.phone || "").toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q)
        );
    });

    return (
        <div>
            {/* ── KPI strip ── */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
                <KpiCard
                    icon={<GiftOutlined />}
                    label="Total Issued"
                    value={totalCards}
                    sub={`${activeCards} active`}
                    color="#6366f1"
                    bg="#eef2ff"
                />
                <KpiCard
                    icon={<CheckCircleOutlined />}
                    label="Active"
                    value={activeCards}
                    sub={`${totalCards ? Math.round((activeCards / totalCards) * 100) : 0}% of total`}
                    color="#10b981"
                    bg="#f0fdf4"
                />
                <KpiCard
                    icon={<ClockCircleOutlined />}
                    label="Expired"
                    value={expiredCards}
                    color="#f59e0b"
                    bg="#fffbeb"
                />
                <KpiCard
                    icon={<GiftOutlined />}
                    label="Total Value"
                    value={`KES ${fmt(totalValue)}`}
                    sub={`KES ${fmt(redeemedValue)} redeemed`}
                    color={primaryColor}
                    bg={primaryColor + "15"}
                />
            </div>

            {/* ── Toolbar ── */}
            <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap", gap: 8,
                marginBottom: 14,
            }}>
                <Input
                    prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                    placeholder="Search by code, name or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                    style={{ maxWidth: 300, borderRadius: 8 }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={loadCards}
                        loading={loading}
                        style={{ borderRadius: 8 }}
                    />
                    <Button
                        icon={<UserOutlined />}
                        onClick={openCustomerPicker}
                        style={{ borderRadius: 8 }}
                    >
                        Issue for Customer
                    </Button>
                    <Button
                        type="primary"
                        icon={<UserAddOutlined />}
                        onClick={() => setNewRecipientOpen(true)}
                        style={{ background: primaryColor, borderColor: primaryColor, borderRadius: 8 }}
                    >
                        Non-Customer Card
                    </Button>
                </div>
            </div>

            {/* ── Sub-tabs ── */}
            <TabNav
                active={tab}
                onChange={setTab}
                primaryColor={primaryColor}
                counts={counts}
            />

            {/* ── Gift card table ── */}
            <Table
                columns={columns}
                dataSource={displayed}
                rowKey="_id"
                loading={loading}
                size="small"
                scroll={{ x: 860 }}
                pagination={{ pageSize: 15, showSizeChanger: false }}
                locale={{
                    emptyText: (
                        <div style={{ padding: "32px 0", textAlign: "center" }}>
                            <GiftOutlined style={{ fontSize: 28, color: "#e2e8f0", display: "block", margin: "0 auto 8px" }} />
                            <Text style={{ color: "#94a3b8", fontSize: 13 }}>
                                {search ? "No gift cards match your search" : "No gift cards yet"}
                            </Text>
                        </div>
                    ),
                }}
            />

            {/* ── GiftCardModal (handles create + preview + send) ── */}
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
                onGiftCardCreated={handleCreated}
                clientName={clientName}
                primaryColor={primaryColor}
            />

            {/* ── Customer picker modal ── */}
            <Modal
                open={pickerOpen}
                onCancel={() => setPickerOpen(false)}
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                            background: primaryColor + "20", borderRadius: 7,
                            padding: "4px 6px", color: primaryColor, fontSize: 14, lineHeight: 1,
                        }}>
                            <UserOutlined />
                        </div>
                        <Text strong style={{ fontSize: 14, color: "#0f172a" }}>
                            Select Customer
                        </Text>
                    </div>
                }
                footer={null}
                width={520}
                destroyOnClose
                centered
            >
                <Input
                    prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                    placeholder="Search by name, phone or email…"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    allowClear
                    style={{ marginBottom: 12, borderRadius: 8 }}
                />
                <div style={{ maxHeight: 380, overflow: "auto" }}>
                    {loadingCustomers ? (
                        <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}>
                            Loading customers…
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}>
                            No customers found
                        </div>
                    ) : (
                        filteredCustomers.map((c) => (
                            <div
                                key={c._id}
                                onClick={() => pickCustomer(c)}
                                style={{
                                    display: "flex", alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "10px 12px", borderRadius: 8,
                                    cursor: "pointer", marginBottom: 4,
                                    border: "1px solid #e2e8f0",
                                    transition: "background 0.12s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = primaryColor + "10")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{
                                        width: 34, height: 34, borderRadius: "50%",
                                        background: primaryColor + "20",
                                        display: "flex", alignItems: "center",
                                        justifyContent: "center", flexShrink: 0,
                                    }}>
                                        <Text style={{ color: primaryColor, fontWeight: 700, fontSize: 13 }}>
                                            {(c.customer_name || "?").charAt(0).toUpperCase()}
                                        </Text>
                                    </div>
                                    <div>
                                        <Text strong style={{ fontSize: 13, color: "#0f172a", display: "block" }}>
                                            {c.customer_name}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: "#64748b" }}>
                                            {c.phone || c.email || "—"}
                                        </Text>
                                    </div>
                                </div>
                                <GiftOutlined style={{ color: primaryColor, opacity: 0.6, fontSize: 16 }} />
                            </div>
                        ))
                    )}
                </div>
            </Modal>
        </div>
    );
}
