import React, { useState } from "react";
import {
    Badge, Button, Drawer, Empty, Input, List, Popconfirm, Segmented, Space, Switch, Tag, Tooltip, Typography,
} from "antd";
import { AuditOutlined, CheckOutlined, CloseOutlined, LockOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { currentShopId, notifyInventoryChanged, useIsAdmin, useQtyApprovalSetting } from "@hooks/useQtyApprovalSetting";
import {
    approveQtyRequest,
    countPendingQtyRequests,
    fetchQtyRequests,
    rejectQtyRequest,
    QtyRequest,
    QtyRequestStatus,
} from "@services/inventoryQtyRequests";

const { Text } = Typography;

// Toggle and review UI for admin approval of inventory quantity edits —
// the setting itself lives in @hooks/useQtyApprovalSetting.

/** Compact switch for the inventory toolbar; only admins can flip it. */
export const QtyApprovalSwitch: React.FC = () => {
    const { enabled, isAdmin, loading, saving, setEnabled } = useQtyApprovalSetting();
    return (
        <Tooltip
            title={
                isAdmin
                    ? "When on, staff changes to stock quantities wait for an admin to approve them"
                    : "Only an admin can change this"
            }
        >
            <Space size={6}>
                <LockOutlined style={{ color: enabled ? "#d97706" : "#94a3b8" }} />
                <Text style={{ fontSize: 13 }}>Qty edits need approval</Text>
                <Switch
                    size="small"
                    checked={enabled}
                    loading={loading || saving}
                    disabled={!isAdmin}
                    onChange={setEnabled}
                />
            </Space>
        </Tooltip>
    );
};

/** Full setting row for System Setup. */
export const QtyApprovalSettingCard: React.FC = () => {
    const { enabled, isAdmin, loading, saving, setEnabled } = useQtyApprovalSetting();
    return (
        <div
            style={{
                background: "#fff",
                border: `1px solid ${enabled ? "#d9770633" : "#e2e8f0"}`,
                borderRadius: 10,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
            }}
        >
            <div
                style={{
                    width: 38, height: 38, borderRadius: 10, background: "#fffbeb", color: "#d97706",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0,
                }}
            >
                <LockOutlined />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 14, display: "block", color: "#0f172a" }}>
                    Admin approval for quantity edits
                </Text>
                <Text style={{ fontSize: 12.5, color: "#64748b", display: "block", marginTop: 2, lineHeight: 1.5 }}>
                    When on, staff can still edit items, but a change to the stock quantity (in the edit form,
                    an Excel import update, or a variant) waits until an admin approves it under Inventory → Qty
                    approvals. Admins' own edits apply straight away.
                    {!isAdmin && " Only an admin can change this setting."}
                </Text>
            </div>
            <Switch
                checked={enabled}
                loading={loading || saving}
                disabled={!isAdmin}
                onChange={setEnabled}
                checkedChildren="ON"
                unCheckedChildren="OFF"
                style={{ flexShrink: 0 }}
            />
        </div>
    );
};

const fmtQty = (n: number | null | undefined) => (n ?? 0).toLocaleString();

const itemOf = (r: QtyRequest) => (r.inventory_id && typeof r.inventory_id === "object" ? r.inventory_id : null);

// What the request changes, with the stock as it is now so the reviewer sees
// if it moved after the request was made
const ChangeLines: React.FC<{ r: QtyRequest }> = ({ r }) => {
    const item = itemOf(r);
    if (r.variant_changes?.length) {
        return (
            <Space direction="vertical" size={0}>
                {r.variant_changes.map((c) => {
                    const now = item?.variants?.find((v) => v.name === c.name)?.quantity;
                    return (
                        <Text key={c.name} style={{ fontSize: 12.5 }}>
                            {c.name}: {fmtQty(c.old_quantity)} → <Text strong>{fmtQty(c.new_quantity)}</Text>
                            {now !== undefined && now !== c.old_quantity && (
                                <Text type="warning" style={{ fontSize: 12 }}> (now {fmtQty(now)})</Text>
                            )}
                        </Text>
                    );
                })}
            </Space>
        );
    }
    return (
        <Text style={{ fontSize: 12.5 }}>
            Quantity: {fmtQty(r.old_quantity)} → <Text strong>{fmtQty(r.new_quantity)}</Text>
            {item && item.quantity !== r.old_quantity && (
                <Text type="warning" style={{ fontSize: 12 }}> (now {fmtQty(item.quantity)})</Text>
            )}
        </Text>
    );
};

const SOURCE_LABEL: Record<QtyRequest["source"], string> = {
    edit: "Edit form",
    import: "Excel import",
    variant: "Variant edit",
};
const STATUS_COLOR: Record<QtyRequestStatus, string> = { Pending: "gold", Approved: "green", Rejected: "red" };

