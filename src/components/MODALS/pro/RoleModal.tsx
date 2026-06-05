import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Steps,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { createRole, updateRole } from "@services/Roles";
import ShowConfirm from "@utils/ConfirmUtil";
import {
  getPermissionsGroupedByModuleForTenant,
  PERMISSIONS,
  Permission,
  ActionType,
  ROLE_PRESETS,
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
  teal: "#0d9488",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Action badge config ───────────────────────────────────────────────────────
const ACTION_CFG: Record<ActionType, { color: string; bg: string; label: string }> = {
  create: { color: C.blue, bg: "#eff6ff", label: "CREATE" },
  read: { color: C.green, bg: "#f0fdf4", label: "READ" },
  update: { color: C.orange, bg: "#fffbeb", label: "UPDATE" },
  delete: { color: C.red, bg: "#fef2f2", label: "DELETE" },
  special: { color: C.purple, bg: "#faf5ff", label: "ACTION" },
};

// ── Scope badge config ────────────────────────────────────────────────────────
const SCOPE_CFG: Record<string, { color: string; bg: string; antColor: string; label: string }> = {
  core: { color: C.indigo, bg: "#eef2ff", antColor: "default", label: "Core" },
  hr: { color: C.blue, bg: "#eff6ff", antColor: "blue", label: "HR" },
  accounting: { color: C.purple, bg: "#faf5ff", antColor: "purple", label: "Accounting" },
  crm: { color: C.teal, bg: "#f0fdfa", antColor: "cyan", label: "CRM" },
  dala: { color: C.orange, bg: "#fff7ed", antColor: "orange", label: "Dala" },
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

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={{ fontSize: 10, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 10 }}>
    {children}
  </Text>
);

// ── Active module tags ────────────────────────────────────────────────────────
const ModuleTags: React.FC<{ hasHR: boolean; hasAccounting: boolean; hasMteja: boolean; hasDala: boolean; hasPOS: boolean; size?: "small" | "normal" }> = ({
  hasHR, hasAccounting, hasMteja, hasDala, hasPOS, size = "normal",
}) => {
  const fs = size === "small" ? 10 : 11;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      <Tag color="default" style={{ fontSize: fs, margin: 0 }}>✓ Core</Tag>
      {hasPOS ? <Tag color="blue" style={{ fontSize: fs, margin: 0 }}>✓ POS</Tag> : null}
      {hasHR ? <Tag color="blue" style={{ fontSize: fs, margin: 0 }}>✓ HR</Tag> : null}
      {hasAccounting ? <Tag color="purple" style={{ fontSize: fs, margin: 0 }}>✓ Accounting</Tag> : null}
      {hasMteja ? <Tag color="cyan" style={{ fontSize: fs, margin: 0 }}>✓ CRM</Tag> : null}
      {hasDala ? <Tag color="orange" style={{ fontSize: fs, margin: 0 }}>✓ Dala</Tag> : null}
    </div>
  );
};

