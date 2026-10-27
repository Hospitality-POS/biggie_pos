import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Skeleton, Tooltip, Typography } from "antd";
import { BulbOutlined, ClearOutlined, CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { ThinkingOrb } from "thinking-orbs";
import { THEME_C } from "@utils/getPrimaryColor";
import { BiasharaDrawer } from "src/AdminDashboard/BiasharaAI/components/BiasharaDrawer";
import { ChatInputBar } from "src/AdminDashboard/BiasharaAI/components/ChatInputBar";
import { ChatMessageItem } from "src/AdminDashboard/BiasharaAI/components/ChatMessageItem";
import { QuickPromptsGrid } from "src/AdminDashboard/BiasharaAI/components/QuickPromptsGrid";
import { ThinkingLoadingBubble } from "src/AdminDashboard/BiasharaAI/components/ThinkingLoadingBubble";
import { useIsMobile } from "src/AdminDashboard/BiasharaAI/hooks/useIsMobile";
import { exportMessageToPdf } from "src/AdminDashboard/BiasharaAI/services/biasharaAI.service";
import type { ChatMessage, QuickPrompt, ThinkingPhaseInfo } from "src/AdminDashboard/BiasharaAI/types/biasharaAI.types";

dayjs.extend(relativeTime);

const { Text } = Typography;
const C = { text: "#0f172a", sub: "#64748b", border: "#e2e8f0", ai: "#4f46e5" };

export interface AiInsight {
  type: string;
  title: string;
  detail: string;
  subject: string | null;
}

export interface AiInsightsResult {
  headline: string;
  insights: AiInsight[];
  generatedAt: string;
}

export interface InsightStyle {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

export interface AiInsightsDrawerProps {
  open: boolean;
  onClose: () => void;
  /** e.g. "Forms AI" */
  assistantName: string;
  /** Line under the name, e.g. "Client forms · Last 30 days" */
  subtitle: string;
  /** React Query key for the insights; changing it starts a new conversation */
  queryKey: unknown[];
  fetchInsights: (fresh: boolean) => Promise<AiInsightsResult>;
  ask: (question: string, history: { role: "user" | "ai"; text: string }[]) => Promise<string>;
  insightStyles: Record<string, InsightStyle>;
  quickPrompts: QuickPrompt[];
  /** Captions while an answer loads, by elapsed seconds (0-3, 3-7, 7-12, 12+) */
  thinking: [string, string][];
  loadingText: string;
  placeholder: string;
  /** Title on exported answers */
  pdfTitle: string;
  /** Message when the API says the user may not use it */
  forbiddenText: string;
}

const STATES: ThinkingPhaseInfo["state"][] = ["searching", "connecting", "solving", "composing"];

const useThinkingPhase = (loading: boolean, captions: [string, string][]) => {
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
    const i = elapsed < 3 ? 0 : elapsed < 7 ? 1 : elapsed < 12 ? 2 : 3;
    const [title, desc] = captions[Math.min(i, captions.length - 1)] ?? ["Thinking", ""];
    return { state: STATES[i], title, desc };
  }, [elapsed, captions]);

  return { elapsed, phase };
};

const errorMessage = (error: any) => error?.response?.data?.message || error?.response?.data?.error || error?.message || "";

// ── Insights block (top of the drawer) ──────────────────────────────────────

