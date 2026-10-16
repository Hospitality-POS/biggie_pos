import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Skeleton, Tooltip, Typography } from "antd";
import {
  BulbOutlined,
  ClearOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  FieldTimeOutlined,
  MoonOutlined,
  ReloadOutlined,
  RiseOutlined,
  ShopOutlined,
  TeamOutlined,
  WarningFilled,
  WarningOutlined,
} from "@ant-design/icons";
import { ThinkingOrb } from "thinking-orbs";
import { THEME_C } from "@utils/getPrimaryColor";
import { askAuditAssistant, fetchAuditInsights, AuditInsightType, AuditRangeParams } from "@services/audit";
import { BiasharaDrawer } from "../BiasharaAI/components/BiasharaDrawer";
import { ChatInputBar } from "../BiasharaAI/components/ChatInputBar";
import { ChatMessageItem } from "../BiasharaAI/components/ChatMessageItem";
import { QuickPromptsGrid } from "../BiasharaAI/components/QuickPromptsGrid";
import { ThinkingLoadingBubble } from "../BiasharaAI/components/ThinkingLoadingBubble";
import { useIsMobile } from "../BiasharaAI/hooks/useIsMobile";
import { exportMessageToPdf } from "../BiasharaAI/services/biasharaAI.service";
import type { ChatMessage, QuickPrompt, ThinkingPhaseInfo } from "../BiasharaAI/types/biasharaAI.types";

dayjs.extend(relativeTime);

const { Text } = Typography;

const ASSISTANT_NAME = "Audit AI";
const C = { text: "#0f172a", sub: "#64748b", border: "#e2e8f0", ai: "#4f46e5" };

const INSIGHT_STYLES: Record<AuditInsightType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  risk: { label: "Worth reviewing", icon: <WarningFilled />, color: "#d03b3b", bg: "#fef2f2" },
  productivity: { label: "Productivity", icon: <RiseOutlined />, color: "#1d4ed8", bg: "#eff6ff" },
  pattern: { label: "Pattern", icon: <ClockCircleOutlined />, color: "#475569", bg: "#f1f5f9" },
  recommendation: { label: "Recommendation", icon: <BulbOutlined />, color: "#047857", bg: "#ecfdf5" },
};

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    icon: <FieldTimeOutlined />,
    title: "Time on Base",
    desc: "Who spent the most and the least time on Base, and how does each compare to their usual hours?",
    tag: "Staff",
  },
  {
    icon: <WarningOutlined />,
    title: "Risky actions",
    desc: "List every delete, void, refund, discount and price change by employee. Which ones should I review first?",
    tag: "Risk",
  },
  {
    icon: <ShopOutlined />,
    title: "Compare branches",
    desc: "Compare the branches by staff hours, number of changes and sensitive actions. Which branch stands out and why?",
    tag: "Branches",
  },
  {
    icon: <MoonOutlined />,
    title: "After hours",
    desc: "Was anyone active after hours? Who, when, and what did they do?",
    tag: "Risk",
  },
  {
    icon: <ClockCircleOutlined />,
    title: "Busiest times",
    desc: "When are we busiest, and do our staff hours match those peaks?",
    tag: "Pattern",
  },
  {
    icon: <TeamOutlined />,
    title: "Staff summary",
    desc: "Give me a short performance summary for each employee in a table.",
    tag: "Staff",
  },
];

/** Biashara-style "thinking" captions, worded for audit questions. */
const useAuditThinkingPhase = (loading: boolean) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return;
    }
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [loading]);

  const phase = useMemo<ThinkingPhaseInfo>(() => {
    if (elapsed < 3) return { state: "searching", title: "Reading the audit trail", desc: "Collecting activity, time on Base and branch figures…" };
    if (elapsed < 7) return { state: "connecting", title: "Comparing staff and branches", desc: "Looking for outliers, peaks and unusual actions…" };
    if (elapsed < 12) return { state: "solving", title: "Checking for risks", desc: "Reviewing deletes, voids, refunds and after-hours activity…" };
    return { state: "composing", title: "Writing it up", desc: "Putting the findings into plain language…" };
  }, [elapsed]);

  return { elapsed, phase };
};

