import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
  Avatar,
  Button,
  Card,
  Dropdown,
  Empty,
  Input,
  message,
  Popconfirm,
  Select,
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
  MoreOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  StopOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { deleteUserById, fetchAllUsersList, updateUserStatus } from "@services/users";
import { fetchAllRoles } from "@services/Roles";
import { fetchAllShops } from "@services/shops";
import ExpandedRowContent from "./ExpandedRowContent";
import AddEditProUserModal from "@components/MODALS/pro/AddEditProUserModal";
import { useAppSelector } from "src/store";
import { useMutation, useQuery } from "@tanstack/react-query";

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
const STATUS_CFG: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  Active:     { color: C.green,  bg: "#f0fdf4", label: "Active",     dot: C.green  },
  Suspended:  { color: C.orange, bg: "#fffbeb", label: "Suspended",  dot: C.orange },
  Terminated: { color: C.red,    bg: "#fef2f2", label: "Terminated", dot: C.red    },
};

const StatusTag: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.Active;
  return (
    <Tag style={{
      background: cfg.bg, color: cfg.color, border: "none",
      borderRadius: 6, fontSize: 11, fontWeight: 500, padding: "2px 8px",
      display: "inline-flex", alignItems: "center", gap: 5,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
      {cfg.label}
    </Tag>
  );
};

// ── Role tag ──────────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  admin:      { color: C.red,    bg: "#fef2f2" },
  supervisor: { color: C.orange, bg: "#fffbeb" },
  manager:    { color: C.orange, bg: "#fffbeb" },
  waiter:     { color: C.blue,   bg: "#eff6ff" },
  cashier:    { color: C.indigo, bg: "#eef2ff" },
};

const RoleTag: React.FC<{ role: string }> = ({ role }) => {
  const roleString = typeof role === "string" ? role : String(role || "");
  const cfg = ROLE_COLORS[roleString.toLowerCase()] || { color: C.purple, bg: "#faf5ff" };
  const display = roleString.length > 18 ? `${roleString.substring(0, 18)}…` : roleString;
  return (
    <Tooltip title={roleString} placement="top">
      <Tag style={{
        background: cfg.bg, color: cfg.color, border: "none",
        borderRadius: 6, fontSize: 11, fontWeight: 600, padding: "2px 8px",
        textTransform: "capitalize", maxWidth: 180,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {display}
      </Tag>
    </Tooltip>
  );
};

// ── Status filter pills ───────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { key: "all",        label: "All",        color: C.subText, bg: "#f8fafc",  activeBg: C.darkText,  activeColor: "#fff" },
  { key: "Active",     label: "Active",     color: C.green,  bg: "#f0fdf4",  activeBg: C.green,     activeColor: "#fff" },
  { key: "Suspended",  label: "Suspended",  color: C.orange, bg: "#fffbeb",  activeBg: C.orange,    activeColor: "#fff" },
  { key: "Terminated", label: "Terminated", color: C.red,    bg: "#fef2f2",  activeBg: C.red,       activeColor: "#fff" },
];

const StatusFilterBar: React.FC<{
  counts: Record<string, number>;
  active: string;
  onChange: (k: string) => void;
}> = ({ counts, active, onChange }) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {STATUS_FILTERS.map((f) => {
      const isActive = active === f.key;
      const count = f.key === "all" ? (counts.total ?? 0) : (counts[f.key] ?? 0);
      return (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: isActive ? f.activeBg : f.bg,
            color: isActive ? f.activeColor : f.color,
            border: `1.5px solid ${isActive ? f.activeBg : f.bg === "#f8fafc" ? C.border : f.color + "40"}`,
            borderRadius: 7, padding: "4px 10px", cursor: "pointer",
            fontSize: 12, fontWeight: isActive ? 600 : 400,
            transition: "all 0.15s",
          }}
        >
          {f.label}
          <span style={{
            background: isActive ? "rgba(255,255,255,0.25)" : f.color + "20",
            color: isActive ? "#fff" : f.color,
            borderRadius: 10, fontSize: 10, fontWeight: 700,
            padding: "0 5px", lineHeight: "16px",
          }}>
            {count}
          </span>
        </button>
      );
    })}
  </div>
);

