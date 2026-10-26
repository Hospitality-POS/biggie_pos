import React, { useState } from "react";
import { Input, InputNumber, Select, Switch, Tooltip, Dropdown, Button, Typography } from "antd";
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  DeleteOutlined,
  MoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CopyOutlined,
  PlusOutlined,
  MedicineBoxOutlined,
  DownOutlined,
  RightOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";
import { CHOICE_TYPES, FIELD_TYPE_META, newOption } from "../constants";
import { useAudience } from "../../audience";
import type { FieldType, FormField, FormOption, SignerRole } from "../types";

const { Text } = Typography;
const C = THEME_C;

const ANSWER_TYPES: FieldType[] = ["short_text", "long_text", "date", "phone", "email", "number"];

// Types a field can be switched to without losing what was typed
const CONVERTIBLE: Partial<Record<FieldType, FieldType[]>> = {
  short_text: ["long_text", "date", "phone", "email", "number"],
  long_text: ["short_text"],
  date: ["short_text"],
  phone: ["short_text"],
  email: ["short_text"],
  number: ["short_text"],
  single_choice: ["multi_choice"],
  multi_choice: ["single_choice"],
};

interface Props {
  field: FormField;
  index: number;
  readOnly: boolean;
  isFirst: boolean;
  isLast: boolean;
  /** The whole section is switched off — fields show dimmed */
  sectionHidden: boolean;
  onChange: (field: FormField) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={{ fontSize: 11.5, color: C.subText, display: "block", marginBottom: 4, fontWeight: 500 }}>
    {children}
  </Text>
);

const AlertToggle: React.FC<{ active: boolean; onClick: () => void; disabled: boolean; title: string }> = ({
  active,
  onClick,
  disabled,
  title,
}) => (
  <Tooltip title={title}>
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: `1px solid ${active ? "#fecaca" : "#e2e8f0"}`,
        background: active ? "#fef2f2" : "#fff",
        color: active ? "#dc2626" : "#94a3b8",
        borderRadius: 7,
        width: 28,
        height: 28,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        flexShrink: 0,
      }}
    >
      <MedicineBoxOutlined />
    </button>
  </Tooltip>
);

const OptionRow: React.FC<{
  option: FormOption;
  readOnly: boolean;
  onChange: (o: FormOption) => void;
  onDelete: () => void;
}> = ({ option, readOnly, onChange, onDelete }) => {
  const a = useAudience();
  return (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "4px 6px 4px 4px",
      borderRadius: 8,
      background: option.enabled ? "#fff" : "#f8fafc",
      border: `1px solid ${option.enabled ? "#eef2f7" : "transparent"}`,
    }}
  >
    <Tooltip title={option.enabled ? `Shown to ${a.people.toLowerCase()} — click to hide` : "Hidden — click to show"}>
      <Switch
        size="small"
        checked={option.enabled}
        disabled={readOnly}
        onChange={(enabled) => onChange({ ...option, enabled })}
      />
    </Tooltip>
    <Input
      variant="borderless"
      value={option.label}
      disabled={readOnly}
      onChange={(e) => onChange({ ...option, label: e.target.value })}
      style={{
        flex: 1,
        padding: "2px 4px",
        fontSize: 13,
        textDecoration: option.enabled ? "none" : "line-through",
        color: option.enabled ? "#0f172a" : "#94a3b8",
      }}
    />
    <AlertToggle
      active={option.is_alert}
      disabled={readOnly}
      title={option.is_alert ? `Raises a ${a.alertNoun} when picked` : `Raise a ${a.alertNoun} when picked`}
      onClick={() => onChange({ ...option, is_alert: !option.is_alert })}
    />
    {!readOnly && (
      <Tooltip title="Delete option">
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onDelete} style={{ color: "#94a3b8" }} />
      </Tooltip>
    )}
  </div>
  );
};

