import React from "react";
import { Row, Col, Typography, Space } from "antd";
import {
  TeamOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { KPICard } from "./SharedUI";
import { fmtKES, fmtK } from "@utils/formatters";
import { pct } from "./constants";

const { Text } = Typography;

export interface MtejaExecutiveKPIsProps {
  totalLeads: number;
  newLeadsCount: number;
  activeLeadsCount: number;
  totalLeadValue: number;
  wonLeadValue: number;
  conversionRate: number;
  wonLeadsCount: number;
  avgResolutionTime: string | number;
  connectedCount: number;
  totalConversations: number;
  resolvedCount: number;
  hasChatChannel: boolean;
  isDataLoading: boolean;
  isMobile: boolean;
  onSelectTab: (tab: string) => void;
}

export const MtejaExecutiveKPIs: React.FC<MtejaExecutiveKPIsProps> = ({
  totalLeads,
  newLeadsCount,
  activeLeadsCount,
  totalLeadValue,
  wonLeadValue,
  conversionRate,
  wonLeadsCount,
  avgResolutionTime,
  connectedCount,
  totalConversations,
  resolvedCount,
  hasChatChannel,
  isDataLoading,
  isMobile,
  onSelectTab,
}) => {
  const cards = [
    {
      title: "Total Leads",
      value: totalLeads.toLocaleString(),
      icon: <TeamOutlined />,
      color: "#3b82f6",
      bg: "#eff6ff",
      border: "#bfdbfe",
      subtext: (
        <Text style={{ fontSize: 11, color: "#64748b" }}>
          <span style={{ color: "#3b82f6", fontWeight: 600 }}>{newLeadsCount} new</span> · {activeLeadsCount} active
        </Text>
      ),
      onClick: () => onSelectTab("pipeline"),
    },
    {
      title: "Pipeline Value",
      value: fmtKES(totalLeadValue),
      icon: <DollarOutlined />,
      color: "#10b981",
      bg: "#f0fdf4",
      border: "#bbf7d0",
      subtext: (
        <Text style={{ fontSize: 11, color: "#64748b" }}>
          Won: <span style={{ color: "#10b981", fontWeight: 600 }}>{fmtKES(wonLeadValue)}</span>
        </Text>
      ),
      onClick: () => onSelectTab("pipeline"),
    },
    {
      title: "Lead Conversion",
      value: `${conversionRate.toFixed(1)}%`,
      icon: <ThunderboltOutlined />,
      color: "#f59e0b",
      bg: "#fffbeb",
      border: "#fde68a",
      subtext: (
        <Text style={{ fontSize: 11, color: "#64748b" }}>
          <span style={{ color: "#10b981", fontWeight: 600 }}>{wonLeadsCount} won</span> of {totalLeads} leads
        </Text>
      ),
      onClick: () => onSelectTab("team"),
    },
    {
      title: "Engagement Health",
      value: `${avgResolutionTime}h`,
      icon: <ClockCircleOutlined />,
      color: "#8b5cf6",
      bg: "#f5f3ff",
      border: "#ddd6fe",
      subtext: isMobile ? (
        <Text style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {connectedCount} Live · <span style={{ color: "#10b981", fontWeight: 600 }}>{pct(resolvedCount, totalConversations)}% Res.</span>
        </Text>
      ) : (
        <Space size={6}>
          <span style={{ fontSize: 11, color: "#64748b" }}>{connectedCount} Channels Live</span>
          <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>• {pct(resolvedCount, totalConversations)}% Res.</span>
        </Space>
      ),
      onClick: () => onSelectTab("omnichannel"),
    },
  ];

  return (
    <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
      {cards.map((card, i) => (
        <Col xs={12} sm={12} lg={6} key={i}>
          <KPICard
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
            bg={card.bg}
            border={card.border}
            subtext={card.subtext}
            isMobile={isMobile}
            isLoading={isDataLoading}
            onClick={card.onClick}
          />
        </Col>
      ))}
    </Row>
  );
};
