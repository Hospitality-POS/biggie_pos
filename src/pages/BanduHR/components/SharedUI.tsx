import React from "react";
import { Typography, Tooltip, Space, Empty } from "antd";

const { Text } = Typography;

export const EmptyState: React.FC<{ text: string; height?: number }> = ({ text, height = 200 }) => (
  <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Text type="secondary" style={{ fontSize: 12 }}>{text}</Text>} />
  </div>
);

export const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  tooltip?: string;
}> = ({ label, value, hint, icon, color, tooltip }) => (
  <Tooltip title={tooltip}>
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: "100%",
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      <div
        style={{
          background: `${color}14`,
          color,
          borderRadius: 8,
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <Text style={{ fontSize: 11, color: "#64748b", display: "block", whiteSpace: "nowrap" }}>{label}</Text>
        <Text strong style={{ fontSize: 16, color: "#0f172a", whiteSpace: "nowrap" }}>{value}</Text>
        {hint && (
          <Text style={{ fontSize: 10.5, color: "#94a3b8", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {hint}
          </Text>
        )}
      </div>
    </div>
  </Tooltip>
);

export interface KPICardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  subtext?: React.ReactNode;
  isMobile?: boolean;
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
  onClick,
}) => (
  <div
    onClick={onClick}
    style={{
      background: bg,
      borderRadius: isMobile ? 10 : 12,
      padding: isMobile ? "12px 12px" : "16px 18px",
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
    <Space direction="vertical" size={isMobile ? 2 : 4} style={{ width: "100%" }}>
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
            padding: isMobile ? "4px 6px" : "5px 7px",
            color,
            fontSize: isMobile ? 13 : 15,
            lineHeight: 1,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontSize: isMobile ? 18 : 22,
          fontWeight: 700,
          color: "#0f172a",
          letterSpacing: -0.3,
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
      <div
        style={{
          marginTop: 2,
          fontSize: 11,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {subtext}
      </div>
    </Space>
  </div>
);
