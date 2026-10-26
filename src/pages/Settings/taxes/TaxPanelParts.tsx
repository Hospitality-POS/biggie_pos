import React from "react";
import { Button, InputNumber, Switch, Tag, Typography } from "antd";
import { CheckCircleOutlined, InfoCircleOutlined, ShopOutlined } from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";

// Building blocks shared by the VAT and Catering Levy settings panels, which
// render in both System Setup and Admin → Settings.

const { Text } = Typography;
const C = THEME_C;

export const kes = (n: number) =>
  `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const panelCard: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 18,
};

export const CardLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: C.subText, display: "block" }}>
    {children}
  </Text>
);

export const PanelStack: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>{children}</div>
);

// ── Master on/off card ───────────────────────────────────────────────────────
export const ToggleCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent: string;
  accentBg: string;
}> = ({ icon, title, description, checked, onChange, accent, accentBg }) => (
  <div
    style={{
      ...panelCard,
      display: "flex",
      alignItems: "center",
      gap: 16,
      background: checked ? accentBg : "#fff",
      borderColor: checked ? `${accent}55` : C.border,
      transition: "all 0.2s ease",
    }}
  >
    <div
      style={{
        width: 44, height: 44, borderRadius: 11, flexShrink: 0, fontSize: 20,
        background: checked ? `${accent}22` : C.bg, color: checked ? accent : C.subText,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>{title}</Text>
      <Text style={{ fontSize: 12, color: C.subText }}>{description}</Text>
    </div>
    <Switch checked={checked} onChange={onChange} />
  </div>
);

// ── Rate input with quick presets ────────────────────────────────────────────
export const RateCard: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  presets: number[];
  disabled?: boolean;
  hint?: string;
  children?: React.ReactNode;
}> = ({ label, value, onChange, presets, disabled, hint, children }) => (
  <div style={{ ...panelCard, flex: "1 1 280px", minWidth: 0 }}>
    <CardLabel>{label}</CardLabel>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
      <InputNumber
        value={value}
        onChange={(v) => onChange(Number(v) || 0)}
        min={0}
        max={100}
        step={0.5}
        disabled={disabled}
        addonAfter="%"
        style={{ width: 130 }}
      />
      {presets.map((p) => (
        <Tag.CheckableTag
          key={p}
          checked={value === p}
          onChange={() => !disabled && onChange(p)}
          style={{ borderRadius: 999, padding: "2px 12px", border: `1px solid ${value === p ? "transparent" : C.border}` }}
        >
          {p}%
        </Tag.CheckableTag>
      ))}
    </div>
    {children}
    {hint && <Text style={{ fontSize: 11, color: C.subText, display: "block", marginTop: 10 }}>{hint}</Text>}
  </div>
);

// ── Worked example ───────────────────────────────────────────────────────────
export const ExampleCard: React.FC<{ rows: { label: string; value: string; strong?: boolean; accent?: string }[] }> = ({ rows }) => (
  <div style={{ ...panelCard, flex: "1 1 220px", minWidth: 0, background: C.bg }}>
    <CardLabel>Example</CardLabel>
    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7, fontSize: 13 }}>
      {rows.map((r, i) => (
        <div
          key={r.label}
          style={{
            display: "flex", justifyContent: "space-between", gap: 12,
            paddingTop: r.strong && i > 0 ? 7 : 0,
            borderTop: r.strong && i > 0 ? `1px dashed ${C.border}` : "none",
          }}
        >
          <Text style={{ color: r.strong ? C.darkText : C.subText, fontWeight: r.strong ? 600 : 400 }}>{r.label}</Text>
          <Text style={{ color: r.accent || C.darkText, fontWeight: r.strong || r.accent ? 600 : 400 }}>{r.value}</Text>
        </div>
      ))}
    </div>
  </div>
);

// ── Which branches the tax applies to ────────────────────────────────────────
export type CoverageTone = "branch" | "business" | "off";

export const BranchCoverage: React.FC<{
  rows: { id: string; name: string; label: string; tone: CoverageTone }[];
  note: string;
}> = ({ rows, note }) => {
  if (!rows.length) return null;
  return (
    <div style={panelCard}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <ShopOutlined style={{ color: C.subText }} />
        <Text strong style={{ fontSize: 13, color: C.darkText }}>Branch coverage</Text>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.id}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            padding: "9px 0", borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
          }}
        >
          <Text style={{ fontSize: 13, color: C.darkText }}>{row.name}</Text>
          <Tag
            bordered={false}
            color={row.tone === "branch" ? "purple" : row.tone === "business" ? "cyan" : "default"}
            style={{ marginInlineEnd: 0, borderRadius: 6 }}
          >
            {row.label}
          </Tag>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <InfoCircleOutlined style={{ color: C.subText, fontSize: 12, marginTop: 3 }} />
        <Text style={{ fontSize: 11, color: C.subText }}>{note}</Text>
      </div>
    </div>
  );
};

// ── Note shown above a branch panel when the tax already applies everywhere ──
export const InfoNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    display: "flex", gap: 8, alignItems: "flex-start",
    background: "#ecfeff", border: "1px solid #a5f3fc", color: "#0e7490",
    borderRadius: 10, padding: "10px 12px", fontSize: 12,
  }}>
    <InfoCircleOutlined style={{ marginTop: 2 }} />
    <span>{children}</span>
  </div>
);

export const SaveBar: React.FC<{ label: string; dirty: boolean; loading: boolean; onSave: () => void }> = ({
  label, dirty, loading, onSave,
}) => (
  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
    {dirty && <Text style={{ fontSize: 12, color: C.subText }}>Unsaved changes</Text>}
    <Button type="primary" icon={<CheckCircleOutlined />} disabled={!dirty} loading={loading} onClick={onSave} style={{ borderRadius: 8 }}>
      {label}
    </Button>
  </div>
);
