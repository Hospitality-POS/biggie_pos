import React from "react";
import { Typography } from "antd";
import { THEME_C } from "@utils/getPrimaryColor";
import { QuickPrompt } from "../types/biasharaAI.types";

const { Text } = Typography;
const C = THEME_C;

export interface QuickPromptsGridProps {
  prompts: QuickPrompt[];
  onSelectPrompt: (promptText: string) => void;
}

export const QuickPromptsGrid: React.FC<QuickPromptsGridProps> = ({
  prompts,
  onSelectPrompt,
}) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        width: "100%",
      }}
    >
      {prompts.map((p, idx) => (
        <div
          key={idx}
          onClick={() => onSelectPrompt(p.desc)}
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "12px 14px",
            textAlign: "left",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = C.primary;
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(108,28,44,0.08)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#e2e8f0";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              {p.icon}
              <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>
                {p.tag}
              </span>
            </div>
            <Text
              strong
              style={{
                fontSize: 12,
                color: "#0f172a",
                display: "block",
                lineHeight: 1.3,
              }}
            >
              {p.title}
            </Text>
          </div>
          <Text
            type="secondary"
            style={{
              fontSize: 11,
              marginTop: 6,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {p.desc}
          </Text>
        </div>
      ))}
    </div>
  );
};
