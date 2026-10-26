import React, { useMemo } from "react";
import { ProCard } from "@ant-design/pro-components";
import { Typography, Space, Skeleton, Empty, Table, Row, Col, Progress } from "antd";
import { ApartmentOutlined, ArrowUpOutlined, ArrowDownOutlined, ShopOutlined } from "@ant-design/icons";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { fmtK } from "@utils/formatters";

const { Text } = Typography;

export interface BranchStat {
  shop_id: string;
  name: string;
  sales: number;
  transactions: number;
  avgSale: number;
  previousSales: number;
  previousTransactions: number;
  changePct: number | null;
  sharePct: number;
}

interface BranchComparisonProps {
  branches: BranchStat[];
  loading: boolean;
  dateRange: string;
  primaryColor: string;
  isMobile?: boolean;
  onBranchClick?: (shopId: string) => void;
}

const POSITIVE = "#16a34a";
const NEGATIVE = "#dc2626";
const MUTED = "#94a3b8";

const ChangeTag: React.FC<{ value: number | null }> = ({ value }) => {
  if (value === null) return <Text style={{ fontSize: 12, color: MUTED }}>New</Text>;
  const up = value >= 0;
  return (
    <Text style={{ fontSize: 12, fontWeight: 600, color: up ? POSITIVE : NEGATIVE }}>
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(value).toFixed(1)}%
    </Text>
  );
};

const cardStyle: React.CSSProperties = {
  borderRadius: 12,
  height: "100%",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const CardTitle: React.FC<{ title: string; primaryColor: string }> = ({ title, primaryColor }) => (
  <Space size={8}>
    <div
      style={{
        background: `${primaryColor}15`,
        borderRadius: 8,
        padding: "4px 8px",
        color: primaryColor,
        display: "inline-flex",
      }}
    >
      <ApartmentOutlined />
    </div>
    <Text strong style={{ fontSize: 14 }}>
      {title}
    </Text>
  </Space>
);

const DashboardBranchComparison: React.FC<BranchComparisonProps> = ({
  branches,
  loading,
  dateRange,
  primaryColor,
  isMobile = false,
  onBranchClick,
}) => {
  const chartData = useMemo(
    () =>
      branches.slice(0, 8).map((b) => ({
        name: b.name.length > 12 ? `${b.name.slice(0, 11)}…` : b.name,
        fullName: b.name,
        sales: b.sales,
        change: b.changePct === null ? null : Number(b.changePct.toFixed(1)),
      })),
    [branches]
  );

  const hasSales = branches.some((b) => b.sales > 0 || b.previousSales > 0);

  const columns = [
    {
      title: "Branch",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <Space size={8}>
          <div
            style={{
              background: `${primaryColor}15`,
              color: primaryColor,
              borderRadius: 6,
              padding: "2px 6px",
              display: "inline-flex",
            }}
          >
            <ShopOutlined />
          </div>
          <Text strong style={{ fontSize: 13 }}>
            {name}
          </Text>
        </Space>
      ),
    },
    {
      title: "Sales (Ksh)",
      dataIndex: "sales",
      key: "sales",
      align: "right" as const,
      sorter: (a: BranchStat, b: BranchStat) => a.sales - b.sales,
      render: (v: number) => <Text style={{ fontSize: 13 }}>{Math.round(v).toLocaleString()}</Text>,
    },
    {
      title: "vs Prev. Period",
      dataIndex: "changePct",
      key: "changePct",
      align: "right" as const,
      sorter: (a: BranchStat, b: BranchStat) => (a.changePct ?? -Infinity) - (b.changePct ?? -Infinity),
      render: (v: number | null) => <ChangeTag value={v} />,
    },
    {
      title: "Transactions",
      dataIndex: "transactions",
      key: "transactions",
      align: "right" as const,
      sorter: (a: BranchStat, b: BranchStat) => a.transactions - b.transactions,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: "Avg. Sale (Ksh)",
      dataIndex: "avgSale",
      key: "avgSale",
      align: "right" as const,
      sorter: (a: BranchStat, b: BranchStat) => a.avgSale - b.avgSale,
      render: (v: number) => Math.round(v).toLocaleString(),
    },
    {
      title: "Share",
      dataIndex: "sharePct",
      key: "sharePct",
      width: 140,
      render: (v: number) => (
        <Progress percent={Number(v.toFixed(1))} size="small" strokeColor={primaryColor} format={(p) => `${p}%`} />
      ),
    },
  ];

  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      <Col xs={24} lg={10}>
        <ProCard
          bordered
          headerBordered
          size="small"
          style={cardStyle}
          title={<CardTitle title="Branch Performance" primaryColor={primaryColor} />}
          extra={<Text style={{ fontSize: 11, color: "#64748b" }}>{dateRange}</Text>}
          bodyStyle={{ padding: isMobile ? "10px 6px 6px" : "16px 12px 10px" }}
        >
          {loading ? (
            <Skeleton active paragraph={{ rows: 5 }} />
          ) : !hasSales ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No branch sales in this period"
              style={{ padding: "32px 0" }}
            />
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 290}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#334155" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  yAxisId="sales"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmtK(v)}
                  width={44}
                />
                <YAxis
                  yAxisId="change"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  width={40}
                />
                <ReferenceLine yAxisId="change" y={0} stroke="#e2e8f0" />
                <ReTooltip
                  labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.fullName || ""}
                  formatter={(value: any, key: any) =>
                    key === "Sales (Ksh)"
                      ? [`Ksh ${Number(value).toLocaleString()}`, key]
                      : [value === null ? "—" : `${value}%`, key]
                  }
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: 12,
                  }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="sales"
                  dataKey="sales"
                  name="Sales (Ksh)"
                  fill={primaryColor}
                  radius={[4, 4, 0, 0]}
                  barSize={isMobile ? 20 : 32}
                />
                <Line
                  yAxisId="change"
                  dataKey="change"
                  name="vs Prev. Period (%)"
                  stroke={MUTED}
                  strokeWidth={2}
                  dot={{ r: 4, fill: MUTED }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ProCard>
      </Col>

      <Col xs={24} lg={14}>
        <ProCard
          bordered
          headerBordered
          size="small"
          style={cardStyle}
          title={<CardTitle title="Branch Comparison" primaryColor={primaryColor} />}
          extra={<Text style={{ fontSize: 11, color: "#64748b" }}>{branches.length} branches</Text>}
          bodyStyle={{ padding: 0 }}
        >
          {loading ? (
            <div style={{ padding: 16 }}>
              <Skeleton active paragraph={{ rows: 5 }} />
            </div>
          ) : (
            <Table<BranchStat>
              columns={columns}
              dataSource={branches}
              rowKey="shop_id"
              size="small"
              pagination={branches.length > 6 ? { pageSize: 6, showSizeChanger: false } : false}
              scroll={{ x: 640 }}
              onRow={(record) => ({
                onClick: onBranchClick ? () => onBranchClick(record.shop_id) : undefined,
                style: onBranchClick ? { cursor: "pointer" } : undefined,
              })}
              locale={{ emptyText: "No branches found" }}
            />
          )}
        </ProCard>
      </Col>
    </Row>
  );
};

export default DashboardBranchComparison;
