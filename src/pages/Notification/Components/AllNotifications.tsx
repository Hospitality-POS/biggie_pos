import React, { useRef, useState } from "react";
import {
    Button,
    Card,
    Drawer,
    Dropdown,
    Empty,
    message,
    Modal,
    Popconfirm,
    Skeleton,
    Space,
    Typography,
} from "antd";
import { ActionType, ProList } from "@ant-design/pro-components";
import {
    BellOutlined,
    CheckCircleOutlined,
    CheckOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    EyeOutlined,
    FilterOutlined,
    MailOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchMyNotifications,
    markAllNotificationsAsRead,
} from "@services/notifications";
import { useNotificationMutations } from "../Hooks/NotificationsCustomHook";
import NotificationDetailView from "./NotificationDetailView";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Text } = Typography;
const { confirm } = Modal;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    orange: "#f59e0b",
    red: "#ef4444",
    blue: "#3b82f6",
    indigo: "#6366f1",
    purple: "#8b5cf6",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

// ── Mobile hook ───────────────────────────────────────────────────────────────
const useIsMobile = () => {
    const [v, setV] = React.useState(window.innerWidth < 768);
    React.useEffect(() => {
        const h = () => setV(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return v;
};

// ── Priority badge ────────────────────────────────────────────────────────────
const PRIORITY_CFG: Record<string, { color: string; bg: string }> = {
    low: { color: C.green, bg: "#f0fdf4" },
    medium: { color: C.blue, bg: "#eff6ff" },
    high: { color: C.orange, bg: "#fffbeb" },
    urgent: { color: C.red, bg: "#fef2f2" },
};

const PriorityTag: React.FC<{ priority: string }> = ({ priority }) => {
    const cfg = PRIORITY_CFG[priority?.toLowerCase()] || { color: C.subText, bg: C.bg };
    return (
        <span style={{
            background: cfg.bg, color: cfg.color,
            borderRadius: 6, fontSize: 10, fontWeight: 700,
            padding: "2px 8px", textTransform: "uppercase", whiteSpace: "nowrap",
        }}>
            {priority}
        </span>
    );
};

// ── Type badge ────────────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { color: string; bg: string; label: string }> = {
    new_appointment_booking: { color: C.purple, bg: "#f5f3ff", label: "New Booking" },
    inventory_out_of_stock: { color: C.red, bg: "#fef2f2", label: "Out of Stock" },
    new_appointment: { color: C.green, bg: "#f0fdf4", label: "Appointment" },
    low_inventory: { color: C.orange, bg: "#fffbeb", label: "Low Inventory" },
    system: { color: C.blue, bg: "#eff6ff", label: "System" },
};

const TypeTag: React.FC<{ type: string }> = ({ type }) => {
    const cfg = TYPE_CFG[type] || { color: C.subText, bg: C.bg, label: type?.replace(/_/g, " ") };
    return (
        <span style={{
            background: cfg.bg, color: cfg.color,
            borderRadius: 6, fontSize: 10, fontWeight: 600,
            padding: "2px 8px", whiteSpace: "nowrap", textTransform: "capitalize",
        }}>
            {cfg.label}
        </span>
    );
};

// ── Unread dot ────────────────────────────────────────────────────────────────
const UnreadDot: React.FC<{ priority?: string }> = ({ priority }) => {
    const cfg = PRIORITY_CFG[priority?.toLowerCase() as keyof typeof PRIORITY_CFG] || { color: C.blue };
    return (
        <span style={{
            display: "inline-block", width: 5, height: 18,
            borderRadius: 2, background: cfg.color,
            flexShrink: 0, marginTop: 2,
        }} />
    );
};

// ── Detail drawer (mobile) ────────────────────────────────────────────────────
const DetailDrawer: React.FC<{
    notification: any;
    open: boolean;
    onClose: () => void;
    onMarkRead: (id: string) => void;
    onDelete: (id: string) => void;
}> = ({ notification, open, onClose, onMarkRead, onDelete }) => (
    <Drawer
        open={open}
        onClose={onClose}
        placement="bottom"
        height="82vh"
        destroyOnClose
        title={
            <Space size={8}>
                <div style={{
                    background: C.primaryLight, borderRadius: 7,
                    padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1,
                }}>
                    <BellOutlined />
                </div>
                <Text strong style={{ fontSize: 13, color: C.darkText }}>Notification Details</Text>
            </Space>
        }
        styles={{
            body: { padding: "14px 14px 100px", overflowY: "auto" },
            footer: { padding: "12px 14px", borderTop: `1px solid ${C.border}`, background: "#fff" },
        }}
        footer={
            notification && (
                <div style={{ display: "flex", gap: 10 }}>
                    {!notification.read && (
                        <Button
                            block type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={() => { onMarkRead(notification._id); onClose(); }}
                            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 44 }}
                        >
                            Mark as Read
                        </Button>
                    )}
                    <Button
                        block danger
                        icon={<DeleteOutlined />}
                        onClick={() => { onDelete(notification._id); onClose(); }}
                        style={{ borderRadius: 8, height: 44 }}
                    >
                        Delete
                    </Button>
                </div>
            )
        }
    >
        {notification && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Header */}
                <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderTop: `3px solid ${notification.read ? C.border : C.primary}`, borderRadius: 10, padding: "14px 16px" }}>
                    <Text strong={!notification.read} style={{ fontSize: 14, color: C.darkText, display: "block", marginBottom: 8 }}>
                        {notification.title}
                    </Text>
                    <Space wrap size={6}>
                        <TypeTag type={notification.type} />
                        <PriorityTag priority={notification.priority} />
                        {!notification.read && <UnreadDot priority={notification.priority} />}
                    </Space>
                </div>

                {/* Message */}
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                    <Text style={{ fontSize: 10, fontWeight: 700, color: C.subText, textTransform: "uppercase" as const, letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                        Message
                    </Text>
                    <Text style={{ fontSize: 13, color: C.darkText, lineHeight: 1.6 }}>{notification.message}</Text>
                </div>

                {/* Time */}
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 11, color: C.subText }}>Received</Text>
                    <Text style={{ fontSize: 11, color: C.darkText, fontWeight: 500 }}>
                        {dayjs(notification.createdAt).format("MMM D, YYYY h:mm A")}
                    </Text>
                </div>

                {/* Additional info */}
                {notification.additionalInfo && (
                    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                        <Text style={{ fontSize: 10, fontWeight: 700, color: C.subText, textTransform: "uppercase" as const, letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                            Additional Info
                        </Text>
                        <pre style={{ margin: 0, padding: 12, background: "#fff", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11, color: C.subText, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {JSON.stringify(notification.additionalInfo, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        )}
    </Drawer>
);

// ── Mobile notification card ──────────────────────────────────────────────────
const NotificationCard: React.FC<{
    record: any;
    onMarkRead: (id: string) => void;
    onDelete: (id: string) => void;
    onViewDetails: (record: any) => void;
}> = ({ record, onMarkRead, onDelete, onViewDetails }) => {

    return (
        <div
            onClick={() => onViewDetails(record)}
            style={{
                background: !record.read ? `${C.blue}05` : "#fff",
                border: `1px solid ${!record.read ? C.blue + "30" : C.border}`,
                borderLeft: `3px solid ${!record.read ? C.blue : C.border}`,
                borderRadius: 10, padding: "12px 14px", marginBottom: 10,
                cursor: "pointer",
            }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
                    {!record.read && <UnreadDot priority={record.priority} />}
                    <Text strong={!record.read} style={{ fontSize: 13, color: C.darkText, lineHeight: 1.3 }}>
                        {record.title}
                    </Text>
                </div>
                <Space size={4}>
                        {!record.read && (
                            <Button
                                type="text"
                                size="small"
                                icon={<CheckCircleOutlined style={{ color: C.green }} />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkRead(record._id);
                                }}
                                style={{
                                    width: 28, height: 28, padding: 0, flexShrink: 0,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                }}
                            />
                        )}
                        <Popconfirm
                            title="Delete this notification?"
                            onConfirm={(e) => {
                                e?.stopPropagation();
                                onDelete(record._id);
                            }}
                            okText="Delete" cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                        >
                            <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: 28, height: 28, padding: 0, flexShrink: 0,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                }}
                            />
                        </Popconfirm>
                        <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined style={{ color: C.blue }} />}
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails(record);
                            }}
                            style={{
                                width: 28, height: 28, padding: 0, flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                        />
                    </Space>
            </div>

            {/* Message */}
            <Text
                style={{ fontSize: 12, color: C.subText, display: "block", marginBottom: 10, lineHeight: 1.5 }}
                ellipsis={{ tooltip: record.message }}
            >
                {record.message}
            </Text>

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <Space size={6} wrap>
                    <TypeTag type={record.type} />
                    <PriorityTag priority={record.priority} />
                </Space>
                <Text style={{ fontSize: 11, color: "#94a3b8" }}>{dayjs(record.createdAt).fromNow()}</Text>
            </div>
        </div>
    );
};

// ── Mobile list wrapper ───────────────────────────────────────────────────────
const MobileNotificationList: React.FC<{
    notificationtype?: string;
    onViewDetails: (record: any) => void;
    onMarkRead: (id: string) => void;
    onDelete: (id: string) => void;
    filterPriority: string | null;
    filterType: string | null;
}> = ({ notificationtype, onViewDetails, onMarkRead, onDelete, filterPriority, filterType }) => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const PAGE_SIZE = 10;

    const load = async (p = 1) => {
        setLoading(true);
        try {
            const data = await fetchMyNotifications({
                current: p,
                pageSize: PAGE_SIZE,
                priority: filterPriority || undefined,
                type: filterType || (notificationtype === "system" ? "system" : ""),
                read: notificationtype === "unread" ? false : undefined,
            });
            const list = data?.data || [];
            setNotifications(list);
            setTotal(data?.pagination?.total || list.length);
            setPage(p);
        } catch {
            message.error("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { load(1); }, [notificationtype, filterPriority, filterType]);

    if (loading) {
        return (
            <>
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} style={{ borderRadius: 10, marginBottom: 10, border: `1px solid ${C.border}` }} bodyStyle={{ padding: 14 }}>
                        <Skeleton active paragraph={{ rows: 2 }} />
                    </Card>
                ))}
            </>
        );
    }

    if (notifications.length === 0) {
        return <Empty description="No notifications" style={{ padding: "48px 0" }} />;
    }

    return (
        <>
            {notifications.map((record) => (
                <NotificationCard
                    key={record._id}
                    record={record}
                    onMarkRead={onMarkRead}
                    onDelete={onDelete}
                    onViewDetails={onViewDetails}
                />
            ))}

            {/* Simple pagination strip */}
            {total > PAGE_SIZE && (
                <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10 }}>
                    <Button size="small" disabled={page <= 1} onClick={() => load(page - 1)} style={{ borderRadius: 7 }}>
                        ← Prev
                    </Button>
                    <Text style={{ fontSize: 12, color: C.subText, lineHeight: "24px" }}>
                        {page} / {Math.ceil(total / PAGE_SIZE)}
                    </Text>
                    <Button size="small" disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => load(page + 1)} style={{ borderRadius: 7 }}>
                        Next →
                    </Button>
                </div>
            )}
        </>
    );
};

