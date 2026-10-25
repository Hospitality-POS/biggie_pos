import React, { useState } from "react";
import { Input, DatePicker, InputNumber, Radio, Checkbox, Typography } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";
import type { FormField, FormSection, FormSigner } from "../types";

const { Text, Title } = Typography;
const C = THEME_C;

export type AnswerValue = string | number | boolean | string[] | null | undefined;
export type Answers = Record<string, AnswerValue>;

interface Props {
  name: string;
  description?: string;
  sections: FormSection[];
  signers: FormSigner[];
  declaration?: string;
  /** Controlled answers (Phase 2 fill-in). Preview keeps its own. */
  answers?: Answers;
  onAnswer?: (key: string, value: AnswerValue) => void;
  compact?: boolean;
}

const QuestionLabel: React.FC<{ field: FormField }> = ({ field }) => (
  <div style={{ marginBottom: 6 }}>
    <Text style={{ fontSize: 13.5, fontWeight: 500, color: "#0f172a" }}>
      {field.label}
      {field.required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
    </Text>
    {field.help_text && (
      <Text style={{ fontSize: 12, color: C.subText, display: "block", marginTop: 1 }}>{field.help_text}</Text>
    )}
  </div>
);

const SignatureBox: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ flex: "1 1 200px" }}>
    <div
      style={{
        height: 76,
        border: "1.5px dashed #cbd5e1",
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        color: "#94a3b8",
        fontSize: 12.5,
        background: "#fafbfc",
      }}
    >
      <EditOutlined /> Tap to sign
    </div>
    <Text style={{ fontSize: 12, color: C.subText, display: "block", marginTop: 4 }}>{label}</Text>
  </div>
);

