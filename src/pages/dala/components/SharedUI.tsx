import React, { useState, useEffect } from "react";
import { Typography, Space, Tag } from "antd";

const { Text } = Typography;

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

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
