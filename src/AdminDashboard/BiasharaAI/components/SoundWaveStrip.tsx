import React from "react";
import { Button, Tooltip } from "antd";
import { PlayCircleFilled, PauseCircleFilled } from "@ant-design/icons";
import { ThinkingOrb } from "thinking-orbs";

export interface SoundWaveStripProps {
  messageId: number;
  messageText: string;
  isSpeaking: boolean;
  onTogglePlay: (id: number, text: string) => void;
}

export const SoundWaveStrip: React.FC<SoundWaveStripProps> = ({
  messageId,
  messageText,
  isSpeaking,
  onTogglePlay,
}) => {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onTogglePlay(messageId, messageText);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTogglePlay(messageId, messageText);
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        userSelect: "none",
        background: isSpeaking
          ? "linear-gradient(135deg, rgba(99,102,241,0.09) 0%, rgba(236,72,153,0.09) 100%)"
          : "#f8fafc",
        border: isSpeaking
          ? "1px solid rgba(99,102,241,0.3)"
          : "1px solid #eef2f6",
        borderRadius: 10,
        padding: "6px 10px",
        marginBottom: 10,
        transition: "all 0.25s ease",
        boxShadow: isSpeaking ? "0 2px 10px rgba(99,102,241,0.12)" : "none",
      }}
    >
      {/* Left: ThinkingOrb & Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: isSpeaking
              ? "linear-gradient(135deg, #06b6d4 0%, #a855f7 50%, #ec4899 100%)"
              : "#e2e8f0",
            padding: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isSpeaking ? "0 0 10px rgba(99,102,241,0.5)" : "none",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <ThinkingOrb
              size={20}
              state={isSpeaking ? "listening" : "breathing"}
              theme="light"
            />
          </div>
        </div>

        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: isSpeaking ? "#4338ca" : "#475569",
              display: "block",
              lineHeight: 1.2,
            }}
          >
            {isSpeaking ? "Sound Playing" : "Sound"}
          </span>
          <span style={{ fontSize: 9, color: "#94a3b8" }}>
            {isSpeaking ? "Playing sound..." : "Click play to listen"}
          </span>
        </div>
      </div>

      {/* Center: Dancing Waveform Bars */}
      <div style={{ display: "flex", alignItems: "center", gap: 3, height: 16 }}>
        {[
          { color: "#06b6d4", delay: "0ms" },
          { color: "#3b82f6", delay: "150ms" },
          { color: "#8b5cf6", delay: "300ms" },
          { color: "#ec4899", delay: "450ms" },
          { color: "#f43f5e", delay: "600ms" },
        ].map((b, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: 3,
              height: isSpeaking ? 15 : 4,
              borderRadius: 2,
              backgroundColor: b.color,
              animation: isSpeaking
                ? `soundWaveBar 0.7s ease-in-out infinite alternate ${b.delay}`
                : "none",
              transition: "height 0.2s ease",
            }}
          />
        ))}
      </div>

      {/* Right: Play / Pause Control */}
      <Tooltip title={isSpeaking ? "Pause Sound" : "Listen to response"}>
        <Button
          size="small"
          type="text"
          aria-label={isSpeaking ? "Pause Sound" : "Listen to response"}
          icon={
            isSpeaking ? (
              <PauseCircleFilled style={{ color: "#4f46e5", fontSize: 20 }} />
            ) : (
              <PlayCircleFilled style={{ color: "#64748b", fontSize: 20 }} />
            )
          }
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay(messageId, messageText);
          }}
          style={{
            padding: 0,
            width: 26,
            height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      </Tooltip>
    </div>
  );
};
