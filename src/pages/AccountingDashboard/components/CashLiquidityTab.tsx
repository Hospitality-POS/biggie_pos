import React from "react";
import { Row, Col, Typography, Space, Tag, Badge, Button, Progress } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  BankOutlined,
  AuditOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  DashboardCashPositions,
  DashboardARAPSummary,
  DashboardReconciliationStatus,
  CashAccount,
} from "@services/accounting/accountingDashboard";
import { fmtK } from "@utils/formatters";

const { Text, Title } = Typography;

interface CashLiquidityTabProps {
  cashPositions: DashboardCashPositions;
  arApSummary: DashboardARAPSummary;
  reconciliationStatus: DashboardReconciliationStatus;
  primaryColor: string;
  isMobile: boolean;
  isAdminLayout: boolean;
}

export const CashLiquidityTab: React.FC<CashLiquidityTabProps> = ({
  cashPositions,
  arApSummary,
  reconciliationStatus,
  primaryColor,
  isMobile,
  isAdminLayout,
}) => {
  const navigate = useNavigate();

  const totalCash = cashPositions?.total_cash || 0;
  const accounts = cashPositions?.accounts || [];
  const ar = arApSummary?.accounts_receivable?.total_outstanding || 0;
  const arInvoiced = arApSummary?.accounts_receivable?.period_invoiced || 0;
  const arCollected = arApSummary?.accounts_receivable?.period_collected || 0;

  const ap = arApSummary?.accounts_payable?.total_outstanding || 0;
  const apBilled = arApSummary?.accounts_payable?.period_billed || 0;
  const apPaid = arApSummary?.accounts_payable?.period_paid || 0;

  const workingCapital = totalCash + ar - ap;
  const sessions = reconciliationStatus?.open_sessions || [];

  return (
    <div style={{ width: "100%" }}>
      {/* ── Top Deck: Working Capital & Liquidity Breakdown ── */}
      <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: isMobile ? 12 : 16 }}>
        {/* Total Liquid Cash */}
        <Col xs={24} sm={12} lg={6}>
          <div
            style={{
              background: "#eff6ff",
              borderRadius: 10,
              padding: "12px 14px",
              border: "1px solid #bfdbfe",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: "#1e40af", fontWeight: 600 }}>Total Liquid Cash</Text>
              <BankOutlined style={{ color: "#3b82f6", fontSize: 14 }} />
            </div>
            <Text strong style={{ fontSize: 18, color: "#1e3a8a", display: "block", marginTop: 4 }}>
              KES {fmtK(totalCash)}
            </Text>
            <Text style={{ fontSize: 10, color: "#64748b" }}>
              Across {accounts.length} active account{accounts.length !== 1 ? "s" : ""}
            </Text>
          </div>
        </Col>

        {/* Accounts Receivable */}
        <Col xs={12} sm={12} lg={6}>
          <div
            style={{
              background: "#f0fdf4",
              borderRadius: 10,
              padding: "12px 14px",
              border: "1px solid #bbf7d0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>Receivables (AR)</Text>
              <Tag color="success" style={{ margin: 0, fontSize: 9, padding: "0 4px", border: "none" }}>
                Inflow
              </Tag>
            </div>
            <Text strong style={{ fontSize: 18, color: "#14532d", display: "block", marginTop: 4 }}>
              KES {fmtK(ar)}
            </Text>
            <Text style={{ fontSize: 10, color: "#64748b" }}>
              Collected: KES {fmtK(arCollected)}
            </Text>
          </div>
        </Col>

        {/* Accounts Payable */}
        <Col xs={12} sm={12} lg={6}>
          <div
            style={{
              background: "#fef2f2",
              borderRadius: 10,
              padding: "12px 14px",
              border: "1px solid #fecaca",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: "#991b1b", fontWeight: 600 }}>Payables (AP)</Text>
              <Tag color="error" style={{ margin: 0, fontSize: 9, padding: "0 4px", border: "none" }}>
                Outflow
              </Tag>
            </div>
            <Text strong style={{ fontSize: 18, color: "#7f1d1d", display: "block", marginTop: 4 }}>
              KES {fmtK(ap)}
            </Text>
            <Text style={{ fontSize: 10, color: "#64748b" }}>
              Paid: KES {fmtK(apPaid)}
            </Text>
          </div>
        </Col>

        {/* Net Working Capital */}
        <Col xs={12} sm={12} lg={6}>
          <div
            style={{
              background: workingCapital >= 0 ? "#f8fafc" : "#fff7ed",
              borderRadius: 10,
              padding: "12px 14px",
              border: `1px solid ${workingCapital >= 0 ? "#e2e8f0" : "#ffedd5"}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>Net Working Capital</Text>
              <SwapOutlined style={{ color: workingCapital >= 0 ? "#6366f1" : "#f97316" }} />
            </div>
            <Text
              strong
              style={{
                fontSize: 18,
                color: workingCapital >= 0 ? "#0f172a" : "#ea580c",
                display: "block",
                marginTop: 4,
              }}
            >
              KES {fmtK(workingCapital)}
            </Text>
            <Text style={{ fontSize: 10, color: "#64748b" }}>
              {workingCapital >= 0 ? "Positive liquidity buffer" : "Tight liquidity position"}
            </Text>
          </div>
        </Col>
      </Row>

      {/* ── Main Row: Bank & Cash Accounts Roster + Bank Reconciliation ── */}
      <Row gutter={isMobile ? [12, 12] : [16, 16]}>
        {/* Bank & Cash Accounts List */}
        <Col xs={24} lg={12}>
          <ProCard
            title={
              <Space size={8}>
                <Text strong style={{ fontSize: 14 }}>
                  Bank & Cash Accounts
                </Text>
                <Tag color="blue" style={{ borderRadius: 10, fontSize: 11, border: "none" }}>
                  {accounts.length} Accounts
                </Tag>
              </Space>
            }
            extra={
              !isAdminLayout ? (
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate("/accounting/chart-of-accounts")}
                  style={{ fontSize: 12, padding: 0 }}
                >
                  Accounts <ArrowRightOutlined />
                </Button>
              ) : undefined
            }
            bordered
            size="small"
            bodyStyle={{ paddingTop: 10 }}
          >
            {accounts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 12 }}>
                No bank or cash accounts configured
              </div>
            ) : (
              <div style={{ maxHeight: 310, overflowY: "auto", paddingRight: 4 }}>
                {accounts.map((acc: CashAccount, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      background: i % 2 === 0 ? "#f8fafc" : "#ffffff",
                      borderRadius: 8,
                      marginBottom: 6,
                      borderLeft: `3px solid ${primaryColor}`,
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <Space direction="vertical" size={1} style={{ minWidth: 0, flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }} ellipsis>
                        {acc.account_name}
                      </Text>
                      <Space size={4}>
                        {acc.bank_name && (
                          <Text style={{ fontSize: 10, color: "#64748b" }}>{acc.bank_name}</Text>
                        )}
                        {acc.account_code && (
                          <Tag style={{ fontSize: 9, padding: "0 3px", border: "none", background: "#f1f5f9" }}>
                            {acc.account_code}
                          </Tag>
                        )}
                      </Space>
                    </Space>
                    <div style={{ textAlign: "right", marginLeft: 12 }}>
                      <Text
                        strong
                        style={{
                          fontSize: 13,
                          color: acc.current_balance >= 0 ? "#0f172a" : "#ef4444",
                          whiteSpace: "nowrap",
                        }}
                      >
                        KES {fmtK(acc.current_balance)}
                      </Text>
                      <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>
                        {acc.account_subtype || "Bank"}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ProCard>
        </Col>

        {/* Bank Reconciliation Status & Open Sessions */}
        <Col xs={24} lg={12}>
          <ProCard
            title={
              <Space size={8}>
                <Text strong style={{ fontSize: 14 }}>
                  Bank Reconciliation
                </Text>
                {reconciliationStatus.attention_needed > 0 && (
                  <Badge
                    count={`${reconciliationStatus.attention_needed} attention`}
                    style={{ backgroundColor: "#f59e0b" }}
                  />
                )}
              </Space>
            }
            extra={
              !isAdminLayout ? (
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate("/accounting/reconciliation")}
                  style={{ fontSize: 12, padding: 0 }}
                >
                  Open Reconciliation <ArrowRightOutlined />
                </Button>
              ) : undefined
            }
            bordered
            size="small"
            bodyStyle={{ paddingTop: 10 }}
          >
            {/* Reconciliation KPI counters */}
            <Row gutter={8} style={{ marginBottom: 12 }}>
              <Col span={8}>
                <div style={{ textAlign: "center", background: "#f8fafc", borderRadius: 8, padding: "8px 4px" }}>
                  <Text strong style={{ fontSize: 17, color: "#475569" }}>
                    {reconciliationStatus.open_count}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Open</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: "center", background: "#eff6ff", borderRadius: 8, padding: "8px 4px" }}>
                  <Text strong style={{ fontSize: 17, color: "#3b82f6" }}>
                    {reconciliationStatus.in_progress_count}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>In Progress</Text>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: "center", background: "#f0fdf4", borderRadius: 8, padding: "8px 4px" }}>
                  <Text strong style={{ fontSize: 17, color: "#10b981" }}>
                    {reconciliationStatus.completed_this_year}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Reconciled YTD</Text>
                </div>
              </Col>
            </Row>

            {/* Open reconciliation sessions list */}
            {sessions.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "44px 0",
                  color: "#10b981",
                  fontSize: 12,
                  background: "#f0fdf4",
                  borderRadius: 8,
                }}
              >
                <CheckCircleOutlined style={{ fontSize: 20, marginBottom: 4, display: "block" }} />
                All bank accounts are reconciled and in balance ✓
              </div>
            ) : (
              <div style={{ maxHeight: 230, overflowY: "auto", paddingRight: 4 }}>
                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                  {sessions.map((s, i) => {
                    const accName =
                      typeof s.account_id === "object" ? s.account_id?.account_name : s.account_name;
                    const isBalanced = Math.abs(s.difference) < 0.001;

                    return (
                      <div
                        key={i}
                        style={{
                          padding: "8px 10px",
                          background: "#f8fafc",
                          borderRadius: 8,
                          borderLeft: `3px solid ${s.status === "In Progress" ? "#3b82f6" : "#94a3b8"}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Space direction="vertical" size={1} style={{ minWidth: 0, flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: 600 }} ellipsis>
                            {accName || s.account_name || "Bank Account"}
                          </Text>
                          <Text style={{ fontSize: 10, color: "#94a3b8" }}>
                            {dayjs(s.period_start).format("DD MMM")} — {dayjs(s.period_end).format("DD MMM YYYY")}
                            {s.unmatched_count > 0 && ` · ${s.unmatched_count} unmatched`}
                          </Text>
                        </Space>
                        <div style={{ textAlign: "right", marginLeft: 8 }}>
                          <Badge
                            status={s.status === "In Progress" ? "processing" : "default"}
                            text={<Text style={{ fontSize: 10 }}>{s.status}</Text>}
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              color: isBalanced ? "#10b981" : "#ef4444",
                              fontWeight: 600,
                              display: "block",
                              marginTop: 2,
                            }}
                          >
                            {isBalanced ? "Balanced ✓" : `Diff: KES ${fmtK(Math.abs(s.difference))}`}
                          </Text>
                        </div>
                      </div>
                    );
                  })}
                </Space>
              </div>
            )}
          </ProCard>
        </Col>
      </Row>
    </div>
  );
};
