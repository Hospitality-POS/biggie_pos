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
  LockOutlined,
  MoreOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Dropdown } from "antd";
import { useRef as useRefAlias } from "react";
import { useMutation } from "@tanstack/react-query";
import { deleteRole, fetchAllRoles } from "@services/Roles";
import RoleModal from "@components/MODALS/pro/RoleModal";

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

// ── Restricted roles ──────────────────────────────────────────────────────────
const RESTRICTED = ["waiter", "admin", "cashier", "supervisor"];

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
        <LockOutlined style={{ fontSize: 10 }} />
        Restricted
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
            border: `1px solid ${C.border}`,
            background: C.bg,
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

  return (
    <Card
      style={{
        borderRadius: 12,
        marginBottom: 10,
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
              background: C.primaryLight,
              borderRadius: 8,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.primary,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            <SafetyCertificateOutlined />
          </div>
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>
              {record.role_type}
            </Text>
            <RoleTag role={record.role_type} />
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

  // expose reload to actionRef
  useEffect(() => {
    if (actionRef.current) {
      (actionRef.current as any).reload = load;
    }
  }, [actionRef]);

  const visible = search
    ? roles.filter((r) => r.role_type?.toLowerCase().includes(search.toLowerCase()))
    : roles;

  const customCount = roles.filter((r) => !RESTRICTED.includes(r.role_type?.toLowerCase())).length;
  const restrictedCnt = roles.filter((r) => RESTRICTED.includes(r.role_type?.toLowerCase())).length;

  return (
    <div>
      {/* Toolbar */}
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
        <Button
          icon={<ReloadOutlined />}
          onClick={load}
          loading={loading}
          style={{ borderRadius: 8, height: 36, width: 36, padding: 0, flexShrink: 0 }}
        />
        <RoleModal key="addRole" actionRef={actionRef} />
      </div>

      {/* Summary strip */}
      {!loading && roles.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Total", value: roles.length, color: C.indigo, bg: "#eef2ff" },
            { label: "Custom", value: customCount, color: C.green, bg: "#f0fdf4" },
            { label: "Restricted", value: restrictedCnt, color: "#94a3b8", bg: C.bg },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: "8px 6px", textAlign: "center", border: `1px solid ${C.border}` }}>
              <Text style={{ fontSize: 16, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</Text>
            </div>
          ))}
        </div>
      )}

      {/* Cards */}
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
          <RoleCard
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
function RoleSettings() {
  const actionRef = useRef<ActionType>();
  const isMobile = useIsMobile();

  const deleteRoleMutation = useMutation(deleteRole, {
    onSuccess: () => {
      actionRef.current?.reload();
      message.success("Role deleted");
    },
    onError: () => message.error("Failed to delete role"),
  });

  const handleDelete = (id: string) => deleteRoleMutation.mutate(id);

  // ── Mobile ─────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <MobileRoleList
        actionRef={actionRef as React.MutableRefObject<ActionType | undefined>}
        onDelete={handleDelete}
        deleteLoading={deleteRoleMutation.isLoading}
      />
    );
  }

  // ── Desktop ────────────────────────────────────────────────────────────────
  return (
    <ProTable
      columns={[
        {
          title: "Role Type",
          dataIndex: "role_type",
          key: "role_type",
          fieldProps: {
            placeholder: "Search role type",
            allowClear: true,
          },
          sorter: true,
          render: (_: any, record: any) => (
            <Space size={10}>
              <div
                style={{
                  background: C.primaryLight,
                  borderRadius: 7,
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: C.primary,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                <SafetyCertificateOutlined />
              </div>
              <div>
                <Text strong style={{ fontSize: 13, color: C.darkText, display: "block", lineHeight: 1.3 }}>
                  {record.role_type}
                </Text>
                <RoleTag role={record.role_type} />
              </div>
            </Space>
          ),
        },
        {
          title: "Created",
          dataIndex: "createdAt",
          key: "createdAt",
          search: false,
          sorter: true,
          width: 130,
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
          width: 130,
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
            <SafetyCertificateOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>Role Settings</Text>
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
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total, range) => (
          <Text style={{ fontSize: 12, color: C.subText }}>
            {range[0]}–{range[1]} of {total} roles
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
      toolBarRender={() => [<RoleModal key="addRole" actionRef={actionRef} />]}
      dateFormatter="string"
      scroll={{ x: 700 }}
      rowClassName={(record) =>
        RESTRICTED.includes(record.role_type?.toLowerCase()) ? "row-restricted" : ""
      }
    />
  );
}

export default RoleSettings;