// ── Toolbar (shared) ──────────────────────────────────────────────────────────
const Toolbar: React.FC<{
    notificationtype?: string;
    filterPriority: string | null;
    filterType: string | null;
    onClearFilter: () => void;
    priorityMenu: any;
    typeMenu: any;
    onMarkAll: () => void;
    markAllLoading: boolean;
    isMobile: boolean;
    onReload?: () => void;
}> = ({ notificationtype, filterPriority, filterType, onClearFilter, priorityMenu, typeMenu, onMarkAll, markAllLoading, isMobile, onReload }) => (
    <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10, padding: "0 0 14px",
    }}>
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
                background: C.primaryLight, borderRadius: 8,
                padding: "4px 6px", color: C.primary, fontSize: 15, lineHeight: 1,
            }}>
                <BellOutlined />
            </div>
            <Text strong style={{ fontSize: 13, color: C.darkText }}>
                {notificationtype
                    ? `${notificationtype.charAt(0).toUpperCase() + notificationtype.slice(1)} Notifications`
                    : "All Notifications"}
            </Text>
            {(filterPriority || filterType) && (
                <Button size="small" icon={<ReloadOutlined />} onClick={onClearFilter}
                    style={{ borderRadius: 6, fontSize: 11 }}>
                    Clear filters
                </Button>
            )}
        </div>

        {/* Right */}
        <Space size={8} wrap>
            {isMobile && onReload && (
                <Button size="small" icon={<ReloadOutlined />} onClick={onReload} style={{ borderRadius: 7 }} />
            )}
            <Dropdown menu={priorityMenu}>
                <Button size="small" icon={<FilterOutlined />} style={{
                    borderRadius: 7,
                    background: filterPriority ? C.primaryLight : undefined,
                    color: filterPriority ? C.primary : undefined,
                }}>
                    {filterPriority
                        ? filterPriority.charAt(0).toUpperCase() + filterPriority.slice(1)
                        : "Priority"}
                </Button>
            </Dropdown>
            <Dropdown menu={typeMenu}>
                <Button size="small" icon={<MailOutlined />} style={{
                    borderRadius: 7,
                    background: filterType ? C.primaryLight : undefined,
                    color: filterType ? C.primary : undefined,
                }}>
                    {filterType
                        ? TYPE_CFG[filterType]?.label || filterType.replace(/_/g, " ")
                        : "Type"}
                </Button>
            </Dropdown>
            {notificationtype !== "system" && (
                <Button size="small" type="primary" icon={<CheckOutlined />}
                    loading={markAllLoading}
                    onClick={onMarkAll}
                    style={{ background: C.primary, borderColor: C.primary, borderRadius: 7 }}>
                    {isMobile ? "Read All" : "Mark All as Read"}
                </Button>
            )}
        </Space>
    </div>
);

