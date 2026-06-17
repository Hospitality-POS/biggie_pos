import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
    CalendarOutlined, CheckCircleOutlined, DeleteOutlined, EditOutlined,
    EnvironmentOutlined, EyeOutlined, MoreOutlined,
    PhoneOutlined, TeamOutlined, UserOutlined,
} from "@ant-design/icons";
import { App, Button, Dropdown, Modal, Tag, Typography } from "antd";
import { deleteLead, fetchAllLeads, Lead, LeadStage } from "@services/crm/leads";
import { useAppDispatch } from "src/store";

const { Text } = Typography;

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

const STAGE_CONFIG: Record<LeadStage, { color: string; bg: string; border: string; label: string }> = {
    new: { color: C.blue, bg: "#eff6ff", border: "#bfdbfe", label: "New" },
    contacted: { color: C.orange, bg: "#fffbeb", border: "#fed7aa", label: "Contacted" },
    qualified: { color: C.purple, bg: "#faf5ff", border: "#e9d5ff", label: "Qualified" },
    proposal: { color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc", label: "Proposal" },
    negotiation: { color: "#d97706", bg: "#fff7ed", border: "#fed7aa", label: "Negotiation" },
    won: { color: C.green, bg: "#f0fdf4", border: "#bbf7d0", label: "Won" },
    lost: { color: C.red, bg: "#fef2f2", border: "#fecaca", label: "Lost" },
    disqualified: { color: C.subText, bg: C.bg, border: C.border, label: "Disqualified" },
};

const StagePill = ({ stage }: { stage: LeadStage }) => {
    const cfg = STAGE_CONFIG[stage] ?? STAGE_CONFIG.new;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            borderRadius: 5, padding: "2px 8px",
            fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
        }}>
            {cfg.label}
        </span>
    );
};

const ValueBadge = ({ value }: { value?: number }) => {
    if (!value) return <Text style={{ fontSize: 12, color: C.subText }}>—</Text>;
    return (
        <Text strong style={{ fontSize: 12, color: C.green }}>
            KES {value.toLocaleString()}
        </Text>
    );
};

export interface LeadTableHandle { reload: () => void }
interface LeadTableProps {
    onView: (lead: Lead) => void;
    onEdit: (lead: Lead) => void;
}