// ── Insights block (top of the drawer) ──────────────────────────────────────

const InsightsBlock: React.FC<{
  params: AuditRangeParams;
  open: boolean;
  onAsk: (question: string) => void;
}> = ({ params, open, onAsk }) => {
  const [fresh, setFresh] = useState(false);
  // Only generated when the drawer is opened
  const query = useQuery({
    queryKey: ["audit-insights", params, fresh],
    queryFn: () => fetchAuditInsights({ ...params, fresh }),
    enabled: open,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  const error = query.error as any;

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #f5f7ff 0%, #ffffff 140px)",
        border: "1px solid #e0e7ff",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Text strong style={{ fontSize: 14, color: C.text, flex: 1 }}>
          AI insights
          {query.data?.generatedAt && (
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 400, marginLeft: 6 }}>
              · {dayjs(query.data.generatedAt).fromNow()}
            </Text>
          )}
        </Text>
        <Tooltip title="Generate again">
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            loading={query.isFetching}
            onClick={() => (fresh ? query.refetch() : setFresh(true))}
            aria-label="Generate again"
          />
        </Tooltip>
      </div>

      {query.isLoading || (query.isFetching && !query.data) ? (
        <div>
          <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
            Analysing your team's activity…
          </Text>
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        </div>
      ) : query.isError ? (
        <Alert
          type={error?.response?.status === 503 ? "info" : "warning"}
          showIcon
          message={error?.response?.status === 503 ? "AI is not set up on the server" : "Could not generate insights"}
          description={error?.response?.data?.error || error?.message}
        />
      ) : (
        <>
          {query.data?.headline && (
            <Text strong style={{ display: "block", color: C.text, marginBottom: 10, fontSize: 14, lineHeight: 1.45 }}>
              {query.data.headline}
            </Text>
          )}
          {query.data?.insights.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {query.data.insights.map((insight, i) => {
                const style = INSIGHT_STYLES[insight.type] || INSIGHT_STYLES.pattern;
                const question = `Tell me more about this finding: "${insight.title}" — ${insight.detail} Show the details behind it and what I should do.`;
                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    className="audit-insight"
                    onClick={() => onAsk(question)}
                    onKeyDown={(e) => e.key === "Enter" && onAsk(question)}
                    style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span
                        style={{
                          color: style.color,
                          background: style.bg,
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 999,
                          padding: "1px 8px",
                          display: "inline-flex",
                          gap: 4,
                          alignItems: "center",
                        }}
                      >
                        {style.icon} {style.label}
                      </span>
                      {insight.subject && (
                        <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                          {insight.subject}
                        </Text>
                      )}
                    </div>
                    <Text strong style={{ display: "block", color: C.text, fontSize: 13 }}>
                      {insight.title}
                    </Text>
                    <Text style={{ fontSize: 12.5, color: "#334155" }}>{insight.detail}</Text>
                    <Text style={{ display: "block", marginTop: 6, fontSize: 12, color: C.ai, fontWeight: 500 }}>
                      Ask about this →
                    </Text>
                  </div>
                );
              })}
            </div>
          ) : (
            <Text type="secondary">No notable findings for this period yet.</Text>
          )}
        </>
      )}
    </div>
  );
};

// ── Drawer ──────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  params: AuditRangeParams;
  periodLabel: string;
  branchLabel: string;
}

