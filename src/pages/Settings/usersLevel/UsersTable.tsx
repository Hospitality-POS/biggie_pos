import React, { useEffect, useRef, useState } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
  Avatar,
  Button,
  Card,
  Dropdown,
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
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  MailOutlined,
  MoreOutlined,
  ReloadOutlined,
  ShopOutlined,
  StopOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { deleteUserById, fetchAllUsersList, updateUserStatus } from "@services/users";
import ExpandedRowContent from "./ExpandedRowContent";
import AddEditProUserModal from "@components/MODALS/pro/AddEditProUserModal";
import { useAppSelector } from "src/store";
import { useMutation } from "@tanstack/react-query";

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
};

// ── Mobile detection ──────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  Active: { color: C.green, bg: "#f0fdf4", label: "Active" },
  Suspended: { color: C.orange, bg: "#fffbeb", label: "Suspended" },
  Terminated: { color: C.red, bg: "#fef2f2", label: "Terminated" },
};

const StatusTag: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.Active;
  return (
    <Tag
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: "none",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
      }}
    >
      {cfg.label}
    </Tag>
  );
};

// ── Role tag ──────────────────────────────────────────────────────────────────
const ROLE_CFG: Record<string, { color: string; bg: string }> = {
  admin: { color: C.red, bg: "#fef2f2" },
  supervisor: { color: C.orange, bg: "#fffbeb" },
  waiter: { color: C.blue, bg: "#eff6ff" },
};

const RoleTag: React.FC<{ role: string }> = ({ role }) => {
  const cfg = ROLE_CFG[role?.toLowerCase()] || { color: C.indigo, bg: "#eef2ff" };
  return (
    <Tag
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: "none",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        textTransform: "capitalize",
      }}
    >
      {role}
    </Tag>
  );
};

