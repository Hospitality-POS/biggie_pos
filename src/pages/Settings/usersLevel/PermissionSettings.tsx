import React, { useEffect, useMemo, useState } from "react";
import {
    Card,
    Empty,
    Input,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import {
    KeyOutlined,
    SafetyCertificateOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import {
    PERMISSIONS,
    Permission,
    ActionType,
    ModuleScope,
    getPermissionsGroupedByModuleForTenant,
} from "@utils/accessControl";
import { useTenantModules } from "@hooks/useTenantModules";

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
    purple: "#8b5cf6",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

const ACTION_CFG: Record<ActionType, { color: string; bg: string; label: string }> = {
    create: { color: C.blue, bg: "#eff6ff", label: "CREATE" },
    read: { color: C.green, bg: "#f0fdf4", label: "READ" },
    update: { color: C.orange, bg: "#fffbeb", label: "UPDATE" },
    delete: { color: C.red, bg: "#fef2f2", label: "DELETE" },
    special: { color: C.purple, bg: "#faf5ff", label: "ACTION" },
};

const SCOPE_CFG: Record<ModuleScope, { color: string; bg: string; label: string; tagColor: string }> = {
    core: { color: C.indigo, bg: "#eef2ff", label: "Core", tagColor: "default" },
    hr: { color: C.blue, bg: "#eff6ff", label: "HR", tagColor: "blue" },
    accounting: { color: C.purple, bg: "#faf5ff", label: "Accounting", tagColor: "purple" },
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

// ── Badge atoms ───────────────────────────────────────────────────────────────
const ActionBadge: React.FC<{ action: ActionType }> = ({ action }) => {
    const cfg = ACTION_CFG[action] ?? ACTION_CFG.special;
    return (
        <span
            style={{
                background: cfg.bg, color: cfg.color,
                borderRadius: 4, fontSize: 10, fontWeight: 700,
                padding: "2px 7px", fontFamily: "monospace",
                whiteSpace: "nowrap", letterSpacing: "0.3px",
            }}
        >
            {cfg.label}
        </span>
    );
};

const ScopeBadge: React.FC<{ scope: ModuleScope }> = ({ scope }) => {
    const cfg = SCOPE_CFG[scope];
    return (
        <span
            style={{
                background: cfg.bg, color: cfg.color,
                borderRadius: 4, fontSize: 10, fontWeight: 600,
                padding: "2px 7px", whiteSpace: "nowrap",
            }}
        >
            {cfg.label}
        </span>
    );
};

const ModuleTag: React.FC<{ module: string }> = ({ module }) => (
    <span
        style={{
            background: C.primaryLight, color: C.primary,
            borderRadius: 5, fontSize: 11, fontWeight: 600,
            padding: "2px 8px", whiteSpace: "nowrap",
        }}
    >
        {module}
    </span>
);

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{ label: string; value: number; color: string; bg: string; locked?: boolean }> = ({
    label, value, color, bg, locked,
}) => (
    <div
        style={{
            background: locked ? C.bg : bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 16px",
            flex: "1 1 90px",
            minWidth: 80,
            textAlign: "center",
            opacity: locked ? 0.5 : 1,
        }}
    >
        <Text style={{ fontSize: 22, fontWeight: 700, color: locked ? "#94a3b8" : color, display: "block", lineHeight: 1.2 }}>
            {locked ? "—" : value}
        </Text>
        <Text style={{ fontSize: 11, color: "#94a3b8" }}>{label}</Text>
        {locked && <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>not enabled</Text>}
    </div>
);

// ── Mobile permission card ────────────────────────────────────────────────────
const PermissionCard: React.FC<{ perm: Permission }> = ({ perm }) => (
    <Card
        style={{ borderRadius: 10, marginBottom: 8, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        bodyStyle={{ padding: "10px 12px" }}
    >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
            <div
                style={{
                    background: C.primaryLight, borderRadius: 7, width: 32, height: 32,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.primary, fontSize: 13, flexShrink: 0,
                }}
            >
                <KeyOutlined />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 12, color: C.darkText, display: "block", lineHeight: 1.3 }}>{perm.label}</Text>
                <Text style={{ fontSize: 10, color: C.subText, fontFamily: "monospace", display: "block", marginTop: 2 }}>{perm.key}</Text>
            </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <ActionBadge action={perm.action} />
            <ScopeBadge scope={perm.moduleScope} />
            <ModuleTag module={perm.module} />
        </div>
    </Card>
);

// ── Grouped view ──────────────────────────────────────────────────────────────
const GroupedView: React.FC<{ permissions: Permission[] }> = ({ permissions }) => {
    const grouped = useMemo(() => {
        return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
            if (!acc[p.module]) acc[p.module] = [];
            acc[p.module].push(p);
            return acc;
        }, {});
    }, [permissions]);

    if (!permissions.length)
        return <Empty description="No permissions match your filter" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: "40px 0" }} />;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.entries(grouped).map(([mod, perms]) => (
                <div key={mod}>
                    <div
                        style={{
                            display: "flex", alignItems: "center", gap: 10,
                            marginBottom: 8, paddingBottom: 6,
                            borderBottom: `2px solid ${C.border}`,
                        }}
                    >
                        <Text strong style={{ fontSize: 13, color: C.darkText }}>{mod}</Text>
                        <span
                            style={{
                                background: C.primaryLight, color: C.primary,
                                borderRadius: 10, fontSize: 10, fontWeight: 700,
                                padding: "1px 8px", border: `1px solid ${C.primary}30`,
                            }}
                        >
                            {perms.length}
                        </span>
                        <ScopeBadge scope={perms[0].moduleScope} />
                    </div>
                    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                        {perms.map((perm, idx) => (
                            <div
                                key={perm.key}
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    flexWrap: "wrap", gap: 8, padding: "8px 14px",
                                    background: idx % 2 === 0 ? "#fff" : C.bg,
                                    borderBottom: idx < perms.length - 1 ? `1px solid ${C.border}` : "none",
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 160 }}>
                                    <Text style={{ fontSize: 12, color: C.darkText, fontWeight: 500 }}>{perm.label}</Text>
                                    <Text style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace", display: "block", marginTop: 1 }}>{perm.key}</Text>
                                </div>
                                <ActionBadge action={perm.action} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ── Table view ────────────────────────────────────────────────────────────────
const TableView: React.FC<{ permissions: Permission[] }> = ({ permissions }) => {
    const columns = [
        {
            title: "Permission",
            key: "label",
            render: (_: any, p: Permission) => (
                <Space size={10} align="start">
                    <div
                        style={{
                            background: C.primaryLight, borderRadius: 6, width: 26, height: 26,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: C.primary, fontSize: 11, flexShrink: 0,
                        }}
                    >
                        <KeyOutlined />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 12, color: C.darkText, display: "block" }}>{p.label}</Text>
                        <Text style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{p.key}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: "Module",
            dataIndex: "module",
            key: "module",
            width: 220,
            render: (v: string) => <ModuleTag module={v} />,
        },
        {
            title: "Action",
            dataIndex: "action",
            key: "action",
            width: 100,
            render: (v: ActionType) => <ActionBadge action={v} />,
        },
        {
            title: "Scope",
            dataIndex: "moduleScope",
            key: "scope",
            width: 110,
            render: (v: ModuleScope) => <ScopeBadge scope={v} />,
        },
    ];

    return (
        <Table
            rowKey="key"
            columns={columns}
            dataSource={permissions}
            pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total, range) => <Text style={{ fontSize: 12, color: C.subText }}>{range[0]}–{range[1]} of {total}</Text>,
            }}
            size="small"
            scroll={{ x: 700 }}
            locale={{ emptyText: <Empty description="No permissions match your filter" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
    );
};

// ── Main ──────────────────────────────────────────────────────────────────────
function PermissionSettings() {
    const isMobile = useIsMobile();

    // ── Use the same robust tenant detection as RoleModal ──────────────────────
    const { hasHR, hasAccounting } = useTenantModules();

    const [search, setSearch] = useState("");
    const [filterAction, setFilterAction] = useState<ActionType | "all">("all");
    const [filterScope, setFilterScope] = useState<ModuleScope | "all">("all");
    const [viewMode, setViewMode] = useState<"grouped" | "table">("grouped");

    // All permissions scoped to this tenant's enabled modules
    const tenantPerms = useMemo(
        () =>
            Object.values(PERMISSIONS).filter((p) => {
                if (p.moduleScope === "core") return true;
                if (p.moduleScope === "hr") return hasHR;
                if (p.moduleScope === "accounting") return hasAccounting;
                return false;
            }),
        [hasHR, hasAccounting]
    );

    // Filtered list
    const filtered = useMemo(() => {
        return tenantPerms.filter((p) => {
            const matchSearch =
                !search ||
                p.label.toLowerCase().includes(search.toLowerCase()) ||
                p.key.toLowerCase().includes(search.toLowerCase()) ||
                p.module.toLowerCase().includes(search.toLowerCase());
            const matchAction = filterAction === "all" || p.action === filterAction;
            const matchScope = filterScope === "all" || p.moduleScope === filterScope;
            return matchSearch && matchAction && matchScope;
        });
    }, [tenantPerms, search, filterAction, filterScope]);

    // Stats — based on tenant-scoped perms
    const stats = useMemo(() => {
        return tenantPerms.reduce(
            (acc, p) => {
                acc.total++;
                acc[p.moduleScope] = (acc[p.moduleScope] || 0) + 1;
                return acc;
            },
            { total: 0, core: 0, hr: 0, accounting: 0 } as Record<string, number>
        );
    }, [tenantPerms]);

    const moduleCount = useMemo(
        () => new Set(tenantPerms.map((p) => p.module)).size,
        [tenantPerms]
    );

    // Scope filter options — only show enabled modules
    const scopeOptions = useMemo(() => {
        const opts: { label: string; value: string }[] = [
            { label: "All scopes", value: "all" },
            { label: "Core (POS)", value: "core" },
        ];
        if (hasHR) opts.push({ label: "HR module", value: "hr" });
        if (hasAccounting) opts.push({ label: "Accounting module", value: "accounting" });
        return opts;
    }, [hasHR, hasAccounting]);

    return (
        <div>
            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ background: C.primaryLight, borderRadius: 8, padding: "6px 7px", color: C.primary, fontSize: 16, lineHeight: 1 }}>
                    <SafetyCertificateOutlined />
                </div>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Text strong style={{ fontSize: 15, color: C.darkText }}>Permission Registry</Text>
                        <Tag color="default" style={{ fontSize: 10 }}>Core</Tag>
                        {hasHR && <Tag color="blue" style={{ fontSize: 10 }}>HR</Tag>}
                        {hasAccounting && <Tag color="purple" style={{ fontSize: 10 }}>Accounting</Tag>}
                        {!hasHR && <Tag style={{ fontSize: 10, color: "#94a3b8", borderColor: C.border }}>HR not enabled</Tag>}
                        {!hasAccounting && <Tag style={{ fontSize: 10, color: "#94a3b8", borderColor: C.border }}>Accounting not enabled</Tag>}
                    </div>
                    <Text style={{ fontSize: 12, color: C.subText }}>
                        Showing permissions available for this tenant — read-only reference
                    </Text>
                </div>
            </div>

            {/* ── Stats strip ── */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <StatCard label="Total" value={stats.total} color={C.indigo} bg="#eef2ff" />
                <StatCard label="Modules" value={moduleCount} color={C.primary} bg={C.primaryLight} />
                <StatCard label="Core" value={stats.core || 0} color={C.indigo} bg="#eef2ff" />
                <StatCard label="HR" value={stats.hr || 0} color={C.blue} bg="#eff6ff" locked={!hasHR} />
                <StatCard label="Accounting" value={stats.accounting || 0} color={C.purple} bg="#faf5ff" locked={!hasAccounting} />
            </div>

            {/* ── Filter bar ── */}
            <div
                style={{
                    background: "#fff", border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: "12px 14px", marginBottom: 14,
                    display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
                }}
            >
                <Input
                    prefix={<SearchOutlined style={{ color: "#94a3b8", fontSize: 13 }} />}
                    placeholder="Search by name, key or module…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                    style={{ flex: "1 1 220px", borderRadius: 8, height: 34, fontSize: 12 }}
                />

                <Select
                    value={filterAction}
                    onChange={(v) => setFilterAction(v)}
                    style={{ width: 160, height: 34 }}
                    options={[
                        { label: "All actions", value: "all" },
                        { label: "READ", value: "read" },
                        { label: "CREATE", value: "create" },
                        { label: "UPDATE", value: "update" },
                        { label: "DELETE", value: "delete" },
                        { label: "ACTION (Special)", value: "special" },
                    ]}
                />

                <Select
                    value={filterScope}
                    onChange={(v) => setFilterScope(v as ModuleScope | "all")}
                    style={{ width: 170, height: 34 }}
                    options={scopeOptions}
                />

                {/* View toggle */}
                <div
                    style={{
                        display: "flex", background: C.bg,
                        border: `1px solid ${C.border}`, borderRadius: 8,
                        overflow: "hidden", flexShrink: 0,
                    }}
                >
                    {(["grouped", "table"] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            style={{
                                padding: "5px 12px", fontSize: 11, fontWeight: 600,
                                border: "none", cursor: "pointer",
                                background: viewMode === mode ? C.primary : "transparent",
                                color: viewMode === mode ? "#fff" : C.subText,
                                transition: "background 0.15s",
                            }}
                        >
                            {mode === "grouped" ? "By Module" : "Flat List"}
                        </button>
                    ))}
                </div>

                <Text style={{ fontSize: 12, color: C.subText, flexShrink: 0 }}>
                    {filtered.length} / {tenantPerms.length}
                </Text>
            </div>

            {/* ── Content ── */}
            {viewMode === "grouped" ? (
                <GroupedView permissions={filtered} />
            ) : isMobile ? (
                filtered.length === 0 ? (
                    <Empty description="No permissions match your filter" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: "40px 0" }} />
                ) : (
                    filtered.map((p) => <PermissionCard key={p.key} perm={p} />)
                )
            ) : (
                <TableView permissions={filtered} />
            )}
        </div>
    );
}

export default PermissionSettings;