// ── Action dropdown ───────────────────────────────────────────────────────────
const ActionCell: React.FC<{
  record: any;
  onStatusUpdate: (id: string, status: "Active" | "Suspended" | "Terminated") => void;
  onDelete: (id: string) => void;
  loading: boolean;
}> = ({ record, onStatusUpdate, onDelete, loading }) => {
  const isAdmin = typeof record?.role?.role_type === "string" && record?.role?.role_type?.toLowerCase() === "admin";
  const status = record?.status || "Active";

  const menuItems = [
    ...(status === "Active" ? [{
      key: "suspend",
      icon: <StopOutlined style={{ color: C.orange }} />,
      label: (
        <Popconfirm title="Suspend this user?" description="They won't be able to log in until reactivated."
          onConfirm={() => onStatusUpdate(record._id, "Suspended")} okText="Suspend" cancelText="Cancel" okButtonProps={{ danger: true }}>
          <span style={{ color: C.orange }}>Suspend</span>
        </Popconfirm>
      ),
    }] : []),
    ...(status === "Suspended" ? [{
      key: "reactivate",
      icon: <CheckCircleOutlined style={{ color: C.green }} />,
      label: (
        <Popconfirm title="Reactivate this user?" description="They will be able to log in again."
          onConfirm={() => onStatusUpdate(record._id, "Active")} okText="Reactivate" cancelText="Cancel">
          <span style={{ color: C.green }}>Reactivate</span>
        </Popconfirm>
      ),
    }] : []),
    ...(status === "Terminated" ? [{
      key: "reinstate",
      icon: <CheckCircleOutlined style={{ color: C.green }} />,
      label: (
        <Popconfirm title="Reinstate this user?" description="Account set back to Active."
          onConfirm={() => onStatusUpdate(record._id, "Active")} okText="Reinstate" cancelText="Cancel">
          <span style={{ color: C.green }}>Reinstate</span>
        </Popconfirm>
      ),
    }] : []),
    ...(status !== "Terminated" ? [{
      key: "terminate",
      icon: <CloseCircleOutlined style={{ color: C.red }} />,
      label: (
        <Popconfirm title="Terminate this user?" description="Blocks all login access. Can be reinstated later."
          onConfirm={() => onStatusUpdate(record._id, "Terminated")} okText="Terminate" cancelText="Cancel" okButtonProps={{ danger: true }}>
          <span style={{ color: C.red }}>Terminate</span>
        </Popconfirm>
      ),
      danger: true,
    }] : []),
    { type: "divider" as const },
    {
      key: "delete",
      icon: <DeleteOutlined style={{ color: isAdmin ? "#94a3b8" : C.red }} />,
      disabled: isAdmin,
      label: isAdmin ? (
        <Tooltip title="Cannot delete admin users"><span style={{ color: "#94a3b8" }}>Delete</span></Tooltip>
      ) : (
        <Popconfirm title="Delete this user?" description="This action cannot be undone."
          onConfirm={() => onDelete(record._id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
          <span style={{ color: C.red }}>Delete</span>
        </Popconfirm>
      ),
      danger: !isAdmin,
    },
  ];

  return (
    <Space size={4}>
      <AddEditProUserModal edit data={record} />
      <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
        <Button
          type="text" icon={<MoreOutlined />} loading={loading}
          style={{
            borderRadius: 7, border: `1px solid ${C.border}`,
            background: "#f8fafc", width: 30, height: 30, padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        />
      </Dropdown>
    </Space>
  );
};

// ── User info cell (name + email + module badges) ─────────────────────────────
const UserInfoCell: React.FC<{ record: any }> = ({ record }) => {
  const perms: string[] = record?.role?.permissions || [];
  const hasPOS = perms.some((p: string) => p?.startsWith("CART_") || p?.startsWith("PRODUCTS_") || p?.startsWith("ORDERS_"));
  const hasAccounting = perms.some((p: string) => p?.startsWith("ACCOUNTING_"));
  const hasHR = perms.some((p: string) => p?.startsWith("BANDU_") || p?.startsWith("HR_"));
  const hasSignature = perms.some((p: string) => p?.startsWith("SIGNATURE_"));

  return (
    <Space size={10}>
      <Avatar
        size={34}
        src={record.avatar}
        icon={<UserOutlined />}
        style={{ background: C.primaryLight, color: C.primary, flexShrink: 0, fontSize: 14 }}
      />
      <div>
        <Text strong style={{ fontSize: 13, color: C.darkText, display: "block", lineHeight: 1.3 }}>
          {record.fullname || "N/A"}
        </Text>
        <Text style={{ fontSize: 11, color: C.subText, display: "block", lineHeight: 1.3 }}>
          {record.email}
        </Text>
        {(hasPOS || hasAccounting || hasHR || hasSignature) && (
          <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
            {hasPOS && <span style={{ background: "#eff6ff", color: C.blue, borderRadius: 4, fontSize: 9, fontWeight: 700, padding: "0 4px", lineHeight: "14px" }}>POS</span>}
            {hasAccounting && <span style={{ background: "#faf5ff", color: C.purple, borderRadius: 4, fontSize: 9, fontWeight: 700, padding: "0 4px", lineHeight: "14px" }}>PESA</span>}
            {hasHR && <span style={{ background: "#f0fdf4", color: C.green, borderRadius: 4, fontSize: 9, fontWeight: 700, padding: "0 4px", lineHeight: "14px" }}>HR</span>}
            {hasSignature && <span style={{ background: "#fef2f2", color: C.red, borderRadius: 4, fontSize: 9, fontWeight: 700, padding: "0 4px", lineHeight: "14px" }}>SIGN</span>}
          </div>
        )}
      </div>
    </Space>
  );
};

// ── Mobile user card ──────────────────────────────────────────────────────────
const UserCard: React.FC<{
  record: any;
  onStatusUpdate: (id: string, status: "Active" | "Suspended" | "Terminated") => void;
  onDelete: (id: string) => void;
  loading: boolean;
  expanded: boolean;
  onToggle: () => void;
}> = ({ record, onStatusUpdate, onDelete, loading, expanded, onToggle }) => {
  const role = typeof record?.role?.role_type === "string" ? record.role.role_type : "";
  const status = record?.status || "Active";
  const shop = record?.shop_id?.name;
  const isAdmin = role.toLowerCase() === "admin";

  return (
    <Card
      style={{
        borderRadius: 12, marginBottom: 10,
        border: `1px solid ${status === "Terminated" ? "#fca5a5" : status === "Suspended" ? "#fde68a" : C.border}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        opacity: status === "Terminated" ? 0.75 : 1,
      }}
      bodyStyle={{ padding: "12px 14px" }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <Avatar
            size={40} src={record.avatar} icon={<UserOutlined />}
            style={{ background: C.primaryLight, color: C.primary, flexShrink: 0 }}
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
        <ActionCell record={record} onStatusUpdate={onStatusUpdate} onDelete={onDelete} loading={loading} />
      </div>

      {/* Tags */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
        <StatusTag status={status} />
        {role && <RoleTag role={role} />}
        {!isAdmin && shop && (
          <Tooltip title={shop} placement="top">
            <Tag style={{
              background: "#f8fafc", color: C.subText, border: "none",
              borderRadius: 6, fontSize: 11, padding: "2px 8px",
              maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              <ShopOutlined style={{ marginRight: 4 }} />{shop}
            </Tag>
          </Tooltip>
        )}
      </div>

      {/* Expand toggle */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", height: 28, fontSize: 12, color: C.subText,
          background: "#f8fafc", borderRadius: 6, border: `1px solid ${C.border}`,
          cursor: "pointer",
        }}
      >
        {expanded ? "Hide details ↑" : "View details ↓"}
      </button>

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
  currentUserId?: string;
  isAdmin?: boolean;
  isShopLevel?: boolean;
  currentShopId?: string | null;
  onUserChange?: () => void;
}> = ({ currentUserId, isAdmin, isShopLevel, currentShopId, onUserChange }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [roleFilter, setRoleFilter]       = useState("all");
  const [branchFilter, setBranchFilter]   = useState("all");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: rolesData } = useQuery({ queryKey: ["roles"],  queryFn: () => fetchAllRoles({}) });
  const { data: shopsData } = useQuery({ queryKey: ["shops"],  queryFn: fetchAllShops });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAllUsersList({});
      let filtered = (data || []).filter((u: any) => isAdmin && currentUserId ? u._id !== currentUserId : true);
      if ((!isAdmin || isShopLevel) && currentShopId) {
        filtered = filtered.filter((u: any) =>
          u.shop_id?._id === currentShopId || u.shop_id === currentShopId
        );
      }
      setUsers(filtered);
    } catch {
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatusMutation = useMutation(
    ({ id, status }: { id: string; status: "Active" | "Suspended" | "Terminated" }) => updateUserStatus(id, status),
    { onSuccess: () => { load(); onUserChange?.(); }, onError: () => message.error("Failed to update status") }
  );
  const deleteUserMutation = useMutation(deleteUserById, {
    onSuccess: () => { message.success("User deleted"); load(); onUserChange?.(); },
    onError: () => message.error("Failed to delete user"),
  });

  const counts = {
    total: users.length,
    Active: users.filter((u) => !u.status || u.status === "Active").length,
    Suspended: users.filter((u) => u.status === "Suspended").length,
    Terminated: users.filter((u) => u.status === "Terminated").length,
  };

  const displayed = users.filter((u) => {
    const matchSearch = !search ||
      (typeof u.fullname === "string" && u.fullname.toLowerCase().includes(search.toLowerCase())) ||
      (typeof u.email === "string" && u.email.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || (u.status || "Active") === statusFilter;
    const matchRole   = roleFilter === "all" ||
      (typeof u.role?.role_type === "string" && u.role.role_type.toLowerCase() === roleFilter.toLowerCase());
    const matchBranch = branchFilter === "all" ||
      u.shop_id?._id === branchFilter || u.shop_id === branchFilter;
    return matchSearch && matchStatus && matchRole && matchBranch;
  });

  // Pagination logic
  const totalPages = Math.ceil(displayed.length / pageSize);
  const paginatedDisplayed = displayed.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, roleFilter, branchFilter]);

  return (
    <div style={{ padding: "12px 12px 0" }}>
      {/* Search + Add */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <Input
          prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
          placeholder="Search staff…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ borderRadius: 8 }}
        />
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading} style={{ borderRadius: 8, flexShrink: 0 }} />
      </div>

      {/* Status filter */}
      <div style={{ marginBottom: 10 }}>
        <StatusFilterBar counts={counts} active={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Role + Branch filter row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {rolesData && rolesData.length > 0 && (
          <Select
            size="small"
            style={{ flex: 1 }}
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { label: "All Roles", value: "all" },
              ...(rolesData || []).map((r: any) => ({ label: r.role_type, value: r.role_type })),
            ]}
          />
        )}
        {shopsData && shopsData.length > 0 && (
          <Select
            size="small"
            style={{ flex: 1 }}
            value={branchFilter}
            onChange={setBranchFilter}
            suffixIcon={<ShopOutlined style={{ color: "#94a3b8", fontSize: 11 }} />}
            options={[
              { label: "All Branches", value: "all" },
              ...(shopsData || []).map((s: any) => ({ label: s.name, value: s._id })),
            ]}
          />
        )}
      </div>

      {/* Cards */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} style={{ borderRadius: 12, marginBottom: 10 }} bodyStyle={{ padding: 14 }}>
            <Skeleton active avatar paragraph={{ rows: 2 }} />
          </Card>
        ))
      ) : displayed.length === 0 ? (
        <Empty description="No staff found" style={{ padding: "40px 0" }} />
      ) : (
        <>
          {paginatedDisplayed.map((record) => (
            <UserCard
              key={record._id}
              record={record}
              onStatusUpdate={(id, status) => updateStatusMutation.mutate({ id, status })}
              onDelete={(id) => deleteUserMutation.mutate(id)}
              loading={updateStatusMutation.isLoading || deleteUserMutation.isLoading}
              expanded={expandedIds.includes(record._id)}
              onToggle={() =>
                setExpandedIds((prev) =>
                  prev.includes(record._id) ? prev.filter((id) => id !== record._id) : [...prev, record._id]
                )
              }
            />
          ))}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              marginTop: 16,
              padding: "12px 0",
            }}>
              <Button
                size="small"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                style={{ borderRadius: 6 }}
              >
                Previous
              </Button>
              <Text style={{ fontSize: 12, color: C.subText }}>
                Page {currentPage} of {totalPages}
              </Text>
              <Button
                size="small"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                style={{ borderRadius: 6 }}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
interface UsersTableProps {
  actionRef?: React.RefObject<ActionType>;
  onUserChange?: () => void;
}

const UsersTable: React.FC<UsersTableProps> = ({ actionRef: externalRef, onUserChange }) => {
  const { user } = useAppSelector((state) => state.auth);
  const internalRef = useRef<ActionType>();
  const actionRef = externalRef ?? internalRef;
  const isMobile = useIsMobile();
  const location = useLocation();

  const currentShopId = localStorage.getItem("shopId");
  const isShopLevel = location.pathname === "/staff-management";

  const [statusFilter, setStatusFilter]   = useState("all");
  const [roleFilter, setRoleFilter]       = useState("all");
  const [branchFilter, setBranchFilter]   = useState("all");
  const [nameSearch, setNameSearch]       = useState("");
  const [allUsers, setAllUsers]           = useState<any[]>([]);

  const { data: rolesData }  = useQuery({ queryKey: ["roles"],  queryFn: () => fetchAllRoles({}) });
  const { data: shopsData }  = useQuery({ queryKey: ["shops"],  queryFn: fetchAllShops });

  const counts = {
    total: allUsers.length,
    Active: allUsers.filter((u) => !u.status || u.status === "Active").length,
    Suspended: allUsers.filter((u) => u.status === "Suspended").length,
    Terminated: allUsers.filter((u) => u.status === "Terminated").length,
  };

  const deleteUserMutation = useMutation(deleteUserById, {
    onSuccess: () => { actionRef.current?.reload(); message.success("User deleted"); onUserChange?.(); },
    onError: () => message.error("Failed to delete user"),
  });
  const updateStatusMutation = useMutation(
    ({ id, status }: { id: string; status: "Active" | "Suspended" | "Terminated" }) => updateUserStatus(id, status),
    {
      onSuccess: () => { actionRef.current?.reload(); onUserChange?.(); },
      onError: () => message.error("Failed to update status"),
    }
  );

  if (isMobile) {
    return (
      <MobileUserList
        currentUserId={user?.id}
        isAdmin={user?.isAdmin}
        isShopLevel={isShopLevel}
        currentShopId={currentShopId}
        onUserChange={onUserChange}
      />
    );
  }

  return (
    <div>
      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div style={{
        padding: "12px 16px",
        background: "#fff",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap",
      }}>
        {/* Left: status pills */}
        <StatusFilterBar counts={counts} active={statusFilter} onChange={setStatusFilter} />

        {/* Right: name search + branch + role dropdowns */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Name search */}
          <Input
            size="small"
            prefix={<SearchOutlined style={{ color: "#94a3b8", fontSize: 11 }} />}
            placeholder="Search by name or email…"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            allowClear
            style={{ width: 200, borderRadius: 7 }}
          />

          {/* Branch filter */}
          {shopsData && shopsData.length > 0 && (
            <Select
              size="small"
              style={{ minWidth: 150 }}
              placeholder="All Branches"
              value={branchFilter}
              onChange={setBranchFilter}
              suffixIcon={<ShopOutlined style={{ color: "#94a3b8", fontSize: 11 }} />}
              options={[
                { label: "All Branches", value: "all" },
                ...(shopsData || []).map((s: any) => ({ label: s.name, value: s._id })),
              ]}
            />
          )}

          {/* Role filter */}
          {rolesData && rolesData.length > 0 && (
            <Select
              size="small"
              style={{ minWidth: 150 }}
              placeholder="All Roles"
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { label: "All Roles", value: "all" },
                ...(rolesData || []).map((r: any) => ({ label: r.role_type, value: r.role_type })),
              ]}
            />
          )}
        </div>
      </div>

      <ProTable
        rowKey="_id"
        cardBordered={false}
        style={{ borderRadius: 0 }}
        headerTitle={
          <Space size={8}>
            <div style={{ background: C.primaryLight, borderRadius: 8, padding: "5px 6px", color: C.primary, fontSize: 15, lineHeight: 1 }}>
              <TeamOutlined />
            </div>
            <Text strong style={{ fontSize: 14, color: C.darkText }}>All Staff</Text>
          </Space>
        }
        pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true,
          showTotal: (total, range) => <Text style={{ fontSize: 12, color: C.subText }}>{range[0]}–{range[1]} of {total}</Text>,
        }}
        columns={[
          {
            title: "Staff Member",
            dataIndex: "fullname",
            key: "fullname",
            fieldProps: { placeholder: "Search by name" },
            render: (_: any, record: any) => <UserInfoCell record={record} />,
          },
          {
            title: "Role",
            dataIndex: ["role", "role_type"],
            hideInSearch: true,
            width: 190,
            render: (text: any, record: any) => {
              const roleText = typeof text === "string" ? text
                : typeof record?.role?.role_type === "string" ? record.role.role_type
                : String(text || "—");
              return roleText && roleText !== "—" ? <RoleTag role={roleText} /> : <Text style={{ color: "#cbd5e1", fontSize: 12 }}>—</Text>;
            },
          },
          {
            title: "Branch",
            dataIndex: ["shop_id", "name"],
            hideInSearch: true,
            width: 140,
            render: (_dom: any, record: any) => {
              const shop = record?.shop_id?.name;
              const isAdminRole = typeof record?.role?.role_type === "string" && record.role.role_type.toLowerCase() === "admin";
              return (
                <Tooltip title={!isAdminRole ? shop : undefined}>
                  <Text style={{
                    fontSize: 12,
                    color: isAdminRole ? "#cbd5e1" : C.darkText,
                    display: "flex", alignItems: "center", gap: 5,
                    maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    <ShopOutlined style={{ color: "#94a3b8", fontSize: 11, flexShrink: 0 }} />
                    {isAdminRole ? "N/A" : shop || "—"}
                  </Text>
                </Tooltip>
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
            width: 90,
            fixed: "right" as const,
            render: (_: any, record: any) => (
              <ActionCell
                record={record}
                onStatusUpdate={(id, status) => updateStatusMutation.mutate({ id, status })}
                onDelete={(id) => deleteUserMutation.mutate(id)}
                loading={updateStatusMutation.isLoading || deleteUserMutation.isLoading}
              />
            ),
          },
        ]}
        request={async (params) => {
          // Request pagination data from API
          const result = await fetchAllUsersList({ ...params, returnPagination: true });
          const users = result?.users || [];
          const pagination = result?.pagination || { total: 0, limit: 10, skip: 0, hasMore: false };
          
          let filtered = users.filter((item: any) =>
            user?.isAdmin && user?.id ? item._id !== user.id : true
          );
          if ((!user?.isAdmin || isShopLevel) && currentShopId) {
            filtered = filtered.filter((item: any) =>
              item.shop_id?._id === currentShopId || item.shop_id === currentShopId
            );
          }
          setAllUsers(filtered);

          // Apply local filters (driven by our custom filter bar, not ProTable search)
          if (statusFilter !== "all") {
            filtered = filtered.filter((item: any) => (item.status || "Active") === statusFilter);
          }
          if (roleFilter !== "all") {
            filtered = filtered.filter((item: any) =>
              typeof item.role?.role_type === "string" &&
              item.role.role_type.toLowerCase() === roleFilter.toLowerCase()
            );
          }
          if (branchFilter !== "all") {
            filtered = filtered.filter((item: any) =>
              item.shop_id?._id === branchFilter || item.shop_id === branchFilter
            );
          }
          if (nameSearch.trim()) {
            const q = nameSearch.trim().toLowerCase();
            filtered = filtered.filter((item: any) =>
              (typeof item.fullname === "string" && item.fullname.toLowerCase().includes(q)) ||
              (typeof item.email    === "string" && item.email.toLowerCase().includes(q))
            );
          }

          console.log('Desktop - After all filters:', filtered.length);
          console.log('Desktop - Filters:', { statusFilter, roleFilter, branchFilter, nameSearch });
          console.log('Desktop - API Pagination total:', pagination.total);

          // Return the filtered data directly - API already handles pagination
          // Use the filtered count for total when filters are applied, otherwise use API total
          const hasFilters = statusFilter !== "all" || roleFilter !== "all" || branchFilter !== "all" || nameSearch.trim();
          const total = hasFilters ? filtered.length : pagination.total;

          return { data: filtered, success: true, total };
        }}
        params={{ _statusFilter: statusFilter, _roleFilter: roleFilter, _branchFilter: branchFilter, _nameSearch: nameSearch }}
        options={{ reload: () => actionRef.current?.reload(), density: true, setting: true }}
        actionRef={actionRef}
        rowSelection={{ alwaysShowAlert: false, selections: false }}
        scroll={{ x: 860 }}
        search={false}
        expandable={{
          expandedRowRender: (record) => <ExpandedRowContent record={record} />,
          defaultExpandAllRows: false,
        }}
        dateFormatter="string"
        toolBarRender={() => [
          <AddEditProUserModal
            actionRef={actionRef}
            onUserSaved={() => { actionRef.current?.reload(); onUserChange?.(); }}
            onSuccess={() => { actionRef.current?.reload(); onUserChange?.(); }}
          />,
        ]}
        rowClassName={(record) => {
          if (record.status === "Terminated") return "row-terminated";
          if (record.status === "Suspended") return "row-suspended";
          return "";
        }}
      />
    </div>
  );
};

export default UsersTable;