const FieldEditor: React.FC<Props> = ({
  field,
  index,
  readOnly,
  isFirst,
  isLast,
  sectionHidden,
  onChange,
  onDelete,
  onDuplicate,
  onMove,
}) => {
  const [open, setOpen] = useState(false);
  const a = useAudience();
  const meta = FIELD_TYPE_META[field.type];
  const set = <K extends keyof FormField>(key: K, value: FormField[K]) => onChange({ ...field, [key]: value });

  const isChoice = CHOICE_TYPES.includes(field.type);
  const hiddenOptions = field.options.filter((o) => !o.enabled).length;
  const dimmed = !field.enabled || sectionHidden;

  const summary = (() => {
    if (isChoice) {
      const shown = field.options.length - hiddenOptions;
      return `${shown} of ${field.options.length} options shown`;
    }
    if (field.type === "yes_no") return field.detail_label ? `Yes / No · “${field.detail_label}”` : "Yes / No";
    if (field.type === "rating") return `${field.scale_min}–${field.scale_max}`;
    if (field.type === "info") return `${field.content.length} paragraph${field.content.length === 1 ? "" : "s"}`;
    if (field.prefill_from !== "none") return `Filled from ${a.prefillOptions.find((p) => p.value === field.prefill_from)?.label.toLowerCase() ?? field.prefill_from}`;
    return meta.hint;
  })();

  const convertTo = CONVERTIBLE[field.type] ?? [];

  return (
    <div
      style={{
        background: dimmed ? "#fafbfc" : "#fff",
        border: `1px solid ${open ? `${meta.color}55` : "#e8edf3"}`,
        borderLeft: `3px solid ${dimmed ? "#cbd5e1" : meta.color}`,
        borderRadius: 10,
        transition: "border-color 0.15s ease, background 0.15s ease",
      }}
    >
      {/* ── Header row ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px 8px 8px" }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse" : "Expand"}
          style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", padding: 2, display: "flex" }}
        >
          {open ? <DownOutlined style={{ fontSize: 11 }} /> : <RightOutlined style={{ fontSize: 11 }} />}
        </button>

        <Tooltip title={meta.label}>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: `${meta.color}14`,
              color: meta.color,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              opacity: dimmed ? 0.5 : 1,
            }}
          >
            {meta.icon}
          </span>
        </Tooltip>

        <div style={{ flex: 1, minWidth: 0 }} onClick={() => !open && setOpen(true)}>
          <Input
            variant="borderless"
            value={field.label}
            disabled={readOnly}
            onChange={(e) => set("label", e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Question"
            style={{
              padding: "0 2px",
              fontSize: 13.5,
              fontWeight: 500,
              color: dimmed ? "#94a3b8" : "#0f172a",
              textDecoration: field.enabled ? "none" : "line-through",
            }}
          />
          <Text style={{ fontSize: 11.5, color: "#94a3b8", paddingLeft: 2, display: "block" }} ellipsis>
            {index}. {meta.label}
            {summary ? ` · ${summary}` : ""}
          </Text>
        </div>

        {field.required && field.type !== "info" && (
          <Tooltip title="Required">
            <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 15, lineHeight: 1 }}>*</span>
          </Tooltip>
        )}
        {(field.alert_on_yes || field.options.some((o) => o.is_alert)) && (
          <Tooltip title={`Raises ${a.alertsLabel.toLowerCase()}`}>
            <MedicineBoxOutlined style={{ color: "#dc2626" }} />
          </Tooltip>
        )}

        <Tooltip title={field.enabled ? `Shown to ${a.people.toLowerCase()} — click to hide this question` : `Hidden from ${a.people.toLowerCase()} — click to show`}>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => set("enabled", !field.enabled)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              border: `1px solid ${field.enabled ? "#bbf7d0" : "#e2e8f0"}`,
              background: field.enabled ? "#f0fdf4" : "#f8fafc",
              color: field.enabled ? "#16a34a" : "#94a3b8",
              borderRadius: 999,
              padding: "3px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: readOnly ? "default" : "pointer",
              flexShrink: 0,
            }}
          >
            {field.enabled ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            <span className="cf-hide-sm">{field.enabled ? "Shown" : "Hidden"}</span>
          </button>
        </Tooltip>

        {!readOnly && (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "up", icon: <ArrowUpOutlined />, label: "Move up", disabled: isFirst },
                { key: "down", icon: <ArrowDownOutlined />, label: "Move down", disabled: isLast },
                { key: "dup", icon: <CopyOutlined />, label: "Duplicate" },
                ...(convertTo.length
                  ? [
                      {
                        key: "convert",
                        label: "Change type",
                        children: convertTo.map((t) => ({
                          key: `to:${t}`,
                          icon: FIELD_TYPE_META[t].icon,
                          label: FIELD_TYPE_META[t].label,
                        })),
                      },
                    ]
                  : []),
                { type: "divider" as const },
                { key: "delete", icon: <DeleteOutlined />, label: "Delete question", danger: true },
              ],
              onClick: ({ key }) => {
                if (key === "up") onMove(-1);
                else if (key === "down") onMove(1);
                else if (key === "dup") onDuplicate();
                else if (key === "delete") onDelete();
                else if (key.startsWith("to:")) set("type", key.slice(3) as FieldType);
              },
            }}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </div>

      {/* ── Details ──────────────────────────────────────────────────── */}
      {open && (
        <div style={{ padding: "4px 14px 14px 44px", display: "flex", flexDirection: "column", gap: 12 }}>
          {field.type !== "info" && (
            <div>
              <Label>Help text under the question</Label>
              <Input
                value={field.help_text}
                disabled={readOnly}
                onChange={(e) => set("help_text", e.target.value)}
                placeholder="Optional"
                size="small"
              />
            </div>
          )}

          {isChoice && (
            <div>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 6, gap: 8 }}>
                <Label>Options</Label>
                {!readOnly && field.options.length > 1 && (
                  <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => set("options", field.options.map((o) => ({ ...o, enabled: true })))}
                    >
                      Show all
                    </Button>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => set("options", field.options.map((o) => ({ ...o, enabled: false })))}
                    >
                      Hide all
                    </Button>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {field.options.map((o, i) => (
                  <OptionRow
                    key={o.key}
                    option={o}
                    readOnly={readOnly}
                    onChange={(next) => set("options", field.options.map((x, j) => (j === i ? next : x)))}
                    onDelete={() => set("options", field.options.filter((_, j) => j !== i))}
                  />
                ))}
              </div>
              {!readOnly && (
                <Button
                  size="small"
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => set("options", [...field.options, newOption(`Option ${field.options.length + 1}`)])}
                  style={{ marginTop: 8 }}
                >
                  Add option
                </Button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                <Switch size="small" checked={field.allow_other} disabled={readOnly} onChange={(v) => set("allow_other", v)} />
                <Text style={{ fontSize: 12.5 }}>Let {a.people.toLowerCase()} add “Other” with their own answer</Text>
              </div>
            </div>
          )}

          {field.type === "yes_no" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
              <div>
                <Label>Box shown when the {a.person.toLowerCase()} answers “Yes”</Label>
                <Input
                  size="small"
                  value={field.detail_label}
                  disabled={readOnly}
                  onChange={(e) => set("detail_label", e.target.value)}
                  placeholder="e.g. If yes, please explain (leave empty for none)"
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AlertToggle
                  active={field.alert_on_yes}
                  disabled={readOnly}
                  title={`Raise a ${a.alertNoun} when the answer is Yes`}
                  onClick={() => set("alert_on_yes", !field.alert_on_yes)}
                />
                <Text style={{ fontSize: 12 }}>Alert on “Yes”</Text>
              </div>
            </div>
          )}

          {field.type === "rating" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
              <div>
                <Label>From</Label>
                <InputNumber size="small" min={0} max={9} value={field.scale_min} disabled={readOnly} onChange={(v) => set("scale_min", v ?? 1)} style={{ width: "100%" }} />
              </div>
              <div>
                <Label>To</Label>
                <InputNumber size="small" min={field.scale_min + 1} max={10} value={field.scale_max} disabled={readOnly} onChange={(v) => set("scale_max", v ?? 5)} style={{ width: "100%" }} />
              </div>
              <div>
                <Label>Lowest means</Label>
                <Input size="small" value={field.scale_min_label} disabled={readOnly} onChange={(e) => set("scale_min_label", e.target.value)} placeholder="Bad" />
              </div>
              <div>
                <Label>Highest means</Label>
                <Input size="small" value={field.scale_max_label} disabled={readOnly} onChange={(e) => set("scale_max_label", e.target.value)} placeholder="Excellent" />
              </div>
            </div>
          )}

          {field.type === "consent" && (
            <div>
              <Label>Statement the {a.person.toLowerCase()} ticks</Label>
              <Input.TextArea
                value={field.label}
                disabled={readOnly}
                onChange={(e) => set("label", e.target.value)}
                autoSize={{ minRows: 2, maxRows: 8 }}
              />
            </div>
          )}

          {field.type === "info" && (
            <div>
              <Label>Text the {a.person.toLowerCase()} reads (one paragraph or bullet per line)</Label>
              <Input.TextArea
                value={field.content.join("\n")}
                disabled={readOnly}
                onChange={(e) => set("content", e.target.value.split("\n"))}
                autoSize={{ minRows: 3, maxRows: 14 }}
              />
            </div>
          )}

          {(field.type === "consent" || field.type === "info") && (
            <Text style={{ fontSize: 11.5, color: "#7c3aed", background: "#f5f3ff", borderRadius: 6, padding: "4px 8px" }}>
              Type <code>____</code> where the {a.person.toLowerCase()} writes something in, e.g. “I, ____, consent to…”. A blank right
              after “I,” is filled with the {a.person.toLowerCase()}'s name automatically.
            </Text>
          )}

          {(field.type === "signature" || field.type === "initials") && (
            <div style={{ maxWidth: 240 }}>
              <Label>Who signs here</Label>
              <Select<SignerRole>
                size="small"
                value={field.signer_role}
                disabled={readOnly}
                onChange={(v) => set("signer_role", v)}
                options={(["client", "therapist", "witness"] as SignerRole[]).map((value) => ({ value, label: a.signerLabels[value] }))}
                style={{ width: "100%" }}
              />
            </div>
          )}

          {ANSWER_TYPES.includes(field.type) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div>
                <Label>Fill in automatically from</Label>
                <Select
                  size="small"
                  value={field.prefill_from}
                  disabled={readOnly}
                  onChange={(v) => set("prefill_from", v)}
                  options={a.prefillOptions}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <Label>Width</Label>
                <Select
                  size="small"
                  value={field.width}
                  disabled={readOnly}
                  onChange={(v) => set("width", v)}
                  options={[
                    { value: "full", label: "Full row" },
                    { value: "half", label: "Half row (pairs with the next)" },
                  ]}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          )}

          {field.type !== "info" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Switch size="small" checked={field.required} disabled={readOnly} onChange={(v) => set("required", v)} />
              <Text style={{ fontSize: 12.5 }}>Client must answer this</Text>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FieldEditor;
