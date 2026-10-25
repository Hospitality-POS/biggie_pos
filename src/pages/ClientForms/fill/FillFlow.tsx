import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Progress, Typography, message } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleFilled, CloudSyncOutlined, LockOutlined } from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";
import FormRenderer, { type Answers, type AnswerValue } from "../components/FormRenderer";
import SignaturePad, { type SignaturePadHandle } from "./SignaturePad";
import { findUnanswered, progressPercent, SubmitError } from "./utils";
import type { FormSection, FormSigner } from "../types";
import type { SignatureInput } from "./types";

const { Text, Title } = Typography;
const C = THEME_C;

const AUTOSAVE_MS = 1500;

interface Props {
  businessName: string;
  formName: string;
  description?: string;
  clientName: string;
  sections: FormSection[];
  signers: FormSigner[];
  declaration?: string;
  initialAnswers: Answers;
  onAutosave: (answers: Answers) => Promise<void>;
  /** Throw SubmitError for problems the client can fix */
  onSubmit: (answers: Answers, signature: SignatureInput) => Promise<void>;
  /** Shown once the form is signed */
  renderDone: () => React.ReactNode;
  /** Small print under the header, e.g. link expiry */
  note?: React.ReactNode;
  /** Extra control in the header (e.g. "Exit" for staff on the tablet) */
  headerExtra?: React.ReactNode;
}

const FillFlow: React.FC<Props> = ({
  businessName,
  formName,
  description,
  clientName,
  sections,
  signers,
  declaration,
  initialAnswers,
  onAutosave,
  onSubmit,
  renderDone,
  note,
  headerExtra,
}) => {
  const [step, setStep] = useState<"fill" | "sign" | "done">("fill");
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [signerName, setSignerName] = useState(clientName);
  const [canSign, setCanSign] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pad = useRef<SignaturePadHandle>(null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const answersRef = useRef(answers);

  const save = useCallback(async () => {
    if (!dirty.current) return;
    dirty.current = false;
    setSaving("saving");
    try {
      await onAutosave(answersRef.current);
      setSaving("saved");
    } catch {
      // Progress saving is best-effort; the final submit sends everything
      dirty.current = true;
      setSaving("idle");
    }
  }, [onAutosave]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onAnswer = (key: string, value: AnswerValue) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      answersRef.current = next;
      return next;
    });
    if (invalid.has(key)) {
      setInvalid((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
    dirty.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), AUTOSAVE_MS);
  };

  const scrollToField = (key: string) =>
    document.getElementById(`field-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

  const goToSign = () => {
    const missing = findUnanswered(sections, answers);
    if (missing.length) {
      setInvalid(new Set(missing));
      message.warning(`Please answer ${missing.length} more question${missing.length === 1 ? "" : "s"}`);
      scrollToField(missing[0]);
      return;
    }
    clearTimeout(timer.current);
    void save();
    setStep("sign");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    const signature = pad.current?.value();
    if (!signature) {
      message.warning(signerName.trim() ? "Please sign in the box" : "Please enter your full name");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(answersRef.current, signature);
      setStep("done");
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (err instanceof SubmitError) {
        if (err.message) message.error(err.message);
        if (err.missing.length) setStep("fill");
      } else {
        message.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const pct = progressPercent(sections, answers);
  const staffSigners = signers.filter((s) => s.role !== "client" && s.required);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #faf5ff 0%, #f8fafc 240px)" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #eef2f7",
        }}
      >
        <div style={{ maxWidth: 780, margin: "0 auto", padding: "12px 16px 10px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1, color: "#a855f7", textTransform: "uppercase", display: "block" }}>
              {businessName}
            </Text>
            <Text strong style={{ fontSize: 16, color: "#0f172a", display: "block" }} ellipsis>
              {formName}
            </Text>
          </div>
          {step === "fill" && (
            <span style={{ fontSize: 12, color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
              {saving === "saving" ? <><CloudSyncOutlined spin /> Saving</> : saving === "saved" ? <><CheckCircleFilled style={{ color: "#10b981" }} /> Saved</> : null}
            </span>
          )}
          {headerExtra}
        </div>
        {step !== "done" && (
          <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 16px 8px" }}>
            <Progress
              percent={step === "sign" ? 100 : pct}
              showInfo={false}
              size="small"
              strokeColor={{ from: "#ec4899", to: "#8b5cf6" }}
            />
          </div>
        )}
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "18px 16px 120px" }}>
        {step === "fill" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0 }}>
                {clientName ? `Hi ${clientName.split(" ")[0]},` : "Welcome,"}
              </Title>
              <Text style={{ color: C.subText, fontSize: 14.5 }}>
                {description || "Please answer the questions below, then sign at the end."}
              </Text>
              {note && <div style={{ marginTop: 8 }}>{note}</div>}
            </div>
            <FormRenderer
              name={formName}
              sections={sections}
              signers={signers}
              answers={answers}
              onAnswer={onAnswer}
              invalidKeys={invalid}
              large
              hideSignatures
              hideHeader
            />
          </>
        )}

        {step === "sign" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
            <Title level={4} style={{ marginTop: 0 }}>Review &amp; sign</Title>
            {declaration && (
              <div style={{ background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
                <Text style={{ fontSize: 14.5, lineHeight: 1.6, color: "#334155" }}>{declaration}</Text>
              </div>
            )}
            <SignaturePad
              ref={pad}
              signerName={signerName}
              onSignerNameChange={setSignerName}
              onChange={setCanSign}
              nameLabel="Your full name"
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, color: "#64748b", fontSize: 12.5 }}>
              <LockOutlined />
              Your answers and signature are stored securely and only shared with {businessName || "the spa"}.
            </div>
            {staffSigners.length > 0 && (
              <Text style={{ fontSize: 12.5, color: "#94a3b8", display: "block", marginTop: 6 }}>
                Your {staffSigners.map((s) => s.label.toLowerCase()).join(" and ")} will countersign afterwards.
              </Text>
            )}
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "48px 8px" }}>
            <style>{`@keyframes cfPop { 0% { transform: scale(.4); opacity: 0 } 70% { transform: scale(1.08) } 100% { transform: scale(1); opacity: 1 } }`}</style>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                margin: "0 auto 18px",
                background: "#ecfdf5",
                color: "#10b981",
                fontSize: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "cfPop .45s ease-out",
              }}
            >
              <CheckCircleFilled />
            </div>
            {renderDone()}
          </div>
        )}
      </div>

      {/* ── Bottom action bar ──────────────────────────────────────────── */}
      {step !== "done" && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(255,255,255,0.96)",
            borderTop: "1px solid #eef2f7",
            padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
            zIndex: 10,
          }}
        >
          <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", gap: 10 }}>
            {step === "sign" && (
              <Button size="large" icon={<ArrowLeftOutlined />} onClick={() => setStep("fill")}>
                Back
              </Button>
            )}
            {step === "fill" ? (
              <Button type="primary" size="large" block onClick={goToSign} style={{ height: 50, fontSize: 16, fontWeight: 600 }}>
                Continue to sign <ArrowRightOutlined />
              </Button>
            ) : (
              <Button
                type="primary"
                size="large"
                block
                loading={submitting}
                disabled={!canSign}
                onClick={submit}
                // The app's global button colours hide antd's disabled look
                style={{ height: 50, fontSize: 16, fontWeight: 600, opacity: canSign ? 1 : 0.45 }}
              >
                Sign &amp; submit
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FillFlow;
