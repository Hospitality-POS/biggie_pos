import React from "react";
import { Row, Col, Typography, Space, Tag, Progress, Badge } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  WalletOutlined,
  DollarOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  STATUTORY_ITEMS,
  PIPELINE_STAGES,
  fmt,
} from "./constants";
import { StatTile, EmptyState } from "./SharedUI";
import { fmtK } from "@utils/formatters";
import type { HRDashboardData } from "@services/bandu/dashboard";

const { Text } = Typography;

export interface PayrollTabProps {
  payrollStats: {
    salary_bill?: number;
    average_basic_salary?: number;
    total_deductions?: number;
    pending_runs?: number;
    pending_payroll?: number;
    net_pay?: number;
    total_payroll_this_month?: number;
  };
  payrollTrend?: Array<{
    label: string;
    gross_pay: number;
    deductions: number;
    net_pay: number;
  }>;
  statutory?: HRDashboardData["statutory"];
  payrollPipeline?: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  formattedDateRange: string;
  isMobile: boolean;
}

export const PayrollTab: React.FC<PayrollTabProps> = ({
  payrollStats,
  payrollTrend,
  statutory,
  payrollPipeline,
  formattedDateRange,
  isMobile,
}) => {
  const payrollChartData = (payrollTrend || []).map((m) => ({
    name: m.label,
    "Gross Pay": m.gross_pay,
    Deductions: m.deductions,
    "Net Pay": m.net_pay,
  }));

  const statutoryData = STATUTORY_ITEMS.map((s) => ({ ...s, value: statutory?.[s.key] || 0 })).filter(
    (s) => s.value > 0
  );
  const statutoryTotal = statutoryData.reduce((s, i) => s + i.value, 0);

  const pipeline = payrollPipeline || [];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {/* ── Payroll Health Stat Tiles ── */}
      <Row gutter={isMobile ? [8, 8] : [12, 12]}>
        <Col xs={24} sm={8}>
          <StatTile
            label="Monthly Salary Bill"
            value={`KES ${fmtK(payrollStats.salary_bill || 0)}`}
            hint={`Avg basic KES ${fmtK(payrollStats.average_basic_salary || 0)}`}
            icon={<WalletOutlined />}
            color="#6366f1"
            tooltip="Sum of basic salaries of active employees before allowances and deductions"
          />
        </Col>
        <Col xs={12} sm={8}>
          <StatTile
            label="Total Deductions"
            value={`KES ${fmtK(payrollStats.total_deductions || 0)}`}
            hint={`Statutory: KES ${fmtK(statutoryTotal)}`}
            icon={<DollarOutlined />}
            color="#ef4444"
            tooltip="Total deductions in the period"
          />
        </Col>
        <Col xs={12} sm={8}>
          <StatTile
            label="Pending Payroll Runs"
            value={`${payrollStats.pending_runs || 0} runs`}
            hint={`KES ${fmtK(payrollStats.pending_payroll || 0)} pending`}
            icon={<AuditOutlined />}
            color="#f59e0b"
            tooltip="Unapproved or unpaid payroll runs"
          />
        </Col>
      </Row>

      {/* ── Payroll Trend & Pipeline ── */}
      <Row gutter={[16, 16]}>
        {/* Trend (Last 6 Months) */}
        <Col xs={24} lg={14}>
          <ProCard
            title={<Text strong>Payroll Trend — Last 6 Months</Text>}
            bordered
            bodyStyle={{ paddingTop: 8 }}
            size="small"
            extra={
              isMobile ? undefined : (
                <Tag color="purple" style={{ fontSize: 11 }}>
                  Unpaid: KES {fmtK(payrollStats.pending_payroll || 0)}
                </Tag>
              )
            }
          >
            {payrollChartData.every((m) => !m["Gross Pay"]) ? (
              <EmptyState text="No approved payroll in the last 6 months" height={260} />
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 260}>
                <LineChart
                  data={payrollChartData}
                  margin={isMobile ? { top: 10, right: 10, left: -20, bottom: 0 } : { top: 10, right: 15, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtK(v)} />
                  <ReTooltip
                    formatter={(val: any) => `KES ${fmt(val || 0)}`}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Gross Pay" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Deductions" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Net Pay" stroke="#6366f1" strokeWidth={2.5} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ProCard>
        </Col>

        {/* Pipeline */}
        <Col xs={24} lg={10}>
          <ProCard
            title={<Text strong>Payroll Pipeline — Last 6 Months</Text>}
            bordered
            size="small"
            style={{ height: "100%" }}
            extra={
              (payrollStats.pending_runs || 0) > 0 ? (
                <Tag color="orange" style={{ fontSize: 11, margin: 0 }}>
                  {payrollStats.pending_runs} unpaid run{payrollStats.pending_runs === 1 ? "" : "s"}
                </Tag>
              ) : undefined
            }
          >
            {pipeline.some((p) => p.count > 0) ? (
              <Space direction="vertical" size={12} style={{ width: "100%", paddingTop: 8 }}>
                {pipeline.map((p) => {
                  const cfg = PIPELINE_STAGES[p.status] || { label: p.status, color: "#94a3b8" };
                  const maxCount = Math.max(...pipeline.map((x) => x.count), 1);
                  return (
                    <div key={p.status}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <Space size={6}>
                          <Badge color={cfg.color} />
                          <Text style={{ fontSize: 12 }}>{cfg.label}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {p.count} run{p.count === 1 ? "" : "s"}
                          </Text>
                        </Space>
                        <Text style={{ fontSize: 12, fontWeight: 600 }}>KES {fmtK(p.amount)}</Text>
                      </div>
                      <Progress
                        percent={Math.round((p.count / maxCount) * 100)}
                        strokeColor={cfg.color}
                        size="small"
                        showInfo={false}
                        style={{ margin: 0 }}
                      />
                    </div>
                  );
                })}
              </Space>
            ) : (
              <EmptyState text="No payroll runs in the last 6 months" height={220} />
            )}
          </ProCard>
        </Col>
      </Row>

      {/* ── Statutory Deductions Hub ── */}
      <ProCard
        title={<Text strong>Statutory Deductions Breakdown</Text>}
        bordered
        size="small"
        extra={
          <Tag color="geekblue" style={{ fontSize: 11, margin: 0 }}>
            Total KES {fmtK(statutoryTotal)} · {formattedDateRange}
          </Tag>
        }
      >
        {statutoryData.length > 0 ? (
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} md={10}>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={statutoryData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={78} innerRadius={48}>
                    {statutoryData.map((s) => (
                      <Cell key={s.key} fill={s.color} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(v: any) => `KES ${fmt(v || 0)}`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Col>
            <Col xs={24} md={14}>
              <Row gutter={[16, 12]}>
                {statutoryData.map((s) => (
                  <Col span={12} key={s.key}>
                    <div style={{ marginBottom: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <Space size={6}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                          <Text style={{ fontSize: 12, color: "#475569" }}>{s.label}</Text>
                        </Space>
                        <Text style={{ fontSize: 12, fontWeight: 600 }}>KES {fmt(s.value)}</Text>
                      </div>
                      <Progress
                        percent={statutoryTotal ? Math.round((s.value / statutoryTotal) * 100) : 0}
                        strokeColor={s.color}
                        size="small"
                        showInfo={false}
                        style={{ margin: 0 }}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            </Col>
          </Row>
        ) : (
          <EmptyState text="No approved payroll statutory deductions in this period" height={190} />
        )}
      </ProCard>
    </Space>
  );
};
