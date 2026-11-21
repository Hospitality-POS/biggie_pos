import React from "react";
import { Col, Row, Skeleton, Space, Tag, Typography, Button, Empty, Tooltip } from "antd";
import {
  WalletOutlined, ShoppingCartOutlined, DollarOutlined, WarningOutlined, RightOutlined,
} from "@ant-design/icons";
import { fmtK } from "@utils/formatters";
import type { CreditSummary } from "@services/orders";

const { Text } = Typography;

interface Props {
  summary?: CreditSummary;
  loading?: boolean;
  periodLabel: string;
  isMobile?: boolean;
  onOpenUnpaid?: () => void;
}

const ksh = (n: number) => `Ksh ${fmtK(n || 0)}`;

// Duka dashboard → Pay Later: what's owed now, what was sold on credit and
// collected in the selected period, how old the debt is, and who owes most.
const DashboardPayLaterCard: React.FC<Props> = ({ summary, loading, periodLabel, isMobile, onOpenUnpaid }) => {
  const period = summary?.period;
  const aging = summary?.aging || { d0_7: 0, d8_30: 0, d30_plus: 0 };
  const agingTotal = aging.d0_7 + aging.d8_30 + aging.d30_plus;
  const debtors = (summary?.debtors || []).slice(0, 5);

  const tiles = [
    {
      title: "Owed to you now",
      value: ksh(summary?.total_owed || 0),
      sub: `${summary?.open_orders || 0} unpaid order${summary?.open_orders === 1 ? "" : "s"} · ${summary?.debtors?.length || 0} customer${summary?.debtors?.length === 1 ? "" : "s"}`,
      icon: <WalletOutlined />, color: "#c2410c", bg: "#fff7ed", border: "#fed7aa",
    },
    {
      title: `Sold on credit · ${periodLabel}`,
      value: ksh(period?.credit_sales_value || 0),
      sub: `${period?.credit_orders || 0} order${period?.credit_orders === 1 ? "" : "s"} · ${ksh(period?.still_owed_from_period || 0)} still owed`,
      icon: <ShoppingCartOutlined />, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe",
    },
    {
      title: `Collected · ${periodLabel}`,
      value: ksh(period?.collected || 0),
      sub: `${period?.collections || 0} payment${period?.collections === 1 ? "" : "s"} received on debts`,
      icon: <DollarOutlined />, color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0",
    },
    {
      title: "At credit limit",
      value: `${summary?.customers_at_limit || 0}`,
      sub: (summary?.customers_at_limit || 0) > 0 ? "Can't buy more on credit" : "No one has hit their limit",
      icon: <WarningOutlined />,
      color: (summary?.customers_at_limit || 0) > 0 ? "#dc2626" : "#64748b",
      bg: (summary?.customers_at_limit || 0) > 0 ? "#fef2f2" : "#f8fafc",
      border: (summary?.customers_at_limit || 0) > 0 ? "#fecaca" : "#e2e8f0",
    },
  ];

  const agingBars = [
    { label: "0–7 days", value: aging.d0_7, color: "#f59e0b" },
    { label: "8–30 days", value: aging.d8_30, color: "#f97316" },
    { label: "Over 30 days", value: aging.d30_plus, color: "#dc2626" },
  ];

  return (
    <div
      style={{
        background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
        padding: isMobile ? 10 : "14px 16px", marginBottom: isMobile ? 12 : 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Space size={8}>
          <div style={{ background: "#f5f3ff", color: "#7c3aed", borderRadius: 8, padding: "4px 7px", lineHeight: 1 }}>
            <WalletOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: "#0f172a" }}>Pay Later</Text>
          <Text style={{ fontSize: 12, color: "#64748b" }}>Debts from credit sales</Text>
        </Space>
        {onOpenUnpaid && (
          <Button size="small" type="link" onClick={onOpenUnpaid} style={{ padding: 0 }}>
            View unpaid orders <RightOutlined style={{ fontSize: 10 }} />
          </Button>
        )}
      </div>

      <Row gutter={isMobile ? [8, 8] : [12, 12]}>
        {tiles.map((t) => (
          <Col xs={12} lg={6} key={t.title}>
            <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 10, padding: isMobile ? "10px" : "12px 14px", height: "100%" }}>
              {loading ? (
                <Skeleton active paragraph={false} />
              ) : (
                <Space direction="vertical" size={2} style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                    <Text style={{ fontSize: isMobile ? 11 : 12, color: "#475569", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.title}
                    </Text>
                    <span style={{ color: t.color, fontSize: 13 }}>{t.icon}</span>
                  </div>
                  <Text strong style={{ fontSize: isMobile ? 17 : 20, color: t.color, lineHeight: 1.2 }}>{t.value}</Text>
                  <Text style={{ fontSize: 11, color: "#64748b" }}>{t.sub}</Text>
                </Space>
              )}
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginTop: isMobile ? 8 : 12 }}>
        {/* Debt age */}
        <Col xs={24} lg={10}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", height: "100%" }}>
            <Text strong style={{ fontSize: 12, color: "#0f172a", display: "block", marginBottom: 10 }}>How old the debt is</Text>
            {loading ? (
              <Skeleton active paragraph={{ rows: 2 }} title={false} />
            ) : agingTotal <= 0 ? (
              <Text style={{ fontSize: 12, color: "#64748b" }}>Nothing owed right now.</Text>
            ) : (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                {agingBars.map((b) => (
                  <div key={b.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <Text style={{ fontSize: 12, color: "#475569" }}>{b.label}</Text>
                      <Text strong style={{ fontSize: 12 }}>{ksh(b.value)}</Text>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                      <div style={{ width: `${agingTotal ? (b.value / agingTotal) * 100 : 0}%`, height: "100%", background: b.color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </Space>
            )}
          </div>
        </Col>

        {/* Top debtors */}
        <Col xs={24} lg={14}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", height: "100%" }}>
            <Text strong style={{ fontSize: 12, color: "#0f172a", display: "block", marginBottom: 8 }}>Who owes the most</Text>
            {loading ? (
              <Skeleton active paragraph={{ rows: 3 }} title={false} />
            ) : debtors.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No customers owe anything" style={{ margin: "8px 0" }} />
            ) : (
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                {debtors.map((d, i) => {
                  const days = d.oldest ? Math.floor((Date.now() - new Date(d.oldest).getTime()) / 86_400_000) : 0;
                  return (
                    <div key={d._id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <Text strong style={{ fontSize: 12, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {d.customer_name || "Customer"}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#64748b" }}>
                          {d.orders} order{d.orders === 1 ? "" : "s"}{d.customer_phone ? ` · ${d.customer_phone}` : ""}
                        </Text>
                      </div>
                      <Space size={6}>
                        {days >= 30 && (
                          <Tooltip title={`Oldest unpaid sale is ${days} days old`}>
                            <Tag color="red" style={{ margin: 0 }}>{days}d</Tag>
                          </Tooltip>
                        )}
                        <Text strong style={{ fontSize: 13, color: "#c2410c", whiteSpace: "nowrap" }}>{ksh(d.owed)}</Text>
                      </Space>
                    </div>
                  );
                })}
              </Space>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPayLaterCard;
