import React from "react";
import { Row, Col, Space, Typography } from "antd";
import {
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  BankOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { DashboardOverview } from "@services/accounting/accountingDashboard";
import { fmtK } from "@utils/formatters";
import { KPICard } from "./SharedUI";

const { Text } = Typography;

interface PesaExecutiveKPIsProps {
  overview: DashboardOverview;
  workingCapital: number;
  costRatio: string;
  isProfit: boolean;
  netMargin: number;
  isMobile: boolean;
  onSelectTab: (tabKey: string) => void;
}

export const PesaExecutiveKPIs: React.FC<PesaExecutiveKPIsProps> = ({
  overview,
  workingCapital,
  costRatio,
  isProfit,
  netMargin,
  isMobile,
  onSelectTab,
}) => {
  return (
    <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
      {/* ── Revenue ── */}
      <Col xs={12} sm={12} lg={6}>
        <KPICard
          title="Revenue"
          value={`KES ${fmtK(overview?.revenue?.amount || 0)}`}
          icon={<RiseOutlined />}
          color="#10b981"
          bg="#f0fdf4"
          border="#bbf7d0"
          isMobile={isMobile}
          onClick={() => onSelectTab("overview")}
          subtext={
            <Space size={4}>
              {overview?.revenue?.vs_prev_year !== null &&
              overview?.revenue?.vs_prev_year !== undefined ? (
                <>
                  {overview.revenue.vs_prev_year >= 0 ? (
                    <ArrowUpOutlined style={{ color: "#10b981", fontSize: 11 }} />
                  ) : (
                    <ArrowDownOutlined style={{ color: "#ef4444", fontSize: 11 }} />
                  )}
                  <Text
                    style={{
                      fontSize: 11,
                      color: overview.revenue.vs_prev_year >= 0 ? "#10b981" : "#ef4444",
                      fontWeight: 500,
                    }}
                  >
                    {Math.abs(overview.revenue.vs_prev_year)}% vs last year
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: 11, color: "#64748b" }}>Gross operational inflows</Text>
              )}
            </Space>
          }
        />
      </Col>

      {/* ── Operating Expenses ── */}
      <Col xs={12} sm={12} lg={6}>
        <KPICard
          title="Expenses"
          value={`KES ${fmtK(overview?.expenses?.amount || 0)}`}
          icon={<FallOutlined />}
          color="#ef4444"
          bg="#fef2f2"
          border="#fecaca"
          isMobile={isMobile}
          onClick={() => onSelectTab("overview")}
          subtext={
            <Space size={6}>
              <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>
                {costRatio}% Cost Ratio
              </span>
              <span style={{ fontSize: 11, color: "#64748b" }}>• of Revenue</span>
            </Space>
          }
        />
      </Col>

      {/* ── Net Operating Profit / Loss ── */}
      <Col xs={12} sm={12} lg={6}>
        <KPICard
          title={isProfit ? "Net Operating Profit" : "Net Operating Loss"}
          value={`KES ${fmtK(Math.abs(overview?.net_profit?.amount || 0))}`}
          icon={<DollarOutlined />}
          color={isProfit ? "#6366f1" : "#ef4444"}
          bg={isProfit ? "#f5f3ff" : "#fef2f2"}
          border={isProfit ? "#ddd6fe" : "#fecaca"}
          isMobile={isMobile}
          onClick={() => onSelectTab("overview")}
          subtext={
            <Space size={6}>
              <span style={{ fontSize: 11, color: isProfit ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                {netMargin}% margin
              </span>
              <span style={{ fontSize: 11, color: "#64748b" }}>
                • {isProfit ? "Profitable Period" : "Operating Deficit"}
              </span>
            </Space>
          }
        />
      </Col>

      {/* ── Total Assets ── */}
      <Col xs={12} sm={12} lg={6}>
        <KPICard
          title="Total Assets"
          value={`KES ${fmtK(overview?.total_assets || 0)}`}
          icon={<BankOutlined />}
          color="#3b82f6"
          bg="#eff6ff"
          border="#bfdbfe"
          isMobile={isMobile}
          onClick={() => onSelectTab("liquidity")}
          subtext={
            <Space size={6}>
              <span style={{ fontSize: 11, color: "#64748b" }}>Working Cap:</span>
              <span
                style={{
                  fontSize: 11,
                  color: workingCapital >= 0 ? "#3b82f6" : "#ef4444",
                  fontWeight: 600,
                }}
              >
                KES {fmtK(workingCapital)}
              </span>
            </Space>
          }
        />
      </Col>
    </Row>
  );
};
