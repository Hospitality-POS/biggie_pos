import React, { useState } from "react";
import { ChatMessage, QuickPrompt, ThinkingPhaseInfo } from "../types/biasharaAI.types";
import { HeroWelcomeCard } from "./HeroWelcomeCard";
import { QuickPromptsGrid } from "./QuickPromptsGrid";
import { ChatMessageItem } from "./ChatMessageItem";
import { ThinkingLoadingBubble } from "./ThinkingLoadingBubble";
import { exportMessageToPdf } from "../services/biasharaAI.service";
import { THEME_C } from "@utils/getPrimaryColor";

export interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  shopName?: string;
  curatedPrompts: QuickPrompt[];
  speakingMessageId: number | null;
  thinkingPhase: ThinkingPhaseInfo;
  loadingElapsedSec: number;
  chatBodyRef: React.RefObject<HTMLDivElement | null>;
  onSelectPrompt: (prompt: string) => void;
  onTogglePlay: (id: number, text: string) => void;
  onRetry: (prompt: string, errorId?: number) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  loading,
  shopName,
  curatedPrompts,
  speakingMessageId,
  thinkingPhase,
  loadingElapsedSec,
  chatBodyRef,
  onSelectPrompt,
  onTogglePlay,
  onRetry,
}) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportPdf = (id: number) => {
    exportMessageToPdf(id, shopName, THEME_C.primary);
  };

  return (
    <div
      ref={chatBodyRef}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {messages.length === 0 ? (
        <div
          style={{
            margin: "auto 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "24px 8px",
          }}
        >
          <HeroWelcomeCard shopName={shopName} />
          <QuickPromptsGrid
            prompts={curatedPrompts}
            onSelectPrompt={onSelectPrompt}
          />
        </div>
      ) : (
        messages.map((m) => (
          <ChatMessageItem
            key={m.id}
            message={m}
            speakingMessageId={speakingMessageId}
            loading={loading}
            copiedId={copiedId}
            onTogglePlay={onTogglePlay}
            onCopyMessage={handleCopy}
            onExportToPdf={handleExportPdf}
            onRetry={onRetry}
          />
        ))
      )}

      {loading && (
        <ThinkingLoadingBubble
          thinkingPhase={thinkingPhase}
          loadingElapsedSec={loadingElapsedSec}
        />
      )}
    </div>
  );
};
