import React, { useMemo, useState } from "react";
import {
    Collapse,
    Empty,
    Input,
    Select,
    Tooltip,
    Typography,
} from "antd";
import {
    LockOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import {
    PERMISSIONS,
    Permission,
    ActionType,
    ModuleScope,
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

// ── Action config ─────────────────────────────────────────────────────────────
const ACTION_CFG: Record<ActionType, { color: string; dot: string; label: string }> = {
    create: { color: C.blue,   dot: C.blue,   label: "CREATE" },
    read:   { color: C.green,  dot: C.green,  label: "READ"   },
    update: { color: C.orange, dot: C.orange, label: "UPDATE" },
    delete: { color: C.red,    dot: C.red,    label: "DELETE" },
    special:{ color: C.purple, dot: C.purple, label: "ACTION" },
};

// ── Module scope config ───────────────────────────────────────────────────────
const SCOPE_CFG: Record<ModuleScope, { color: string; bg: string; label: string }> = {
    core:       { color: C.indigo, bg: "#eef2ff", label: "Core"       },
    pos:        { color: C.indigo, bg: "#eef2ff", label: "POS"        },
    hr:         { color: C.blue,   bg: "#eff6ff", label: "HR"         },
    accounting: { color: C.purple, bg: "#faf5ff", label: "Accounting" },
    crm:        { color: C.green,  bg: "#f0fdf4", label: "CRM"        },
    dala:       { color: "#0ea5e9", bg: "#f0f9ff", label: "Dala"      },
    signature:  { color: C.primary, bg: C.primaryLight, label: "Signature" },
};

// ── Permission chip ───────────────────────────────────────────────────────────
const PermChip: React.FC<{ perm: Permission }> = ({ perm }) => {
    const ac = ACTION_CFG[perm.action] ?? ACTION_CFG.special;
    return (
        <Tooltip
            title={
                <div style={{ fontSize: 11 }}>
                    <div style={{ fontFamily: "monospace", color: "#a5f3fc", marginBottom: 3 }}>{perm.key}</div>
                    <span style={{ background: ac.color + "33", color: ac.color, borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>
                        {ac.label}
                    </span>
                </div>
            }
            placement="top"
        >
            <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: "#fff", border: `1px solid ${C.border}`,
                borderRadius: 6, padding: "4px 9px", cursor: "default",
                fontSize: 12, color: C.darkText, lineHeight: 1.3,
                transition: "border-color 0.15s",
            }}>
                <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: ac.dot, flexShrink: 0,
                }} />
                {perm.label}
            </div>
        </Tooltip>
    );
};

