import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Skeleton,
  Space,
  Steps,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useEffect as useEffectAlias, useState as useStateAlias } from "react";
import { useQuery } from "@tanstack/react-query";
import { createRole, updateRole } from "@services/Roles";
import ShowConfirm from "@utils/ConfirmUtil";
import { fetchAllPermissions } from "@services/permission";

const { Text, Title } = Typography;

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

// ── HTTP method badge (for permission tooltips) ───────────────────────────────
const METHOD_CFG: Record<string, { color: string; bg: string }> = {
  GET: { color: C.green, bg: "#f0fdf4" },
  POST: { color: C.blue, bg: "#eff6ff" },
  PUT: { color: C.orange, bg: "#fffbeb" },
  PATCH: { color: C.indigo, bg: "#eef2ff" },
  DELETE: { color: C.red, bg: "#fef2f2" },
};

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text
    style={{
      fontSize: 10,
      fontWeight: 700,
      color: C.subText,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      display: "block",
      marginBottom: 10,
    }}
  >
    {children}
  </Text>
);

// ── Helper: group raw permissions by group_name ───────────────────────────────
const groupPermissions = (permissions: any[]): Record<string, { id: string; name: string; method?: string }[]> =>
  permissions.reduce((acc, p) => {
    const key = p.group_name || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push({ id: p._id, name: p.name, method: p.method });
    return acc;
  }, {} as Record<string, { id: string; name: string; method?: string }[]>);

