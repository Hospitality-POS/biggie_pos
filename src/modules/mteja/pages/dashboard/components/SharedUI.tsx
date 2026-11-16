import React, { useState, useEffect } from "react";
import { Typography, Space, Avatar, Skeleton } from "antd";
import { C } from "./constants";

const { Text } = Typography;

export const useIsMobile = () => {
  const [v, setV] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

// ── Pill Component ────────────────────────────────────────────────────────────
export const Pill: React.FC<{ label: string; color: string; bg: string }> = ({ label, color, bg }) => (
  <span
    style={{
      fontSize: 10,
      fontWeight: 700,
      color,
      background: bg,
      borderRadius: 12,
      padding: "2px 8px",
      letterSpacing: 0.3,
      whiteSpace: "nowrap",
      display: "inline-block",
    }}
  >
    {label}
  </span>
);

// ── Hub Row Component ─────────────────────────────────────────────────────────
export interface HubRowProps {
  accent: string;
  avatar: string;
  title: string;
  subtitle: React.ReactNode;
  right: React.ReactNode;
  rightSub?: React.ReactNode;
  onClick: () => void;
}

export const HubRow: React.FC<HubRowProps> = ({
  accent,
  avatar,
  title,
  subtitle,
  right,
  rightSub,
  onClick,
}) => (
  <div
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 10px",
      borderRadius: 8,
      border: "1px solid #f1f5f9",
      background: "#ffffff",
      cursor: "pointer",
      transition: "background 0.15s ease",
      gap: 10,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
  >
    <Space size={10} style={{ minWidth: 0, flex: 1 }}>
      <Avatar
        size={32}
        style={{
          background: accent + "18",
          color: accent,
          fontWeight: 700,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {avatar}
      </Avatar>
      <div style={{ minWidth: 0, flex: 1 }}>
        <Text strong style={{ fontSize: 13, color: C.text, display: "block" }} ellipsis>
          {title}
        </Text>
        <div style={{ fontSize: 11, color: C.subtext, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {subtitle}
        </div>
      </div>
    </Space>

    <div style={{ textAlign: "right", flexShrink: 0 }}>
      {right}
      {rightSub && (
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
          {rightSub}
        </div>
      )}
    </div>
  </div>
);

// ── KPI Card Component ────────────────────────────────────────────────────────
export interface KPICardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  subtext?: React.ReactNode;
  isMobile?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  color,
  bg,
  border,
  subtext,
  isMobile = false,
  isLoading = false,
  onClick,
}) => (
  <div
    onClick={onClick}
    style={{
      background: bg,
      borderRadius: isMobile ? 10 : 12,
      padding: isMobile ? "10px 10px" : "16px 18px",
      border: `1px solid ${border}`,
      cursor: onClick ? "pointer" : "default",
      transition: "transform .15s ease, box-shadow .15s ease",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)";
      }
    }}
    onMouseLeave={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }
    }}
  >
    {isLoading ? (
      <Skeleton active paragraph={false} />
    ) : (
      <Space direction="vertical" size={isMobile ? 2 : 3} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
          <Text
            style={{
              fontSize: isMobile ? 11 : 12,
              color: "#475569",
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </Text>
          <div
            style={{
              background: "#ffffff",
              borderRadius: isMobile ? 6 : 8,
              padding: isMobile ? "3px 5px" : "4px 6px",
              color,
              fontSize: isMobile ? 12 : 14,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        </div>
        <div
          style={{
            fontSize: isMobile ? 17 : 22,
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1.2,
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={typeof value === "string" ? value : undefined}
        >
          {value}
        </div>
        <div style={{ marginTop: 2, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {subtext}
        </div>
      </Space>
    )}
  </div>
);
