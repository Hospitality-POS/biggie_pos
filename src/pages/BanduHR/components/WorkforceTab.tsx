import React, { useState } from "react";
import { Row, Col, Typography, Space, Segmented } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  RiseOutlined,
  FallOutlined,
  SwapOutlined,
  FieldTimeOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  Line,
  ComposedChart,
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
  DEPARTMENT_COLORS,
  STATUS_COLORS,
  GENDER_COLORS,
  EMPLOYMENT_TYPE_COLORS,
  titleCase,
} from "./constants";
import { StatTile, EmptyState } from "./SharedUI";

const { Text } = Typography;

export interface WorkforceTabProps {
  workforce?: {
    hires_in_period?: number;
    exits_in_period?: number;
    turnover_rate?: number;
    average_tenure_years?: number;
    headcount_trend?: Array<{
      label: string;
      hires: number;
      exits: number;
      headcount: number;
    }>;
    tenure_bands?: Array<{ band: string; count: number }>;
    employment_types?: Array<{ type: string; count: number }>;
  };
  employeeStats: {
    new_hires_this_month: number;
    resigned?: number;
    terminated?: number;
    active_employees: number;
    on_leave?: number;
    suspended?: number;
  };
  departmentsTotal?: number;
  employeesByDepartment?: Array<{
    department?: string;
    count?: number;
    active?: number;
    on_leave?: number;
  }>;
  genderBreakdown?: {
    male: number;
    female: number;
    other: number;
    prefer_not_to_say: number;
    not_specified: number;
  };
  isMobile: boolean;
}

