import React, { useState } from "react";
import { Row, Col, Typography, Space, Button, Tag, Segmented, Skeleton, Empty, Progress, Avatar } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  AimOutlined,
  TrophyOutlined,
  UserOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  C,
  achievementColor,
  targetTimeLeft,
  TARGET_TYPE_LABELS,
  LIVE_TARGET_TYPES,
  fmtTargetValue,
} from "./constants";
import { Pill } from "./SharedUI";
import { fmtKES, fmtK } from "@utils/formatters";

const { Text } = Typography;

export interface TeamLeaderboardTabProps {
  targetsLoading: boolean;
  pipelineLoading: boolean;
  periodTargets: any[];
  targetsAchieved: number;
  leaderboard: any[];
  leadOwners: any[];
  isMobile: boolean;
  navTo: (path: string) => void;
}

export const TeamLeaderboardTab: React.FC<TeamLeaderboardTabProps> = ({
  targetsLoading,
  pipelineLoading,
  periodTargets,
  targetsAchieved,
  leaderboard,
  leadOwners,
  isMobile,
  navTo,
}) => {
  const [leaderMetric, setLeaderMetric] = useState<"won_value" | "won" | "target_pct">("won_value");

  const targetScopeLabel = (t: any) => {
    if (t.is_company_wide) return "Company-wide";
    if (t.user_id && typeof t.user_id === "object") {
      return t.user_id.fullname || t.user_id.username || "Staff";
    }
    return "Staff target";
  };

  // Sort leaderboard by active metric
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const valA = a[leaderMetric] ?? 0;
    const valB = b[leaderMetric] ?? 0;
    return valB - valA;
  });

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {/* ── Targets & Leaderboard Row ── */}
      <Row gutter={isMobile ? [8, 8] : [16, 16]}>
        {/* Sales Targets Card */}
        <Col xs={24} lg={12}>
          <ProCard
            bordered
            headerBordered
            size="small"
            style={{ borderRadius: 12, height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            title={
              <Space size={6} wrap>
                <div
                  style={{
                    background: C.tealLight,
                    borderRadius: 8,
                    padding: isMobile ? "3px 6px" : "4px 8px",
                    color: C.teal,
                    display: "inline-flex",
                    fontSize: isMobile ? 12 : 14,
                  }}
                >
                  <AimOutlined />
                </div>
                <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
                  Sales Targets
                </Text>
                {periodTargets.length > 0 && (
                  <Tag color="cyan" style={{ borderRadius: 10, fontSize: 10, border: "none" }}>
                    {targetsAchieved}/{periodTargets.length} achieved
                  </Tag>
                )}
              </Space>
            }
            bodyStyle={{ padding: isMobile ? "10px 10px" : "14px 16px" }}
          >
            {targetsLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : periodTargets.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No sales targets running in this period"
                style={{ padding: "28px 0" }}
              >
                <Button size="small" onClick={() => navTo("/crm/sales-targets")}>
                  Set a target
                </Button>
              </Empty>
            ) : (
              <div style={{ maxHeight: 310, overflowY: "auto", paddingRight: 4 }}>
                {periodTargets.map((t) => {
                  const p = t.achievement_percentage || 0;
                  const color = achievementColor(p);
                  const timeLeft = targetTimeLeft(t);
                  return (
                    <div key={t._id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <Space size={6} wrap>
                            <Text strong style={{ fontSize: 12 }}>
                              {t.name}
                            </Text>
                            {t.is_company_wide && (
                              <Tag icon={<GlobalOutlined />} color="blue" style={{ fontSize: 10, margin: 0, borderRadius: 4 }}>
                                Company-wide
                              </Tag>
                            )}
                            {t.is_achieved && <TrophyOutlined style={{ color: C.success }} />}
                            <Pill label={timeLeft.text.toUpperCase()} color={timeLeft.color} bg={timeLeft.color + "15"} />
                          </Space>
                          <Text style={{ fontSize: 11, color: C.subtext, display: "block" }}>
                            {TARGET_TYPE_LABELS[t.type] || t.type}
                            {!t.is_company_wide && ` · ${targetScopeLabel(t)}`}
                            {` · ${dayjs(t.period_start).format("D MMM")} – ${dayjs(t.period_end).format("D MMM YYYY")}`}
                            {!LIVE_TARGET_TYPES.includes(t.type) && " · manual"}
                          </Text>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <Text strong style={{ fontSize: 13, color }}>
                            {p.toFixed(1)}%
                          </Text>
                          <Text style={{ fontSize: 11, color: C.subtext, display: "block" }}>
                            {fmtTargetValue(t.actual_value, t.type)} / {fmtTargetValue(t.target_value, t.type)}
                          </Text>
                        </div>
                      </div>
                      <Progress
                        percent={Math.min(p, 100)}
                        showInfo={false}
                        size="small"
                        strokeColor={color}
                        trailColor="#e2e8f0"
                        style={{ margin: "4px 0 0" }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </ProCard>
        </Col>

        {/* Rep Leaderboard */}
        <Col xs={24} lg={12}>
          <ProCard
            bordered
            headerBordered
            size="small"
            style={{ borderRadius: 12, height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            title={
              <Space size={6}>
                <div
                  style={{
                    background: C.warningLight,
                    borderRadius: 8,
                    padding: isMobile ? "3px 6px" : "4px 8px",
                    color: C.warning,
                    display: "inline-flex",
                    fontSize: isMobile ? 12 : 14,
                  }}
                >
                  <TrophyOutlined />
                </div>
                <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
                  Team Leaderboard
                </Text>
              </Space>
            }
            extra={
              <Segmented
                size="small"
                value={leaderMetric}
                onChange={(v) => setLeaderMetric(v as any)}
                options={[
                  { label: isMobile ? "Value" : "Won Value", value: "won_value" },
                  { label: isMobile ? "Won" : "Deals Won", value: "won" },
                  { label: isMobile ? "Target" : "Target %", value: "target_pct" },
                ]}
              />
            }
            bodyStyle={{ padding: isMobile ? "8px 10px" : "12px 16px" }}
          >
            {pipelineLoading || targetsLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : sortedLeaderboard.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  leaderMetric === "target_pct"
                    ? "No individual sales targets recorded in this period"
                    : "No deals won by a team member in this period"
                }
                style={{ padding: "28px 0" }}
              />
            ) : (
              <div style={{ maxHeight: 310, overflowY: "auto", paddingRight: 4 }}>
                {sortedLeaderboard.map((e, i) => {
                  const value = e[leaderMetric] ?? 0;
                  const leaderValue = sortedLeaderboard[0][leaderMetric] ?? 0;
                  const medal = ["#f59e0b", "#94a3b8", "#c2410c"][i];
                  return (
                    <div
                      key={e.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "7px 0",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: medal ? medal + "20" : "#f1f5f9",
                          color: medal || C.gray,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {medal ? <TrophyOutlined /> : i + 1}
                      </div>
                      <Avatar size={28} style={{ background: C.blueLight, color: C.blue, fontSize: 12, flexShrink: 0 }}>
                        {(e.name || "?")[0].toUpperCase()}
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <Text strong style={{ fontSize: 12 }} ellipsis>
                            {e.name}
                          </Text>
                          <Text strong style={{ fontSize: 12, color: medal || C.text, flexShrink: 0 }}>
                            {leaderMetric === "won_value"
                              ? fmtKES(value)
                              : leaderMetric === "target_pct"
                              ? `${value.toFixed(1)}%`
                              : `${value} won`}
                          </Text>
                        </div>
                        <Progress
                          percent={leaderMetric === "target_pct" ? Math.min(value, 100) : leaderValue ? (value / leaderValue) * 100 : 0}
                          showInfo={false}
                          size="small"
                          trailColor="#e2e8f0"
                          strokeColor={leaderMetric === "target_pct" ? achievementColor(value) : medal || C.blue}
                          style={{ margin: "2px 0 0" }}
                        />
                        <Text style={{ fontSize: 10, color: C.subtext }}>
                          {e.won} won of {e.leads} lead{e.leads === 1 ? "" : "s"} · {e.win_rate}% win rate
                          {e.targets > 0 && ` · ${e.targets} target${e.targets === 1 ? "" : "s"}`}
                        </Text>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ProCard>
        </Col>
      </Row>

      {/* ── Team Performance Grid ── */}
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
              <UserOutlined />
            </div>
            <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
              Team Sales Rep Performance
            </Text>
            <Tag color="geekblue" style={{ borderRadius: 10, fontSize: 10, border: "none" }}>
              {leadOwners.length} Reps
            </Tag>
          </Space>
        }
        bodyStyle={{ padding: isMobile ? "10px 8px" : "14px 16px" }}
      >
        {pipelineLoading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : leadOwners.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No rep performance data in this period" style={{ padding: "24px 0" }} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {leadOwners.map((o) => {
              const assigned = !!o.user_id;
              const accent = assigned ? C.blue : C.gray;
              return (
                <div
                  key={o.user_id || "unassigned"}
                  style={{
                    border: `1px solid ${assigned ? "#e2e8f0" : "#f1f5f9"}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    background: assigned ? "#ffffff" : "#f8fafc",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Avatar
                      size={32}
                      style={{
                        background: assigned ? C.blueLight : "#e2e8f0",
                        color: accent,
                        fontSize: 13,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {assigned ? (o.name || "?")[0].toUpperCase() : <UserOutlined />}
                    </Avatar>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text strong style={{ fontSize: 13, color: assigned ? C.text : C.subtext, display: "block" }} ellipsis>
                        {o.name}
                      </Text>
                      <Text style={{ fontSize: 15, fontWeight: 700, color: o.won_value ? C.success : C.subtext }}>
                        {o.won_value ? fmtKES(o.won_value) : "No wins yet"}
                      </Text>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <Text style={{ fontSize: 10, color: C.subtext }}>Win rate</Text>
                    <Text style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{o.win_rate}%</Text>
                  </div>
                  <Progress percent={o.win_rate} showInfo={false} size="small" strokeColor={C.success} trailColor="#e2e8f0" style={{ margin: 0 }} />

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    <Pill label={`${o.leads} LEAD${o.leads === 1 ? "" : "S"}`} color={accent} bg={accent + "15"} />
                    <Pill label={`${o.won} WON`} color={o.won ? C.success : C.gray} bg={(o.won ? C.success : C.gray) + "15"} />
                    {o.pipeline_value > 0 && (
                      <Pill label={`${fmtK(o.pipeline_value)} PIPELINE`} color={C.purple} bg={C.purpleLight} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ProCard>
    </Space>
  );
};
