import React from "react";
import { Row, Col, Typography, Space, Tag, Table, Button } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  DollarOutlined,
  UserOutlined,
  ArrowRightOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fmtK } from "@utils/formatters";
import { fmt } from "./constants";

const { Text } = Typography;

interface SalesDealsTabProps {
  dashboardData: any;
  plChartData: any[];
  isMobile: boolean;
  isAdminLayout: boolean;
  primaryColor: string;
}

export const SalesDealsTab: React.FC<SalesDealsTabProps> = ({
  dashboardData,
  plChartData = [],
  isMobile,
  isAdminLayout,
  primaryColor,
}) => {
  const navigate = useNavigate();

  const recentSales = dashboardData?.recentSales || [];
  const topAgents = dashboardData?.topAgents || [];
  const salesStats = dashboardData?.salesStats || {};

  return (
    <div style={{ width: "100%" }}>
      {/* ── Top Row: Revenue Trend Line Chart + Top Agents Leaderboard ── */}
      <Row gutter={isMobile ? [12, 12] : [16, 16]} style={{ marginBottom: isMobile ? 12 : 16 }}>
        {/* Revenue Trend Line Chart */}
        <Col xs={24} lg={15}>
          <ProCard
            title={
              <Space size={8}>
                <RiseOutlined style={{ color: "#10b981" }} />
                <Text strong style={{ fontSize: 14 }}>
                  Revenue Trend Overview
                </Text>
              </Space>
            }
            bordered
            bodyStyle={{ paddingTop: 8 }}
            size="small"
          >
            <div style={{ height: isMobile ? 210 : 250, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={plChartData}
                  margin={
                    isMobile
                      ? { top: 10, right: 10, left: -20, bottom: 0 }
                      : { top: 10, right: 20, left: 0, bottom: 0 }
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                  <ReTooltip
                    formatter={(val: number) => [`KES ${fmt(val)}`, undefined]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Sales Revenue" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Rent Revenue" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="Total Revenue"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="4 4"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ProCard>
        </Col>

        {/* Top Agents Leaderboard */}
        <Col xs={24} lg={9}>
          <ProCard
            title={
              <Space size={8}>
                <UserOutlined style={{ color: "#6366f1" }} />
                <Text strong style={{ fontSize: 14 }}>
                  Top Performing Agents
                </Text>
                {topAgents.length > 0 && (
                  <Tag color="purple" style={{ borderRadius: 10, fontSize: 10, border: "none" }}>
                    {topAgents.length} Agents
                  </Tag>
                )}
              </Space>
            }
            bordered
            bodyStyle={{ paddingTop: 8 }}
            size="small"
          >
            <div style={{ maxHeight: 248, overflowY: "auto", paddingRight: 4 }}>
              {topAgents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontSize: 12 }}>
                  No agent activity recorded this period
                </div>
              ) : (
                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                  {topAgents.map((agent: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 8px",
                        background: "#f8fafc",
                        borderRadius: 6,
                        borderLeft: `3px solid ${primaryColor}`,
                      }}
                    >
                      <Space size={8} style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            background: "#ffffff",
                            borderRadius: "50%",
                            width: 26,
                            height: 26,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                            flexShrink: 0,
                          }}
                        >
                          <UserOutlined style={{ color: "#64748b", fontSize: 12 }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <Text style={{ fontSize: 11, fontWeight: 600, display: "block" }} ellipsis>
                            {agent.agentName || "Agent"}
                          </Text>
                          <Text style={{ fontSize: 10, color: "#94a3b8" }}>
                            {agent.totalSales || 0} sales · {agent.conversionRate?.toFixed(1) || 0}% conv
                          </Text>
                        </div>
                      </Space>
                      <Text strong style={{ fontSize: 12, color: "#10b981", marginLeft: 8 }}>
                        KES {fmtK(agent.totalSalesValue || 0)}
                      </Text>
                    </div>
                  ))}
                </Space>
              )}
            </div>
          </ProCard>
        </Col>
      </Row>

      {/* ── Bottom Row: Sales Pipeline Summary & Recent Sales ── */}
      <ProCard
        title={
          <Space size={8}>
            <DollarOutlined style={{ color: "#10b981" }} />
            <Text strong style={{ fontSize: 14 }}>
              Property Sales Pipeline
            </Text>
          </Space>
        }
        extra={
          !isAdminLayout ? (
            <Button
              type="link"
              size="small"
              onClick={() => navigate("/dala/sales")}
              style={{ fontSize: 12, padding: 0 }}
            >
              All Sales <ArrowRightOutlined />
            </Button>
          ) : undefined
        }
        bordered
        size="small"
        bodyStyle={{ paddingTop: 10 }}
      >
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={12} sm={6}>
            <div style={{ background: "#f0fdf4", padding: "8px 10px", borderRadius: 8, border: "1px solid #bbf7d0" }}>
              <Text style={{ fontSize: 11, color: "#166534" }}>Completed Revenue</Text>
              <Text strong style={{ fontSize: 15, color: "#10b981", display: "block", marginTop: 2 }}>
                KES {fmtK(salesStats?.completedRevenue || 0)}
              </Text>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ background: "#fff7ed", padding: "8px 10px", borderRadius: 8, border: "1px solid #fed7aa" }}>
              <Text style={{ fontSize: 11, color: "#9a3412" }}>Pending Revenue</Text>
              <Text strong style={{ fontSize: 15, color: "#f59e0b", display: "block", marginTop: 2 }}>
                KES {fmtK(salesStats?.pendingRevenue || 0)}
              </Text>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ background: "#eff6ff", padding: "8px 10px", borderRadius: 8, border: "1px solid #bfdbfe" }}>
              <Text style={{ fontSize: 11, color: "#1e40af" }}>Pending Sales</Text>
              <Text strong style={{ fontSize: 15, color: "#3b82f6", display: "block", marginTop: 2 }}>
                {dashboardData?.pendingSales || 0}
              </Text>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <Text style={{ fontSize: 11, color: "#475569" }}>Total Deals Count</Text>
              <Text strong style={{ fontSize: 15, color: "#0f172a", display: "block", marginTop: 2 }}>
                {dashboardData?.totalSales || 0}
              </Text>
            </div>
          </Col>
        </Row>

        <Table
          rowKey="_id"
          dataSource={recentSales}
          columns={[
            {
              title: "Property",
              dataIndex: "propertyName",
              width: 140,
              render: (v: string, record: any) => (
                <Space direction="vertical" size={0}>
                  <Text style={{ fontSize: 12, fontWeight: 600 }}>{v || "N/A"}</Text>
                  <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record.saleCode}</Text>
                </Space>
              ),
            },
            {
              title: "Client",
              dataIndex: "customerName",
              width: 130,
              render: (v: string) => <Text style={{ fontSize: 12 }}>{v || "N/A"}</Text>,
            },
            {
              title: "Amount",
              dataIndex: "salePrice",
              align: "right" as const,
              width: 110,
              render: (v: number) => (
                <Text strong style={{ fontSize: 12, color: "#1d39c4" }}>
                  KES {fmtK(v)}
                </Text>
              ),
            },
            {
              title: "Status",
              dataIndex: "status",
              width: 90,
              render: (status: string) => (
                <Tag
                  style={{
                    background:
                      status === "completed" ? "#f0fdf4" : status === "pending" ? "#fff7ed" : "#eff6ff",
                    color:
                      status === "completed" ? "#10b981" : status === "pending" ? "#f59e0b" : "#3b82f6",
                    border: "none",
                    fontSize: 10,
                    borderRadius: 4,
                  }}
                >
                  {status?.toUpperCase() || "-"}
                </Tag>
              ),
            },
          ]}
          pagination={{ pageSize: 5, size: "small" }}
          size="small"
          scroll={{ x: 480 }}
          locale={{ emptyText: "No recent sales recorded for this period" }}
        />
      </ProCard>
    </div>
  );
};