/** "Qty approvals" button with a pending count, opening the review drawer. */
export const QtyApprovalsButton: React.FC = () => {
    const queryClient = useQueryClient();
    const shopId = currentShopId();
    const isAdmin = useIsAdmin();
    const { enabled } = useQtyApprovalSetting();
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<QtyRequestStatus | "all">("Pending");
    const [notes, setNotes] = useState<Record<string, string>>({});

    const { data: count = 0 } = useQuery({
        queryKey: ["inventory-qty-requests-count", shopId],
        queryFn: () => countPendingQtyRequests(shopId),
        enabled: !!shopId,
        refetchInterval: 60_000,
    });

    const { data, isFetching } = useQuery({
        queryKey: ["inventory-qty-requests", shopId, status],
        queryFn: () => fetchQtyRequests({ shop_id: shopId, status }),
        enabled: open && !!shopId,
    });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ["inventory-qty-requests"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-qty-requests-count"] });
        // Stock changed — reload the inventory lists
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        queryClient.invalidateQueries({ queryKey: ["inventories"] });
        notifyInventoryChanged();
    };
    const approve = useMutation({ mutationFn: (id: string) => approveQtyRequest(id, notes[id]), onSuccess: refresh });
    const reject = useMutation({ mutationFn: (id: string) => rejectQtyRequest(id, notes[id]), onSuccess: refresh });

    // Nothing to show while the setting is off and nothing is waiting
    if (!enabled && count === 0) return null;

    return (
        <>
            <Badge count={count} size="small">
                <Button icon={<AuditOutlined />} onClick={() => setOpen(true)}>
                    Qty approvals
                </Button>
            </Badge>
            <Drawer
                title="Quantity changes waiting for approval"
                open={open}
                onClose={() => setOpen(false)}
                width={Math.min(560, window.innerWidth)}
            >
                <Segmented
                    style={{ marginBottom: 12 }}
                    value={status}
                    onChange={(v) => setStatus(v as QtyRequestStatus | "all")}
                    options={["Pending", "Approved", "Rejected", { label: "All", value: "all" }]}
                />
                {!isAdmin && status === "Pending" && (
                    <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 12 }}>
                        An admin approves or rejects these.
                    </Text>
                )}
                <List
                    loading={isFetching}
                    dataSource={data?.requests || []}
                    locale={{ emptyText: <Empty description="Nothing here" /> }}
                    renderItem={(r) => (
                        <List.Item style={{ display: "block" }}>
                            <Space style={{ width: "100%", justifyContent: "space-between" }} align="start">
                                <Space direction="vertical" size={2}>
                                    <Text strong>{itemOf(r)?.name || r.inventory_name || "Deleted item"}</Text>
                                    <ChangeLines r={r} />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {SOURCE_LABEL[r.source]} · {r.requested_by_name || "Unknown user"} ·{" "}
                                        {dayjs(r.createdAt).format("DD MMM YYYY HH:mm")}
                                    </Text>
                                    {r.reason && <Text style={{ fontSize: 12 }}>Reason: {r.reason}</Text>}
                                    {r.status !== "Pending" && (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {r.status} by {r.reviewed_by_name || "admin"}
                                            {r.reviewed_at ? ` · ${dayjs(r.reviewed_at).format("DD MMM YYYY HH:mm")}` : ""}
                                            {r.review_note ? ` — ${r.review_note}` : ""}
                                        </Text>
                                    )}
                                </Space>
                                <Tag color={STATUS_COLOR[r.status]}>{r.status}</Tag>
                            </Space>
                            {isAdmin && r.status === "Pending" && (
                                <Space style={{ marginTop: 8, width: "100%" }}>
                                    <Input
                                        size="small"
                                        placeholder="Note (optional)"
                                        value={notes[r._id]}
                                        onChange={(e) => setNotes((p) => ({ ...p, [r._id]: e.target.value }))}
                                        style={{ width: 220 }}
                                    />
                                    <Popconfirm
                                        title="Apply this quantity change to the stock?"
                                        onConfirm={() => approve.mutate(r._id)}
                                    >
                                        <Button
                                            size="small"
                                            type="primary"
                                            icon={<CheckOutlined />}
                                            loading={approve.isLoading && approve.variables === r._id}
                                        >
                                            Approve
                                        </Button>
                                    </Popconfirm>
                                    <Button
                                        size="small"
                                        danger
                                        icon={<CloseOutlined />}
                                        loading={reject.isLoading && reject.variables === r._id}
                                        onClick={() => reject.mutate(r._id)}
                                    >
                                        Reject
                                    </Button>
                                </Space>
                            )}
                        </List.Item>
                    )}
                />
            </Drawer>
        </>
    );
};
