import { forwardRef, useImperativeHandle, useRef } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import { EditOutlined, EyeOutlined, MoreOutlined, NotificationOutlined } from "@ant-design/icons";
import { App, Button, Dropdown, Tag, Typography } from "antd";
import { fetchAllCampaigns, Campaign, CampaignStatus } from "@services/crm/campaigns";

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

const StatusPill = ({ status }: { status: CampaignStatus }) => {
    const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", borderRadius: 5,
            padding: "2px 8px", fontSize: 10, fontWeight: 700,
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
        }}>
            {status.toUpperCase()}
        </span>
    );
};

export interface CampaignTableHandle { reload: () => void }
interface CampaignTableProps {
    onView: (c: Campaign) => void;
    onEdit: (c: Campaign) => void;
    // optional external filters (e.g. from a parent page)
    campaignId?: string;
    departmentId?: string;
}

export const CampaignTable = forwardRef<CampaignTableHandle, CampaignTableProps>(
    ({ onView, onEdit }, ref) => {
        const actionRef = useRef<ActionType>();
        useImperativeHandle(ref, () => ({ reload: () => actionRef.current?.reload() }));

        const columns = [
            {
                title: "Campaign", dataIndex: "name",
                render: (name: string, r: Campaign) => (
                    <div>
                        <Text strong style={{ fontSize: 12 }}>{name}</Text>
                        {r.type && (
                            <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>
                                {r.type.replace(/_/g, " ")}
                            </Text>
                        )}
                    </div>
                ),
            },
            {
                title: "Status", dataIndex: "status", search: false,
                render: (s: CampaignStatus) => <StatusPill status={s} />,
            },
            {
                title: "Owner", dataIndex: "owner_id", search: false,
                render: (o: any) => o
                    ? <Text style={{ fontSize: 11, color: C.subText }}>{o.fullname || o.username}</Text>
                    : <Text style={{ fontSize: 11, color: "#94a3b8" }}>—</Text>,
            },
            {
                title: "Budget", dataIndex: "budget", search: false,
                render: (v: number) => (
                    <Text style={{ fontSize: 12 }}>{v ? `KES ${v.toLocaleString()}` : "—"}</Text>
                ),
            },
            {
                title: "Leads", dataIndex: "actual_leads", search: false,
                render: (v: number) => <Text style={{ fontSize: 12 }}>{v ?? 0}</Text>,
            },
            {
                title: "Conversions", dataIndex: "actual_conversions", search: false,
                render: (v: number) => <Text style={{ fontSize: 12 }}>{v ?? 0}</Text>,
            },
            {
                title: "Revenue", dataIndex: "actual_revenue", search: false,
                render: (v: number) => (
                    <Text strong style={{ fontSize: 12, color: C.green }}>
                        {v ? `KES ${v.toLocaleString()}` : "—"}
                    </Text>
                ),
            },
            {
                title: "Tags", dataIndex: "tags", search: false,
                render: (tags: string[]) =>
                    tags?.length
                        ? tags.map(t => (
                            <Tag key={t} style={{ fontSize: 10, borderRadius: 4, border: "none", background: "#f1f5f9", color: C.subText }}>
                                {t}
                            </Tag>
                        ))
                        : <Text style={{ fontSize: 11, color: "#94a3b8" }}>—</Text>,
            },
            {
                title: "Actions", key: "actions", search: false,
                fixed: "right" as const, width: 56,
                render: (_: any, r: Campaign) => (
                    <Dropdown trigger={["click"]} menu={{
                        items: [
                            { key: "view", icon: <EyeOutlined />, label: "View Details", onClick: () => onView(r) },
                            { key: "edit", icon: <EditOutlined />, label: "Edit Campaign", onClick: () => onEdit(r) },
                        ],
                    }}>
                        <Button type="text" icon={<MoreOutlined />} style={{ borderRadius: 6 }} />
                    </Dropdown>
                ),
            },
        ];

        return (
            <App>
                <ProTable<Campaign>
                    rowKey="_id"
                    columns={columns}
                    actionRef={actionRef}
                    request={async (params) => {
                        const res = await fetchAllCampaigns(params as any);
                        return { data: res.campaigns, success: true, total: res.total };
                    }}
                    cardBordered={false}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    search={{ searchText: "Search", resetText: "Reset", labelWidth: "auto" }}
                    headerTitle={
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <NotificationOutlined style={{ color: C.primary }} />
                            <Text strong style={{ fontSize: 14 }}>Campaigns</Text>
                        </div>
                    }
                    options={{ reload: () => actionRef.current?.reload() }}
                    scroll={{ x: "100%" }}
                    size="small"
                />
            </App>
        );
    }
);
CampaignTable.displayName = "CampaignTable";