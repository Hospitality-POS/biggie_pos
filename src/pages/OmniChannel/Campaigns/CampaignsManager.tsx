import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Button, Card, Col, Dropdown, Empty, Grid, Popconfirm, Progress, Row, Segmented, Space, Steps, Table, Tag, Tooltip, Typography,
} from "antd";
import {
    PlusOutlined, SettingOutlined, MoreOutlined,
    EyeOutlined, SendOutlined, DeleteOutlined, MessageOutlined, MailOutlined,
    ThunderboltOutlined, ArrowRightOutlined, ReloadOutlined, BarChartOutlined,
    UnorderedListOutlined, CheckCircleOutlined, CloseCircleOutlined, TeamOutlined, ShopOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchCampaigns, fetchSenders, sendCampaign, deleteCampaign, MessageCampaign, CampaignStatus, MessagingChannel,
} from "@services/omnichannel/messagingCampaigns";
import { fetchWhatsappChannels } from "@services/whatsappService";
import { THEME_C } from "@utils/getPrimaryColor";
import SenderConfigDrawer from "./SenderConfigDrawer";
import CampaignFormModal from "./CampaignFormModal";
import CampaignDetailDrawer from "./CampaignDetailDrawer";
import QuickSendModal from "./QuickSendModal";
import MessagingAnalytics from "./MessagingAnalytics";
import { cardChrome, KpiTile, PageHeader, TONES, useMarketplace } from "../shared/ui";

const { Text } = Typography;
const C = THEME_C;

interface Props {
    shopId: string;
    channel: MessagingChannel;
}

const STATUS_CFG: Record<CampaignStatus, { color: string; bg: string; border: string }> = {
    draft: { color: C.subText, bg: C.bg, border: C.border },
    scheduled: { color: C.blue, bg: "#eff6ff", border: "#bfdbfe" },
    sending: { color: C.orange, bg: "#fffbeb", border: "#fed7aa" },
    completed: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    failed: { color: C.red, bg: "#fef2f2", border: "#fecaca" },
    cancelled: { color: C.subText, bg: C.bg, border: C.border },
};

type StatusFilter = "all" | "draft" | "sending" | "completed" | "failed";

// Promo copy for "shop with us on WhatsApp" — the wa.me link opens a chat
// with MENU already typed, which starts the guided shopping flow.
const buildWhatsappPromo = (isSms: boolean, shopName: string, phone: string | null, mp: any) => {
    const digits = (phone || "").replace(/\D/g, "");
    const link = digits ? `https://wa.me/${digits}?text=MENU` : null;
    const extras = [
        mp?.sell_gift_cards !== false ? "gift cards" : null,
        mp?.sell_services !== false && mp?.booking_enabled !== false ? "appointments" : null,
    ].filter(Boolean);
    const what = ["shop", ...extras].join(", ").replace(/, ([^,]*)$/, " & $1");
    if (isSms) {
        return {
            subject: undefined,
            message:
                `${shopName || "We"}: you can now ${what} on WhatsApp! ` +
                (link ? `Tap ${link} ` : `Message us on WhatsApp${phone ? ` (${phone})` : ""} `) +
                `and reply MENU. Pay by M-Pesa, collect or get it delivered.`,
        };
    }
    return {
        subject: `Shop ${shopName || "with us"} on WhatsApp 🛍️`,
        message:
            `Hi there,\n\nYou can now ${what} with ${shopName || "us"} right inside WhatsApp — no app or website needed.\n\n` +
            `• Browse our catalogue and order in a few messages\n` +
            `• Pay with M-Pesa and get your order code instantly\n` +
            `• Collect at the shop or have it delivered\n\n` +
            (link ? `Start here: ${link}\n\n` : phone ? `Message us on WhatsApp: ${phone}\n\n` : "") +
            `Just say MENU to get started.\n\nSee you soon!`,
    };
};

