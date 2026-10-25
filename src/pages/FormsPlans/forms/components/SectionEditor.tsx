import React, { useState } from "react";
import { Input, Switch, Button, Popover, Dropdown, Tooltip, Typography } from "antd";
import {
  PlusOutlined,
  MoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DeleteOutlined,
  DownOutlined,
  RightOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";
import { FIELD_GROUPS, FIELD_TYPE_META, newField } from "../constants";
import FieldEditor from "./FieldEditor";
import type { FieldType, FormField, FormSection } from "../types";

const { Text } = Typography;
const C = THEME_C;

interface Props {
  section: FormSection;
  number: number;
  /** Running question number before this section, for "3." style labels */
  fieldOffset: number;
  readOnly: boolean;
  isFirst: boolean;
  isLast: boolean;
  onChange: (section: FormSection) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}

export const AddFieldPicker: React.FC<{ onPick: (type: FieldType) => void; children: React.ReactNode }> = ({
  onPick,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const content = (
    <div style={{ width: 420, maxWidth: "80vw", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {FIELD_GROUPS.map((g) => (
        <div key={g.key}>
          <Text style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: "#94a3b8", textTransform: "uppercase" }}>
            {g.label}
          </Text>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
            {(Object.keys(FIELD_TYPE_META) as FieldType[])
              .filter((t) => FIELD_TYPE_META[t].group === g.key)
              .map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onPick(t);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    border: "none",
                    borderRadius: 8,
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ color: FIELD_TYPE_META[t].color, fontSize: 15, display: "inline-flex" }}>
                    {FIELD_TYPE_META[t].icon}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{FIELD_TYPE_META[t].label}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{FIELD_TYPE_META[t].hint}</span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <Popover content={content} trigger="click" open={open} onOpenChange={setOpen} placement="bottomLeft">
      {children}
    </Popover>
  );
};

const SectionEditor: React.FC<Props> = ({
  section,
  number,
  fieldOffset,
  readOnly,
  isFirst,
  isLast,
  onChange,
  onDelete,
  onMove,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const set = <K extends keyof FormSection>(key: K, value: FormSection[K]) => onChange({ ...section, [key]: value });

  const setFields = (fields: FormField[]) => set("fields", fields);
  const shown = section.fields.filter((f) => f.enabled).length;

  const moveField = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= section.fields.length) return;
    const next = [...section.fields];
    [next[i], next[j]] = [next[j], next[i]];
    setFields(next);
  };

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        overflow: "hidden",
        opacity: section.enabled ? 1 : 0.85,
      }}
    >
      {/* ── Section header ───────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          background: section.enabled ? "linear-gradient(180deg, #fafbff 0%, #fff 100%)" : "#f8fafc",
          borderBottom: collapsed ? "none" : "1px solid #f1f5f9",
        }}
      >
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand section" : "Collapse section"}
          style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b", padding: 2, display: "flex" }}
        >
          {collapsed ? <RightOutlined /> : <DownOutlined />}
        </button>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: section.enabled ? C.primaryLight : "#e2e8f0",
            color: section.enabled ? C.primary : "#94a3b8",
            fontSize: 12.5,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {number}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input
            variant="borderless"
            value={section.title}
            disabled={readOnly}
            placeholder="Section title"
            onChange={(e) => set("title", e.target.value)}
            style={{
              padding: 0,
              fontSize: 15,
              fontWeight: 650,
              color: section.enabled ? "#0f172a" : "#94a3b8",
              textDecoration: section.enabled ? "none" : "line-through",
            }}
          />
          <Text style={{ fontSize: 11.5, color: "#94a3b8" }}>
            {shown} of {section.fields.length} question{section.fields.length === 1 ? "" : "s"} shown
          </Text>
        </div>

        <Tooltip title={section.enabled ? "Hide the whole section" : "Show this section again"}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {!section.enabled && <EyeInvisibleOutlined style={{ color: "#94a3b8" }} />}
            <Switch
              size="small"
              checked={section.enabled}
              disabled={readOnly}
              onChange={(v) => set("enabled", v)}
            />
          </div>
        </Tooltip>

        {!readOnly && (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "up", icon: <ArrowUpOutlined />, label: "Move section up", disabled: isFirst },
                { key: "down", icon: <ArrowDownOutlined />, label: "Move section down", disabled: isLast },
                { type: "divider" as const },
                { key: "delete", icon: <DeleteOutlined />, label: "Delete section", danger: true },
              ],
              onClick: ({ key }) => {
                if (key === "up") onMove(-1);
                else if (key === "down") onMove(1);
                else if (key === "delete") onDelete();
              },
            }}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </div>

      {/* ── Fields ───────────────────────────────────────────────────── */}
      {!collapsed && (
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {(section.description || !readOnly) && (
            <Input.TextArea
              variant="borderless"
              value={section.description}
              disabled={readOnly}
              placeholder="Section intro (optional)"
              onChange={(e) => set("description", e.target.value)}
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ fontSize: 12.5, color: C.subText, padding: "0 4px" }}
            />
          )}

          {section.fields.map((f, i) => (
            <FieldEditor
              key={f.key}
              field={f}
              index={fieldOffset + i + 1}
              readOnly={readOnly}
              isFirst={i === 0}
              isLast={i === section.fields.length - 1}
              sectionHidden={!section.enabled}
              onChange={(next) => setFields(section.fields.map((x, j) => (j === i ? next : x)))}
              onDelete={() => setFields(section.fields.filter((_, j) => j !== i))}
              onDuplicate={() => {
                const copy = { ...f, key: newField(f.type).key, label: `${f.label} (copy)`, options: f.options.map((o) => ({ ...o })) };
                const next = [...section.fields];
                next.splice(i + 1, 0, copy);
                setFields(next);
              }}
              onMove={(dir) => moveField(i, dir)}
            />
          ))}

          {section.fields.length === 0 && (
            <Text style={{ fontSize: 12.5, color: "#94a3b8", padding: "6px 4px" }}>No questions in this section yet.</Text>
          )}

          {!readOnly && (
            <AddFieldPicker onPick={(type) => setFields([...section.fields, newField(type)])}>
              <Button type="dashed" icon={<PlusOutlined />} style={{ alignSelf: "flex-start", marginTop: 2 }}>
                Add question
              </Button>
            </AddFieldPicker>
          )}
        </div>
      )}
    </div>
  );
};

export default SectionEditor;