// ── Permission group card ─────────────────────────────────────────────────────
const PermissionGroupCard: React.FC<{
  moduleName: string;
  permissions: Permission[];
  selected: string[];
  onToggle: (key: string, checked: boolean) => void;
  onToggleAll: (keys: string[], checked: boolean) => void;
}> = ({ moduleName, permissions, selected, onToggle, onToggleAll }) => {
  const keys = permissions.map((p) => p.key);
  const selectedCount = keys.filter((k) => selected.includes(k)).length;
  const allChecked = selectedCount === keys.length && keys.length > 0;
  const indeterminate = selectedCount > 0 && !allChecked;

  const scope = permissions[0]?.moduleScope || "core";
  const scopeCfg = SCOPE_CFG[scope] || SCOPE_CFG.core;
  const borderColor = allChecked ? C.primary : scope !== "core" ? scopeCfg.color : C.border;

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${allChecked ? C.primary : C.border}`,
      borderTop: `3px solid ${borderColor}`,
      borderRadius: 10,
      overflow: "hidden",
      flex: "1 0 220px",
      minWidth: 200,
    }}>
      {/* Header */}
      <div style={{
        background: allChecked ? C.primaryLight : C.bg,
        padding: "10px 12px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}>
        <Checkbox checked={allChecked} indeterminate={indeterminate} onChange={(e) => onToggleAll(keys, e.target.checked)}>
          <Text style={{ fontSize: 11, fontWeight: 600, color: allChecked ? C.primary : C.darkText, lineHeight: 1.3 }}>
            {moduleName}
          </Text>
        </Checkbox>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {scope !== "core" && (
            <span style={{ background: scopeCfg.bg, color: scopeCfg.color, borderRadius: 4, fontSize: 9, fontWeight: 700, padding: "1px 5px" }}>
              {scopeCfg.label}
            </span>
          )}
          <span style={{
            background: selectedCount > 0 ? C.primaryLight : C.bg,
            color: selectedCount > 0 ? C.primary : "#94a3b8",
            borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 7px",
            border: `1px solid ${selectedCount > 0 ? C.primary : C.border}`,
          }}>
            {selectedCount}/{keys.length}
          </span>
        </div>
      </div>

      {/* Permission rows */}
      <div style={{ padding: "4px 0" }}>
        {permissions.map((perm) => {
          const checked = selected.includes(perm.key);
          const cfg = ACTION_CFG[perm.action] ?? ACTION_CFG.special;
          return (
            <label key={perm.key} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "5px 12px", cursor: "pointer",
              background: checked ? `${C.primary}08` : "transparent",
              borderBottom: `1px solid ${C.border}`, gap: 8,
            }}>
              <Checkbox checked={checked} onChange={(e) => onToggle(perm.key, e.target.checked)} style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 11, color: checked ? C.primary : C.darkText, fontWeight: checked ? 500 : 400 }}>
                  {perm.label}
                </Text>
              </Checkbox>
              <Tooltip title={perm.key} placement="left">
                <span style={{
                  background: cfg.bg, color: cfg.color, borderRadius: 4,
                  fontSize: 9, fontWeight: 700, padding: "1px 5px",
                  fontFamily: "monospace", flexShrink: 0, cursor: "help",
                }}>
                  {cfg.label}
                </span>
              </Tooltip>
            </label>
          );
        })}
      </div>
    </div>
  );
};

// ── Step 1: Basic Info ────────────────────────────────────────────────────────
const StepBasicInfo: React.FC<{
  roleType: string;
  onChange: (v: string) => void;
  error?: string;
  onApplyPreset: (keys: string[], goToPermissions: () => void) => void;
  hasHR: boolean;
  hasAccounting: boolean;
  hasMteja: boolean;
  hasDala: boolean;
  hasPOS: boolean;
}> = ({ roleType, onChange, error, onApplyPreset, hasHR, hasAccounting, hasMteja, hasDala, hasPOS }) => {

  // Filter presets to only show those relevant to enabled modules
  const presetOptions = Object.entries(ROLE_PRESETS)
    .filter(([name]) => {
      // Hide HR presets when HR not enabled
      if ((name.startsWith("HR_")) && !hasHR) return false;
      // Hide Accounting presets when Accounting not enabled
      if ((name === "ACCOUNTANT" || name === "ACCOUNTING_VIEWER") && !hasAccounting) return false;
      // Hide CRM presets when Mteja not enabled
      if ((name.startsWith("CRM_")) && !hasMteja) return false;
      // Hide Dala presets when Dala not enabled
      if ((name.startsWith("DALA_")) && !hasDala) return false;
      return true;
    })
    .map(([name, keys]) => ({
      label: name.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      value: name,
      keys: keys as string[],
    }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Role type input */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 16px 12px" }}>
        <SectionLabel>Role Details</SectionLabel>
        <Text style={{ fontSize: 12, color: C.subText, display: "block", marginBottom: 6 }}>
          Role Type <span style={{ color: C.red }}>*</span>
        </Text>
        <Input
          value={roleType}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. cashier, supervisor, crm_agent"
          style={{ borderRadius: 8, height: 38, fontSize: 13 }}
          status={error ? "error" : undefined}
          prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
        />
        {error && <Text style={{ fontSize: 12, color: C.red, marginTop: 4, display: "block" }}>{error}</Text>}
        <Text style={{ fontSize: 11, color: C.subText, marginTop: 8, display: "block", lineHeight: 1.5 }}>
          Use lowercase. This identifies the role across the system.
        </Text>
      </div>

      {/* Active modules indicator */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
        <SectionLabel>Active Modules — Permissions Available</SectionLabel>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <Tag color="default" style={{ fontSize: 11 }}>✓ Core (POS)</Tag>
          {hasPOS ? <Tag color="blue" style={{ fontSize: 11 }}>✓ POS Module</Tag>
            : <Tag style={{ fontSize: 11, color: "#94a3b8", borderColor: C.border }}>✗ POS (not enabled)</Tag>}
          {hasHR ? <Tag color="blue" style={{ fontSize: 11 }}>✓ HR Module</Tag>
            : <Tag style={{ fontSize: 11, color: "#94a3b8", borderColor: C.border }}>✗ HR (not enabled)</Tag>}
          {hasAccounting ? <Tag color="purple" style={{ fontSize: 11 }}>✓ Accounting</Tag>
            : <Tag style={{ fontSize: 11, color: "#94a3b8", borderColor: C.border }}>✗ Accounting (not enabled)</Tag>}
          {hasMteja ? <Tag color="cyan" style={{ fontSize: 11 }}>✓ CRM / Mteja</Tag>
            : <Tag style={{ fontSize: 11, color: "#94a3b8", borderColor: C.border }}>✗ CRM (not enabled)</Tag>}
          {hasDala ? <Tag color="orange" style={{ fontSize: 11 }}>✓ Dala / Property</Tag>
            : <Tag style={{ fontSize: 11, color: "#94a3b8", borderColor: C.border }}>✗ Dala (not enabled)</Tag>}
        </div>
        <Text style={{ fontSize: 11, color: C.subText }}>
          Only permissions for your active modules are shown on Step 2.
        </Text>
      </div>

      {/* Preset selector */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 16px 12px" }}>
        <SectionLabel>Quick-load a Permission Preset</SectionLabel>
        <Text style={{ fontSize: 12, color: C.subText, display: "block", marginBottom: 10 }}>
          Click a preset to load its permissions — you will jump to Step 2 to review and customise.
        </Text>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {presetOptions.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onApplyPreset(p.keys, () => { })}
              style={{
                background: "#fff", border: `1.5px solid ${C.border}`,
                borderRadius: 7, padding: "5px 12px", fontSize: 12,
                fontWeight: 500, color: C.darkText, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.primary;
                (e.currentTarget as HTMLButtonElement).style.color = C.primary;
                (e.currentTarget as HTMLButtonElement).style.background = C.primaryLight;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                (e.currentTarget as HTMLButtonElement).style.color = C.darkText;
                (e.currentTarget as HTMLButtonElement).style.background = "#fff";
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Step 2: Permissions ───────────────────────────────────────────────────────
const StepPermissions: React.FC<{
  groupedPermissions: Record<string, Permission[]>;
  hasHR: boolean;
  hasAccounting: boolean;
  hasMteja: boolean;
  hasDala: boolean;
  hasPOS: boolean;
  selected: string[];
  onToggle: (key: string, checked: boolean) => void;
  onToggleAll: (keys: string[], checked: boolean) => void;
}> = ({ groupedPermissions, hasHR, hasAccounting, hasMteja, hasDala, hasPOS, selected, onToggle, onToggleAll }) => {
  const [search, setSearch] = useState("");
  const [filterScope, setFilterScope] = useState<ModuleScope | "all">("all");

  const totalCount = useMemo(() => Object.values(groupedPermissions).flat().length, [groupedPermissions]);
  const selectedCount = selected.length;

  const filteredGroups = useMemo(() => {
    return Object.entries(groupedPermissions).reduce<Record<string, Permission[]>>((acc, [mod, perms]) => {
      const filtered = perms.filter((p) => {
        const matchSearch = !search ||
          p.label.toLowerCase().includes(search.toLowerCase()) ||
          p.key.toLowerCase().includes(search.toLowerCase());
        const matchScope = filterScope === "all" || p.moduleScope === filterScope;
        return matchSearch && matchScope;
      });
      if (filtered.length) acc[mod] = filtered;
      return acc;
    }, {});
  }, [groupedPermissions, search, filterScope]);

  const allKeys = useMemo(() => Object.values(groupedPermissions).flat().map((p) => p.key), [groupedPermissions]);

  // Only show scope filter tabs for enabled modules
  const scopeOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [{ label: "All modules", value: "all" }, { label: "Core (POS)", value: "core" }];
    if (hasPOS) opts.push({ label: "POS", value: "core" });
    if (hasHR) opts.push({ label: "HR", value: "hr" });
    if (hasAccounting) opts.push({ label: "Accounting", value: "accounting" });
    if (hasMteja) opts.push({ label: "CRM / Mteja", value: "crm" });
    if (hasDala) opts.push({ label: "Dala", value: "dala" });
    return opts;
  }, [hasPOS, hasHR, hasAccounting, hasMteja, hasDala]);

  const activeModuleCount = 1 + (hasPOS ? 1 : 0) + (hasHR ? 1 : 0) + (hasAccounting ? 1 : 0) + (hasMteja ? 1 : 0) + (hasDala ? 1 : 0);

  return (
    <>
      {/* Controls bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        {/* Selection summary */}
        <div style={{
          background: selectedCount > 0 ? C.primaryLight : C.bg,
          border: `1px solid ${selectedCount > 0 ? C.primary : C.border}`,
          borderRadius: 8, padding: "6px 12px",
          display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
        }}>
          <KeyOutlined style={{ color: selectedCount > 0 ? C.primary : "#94a3b8", fontSize: 13 }} />
          <Text style={{ fontSize: 12, color: selectedCount > 0 ? C.primary : C.subText, fontWeight: 600 }}>
            {selectedCount} / {totalCount}
          </Text>
        </div>

        {/* Search */}
        <Input
          prefix={<SearchOutlined style={{ color: "#94a3b8", fontSize: 12 }} />}
          placeholder="Search permissions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ borderRadius: 8, height: 34, flex: "1 1 160px", fontSize: 12 }}
        />

        {/* Scope filter — only shows enabled modules */}
        {activeModuleCount > 1 && (
          <Select
            value={filterScope}
            onChange={(v) => setFilterScope(v as ModuleScope | "all")}
            style={{ width: 180, height: 34 }}
            options={scopeOptions}
          />
        )}

        {/* Select / clear all */}
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <Button size="small" style={{ borderRadius: 7, fontSize: 11 }} onClick={() => onToggleAll(allKeys, true)}>Select all</Button>
          <Button size="small" style={{ borderRadius: 7, fontSize: 11 }} disabled={selectedCount === 0} onClick={() => onToggleAll(allKeys, false)}>Clear all</Button>
        </div>
      </div>

      {/* Module scope legend */}
      {activeModuleCount > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.subText }}>Showing permissions for:</span>
          <Tag color="default" style={{ fontSize: 11, margin: 0 }}>Core</Tag>
          {hasPOS && <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>POS</Tag>}
          {hasHR && <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>HR</Tag>}
          {hasAccounting && <Tag color="purple" style={{ fontSize: 11, margin: 0 }}>Accounting</Tag>}
          {hasMteja && <Tag color="cyan" style={{ fontSize: 11, margin: 0 }}>CRM / Mteja</Tag>}
          {hasDala && <Tag color="orange" style={{ fontSize: 11, margin: 0 }}>Dala</Tag>}
        </div>
      )}

      {Object.keys(filteredGroups).length === 0 ? (
        <Empty description="No permissions match your filter" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: "32px 0" }} />
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {Object.entries(filteredGroups).map(([mod, perms]) => (
            <PermissionGroupCard
              key={mod}
              moduleName={mod}
              permissions={perms}
              selected={selected}
              onToggle={onToggle}
              onToggleAll={onToggleAll}
            />
          ))}
        </div>
      )}
    </>
  );
};

// ── Step 3: Review ────────────────────────────────────────────────────────────
const StepReview: React.FC<{ roleType: string; selected: string[] }> = ({ roleType, selected }) => {
  const grouped = useMemo(() => {
    return selected.reduce<Record<string, Permission[]>>((acc, key) => {
      const perm = PERMISSIONS[key];
      if (!perm) return acc;
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    }, {});
  }, [selected]);

  const scopeCounts = useMemo(() => {
    return selected.reduce<Record<string, number>>((acc, key) => {
      const scope = PERMISSIONS[key]?.moduleScope;
      if (scope) acc[scope] = (acc[scope] || 0) + 1;
      return acc;
    }, {});
  }, [selected]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Role type */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
        <SectionLabel>Role Type</SectionLabel>
        {roleType ? (
          <span style={{ background: C.primaryLight, color: C.primary, borderRadius: 7, fontSize: 14, fontWeight: 700, padding: "4px 14px", display: "inline-block" }}>
            {roleType}
          </span>
        ) : (
          <Text style={{ color: "#94a3b8", fontSize: 13 }}>Not set</Text>
        )}
      </div>

      {/* Module coverage */}
      {selected.length > 0 && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
          <SectionLabel>Module Coverage</SectionLabel>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {Object.entries(scopeCounts).map(([scope, count]) => {
              const cfg = SCOPE_CFG[scope] || { color: C.subText, bg: C.bg };
              return (
                <div key={scope} style={{ background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: 8, padding: "8px 14px", textAlign: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: 700, color: cfg.color, display: "block" }}>{count}</Text>
                  <Text style={{ fontSize: 11, color: cfg.color, textTransform: "capitalize" }}>{scope}</Text>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Permissions by module */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
        <SectionLabel>Selected Permissions ({selected.length})</SectionLabel>
        {selected.length === 0 ? (
          <Text style={{ color: "#94a3b8", fontSize: 13 }}>No permissions selected.</Text>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(grouped).map(([mod, perms]) => (
              <div key={mod}>
                <Text style={{ fontSize: 10, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: 5 }}>
                  {mod}
                </Text>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {perms.map((p) => {
                    const cfg = ACTION_CFG[p.action] ?? ACTION_CFG.special;
                    return (
                      <span key={p.key} style={{ background: cfg.bg, color: cfg.color, borderRadius: 5, fontSize: 11, fontWeight: 500, padding: "2px 8px", border: `1px solid ${cfg.color}30` }}>
                        {p.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!roleType && (
        <Alert type="warning" showIcon message="Role type is required. Go back to Step 1." style={{ borderRadius: 8 }} />
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
const RoleModal: React.FC<{ edit?: boolean; data?: any; actionRef?: any }> = ({ edit, data, actionRef }) => {
  const isMobile = useIsMobile();

  // ── Tenant module flags ────────────────────────────────────────────────────
  // useTenantModules must expose hasHR, hasAccounting, hasMteja, hasDala, hasPOS
  const { hasHR, hasAccounting, hasMteja, hasDala, hasPOS } = useTenantModules();

  // Rebuild permission groups whenever module flags change.
  // hasCRM maps to hasMteja — the CRM scope is gated on tenant.modules.crm.
  const groupedPermissions = useMemo(
    () => getPermissionsGroupedByModuleForTenant({ hasHR, hasAccounting, hasCRM: hasMteja, hasDala }),
    [hasHR, hasAccounting, hasMteja, hasDala]
  );

  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [roleType, setRoleType] = useState("");
  const [roleTypeError, setRoleTypeError] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ── Populate when editing ─────────────────────────────────────────────────
  useEffect(() => {
    if (open && edit && data) {
      setRoleType(data.role_type || "");
      setSelectedPermissions(
        (data.permissions || [])
          .map((p: any) => (typeof p === "string" ? p : p.key || p._id || ""))
          .filter(Boolean)
      );
    }
  }, [open, edit, data]);

  // ── Open / close ───────────────────────────────────────────────────────────
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

  // ── Permission toggles ─────────────────────────────────────────────────────
  const handleToggle = (key: string, checked: boolean) =>
    setSelectedPermissions((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));

  const handleToggleAll = (keys: string[], checked: boolean) =>
    setSelectedPermissions((prev) => {
      const others = prev.filter((k) => !keys.includes(k));
      return checked ? [...others, ...keys] : others;
    });

  // ── Apply preset — filters to keys valid for active modules, then jumps to step 2 ──
  const handleApplyPreset = (keys: string[]) => {
    // Build the set of permission keys that are valid for this tenant's active modules.
    // This prevents assigning accounting/HR/CRM permissions when those modules are off.
    const validKeys = new Set(Object.values(groupedPermissions).flat().map((p) => p.key));
    const filtered = keys.filter((k) => validKeys.has(k));
    setSelectedPermissions(filtered);
    // Jump straight to step 2 so the user can immediately see and adjust what was applied
    setCurrentStep(1);
  };

  // ── Step navigation ────────────────────────────────────────────────────────
  const handleNext = () => {
    if (currentStep === 0) {
      if (!roleType.trim()) { setRoleTypeError("Role type is required"); return; }
      setRoleTypeError("");
    }
    setCurrentStep((s) => Math.min(s + 1, 2));
  };

  const handlePrev = () => setCurrentStep((s) => Math.max(s - 1, 0));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!roleType.trim()) { setCurrentStep(0); setRoleTypeError("Role type is required"); return; }
    const confirmed = await ShowConfirm({ title: `${edit ? "Update" : "Create"} role "${roleType}"?`, position: true });
    if (!confirmed) return;
    setSubmitting(true);
    try {
      const payload = { role_type: roleType.trim().toLowerCase(), permissions: selectedPermissions };
      edit ? await updateRole({ values: payload, _id: data?._id }) : await createRole(payload);
      actionRef?.current?.reload();
      handleOpen(false);
    } catch {
      // service layer handles toasts
    } finally {
      setSubmitting(false);
    }
  };

  // ── Steps config ───────────────────────────────────────────────────────────
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
      onApplyPreset={(keys) => handleApplyPreset(keys)}
      hasHR={hasHR}
      hasAccounting={hasAccounting}
      hasMteja={hasMteja}
      hasDala={hasDala}
      hasPOS={hasPOS}
    />,
    <StepPermissions
      key="perms"
      groupedPermissions={groupedPermissions}
      hasHR={hasHR}
      hasAccounting={hasAccounting}
      hasMteja={hasMteja}
      hasDala={hasDala}
      hasPOS={hasPOS}
      selected={selectedPermissions}
      onToggle={handleToggle}
      onToggleAll={handleToggleAll}
    />,
    <StepReview key="review" roleType={roleType} selected={selectedPermissions} />,
  ];

  // ── Shared footer ──────────────────────────────────────────────────────────
  const footer = (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <Button onClick={handlePrev} disabled={currentStep === 0 || submitting} style={{ borderRadius: 8, minWidth: 90 }}>
        ← Back
      </Button>
      <div style={{ display: "flex", gap: 10 }}>
        <Button onClick={() => handleOpen(false)} disabled={submitting} style={{ borderRadius: 8 }}>Cancel</Button>
        {currentStep < 2 ? (
          <Button type="primary" onClick={handleNext} style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 500 }}>
            Next →
          </Button>
        ) : (
          <Button type="primary" onClick={handleSubmit} loading={submitting} style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 500 }}>
            {edit ? "Save Changes" : "Create Role"}
          </Button>
        )}
      </div>
    </div>
  );

  // ── Modal title ────────────────────────────────────────────────────────────
  const modalTitle = (
    <Space size={8} wrap>
      <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
        {edit ? <EditOutlined /> : <PlusOutlined />}
      </div>
      <Text strong style={{ fontSize: 13, color: C.darkText }}>
        {edit ? `Edit Role — ${data?.role_type || ""}` : "New Role"}
      </Text>
      <ModuleTags hasHR={hasHR} hasAccounting={hasAccounting} hasMteja={hasMteja} hasDala={hasDala} hasPOS={hasPOS} size="small" />
    </Space>
  );

  const stepIndicator = (
    <Steps current={currentStep} size="small" style={{ marginBottom: 20 }} items={STEPS.map((s) => ({ title: s.title, icon: s.icon }))} />
  );

  const triggerButton = edit ? (
    <Button size="small" icon={<EditOutlined style={{ color: C.primary }} />} style={{ borderRadius: 7 }} onClick={() => handleOpen(true)}>Edit</Button>
  ) : (
    <Button type="primary" icon={<PlusOutlined />} style={{ background: C.primary, borderColor: C.primary, borderRadius: 7, fontWeight: 500 }} onClick={() => handleOpen(true)}>
      {isMobile ? "Add" : "New Role"}
    </Button>
  );

  // ── Mobile: Drawer ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {triggerButton}
        <Drawer open={open} onClose={() => handleOpen(false)} placement="bottom" height="92vh" destroyOnClose title={modalTitle}
          styles={{ body: { padding: "14px 14px 110px", overflowY: "auto" }, footer: { padding: "12px 14px", borderTop: `1px solid ${C.border}`, background: "#fff" } }}
          footer={footer}
        >
          {stepIndicator}
          {stepContent[currentStep]}
        </Drawer>
      </>
    );
  }

  // ── Desktop: Modal ─────────────────────────────────────────────────────────
  return (
    <>
      {triggerButton}
      <Modal open={open} onCancel={() => handleOpen(false)} destroyOnClose centered
        width="min(960px, 96vw)"
        title={modalTitle}
        footer={footer}
        styles={{ body: { maxHeight: "72vh", overflowY: "auto", padding: "20px 20px 8px" } }}
      >
        {stepIndicator}
        {stepContent[currentStep]}
      </Modal>
    </>
  );
};

export default RoleModal;