// ── Main component ────────────────────────────────────────────────────────────
interface AllNotificationsProps {
    notificationtype?: string;
}

const AllNotifications: React.FC<AllNotificationsProps> = ({ notificationtype }) => {
    const isMobile = useIsMobile();
    const actionRef = useRef<ActionType>();
    const queryClient = useQueryClient();

    const [showDetails, setShowDetails] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);
    const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [filterPriority, setFilterPriority] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string | null>(null);
    const [mobileReloadKey, setMobileReloadKey] = useState(0);

    const { deleteNotificationMutation, markAsReadMutation } =
        useNotificationMutations(actionRef);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
        queryClient.invalidateQueries({ queryKey: ["systemNotifications"] });
        queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
    };

    const markAllMutation = useMutation({
        mutationFn: () => markAllNotificationsAsRead({
            priority: filterPriority || undefined,
            type: filterType || (notificationtype === "system" ? "system" : undefined),
            read: notificationtype === "unread" ? false : undefined,
        }),
        onSuccess: () => {
            message.success("All notifications marked as read");
            invalidate();
            actionRef.current?.reload();
            setMobileReloadKey((k) => k + 1);
        },
    });

    const handleViewDetails = (record: any) => {
        setSelectedNotification(record);
        if (isMobile) setDetailDrawerOpen(true);
        else setShowDetails(true);
    };

    const handleDelete = (id: string) => {
        confirm({
            title: "Delete this notification?",
            icon: <ExclamationCircleOutlined />,
            content: "This action cannot be undone.",
            okText: "Delete",
            okType: "danger",
            cancelText: "Cancel",
            onOk: () => {
                deleteNotificationMutation.mutate(id);
                setMobileReloadKey((k) => k + 1);
            },
        });
    };

    const handleMarkRead = (id: string) => {
        markAsReadMutation.mutate(id);
        setMobileReloadKey((k) => k + 1);
    };

    const handleBulkMarkRead = () => {
        if (selectedKeys.length === 0) { message.warning("Select notifications first"); return; }
        selectedKeys.forEach((id) => markAsReadMutation.mutate(id as string));
        message.success("Selected notifications marked as read");
        actionRef.current?.reload();
        setSelectedKeys([]);
    };

    const priorityMenu = {
        items: [
            { key: "low", label: <PriorityTag priority="low" /> },
            { key: "medium", label: <PriorityTag priority="medium" /> },
            { key: "high", label: <PriorityTag priority="high" /> },
            { key: "urgent", label: <PriorityTag priority="urgent" /> },
            { key: "clear", label: "Clear", danger: true },
        ],
        onClick: ({ key }: { key: string }) => {
            const next = key === "clear" ? null : key;
            setFilterPriority(next);
            actionRef.current?.reload();
            setMobileReloadKey((k) => k + 1);
        },
    };

    const typeMenu = {
        items: [
            { key: "new_appointment_booking", label: <TypeTag type="new_appointment_booking" /> },
            { key: "new_appointment", label: <TypeTag type="new_appointment" /> },
            { key: "inventory_out_of_stock", label: <TypeTag type="inventory_out_of_stock" /> },
            { key: "low_inventory", label: <TypeTag type="low_inventory" /> },
            { key: "system", label: <TypeTag type="system" /> },
            { key: "clear", label: "Clear", danger: true },
        ],
        onClick: ({ key }: { key: string }) => {
            const next = key === "clear" ? null : key;
            setFilterType(next);
            actionRef.current?.reload();
            setMobileReloadKey((k) => k + 1);
        },
    };

    // ── Desktop: show detail full-page view ────────────────────────────────────
    if (showDetails) {
        return (
            <NotificationDetailView
                record={selectedNotification}
                setShowDetails={setShowDetails}
            />
        );
    }

    const toolbarNode = (
        <Toolbar
            notificationtype={notificationtype}
            filterPriority={filterPriority}
            filterType={filterType}
            onClearFilter={() => { setFilterPriority(null); setFilterType(null); actionRef.current?.reload(); setMobileReloadKey((k) => k + 1); }}
            priorityMenu={priorityMenu}
            typeMenu={typeMenu}
            onMarkAll={() => markAllMutation.mutate()}
            markAllLoading={markAllMutation.isLoading}
            isMobile={isMobile}
            onReload={() => setMobileReloadKey((k) => k + 1)}
        />
    );

    // ── Mobile ─────────────────────────────────────────────────────────────────
    if (isMobile) {
        return (
            <>
                {toolbarNode}

                {/* key forces MobileNotificationList to re-fetch when reload triggered */}
                <MobileNotificationList
                    key={mobileReloadKey}
                    notificationtype={notificationtype}
                    onViewDetails={handleViewDetails}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    filterPriority={filterPriority}
                    filterType={filterType}
                />

                <DetailDrawer
                    notification={selectedNotification}
                    open={detailDrawerOpen}
                    onClose={() => setDetailDrawerOpen(false)}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                />
            </>
        );
    }

    // ── Desktop ────────────────────────────────────────────────────────────────
    return (
        <>
            {toolbarNode}

            <ProList
                rowKey="_id"
                showActions="hover"
                showExtra="hover"
                actionRef={actionRef}
                onRow={(record) => ({
                    onClick: () => handleViewDetails(record),
                    style: { cursor: "pointer" },
                })}
                metas={{
                    title: {
                        search: false,
                        dataIndex: "title",
                        render: (_, record) => (
                            <Text strong={!record.read} style={{ fontSize: 13, color: C.darkText }}>
                                {record.title}
                            </Text>
                        ),
                    },
                    description: {
                        search: false,
                        dataIndex: "message",
                        render: (text) => (
                            <Text style={{ fontSize: 12, color: C.subText }} ellipsis={{ tooltip: String(text) }}>
                                {String(text)}
                            </Text>
                        ),
                    },
                    subTitle: {
                        title: <span style={{ color: C.primary }}><FilterOutlined /> Priority</span>,
                        dataIndex: "priority",
                        render: (_, record) => <PriorityTag priority={record.priority} />,
                        valueType: "select",
                        valueEnum: { High: "High", Medium: "Medium", Low: "Low" },
                    },
                    avatar: {
                        search: notificationtype !== "unread",
                        title: <span style={{ color: C.primary }}><MailOutlined /> Priority</span>,
                        dataIndex: "priority",
                        render: (_, record) => {
                            const cfg = PRIORITY_CFG[record.priority?.toLowerCase()] || { color: C.subText };
                            return (
                                <span style={{
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: 5, height: 18, borderRadius: 2,
                                    background: record.read ? C.border : cfg.color,
                                }} />
                            );
                        },
                        valueType: "select",
                        valueEnum: { "": "All", false: "Unread", true: "Read" },
                    },
                    extra: {
                        search: false,
                        render: (_, record) => (
                            <Space size={4}>
                                {!record.read && (
                                    <Button type="text" size="small"
                                        icon={<CheckCircleOutlined style={{ color: C.green }} />}
                                        title="Mark as Read"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            markAsReadMutation.mutate(record._id);
                                        }}
                                    />
                                )}
                                <Popconfirm
                                    title="Delete this notification?"
                                    onConfirm={(e) => {
                                        e?.stopPropagation();
                                        deleteNotificationMutation.mutate(record._id);
                                    }}
                                    okText="Delete" cancelText="Cancel"
                                    okButtonProps={{ danger: true }}
                                >
                                    <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </Popconfirm>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<EyeOutlined style={{ color: C.blue }} />}
                                    title="View Details"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewDetails(record);
                                    }}
                                />
                            </Space>
                        ),
                    },
                    actions: {
                        search: false,
                        render: (_, record) => [
                            <Text key="time" style={{ fontSize: 11, color: "#94a3b8" }}>
                                {dayjs(record.createdAt).fromNow()}
                            </Text>,
                        ],
                    },
                }}
                search={{ filterType: "light" }}
                bordered
                size="large"
                request={async (params) => {
                    const data = await fetchMyNotifications({
                        current: params.current,
                        pageSize: params.pageSize,
                        priority: filterPriority || params.priority?.toLowerCase(),
                        type: filterType || (notificationtype === "system" ? "system" : ""),
                        read: notificationtype === "unread" ? false : params.read,
                    });
                    const list = data?.data || [];
                    return { data: list, success: true, total: data?.pagination?.total || list.length };
                }}
                rowSelection={{
                    selectedRowKeys: selectedKeys,
                    onChange: (keys) => setSelectedKeys(keys),
                }}
                tableAlertRender={({ selectedRowKeys }) => `${selectedRowKeys.length} selected`}
                tableAlertOptionRender={({ onCleanSelected }) => (
                    <Space>
                        <Button type="link" size="small" icon={<CheckOutlined />} onClick={handleBulkMarkRead}>
                            Mark as Read
                        </Button>
                        <Button type="link" size="small" onClick={onCleanSelected}>Clear</Button>
                    </Space>
                )}
                scroll={{ x: "inherit" }}
                options={{ fullScreen: true, setting: false, reload: () => actionRef.current?.reload() }}
                pagination={{
                    defaultPageSize: 10,
                    pageSizeOptions: ["10", "20", "50", "100"],
                    showSizeChanger: true,
                    responsive: true,
                    showTotal: (total, range) => (
                        <Text style={{ fontSize: 12, color: C.subText }}>{range[0]}–{range[1]} of {total}</Text>
                    ),
                }}
                rowClassName={(record) => !record.read ? "notif-unread" : ""}
            />

            <style>{`.notif-unread { background-color: ${C.blue}06 !important; }`}</style>
        </>
    );
};

export default AllNotifications;