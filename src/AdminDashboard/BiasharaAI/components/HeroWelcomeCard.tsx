import React from "react";
import { Typography } from "antd";
import { ThinkingOrb } from "thinking-orbs";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text, Paragraph } = Typography;
const C = THEME_C;

export interface HeroWelcomeCardProps {
  shopName?: string;
}

export const HeroWelcomeCard: React.FC<HeroWelcomeCardProps> = ({ shopName }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 76,
          height: 76,
          borderRadius: 22,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          boxShadow:
            "0 8px 24px -4px rgba(15,23,42,0.06), 0 2px 6px -1px rgba(15,23,42,0.04)",
        }}
      >
        <ThinkingOrb size={64} state="weaving" theme="light" />
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "2px 10px",
          borderRadius: 12,
          background: `${C.primary}0d`,
          border: `1px solid ${C.primary}20`,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: C.primary,
            letterSpacing: "0.5px",
          }}
        >
          BIASHARA AI ADVISOR
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            background: "#fffbeb",
            color: "#d97706",
            border: "1px solid #fde68a",
            padding: "0 5px",
            borderRadius: 6,
            lineHeight: "14px",
            letterSpacing: "0.4px",
          }}
        >
          Beta
        </span>
      </div>

      <Text strong style={{ color: "#0f172a", fontSize: 16, marginBottom: 4 }}>
        How can Biashara AI assist you?
      </Text>
      <Paragraph
        style={{
          color: "#64748b",
          fontSize: 12,
          maxWidth: 320,
          marginBottom: 20,
        }}
      >
        I am connected to real-time sales, order transactions, stock velocity, and restock alerts for{" "}
        <strong style={{ color: C.primary }}>{shopName || "this store"}</strong>.
      </Paragraph>
    </div>
  );
};
