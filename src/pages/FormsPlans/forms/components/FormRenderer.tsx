import React, { useRef, useState } from "react";
import { Input, DatePicker, InputNumber, Radio, Checkbox, Typography, Modal } from "antd";
import { EditOutlined, CheckCircleFilled } from "@ant-design/icons";
import dayjs from "dayjs";
import { THEME_C } from "@utils/getPrimaryColor";
import SignaturePad, { type SignaturePadHandle } from "../fill/SignaturePad";
import { BLANK_RE, blankKey, countBlanks } from "../fill/utils";
import type { FormField, FormSection, FormSigner } from "../types";
import { useAudience } from "../../audience";

const { Text, Title } = Typography;
const C = THEME_C;

export type AnswerValue = string | number | boolean | string[] | null | undefined;
export type Answers = Record<string, AnswerValue>;

const OTHER = "__other";

// Areas a client can tap on a "mark areas of discomfort" question
const BODY_AREAS = [
  "Head", "Neck", "Shoulders", "Upper back", "Lower back", "Chest", "Arms", "Hands", "Hips",
  "Thighs", "Knees", "Calves", "Ankles", "Heels", "Arches", "Toes", "Left foot", "Right foot",
];

interface Props {
  name: string;
  description?: string;
  sections: FormSection[];
  signers: FormSigner[];
  declaration?: string;
  /** Controlled answers (filling). Without them the preview keeps its own. */
  answers?: Answers;
  onAnswer?: (key: string, value: AnswerValue) => void;
  /** Field keys to flag as "please answer" */
  invalidKeys?: Set<string>;
  compact?: boolean;
  /** Bigger touch targets for tablets and phones */
  large?: boolean;
  /** The fill screens collect the final signatures themselves */
  hideSignatures?: boolean;
  /** Hide the gradient title header (the fill screens show their own) */
  hideHeader?: boolean;
}

