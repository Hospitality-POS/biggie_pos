import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Grid, Segmented, Space, Typography, Table, Dropdown, Tooltip, Tag } from "antd";
import {
    PlusOutlined, SettingOutlined, MoreOutlined,
    EyeOutlined, SendOutlined, DeleteOutlined, MessageOutlined, MailOutlined,
    ThunderboltOutlined, ArrowRightOutlined, ReloadOutlined, BarChartOutlined,
    UnorderedListOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchCampaigns, sendCampaign, deleteCampaign, MessageCampaign, CampaignStatus, MessagingChannel,
} from "@services/omnichannel/messagingCampaigns";
import { THEME_C } from "@utils/getPrimaryColor";
import SenderConfigDrawer from "./SenderConfigDrawer";
import CampaignFormModal from "./CampaignFormModal";
import CampaignDetailDrawer from "./CampaignDetailDrawer";
import QuickSendModal from "./QuickSendModal";
import MessagingAnalytics from "./MessagingAnalytics";

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
    completed: { color: C.green, bg: "#f0fdf4", border: "#bbf7d0" },
    failed: { color: C.red, bg: "#fef2f2", border: "#fecaca" },
    cancelled: { color: C.subText, bg: C.bg, border: C.border },
};

const CampaignsManager: React.FC<Props> = ({ shopId, channel }) => {
    const queryClient = useQueryClient();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const isSms = channel === "sms";

    const [sendersOpen, setSendersOpen] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [quickSendOpen, setQuickSendOpen] = useState(false);
    const [detailId, setDetailId] = useState<string | null>(null);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [view, setView] = useState<"messages" | "analysis">("messages");

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

    const columns = [
        {
            title: "Campaign", dataIndex: "name",
            render: (name: string, r: MessageCampaign) => (
                <div>
                    <Space size={6}>
                        <Text strong style={{ fontSize: 12 }}>{name}</Text>
                        {r.is_quick_send && (
                            <Tag style={{ fontSize: 9, lineHeight: "14px", padding: "0 5px" }} color="purple">QUICK SEND</Tag>
                        )}
                    </Space>
                    <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>
                        {r.channel === "sms" ? <MessageOutlined /> : <MailOutlined />} {r.channel.toUpperCase()} · {r.audience}
                    </Text>
                </div>
            ),
        },
        {
            title: "Status", dataIndex: "status",
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
            title: "Recipients", dataIndex: "total_recipients",
            render: (v: number) => <Text style={{ fontSize: 12 }}>{v}</Text>,
        },
        {
            title: "Sent", dataIndex: "sent_count",
            render: (v: number) => <Text style={{ fontSize: 12, color: C.blue }}>{v}</Text>,
        },
        {
            title: "Failed", dataIndex: "failed_count",
            render: (v: number) => <Text style={{ fontSize: 12, color: v ? C.red : C.subText }}>{v}</Text>,
        },
        {
            title: "Created", dataIndex: "createdAt",
            render: (v: string) => <Text style={{ fontSize: 12 }}>{new Date(v).toLocaleDateString()}</Text>,
        },
        {
            title: "Actions", key: "actions", fixed: "right" as const, width: 56,
            render: (_: any, r: MessageCampaign) => (
                <Dropdown trigger={["click"]} menu={{
                    items: [
                        { key: "view", icon: <EyeOutlined />, label: "View Details", onClick: () => setDetailId(r._id) },
                        ...(r.status === "draft" || r.status === "scheduled"
                            ? [{ key: "send", icon: <SendOutlined />, label: "Send Now", onClick: () => handleSend(r._id) }]
                            : []),
                        { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true, onClick: () => handleDelete(r._id) },
                    ],
                }}>
                    <Button type="text" icon={<MoreOutlined />} style={{ borderRadius: 6 }} loading={sendingId === r._id} />
                </Dropdown>
            ),
        },
    ];

    return (
        <div style={{ padding: isMobile ? "0 12px 12px" : "0 24px 24px", height: "100%", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "16px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: C.primaryLight, borderRadius: 7, padding: "5px 7px", color: C.primary, fontSize: 16, lineHeight: 1 }}>
                        {isSms ? <MessageOutlined /> : <MailOutlined />}
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 15, color: C.darkText, display: "block", lineHeight: 1.3 }}>
                            {isSms ? "SMS Messaging" : "Email Messaging"}
                        </Text>
                        <Text style={{ fontSize: 11, color: C.subText }}>
                            Connect your own {isSms ? "SMS" : "email"} sender and send bulk blasts or single messages to leads &amp; customers.{" "}
                            <Link to="/crm/campaigns">
                                Tracking budgets &amp; ROI for a marketing campaign? Go to CRM → Campaigns <ArrowRightOutlined />
                            </Link>
                        </Text>
                    </div>
                </div>
                <Space wrap>
                    <Segmented
                        value={view}
                        onChange={(v) => setView(v as "messages" | "analysis")}
                        options={[
                            { value: "messages", icon: <UnorderedListOutlined />, label: "Messages" },
                            { value: "analysis", icon: <BarChartOutlined />, label: "Analysis" },
                        ]}
                    />
                    {view === "messages" && (
                        <Tooltip title="Refresh">
                            <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()} />
                        </Tooltip>
                    )}
                    <Button icon={<SettingOutlined />} onClick={() => setSendersOpen(true)}>
                        Connect Sender
                    </Button>
                    <Button icon={<ThunderboltOutlined />} onClick={() => setQuickSendOpen(true)}>
                        Quick Send
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}
                        style={{ background: C.primary, borderColor: C.primary }}>
                        New Bulk Campaign
                    </Button>
                </Space>
            </div>

            {view === "analysis" ? (
                <MessagingAnalytics shopId={shopId} channel={channel} />
            ) : (
                <Table
                    rowKey="_id"
                    columns={columns}
                    dataSource={campaigns}
                    loading={isLoading}
                    size="small"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 900 }}
                    style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12 }}
                />
            )}

            <SenderConfigDrawer
                open={sendersOpen}
                onClose={() => setSendersOpen(false)}
                shopId={shopId}
                defaultChannel={channel}
            />
            <CampaignFormModal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSuccess={reload}
                shopId={shopId}
                channel={channel}
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
