import React, { useState } from "react";
import { Row, Col, Typography, Space, Button, Tag, Segmented, Skeleton, Empty } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  FundOutlined,
  TeamOutlined,
  DollarOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  FireOutlined,
  ProjectOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import dayjs from "dayjs";
import { C, formatSource } from "./constants";
import { HubRow, Pill } from "./SharedUI";
import { fmtK, fmtKES } from "@utils/formatters";

const { Text } = Typography;

export interface PipelineTabProps {
  pipelineLoading: boolean;
  totalLeads: number;
  pipelineChartData: any[];
  overdueFollowUps: number;
  dueFollowUps: number;
  repeatContacts: number;
  periodTargets: any[];
  targetsAchieved: number;
  leadSources: any[];
  leadProjects: any[];
  hasDala: boolean;
  recentLeads: any[];
  stageColorMap: Record<string, string>;
  isMobile: boolean;
  navTo: (path: string) => void;
}

export const PipelineTab: React.FC<PipelineTabProps> = ({
  pipelineLoading,
  totalLeads,
  pipelineChartData,
  overdueFollowUps,
  dueFollowUps,
  repeatContacts,
  periodTargets,
  targetsAchieved,
  leadSources,
  leadProjects,
  hasDala,
  recentLeads,
  stageColorMap,
  isMobile,
  navTo,
}) => {
  const [pipelineMetric, setPipelineMetric] = useState<"count" | "value">("count");

  const leadDisplayName = (l: any) =>
    (l.entity_type === "company" ? l.company_name : l.lead_name) || l.lead_name || l.company_name || "Unnamed lead";

  const actionPills = [
    {
      show: overdueFollowUps > 0,
      icon: <BellOutlined />,
      text: `${overdueFollowUps} overdue follow-up${overdueFollowUps === 1 ? "" : "s"}`,
      color: C.error,
      bg: C.errorLight,
      to: "/crm/leads",
    },
    {
      show: dueFollowUps > 0,
      icon: <CalendarOutlined />,
      text: `${dueFollowUps} follow-up${dueFollowUps === 1 ? "" : "s"} due in 7 days`,
      color: C.warning,
      bg: C.warningLight,
      to: "/crm/leads",
    },
    {
      show: overdueFollowUps === 0 && dueFollowUps === 0,
      icon: <CheckCircleOutlined />,
      text: "No follow-ups overdue or due this week",
      color: C.success,
      bg: C.successLight,
      to: "/crm/leads",
    },
    {
      show: repeatContacts > 0,
      icon: <TeamOutlined />,
      text: `${repeatContacts} contact${repeatContacts === 1 ? " has" : "s have"} >1 lead`,
      color: C.purple,
      bg: C.purpleLight,
      to: "/crm/leads",
    },
    {
      show: periodTargets.length > 0,
      icon: <TrophyOutlined />,
      text: `${targetsAchieved} of ${periodTargets.length} sales targets achieved`,
      color: C.teal,
      bg: C.tealLight,
      to: "/crm/sales-targets",
    },
  ];

  const sourceRows = leadSources.map((s) => ({ ...s, label: formatSource(s.source) }));
  const projectRows = leadProjects.map((p) => ({ ...p, label: p.project }));

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {/* ── Action Strip ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {actionPills
          .filter((x) => x.show)
          .map((x, i) => (
            <div
              key={i}
              onClick={() => navTo(x.to)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                background: x.bg,
                color: x.color,
                borderRadius: 20,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 500,
                border: `1px solid ${x.color}22`,
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              {x.icon}
              <span>{x.text}</span>
            </div>
          ))}
      </div>

      {/* ── Pipeline Funnel & Lead Sources ── */}
      <Row gutter={isMobile ? [8, 8] : [16, 16]}>
        {/* Left: Lead Pipeline Progression */}
        <Col xs={24} lg={15}>
          <ProCard
            bordered
            headerBordered
            size="small"
            style={{ borderRadius: 12, height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            title={
              <Space size={6} wrap>
                <div
                  style={{
                    background: "#f5f3ff",
                    borderRadius: 8,
                    padding: isMobile ? "3px 6px" : "4px 8px",
                    color: "#6366f1",
                    display: "inline-flex",
                    fontSize: isMobile ? 12 : 14,
                  }}
                >
                  <FundOutlined />
                </div>
                <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
                  Lead Pipeline Progression
                </Text>
                <Tag color="purple" style={{ borderRadius: 10, fontSize: 10, border: "none" }}>
                  {totalLeads} Total Leads
                </Tag>
              </Space>
            }
            extra={
              <Segmented
                size="small"
                value={pipelineMetric}
                onChange={(val) => setPipelineMetric(val as "count" | "value")}
                options={[
                  { label: isMobile ? "Count" : "Leads Count", value: "count", icon: isMobile ? undefined : <TeamOutlined /> },
                  { label: isMobile ? "Value" : "Deal Value", value: "value", icon: isMobile ? undefined : <DollarOutlined /> },
                ]}
              />
            }
            bodyStyle={{ padding: isMobile ? "10px 6px 6px" : "16px 14px 10px" }}
          >
            {pipelineLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : totalLeads === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No active pipeline leads in this period"
                style={{ padding: "32px 0" }}
              />
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 210 : 250}>
                <BarChart data={pipelineChartData} margin={{ top: 8, right: isMobile ? 8 : 16, left: isMobile ? -22 : -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="stage"
                    interval={0}
                    tick={{ fontSize: isMobile ? 9 : 10, fill: "#64748b" }}
                    tickFormatter={(val: string) => {
                      if (!isMobile) return val;
                      const compact: Record<string, string> = {
                        New: "New",
                        Contacted: "Cont.",
                        Qualified: "Qual.",
                        Proposal: "Prop.",
                        Negotiation: "Neg.",
                        Won: "Won",
                        Lost: "Lost",
                      };
                      return compact[val] || val.slice(0, 4);
                    }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (pipelineMetric === "value" ? fmtK(v) : `${v}`)}
                  />
                  <ReTooltip
                    formatter={(val: any, _: any, entry: any) => [
                      pipelineMetric === "value" ? fmtKES(Number(val)) : `${val} leads (Value: ${fmtKES(entry.payload.value)})`,
                      pipelineMetric === "value" ? "Estimated Value" : "Leads",
                    ]}
                    labelFormatter={(_label, payload) => {
                      if (payload && payload.length > 0) {
                        return payload[0].payload.stage;
                      }
                      return _label;
                    }}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Bar
                    dataKey={pipelineMetric === "value" ? "value" : "count"}
                    radius={[6, 6, 0, 0]}
                    barSize={isMobile ? 18 : 28}
                  >
                    {pipelineChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ProCard>
        </Col>

        {/* Right: Lead Sources */}
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
                    background: C.orangeLight,
                    borderRadius: 8,
                    padding: isMobile ? "3px 6px" : "4px 8px",
                    color: C.orange,
                    display: "inline-flex",
                    fontSize: isMobile ? 12 : 14,
                  }}
                >
                  <FireOutlined />
                </div>
                <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
                  Lead Sources
                </Text>
              </Space>
            }
            bodyStyle={{ padding: isMobile ? "10px 6px 6px" : "14px 12px 8px" }}
          >
            {pipelineLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : sourceRows.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No lead sources recorded"
                style={{ padding: "32px 0" }}
              />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sourceRows.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={isMobile ? 80 : 100} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <ReTooltip
                    formatter={(val: any, name: any, entry: any) =>
                      name === "Won"
                        ? [`${val} (${fmtKES(entry.payload.won_value)})`, "Won"]
                        : [`${val} · ${entry.payload.win_rate}% win rate`, "Leads"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="leads" name="Leads" fill={C.orange} radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="won" name="Won" fill={C.success} radius={[0, 4, 4, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ProCard>
        </Col>
      </Row>

      {/* Projects Row for Dala tenants */}
      {hasDala && projectRows.length > 0 && (
        <ProCard
          bordered
          headerBordered
          size="small"
          style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          title={
            <Space size={6}>
              <div
                style={{
                  background: C.purpleLight,
                  borderRadius: 8,
                  padding: "4px 8px",
                  color: C.purple,
                  display: "inline-flex",
                  fontSize: 14,
                }}
              >
                <ProjectOutlined />
              </div>
              <Text strong style={{ fontSize: 14 }}>
                Leads by Real Estate Project
              </Text>
            </Space>
          }
        >
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={projectRows.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
              <ReTooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="leads" name="Leads" fill={C.purple} radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="won" name="Won" fill={C.success} radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </ProCard>
      )}

      {/* ── Recent Leads Live Roster ── */}
      <ProCard
        bordered
        headerBordered
        size="small"
        style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        title={
          <Space size={6}>
            <div
              style={{
                background: C.blueLight,
                borderRadius: 8,
                padding: isMobile ? "3px 6px" : "4px 8px",
                color: C.blue,
                display: "inline-flex",
                fontSize: isMobile ? 12 : 14,
              }}
            >
              <TeamOutlined />
            </div>
            <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
              Recent Pipeline Leads
            </Text>
            <Tag color="blue" style={{ borderRadius: 10, fontSize: 10, border: "none" }}>
              {recentLeads.length} Recent
            </Tag>
          </Space>
        }
        bodyStyle={{ padding: isMobile ? "10px 8px" : "14px 16px" }}
      >
        {recentLeads.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No recent leads in this period" style={{ padding: "24px 0" }} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {recentLeads.slice(0, 8).map((l: any) => {
              const accent = stageColorMap[l.stage] || C.gray;
              const name = leadDisplayName(l);
              const owner = l.assigned_to?.name || l.assigned_to?.fullname || l.assigned_to?.username || "Unassigned";
              const details = [
                l.entity_type === "company" ? l.contact_person : l.company_name,
                formatSource(l.source),
                owner,
                hasDala ? l.project : undefined,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <HubRow
                  key={l._id}
                  accent={accent}
                  avatar={name[0].toUpperCase()}
                  title={name}
                  subtitle={details}
                  right={
                    <Space size={6}>
                      {l.estimated_value > 0 && (
                        <Text strong style={{ fontSize: 12, color: C.success }}>
                          {fmtKES(l.estimated_value)}
                        </Text>
                      )}
                      <Pill label={(l.stage || "new").toUpperCase()} color={accent} bg={accent + "18"} />
                    </Space>
                  }
                  rightSub={l.createdAt ? `Added ${dayjs(l.createdAt).fromNow()}` : undefined}
                  onClick={() => navTo("/crm/leads")}
                />
              );
            })}
          </div>
        )}
      </ProCard>
    </Space>
  );
};
