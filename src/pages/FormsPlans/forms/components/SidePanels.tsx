import React, { useEffect, useState } from "react";
import { Image, Typography, Timeline, Empty, Button, Progress } from "antd";
import {
  FilePdfOutlined,
  FileWordOutlined,
  LinkOutlined,
  CloudUploadOutlined,
  RobotOutlined,
  SendOutlined,
  CheckCircleOutlined,
  RollbackOutlined,
  InboxOutlined,
  BranchesOutlined,
  UndoOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { THEME_C } from "@utils/getPrimaryColor";
import type { ReviewEntry, SourceFile } from "../types";

const { Text, Title } = Typography;
const C = THEME_C;

const isImageFile = (f: SourceFile) => (f.file_type || "").startsWith("image/");
const isPdfFile = (f: SourceFile) => f.file_type === "application/pdf" || f.file_name?.toLowerCase().endsWith(".pdf");

// ─── Original upload ─────────────────────────────────────────────────────────

export const SourcePanel: React.FC<{ files: SourceFile[] }> = ({ files }) => {
  if (files.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="This form was started blank" />;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Text style={{ fontSize: 12.5, color: C.subText }}>
        Compare against the paper form you uploaded. Click a photo to zoom.
      </Text>
      <Image.PreviewGroup>
        {files.map((f, i) => (
          <div key={f.file_url} style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid #f1f5f9" }}>
              {isPdfFile(f) ? (
                <FilePdfOutlined style={{ color: "#ef4444" }} />
              ) : isImageFile(f) ? (
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Page {i + 1}</span>
              ) : (
                <FileWordOutlined style={{ color: "#2563eb" }} />
              )}
              <Text style={{ fontSize: 12.5, flex: 1 }} ellipsis={{ tooltip: f.file_name }}>
                {f.file_name}
              </Text>
              <a href={f.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                <LinkOutlined /> Open
              </a>
            </div>
            {isImageFile(f) ? (
              <Image src={f.file_url} alt={f.file_name} style={{ width: "100%", display: "block" }} />
            ) : isPdfFile(f) ? (
              <iframe title={f.file_name} src={f.file_url} style={{ width: "100%", height: 520, border: "none", display: "block" }} />
            ) : (
              <div style={{ padding: 16, fontSize: 12.5, color: C.subText }}>
                Word files can’t be previewed here — use Open to download it.
              </div>
            )}
          </div>
        ))}
      </Image.PreviewGroup>
    </div>
  );
};

// ─── History ─────────────────────────────────────────────────────────────────

const HISTORY_META: Record<ReviewEntry["action"], { label: string; icon: React.ReactNode; color: string }> = {
  created: { label: "Created", icon: <CloudUploadOutlined />, color: "#64748b" },
  extracted: { label: "Read by AI", icon: <RobotOutlined />, color: "#8b5cf6" },
  submitted: { label: "Sent for approval", icon: <SendOutlined />, color: "#d97706" },
  withdrawn: { label: "Withdrawn for changes", icon: <UndoOutlined />, color: "#64748b" },
  approved: { label: "Approved", icon: <CheckCircleOutlined />, color: "#059669" },
  rejected: { label: "Sent back for changes", icon: <RollbackOutlined />, color: "#dc2626" },
  archived: { label: "Archived", icon: <InboxOutlined />, color: "#94a3b8" },
  new_version: { label: "New version started", icon: <BranchesOutlined />, color: "#0ea5e9" },
  restored: { label: "Restored", icon: <UndoOutlined />, color: "#059669" },
};

export const HistoryPanel: React.FC<{ history: ReviewEntry[] }> = ({ history }) => {
  if (history.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activity yet" />;
  return (
    <Timeline
      style={{ marginTop: 8 }}
      items={[...history].reverse().map((h) => {
        const meta = HISTORY_META[h.action] ?? HISTORY_META.created;
        return {
          dot: <span style={{ color: meta.color, fontSize: 14 }}>{meta.icon}</span>,
          children: (
            <div>
              <Text strong style={{ fontSize: 13 }}>{meta.label}</Text>
              <Text style={{ fontSize: 12, color: "#94a3b8", display: "block" }}>
                {h.by_name ? `${h.by_name} · ` : ""}
                {dayjs(h.at).format("D MMM YYYY, HH:mm")}
              </Text>
              {h.notes && (
                <div style={{ marginTop: 4, fontSize: 12.5, color: "#334155", background: "#f8fafc", borderRadius: 8, padding: "6px 10px" }}>
                  {h.notes}
                </div>
              )}
            </div>
          ),
        };
      })}
    />
  );
};

// ─── AI reading state ────────────────────────────────────────────────────────

const STEPS = ["Reading the pages", "Finding sections and questions", "Spotting crossed-out items", "Building your draft"];

export const ExtractingState: React.FC<{ startedAt?: string | null; fileCount: number }> = ({ startedAt, fileCount }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = startedAt ? Math.max(0, (now - new Date(startedAt).getTime()) / 1000) : 0;
  // Typical read takes 15–45 s; ease towards 95 % so the bar never stalls at 100
  const pct = Math.min(95, Math.round(100 * (1 - Math.exp(-elapsed / 22))));
  const step = Math.min(STEPS.length - 1, Math.floor(pct / 25));

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", textAlign: "center", padding: "0 16px" }}>
      <style>{`@keyframes cfPulse { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.08); opacity: .85 } }`}</style>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          margin: "0 auto 16px",
          background: "linear-gradient(135deg, #fdf2f8 0%, #ede9fe 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          color: "#8b5cf6",
          animation: "cfPulse 1.8s ease-in-out infinite",
        }}
      >
        <RobotOutlined />
      </div>
      <Title level={4} style={{ marginBottom: 4 }}>Reading your form…</Title>
      <Text style={{ color: C.subText }}>
        The AI is going through {fileCount > 1 ? `${fileCount} pages` : "the document"}. This usually takes under a minute —
        you can leave this page and come back.
      </Text>
      <Progress percent={pct} showInfo={false} strokeColor={{ from: "#ec4899", to: "#8b5cf6" }} style={{ margin: "22px 0 14px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", maxWidth: 320, margin: "0 auto" }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: i <= step ? "#0f172a" : "#cbd5e1" }}>
            {i < step ? (
              <CheckCircleOutlined style={{ color: "#10b981" }} />
            ) : (
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  border: `2px solid ${i === step ? "#8b5cf6" : "#e2e8f0"}`,
                  display: "inline-block",
                }}
              />
            )}
            {s}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ExtractionFailed: React.FC<{ error?: string; onRetry: () => void; retrying: boolean; canRetry: boolean }> = ({
  error,
  onRetry,
  retrying,
  canRetry,
}) => (
  <div
    style={{
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      padding: "14px 16px",
      borderRadius: 12,
      background: "#fef2f2",
      border: "1px solid #fecaca",
    }}
  >
    <ExclamationCircleOutlined style={{ color: "#dc2626", fontSize: 18, marginTop: 2 }} />
    <div style={{ flex: 1 }}>
      <Text strong style={{ color: "#991b1b", display: "block" }}>The AI couldn’t read this form</Text>
      <Text style={{ fontSize: 12.5, color: "#7f1d1d" }}>
        {error || "Something went wrong."} You can try again, or add the questions yourself below.
      </Text>
    </div>
    {canRetry && (
      <Button icon={<ReloadOutlined />} onClick={onRetry} loading={retrying}>
        Try again
      </Button>
    )}
  </div>
);