// ── Permission group card ─────────────────────────────────────────────────────
const PermissionGroupCard: React.FC<{
  category: string;
  permissions: { id: string; name: string; method?: string }[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (category: string, checked: boolean) => void;
}> = ({ category, permissions, selected, onToggle, onToggleAll }) => {
  const selectedInGroup = permissions.filter((p) => selected.includes(p.id)).length;
  const allChecked = selectedInGroup === permissions.length;
  const indeterminate = selectedInGroup > 0 && !allChecked;

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${allChecked ? C.primary : C.border}`,
        borderTop: `3px solid ${allChecked ? C.primary : C.border}`,
        borderRadius: 10,
        overflow: "hidden",
        flex: "1 0 200px",
        minWidth: 180,
      }}
    >
      {/* Card header */}
      <div
        style={{
          background: allChecked ? C.primaryLight : C.bg,
          padding: "10px 12px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Checkbox
          checked={allChecked}
          indeterminate={indeterminate}
          onChange={(e) => onToggleAll(category, e.target.checked)}
        >
          <Text style={{ fontSize: 12, fontWeight: 600, color: allChecked ? C.primary : C.darkText }}>
            {category}
          </Text>
        </Checkbox>
        <span
          style={{
            background: selectedInGroup > 0 ? C.primaryLight : C.bg,
            color: selectedInGroup > 0 ? C.primary : "#94a3b8",
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 700,
            padding: "1px 7px",
            border: `1px solid ${selectedInGroup > 0 ? C.primary : C.border}`,
            whiteSpace: "nowrap",
          }}
        >
          {selectedInGroup}/{permissions.length}
        </span>
      </div>

      {/* Permission rows */}
      <div style={{ padding: "6px 0" }}>
        {permissions.map((permission) => {
          const checked = selected.includes(permission.id);
          const methodCfg = permission.method
            ? METHOD_CFG[permission.method?.toUpperCase()] || null
            : null;
          return (
            <label
              key={permission.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 12px",
                cursor: "pointer",
                background: checked ? `${C.primary}08` : "transparent",
                borderBottom: `1px solid ${C.border}`,
                gap: 8,
              }}
            >
              <Checkbox
                checked={checked}
                onChange={(e) => onToggle(permission.id, e.target.checked)}
                style={{ flex: 1 }}
              >
                <Text style={{ fontSize: 12, color: checked ? C.primary : C.darkText, fontWeight: checked ? 500 : 400 }}>
                  {permission.name}
                </Text>
              </Checkbox>
              {methodCfg && (
                <span
                  style={{
                    background: methodCfg.bg,
                    color: methodCfg.color,
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 5px",
                    fontFamily: "monospace",
                    flexShrink: 0,
                  }}
                >
                  {permission.method?.toUpperCase()}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
};

// ── Step 1: Basic info ────────────────────────────────────────────────────────
const StepBasicInfo: React.FC<{
  roleType: string;
  onChange: (v: string) => void;
  error?: string;
}> = ({ roleType, onChange, error }) => (
  <div
    style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "16px 16px 10px",
    }}
  >
    <SectionLabel>Role Details</SectionLabel>
    <div style={{ marginBottom: 4 }}>
      <Text style={{ fontSize: 12, color: C.subText, display: "block", marginBottom: 6 }}>
        Role Type <span style={{ color: C.red }}>*</span>
      </Text>
      <Input
        value={roleType}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. cashier, supervisor"
        style={{ borderRadius: 8, height: 38, fontSize: 13 }}
        status={error ? "error" : undefined}
      />
      {error && (
        <Text style={{ fontSize: 12, color: C.red, marginTop: 4, display: "block" }}>
          {error}
        </Text>
      )}
    </div>
    <Text style={{ fontSize: 11, color: C.subText, marginTop: 8, display: "block" }}>
      Role type is used to identify the staff role across the system. Use lowercase.
    </Text>
  </div>
);

// ── Step 2: Permissions ───────────────────────────────────────────────────────
const StepPermissions: React.FC<{
  permissions: Record<string, { id: string; name: string; method?: string }[]>;
  loading: boolean;
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (category: string, checked: boolean) => void;
}> = ({ permissions, loading, selected, onToggle, onToggleAll }) => {
  const totalCount = Object.values(permissions).flat().length;
  const selectedCount = selected.length;

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} style={{ borderRadius: 10, border: `1px solid ${C.border}` }} bodyStyle={{ padding: 12 }}>
            <Skeleton active paragraph={{ rows: 3 }} />
          </Card>
        ))}
      </div>
    );
  }

  if (!totalCount) {
    return (
      <Empty
        description="No permissions found"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ padding: "32px 0" }}
      />
    );
  }

  return (
    <>
      {/* Selection summary */}
      <div
        style={{
          background: selectedCount > 0 ? C.primaryLight : C.bg,
          border: `1px solid ${selectedCount > 0 ? C.primary : C.border}`,
          borderRadius: 8,
          padding: "9px 14px",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <KeyOutlined style={{ color: selectedCount > 0 ? C.primary : "#94a3b8", fontSize: 14 }} />
        <Text style={{ fontSize: 13, color: selectedCount > 0 ? C.primary : C.subText, fontWeight: 600 }}>
          {selectedCount} / {totalCount} permissions selected
        </Text>
        {selectedCount > 0 && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: C.subText,
              cursor: "pointer",
              textDecoration: "underline",
            }}
            onClick={() =>
              Object.entries(permissions).forEach(([cat]) =>
                onToggleAll(cat, false)
              )
            }
          >
            Clear all
          </span>
        )}
      </div>

      {/* Permission groups — responsive flex wrap */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {Object.entries(permissions).map(([category, perms]) => (
          <PermissionGroupCard
            key={category}
            category={category}
            permissions={perms}
            selected={selected}
            onToggle={onToggle}
            onToggleAll={onToggleAll}
          />
        ))}
      </div>
    </>
  );
};

// ── Step 3: Review ────────────────────────────────────────────────────────────
const StepReview: React.FC<{
  roleType: string;
  selected: string[];
  permissions: Record<string, { id: string; name: string }[]>;
}> = ({ roleType, selected, permissions }) => {
  const allPerms = Object.values(permissions).flat();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Role type */}
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "14px 16px",
        }}
      >
        <SectionLabel>Role Type</SectionLabel>
        {roleType ? (
          <span
            style={{
              background: C.primaryLight,
              color: C.primary,
              borderRadius: 7,
              fontSize: 14,
              fontWeight: 700,
              padding: "4px 14px",
              display: "inline-block",
            }}
          >
            {roleType}
          </span>
        ) : (
          <Text style={{ color: "#94a3b8", fontSize: 13 }}>Not set</Text>
        )}
      </div>

      {/* Permissions */}
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "14px 16px",
        }}
      >
        <SectionLabel>Selected Permissions ({selected.length})</SectionLabel>
        {selected.length === 0 ? (
          <Text style={{ color: "#94a3b8", fontSize: 13 }}>No permissions selected</Text>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {selected.map((permId) => {
              const perm = allPerms.find((p) => p.id === permId);
              return perm ? (
                <span
                  key={permId}
                  style={{
                    background: C.primaryLight,
                    color: C.primary,
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "3px 9px",
                    border: `1px solid ${C.primary}30`,
                  }}
                >
                  {perm.name}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>

      {!roleType && (
        <Alert
          type="warning"
          showIcon
          message="Role type is required. Go back to Step 1 to enter a role type."
          style={{ borderRadius: 8 }}
        />
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const RoleModal: React.FC<{ edit?: boolean; data?: any; actionRef?: any }> = ({
  edit,
  data,
  actionRef,
}) => {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [roleType, setRoleType] = useState("");
  const [roleTypeError, setRoleTypeError] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const isMobile = useIsMobile();

  // ── Permissions query ───────────────────────────────────────────────────────
  const { data: PERMISSIONS = {}, isLoading: permLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const perms = await fetchAllPermissions({ someParam: "value" });
      return groupPermissions(perms);
    },
    retry: 1,
    networkMode: "always",
  });

  // ── Populate on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (open && edit && data) {
      setRoleType(data.role_type || "");
      setSelectedPermissions(
        (data.permissions || []).map((p: any) =>
          typeof p === "string" ? p : p._id
        )
      );
    }
  }, [open, edit, data]);

  // ── Open / close ────────────────────────────────────────────────────────────
  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setCurrentStep(0);
      setRoleType("");
      setRoleTypeError("");
      setSelectedPermissions([]);
      setSubmitting(false);
    }
  };

  // ── Permission toggles ──────────────────────────────────────────────────────
  const handleToggle = (id: string, checked: boolean) =>
    setSelectedPermissions((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );

  const handleToggleAll = (category: string, checked: boolean) => {
    const catIds = (PERMISSIONS[category] || []).map((p) => p.id);
    setSelectedPermissions((prev) => {
      const others = prev.filter((p) => !catIds.includes(p));
      return checked ? [...others, ...catIds] : others;
    });
  };

  // ── Step navigation ─────────────────────────────────────────────────────────
  const handleNext = () => {
    if (currentStep === 0) {
      if (!roleType.trim()) {
        setRoleTypeError("Role type is required");
        return;
      }
      setRoleTypeError("");
    }
    setCurrentStep((s) => Math.min(s + 1, 2));
  };

  const handlePrev = () => setCurrentStep((s) => Math.max(s - 1, 0));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!roleType.trim()) {
      setCurrentStep(0);
      setRoleTypeError("Role type is required");
      return;
    }

    const confirmed = await ShowConfirm({
      title: `${edit ? "Update" : "Create"} role "${roleType}"?`,
      position: true,
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const payload = {
        role_type: roleType,
        permissions: selectedPermissions.map((id) => ({ _id: id })),
      };
      edit
        ? await updateRole({ values: payload, _id: data?._id })
        : await createRole(payload);
      actionRef?.current?.reload();
      handleOpen(false);
    } catch {
      // errors handled by services
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step definitions ────────────────────────────────────────────────────────
  const STEPS = [
    { title: "Basic Info", icon: <UserOutlined /> },
    { title: "Permissions", icon: <SafetyCertificateOutlined /> },
    { title: "Review", icon: <CheckCircleOutlined /> },
  ];

  const stepContent = [
    <StepBasicInfo
      key="basic"
      roleType={roleType}
      onChange={(v) => { setRoleType(v); setRoleTypeError(""); }}
      error={roleTypeError}
    />,
    <StepPermissions
      key="perms"
      permissions={PERMISSIONS}
      loading={permLoading}
      selected={selectedPermissions}
      onToggle={handleToggle}
      onToggleAll={handleToggleAll}
    />,
    <StepReview
      key="review"
      roleType={roleType}
      selected={selectedPermissions}
      permissions={PERMISSIONS}
    />,
  ];

  // ── Shared footer ───────────────────────────────────────────────────────────
  const footer = (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <Button
        onClick={handlePrev}
        disabled={currentStep === 0 || submitting}
        style={{ borderRadius: 8, minWidth: 90 }}
      >
        ← Back
      </Button>
      <div style={{ display: "flex", gap: 10 }}>
        <Button
          onClick={() => handleOpen(false)}
          disabled={submitting}
          style={{ borderRadius: 8 }}
        >
          Cancel
        </Button>
        {currentStep < 2 ? (
          <Button
            type="primary"
            onClick={handleNext}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 500 }}
          >
            Next →
          </Button>
        ) : (
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={submitting}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 500 }}
          >
            {edit ? "Save Changes" : "Create Role"}
          </Button>
        )}
      </div>
    </div>
  );

  // ── Modal title ─────────────────────────────────────────────────────────────
  const modalTitle = (
    <Space size={8}>
      <div
        style={{
          background: C.primaryLight,
          borderRadius: 7,
          padding: "4px 6px",
          color: C.primary,
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        {edit ? <EditOutlined /> : <PlusOutlined />}
      </div>
      <Text strong style={{ fontSize: 13, color: C.darkText }}>
        {edit ? "Edit Role" : "New Role"}
      </Text>
    </Space>
  );

  // ── Step indicator ──────────────────────────────────────────────────────────
  const stepIndicator = (
    <Steps
      current={currentStep}
      size="small"
      style={{ marginBottom: 20 }}
      items={STEPS.map((s) => ({ title: s.title, icon: s.icon }))}
    />
  );

  // ── Trigger ─────────────────────────────────────────────────────────────────
  const triggerButton = edit ? (
    <Button
      size="small"
      icon={<EditOutlined style={{ color: C.primary }} />}
      style={{ borderRadius: 7 }}
      onClick={() => handleOpen(true)}
    >
      Edit
    </Button>
  ) : (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      style={{
        background: C.primary,
        borderColor: C.primary,
        borderRadius: 7,
        fontWeight: 500,
      }}
      onClick={() => handleOpen(true)}
    >
      {isMobile ? "Add" : "New Role"}
    </Button>
  );

  // ── Mobile: Drawer ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {triggerButton}
        <Drawer
          open={open}
          onClose={() => handleOpen(false)}
          placement="bottom"
          height="92vh"
          destroyOnClose
          title={modalTitle}
          styles={{
            body: { padding: "14px 14px 110px", overflowY: "auto" },
            footer: {
              padding: "12px 14px",
              borderTop: `1px solid ${C.border}`,
              background: "#fff",
            },
          }}
          footer={footer}
        >
          {stepIndicator}
          {stepContent[currentStep]}
        </Drawer>
      </>
    );
  }

  // ── Desktop: Modal ──────────────────────────────────────────────────────────
  return (
    <>
      {triggerButton}
      <Modal
        open={open}
        onCancel={() => handleOpen(false)}
        destroyOnClose
        centered
        width="min(860px, 96vw)"
        title={modalTitle}
        footer={footer}
        styles={{
          body: { maxHeight: "72vh", overflowY: "auto", padding: "20px 20px 8px" },
        }}
      >
        {stepIndicator}
        {stepContent[currentStep]}
      </Modal>
    </>
  );
};

export default RoleModal;