// ── Action dropdown ───────────────────────────────────────────────────────────
const ActionCell: React.FC<{
  record: any;
  actionRef: React.RefObject<ActionType>;
  onStatusUpdate: (id: string, status: "Active" | "Suspended" | "Terminated") => void;
  onDelete: (id: string) => void;
  statusLoading: boolean;
  deleteLoading: boolean;
  isMobile?: boolean;
}> = ({ record, actionRef, onStatusUpdate, onDelete, statusLoading, deleteLoading, isMobile }) => {
  const isAdmin = record?.role?.role_type?.toLowerCase() === "admin";
  const status = record?.status || "Active";

  const menuItems = [
    ...(status === "Active" ? [{
      key: "suspend",
      icon: <StopOutlined />,
      label: (
        <Popconfirm
          title="Suspend this user?"
          description="They won't be able to log in until reactivated."
          onConfirm={() => onStatusUpdate(record._id, "Suspended")}
          okText="Suspend"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <span style={{ color: C.orange }}>Suspend</span>
        </Popconfirm>
      ),
    }] : []),
    ...(status === "Suspended" ? [{
      key: "reactivate",
      icon: <CheckCircleOutlined style={{ color: C.green }} />,
      label: (
        <Popconfirm
          title="Reactivate this user?"
          description="They will be able to log in again."
          onConfirm={() => onStatusUpdate(record._id, "Active")}
          okText="Reactivate"
          cancelText="Cancel"
        >
          <span style={{ color: C.green }}>Reactivate</span>
        </Popconfirm>
      ),
    }] : []),
    ...(status === "Terminated" ? [{
      key: "reinstate",
      icon: <CheckCircleOutlined style={{ color: C.green }} />,
      label: (
        <Popconfirm
          title="Reinstate this user?"
          description="Account set back to Active."
          onConfirm={() => onStatusUpdate(record._id, "Active")}
          okText="Reinstate"
          cancelText="Cancel"
        >
          <span style={{ color: C.green }}>Reinstate</span>
        </Popconfirm>
      ),
    }] : []),
    ...(status !== "Terminated" ? [{
      key: "terminate",
      icon: <CloseCircleOutlined style={{ color: C.red }} />,
      label: (
        <Popconfirm
          title="Terminate this user?"
          description="Blocks all login access. Can be reinstated later."
          onConfirm={() => onStatusUpdate(record._id, "Terminated")}
          okText="Terminate"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <span style={{ color: C.red }}>Terminate</span>
        </Popconfirm>
      ),
      danger: true,
    }] : []),
    {
      key: "delete",
      icon: <DeleteOutlined style={{ color: isAdmin ? "#94a3b8" : C.red }} />,
      disabled: isAdmin,
      label: isAdmin ? (
        <Tooltip title="Deletion not allowed for admin">
          <span style={{ color: "#94a3b8" }}>Delete</span>
        </Tooltip>
      ) : (
        <Popconfirm
          title="Delete this user?"
          description="This action cannot be undone."
          onConfirm={() => onDelete(record._id)}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <span style={{ color: C.red }}>Delete</span>
        </Popconfirm>
      ),
      danger: !isAdmin,
    },
  ];

  return (
    <Space size={4}>
      <AddEditProUserModal edit data={record} actionRef={actionRef} />
      <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement={isMobile ? "topRight" : "bottomRight"}>
        <Button
          type="text"
          icon={<MoreOutlined />}
          loading={statusLoading || deleteLoading}
          style={{
            borderRadius: 7,
            border: `1px solid ${C.border}`,
            background: "#f8fafc",
            width: 30,
            height: 30,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      </Dropdown>
    </Space>
  );
};

// ── Mobile user card ──────────────────────────────────────────────────────────
const UserCard: React.FC<{
  record: any;
  actionRef: React.RefObject<ActionType>;
  onStatusUpdate: (id: string, status: "Active" | "Suspended" | "Terminated") => void;
  onDelete: (id: string) => void;
  statusLoading: boolean;
  deleteLoading: boolean;
  expanded: boolean;
  onToggle: () => void;
}> = ({ record, actionRef, onStatusUpdate, onDelete, statusLoading, deleteLoading, expanded, onToggle }) => {
  const role = record?.role?.role_type;
  const status = record?.status || "Active";
  const shop = record?.shop_id?.name;
  const isAdmin = role?.toLowerCase() === "admin";

  return (
    <Card
      style={{
        borderRadius: 12,
        marginBottom: 10,
        border: `1px solid ${status === "Terminated" ? "#fca5a5" : status === "Suspended" ? "#fde68a" : C.border}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        opacity: status === "Terminated" ? 0.75 : 1,
      }}
      bodyStyle={{ padding: "12px 14px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <Avatar
            size={38}
            src={record.avatar}
            icon={<UserOutlined />}
            style={{ background: C.primaryLight, color: C.primary, flexShrink: 0, fontSize: 16 }}
          />
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>
              {record.fullname || "N/A"}
            </Text>
            <Text style={{ fontSize: 11, color: C.subText, display: "block" }} ellipsis>
              {record.email}
            </Text>
          </div>
        </div>
        <ActionCell
          record={record}
          actionRef={actionRef}
          onStatusUpdate={onStatusUpdate}
          onDelete={onDelete}
          statusLoading={statusLoading}
          deleteLoading={deleteLoading}
          isMobile
        />
      </div>

      {/* Tags row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <StatusTag status={status} />
        {role && <RoleTag role={role} />}
        {!isAdmin && shop && (
          <Tag style={{ background: "#f8fafc", color: C.subText, border: "none", borderRadius: 6, fontSize: 11, padding: "2px 8px" }}>
            <ShopOutlined style={{ marginRight: 4 }} />{shop}
          </Tag>
        )}
      </div>

      {/* Expand toggle */}
      <Button
        type="text"
        size="small"
        onClick={onToggle}
        style={{ width: "100%", height: 28, fontSize: 12, color: C.subText, background: "#f8fafc", borderRadius: 6, border: `1px solid ${C.border}` }}
      >
        {expanded ? "Hide details ↑" : "View details ↓"}
      </Button>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          <ExpandedRowContent record={record} />
        </div>
      )}
    </Card>
  );
};

// ── Mobile list ───────────────────────────────────────────────────────────────
const MobileUserList: React.FC<{
  actionRef: React.RefObject<ActionType>;
  currentUserId?: string;
  isAdmin?: boolean;
}> = ({ actionRef, currentUserId, isAdmin }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAllUsersList({});
      const filtered = data.filter((u: any) => isAdmin && currentUserId ? u._id !== currentUserId : true);
      setUsers(filtered);
    } catch {
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatusMutation = useMutation(
    ({ id, status }: { id: string; status: "Active" | "Suspended" | "Terminated" }) =>
      updateUserStatus(id, status),
    { onSuccess: load, onError: () => message.error("Failed to update status") }
  );

  const deleteUserMutation = useMutation(deleteUserById, {
    onSuccess: () => { message.success("User deleted"); load(); },
    onError: () => message.error("Failed to delete user"),
  });

  const filtered = users.filter(
    (u) => !search ||
      u.fullname?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = users.filter((u) => (u.status || "Active") === "Active").length;
  const suspendedCount = users.filter((u) => u.status === "Suspended").length;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          placeholder="Search staff…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 12px", fontSize: 13, outline: "none", color: C.darkText, background: "#f8fafc" }}
        />
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading} style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }} />
        <AddEditProUserModal actionRef={actionRef} />
      </div>

      {/* Summary strip */}
      {!loading && users.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Total", value: users.length, color: C.indigo, bg: "#eef2ff" },
            { label: "Active", value: activeCount, color: C.green, bg: "#f0fdf4" },
            { label: "Suspended", value: suspendedCount, color: suspendedCount > 0 ? C.orange : C.subText, bg: suspendedCount > 0 ? "#fffbeb" : "#f8fafc" },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</Text>
            </div>
          ))}
        </div>
      )}

      {/* Cards */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} style={{ borderRadius: 12, marginBottom: 10, border: `1px solid ${C.border}` }} bodyStyle={{ padding: 14 }}>
            <Skeleton active avatar paragraph={{ rows: 2 }} />
          </Card>
        ))
      ) : filtered.length === 0 ? (
        <Empty description="No staff found" style={{ padding: "40px 0" }} />
      ) : (
        filtered.map((record) => (
          <UserCard
            key={record._id}
            record={record}
            actionRef={actionRef}
            onStatusUpdate={(id, status) => updateStatusMutation.mutate({ id, status })}
            onDelete={(id) => deleteUserMutation.mutate(id)}
            statusLoading={updateStatusMutation.isLoading}
            deleteLoading={deleteUserMutation.isLoading}
            expanded={expandedIds.includes(record._id)}
            onToggle={() =>
              setExpandedIds((prev) =>
                prev.includes(record._id) ? prev.filter((id) => id !== record._id) : [...prev, record._id]
              )
            }
          />
        ))
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const UsersTable = () => {
  const { user } = useAppSelector((state) => state.auth);
  const actionRef = useRef<ActionType>();
  const isMobile = useIsMobile();

  const deleteUserMutation = useMutation(deleteUserById, {
    onSuccess: () => { actionRef.current?.reload(); message.success("User deleted successfully"); },
    onError: () => message.error("Failed to delete user"),
  });

  const updateStatusMutation = useMutation(
    ({ id, status }: { id: string; status: "Active" | "Suspended" | "Terminated" }) =>
      updateUserStatus(id, status),
    {
      onSuccess: () => actionRef.current?.reload(),
      onError: () => message.error("Failed to update status"),
    }
  );

  // ── Mobile ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <MobileUserList
        actionRef={actionRef as React.RefObject<ActionType>}
        currentUserId={user?.id}
        isAdmin={user?.isAdmin}
      />
    );
  }

  // ── Desktop ─────────────────────────────────────────────────────────────────
  return (
    <ProTable
      rowKey="_id"
      cardBordered
      style={{ borderRadius: 12 }}
      headerTitle={
        <Space size={8}>
          <div style={{ background: C.primaryLight, borderRadius: 8, padding: "5px 6px", color: C.primary, fontSize: 15, lineHeight: 1 }}>
            <TeamOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>All Staff</Text>
        </Space>
      }
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => (
          <Text style={{ fontSize: 12, color: C.subText }}>{range[0]}–{range[1]} of {total} staff</Text>
        ),
      }}
      columns={[
        {
          title: "Staff",
          dataIndex: "fullname",
          key: "fullname",
          fieldProps: { placeholder: "Search by name" },
          render: (_: any, record: any) => (
            <Space size={10}>
              <Avatar
                size={32}
                src={record.avatar}
                icon={<UserOutlined />}
                style={{ background: C.primaryLight, color: C.primary, flexShrink: 0 }}
              />
              <div>
                <Text strong style={{ fontSize: 13, color: C.darkText, display: "block" }}>
                  {record.fullname || "N/A"}
                </Text>
                <Text style={{ fontSize: 11, color: C.subText }}>{record.email}</Text>
              </div>
            </Space>
          ),
        },
        {
          title: "Role",
          dataIndex: ["role", "role_type"],
          hideInSearch: true,
          width: 120,
          render: (text: string) => <RoleTag role={text} />,
        },
        {
          title: "Shop",
          dataIndex: ["shop_id", "name"],
          hideInSearch: true,
          width: 150,
          render: (shop: string, record: any) => {
            const isAdmin = record?.role?.role_type?.toLowerCase() === "admin";
            return (
              <Space size={5}>
                <ShopOutlined style={{ color: "#94a3b8", fontSize: 12 }} />
                <Text style={{ fontSize: 12, color: isAdmin ? "#94a3b8" : C.darkText }}>
                  {isAdmin ? "N/A" : shop || "—"}
                </Text>
              </Space>
            );
          },
        },
        {
          title: "Status",
          dataIndex: "status",
          hideInSearch: false,
          width: 120,
          valueType: "select",
          valueEnum: {
            Active: { text: "Active", status: "Success" },
            Suspended: { text: "Suspended", status: "Warning" },
            Terminated: { text: "Terminated", status: "Error" },
          },
          fieldProps: { placeholder: "Filter by status" },
          render: (_: any, record: any) => <StatusTag status={record?.status || "Active"} />,
        },
        {
          title: "Actions",
          dataIndex: "actions",
          hideInSearch: true,
          width: 100,
          fixed: "right" as const,
          render: (_: any, record: any) => (
            <ActionCell
              record={record}
              actionRef={actionRef as React.RefObject<ActionType>}
              onStatusUpdate={(id, status) => updateStatusMutation.mutate({ id, status })}
              onDelete={(id) => deleteUserMutation.mutate(id)}
              statusLoading={updateStatusMutation.isLoading}
              deleteLoading={deleteUserMutation.isLoading}
            />
          ),
        },
      ]}
      request={async (params) => {
        const data = await fetchAllUsersList(params);
        const filteredData = data.filter((item: any) =>
          user?.isAdmin && user?.id ? item._id !== user.id : true
        );
        return { data: filteredData, success: true, total: filteredData.length };
      }}
      options={{ fullScreen: true, reload: () => actionRef.current?.reload(), density: true, setting: true }}
      tableAlertRender={({ selectedRowKeys }) =>
        selectedRowKeys.length > 0 ? (
          <Text style={{ fontSize: 13 }}>{selectedRowKeys.length} selected</Text>
        ) : null
      }
      actionRef={actionRef}
      rowSelection={{ alwaysShowAlert: false, selections: false }}
      scroll={{ x: 900 }}
      search={{
        searchText: "Search",
        resetText: "Reset",
        labelWidth: "auto",
        filterType: "light",
      }}
      expandable={{
        expandedRowRender: (record) => <ExpandedRowContent record={record} />,
        defaultExpandAllRows: false,
      }}
      dateFormatter="string"
      toolBarRender={() => [<AddEditProUserModal key="add" actionRef={actionRef} />]}
      rowClassName={(record) => {
        if (record.status === "Terminated") return "row-terminated";
        if (record.status === "Suspended") return "row-suspended";
        return "";
      }}
    />
  );
};

export default UsersTable;