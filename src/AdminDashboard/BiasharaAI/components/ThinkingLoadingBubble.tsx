import React from "react";
import { ThinkingOrb } from "thinking-orbs";
import { ThinkingPhaseInfo } from "../types/biasharaAI.types";

export interface ThinkingLoadingBubbleProps {
  thinkingPhase: ThinkingPhaseInfo;
  loadingElapsedSec: number;
}

export const ThinkingLoadingBubble: React.FC<ThinkingLoadingBubbleProps> = ({
  thinkingPhase,
  loadingElapsedSec,
}) => {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #06b6d4 0%, #a855f7 50%, #ec4899 100%)",
          padding: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 0 16px rgba(168, 85, 247, 0.45)",
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
          <ThinkingOrb size={32} state={thinkingPhase.state} theme="light" />
        </div>
      </div>

      <div
        style={{
          maxWidth: "85%",
          background: "#ffffff",
          borderRadius: "4px 16px 16px 16px",
          padding: "12px 16px",
          border: "1px solid rgba(168, 85, 247, 0.25)",
          boxShadow: "0 4px 18px rgba(168, 85, 247, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              background: "linear-gradient(90deg, #6366f1, #a855f7, #ec4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {thinkingPhase.title}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#94a3b8",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {loadingElapsedSec}s...
          </span>
        </div>
        <p
          style={{
            fontSize: 11.5,
            color: "#64748b",
            margin: 0,
            lineHeight: 1.45,
          }}
        >
          {thinkingPhase.desc}
        </p>
      </div>
    </div>
  );
};
