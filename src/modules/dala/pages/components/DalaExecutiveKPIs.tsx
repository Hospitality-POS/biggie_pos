import React from "react";
import { Row, Col, Typography, Space } from "antd";
import {
  HomeOutlined,
  TrophyOutlined,
  WalletOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { fmtK } from "@utils/formatters";
import { KPICard } from "./SharedUI";

const { Text } = Typography;

interface DalaExecutiveKPIsProps {
  dashboardData: any;
  isMobile: boolean;
  onSelectTab: (tabKey: string) => void;
}

export const DalaExecutiveKPIs: React.FC<DalaExecutiveKPIsProps> = ({
  dashboardData,
  isMobile,
  onSelectTab,
}) => {
  return (
    <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
      {/* ── Portfolio Scale ── */}
      <Col xs={12} sm={12} lg={6}>
        <KPICard
          title="Portfolio Scale"
          value={`${dashboardData?.totalProperties || 0} Units`}
          icon={<HomeOutlined />}
          color="#6366f1"
          bg="#eef2ff"
          border="#c7d2fe"
          isMobile={isMobile}
          onClick={() => onSelectTab("portfolio")}
          subtext={
            <Text style={{ fontSize: 11, color: "#64748b" }}>
              {dashboardData?.availableUnits || 0} available · {dashboardData?.occupancyRate || 0}% occupancy
            </Text>
          }
        />
      </Col>

      {/* ── Total Revenue ── */}
      <Col xs={12} sm={12} lg={6}>
        <KPICard
          title="Total Revenue"
          value={`KES ${fmtK(dashboardData?.totalRevenue || 0)}`}
          icon={<TrophyOutlined />}
          color="#10b981"
          bg="#f0fdf4"
          border="#bbf7d0"
          isMobile={isMobile}
          onClick={() => onSelectTab("sales")}
          subtext={
            <Text style={{ fontSize: 11, color: "#64748b" }}>
              Sales: KES {fmtK(dashboardData?.monthlySalesRevenue || 0)} · Rent: KES {fmtK(dashboardData?.monthlyRentCollected || 0)}
            </Text>
          }
        />
      </Col>

      {/* ── Rental Collections ── */}
      <Col xs={12} sm={12} lg={6}>
        <KPICard
          title="Rental Collections"
          value={`KES ${fmtK(dashboardData?.monthlyRentCollected || 0)}`}
          icon={<WalletOutlined />}
          color="#3b82f6"
          bg="#eff6ff"
          border="#bfdbfe"
          isMobile={isMobile}
          onClick={() => onSelectTab("collections")}
          subtext={
            <Text style={{ fontSize: 11, color: "#64748b" }}>
              Billed: KES {fmtK(dashboardData?.monthlyRentBilled || 0)} · Unpaid: KES {fmtK(dashboardData?.rentOutstanding || 0)}
            </Text>
          }
        />
      </Col>

      {/* ── Commissions & Operations ── */}
      <Col xs={12} sm={12} lg={6}>
        <KPICard
          title="Commissions & Ops"
          value={`KES ${fmtK(dashboardData?.totalCommission || 0)}`}
          icon={<DollarOutlined />}
          color="#8b5cf6"
          bg="#f5f3ff"
          border="#ddd6fe"
          isMobile={isMobile}
          onClick={() => onSelectTab("operations")}
          subtext={
            <Text style={{ fontSize: 11, color: "#64748b" }}>
              Paid: KES {fmtK(dashboardData?.commissionStats?.paidCommission || 0)} · {dashboardData?.openMaintenanceTickets || 0} open tickets
            </Text>
          }
        />
      </Col>
    </Row>
  );
};