const QuestionLabel: React.FC<{ field: FormField; large?: boolean }> = ({ field, large }) => (
  <div style={{ marginBottom: 8 }}>
    <Text style={{ fontSize: large ? 15.5 : 13.5, fontWeight: 500, color: "#0f172a", lineHeight: 1.45 }}>
      {field.label}
      {field.required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
    </Text>
    {field.help_text && (
      <Text style={{ fontSize: large ? 13 : 12, color: C.subText, display: "block", marginTop: 2 }}>{field.help_text}</Text>
    )}
  </div>
);

/**
 * Text with fill-in blanks: "I, ________, voluntarily consent…" renders an
 * inline box where the underscores are. `start` numbers the blanks across
 * several lines of the same field.
 */
const BlankText: React.FC<{
  text: string;
  fieldKey: string;
  start: number;
  values: Answers;
  onChange: (key: string, v: AnswerValue) => void;
  large?: boolean;
}> = ({ text, fieldKey, start, values, onChange, large }) => {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let n = start;
  for (const m of text.matchAll(BLANK_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));
    const key = blankKey(fieldKey, n);
    const width = Math.max(130, Math.min(280, m[0].length * 9));
    parts.push(
      <input
        key={key}
        value={(values[key] as string) ?? ""}
        onChange={(e) => onChange(key, e.target.value)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Fill in"
        placeholder="type here"
        maxLength={200}
        style={{
          width,
          maxWidth: "100%",
          border: "none",
          borderBottom: `1.5px solid ${values[key] ? "#94a3b8" : "#c4b5fd"}`,
          background: values[key] ? "transparent" : "#faf5ff",
          borderRadius: 0,
          padding: "0 4px",
          margin: "0 3px",
          font: "inherit",
          fontSize: large ? 15 : 13.5,
          fontWeight: 600,
          color: "#0f172a",
          outline: "none",
        }}
      />
    );
    n += 1;
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
};

const SignatureBox: React.FC<{ label: string; signed?: boolean; onClick?: () => void }> = ({ label, signed, onClick }) => (
  <div style={{ flex: "1 1 200px" }}>
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && e.key === "Enter" && onClick()}
      style={{
        height: 76,
        border: `1.5px ${signed ? "solid #86efac" : "dashed #cbd5e1"}`,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        color: signed ? "#16a34a" : "#94a3b8",
        fontSize: 13,
        background: signed ? "#f0fdf4" : "#fafbfc",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {signed ? <><CheckCircleFilled /> Signed — tap to redo</> : <><EditOutlined /> Tap to sign</>}
    </div>
    <Text style={{ fontSize: 12, color: C.subText, display: "block", marginTop: 4 }}>{label}</Text>
  </div>
);

/** Signature asked for inside the form (not the final sign-off). */
const InlineSignature: React.FC<{ field: FormField; value: AnswerValue; onChange: (v: AnswerValue) => void; interactive: boolean }> = ({
  field,
  value,
  onChange,
  interactive,
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const pad = useRef<SignaturePadHandle>(null);
  const { signerLabels } = useAudience();
  const who = signerLabels[field.signer_role] ?? signerLabels.client;
  return (
    <>
      <SignatureBox label={who} signed={!!value} onClick={interactive ? () => setOpen(true) : undefined} />
      <Modal
        open={open}
        title={field.label}
        okText="Use signature"
        onCancel={() => setOpen(false)}
        onOk={() => {
          const sig = pad.current?.value();
          if (sig?.method === "draw" && sig.data) {
            onChange(sig.data);
            setOpen(false);
          }
        }}
        destroyOnHidden
      >
        <SignaturePad ref={pad} signerName={name} onSignerNameChange={setName} nameLabel={`${who}'s name`} />
      </Modal>
    </>
  );
};

const FieldInput: React.FC<{
  field: FormField;
  value: AnswerValue;
  answers: Answers;
  onChange: (key: string, v: AnswerValue) => void;
  large?: boolean;
  interactive: boolean;
}> = ({ field, value, answers, onChange, large, interactive }) => {
  const options = field.options.filter((o) => o.enabled);
  const size = large ? "large" : "middle";
  const set = (v: AnswerValue) => onChange(field.key, v);

  const otherBox = (picked: boolean) =>
    picked ? (
      <Input
        size={size}
        placeholder="Please specify"
        value={(answers[`${field.key}__other`] as string) ?? ""}
        onChange={(e) => onChange(`${field.key}__other`, e.target.value)}
        style={{ marginTop: 8, maxWidth: 420 }}
      />
    ) : null;

  switch (field.type) {
    case "short_text":
      return <Input size={size} value={(value as string) ?? ""} onChange={(e) => set(e.target.value)} />;
    case "phone":
      return <Input size={size} type="tel" inputMode="tel" value={(value as string) ?? ""} onChange={(e) => set(e.target.value)} placeholder="07…" />;
    case "email":
      return <Input size={size} type="email" inputMode="email" value={(value as string) ?? ""} onChange={(e) => set(e.target.value)} placeholder="name@example.com" />;
    case "long_text":
      return <Input.TextArea autoSize={{ minRows: 2, maxRows: 8 }} value={(value as string) ?? ""} onChange={(e) => set(e.target.value)} style={large ? { fontSize: 16 } : undefined} />;
    case "number":
      return <InputNumber size={size} inputMode="numeric" value={value as number} onChange={(v) => set(v)} style={{ width: 180 }} />;
    case "date":
      return (
        <DatePicker
          size={size}
          style={{ width: 220 }}
          value={typeof value === "string" && value ? dayjs(value) : null}
          onChange={(d) => set(d ? d.format("YYYY-MM-DD") : null)}
          format="D MMM YYYY"
          inputReadOnly={large}
        />
      );
    case "yes_no":
      return (
        <Radio.Group value={value} onChange={(e) => set(e.target.value)} optionType="button" buttonStyle="solid" size={size}>
          <Radio.Button value="yes" style={{ minWidth: 76, textAlign: "center" }}>Yes</Radio.Button>
          <Radio.Button value="no" style={{ minWidth: 76, textAlign: "center" }}>No</Radio.Button>
        </Radio.Group>
      );
    case "single_choice":
      return (
        <div>
          <Radio.Group
            value={value}
            onChange={(e) => set(e.target.value)}
            style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${large ? 200 : 170}px, 1fr))`, gap: large ? "10px 16px" : "6px 18px" }}
          >
            {options.map((o) => (
              <Radio key={o.key} value={o.key} style={large ? { fontSize: 15 } : undefined}>
                {o.label}
              </Radio>
            ))}
            {field.allow_other && <Radio value={OTHER} style={large ? { fontSize: 15 } : undefined}>Other</Radio>}
          </Radio.Group>
          {otherBox(value === OTHER)}
        </div>
      );
    case "multi_choice": {
      const picked = (value as string[]) ?? [];
      return (
        <div>
          <Checkbox.Group
            value={picked}
            onChange={(v) => set(v as string[])}
            style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${large ? 200 : 170}px, 1fr))`, gap: large ? "10px 16px" : "6px 14px" }}
          >
            {options.map((o) => (
              <Checkbox key={o.key} value={o.key} style={large ? { fontSize: 15 } : undefined}>
                {o.label}
              </Checkbox>
            ))}
            {field.allow_other && <Checkbox value={OTHER} style={large ? { fontSize: 15 } : undefined}>Other</Checkbox>}
          </Checkbox.Group>
          {otherBox(picked.includes(OTHER))}
        </div>
      );
    }
    case "rating": {
      const nums = Array.from({ length: field.scale_max - field.scale_min + 1 }, (_, i) => field.scale_min + i);
      const box = large ? 46 : 38;
      return (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {nums.map((n) => {
              const active = value === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => set(n)}
                  aria-pressed={active}
                  style={{
                    width: box,
                    height: box,
                    borderRadius: 10,
                    border: `1.5px solid ${active ? C.primary : "#e2e8f0"}`,
                    background: active ? C.primary : "#fff",
                    color: active ? "#fff" : "#334155",
                    fontWeight: 600,
                    fontSize: large ? 16 : 14,
                    cursor: "pointer",
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {(field.scale_min_label || field.scale_max_label) && (
            <div style={{ display: "flex", justifyContent: "space-between", maxWidth: nums.length * (box + 6), fontSize: 11.5, color: "#94a3b8", marginTop: 4 }}>
              <span>{field.scale_min_label}</span>
              <span>{field.scale_max_label}</span>
            </div>
          )}
        </div>
      );
    }
    case "initials":
      return (
        <Input
          size={size}
          value={(value as string) ?? ""}
          onChange={(e) => set(e.target.value.toUpperCase())}
          maxLength={8}
          style={{ width: 120, textAlign: "center", fontWeight: 600, letterSpacing: 2 }}
          placeholder="A.B."
        />
      );
    case "signature":
      return <InlineSignature field={field} value={value} onChange={set} interactive={interactive} />;
    case "body_map": {
      const picked = (value as string[]) ?? [];
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {BODY_AREAS.map((area) => {
            const on = picked.includes(area);
            return (
              <button
                key={area}
                type="button"
                aria-pressed={on}
                onClick={() => set(on ? picked.filter((a) => a !== area) : [...picked, area])}
                style={{
                  padding: large ? "9px 14px" : "6px 12px",
                  borderRadius: 999,
                  border: `1.5px solid ${on ? "#ef4444" : "#e2e8f0"}`,
                  background: on ? "#fef2f2" : "#fff",
                  color: on ? "#b91c1c" : "#334155",
                  fontSize: large ? 14.5 : 13,
                  fontWeight: on ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                {area}
              </button>
            );
          })}
        </div>
      );
    }
    default:
      return null;
  }
};

const FormRenderer: React.FC<Props> = ({
  name,
  description,
  sections,
  signers,
  declaration,
  answers,
  onAnswer,
  invalidKeys,
  compact,
  large,
  hideSignatures,
  hideHeader,
}) => {
  const [localAnswers, setLocalAnswers] = useState<Answers>({});
  const values = answers ?? localAnswers;
  const interactive = !!onAnswer;
  const setValue = (key: string, v: AnswerValue) => {
    if (onAnswer) onAnswer(key, v);
    else setLocalAnswers((prev) => ({ ...prev, [key]: v }));
  };

  const visible = sections
    .filter((s) => s.enabled)
    .map((s) => ({ ...s, fields: s.fields.filter((f) => f.enabled) }))
    .filter((s) => s.fields.length > 0 || s.description);

  const pad = compact ? 16 : large ? 24 : 28;

  const invalidStyle = (key: string): React.CSSProperties =>
    invalidKeys?.has(key)
      ? { outline: "2px solid #fca5a5", outlineOffset: 6, borderRadius: 6, background: "#fff7f7" }
      : {};

  return (
    <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(15,23,42,0.06)", overflow: "hidden" }}>
      {!hideHeader && (
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
      )}

      <div style={{ padding: pad, display: "flex", flexDirection: "column", gap: compact ? 20 : 30 }}>
        {visible.length === 0 && (
          <Text style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>Nothing is shown on this form yet.</Text>
        )}

        {visible.map((s) => (
          <section key={s.key}>
            {s.title && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Text style={{ fontSize: large ? 12.5 : 11.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.primary }}>
                  {s.title}
                </Text>
                <div style={{ flex: 1, height: 1, background: "#eef2f7" }} />
              </div>
            )}
            {s.description && (
              <Text style={{ fontSize: 13, color: C.subText, display: "block", marginBottom: 12 }}>{s.description}</Text>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: large ? "22px 20px" : "16px 20px" }}>
              {s.fields.map((f) => {
                const width = f.width === "half" ? "calc(50% - 10px)" : "100%";
                if (f.type === "info") {
                  return (
                    <div
                      key={f.key}
                      style={{ flex: "1 1 100%", background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #eef2f7" }}
                    >
                      {f.label && f.label !== "Information" && (
                        <Text strong style={{ fontSize: large ? 14 : 13, display: "block", marginBottom: 6 }}>{f.label}</Text>
                      )}
                      <ul style={{ margin: 0, paddingLeft: f.content.length > 1 ? 18 : 0, listStyle: f.content.length > 1 ? "disc" : "none" }}>
                        {(() => {
                          // Blanks are numbered across all lines (same as the API)
                          let offset = 0;
                          return f.content.map((line, i) => {
                            const start = offset;
                            offset += countBlanks(line);
                            return line ? (
                              <li key={i} style={{ fontSize: large ? 14 : 12.5, color: "#334155", lineHeight: 1.9 }}>
                                <BlankText text={line} fieldKey={f.key} start={start} values={values} onChange={setValue} large={large} />
                              </li>
                            ) : null;
                          });
                        })()}
                      </ul>
                    </div>
                  );
                }
                if (f.type === "consent") {
                  return (
                    <div key={f.key} id={`field-${f.key}`} style={{ flex: "1 1 100%", ...invalidStyle(f.key) }}>
                      {/* Checkbox and statement are separate so typing in a blank doesn't tick the box */}
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <Checkbox
                          checked={values[f.key] === true}
                          onChange={(e) => setValue(f.key, e.target.checked)}
                          aria-label="I agree"
                          style={{ marginTop: large ? 5 : 3 }}
                        />
                        <span
                          onClick={() => setValue(f.key, values[f.key] !== true)}
                          style={{ fontSize: large ? 15 : 13.5, color: "#0f172a", lineHeight: 1.9, cursor: "pointer" }}
                        >
                          <BlankText text={f.label} fieldKey={f.key} start={0} values={values} onChange={setValue} large={large} />
                          {f.required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
                        </span>
                      </div>
                      {invalidKeys?.has(f.key) && (
                        <Text style={{ color: "#dc2626", fontSize: 12.5, display: "block", marginTop: 4, marginLeft: 26 }}>
                          {countBlanks(f.label) ? "Fill in the blank and tick to agree" : "Tick to agree"}
                        </Text>
                      )}
                    </div>
                  );
                }
                return (
                  <div
                    key={f.key}
                    id={`field-${f.key}`}
                    style={{
                      flex: `1 1 ${width}`,
                      minWidth: f.width === "half" ? 220 : undefined,
                      maxWidth: width === "100%" ? "100%" : undefined,
                      ...invalidStyle(f.key),
                    }}
                  >
                    <QuestionLabel field={f} large={large} />
                    <FieldInput field={f} value={values[f.key]} answers={values} onChange={setValue} large={large} interactive={interactive || !answers} />
                    {f.type === "yes_no" && values[f.key] === "yes" && f.detail_label && (
                      <Input.TextArea
                        autoSize={{ minRows: 2 }}
                        placeholder={f.detail_label}
                        value={(values[`${f.key}__detail`] as string) ?? ""}
                        onChange={(e) => setValue(`${f.key}__detail`, e.target.value)}
                        style={{ marginTop: 10, ...(large ? { fontSize: 16 } : {}) }}
                      />
                    )}
                    {invalidKeys?.has(f.key) && (
                      <Text style={{ color: "#dc2626", fontSize: 12.5, display: "block", marginTop: 6 }}>Please answer this question</Text>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* ── Declaration & signatures (preview only) ───────────────── */}
        {!hideSignatures && (declaration || signers.length > 0) && (
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
