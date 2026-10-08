import { useState, useRef, useCallback, useEffect } from "react";
import { message, notification } from "antd";
import { ChatMessage, AdvisorStage } from "../types/biasharaAI.types";
import { sendDukaChatMessage } from "../services/biasharaAI.service";

export interface UseBiasharaChatProps {
  selectedShopId: string;
  drawerOpen: boolean;
  onAiResponseGenerated?: (messageId: number, text: string) => void;
}

export interface UseBiasharaChatReturn {
  messages: ChatMessage[];
  input: string;
  setInput: (val: string) => void;
  loading: boolean;
  selectedStage: AdvisorStage;
  setSelectedStage: (stage: AdvisorStage) => void;
  chatBodyRef: React.RefObject<HTMLDivElement | null>;
  ask: (question: string) => Promise<void>;
  handleRetry: (promptToRetry: string, errorMsgId?: number) => void;
  handleSend: () => void;
  handleClearChat: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export const useBiasharaChat = ({
  selectedShopId,
  drawerOpen,
  onAiResponseGenerated,
}: UseBiasharaChatProps): UseBiasharaChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedStage, setSelectedStage] = useState<AdvisorStage>("auto");
  const messageIdRef = useRef(0);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (drawerOpen && chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, drawerOpen, loading]);

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim() || loading) return;
      const userMsgId = ++messageIdRef.current;
      const nowTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      setMessages((prev) => [
        ...prev,
        { role: "user", text: question, id: userMsgId, timestamp: nowTime },
      ]);
      setLoading(true);

      try {
        const res = await sendDukaChatMessage(question, {
          shopId: selectedShopId,
          level: selectedStage === "auto" ? undefined : selectedStage,
        });

        const aiId = ++messageIdRef.current;
        const aiResponseText = res.response || "Biashara AI could not formulate an answer.";

        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: aiResponseText,
            id: aiId,
            agent: res.agent,
            promptForRetry: question,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);

        if (onAiResponseGenerated) {
          onAiResponseGenerated(aiId, aiResponseText);
        }
      } catch (e: unknown) {
        const err = e as {
          response?: { data?: { detail?: string; message?: string } };
          message?: string;
        };
        const errorMessage =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Biashara AI is unavailable. Please try again later.";

        const aiId = ++messageIdRef.current;
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: `⚠️ **Unable to complete request:** ${errorMessage}`,
            id: aiId,
            isError: true,
            promptForRetry: question,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, selectedShopId, selectedStage, onAiResponseGenerated]
  );

  const handleRetry = useCallback(
    (promptToRetry: string, errorMsgId?: number) => {
      if (!promptToRetry || loading) return;
      if (errorMsgId) {
        setMessages((prev) => prev.filter((m) => m.id !== errorMsgId));
      }
      ask(promptToRetry);
    },
    [loading, ask]
  );

  const handleSend = useCallback(() => {
    const question = input.trim();
    if (!question || loading) return;
    setInput("");
    ask(question);
  }, [input, loading, ask]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    message.success("Chat Cleared");
  };

  return {
    messages,
    input,
    setInput,
    loading,
    selectedStage,
    setSelectedStage,
    chatBodyRef,
    ask,
    handleRetry,
    handleSend,
    handleClearChat,
    handleKeyDown,
  };
};
