import React, { useEffect, useRef, useState } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
  Button,
  Card,
  Empty,
  message,
  Popconfirm,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  KeyOutlined,
  LockOutlined,
  MoreOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Dropdown } from "antd";
import { useMutation } from "@tanstack/react-query";
import { deleteRole, fetchAllRoles } from "@services/Roles";
import RoleModal from "@components/MODALS/pro/RoleModal";
import { PERMISSIONS, Permission, ActionType as PermActionType } from "@utils/accessControl";
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

const ACTION_CFG: Record<PermActionType, { color: string; bg: string; label: string }> = {
  create: { color: C.blue, bg: "#eff6ff", label: "CREATE" },
  read: { color: C.green, bg: "#f0fdf4", label: "READ" },
  update: { color: C.orange, bg: "#fffbeb", label: "UPDATE" },
  delete: { color: C.red, bg: "#fef2f2", label: "DELETE" },
  special: { color: C.purple, bg: "#faf5ff", label: "ACTION" },
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

// ── Restricted roles ──────────────────────────────────────────────────────────
const RESTRICTED = ["admin"];

const ROLE_CFG: Record<string, { color: string; bg: string }> = {
  admin: { color: C.red, bg: "#fef2f2" },
  supervisor: { color: C.orange, bg: "#fffbeb" },
  waiter: { color: C.blue, bg: "#eff6ff" },
  cashier: { color: C.green, bg: "#f0fdf4" },
};

const RoleTag: React.FC<{ role: string }> = ({ role }) => {
  const cfg = ROLE_CFG[role?.toLowerCase()] || { color: C.indigo, bg: "#eef2ff" };
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 9px",
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {role}
    </span>
  );
};

// ── Resolve permission keys from a role record ────────────────────────────────
const resolvePermissionKeys = (permissions: any[]): string[] =>
  (permissions || [])
    .map((p: any) => (typeof p === "string" ? p : p.key || p._id || ""))
    .filter(Boolean);

// ── Permission count pill ─────────────────────────────────────────────────────
const PermCountPill: React.FC<{ count: number }> = ({ count }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      background: count > 0 ? C.primaryLight : C.bg,
      color: count > 0 ? C.primary : "#94a3b8",
      border: `1px solid ${count > 0 ? C.primary + "40" : C.border}`,
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      padding: "2px 8px",
      whiteSpace: "nowrap",
    }}
  >
    <KeyOutlined style={{ fontSize: 10 }} />
    {count}
  </span>
);

// ── Module scope tags ─────────────────────────────────────────────────────────
const ModuleScopeTags: React.FC<{ permissionKeys: string[] }> = ({ permissionKeys }) => {
  const scopes = new Set(
    permissionKeys.map((k) => PERMISSIONS[k]?.moduleScope).filter(Boolean)
  );
  if (!scopes.has("hr") && !scopes.has("accounting")) return null;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {scopes.has("hr") && (
        <Tag color="blue" style={{ fontSize: 10, margin: 0, padding: "0 5px" }}>HR</Tag>
      )}
      {scopes.has("accounting") && (
        <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: "0 5px" }}>Acct</Tag>
      )}
    </div>
  );
};