const AuditAiDrawer: React.FC<Props> = ({ open, onClose, params, periodLabel, branchLabel }) => {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(1);
  const { elapsed, phase } = useAuditThinkingPhase(loading);

  // A new period/branch starts a new conversation
  const paramsKey = JSON.stringify(params);
  useEffect(() => setMessages([]), [paramsKey]);

  useEffect(() => {
    if (messages.length || loading) {
      chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading]);

  // Stop speaking when the drawer closes
  useEffect(() => {
    if (!open && typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
      setSpeakingId(null);
    }
  }, [open]);

  const send = async (raw: string, retryOfId?: number) => {
    const question = raw.trim();
    if (!question || loading) return;

    const history = messages.filter((m) => !m.isError).map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [
      ...prev.filter((m) => m.id !== retryOfId),
      ...(retryOfId ? [] : [{ id: nextId.current++, role: "user" as const, text: question, timestamp: new Date().toISOString() }]),
    ]);
    setInput("");
    setLoading(true);
    try {
      const { answer } = await askAuditAssistant({ ...params, question, history });
      setMessages((prev) => [...prev, { id: nextId.current++, role: "ai", text: answer, timestamp: new Date().toISOString() }]);
    } catch (error: any) {
      const status = error?.response?.status;
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: "ai",
          text:
            status === 503
              ? "AI is not set up on the server yet."
              : status === 403
                ? "Only admins can use the audit assistant."
                : `Sorry, I couldn't answer that. ${error?.response?.data?.error || error?.message || ""}`,
          isError: true,
          promptForRetry: question,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (id: number, text: string) => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) return;
    if (speakingId === id) {
      synth.cancel();
      setSpeakingId(null);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#>|`-]/g, " "));
    utterance.onend = () => setSpeakingId(null);
    setSpeakingId(id);
    synth.speak(utterance);
  };

  const copy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <ThinkingOrb size={32} state={loading ? "solving" : "breathing"} theme="light" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ display: "block", fontSize: 15, color: C.text, lineHeight: 1.2 }}>
          {ASSISTANT_NAME}
        </Text>
        <Text type="secondary" ellipsis style={{ fontSize: 12, display: "block" }}>
          {periodLabel} · {branchLabel}
        </Text>
      </div>
      <Tooltip title="Clear conversation">
        <Button
          type="text"
          size="small"
          icon={<ClearOutlined />}
          disabled={loading || !messages.length}
          onClick={() => setMessages([])}
          aria-label="Clear conversation"
        />
      </Tooltip>
      <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} aria-label="Close" />
    </div>
  );

  return (
    <BiasharaDrawer
      open={open}
      onClose={onClose}
      isMobile={isMobile}
      header={header}
      footer={
        <ChatInputBar
          input={input}
          setInput={setInput}
          loading={loading}
          onSend={() => send(input)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={`Ask ${ASSISTANT_NAME} about staff activity…`}
        />
      }
    >
      <style>{`
        .audit-insight { transition: border-color .15s, box-shadow .15s; }
        .audit-insight:hover { border-color: #c7d2fe !important; box-shadow: 0 2px 8px rgba(79,70,229,.08); }
        .audit-insight:focus-visible { outline: 2px solid ${C.ai}; outline-offset: 2px; }
      `}</style>
      <div
        ref={chatBodyRef}
        style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 16 }}
      >
        <InsightsBlock params={params} open={open} onAsk={(q) => send(q)} />

        {messages.map((m) => (
          <ChatMessageItem
            key={m.id}
            message={m}
            assistantName={ASSISTANT_NAME}
            speakingMessageId={speakingId}
            loading={loading}
            copiedId={copiedId}
            onTogglePlay={togglePlay}
            onCopyMessage={copy}
            onExportToPdf={(id) => exportMessageToPdf(id, `Audit Trail · ${branchLabel}`, THEME_C.primary)}
            onRetry={(prompt, errorId) => send(prompt, errorId)}
          />
        ))}

        {loading && <ThinkingLoadingBubble thinkingPhase={phase} loadingElapsedSec={elapsed} />}

        {!messages.length && !loading && (
          <div>
            <Text style={{ display: "block", fontSize: 12, color: C.sub, marginBottom: 8 }}>Or ask about…</Text>
            <QuickPromptsGrid prompts={QUICK_PROMPTS} onSelectPrompt={(text) => send(text)} />
          </div>
        )}
      </div>
    </BiasharaDrawer>
  );
};

export default AuditAiDrawer;