// ── Module panel header ───────────────────────────────────────────────────────
const ModulePanelHeader: React.FC<{
    module: string;
    perms: Permission[];
    scope: ModuleScope;
}> = ({ module, perms, scope }) => {
    const sc = SCOPE_CFG[scope];
    const counts = perms.reduce<Record<string, number>>((acc, p) => {
        acc[p.action] = (acc[p.action] || 0) + 1;
        return acc;
    }, {});

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Text strong style={{ fontSize: 13, color: C.darkText, minWidth: 120 }}>{module}</Text>

            {/* count badge */}
            <span style={{
                background: C.primaryLight, color: C.primary,
                borderRadius: 10, fontSize: 10, fontWeight: 700,
                padding: "1px 7px", border: `1px solid ${C.primary}25`,
            }}>
                {perms.length}
            </span>

            {/* scope badge */}
            <span style={{
                background: sc.bg, color: sc.color,
                borderRadius: 4, fontSize: 10, fontWeight: 600,
                padding: "2px 6px",
            }}>
                {sc.label}
            </span>

            {/* action dots */}
            <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                {(Object.entries(counts) as [ActionType, number][]).map(([action, cnt]) => {
                    const ac = ACTION_CFG[action];
                    return (
                        <Tooltip key={action} title={`${cnt} ${ac.label}`}>
                            <span style={{
                                display: "inline-flex", alignItems: "center", gap: 3,
                                background: ac.color + "15", color: ac.color,
                                borderRadius: 4, fontSize: 10, fontWeight: 600,
                                padding: "2px 6px",
                            }}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: ac.color }} />
                                {cnt}
                            </span>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
};

// ── Main ──────────────────────────────────────────────────────────────────────
function PermissionSettings() {
    const { hasHR, hasAccounting } = useTenantModules();

    const [search, setSearch] = useState("");
    const [filterAction, setFilterAction] = useState<ActionType | "all">("all");
    const [filterScope, setFilterScope] = useState<ModuleScope | "all">("all");

    // All permissions scoped to this tenant's enabled modules
    const tenantPerms = useMemo(
        () => Object.values(PERMISSIONS).filter((p) => {
            if (p.moduleScope === "core") return true;
            if (p.moduleScope === "hr") return hasHR;
            if (p.moduleScope === "accounting") return hasAccounting;
            return false;
        }),
        [hasHR, hasAccounting]
    );

    // Filtered list
    const filtered = useMemo(() =>
        tenantPerms.filter((p) => {
            const q = search.toLowerCase();
            const matchSearch = !q || p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q) || p.module.toLowerCase().includes(q);
            const matchAction = filterAction === "all" || p.action === filterAction;
            const matchScope  = filterScope  === "all" || p.moduleScope === filterScope;
            return matchSearch && matchAction && matchScope;
        }),
        [tenantPerms, search, filterAction, filterScope]
    );

    // Group by module
    const grouped = useMemo(() =>
        filtered.reduce<Record<string, Permission[]>>((acc, p) => {
            if (!acc[p.module]) acc[p.module] = [];
            acc[p.module].push(p);
            return acc;
        }, {}),
        [filtered]
    );

    const moduleKeys = Object.keys(grouped);

    // Scope filter options
    const scopeOptions = useMemo(() => {
        const opts: { label: string; value: string }[] = [
            { label: "All Scopes", value: "all" },
            { label: "Core (POS)", value: "core" },
        ];
        if (hasHR)         opts.push({ label: "HR",         value: "hr"         });
        if (hasAccounting) opts.push({ label: "Accounting",  value: "accounting" });
        return opts;
    }, [hasHR, hasAccounting]);

    const totalModules  = new Set(tenantPerms.map((p) => p.module)).size;

    return (
        <div style={{ padding: "16px 16px 24px" }}>

            {/* ── Compact toolbar ──────────────────────────────────────────── */}
            <div style={{
                background: "#fff", border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "10px 14px", marginBottom: 14,
                display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
            }}>
                {/* Icon + title */}
                <div style={{
                    background: C.primaryLight, borderRadius: 7,
                    padding: "5px 7px", color: C.primary, fontSize: 14, lineHeight: 1,
                }}>
                    <LockOutlined />
                </div>
                <div style={{ marginRight: 4 }}>
                    <Text strong style={{ fontSize: 13, color: C.darkText, display: "block", lineHeight: 1.2 }}>
                        Permission Matrix
                    </Text>
                    <Text style={{ fontSize: 11, color: C.subText }}>
                        {tenantPerms.length} permissions · {totalModules} modules
                        {hasHR && " · HR"}
                        {hasAccounting && " · Accounting"}
                    </Text>
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Search */}
                <Input
                    prefix={<SearchOutlined style={{ color: "#94a3b8", fontSize: 12 }} />}
                    placeholder="Search permissions…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                    style={{ width: 200, borderRadius: 7, fontSize: 12 }}
                    size="small"
                />

                {/* Action filter */}
                <Select
                    size="small"
                    value={filterAction}
                    onChange={setFilterAction}
                    style={{ width: 130 }}
                    options={[
                        { label: "All Actions", value: "all"     },
                        { label: "Read",        value: "read"    },
                        { label: "Create",      value: "create"  },
                        { label: "Update",      value: "update"  },
                        { label: "Delete",      value: "delete"  },
                        { label: "Special",     value: "special" },
                    ]}
                />

                {/* Scope filter */}
                <Select
                    size="small"
                    value={filterScope}
                    onChange={(v) => setFilterScope(v as ModuleScope | "all")}
                    style={{ width: 130 }}
                    options={scopeOptions}
                />

                {/* Result count */}
                <Text style={{ fontSize: 11, color: C.subText, flexShrink: 0 }}>
                    {filtered.length}/{tenantPerms.length}
                </Text>
            </div>

            {/* ── Module accordion ─────────────────────────────────────────── */}
            {moduleKeys.length === 0 ? (
                <Empty
                    description="No permissions match your filter"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ padding: "40px 0" }}
                />
            ) : (
                <Collapse
                    ghost
                    defaultActiveKey={moduleKeys.slice(0, 1)}
                    style={{ background: "transparent" }}
                    items={moduleKeys.map((mod) => {
                        const perms = grouped[mod];
                        const scope = perms[0].moduleScope;
                        return {
                            key: mod,
                            style: {
                                marginBottom: 6,
                                background: "#fff",
                                border: `1px solid ${C.border}`,
                                borderRadius: 10,
                                overflow: "hidden",
                            },
                            label: (
                                <ModulePanelHeader
                                    module={mod}
                                    perms={perms}
                                    scope={scope}
                                />
                            ),
                            children: (
                                <div style={{
                                    display: "flex", flexWrap: "wrap", gap: 6,
                                    padding: "4px 4px 10px",
                                    borderTop: `1px solid ${C.border}`,
                                    background: C.bg,
                                }}>
                                    {perms.map((perm) => (
                                        <PermChip key={perm.key} perm={perm} />
                                    ))}
                                </div>
                            ),
                        };
                    })}
                />
            )}
        </div>
    );
}

export default PermissionSettings;
