import React, { useEffect, useRef, useState } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
    Button,
    Card,
    Dropdown,
    Empty,
    message,
    Popconfirm,
    Skeleton,
    Space,
    Typography,
} from "antd";
import {
    DeleteOutlined,
    KeyOutlined,
    MoreOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { deletePermission, fetchAllPermissions } from "@services/permission";
import PermissionModal from "@components/MODALS/pro/PermissionModal";

const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    orange: "#f59e0b",
    red: "#ef4444",
    blue: "#3b82f6",
    indigo: "#6366f1",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

// ── Mobile hook ───────────────────────────────────────────────────────────────
const useIsMobile = () => {
    const [v, setV] = useState(window.innerWidth < 768);
    useEffect(() => {
        const h = () => setV(window.innerWidth < 768);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return v;
};

// ── HTTP method badge ─────────────────────────────────────────────────────────
const METHOD_CFG: Record<string, { color: string; bg: string }> = {
    GET: { color: C.green, bg: "#f0fdf4" },
    POST: { color: C.blue, bg: "#eff6ff" },
    PUT: { color: C.orange, bg: "#fffbeb" },
    PATCH: { color: C.indigo, bg: "#eef2ff" },
    DELETE: { color: C.red, bg: "#fef2f2" },
};

const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
    const m = method?.toUpperCase() || "GET";
    const cfg = METHOD_CFG[m] || { color: C.subText, bg: C.bg };
    return (
        <span
            style={{
                background: cfg.bg,
                color: cfg.color,
                borderRadius: 5,
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 7px",
                letterSpacing: "0.4px",
                fontFamily: "monospace",
                whiteSpace: "nowrap",
            }}
        >
            {m}
        </span>
    );
};

// ── Group tag ─────────────────────────────────────────────────────────────────
const GroupTag: React.FC<{ group: string }> = ({ group }) => (
    <span
        style={{
            background: C.primaryLight,
            color: C.primary,
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 9px",
            whiteSpace: "nowrap",
        }}
    >
        {group}
    </span>
);

// ── Action cell ───────────────────────────────────────────────────────────────
const ActionCell: React.FC<{
    record: any;
    actionRef: React.MutableRefObject<ActionType | undefined>;
    onDelete: (id: string) => void;
    deleteLoading: boolean;
    isMobile?: boolean;
}> = ({ record, actionRef, onDelete, deleteLoading, isMobile }) => {
    const menuItems = [
        {
            key: "delete",
            icon: <DeleteOutlined style={{ color: C.red }} />,
            danger: true,
            label: (
                <Popconfirm
                    title="Delete this permission?"
                    description="This action cannot be undone."
                    onConfirm={() => onDelete(record._id)}
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                >
                    <span style={{ color: C.red }}>Delete</span>
                </Popconfirm>
            ),
        },
    ];

    return (
        <Space size={4}>
            <PermissionModal actionRef={actionRef} edit data={record} />
            <Dropdown
                menu={{ items: menuItems }}
                trigger={["click"]}
                placement={isMobile ? "topRight" : "bottomRight"}
            >
                <Button
                    type="text"
                    icon={<MoreOutlined />}
                    loading={deleteLoading}
                    style={{
                        width: 30, height: 30, padding: 0, borderRadius: 7,
                        border: `1px solid ${C.border}`,
                        background: C.bg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                />
            </Dropdown>
        </Space>
    );
};

// ── Mobile permission card ────────────────────────────────────────────────────
const PermissionCard: React.FC<{
    record: any;
    actionRef: React.MutableRefObject<ActionType | undefined>;
    onDelete: (id: string) => void;
    deleteLoading: boolean;
}> = ({ record, actionRef, onDelete, deleteLoading }) => (
    <Card
        style={{
            borderRadius: 12,
            marginBottom: 10,
            border: `1px solid ${C.border}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
        bodyStyle={{ padding: "12px 14px" }}
    >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        background: C.primaryLight,
                        borderRadius: 8,
                        width: 36,
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: C.primary,
                        fontSize: 15,
                        flexShrink: 0,
                    }}
                >
                    <KeyOutlined />
                </div>
                <div style={{ minWidth: 0 }}>
                    <Text strong style={{ fontSize: 13, color: C.darkText, display: "block", lineHeight: 1.3 }}>
                        {record.name}
                    </Text>
                    {record.group_name && <GroupTag group={record.group_name} />}
                </div>
            </div>
            <ActionCell
                record={record}
                actionRef={actionRef}
                onDelete={onDelete}
                deleteLoading={deleteLoading}
                isMobile
            />
        </div>

        {/* Route + method */}
        <div
            style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "7px 10px",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                overflow: "hidden",
            }}
        >
            <MethodBadge method={record.method} />
            <Text
                style={{
                    fontSize: 11,
                    color: C.subText,
                    fontFamily: "monospace",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                }}
            >
                {record.route_url}
            </Text>
        </div>

        {/* Dates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
                { label: "Created", value: new Date(record.createdAt).toLocaleDateString() },
                { label: "Updated", value: new Date(record.updatedAt).toLocaleDateString() },
            ].map(({ label, value }) => (
                <div
                    key={label}
                    style={{
                        background: C.bg,
                        borderRadius: 8,
                        padding: "6px 10px",
                        border: `1px solid ${C.border}`,
                    }}
                >
                    <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                        {label}
                    </Text>
                    <Text style={{ fontSize: 12, color: C.darkText, fontWeight: 500 }}>{value}</Text>
                </div>
            ))}
        </div>
    </Card>
);

// ── Mobile list ───────────────────────────────────────────────────────────────
const MobilePermissionList: React.FC<{
    actionRef: React.MutableRefObject<ActionType | undefined>;
    onDelete: (id: string) => void;
    deleteLoading: boolean;
}> = ({ actionRef, onDelete, deleteLoading }) => {
    const [permissions, setPermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const load = async () => {
        setLoading(true);
        try {
            const data = await fetchAllPermissions({});
            setPermissions(Array.isArray(data) ? data : []);
        } catch {
            message.error("Failed to load permissions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // expose reload to actionRef
    useEffect(() => {
        if (actionRef.current) {
            (actionRef.current as any).reload = load;
        }
    }, [actionRef]);

    const visible = search
        ? permissions.filter(
            (p) =>
                p.name?.toLowerCase().includes(search.toLowerCase()) ||
                p.group_name?.toLowerCase().includes(search.toLowerCase()) ||
                p.route_url?.toLowerCase().includes(search.toLowerCase())
        )
        : permissions;

    // Group counts by method for summary
    const methodCounts = permissions.reduce((acc: Record<string, number>, p) => {
        const m = p.method?.toUpperCase() || "OTHER";
        acc[m] = (acc[m] || 0) + 1;
        return acc;
    }, {});

    const topMethods = Object.entries(methodCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    return (
        <div>
            {/* Toolbar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                <input
                    placeholder="Search permissions…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        flex: 1, height: 36, borderRadius: 8,
                        border: `1px solid ${C.border}`,
                        padding: "0 12px", fontSize: 13, outline: "none",
                        color: C.darkText, background: C.bg,
                    }}
                />
                <Button
                    icon={<ReloadOutlined />}
                    onClick={load}
                    loading={loading}
                    style={{ borderRadius: 8, height: 36, width: 36, padding: 0, flexShrink: 0 }}
                />
                <PermissionModal actionRef={actionRef} />
            </div>

            {/* Summary strip */}
            {!loading && permissions.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(topMethods.length + 1, 4)}, 1fr)`, gap: 8, marginBottom: 14 }}>
                    <div style={{ background: "#eef2ff", borderRadius: 8, padding: "8px 6px", textAlign: "center", border: `1px solid ${C.border}` }}>
                        <Text style={{ fontSize: 16, fontWeight: 700, color: C.indigo, display: "block" }}>{permissions.length}</Text>
                        <Text style={{ fontSize: 10, color: "#94a3b8" }}>Total</Text>
                    </div>
                    {topMethods.map(([method, count]) => {
                        const cfg = METHOD_CFG[method] || { color: C.subText, bg: C.bg };
                        return (
                            <div key={method} style={{ background: cfg.bg, borderRadius: 8, padding: "8px 6px", textAlign: "center", border: `1px solid ${C.border}` }}>
                                <Text style={{ fontSize: 16, fontWeight: 700, color: cfg.color, display: "block" }}>{count}</Text>
                                <Text style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{method}</Text>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Cards */}
            {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} style={{ borderRadius: 12, marginBottom: 10, border: `1px solid ${C.border}` }} bodyStyle={{ padding: 14 }}>
                        <Skeleton active paragraph={{ rows: 3 }} />
                    </Card>
                ))
            ) : visible.length === 0 ? (
                <Empty description="No permissions found" style={{ padding: "40px 0" }} />
            ) : (
                visible.map((record) => (
                    <PermissionCard
                        key={record._id}
                        record={record}
                        actionRef={actionRef}
                        onDelete={onDelete}
                        deleteLoading={deleteLoading}
                    />
                ))
            )}
        </div>
    );
};

// ── Main ──────────────────────────────────────────────────────────────────────
function PermissionSettings() {
    const actionRef = useRef<ActionType>();
    const isMobile = useIsMobile();

    const deletePermissionMutation = useMutation(deletePermission, {
        onSuccess: () => {
            actionRef.current?.reload();
            message.success("Permission deleted");
        },
        onError: () => message.error("Failed to delete permission"),
    });

    const handleDelete = (id: string) => deletePermissionMutation.mutate(id);

    // ── Mobile ─────────────────────────────────────────────────────────────────
    if (isMobile) {
        return (
            <MobilePermissionList
                actionRef={actionRef as React.MutableRefObject<ActionType | undefined>}
                onDelete={handleDelete}
                deleteLoading={deletePermissionMutation.isLoading}
            />
        );
    }

    // ── Desktop ────────────────────────────────────────────────────────────────
    return (
        <ProTable
            columns={[
                {
                    title: "Name",
                    dataIndex: "name",
                    key: "name",
                    fieldProps: { placeholder: "Search by name", allowClear: true },
                    sorter: true,
                    render: (_: any, record: any) => (
                        <Space size={10}>
                            <div
                                style={{
                                    background: C.primaryLight,
                                    borderRadius: 7,
                                    width: 28,
                                    height: 28,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: C.primary,
                                    fontSize: 12,
                                    flexShrink: 0,
                                }}
                            >
                                <KeyOutlined />
                            </div>
                            <Text strong style={{ fontSize: 13, color: C.darkText }}>
                                {record.name}
                            </Text>
                        </Space>
                    ),
                },
                {
                    title: "Group",
                    dataIndex: "group_name",
                    key: "group_name",
                    fieldProps: { placeholder: "Search by group", allowClear: true },
                    sorter: true,
                    width: 150,
                    render: (value: string) => value ? <GroupTag group={value} /> : <Text style={{ color: "#94a3b8", fontSize: 12 }}>—</Text>,
                },
                {
                    title: "Method",
                    dataIndex: "method",
                    key: "method",
                    fieldProps: { placeholder: "Filter method", allowClear: true },
                    sorter: true,
                    width: 100,
                    render: (value: string) => <MethodBadge method={value} />,
                },
                {
                    title: "Route URL",
                    dataIndex: "route_url",
                    key: "route_url",
                    fieldProps: { placeholder: "Search by route", allowClear: true },
                    sorter: true,
                    ellipsis: true,
                    render: (value: string) => (
                        <Text
                            style={{
                                fontSize: 12,
                                color: C.subText,
                                fontFamily: "monospace",
                            }}
                            ellipsis={{ tooltip: value }}
                        >
                            {value}
                        </Text>
                    ),
                },
                {
                    title: "Created",
                    dataIndex: "createdAt",
                    key: "createdAt",
                    search: false,
                    sorter: true,
                    width: 120,
                    render: (value: string) => (
                        <Text style={{ fontSize: 12, color: C.subText }}>
                            {new Date(value).toLocaleDateString()}
                        </Text>
                    ),
                },
                {
                    title: "Updated",
                    dataIndex: "updatedAt",
                    key: "updatedAt",
                    search: false,
                    sorter: true,
                    width: 120,
                    render: (value: string) => (
                        <Text style={{ fontSize: 12, color: C.subText }}>
                            {new Date(value).toLocaleDateString()}
                        </Text>
                    ),
                },
                {
                    title: "Actions",
                    key: "actions",
                    search: false,
                    width: 90,
                    fixed: "right" as const,
                    render: (_: any, record: any) => (
                        <ActionCell
                            record={record}
                            actionRef={actionRef as React.MutableRefObject<ActionType | undefined>}
                            onDelete={handleDelete}
                            deleteLoading={deletePermissionMutation.isLoading}
                        />
                    ),
                },
            ]}
            actionRef={actionRef}
            rowKey="_id"
            request={async (params) => {
                try {
                    const data = await fetchAllPermissions(params);
                    return { data, success: true, total: data.length };
                } catch {
                    message.error("Failed to load permissions");
                    return { data: [], success: false };
                }
            }}
            headerTitle={
                <Space size={8}>
                    <div
                        style={{
                            background: C.primaryLight,
                            borderRadius: 8,
                            padding: "5px 6px",
                            color: C.primary,
                            fontSize: 15,
                            lineHeight: 1,
                        }}
                    >
                        <KeyOutlined />
                    </div>
                    <Text strong style={{ fontSize: 14, color: C.darkText }}>
                        Permission Settings
                    </Text>
                </Space>
            }
            pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => (
                    <Text style={{ fontSize: 12, color: C.subText }}>
                        {range[0]}–{range[1]} of {total} permissions
                    </Text>
                ),
            }}
            options={{
                density: true,
                fullScreen: true,
                reload: () => actionRef.current?.reload(),
                setting: true,
            }}
            tableAlertRender={({ selectedRowKeys }) =>
                selectedRowKeys.length > 0
                    ? <Text style={{ fontSize: 13 }}>{selectedRowKeys.length} selected</Text>
                    : null
            }
            rowSelection={{ alwaysShowAlert: false, selections: true }}
            search={{
                searchText: "Search",
                resetText: "Reset",
                labelWidth: "auto",
                filterType: "light",
            }}
            toolBarRender={() => [<PermissionModal key="addPermission" actionRef={actionRef} />]}
            dateFormatter="string"
            scroll={{ x: 900 }}
        />
    );
}

export default PermissionSettings;