export const WorkforceTab: React.FC<WorkforceTabProps> = ({
  workforce,
  employeeStats,
  departmentsTotal,
  employeesByDepartment,
  genderBreakdown,
  isMobile,
}) => {
  const [demographicsMode, setDemographicsMode] = useState<string>("status");

  // Chart data
  const headcountData = (workforce?.headcount_trend || []).map((m) => ({
    name: m.label,
    Hires: m.hires,
    Exits: m.exits,
    Headcount: m.headcount,
  }));

  const MAX_DEPT_BARS = 6;
  const departmentBarData = (() => {
    const rows = [...(employeesByDepartment || [])]
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .map((item, index) => ({
        name: item.department || "Unassigned",
        Total: item.count ?? 0,
        Active: item.active ?? 0,
        "On Leave": item.on_leave ?? 0,
        color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
      }));
    if (rows.length <= MAX_DEPT_BARS) return rows;
    const head = rows.slice(0, MAX_DEPT_BARS - 1);
    const rest = rows.slice(MAX_DEPT_BARS - 1);
    return [
      ...head,
      {
        name: `Other (${rest.length} depts)`,
        Total: rest.reduce((s, r) => s + r.Total, 0),
        Active: rest.reduce((s, r) => s + r.Active, 0),
        "On Leave": rest.reduce((s, r) => s + r["On Leave"], 0),
        color: "#94a3b8",
      },
    ];
  })();

  const deptLabelWidth = isMobile ? 85 : 120;
  const DeptTick = ({ x, y, payload }: any) => {
    const full = String(payload?.value ?? "");
    const maxChars = Math.floor(deptLabelWidth / 7);
    const short = full.length > maxChars ? `${full.slice(0, maxChars - 1).trimEnd()}…` : full;
    return (
      <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="#64748b">
        <title>{full}</title>
        {short}
      </text>
    );
  };

  const statusPieData = [
    { key: "active", name: "Active", value: employeeStats.active_employees || 0 },
    { key: "on_leave", name: "On Leave", value: employeeStats.on_leave || 0 },
    { key: "suspended", name: "Suspended", value: employeeStats.suspended || 0 },
    { key: "terminated", name: "Terminated", value: employeeStats.terminated || 0 },
    { key: "resigned", name: "Resigned", value: employeeStats.resigned || 0 },
  ]
    .map((s) => ({ ...s, color: STATUS_COLORS[s.key] }))
    .filter((s) => s.value > 0);

  const employmentTypeData = (workforce?.employment_types || [])
    .filter((t) => t.count > 0)
    .map((t, i) => ({
      name: titleCase(t.type),
      value: t.count,
      color: EMPLOYMENT_TYPE_COLORS[i % EMPLOYMENT_TYPE_COLORS.length],
    }));

  const tenureData = (workforce?.tenure_bands || []).map((b) => ({ name: b.band, Employees: b.count }));

  const genderPieData = genderBreakdown
    ? [
        { name: "Male", value: genderBreakdown.male, color: GENDER_COLORS.male },
        { name: "Female", value: genderBreakdown.female, color: GENDER_COLORS.female },
        { name: "Other", value: genderBreakdown.other, color: GENDER_COLORS.other },
        { name: "Prefer not to say", value: genderBreakdown.prefer_not_to_say, color: GENDER_COLORS.prefer_not_to_say },
        { name: "Not specified", value: genderBreakdown.not_specified, color: GENDER_COLORS.not_specified },
      ].filter((item) => item.value > 0)
    : [];

  const renderDonut = (rows: { name: string; value: number; color: string }[], emptyText: string) =>
    rows.length > 0 ? (
      <div>
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
              {rows.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <ReTooltip formatter={(v: any, name: any) => [v, name]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 8, maxHeight: 95, overflowY: "auto" }}>
          {rows.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <Space size={6}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                <Text style={{ fontSize: 11, color: "#64748b" }}>{e.name}</Text>
              </Space>
              <Text style={{ fontSize: 11, fontWeight: 600 }}>{e.value}</Text>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <EmptyState text={emptyText} height={230} />
    );

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {/* ── Workforce Health Stat Tiles ── */}
      <Row gutter={isMobile ? [8, 8] : [12, 12]}>
        <Col xs={12} sm={6}>
          <StatTile
            label="New Hires"
            value={workforce?.hires_in_period || 0}
            hint={`${employeeStats.new_hires_this_month} this month`}
            icon={<RiseOutlined />}
            color="#10b981"
            tooltip="Employees hired in the selected period"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatTile
            label="Exits"
            value={workforce?.exits_in_period || 0}
            hint={`${employeeStats.resigned || 0} resigned · ${employeeStats.terminated || 0} terminated`}
            icon={<FallOutlined />}
            color="#ef4444"
            tooltip="Employees who resigned or were terminated in this period"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatTile
            label="Turnover Rate"
            value={`${((workforce?.turnover_rate || 0) * 100).toFixed(1)}%`}
            hint="Exits ÷ workforce"
            icon={<SwapOutlined />}
            color="#f97316"
            tooltip="Exits in period divided by workforce plus exits"
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatTile
            label="Average Tenure"
            value={`${(workforce?.average_tenure_years || 0).toFixed(1)} yrs`}
            hint={`${departmentsTotal || 0} departments`}
            icon={<FieldTimeOutlined />}
            color="#8b5cf6"
            tooltip="Average tenure across current staff"
          />
        </Col>
      </Row>

      {/* ── Hires vs Exits & Department Bar Charts ── */}
      <Row gutter={[16, 16]}>
        {/* Hires vs Exits */}
        <Col xs={24} lg={14}>
          <ProCard
            title={<Text strong>Hires vs Exits — Last 6 Months</Text>}
            bordered
            size="small"
            bodyStyle={{ paddingTop: 8 }}
          >
            {headcountData.length > 0 ? (
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 260}>
                <ComposedChart data={headcountData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <ReTooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="Hires" fill="#10b981" radius={[3, 3, 0, 0]} barSize={14} />
                  <Bar yAxisId="left" dataKey="Exits" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={14} />
                  <Line yAxisId="right" type="monotone" dataKey="Headcount" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No hire or exit data recorded" height={260} />
            )}
          </ProCard>
        </Col>

        {/* Department Breakdown */}
        <Col xs={24} lg={10}>
          <ProCard
            title={<Text strong>Department Distribution</Text>}
            bordered
            size="small"
            bodyStyle={{ paddingTop: 8 }}
          >
            {departmentBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 260}>
                <BarChart
                  data={departmentBarData}
                  layout="vertical"
                  barCategoryGap="24%"
                  margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={deptLabelWidth}
                    interval={0}
                    tick={<DeptTick />}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReTooltip
                    formatter={(val: any) => [val, undefined]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Active" fill="#10b981" radius={[0, 3, 3, 0]} stackId="a" />
                  <Bar dataKey="On Leave" fill="#f59e0b" radius={[0, 3, 3, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No department data available" height={260} />
            )}
          </ProCard>
        </Col>
      </Row>

      {/* ── Demographics & Distribution Hub ── */}
      <ProCard
        title={<Text strong>Demographics & Workforce Mix</Text>}
        bordered
        size="small"
        bodyStyle={{ paddingTop: 8 }}
        extra={
          <Segmented
            size="small"
            value={demographicsMode}
            onChange={(v) => setDemographicsMode(v as string)}
            options={[
              { label: "Status Mix", value: "status" },
              { label: "Employment Type", value: "type" },
              { label: "Tenure Bands", value: "tenure" },
              { label: "Gender Mix", value: "gender" },
            ]}
          />
        }
      >
        <div style={{ minHeight: 220 }}>
          {demographicsMode === "status" && renderDonut(statusPieData, "No status data available")}
          {demographicsMode === "type" && renderDonut(employmentTypeData, "No employment type data recorded")}
          {demographicsMode === "gender" && renderDonut(genderPieData, "No gender data recorded")}
          {demographicsMode === "tenure" &&
            (tenureData.some((t) => t.Employees > 0) ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={tenureData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <ReTooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="Employees" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No hire dates recorded" height={230} />
            ))}
        </div>
      </ProCard>
    </Space>
  );
};
