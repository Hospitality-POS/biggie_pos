import React, { useState } from "react";
import { Row, Col, Typography, Space, Button, Tag, Segmented, Skeleton, Empty } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  SendOutlined,
  MessageOutlined,
  MailOutlined,
  PieChartOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { C, pct } from "./constants";
import { Pill } from "./SharedUI";

const { Text } = Typography;

export interface OmnichannelTabProps {
  connected: {
    whatsapp: boolean;
    messenger: boolean;
    instagram: boolean;
  };
  channelCounts: {
    whatsapp: number;
    messenger: number;
    instagram: number;
  };
  connectedCount: number;
  unreadCount: number;
  totalConversations: number;
  convCounts: {
    open: number;
    pending: number;
    resolved: number;
    closed: number;
  };
  avgResolutionTime: string | number;
  smsTotals?: any;
  emailTotals?: any;
  smsAnalytics?: any;
  emailAnalytics?: any;
  messagingLoading: boolean;
  statusPieData: any[];
  statusMixMode: "status" | "channel";
  onStatusMixModeChange: (mode: "status" | "channel") => void;
  convLoading: boolean;
  isMobile: boolean;
  isAdminLayout?: boolean;
  navTo: (path: string) => void;
}

export const OmnichannelTab: React.FC<OmnichannelTabProps> = ({
  connected,
  channelCounts,
  connectedCount,
  unreadCount,
  totalConversations,
  convCounts,
  avgResolutionTime,
  smsTotals,
  emailTotals,
  smsAnalytics,
  emailAnalytics,
  messagingLoading,
  statusPieData,
  statusMixMode,
  onStatusMixModeChange,
  convLoading,
  isMobile,
  isAdminLayout = false,
  navTo,
}) => {
  const channelTiles = [
    { label: "WhatsApp Business", on: connected.whatsapp, count: channelCounts.whatsapp, color: "#25D366" },
    { label: "Facebook Messenger", on: connected.messenger, count: channelCounts.messenger, color: "#0084FF" },
    { label: "Instagram Direct", on: connected.instagram, count: channelCounts.instagram, color: "#E1306C" },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {/* ── Live Channels Status Deck ── */}
      <Row gutter={isMobile ? [8, 8] : [12, 12]}>
        {channelTiles.map((ch) => (
          <Col xs={24} sm={8} key={ch.label}>
            <div
              style={{
                border: "1px solid #eef2f7",
                borderTop: `3px solid ${ch.on ? ch.color : "#e2e8f0"}`,
                borderRadius: 10,
                padding: "14px 16px",
                background: ch.on ? "#ffffff" : "#f8fafc",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                <Text strong style={{ fontSize: 13, color: ch.on ? C.text : C.subtext }}>
                  {ch.label}
                </Text>
                <Pill label={ch.on ? "LIVE" : "OFF"} color={ch.on ? C.success : C.gray} bg={(ch.on ? C.success : C.gray) + "15"} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: ch.on ? ch.color : C.subtext, marginTop: 6 }}>
                {ch.count}
              </div>
              <Text style={{ fontSize: 11, color: C.subtext }}>
                conversation{ch.count === 1 ? "" : "s"} this period
              </Text>
            </div>
          </Col>
        ))}
      </Row>

      {/* ── Health Pills ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {[
          {
            label: "Resolution Rate",
            value: `${pct(convCounts.resolved + convCounts.closed, totalConversations)}%`,
            color: C.success,
          },
          { label: "Avg Resolution Time", value: `${avgResolutionTime} hrs`, color: C.blue },
          { label: "Active Channels", value: `${connectedCount} of 3`, color: C.purple },
          { label: "Unread Messages", value: unreadCount, color: unreadCount > 0 ? C.orange : C.gray },
        ].map((s) => (
          <div key={s.label} style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px solid #eef2f7" }}>
            <Text style={{ fontSize: 11, color: C.subtext, display: "block" }}>{s.label}</Text>
            <Text strong style={{ fontSize: 16, color: s.color }}>
              {s.value}
            </Text>
          </div>
        ))}
      </div>

      {/* ── SMS & Email Campaigns and Engagement Mix Donut ── */}
      <Row gutter={isMobile ? [8, 8] : [16, 16]}>
        {/* Left: SMS & Email Messaging Hub */}
        <Col xs={24} lg={15}>
          <ProCard
            bordered
            headerBordered
            size="small"
            style={{ borderRadius: 12, height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            title={
              <Space size={6}>
                <div
                  style={{
                    background: "#fff7ed",
                    borderRadius: 8,
                    padding: isMobile ? "3px 6px" : "4px 8px",
                    color: "#f97316",
                    display: "inline-flex",
                    fontSize: isMobile ? 12 : 14,
                  }}
                >
                  <SendOutlined />
                </div>
                <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
                  SMS &amp; Email Marketing Campaigns
                </Text>
                {(smsTotals?.sent_count || 0) + (emailTotals?.sent_count || 0) > 0 && (
                  <Tag color="orange" style={{ borderRadius: 10, fontSize: 10, border: "none" }}>
                    {(smsTotals?.sent_count || 0) + (emailTotals?.sent_count || 0)} sent
                  </Tag>
                )}
              </Space>
            }
            extra={
              !isAdminLayout && !isMobile ? (
                <Button type="link" size="small" onClick={() => navTo("/omnichannel")} style={{ fontSize: 12 }}>
                  Open Messaging →
                </Button>
              ) : undefined
            }
            bodyStyle={{ padding: isMobile ? "10px 8px" : "14px 16px" }}
          >
            {messagingLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (
              <Row gutter={[16, 16]}>
                {[
                  {
                    label: "SMS Broadcasts",
                    icon: <MessageOutlined />,
                    color: "#25D366",
                    bg: "#f0fdf4",
                    data: smsTotals,
                    trend: smsAnalytics?.daily_trend || [],
                  },
                  {
                    label: "Email Campaigns",
                    icon: <MailOutlined />,
                    color: "#3b82f6",
                    bg: "#eff6ff",
                    data: emailTotals,
                    trend: emailAnalytics?.daily_trend || [],
                  },
                ].map((ch, i) => (
                  <Col xs={24} md={12} key={i}>
                    <div style={{ background: "#f8fafc", borderRadius: 8, padding: 14, border: "1px solid #e2e8f0", height: "100%" }}>
                      <Space size={8} style={{ marginBottom: 12 }}>
                        <div style={{ background: ch.bg, borderRadius: 7, padding: "3px 7px", color: ch.color, fontSize: 13, lineHeight: 1 }}>
                          {ch.icon}
                        </div>
                        <Text strong style={{ fontSize: 13 }}>
                          {ch.label}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#64748b" }}>
                          {(ch.data?.campaigns || 0) + (ch.data?.quick_sends || 0) === 0
                            ? "No sends"
                            : `${(ch.data?.campaigns || 0) + (ch.data?.quick_sends || 0)} sends`}
                        </Text>
                      </Space>
                      <Row gutter={[8, 8]}>
                        {[
                          { label: "Campaigns", value: ch.data?.campaigns || 0, color: "#6366f1" },
                          { label: "Recipients", value: ch.data?.total_recipients || 0, color: "#0d9488" },
                          { label: "Sent", value: ch.data?.sent_count || 0, color: "#10b981" },
                          { label: "Failed", value: ch.data?.failed_count || 0, color: (ch.data?.failed_count || 0) > 0 ? "#ef4444" : "#64748b" },
                          { label: "Success Rate", value: `${ch.data?.success_rate || 0}%`, color: "#f59e0b" },
                        ].map((s, j) => (
                          <Col span={8} key={j}>
                            <div style={{ background: "#ffffff", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                              <Text style={{ fontSize: 10, color: "#64748b", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {s.label}
                              </Text>
                              <Text strong style={{ fontSize: isMobile ? 13 : 15, color: s.color }}>
                                {s.value}
                              </Text>
                            </div>
                          </Col>
                        ))}
                      </Row>
                      {ch.trend.length > 0 && (
                        <ResponsiveContainer width="100%" height={isMobile ? 80 : 100}>
                          <BarChart data={ch.trend.slice(-14)} margin={{ top: 10, right: 4, left: -28, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(d: string) => d.slice(5)} />
                            <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <ReTooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 11 }} />
                            <Bar dataKey="sent" stackId="a" fill="#10b981" name="Sent" />
                            <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </ProCard>
        </Col>

        {/* Right: Engagement Mix Donut */}
        <Col xs={24} lg={9}>
          <ProCard
            bordered
            headerBordered
            size="small"
            style={{ borderRadius: 12, height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            title={
              <Space size={6}>
                <div
                  style={{
                    background: "#f0fdf4",
                    borderRadius: 8,
                    padding: isMobile ? "3px 6px" : "4px 8px",
                    color: "#10b981",
                    display: "inline-flex",
                    fontSize: isMobile ? 12 : 14,
                  }}
                >
                  <PieChartOutlined />
                </div>
                <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
                  Engagement Mix
                </Text>
              </Space>
            }
            extra={
              <Segmented
                size="small"
                value={statusMixMode}
                onChange={(val) => onStatusMixModeChange(val as "status" | "channel")}
                options={[
                  { label: "Status", value: "status" },
                  { label: "Channels", value: "channel" },
                ]}
              />
            }
            bodyStyle={{ padding: isMobile ? "10px 6px 6px" : "16px 12px 10px" }}
          >
            {convLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : statusPieData.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No conversation data recorded"
                style={{ padding: "32px 0" }}
              />
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 210 : 250}>
                <PieChart margin={{ top: 4, right: 10, left: 10, bottom: 10 }}>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={isMobile ? 38 : 45}
                    outerRadius={isMobile ? 65 : 75}
                    paddingAngle={3}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`pie-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip
                    formatter={(val: any) => [`${val} conversations`, "Volume"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ProCard>
        </Col>
      </Row>
    </Space>
  );
};
