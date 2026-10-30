import React from "react";
import { Drawer, Typography, Space, Tag, Table, Statistic, Row, Col, Button, Divider, Tooltip } from "antd";
import { NotificationOutlined, SendOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCampaignById, sendCampaign, CampaignRecipient, CampaignStatus } from "@services/omnichannel/messagingCampaigns";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;
const C = THEME_C;

interface Props {
    open: boolean;
    onClose: () => void;
    campaignId: string | null;
    shopId: string;
}

const STATUS_COLOR: Record<CampaignStatus, string> = {
    draft: "default",
    scheduled: "blue",
    sending: "processing",
    completed: "success",
    failed: "error",
    cancelled: "default",
};

const RECIPIENT_STATUS_COLOR: Record<string, string> = {
    pending: "default",
    sent: "blue",
    delivered: "success",
    failed: "error",
};

const CampaignDetailDrawer: React.FC<Props> = ({ open, onClose, campaignId, shopId }) => {
    const queryClient = useQueryClient();
    const [sending, setSending] = React.useState(false);

    const { data: campaign, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["message-campaign", campaignId, shopId],
        queryFn: () => getCampaignById(campaignId as string, shopId),
        enabled: !!campaignId && !!shopId && open,
        // Auto-refresh while a send is in progress so recipient statuses
        // (sent/delivered/failed) update without the user manually refreshing.
        refetchInterval: (data) => (data?.status === "sending" ? 4000 : false),
    });

    const handleSend = async () => {
        if (!campaignId) return;
        setSending(true);
        try {
            await sendCampaign(campaignId, shopId);
            await refetch();
            queryClient.invalidateQueries({ queryKey: ["message-campaigns", shopId] });
        } catch {
            /* toast handled in service */
        } finally {
            setSending(false);
        }
    };

    const columns = [
        { title: "Name", dataIndex: "name", key: "name" },
        {
            title: "Contact", key: "contact",
            render: (_: any, r: CampaignRecipient) => r.phone || r.email || "—",
        },
        { title: "Source", dataIndex: "source", key: "source" },
        {
            title: "Status", dataIndex: "status", key: "status",
            render: (s: string) => <Tag color={RECIPIENT_STATUS_COLOR[s] || "default"}>{s.toUpperCase()}</Tag>,
        },
        {
            title: "Error", dataIndex: "error", key: "error",
            render: (e?: string) => e ? <Text type="danger" style={{ fontSize: 11 }}>{e}</Text> : "—",
        },
    ];

    return (
        <Drawer
            title={
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <Space>
                        <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary }}>
                            <NotificationOutlined />
                        </div>
                        <Text strong>{campaign?.name || "Campaign Details"}</Text>
                    </Space>
                    <Tooltip title="Refresh status">
                        <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            loading={isFetching}
                            onClick={() => refetch()}
                        />
                    </Tooltip>
                </Space>
            }
            open={open}
            onClose={onClose}
            width="min(760px, 96vw)"
            loading={isLoading}
        >
            {campaign && (
                <>
                    <Space wrap style={{ marginBottom: 16 }}>
                        <Tag color={STATUS_COLOR[campaign.status]}>{campaign.status.toUpperCase()}</Tag>
                        <Tag>{campaign.channel.toUpperCase()}</Tag>
                        <Tag>{campaign.audience}</Tag>
                    </Space>

                    <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={6}><Statistic title="Total" value={campaign.total_recipients} /></Col>
                        <Col span={6}><Statistic title="Sent" value={campaign.sent_count} valueStyle={{ color: C.blue }} /></Col>
                        <Col span={6}><Statistic title="Delivered" value={campaign.delivered_count} valueStyle={{ color: C.green }} /></Col>
                        <Col span={6}><Statistic title="Failed" value={campaign.failed_count} valueStyle={{ color: C.red }} /></Col>
                    </Row>

                    {campaign.subject && (
                        <div style={{ marginBottom: 8 }}>
                            <Text strong style={{ fontSize: 12 }}>Subject: </Text>
                            <Text style={{ fontSize: 12 }}>{campaign.subject}</Text>
                        </div>
                    )}
                    {campaign.channel === "email" ? (
                        <div
                            style={{ border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 16, maxHeight: 360, overflowY: "auto" }}
                            dangerouslySetInnerHTML={{ __html: campaign.message }}
                        />
                    ) : (
                        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, whiteSpace: "pre-wrap" }}>
                            {campaign.message}
                        </div>
                    )}

                    {(campaign.status === "draft" || campaign.status === "scheduled") && (
                        <Button
                            type="primary" icon={<SendOutlined />} loading={sending} onClick={handleSend}
                            style={{ background: C.primary, borderColor: C.primary, marginBottom: 16 }}
                        >
                            Send Now
                        </Button>
                    )}

                    <Divider style={{ margin: "8px 0 16px" }} />

                    <Table
                        rowKey={(r) => r.phone || r.email || r.name || Math.random().toString()}
                        columns={columns}
                        dataSource={campaign.recipients || []}
                        size="small"
                        pagination={{ pageSize: 20 }}
                        scroll={{ x: 500 }}
                    />
                </>
            )}
        </Drawer>
    );
};

export default CampaignDetailDrawer;
