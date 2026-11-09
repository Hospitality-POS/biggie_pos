import React, { useState, useEffect } from "react";
import { Typography, Space } from "antd";
import { fmt } from "./constants";

const { Text } = Typography;

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

export interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  subtext: React.ReactNode;
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
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
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

export const CustomPLTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const rev = payload.find((p: any) => p.dataKey === "Revenue")?.value || 0;
  const exp = payload.find((p: any) => p.dataKey === "Expenses")?.value || 0;
  const net = payload.find((p: any) => p.dataKey === "Net P/L")?.value || 0;
  const margin = rev > 0 ? ((net / rev) * 100).toFixed(1) : "0.0";
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(6px)",
        borderRadius: 10,
        padding: "10px 14px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        minWidth: 190,
      }}
    >
      <Text strong style={{ fontSize: 12, color: "#0f172a", display: "block", marginBottom: 6 }}>
        {label}
      </Text>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
        <span style={{ color: "#10b981", fontWeight: 600 }}>● Revenue:</span>
        <span style={{ fontWeight: 600 }}>KES {fmt(rev)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
        <span style={{ color: "#ef4444", fontWeight: 600 }}>● Expenses:</span>
        <span style={{ fontWeight: 600 }}>KES {fmt(exp)}</span>
      </div>
      <div style={{ borderTop: "1px dashed #e2e8f0", margin: "6px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
        <span style={{ color: net >= 0 ? "#6366f1" : "#ef4444", fontWeight: 600 }}>● Net P/L:</span>
        <span style={{ fontWeight: 700, color: net >= 0 ? "#6366f1" : "#ef4444" }}>
          KES {fmt(net)}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b" }}>
        <span>Operating Margin:</span>
        <span style={{ fontWeight: 600, color: Number(margin) >= 0 ? "#10b981" : "#ef4444" }}>
          {margin}%
        </span>
      </div>
    </div>
  );
};
