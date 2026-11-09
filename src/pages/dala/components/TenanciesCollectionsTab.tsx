import React from "react";
import { Row, Col, Typography, Space, Tag, Table, Button, Alert, Empty } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  HomeOutlined,
  WalletOutlined,
  AlertOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { fmtK } from "@utils/formatters";

const { Text } = Typography;

interface TenanciesCollectionsTabProps {
  dashboardData: any;
  isMobile: boolean;
  isAdminLayout: boolean;
}

export const TenanciesCollectionsTab: React.FC<TenanciesCollectionsTabProps> = ({
  dashboardData,
  isMobile,
  isAdminLayout,
}) => {
  const navigate = useNavigate();

  const recentLeases = dashboardData?.recentLeases || [];
  const recentRentPayments = dashboardData?.recentRentPayments || [];
  const paymentPlansDue = dashboardData?.paymentPlansDue || {};
  const paymentsDue = Array.isArray(paymentPlansDue?.top5) ? paymentPlansDue.top5 : [];
  const totalPaymentDue = paymentPlansDue?.totalBalance || 0;
  const totalPaymentCount = paymentPlansDue?.total || 0;

  return (
    <div style={{ width: "100%" }}>
      {/* ── Section 1: Urgent Overdue Payment Plans Banner ── */}
      {totalPaymentCount > 0 && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: isMobile ? 12 : 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Space size={8}>
            <AlertOutlined style={{ color: "#ef4444", fontSize: 16 }} />
            <Text strong style={{ color: "#991b1b", fontSize: 13 }}>
              Payment Plans Overdue / Due: KES {fmtK(totalPaymentDue)}
            </Text>
          </Space>
          <Tag color="error">{totalPaymentCount} plan{totalPaymentCount !== 1 ? "s" : ""} requiring collection</Tag>
        </div>
      )}

      {/* ── Section 2: Leases & Rent Collections Overview ── */}
      <Row gutter={isMobile ? [12, 12] : [16, 16]} style={{ marginBottom: isMobile ? 12 : 16 }}>
        {/* Leases Summary & Recent Leases */}
        <Col xs={24} lg={12}>
          <ProCard
            title={
              <Space size={8}>
                <HomeOutlined style={{ color: "#3b82f6" }} />
                <Text strong style={{ fontSize: 14 }}>
                  Active Leases & Tenancies
                </Text>
                {recentLeases.length > 0 && (
                  <Tag color="blue" style={{ borderRadius: 10, fontSize: 10, border: "none" }}>
                    {recentLeases.length} Recent
                  </Tag>
                )}
              </Space>
            }
            extra={
              !isAdminLayout ? (
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate("/dala/leases")}
                  style={{ fontSize: 12, padding: 0 }}
                >
                  All Leases <ArrowRightOutlined />
                </Button>
              ) : undefined
            }
            bordered
            size="small"
            bodyStyle={{ paddingTop: 10 }}
          >
            <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
              <Col span={12}>
                <div style={{ background: "#f0fdf4", padding: "8px 10px", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                  <Text style={{ fontSize: 10, color: "#166534" }}>Active Leases</Text>
                  <Text strong style={{ fontSize: 14, color: "#10b981", display: "block" }}>
                    {dashboardData?.activeLeases || 0}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ background: "#eff6ff", padding: "8px 10px", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                  <Text style={{ fontSize: 10, color: "#1e40af" }}>Total Rent Value</Text>
                  <Text strong style={{ fontSize: 14, color: "#3b82f6", display: "block" }}>
                    KES {fmtK(dashboardData?.leaseStats?.totalRentAmount || 0)}
                  </Text>
                </div>
              </Col>
            </Row>

            <Table
              rowKey="_id"
              dataSource={recentLeases}
              columns={[
                {
                  title: "Property",
                  dataIndex: "propertyName",
                  render: (v: string, record: any) => (
                    <Space direction="vertical" size={0}>
                      <Text style={{ fontSize: 11, fontWeight: 600 }}>{v || "N/A"}</Text>
                      <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record.unitName || "-"}</Text>
                    </Space>
                  ),
                },
                {
                  title: "Rent",
                  dataIndex: "rentAmount",
                  align: "right" as const,
                  width: 95,
                  render: (v: number) => (
                    <Text strong style={{ fontSize: 11, color: "#1d39c4" }}>
                      KES {fmtK(v)}
                    </Text>
                  ),
                },
                {
                  title: "Ends",
                  dataIndex: "endDate",
                  width: 85,
                  render: (date: string) => (
                    <Text style={{ fontSize: 10, color: "#64748b" }}>
                      {date ? dayjs(date).format("DD MMM YY") : "-"}
                    </Text>
                  ),
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  width: 75,
                  render: (status: string) => (
                    <Tag
                      style={{
                        background: status === "active" ? "#f0fdf4" : "#fff7ed",
                        color: status === "active" ? "#10b981" : "#f59e0b",
                        border: "none",
                        fontSize: 9,
                        borderRadius: 4,
                        padding: "0 4px",
                      }}
                    >
                      {status?.toUpperCase() || "-"}
                    </Tag>
                  ),
                },
              ]}
              pagination={{ pageSize: 4, size: "small" }}
              size="small"
              scroll={{ x: 380 }}
              locale={{ emptyText: "No recent leases" }}
            />
          </ProCard>
        </Col>

        {/* Rent Collections Summary & Recent Payments */}
        <Col xs={24} lg={12}>
          <ProCard
            title={
              <Space size={8}>
                <WalletOutlined style={{ color: "#10b981" }} />
                <Text strong style={{ fontSize: 14 }}>
                  Rent Collection & Recovery
                </Text>
              </Space>
            }
            extra={
              !isAdminLayout ? (
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate("/dala/rent")}
                  style={{ fontSize: 12, padding: 0 }}
                >
                  Collections <ArrowRightOutlined />
                </Button>
              ) : undefined
            }
            bordered
            size="small"
            bodyStyle={{ paddingTop: 10 }}
          >
            <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
              <Col span={12}>
                <div style={{ background: "#f0fdf4", padding: "8px 10px", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                  <Text style={{ fontSize: 10, color: "#166534" }}>Collected</Text>
                  <Text strong style={{ fontSize: 14, color: "#10b981", display: "block" }}>
                    KES {fmtK(dashboardData?.rentalStats?.totalCollected || 0)}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ background: "#fff7ed", padding: "8px 10px", borderRadius: 8, border: "1px solid #fed7aa" }}>
                  <Text style={{ fontSize: 10, color: "#9a3412" }}>Outstanding</Text>
                  <Text strong style={{ fontSize: 14, color: "#f59e0b", display: "block" }}>
                    KES {fmtK(dashboardData?.rentalStats?.outstandingBalance || 0)}
                  </Text>
                </div>
              </Col>
            </Row>

            <Table
              rowKey="_id"
              dataSource={recentRentPayments}
              columns={[
                {
                  title: "Property",
                  dataIndex: "propertyName",
                  render: (v: string, record: any) => (
                    <Space direction="vertical" size={0}>
                      <Text style={{ fontSize: 11, fontWeight: 600 }}>{v || "N/A"}</Text>
                      <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record.unitName || "-"}</Text>
                    </Space>
                  ),
                },
                {
                  title: "Amount",
                  dataIndex: "amount",
                  align: "right" as const,
                  width: 95,
                  render: (v: number) => (
                    <Text strong style={{ fontSize: 11, color: "#1d39c4" }}>
                      KES {fmtK(v)}
                    </Text>
                  ),
                },
                {
                  title: "Method",
                  dataIndex: "paymentMethod",
                  width: 80,
                  render: (method: string) => (
                    <Tag style={{ fontSize: 9, padding: "0 4px" }}>
                      {method?.replace(/_/g, " ").toUpperCase() || "-"}
                    </Tag>
                  ),
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  width: 75,
                  render: (status: string) => (
                    <Tag
                      color={status === "confirmed" ? "green" : "orange"}
                      style={{ fontSize: 9, padding: "0 4px" }}
                    >
                      {status?.toUpperCase() || "-"}
                    </Tag>
                  ),
                },
              ]}
              pagination={{ pageSize: 4, size: "small" }}
              size="small"
              scroll={{ x: 380 }}
              locale={{ emptyText: "No recent rent payments" }}
            />
          </ProCard>
        </Col>
      </Row>

      {/* ── Section 3: Payment Plans Due Table ── */}
      <ProCard
        title={
          <Space size={8}>
            <AlertOutlined style={{ color: "#ef4444" }} />
            <Text strong style={{ fontSize: 14 }}>
              Payment Plans Due Roster
            </Text>
            {totalPaymentCount > 0 && (
              <Badge count={totalPaymentCount} style={{ backgroundColor: "#ef4444" }} />
            )}
          </Space>
        }
        bordered
        size="small"
        bodyStyle={{ paddingTop: 10 }}
      >
        <Table
          rowKey="_id"
          dataSource={paymentsDue}
          columns={[
            {
              title: "Client",
              dataIndex: "customerName",
              width: 140,
              render: (v: string, record: any) => (
                <Space direction="vertical" size={0}>
                  <Text style={{ fontSize: 12, fontWeight: 600 }}>{v || "N/A"}</Text>
                  <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record.propertyName || "-"}</Text>
                </Space>
              ),
            },
            {
              title: "Sale Code",
              dataIndex: "saleCode",
              width: 110,
              render: (code: string) => <Text style={{ fontSize: 11 }}>{code || "-"}</Text>,
            },
            {
              title: "Due Date",
              dataIndex: "dueDate",
              width: 100,
              render: (date: string) => (
                <Text style={{ fontSize: 11, color: "#ef4444", fontWeight: 500 }}>
                  {date ? dayjs(date).format("DD MMM") : "-"}
                </Text>
              ),
            },
            {
              title: "Installment",
              dataIndex: "installmentAmount",
              align: "right" as const,
              width: 110,
              render: (v: number) => (
                <Text strong style={{ fontSize: 12, color: "#ef4444" }}>
                  KES {fmtK(v)}
                </Text>
              ),
            },
            {
              title: "Balance",
              dataIndex: "balance",
              align: "right" as const,
              width: 110,
              render: (v: number) => `KES ${fmtK(v)}`,
            },
            {
              title: "Status",
              dataIndex: "status",
              width: 90,
              render: (status: string) => (
                <Tag color={status === "active" ? "green" : "orange"} style={{ fontSize: 10 }}>
                  {status?.toUpperCase() || "ACTIVE"}
                </Tag>
              ),
            },
          ]}
          pagination={{ pageSize: 5, size: "small" }}
          size="small"
          scroll={{ x: 480 }}
          locale={{ emptyText: <Empty description="No payment plans due" style={{ padding: 12 }} /> }}
        />
      </ProCard>
    </div>
  );
};
