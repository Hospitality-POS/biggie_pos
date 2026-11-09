import React from "react";
import { Row, Col, Typography, Space, Tag, Button, Progress } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  HomeOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  AppstoreOutlined,
  BuildOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";

const { Text } = Typography;

interface PortfolioUnitsTabProps {
  dashboardData: any;
  isMobile: boolean;
  isAdminLayout: boolean;
  primaryColor: string;
}

export const PortfolioUnitsTab: React.FC<PortfolioUnitsTabProps> = ({
  dashboardData,
  isMobile,
  isAdminLayout,
  primaryColor,
}) => {
  const navigate = useNavigate();

  const totalUnits = dashboardData?.totalUnits || dashboardData?.totalProperties || 0;
  const availableUnits = dashboardData?.availableUnits || 0;
  const occupiedUnits = dashboardData?.leasedProperties || 0;
  const soldUnits = dashboardData?.soldProperties || 0;
  const occupancyRate = dashboardData?.occupancyRate || 0;

  const unitStatusData = [
    { name: "Available", value: availableUnits, color: "#10b981" },
    { name: "Occupied", value: occupiedUnits, color: "#3b82f6" },
    { name: "Sold", value: soldUnits, color: "#f59e0b" },
  ].filter((item) => item.value > 0);

  const propertyTypes = dashboardData?.propertyTypes || [];

  return (
    <div style={{ width: "100%" }}>
      {/* ── Top Deck: Capacity & Portfolio Allocation Mini-Cards ── */}
      <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
        <Col xs={12} sm={6}>
          <div
            style={{
              background: "#eff6ff",
              borderRadius: 10,
              padding: "12px 14px",
              border: "1px solid #bfdbfe",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: "#1e40af", fontWeight: 600 }}>Total Units</Text>
              <HomeOutlined style={{ color: "#3b82f6" }} />
            </div>
            <Text strong style={{ fontSize: 18, color: "#1e3a8a", display: "block", marginTop: 4 }}>
              {totalUnits} Units
            </Text>
            <Text style={{ fontSize: 10, color: "#64748b" }}>
              {dashboardData?.totalProperties || 0} registered properties
            </Text>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div
            style={{
              background: "#f0fdf4",
              borderRadius: 10,
              padding: "12px 14px",
              border: "1px solid #bbf7d0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>Available Units</Text>
              <CheckCircleOutlined style={{ color: "#10b981" }} />
            </div>
            <Text strong style={{ fontSize: 18, color: "#14532d", display: "block", marginTop: 4 }}>
              {availableUnits} Ready
            </Text>
            <Text style={{ fontSize: 10, color: "#64748b" }}>
              {dashboardData?.propertiesForSale || 0} for sale · {dashboardData?.propertiesForLease || 0} for lease
            </Text>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div
            style={{
              background: "#eef2ff",
              borderRadius: 10,
              padding: "12px 14px",
              border: "1px solid #c7d2fe",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: "#3730a3", fontWeight: 600 }}>Occupancy Rate</Text>
              <AppstoreOutlined style={{ color: "#6366f1" }} />
            </div>
            <Text strong style={{ fontSize: 18, color: "#312e81", display: "block", marginTop: 4 }}>
              {occupancyRate}%
            </Text>
            <Text style={{ fontSize: 10, color: "#64748b" }}>
              {occupiedUnits} currently tenanted
            </Text>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div
            style={{
              background: "#fffbeb",
              borderRadius: 10,
              padding: "12px 14px",
              border: "1px solid #fde68a",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: "#92400e", fontWeight: 600 }}>Sold Properties</Text>
              <BuildOutlined style={{ color: "#f59e0b" }} />
            </div>
            <Text strong style={{ fontSize: 18, color: "#78350f", display: "block", marginTop: 4 }}>
              {soldUnits} Units
            </Text>
            <Text style={{ fontSize: 10, color: "#64748b" }}>
              {dashboardData?.completedSales || 0} completed sales
            </Text>
          </div>
        </Col>
      </Row>

      {/* ── Main Row: Unit Status Donut + Property Types & Allocation ── */}
      <Row gutter={isMobile ? [12, 12] : [16, 16]}>
        {/* Unit Status Donut */}
        <Col xs={24} lg={12}>
          <ProCard
            title={
              <Space size={8}>
                <Text strong style={{ fontSize: 14 }}>
                  Unit Status Breakdown
                </Text>
                <Tag color="blue" style={{ borderRadius: 10, fontSize: 11, border: "none" }}>
                  {totalUnits} Total
                </Tag>
              </Space>
            }
            bordered
            size="small"
            bodyStyle={{ paddingTop: 10 }}
          >
            {unitStatusData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={unitStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={44}
                      paddingAngle={3}
                    >
                      {unitStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <ReTooltip
                      formatter={(v: any, name: any) => [`${v} units`, name]}
                      contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div style={{ marginTop: 8, paddingRight: 4 }}>
                  {unitStatusData.map((e, i) => {
                    const pct = totalUnits > 0 ? ((e.value / totalUnits) * 100).toFixed(1) : "0.0";
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 8px",
                          borderRadius: 6,
                          marginBottom: 4,
                          background: i % 2 === 0 ? "#f8fafc" : "#ffffff",
                        }}
                      >
                        <Space size={8}>
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: e.color,
                              flexShrink: 0,
                            }}
                          />
                          <Text style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>
                            {e.name}
                          </Text>
                        </Space>
                        <Space size={8}>
                          <Tag
                            style={{
                              fontSize: 10,
                              margin: 0,
                              padding: "0 6px",
                              borderRadius: 4,
                              background: "#f1f5f9",
                              border: "none",
                            }}
                          >
                            {pct}%
                          </Tag>
                          <Text strong style={{ fontSize: 12, color: "#0f172a" }}>
                            {e.value} units
                          </Text>
                        </Space>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "50px 0", color: "#94a3b8", fontSize: 12 }}>
                No unit status data available
              </div>
            )}
          </ProCard>
        </Col>

        {/* Property Types & Portfolio Distribution */}
        <Col xs={24} lg={12}>
          <ProCard
            title={
              <Space size={8}>
                <Text strong style={{ fontSize: 14 }}>
                  Portfolio Allocation & Categories
                </Text>
              </Space>
            }
            extra={
              !isAdminLayout ? (
                <Space size="small">
                  <Button
                    type="link"
                    size="small"
                    onClick={() => navigate("/dala/properties")}
                    style={{ fontSize: 12, padding: 0 }}
                  >
                    Properties <ArrowRightOutlined />
                  </Button>
                </Space>
              ) : undefined
            }
            bordered
            size="small"
            bodyStyle={{ paddingTop: 10 }}
          >
            {propertyTypes.length > 0 ? (
              <Space direction="vertical" size={10} style={{ width: "100%" }}>
                {propertyTypes.map((item: any, i: number) => {
                  const pct = totalUnits > 0 ? Math.round((item.count / totalUnits) * 100) : 0;
                  return (
                    <div
                      key={i}
                      style={{
                        padding: "10px 12px",
                        background: "#f8fafc",
                        borderRadius: 8,
                        border: "1px solid #f1f5f9",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 12, color: "#0f172a" }}>
                          {item.type || "General Property"}
                        </Text>
                        <Text strong style={{ fontSize: 12, color: primaryColor }}>
                          {item.count} units ({pct}%)
                        </Text>
                      </div>
                      <Progress
                        percent={pct}
                        showInfo={false}
                        strokeColor={primaryColor}
                        size="small"
                        style={{ margin: 0 }}
                      />
                      {item.occupancyRate !== undefined && (
                        <Text style={{ fontSize: 10, color: "#94a3b8", display: "block", marginTop: 4 }}>
                          Occupancy: {item.occupancyRate}%
                        </Text>
                      )}
                    </div>
                  );
                })}
              </Space>
            ) : (
              <div style={{ textAlign: "center", padding: "50px 0", color: "#94a3b8", fontSize: 12 }}>
                No property categories recorded
              </div>
            )}
          </ProCard>
        </Col>
      </Row>
    </div>
  );
};