const CampaignsManager: React.FC<Props> = ({ shopId, channel }) => {
    const queryClient = useQueryClient();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const isSms = channel === "sms";
    const { enabled: marketplaceOn, config: mp, shopName } = useMarketplace(shopId);

    const [sendersOpen, setSendersOpen] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [promo, setPromo] = useState<{ message?: string; subject?: string } | null>(null);
    const [quickSendOpen, setQuickSendOpen] = useState(false);
    const [detailId, setDetailId] = useState<string | null>(null);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [view, setView] = useState<"messages" | "analysis">("messages");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["message-campaigns", shopId, channel],
        queryFn: () => fetchCampaigns({ shop_id: shopId, channel }),
        enabled: !!shopId,
        staleTime: 30_000,
        // Auto-refresh while any campaign is actively sending so statuses/counts
        // (sent/failed) update without a manual refresh.
        refetchInterval: (data) =>
            data?.campaigns?.some((c) => c.status === "sending") ? 5000 : false,
    });
    const campaigns = data?.campaigns || [];

    const { data: sendersData, isLoading: sendersLoading } = useQuery({
        queryKey: ["messaging-senders", shopId, channel],
        queryFn: () => fetchSenders({ shop_id: shopId, channel }),
        enabled: !!shopId,
        staleTime: 60_000,
    });
    const hasSender = (sendersData?.senders || []).length > 0;

    const { data: channelsData } = useQuery({
        queryKey: ["omnichannel-channels", shopId],
        queryFn: () => fetchWhatsappChannels({ shop_id: shopId }),
        enabled: !!shopId && marketplaceOn,
        staleTime: 60_000,
    });
    const waChannel = (channelsData?.channels || []).find((c: any) => c.channel === "whatsapp" && c.is_active);
    const waPhone: string | null = waChannel?.display_phone_number || waChannel?.phone_number_id || null;

    const totals = useMemo(() => {
        const recipients = campaigns.reduce((s, c) => s + (c.total_recipients || 0), 0);
        const sent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
        const failed = campaigns.reduce((s, c) => s + (c.failed_count || 0), 0);
        return { recipients, sent, failed, rate: sent + failed ? Math.round((sent / (sent + failed)) * 100) : null };
    }, [campaigns]);

    const filtered = statusFilter === "all"
        ? campaigns
        : campaigns.filter((c) => (statusFilter === "draft" ? c.status === "draft" || c.status === "scheduled" : c.status === statusFilter));

    const reload = () => queryClient.invalidateQueries({ queryKey: ["message-campaigns", shopId, channel] });

    const handleSend = async (id: string) => {
        setSendingId(id);
        try {
            await sendCampaign(id, shopId);
            reload();
        } catch {
            /* toast handled in service */
        } finally {
            setSendingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        await deleteCampaign(id, shopId);
        reload();
    };

    const openPromo = () => {
        setPromo(buildWhatsappPromo(isSms, shopName, waPhone, mp));
        setFormOpen(true);
    };

    const columns = [
        {
            title: "Campaign", dataIndex: "name",
            render: (name: string, r: MessageCampaign) => (
                <div>
                    <Space size={6}>
                        <Text strong style={{ fontSize: 12.5 }}>{name}</Text>
                        {r.is_quick_send && (
                            <Tag style={{ fontSize: 9, lineHeight: "14px", padding: "0 5px" }} color="purple">QUICK SEND</Tag>
                        )}
                    </Space>
                    <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>
                        {r.channel === "sms" ? <MessageOutlined /> : <MailOutlined />} {r.channel.toUpperCase()} · {r.audience} ·{" "}
                        {new Date(r.createdAt).toLocaleDateString()}
                    </Text>
                </div>
            ),
        },
        {
            title: "Status", dataIndex: "status", width: 120,
            render: (s: CampaignStatus) => {
                const cfg = STATUS_CFG[s] ?? STATUS_CFG.draft;
                return (
                    <span style={{
                        display: "inline-flex", alignItems: "center", borderRadius: 5,
                        padding: "2px 8px", fontSize: 10, fontWeight: 700,
                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                    }}>
                        {s.toUpperCase()}
                    </span>
                );
            },
        },
        {
            title: "Delivery", key: "delivery", width: 220,
            render: (_: any, r: MessageCampaign) => {
                const done = (r.sent_count || 0) + (r.failed_count || 0);
                const pct = r.total_recipients ? Math.round((done / r.total_recipients) * 100) : 0;
                return (
                    <div style={{ minWidth: 160 }}>
                        <Progress
                            percent={pct}
                            success={{ percent: r.total_recipients ? Math.round(((r.sent_count || 0) / r.total_recipients) * 100) : 0 }}
                            size="small"
                            showInfo={false}
                            status={r.status === "sending" ? "active" : undefined}
                            strokeColor={r.failed_count ? "#fca5a5" : undefined}
                        />
                        <Text style={{ fontSize: 11, color: C.subText }}>
                            <span style={{ color: "#16a34a" }}>{r.sent_count || 0} sent</span>
                            {r.failed_count ? <span style={{ color: C.red }}> · {r.failed_count} failed</span> : null}
                            {" "}of {r.total_recipients}
                        </Text>
                    </div>
                );
            },
        },
        {
            title: "", key: "actions", fixed: "right" as const, width: 96, align: "right" as const,
            render: (_: any, r: MessageCampaign) => (
                <Space size={0}>
                    {(r.status === "draft" || r.status === "scheduled") && (
                        <Popconfirm
                            title={`Send to ${r.total_recipients} recipient${r.total_recipients === 1 ? "" : "s"} now?`}
                            okText="Send"
                            onConfirm={() => handleSend(r._id)}
                        >
                            <Tooltip title="Send now">
                                <Button type="text" icon={<SendOutlined />} loading={sendingId === r._id} style={{ color: C.primary }} />
                            </Tooltip>
                        </Popconfirm>
                    )}
                    <Dropdown trigger={["click"]} menu={{
                        items: [
                            { key: "view", icon: <EyeOutlined />, label: "View details", onClick: () => setDetailId(r._id) },
                            { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true, onClick: () => handleDelete(r._id) },
                        ],
                    }}>
                        <Button type="text" icon={<MoreOutlined />} style={{ borderRadius: 6 }} />
                    </Dropdown>
                </Space>
            ),
        },
    ];

    const label = isSms ? "SMS" : "email";

    return (
        <div style={{ padding: isMobile ? 12 : 20, height: "100%", overflowY: "auto" }}>
            <PageHeader
                icon={isSms ? <MessageOutlined /> : <MailOutlined />}
                {...(isSms ? TONES.teal : TONES.indigo)}
                title={isSms ? "SMS Messaging" : "Email Messaging"}
                marketplace={marketplaceOn}
                subtitle={
                    <>
                        Bulk blasts and one-off {label}s to leads & customers from your own sender.{" "}
                        <Link to="/crm/campaigns">
                            Budgets & ROI live in CRM → Campaigns <ArrowRightOutlined />
                        </Link>
                    </>
                }
                extra={
                    <>
                        <Segmented
                            value={view}
                            onChange={(v) => setView(v as "messages" | "analysis")}
                            options={[
                                { value: "messages", icon: <UnorderedListOutlined />, label: isMobile ? undefined : "Campaigns" },
                                { value: "analysis", icon: <BarChartOutlined />, label: isMobile ? undefined : "Analysis" },
                            ]}
                        />
                        <Tooltip title="Sender settings">
                            <Button icon={<SettingOutlined />} onClick={() => setSendersOpen(true)}>
                                {isMobile ? null : hasSender ? "Senders" : "Connect sender"}
                            </Button>
                        </Tooltip>
                        <Button icon={<ThunderboltOutlined />} onClick={() => setQuickSendOpen(true)} disabled={!hasSender}>
                            Quick send
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => { setPromo(null); setFormOpen(true); }}
                            disabled={!hasSender}
                            style={hasSender ? { background: C.primary, borderColor: C.primary } : undefined}
                        >
                            New campaign
                        </Button>
                    </>
                }
            />

            {view === "analysis" ? (
                <MessagingAnalytics shopId={shopId} channel={channel} />
            ) : (
                <>
                    {!sendersLoading && !hasSender ? (
                        // First-run: nothing works until a sender is connected.
                        <Card size="small" style={{ ...cardChrome, marginBottom: 16 }} styles={{ body: { padding: isMobile ? 16 : 24 } }}>
                            <Row gutter={[24, 16]} align="middle">
                                <Col xs={24} md={14}>
                                    <Text strong style={{ fontSize: 15, display: "block", marginBottom: 4 }}>
                                        Send your first {label} campaign
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 12.5, display: "block", marginBottom: 16 }}>
                                        Use your own {isSms ? "SMS gateway (Africa's Talking, Onfon, Twilio…)" : "email provider (SMTP, Brevo, SendGrid…)"} so messages go out under your name.
                                    </Text>
                                    <Steps
                                        direction="vertical"
                                        size="small"
                                        current={0}
                                        items={[
                                            { title: "Connect a sender", description: "Add your provider's credentials once" },
                                            { title: "Pick an audience", description: "Customers, leads, an Excel list or pasted numbers" },
                                            { title: "Write & send", description: "Send now, and track delivery here" },
                                        ]}
                                    />
                                </Col>
                                <Col xs={24} md={10} style={{ textAlign: isMobile ? "left" : "center" }}>
                                    <Button type="primary" size="large" icon={<SettingOutlined />} onClick={() => setSendersOpen(true)}
                                        style={{ background: C.primary, borderColor: C.primary }}>
                                        Connect {isSms ? "SMS" : "email"} sender
                                    </Button>
                                </Col>
                            </Row>
                        </Card>
                    ) : (
                        <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
                            {[
                                { title: "Campaigns", value: campaigns.length, icon: <UnorderedListOutlined />, ...TONES.blue },
                                { title: "Recipients", value: totals.recipients.toLocaleString(), icon: <TeamOutlined />, ...TONES.indigo },
                                { title: `${isSms ? "SMS" : "Emails"} sent`, value: totals.sent.toLocaleString(), icon: <CheckCircleOutlined />, ...TONES.green },
                                {
                                    title: "Delivery rate",
                                    value: totals.rate == null ? "—" : `${totals.rate}%`,
                                    icon: <CloseCircleOutlined />,
                                    hint: `${totals.failed} failed`,
                                    ...(totals.rate != null && totals.rate < 90 ? TONES.red : TONES.teal),
                                },
                            ].map((k) => (
                                <Col xs={12} md={6} key={k.title}>
                                    <KpiTile {...k} loading={isLoading} />
                                </Col>
                            ))}
                        </Row>
                    )}

                    {marketplaceOn && hasSender && (
                        <Card
                            size="small"
                            style={{ ...cardChrome, marginBottom: 16, background: "linear-gradient(135deg,#f0fdf4 0%,#ffffff 70%)", borderColor: "#bbf7d0" }}
                            styles={{ body: { padding: 14 } }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                <Space align="start" size={10}>
                                    <ShopOutlined style={{ color: "#16a34a", fontSize: 18, marginTop: 2 }} />
                                    <div>
                                        <Text strong style={{ display: "block" }}>Bring customers to your WhatsApp shop</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            A ready-made {label} with a link that opens WhatsApp with <b>MENU</b> typed — customers can order,
                                            buy gift cards or book in a few taps.
                                            {!waPhone && " Connect WhatsApp first to include the link."}
                                        </Text>
                                    </div>
                                </Space>
                                <Button icon={<SendOutlined />} onClick={openPromo} style={{ borderColor: "#16a34a", color: "#16a34a" }}>
                                    Create promo {label}
                                </Button>
                            </div>
                        </Card>
                    )}

                    {(hasSender || campaigns.length > 0) && (
                        <Card size="small" style={{ ...cardChrome, overflow: "hidden" }} styles={{ body: { padding: 0 } }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", gap: 8, flexWrap: "wrap", borderBottom: "1px solid #f1f5f9" }}>
                                <Segmented
                                    size="small"
                                    value={statusFilter}
                                    onChange={(v) => setStatusFilter(v as StatusFilter)}
                                    options={[
                                        { value: "all", label: `All (${campaigns.length})` },
                                        { value: "draft", label: "Drafts" },
                                        { value: "sending", label: "Sending" },
                                        { value: "completed", label: "Completed" },
                                        { value: "failed", label: "Failed" },
                                    ]}
                                />
                                <Tooltip title="Refresh">
                                    <Button size="small" icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()} />
                                </Tooltip>
                            </div>
                            <Table
                                rowKey="_id"
                                columns={columns}
                                dataSource={filtered}
                                loading={isLoading}
                                size="middle"
                                pagination={filtered.length > 10 ? { pageSize: 10, size: "small" } : false}
                                scroll={{ x: 640 }}
                                onRow={(r) => ({ onDoubleClick: () => setDetailId(r._id) })}
                                locale={{
                                    emptyText: (
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description={statusFilter === "all" ? `No ${label} campaigns yet` : "Nothing with this status"}
                                        >
                                            {statusFilter === "all" && hasSender && (
                                                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setPromo(null); setFormOpen(true); }}>
                                                    New campaign
                                                </Button>
                                            )}
                                        </Empty>
                                    ),
                                }}
                            />
                        </Card>
                    )}
                </>
            )}

            <SenderConfigDrawer
                open={sendersOpen}
                onClose={() => {
                    setSendersOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["messaging-senders", shopId, channel] });
                }}
                shopId={shopId}
                defaultChannel={channel}
            />
            <CampaignFormModal
                open={formOpen}
                onClose={() => { setFormOpen(false); setPromo(null); }}
                onSuccess={reload}
                shopId={shopId}
                channel={channel}
                initialMessage={promo?.message}
                initialSubject={promo?.subject}
            />
            <CampaignDetailDrawer
                open={!!detailId}
                onClose={() => setDetailId(null)}
                campaignId={detailId}
                shopId={shopId}
            />
            <QuickSendModal
                open={quickSendOpen}
                onClose={() => setQuickSendOpen(false)}
                onSuccess={reload}
                shopId={shopId}
                channel={channel}
            />
        </div>
    );
};

export default CampaignsManager;
