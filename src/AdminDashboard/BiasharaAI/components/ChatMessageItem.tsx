import React from "react";
import { Typography, Tag, Tooltip, Button } from "antd";
import {
  SoundOutlined,
  ReloadOutlined,
  CopyOutlined,
  CheckOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const isTableLine = (line: string) => /^\s*\|.*\|\s*$/.test(line);

/**
 * Tidy markdown tables from the AI before rendering: models sometimes put a
 * whole table on one line ("| a | b | |---|---| | 1 | 2 |"), and a table
 * straight under a sentence needs a blank line to render as a table.
 */
const tidyTables = (text: string) => {
  const lines = text
    .split("\n")
    .flatMap((line) => (/\|\s*\|\s*:?-{3,}/.test(line) ? line.replace(/\|\s+\|/g, "|\n|").split("\n") : [line]));
  return lines
    .map((line, i) => (isTableLine(line) && i > 0 && lines[i - 1].trim() && !isTableLine(lines[i - 1]) ? `\n${line}` : line))
    .join("\n");
};
import { ThinkingOrb } from "thinking-orbs";
import { THEME_C } from "@utils/getPrimaryColor";
import { ChatMessage } from "../types/biasharaAI.types";
import { SoundWaveStrip } from "./SoundWaveStrip";

const { Text } = Typography;
const C = THEME_C;

export interface ChatMessageItemProps {
  message: ChatMessage;
  speakingMessageId: number | null;
  loading: boolean;
  copiedId: number | null;
  onTogglePlay: (id: number, text: string) => void;
  onCopyMessage: (text: string, id: number) => void;
  onExportToPdf: (id: number) => void;
  onRetry: (prompt: string, errorId?: number) => void;
  /** Name shown above AI replies */
  assistantName?: string;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message: m,
  speakingMessageId,
  loading,
  copiedId,
  onTogglePlay,
  onCopyMessage,
  onExportToPdf,
  onRetry,
  assistantName = "Biashara AI",
}) => {
  const isSpeaking = speakingMessageId === m.id;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: m.role === "user" ? "flex-end" : "flex-start",
      }}
    >
      {/* AI Header info */}
      {m.role === "ai" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 5,
            paddingLeft: 2,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ThinkingOrb
              size={20}
              state={isSpeaking ? "listening" : "breathing"}
              theme="light"
            />
          </div>
          <Text strong style={{ fontSize: 12, color: "#334155" }}>
            {assistantName}
          </Text>
          {isSpeaking && (
            <span
              style={{
                fontSize: 10,
                color: "#2563eb",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                padding: "1px 6px",
                borderRadius: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontWeight: 500,
              }}
            >
              <SoundOutlined style={{ fontSize: 10 }} />
              Speaking
            </span>
          )}
          {m.agent && (
            <Tag
              style={{
                margin: 0,
                borderRadius: 10,
                fontSize: 10,
                padding: "0 6px",
                lineHeight: "16px",
                color: C.primary,
                background: `${C.primary}10`,
                border: `1px solid ${C.primary}20`,
                textTransform: "capitalize",
                fontWeight: 500,
              }}
            >
              {m.agent.replace(/_/g, " ")}
            </Tag>
          )}
        </div>
      )}

      {/* Message Bubble */}
      <div
        id={`duka-bubble-${m.id}`}
        style={{
          maxWidth: "88%",
          borderRadius:
            m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          padding: "12px 16px",
          fontSize: 13,
          lineHeight: 1.65,
          background:
            m.role === "user"
              ? `linear-gradient(135deg, ${C.primary} 0%, #8b1d36 100%)`
              : m.isError
              ? "#fef2f2"
              : "#ffffff",
          color: m.role === "user" ? "#ffffff" : m.isError ? "#991b1b" : "#0f172a",
          boxShadow:
            m.role === "user"
              ? "0 2px 8px rgba(108,28,44,0.22)"
              : isSpeaking
              ? "0 0 0 1.5px rgba(99,102,241,0.5), 0 8px 24px -4px rgba(99,102,241,0.2)"
              : "0 1px 4px rgba(0,0,0,0.04)",
          border:
            m.role === "user"
              ? "none"
              : m.isError
              ? "1px solid #fecaca"
              : isSpeaking
              ? "1px solid #a5b4fc"
              : "1px solid #e2e8f0",
          transition: "all 0.25s ease",
          wordBreak: "break-word",
        }}
      >
        {/* Sound Audio Strip */}
        {m.role === "ai" && !m.isError && (
          <SoundWaveStrip
            messageId={m.id}
            messageText={m.text}
            isSpeaking={isSpeaking}
            onTogglePlay={onTogglePlay}
          />
        )}

        <ReactMarkdown
          // GFM adds tables (and strikethrough, task lists); without it a
          // table arrives as one run-on paragraph of pipes
          remarkPlugins={[remarkGfm]}
          components={{
            // Wide tables scroll inside the bubble instead of stretching it
            table: ({ children }) => (
              <div style={{ overflowX: "auto", margin: "6px 0 10px", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5 }}>{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead style={{ background: "#f8fafc" }}>{children}</thead>,
            th: ({ children, style }) => (
              <th
                style={{
                  textAlign: (style?.textAlign as any) || "left",
                  padding: "6px 10px",
                  borderBottom: "1px solid #e2e8f0",
                  fontWeight: 600,
                  color: "#334155",
                  whiteSpace: "nowrap",
                }}
              >
                {children}
              </th>
            ),
            td: ({ children, style }) => (
              <td style={{ textAlign: (style?.textAlign as any) || "left", padding: "6px 10px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" }}>
                {children}
              </td>
            ),
            p: ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
            ul: ({ children }) => (
              <ul style={{ margin: "4px 0 8px 0", paddingLeft: 18 }}>{children}</ul>
            ),
            li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
            strong: ({ children }) => (
              <strong
                style={{
                  fontWeight: 600,
                  color:
                    m.role === "user"
                      ? "#fff"
                      : m.isError
                      ? "#991b1b"
                      : "#0f172a",
                }}
              >
                {children}
              </strong>
            ),
          }}
        >
          {m.role === "ai" ? tidyTables(m.text) : m.text}
        </ReactMarkdown>

        {/* Prominent Retry Button inside error bubble */}
        {m.isError && m.promptForRetry && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid #fee2e2",
            }}
          >
            <Button
              size="small"
              type="primary"
              danger
              icon={<ReloadOutlined />}
              onClick={() => onRetry(m.promptForRetry!, m.id)}
              loading={loading}
              style={{ borderRadius: 6, fontSize: 12, height: 26 }}
            >
              Retry Prompt
            </Button>
          </div>
        )}
      </div>

      {/* Action Bar below Bubble */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 4,
          padding: "0 4px",
        }}
      >
        {m.timestamp && (
          <Text style={{ fontSize: 10, color: "#94a3b8" }}>{m.timestamp}</Text>
        )}
        {m.role === "ai" && !m.isError && (
          <>
            {m.promptForRetry && (
              <Tooltip title="Regenerate response">
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={() => onRetry(m.promptForRetry!)}
                  disabled={loading}
                  style={{
                    fontSize: 11,
                    padding: "0 4px",
                    height: 20,
                    color: "#94a3b8",
                  }}
                />
              </Tooltip>
            )}
            <Tooltip title={copiedId === m.id ? "Copied!" : "Copy text"}>
              <Button
                size="small"
                type="text"
                icon={
                  copiedId === m.id ? (
                    <CheckOutlined style={{ color: "#16a34a" }} />
                  ) : (
                    <CopyOutlined />
                  )
                }
                onClick={() => onCopyMessage(m.text, m.id)}
                style={{
                  fontSize: 11,
                  padding: "0 4px",
                  height: 20,
                  color: "#94a3b8",
                }}
              />
            </Tooltip>

            <Tooltip title="Export as PDF Document">
              <Button
                size="small"
                type="text"
                icon={<DownloadOutlined />}
                onClick={() => onExportToPdf(m.id)}
                style={{
                  fontSize: 11,
                  padding: "0 4px",
                  height: 20,
                  color: "#94a3b8",
                }}
              >
                PDF
              </Button>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
};