const LeadTable = forwardRef<LeadTableHandle, LeadTableProps>(({ onView, onEdit }, ref) => {
    const actionRef = useRef<ActionType>();
    const { message: msg } = App.useApp();
    const dispatch = useAppDispatch();
    const shop_id = JSON.parse(localStorage.getItem("shop") || "{}")._id;

    const handleDelete = (record: Lead) => {
        const displayName = record.entity_type === 'company' 
            ? (record.company_name || 'Unnamed Company') 
            : (record.lead_name || 'Unnamed Individual');
        Modal.confirm({
            title: `Delete "${displayName}"?`,
            content: "This action cannot be undone.",
            okText: "Delete",
            okButtonProps: { danger: true },
            onOk: async () => {
                await dispatch(deleteLead({ id: record._id, shop_id }));
                actionRef.current?.reload();
            },
        });
    };

    useImperativeHandle(ref, () => ({
        reload: () => actionRef.current?.reload(),
    }));

    const columns = [
        {
            title: "Lead", dataIndex: "lead_name",
            fieldProps: { placeholder: "Search by name…" },
            render: (_: string, record: Lead) => {
                const displayName = record.entity_type === 'company' 
                    ? (record.company_name || 'Unnamed Company') 
                    : (record.lead_name || 'Unnamed Individual');
                return (
                    <div>
                        <Text strong style={{ fontSize: 12, color: C.darkText, display: "block" }}>{displayName}</Text>
                        {record.entity_type === 'company' && record.contact_person && (
                            <Text style={{ fontSize: 11, color: C.subText }}>Contact: {record.contact_person}</Text>
                        )}
                        {record.entity_type === 'individual' && record.company_name && (
                            <Text style={{ fontSize: 11, color: C.subText }}>{record.company_name}</Text>
                        )}
                    </div>
                );
            },
        },
        {
            title: "Phone", dataIndex: "phone", search: false,
            render: (v: string) => v
                ? <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <PhoneOutlined style={{ color: C.subText, fontSize: 11 }} />
                    <Text style={{ fontSize: 12 }}>{v}</Text>
                </div>
                : <Text style={{ fontSize: 12, color: C.subText }}>—</Text>,
        },
        {
            title: "Stage", dataIndex: "stage", search: false,
            render: (stage: LeadStage) => <StagePill stage={stage} />,
        },
        {
            title: "Value", dataIndex: "estimated_value", search: false,
            render: (v: number) => <ValueBadge value={v} />,
        },
        {
            title: "Probability", dataIndex: "probability", search: false,
            render: (v: number) => v !== undefined
                ? <Text style={{ fontSize: 12 }}>{v}%</Text>
                : <Text style={{ fontSize: 12, color: C.subText }}>—</Text>,
        },
        {
            title: "Assigned To", dataIndex: "assigned_to", search: false,
            render: (assignedTo: any) => {
                if (!assignedTo) {
                    return <Text style={{ fontSize: 12, color: C.subText }}>Unassigned</Text>;
                }

                // Handle both object and string ID cases
                const userName = assignedTo.name || assignedTo.username;
                const userId = assignedTo._id || assignedTo;

                return userName ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <UserOutlined style={{ color: C.subText, fontSize: 11 }} />
                        <Text style={{ fontSize: 12, color: C.darkText }}>{userName}</Text>
                    </div>
                ) : (
                    <Text style={{ fontSize: 12, color: C.subText }}>—</Text>
                );
            },
        },
        {
            title: "Follow Up", dataIndex: "next_follow_up", search: false,
            render: (d: string) => d
                ? <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <CalendarOutlined style={{ color: C.orange, fontSize: 11 }} />
                    <Text style={{ fontSize: 12 }}>{new Date(d).toLocaleDateString("en-GB")}</Text>
                </div>
                : <Text style={{ fontSize: 12, color: C.subText }}>—</Text>,
        },
        {
            title: "Source", dataIndex: "source", search: false,
            render: (source: string) => source ? (
                <Text style={{ fontSize: 11, color: C.subText }}>
                    {source.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
            ) : <Text style={{ fontSize: 12, color: C.subText }}>—</Text>,
        },
        {
            title: "Actions", key: "actions", search: false, fixed: "right" as const, width: 56,
            render: (_: any, record: Lead) => (
                <Dropdown trigger={["click"]} menu={{
                    items: [
                        { key: "view", icon: <EyeOutlined />, label: "View Details", onClick: () => onView(record) },
                        { key: "edit", icon: <EditOutlined />, label: "Edit Lead", onClick: () => onEdit(record) },
                        { type: "divider" as const },
                        { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true, onClick: () => handleDelete(record) },
                    ],
                }}>
                    <Button type="text" icon={<MoreOutlined />} style={{ borderRadius: 6 }} />
                </Dropdown>
            ),
        },
    ];

    return (
        <App>
            <ProTable<Lead>
                rowKey="_id"
                columns={columns}
                actionRef={actionRef}
                request={async (params) => {
                    try {
                        const { current, pageSize, ...rest } = params;
                        const res = await fetchAllLeads({
                            ...rest,
                            page: current,
                            limit: pageSize,
                            shop_id,
                        } as any);
                        return { data: res.leads, success: true, total: res.total };
                    } catch (error) {
                        console.error("Error fetching leads:", error);
                        msg.error("Failed to fetch leads");
                        return { data: [], success: false, total: 0 };
                    }
                }}
                cardBordered={false}
                pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true }}
                search={{ searchText: "Search", resetText: "Reset", labelWidth: "auto" }}
                headerTitle={
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <TeamOutlined style={{ color: C.primary }} />
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>Lead Pipeline</Text>
                    </div>
                }
                options={{ reload: () => actionRef.current?.reload(), fullScreen: true }}
                scroll={{ x: "100%" }}
                size="small"
            />
        </App>
    );
});

LeadTable.displayName = "LeadTable";
export default LeadTable;