// ── Permission summary chips + tooltip ────────────────────────────────────────
const PermissionSummary: React.FC<{ permissionKeys: string[]; maxVisible?: number }> = ({
  permissionKeys,
  maxVisible = 4,
}) => {
  if (!permissionKeys.length)
    return <Text style={{ fontSize: 11, color: "#94a3b8" }}>No permissions</Text>;

  const counts = permissionKeys.reduce<Record<string, number>>((acc, key) => {
    const action = PERMISSIONS[key]?.action;
    if (action) acc[action] = (acc[action] || 0) + 1;
    return acc;
  }, {});

  const visiblePerms = permissionKeys
    .slice(0, maxVisible)
    .map((k) => PERMISSIONS[k])
    .filter(Boolean) as Permission[];

  const hiddenCount = permissionKeys.length - maxVisible;

  const tooltipContent = (
    <div style={{ maxWidth: 340, maxHeight: 300, overflowY: "auto" }}>
      <div style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 4 }}>
          {permissionKeys.length} permission{permissionKeys.length !== 1 ? "s" : ""} — by type:
        </Text>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {Object.entries(counts).map(([action, count]) => {
            const cfg = ACTION_CFG[action as PermActionType] ?? ACTION_CFG.special;
            return (
              <span
                key={action}
                style={{
                  background: cfg.bg,
                  color: cfg.color,
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                }}
              >
                {cfg.label}: {count}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {permissionKeys.map((key) => {
          const perm = PERMISSIONS[key];
          if (!perm) return null;
          const cfg = ACTION_CFG[perm.action] ?? ACTION_CFG.special;
          return (
            <span
              key={key}
              style={{
                background: cfg.bg,
                color: cfg.color,
                borderRadius: 4,
                fontSize: 10,
                padding: "1px 6px",
                border: `1px solid ${cfg.color}30`,
              }}
            >
              {perm.label}
            </span>
          );
        })}
      </div>
    </div>
  );

  return (
    <Tooltip title={tooltipContent} overlayStyle={{ maxWidth: 380 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, cursor: "help" }}>
        {visiblePerms.map((perm) => {
          const cfg = ACTION_CFG[perm.action] ?? ACTION_CFG.special;
          return (
            <span
              key={perm.key}
              style={{
                background: cfg.bg,
                color: cfg.color,
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 500,
                padding: "1px 6px",
                border: `1px solid ${cfg.color}20`,
                whiteSpace: "nowrap",
              }}
            >
              {perm.label}
            </span>
          );
        })}
        {hiddenCount > 0 && (
          <span
            style={{
              background: C.bg,
              color: C.subText,
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 6px",
              border: `1px solid ${C.border}`,
              whiteSpace: "nowrap",
            }}
          >
            +{hiddenCount} more
          </span>
        )}
      </div>
    </Tooltip>
  );
};

// ── Action cell ───────────────────────────────────────────────────────────────
const ActionCell: React.FC<{
  record: any;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  onDelete: (id: string) => void;
  deleteLoading: boolean;
  isMobile?: boolean;
}> = ({ record, actionRef, onDelete, deleteLoading, isMobile }) => {
  const isRestricted = RESTRICTED.includes(record.role_type?.toLowerCase());

  if (isRestricted) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: C.bg,
          color: "#94a3b8",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 500,
          padding: "3px 9px",
          border: `1px solid ${C.border}`,
        }}
      >
        <LockOutlined style={{ fontSize: 10 }} /> Restricted
      </span>
    );
  }

  const menuItems = [
    {
      key: "delete",
      icon: <DeleteOutlined style={{ color: C.red }} />,
      danger: true,
      label: (
        <Popconfirm
          title="Delete this role?"
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
      <RoleModal actionRef={actionRef} edit data={record} />
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
            border: `1px solid ${C.border}`, background: C.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        />
      </Dropdown>
    </Space>
  );
};

// ── Mobile role card ──────────────────────────────────────────────────────────
const RoleCard: React.FC<{
  record: any;
  actionRef: React.MutableRefObject<ActionType | undefined>;
  onDelete: (id: string) => void;
  deleteLoading: boolean;
}> = ({ record, actionRef, onDelete, deleteLoading }) => {
  const isRestricted = RESTRICTED.includes(record.role_type?.toLowerCase());
  const permKeys = resolvePermissionKeys(record.permissions);

  return (
    <Card
      style={{
        borderRadius: 12, marginBottom: 10,
        border: `1px solid ${C.border}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        opacity: isRestricted ? 0.85 : 1,
      }}
      bodyStyle={{ padding: "12px 14px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div
            style={{
              background: C.primaryLight, borderRadius: 8, width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.primary, fontSize: 16, flexShrink: 0,
            }}
          >
            <SafetyCertificateOutlined />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Text strong style={{ fontSize: 13, color: C.darkText }}>{record.role_type}</Text>
              <PermCountPill count={permKeys.length} />
              <ModuleScopeTags permissionKeys={permKeys} />
            </div>
            <RoleTag role={record.role_type} />
          </div>
        </div>
        <ActionCell record={record} actionRef={actionRef} onDelete={onDelete} deleteLoading={deleteLoading} isMobile />
      </div>

      {/* Permission preview */}
      {permKeys.length > 0 && (
        <div
          style={{
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "8px 10px", marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: 6 }}>
            Permissions
          </Text>
          <PermissionSummary permissionKeys={permKeys} maxVisible={6} />
        </div>
      )}

      {/* Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "Created", value: new Date(record.createdAt).toLocaleDateString() },
          { label: "Updated", value: new Date(record.updatedAt).toLocaleDateString() },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: C.bg, borderRadius: 8, padding: "6px 10px", border: `1px solid ${C.border}` }}>
            <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</Text>
            <Text style={{ fontSize: 12, color: C.darkText, fontWeight: 500 }}>{value}</Text>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ── Mobile list ───────────────────────────────────────────────────────────────
const MobileRoleList: React.FC<{
  actionRef: React.MutableRefObject<ActionType | undefined>;
  onDelete: (id: string) => void;
  deleteLoading: boolean;
}> = ({ actionRef, onDelete, deleteLoading }) => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAllRoles({});
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      message.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (actionRef.current) (actionRef.current as any).reload = load;
  }, [actionRef]);

  const visible = search
    ? roles.filter((r) => r.role_type?.toLowerCase().includes(search.toLowerCase()))
    : roles;

  const customCount = roles.filter((r) => !RESTRICTED.includes(r.role_type?.toLowerCase())).length;
  const restrictedCnt = roles.filter((r) => RESTRICTED.includes(r.role_type?.toLowerCase())).length;
  const totalPerms = roles.reduce((sum, r) => sum + resolvePermissionKeys(r.permissions).length, 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          placeholder="Search roles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, height: 36, borderRadius: 8,
            border: `1px solid ${C.border}`,
            padding: "0 12px", fontSize: 13, outline: "none",
            color: C.darkText, background: C.bg,
          }}
        />
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading} style={{ borderRadius: 8, height: 36, width: 36, padding: 0, flexShrink: 0 }} />
        <RoleModal key="addRole" actionRef={actionRef} />
      </div>

      {!loading && roles.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Total", value: roles.length, color: C.indigo, bg: "#eef2ff" },
            { label: "Custom", value: customCount, color: C.green, bg: "#f0fdf4" },
            { label: "Restricted", value: restrictedCnt, color: "#94a3b8", bg: C.bg },
            { label: "Permissions", value: totalPerms, color: C.primary, bg: C.primaryLight },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: "8px 6px", textAlign: "center", border: `1px solid ${C.border}` }}>
              <Text style={{ fontSize: 16, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</Text>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} style={{ borderRadius: 12, marginBottom: 10, border: `1px solid ${C.border}` }} bodyStyle={{ padding: 14 }}>
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        ))
      ) : visible.length === 0 ? (
        <Empty description="No roles found" style={{ padding: "40px 0" }} />
      ) : (
        visible.map((record) => (
          <RoleCard key={record._id} record={record} actionRef={actionRef} onDelete={onDelete} deleteLoading={deleteLoading} />
        ))
      )}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
function RoleSettings() {
  const actionRef = useRef<ActionType>();
  const isMobile = useIsMobile();
  const { hasHR, hasAccounting } = useTenantModules();

  const deleteRoleMutation = useMutation(deleteRole, {
    onSuccess: () => { actionRef.current?.reload(); message.success("Role deleted"); },
    onError: () => message.error("Failed to delete role"),
  });

  const handleDelete = (id: string) => deleteRoleMutation.mutate(id);

  if (isMobile) {
    return (
      <MobileRoleList
        actionRef={actionRef as React.MutableRefObject<ActionType | undefined>}
        onDelete={handleDelete}
        deleteLoading={deleteRoleMutation.isLoading}
      />
    );
  }

  return (
    <ProTable
      columns={[
        {
          title: "Role Type",
          dataIndex: "role_type",
          key: "role_type",
          fieldProps: { placeholder: "Search role type", allowClear: true },
          sorter: true,
          render: (_: any, record: any) => (
            <Space size={10} align="start">
              <div
                style={{
                  background: C.primaryLight, borderRadius: 7, width: 30, height: 30,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.primary, fontSize: 13, flexShrink: 0, marginTop: 2,
                }}
              >
                <SafetyCertificateOutlined />
              </div>
              <div>
                <Text strong style={{ fontSize: 13, color: C.darkText, display: "block", lineHeight: 1.3 }}>{record.role_type}</Text>
                <RoleTag role={record.role_type} />
              </div>
            </Space>
          ),
        },
        {
          title: "Permissions",
          dataIndex: "permissions",
          key: "permissions",
          search: false,
          width: 140,
          render: (_: any, record: any) => {
            const keys = resolvePermissionKeys(record.permissions);
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <PermCountPill count={keys.length} />
                <ModuleScopeTags permissionKeys={keys} />
              </div>
            );
          },
        },
        {
          title: "Permission Preview",
          dataIndex: "permissions",
          key: "permission_preview",
          search: false,
          ellipsis: true,
          render: (_: any, record: any) => (
            <PermissionSummary permissionKeys={resolvePermissionKeys(record.permissions)} maxVisible={5} />
          ),
        },
        {
          title: "Created",
          dataIndex: "createdAt",
          key: "createdAt",
          search: false,
          sorter: true,
          width: 120,
          render: (v: string) => <Text style={{ fontSize: 12, color: C.subText }}>{new Date(v).toLocaleDateString()}</Text>,
        },
        {
          title: "Updated",
          dataIndex: "updatedAt",
          key: "updatedAt",
          search: false,
          sorter: true,
          width: 120,
          render: (v: string) => <Text style={{ fontSize: 12, color: C.subText }}>{new Date(v).toLocaleDateString()}</Text>,
        },
        {
          title: "Actions",
          key: "actions",
          search: false,
          width: 110,
          fixed: "right" as const,
          render: (_: any, record: any) => (
            <ActionCell
              record={record}
              actionRef={actionRef as React.MutableRefObject<ActionType | undefined>}
              onDelete={handleDelete}
              deleteLoading={deleteRoleMutation.isLoading}
            />
          ),
        },
      ]}
      actionRef={actionRef}
      rowKey="_id"
      headerTitle={
        <Space size={8}>
          <div style={{ background: C.primaryLight, borderRadius: 8, padding: "5px 6px", color: C.primary, fontSize: 15, lineHeight: 1 }}>
            <SafetyCertificateOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>Role Settings</Text>
          {hasHR && <Tag color="blue" style={{ fontSize: 10 }}>HR</Tag>}
          {hasAccounting && <Tag color="purple" style={{ fontSize: 10 }}>Accounting</Tag>}
        </Space>
      }
      request={async (params) => {
        try {
          const data = await fetchAllRoles(params);
          return { data, success: true, total: data.length };
        } catch {
          message.error("Failed to load roles");
          return { data: [], success: false };
        }
      }}
      pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total, range) => <Text style={{ fontSize: 12, color: C.subText }}>{range[0]}–{range[1]} of {total} roles</Text> }}
      options={{ density: true, fullScreen: true, reload: () => actionRef.current?.reload(), setting: true }}
      tableAlertRender={({ selectedRowKeys }) => selectedRowKeys.length > 0 ? <Text style={{ fontSize: 13 }}>{selectedRowKeys.length} selected</Text> : null}
      rowSelection={{ alwaysShowAlert: false, selections: true }}
      search={{ searchText: "Search", resetText: "Reset", labelWidth: "auto", filterType: "light" }}
      toolBarRender={() => [<RoleModal key="addRole" actionRef={actionRef} />]}
      dateFormatter="string"
      scroll={{ x: 1000 }}
      rowClassName={(record) => RESTRICTED.includes(record.role_type?.toLowerCase()) ? "row-restricted" : ""}
    />
  );
}

export default RoleSettings;