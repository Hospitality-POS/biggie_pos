import React from "react";
import { Row, Col, Typography, Space, Tag, Table, Button } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  BuildOutlined as ToolOutlined,
  DollarOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { fmtK } from "@utils/formatters";

const { Text } = Typography;

interface MaintenanceCommissionsTabProps {
  dashboardData: any;
  isMobile: boolean;
  isAdminLayout: boolean;
}

export const MaintenanceCommissionsTab: React.FC<MaintenanceCommissionsTabProps> = ({
  dashboardData,
  isMobile,
  isAdminLayout,
}) => {
  const navigate = useNavigate();

  const maintenanceStats = dashboardData?.maintenanceStats || {};
  const recentMaintenanceTickets = dashboardData?.recentMaintenanceTickets || [];
  const commissionStats = dashboardData?.commissionStats || {};

  return (
    <div style={{ width: "100%" }}>
      {/* ── Section 1: Maintenance Tickets Tracking ── */}
      <ProCard
        title={
          <Space size={8}>
            <ToolOutlined style={{ color: "#d48806" }} />
            <Text strong style={{ fontSize: 14 }}>
              Maintenance & Repair Requests
            </Text>
            {dashboardData?.openMaintenanceTickets > 0 && (
              <Tag color="warning" style={{ borderRadius: 10, fontSize: 10, border: "none" }}>
                {dashboardData.openMaintenanceTickets} Open
              </Tag>
            )}
          </Space>
        }
        extra={
          !isAdminLayout ? (
            <Button
              type="link"
              size="small"
              onClick={() => navigate("/dala/maintenance")}
              style={{ fontSize: 12, padding: 0 }}
            >
              All Maintenance <ArrowRightOutlined />
            </Button>
          ) : undefined
        }
        bordered
        size="small"
        style={{ marginBottom: isMobile ? 12 : 16 }}
        bodyStyle={{ paddingTop: 10 }}
      >
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={12} sm={6}>
            <div style={{ background: "#f9f0ff", padding: "8px 10px", borderRadius: 8, border: "1px solid #d3adf7" }}>
              <Text style={{ fontSize: 11, color: "#531dab" }}>Total Tickets</Text>
              <Text strong style={{ fontSize: 15, color: "#722ed1", display: "block", marginTop: 2 }}>
                {dashboardData?.totalMaintenanceTickets || 0}
              </Text>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ background: "#fffbe6", padding: "8px 10px", borderRadius: 8, border: "1px solid #ffe58f" }}>
              <Text style={{ fontSize: 11, color: "#874d00" }}>Open Tickets</Text>
              <Text strong style={{ fontSize: 15, color: "#d48806", display: "block", marginTop: 2 }}>
                {dashboardData?.openMaintenanceTickets || 0}
              </Text>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ background: "#fff1f0", padding: "8px 10px", borderRadius: 8, border: "1px solid #ffa39e" }}>
              <Text style={{ fontSize: 11, color: "#a8071a" }}>Urgent Tickets</Text>
              <Text strong style={{ fontSize: 15, color: "#cf1322", display: "block", marginTop: 2 }}>
                {maintenanceStats?.urgentTickets || 0}
              </Text>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ background: "#e6fffb", padding: "8px 10px", borderRadius: 8, border: "1px solid #87e8de" }}>
              <Text style={{ fontSize: 11, color: "#00474f" }}>Est. Repair Cost</Text>
              <Text strong style={{ fontSize: 15, color: "#08979c", display: "block", marginTop: 2 }}>
                KES {fmtK(maintenanceStats?.actualCost || maintenanceStats?.estimatedCost || 0)}
              </Text>
            </div>
          </Col>
        </Row>

        <Table
          rowKey="_id"
          dataSource={recentMaintenanceTickets}
          columns={[
            {
              title: "Ticket",
              dataIndex: "ticketNumber",
              width: 120,
              render: (ticketNumber: string, record: any) => (
                <Space direction="vertical" size={0}>
                  <Text style={{ fontSize: 12, fontWeight: 600 }}>{ticketNumber || "-"}</Text>
                  <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record.title || "-"}</Text>
                </Space>
              ),
            },
            {
              title: "Property",
              dataIndex: "propertyName",
              render: (propertyName: string, record: any) => (
                <Space direction="vertical" size={0}>
                  <Text style={{ fontSize: 12 }}>{propertyName || "-"}</Text>
                  <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record.unitName || "-"}</Text>
                </Space>
              ),
            },
            {
              title: "Priority",
              dataIndex: "priority",
              width: 90,
              render: (priority: string) => (
                <Tag
                  color={priority === "urgent" ? "red" : priority === "high" ? "orange" : "blue"}
                  style={{ fontSize: 10 }}
                >
                  {priority?.toUpperCase() || "-"}
                </Tag>
              ),
            },
            {
              title: "Status",
              dataIndex: "status",
              width: 100,
              render: (status: string) => (
                <Tag
                  color={
                    status === "resolved" || status === "closed"
                      ? "green"
                      : status === "in_progress"
                      ? "blue"
                      : "orange"
                  }
                  style={{ fontSize: 10 }}
                >
                  {status?.replace(/_/g, " ").toUpperCase() || "-"}
                </Tag>
              ),
            },
            {
              title: "Est. Cost",
              dataIndex: "estimatedCost",
              align: "right" as const,
              width: 110,
              render: (amount: number) => `KES ${fmtK(amount || 0)}`,
            },
          ]}
          pagination={{ pageSize: 5, size: "small" }}
          size="small"
          scroll={{ x: 480 }}
          locale={{ emptyText: "No recent maintenance tickets" }}
        />
      </ProCard>

      {/* ── Section 2: Agent Commissions Pipeline ── */}
      <ProCard
        title={
          <Space size={8}>
            <DollarOutlined style={{ color: "#8b5cf6" }} />
            <Text strong style={{ fontSize: 14 }}>
              Agent Commission Pipeline
            </Text>
          </Space>
        }
        extra={
          !isAdminLayout ? (
            <Button
              type="link"
              size="small"
              onClick={() => navigate("/dala/commissions")}
              style={{ fontSize: 12, padding: 0 }}
            >
              Commissions <ArrowRightOutlined />
            </Button>
          ) : undefined
        }
        bordered
        size="small"
        bodyStyle={{ paddingTop: 12 }}
      >
        <Row gutter={isMobile ? [8, 8] : [16, 16]}>
          <Col xs={24} sm={8}>
            <div
              style={{
                background: "#f0fdf4",
                borderRadius: 10,
                padding: "14px",
                border: "1px solid #bbf7d0",
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
                <CheckCircleOutlined style={{ color: "#10b981" }} />
                <Text style={{ fontSize: 12, color: "#166534", fontWeight: 500 }}>
                  Paid Commissions
                </Text>
              </div>
              <Text strong style={{ fontSize: 18, color: "#10b981", display: "block", marginTop: 4 }}>
                KES {fmtK(commissionStats?.paidCommission || 0)}
              </Text>
              <Text style={{ fontSize: 10, color: "#64748b" }}>
                {commissionStats?.paidCount || 0} completed payouts
              </Text>
            </div>
          </Col>

          <Col xs={24} sm={8}>
            <div
              style={{
                background: "#fff7ed",
                borderRadius: 10,
                padding: "14px",
                border: "1px solid #fed7aa",
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
                <ClockCircleOutlined style={{ color: "#f59e0b" }} />
                <Text style={{ fontSize: 12, color: "#9a3412", fontWeight: 500 }}>
                  Pending Commissions
                </Text>
              </div>
              <Text strong style={{ fontSize: 18, color: "#f59e0b", display: "block", marginTop: 4 }}>
                KES {fmtK(commissionStats?.pendingCommission || 0)}
              </Text>
              <Text style={{ fontSize: 10, color: "#64748b" }}>
                {commissionStats?.pendingCount || 0} awaiting disbursement
              </Text>
            </div>
          </Col>

          <Col xs={24} sm={8}>
            <div
              style={{
                background: "#f5f3ff",
                borderRadius: 10,
                padding: "14px",
                border: "1px solid #ddd6fe",
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
                <DollarOutlined style={{ color: "#8b5cf6" }} />
                <Text style={{ fontSize: 12, color: "#5b21b6", fontWeight: 500 }}>
                  Total Pipeline Commission
                </Text>
              </div>
              <Text strong style={{ fontSize: 18, color: "#6d28d9", display: "block", marginTop: 4 }}>
                KES {fmtK(dashboardData?.totalCommission || 0)}
              </Text>
              <Text style={{ fontSize: 10, color: "#64748b" }}>
                Earned on closed real estate deals
              </Text>
            </div>
          </Col>
        </Row>
      </ProCard>
    </div>
  );
};