const FieldInput: React.FC<{ field: FormField; value: AnswerValue; onChange: (v: AnswerValue) => void }> = ({
  field,
  value,
  onChange,
}) => {
  const options = field.options.filter((o) => o.enabled);

  switch (field.type) {
    case "short_text":
      return <Input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "phone":
      return <Input type="tel" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="07…" />;
    case "email":
      return <Input type="email" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="name@example.com" />;
    case "long_text":
      return <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return <InputNumber value={value as number} onChange={(v) => onChange(v)} style={{ width: 160 }} />;
    case "date":
      return <DatePicker style={{ width: 200 }} onChange={(d) => onChange(d ? d.format("YYYY-MM-DD") : null)} />;
    case "yes_no":
      return (
        <div>
          <Radio.Group value={value} onChange={(e) => onChange(e.target.value)} optionType="button" buttonStyle="solid">
            <Radio.Button value="yes">Yes</Radio.Button>
            <Radio.Button value="no">No</Radio.Button>
          </Radio.Group>
        </div>
      );
    case "single_choice":
      return (
        <Radio.Group value={value} onChange={(e) => onChange(e.target.value)} style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px" }}>
          {options.map((o) => (
            <Radio key={o.key} value={o.key}>
              {o.label}
            </Radio>
          ))}
          {field.allow_other && <Radio value="__other">Other</Radio>}
        </Radio.Group>
      );
    case "multi_choice":
      return (
        <Checkbox.Group
          value={(value as string[]) ?? []}
          onChange={(v) => onChange(v as string[])}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "6px 14px" }}
        >
          {options.map((o) => (
            <Checkbox key={o.key} value={o.key}>
              {o.label}
            </Checkbox>
          ))}
          {field.allow_other && <Checkbox value="__other">Other</Checkbox>}
        </Checkbox.Group>
      );
    case "rating": {
      const nums = Array.from({ length: field.scale_max - field.scale_min + 1 }, (_, i) => field.scale_min + i);
      return (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {nums.map((n) => {
              const active = value === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    border: `1.5px solid ${active ? C.primary : "#e2e8f0"}`,
                    background: active ? C.primary : "#fff",
                    color: active ? "#fff" : "#334155",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {(field.scale_min_label || field.scale_max_label) && (
            <div style={{ display: "flex", justifyContent: "space-between", maxWidth: nums.length * 44, fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>
              <span>{field.scale_min_label}</span>
              <span>{field.scale_max_label}</span>
            </div>
          )}
        </div>
      );
    }
    case "initials":
      return <Input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value.toUpperCase())} maxLength={5} style={{ width: 110, textAlign: "center", fontWeight: 600, letterSpacing: 2 }} placeholder="A.B." />;
    case "signature":
      return <SignatureBox label={field.signer_role === "therapist" ? "Therapist" : field.signer_role === "witness" ? "Witness" : "Client"} />;
    case "body_map":
      return (
        <div
          style={{
            height: 120,
            borderRadius: 10,
            border: "1.5px dashed #cbd5e1",
            background: "#fafbfc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            fontSize: 12.5,
          }}
        >
          Diagram — client taps the areas that hurt
        </div>
      );
    default:
      return null;
  }
};

const FormRenderer: React.FC<Props> = ({ name, description, sections, signers, declaration, answers, onAnswer, compact }) => {
  const [localAnswers, setLocalAnswers] = useState<Answers>({});
  const values = answers ?? localAnswers;
  const setValue = (key: string, v: AnswerValue) => {
    if (onAnswer) onAnswer(key, v);
    else setLocalAnswers((prev) => ({ ...prev, [key]: v }));
  };

  const visible = sections
    .filter((s) => s.enabled)
    .map((s) => ({ ...s, fields: s.fields.filter((f) => f.enabled) }))
    .filter((s) => s.fields.length > 0 || s.description);

  const pad = compact ? 16 : 28;

  return (
    <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(15,23,42,0.06)", overflow: "hidden" }}>
      <div
        style={{
          padding: `${pad}px ${pad}px ${pad - 6}px`,
          background: "linear-gradient(135deg, #fdf2f8 0%, #f5f3ff 55%, #eff6ff 100%)",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <Title level={compact ? 5 : 4} style={{ margin: 0, color: "#0f172a", letterSpacing: -0.2 }}>
          {name || "Untitled form"}
        </Title>
        {description && <Text style={{ color: C.subText, fontSize: 13 }}>{description}</Text>}
      </div>

      <div style={{ padding: pad, display: "flex", flexDirection: "column", gap: compact ? 20 : 28 }}>
        {visible.length === 0 && (
          <Text style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>Nothing is shown to clients yet.</Text>
        )}

        {visible.map((s) => (
          <section key={s.key}>
            {s.title && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Text style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.primary }}>
                  {s.title}
                </Text>
                <div style={{ flex: 1, height: 1, background: "#eef2f7" }} />
              </div>
            )}
            {s.description && (
              <Text style={{ fontSize: 13, color: C.subText, display: "block", marginBottom: 12 }}>{s.description}</Text>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 20px" }}>
              {s.fields.map((f) => {
                const width = f.width === "half" ? "calc(50% - 10px)" : "100%";
                if (f.type === "info") {
                  return (
                    <div
                      key={f.key}
                      style={{ flex: `1 1 100%`, background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #eef2f7" }}
                    >
                      {f.label && f.label !== "Information" && (
                        <Text strong style={{ fontSize: 13, display: "block", marginBottom: 6 }}>{f.label}</Text>
                      )}
                      <ul style={{ margin: 0, paddingLeft: f.content.length > 1 ? 18 : 0, listStyle: f.content.length > 1 ? "disc" : "none" }}>
                        {f.content.filter(Boolean).map((line, i) => (
                          <li key={i} style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.6 }}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  );
                }
                if (f.type === "consent") {
                  return (
                    <div key={f.key} style={{ flex: "1 1 100%" }}>
                      <Checkbox checked={values[f.key] === true} onChange={(e) => setValue(f.key, e.target.checked)}>
                        <span style={{ fontSize: 13.5, color: "#0f172a" }}>
                          {f.label}
                          {f.required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
                        </span>
                      </Checkbox>
                    </div>
                  );
                }
                return (
                  <div key={f.key} style={{ flex: `1 1 ${width}`, minWidth: f.width === "half" ? 200 : undefined, maxWidth: width === "100%" ? "100%" : undefined }}>
                    <QuestionLabel field={f} />
                    <FieldInput field={f} value={values[f.key]} onChange={(v) => setValue(f.key, v)} />
                    {f.type === "yes_no" && values[f.key] === "yes" && f.detail_label && (
                      <Input.TextArea
                        autoSize={{ minRows: 2 }}
                        placeholder={f.detail_label}
                        value={(values[`${f.key}__detail`] as string) ?? ""}
                        onChange={(e) => setValue(`${f.key}__detail`, e.target.value)}
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* ── Declaration & signatures ──────────────────────────────── */}
        {(declaration || signers.length > 0) && (
          <section style={{ borderTop: "1px solid #eef2f7", paddingTop: compact ? 16 : 22 }}>
            {declaration && (
              <Text style={{ fontSize: 13, color: "#334155", display: "block", marginBottom: 14, lineHeight: 1.6 }}>
                {declaration}
              </Text>
            )}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {signers.map((s) => (
                <SignatureBox key={s.role} label={`${s.label} signature${s.required ? "" : " (optional)"}`} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default FormRenderer;