const InsightsBlock: React.FC<{
  open: boolean;
  queryKey: unknown[];
  fetchInsights: (fresh: boolean) => Promise<AiInsightsResult>;
  insightStyles: Record<string, InsightStyle>;
  loadingText: string;
  onAsk: (question: string) => void;
}> = ({ open, queryKey, fetchInsights, insightStyles, loadingText, onAsk }) => {
  // Set by "Generate again" so only that request skips the server cache (each is a new AI call)
  const forceFresh = useRef(false);
  const query = useQuery({
    queryKey,
    queryFn: () => {
      const fresh = forceFresh.current;
      forceFresh.current = false;
      return fetchInsights(fresh);
    },
    enabled: open,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  const error = query.error as any;
  const fallback: InsightStyle = { label: "Insight", icon: <BulbOutlined />, color: "#047857", bg: "#ecfdf5" };

  return (
    <div style={{ background: "linear-gradient(180deg, #f5f7ff 0%, #ffffff 140px)", border: "1px solid #e0e7ff", borderRadius: 12, padding: 12 }}>
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
            onClick={() => {
              forceFresh.current = true;
              query.refetch();
            }}
            aria-label="Generate again"
          />
        </Tooltip>
      </div>

      {query.isLoading || (query.isFetching && !query.data) ? (
        <div>
          <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
            {loadingText}
          </Text>
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        </div>
      ) : query.isError ? (
        <Alert
          type={error?.response?.status === 503 ? "info" : "warning"}
          showIcon
          message={error?.response?.status === 503 ? "AI is not set up on the server" : "Could not generate insights"}
          description={errorMessage(error)}
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
                const style = insightStyles[insight.type] || fallback;
                const question = `Tell me more about this finding: "${insight.title}" — ${insight.detail} Show the numbers behind it and what I should do.`;
                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    className="ai-insight-card"
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
                    <Text style={{ display: "block", marginTop: 6, fontSize: 12, color: C.ai, fontWeight: 500 }}>Ask about this →</Text>
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

/**
 * Side drawer with AI insights on top and a follow-up chat below, in the
 * Biashara AI style. Used by report pages (Forms & Plans analytics, Top Sellers…).
 */
const AiInsightsDrawer: React.FC<AiInsightsDrawerProps> = ({
  open,
  onClose,
  assistantName,
  subtitle,
  queryKey,
  fetchInsights,
  ask,
  insightStyles,
  quickPrompts,
  thinking,
  loadingText,
  placeholder,
  pdfTitle,
  forbiddenText,
}) => {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(1);
  const { elapsed, phase } = useThinkingPhase(loading, thinking);

  // New filters start a new conversation; an answer still loading for the old
  // filters is dropped instead of landing in the new one.
  const conversation = useRef(0);
  const filtersKey = JSON.stringify(queryKey);
  useEffect(() => {
    conversation.current += 1;
    setMessages([]);
  }, [filtersKey]);

  useEffect(() => {
    if (messages.length || loading) chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open && typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
      setSpeakingId(null);
    }
  }, [open]);

  const send = async (raw: string, retryOfId?: number) => {
    const question = raw.trim();
    if (!question || loading) return;

    let history = messages.filter((m) => !m.isError).map((m) => ({ role: m.role, text: m.text }));
    const last = history[history.length - 1];
    if (retryOfId && last?.role === "user" && last.text === question) history = history.slice(0, -1);
    const asked = conversation.current;

    setMessages((prev) => [
      ...prev.filter((m) => m.id !== retryOfId),
      ...(retryOfId ? [] : [{ id: nextId.current++, role: "user" as const, text: question, timestamp: new Date().toISOString() }]),
    ]);
    setInput("");
    setLoading(true);
    try {
      const answer = await ask(question, history);
      if (asked !== conversation.current) return;
      setMessages((prev) => [...prev, { id: nextId.current++, role: "ai", text: answer, timestamp: new Date().toISOString() }]);
    } catch (error: any) {
      if (asked !== conversation.current) return;
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
                ? forbiddenText
                : `Sorry, I couldn't answer that. ${errorMessage(error)}`,
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
          {assistantName}
        </Text>
        <Text type="secondary" ellipsis style={{ fontSize: 12, display: "block" }}>
          {subtitle}
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
          placeholder={placeholder}
        />
      }
    >
      <style>{`
        .ai-insight-card { transition: border-color .15s, box-shadow .15s; }
        .ai-insight-card:hover { border-color: #c7d2fe !important; box-shadow: 0 2px 8px rgba(79,70,229,.08); }
        .ai-insight-card:focus-visible { outline: 2px solid ${C.ai}; outline-offset: 2px; }
      `}</style>
      <div ref={chatBodyRef} style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 16 }}>
        <InsightsBlock
          open={open}
          queryKey={queryKey}
          fetchInsights={fetchInsights}
          insightStyles={insightStyles}
          loadingText={loadingText}
          onAsk={(q) => send(q)}
        />

        {messages.map((m) => (
          <ChatMessageItem
            key={m.id}
            message={m}
            assistantName={assistantName}
            speakingMessageId={speakingId}
            loading={loading}
            copiedId={copiedId}
            onTogglePlay={togglePlay}
            onCopyMessage={copy}
            onExportToPdf={(id) => exportMessageToPdf(id, pdfTitle, THEME_C.primary)}
            onRetry={(prompt, errorId) => send(prompt, errorId)}
          />
        ))}

        {loading && <ThinkingLoadingBubble thinkingPhase={phase} loadingElapsedSec={elapsed} />}

        {!messages.length && !loading && (
          <div>
            <Text style={{ display: "block", fontSize: 12, color: C.sub, marginBottom: 8 }}>Or ask about…</Text>
            <QuickPromptsGrid prompts={quickPrompts} onSelectPrompt={(text) => send(text)} />
          </div>
        )}
      </div>
    </BiasharaDrawer>
  );
};

export default AiInsightsDrawer;
