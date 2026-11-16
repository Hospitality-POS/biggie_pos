import React from "react";
import { Row, Col, Typography, Space, Tag, Button } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  CheckCircleOutlined,
  DollarOutlined,
  ArrowRightOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  DashboardVATSummary,
  DashboardSalesReceiptsSummary,
} from "@services/accounting/accountingDashboard";
import { fmtK } from "@utils/formatters";

const { Text, Title } = Typography;

interface TaxComplianceTabProps {
  vatSummary: DashboardVATSummary;
  salesReceiptsSummary?: DashboardSalesReceiptsSummary;
  primaryColor: string;
  isMobile: boolean;
  isAdminLayout: boolean;
}

export const TaxComplianceTab: React.FC<TaxComplianceTabProps> = ({
  vatSummary,
  salesReceiptsSummary,
  primaryColor,
  isMobile,
  isAdminLayout,
}) => {
  const navigate = useNavigate();

  const vatCollected = vatSummary?.vat_collected || 0;
  const vatPaid = vatSummary?.vat_paid || 0;
  const netVatPayable = vatSummary?.net_vat_payable || 0;

  return (
    <div style={{ width: "100%" }}>
      {/* ── Section 1: VAT & Tax Compliance ── */}
      <ProCard
        title={
          <Space size={8}>
            <SafetyCertificateOutlined style={{ color: "#10b981" }} />
            <Text strong style={{ fontSize: 14 }}>
              VAT & Statutory Tax Compliance
            </Text>
          </Space>
        }
        bordered
        size="small"
        style={{ marginBottom: isMobile ? 12 : 16 }}
        bodyStyle={{ paddingTop: 12 }}
      >
        <Row gutter={isMobile ? [8, 8] : [16, 16]}>
          <Col xs={24} sm={8}>
            <div
              style={{
                background: "#f0fdf4",
                borderRadius: 10,
                padding: isMobile ? "12px 14px" : "16px 18px",
                textAlign: "center",
                border: "1px solid #bbf7d0",
              }}
            >
              <Text style={{ fontSize: 12, color: "#166534", fontWeight: 500 }}>
                VAT Collected (Output)
              </Text>
              <Text strong style={{ fontSize: 20, color: "#10b981", display: "block", marginTop: 4 }}>
                KES {fmtK(vatCollected)}
              </Text>
              <Text style={{ fontSize: 10, color: "#64748b", display: "block", marginTop: 2 }}>
                From taxable sales & invoices
              </Text>
            </div>
          </Col>

          <Col xs={24} sm={8}>
            <div
              style={{
                background: "#fff7ed",
                borderRadius: 10,
                padding: isMobile ? "12px 14px" : "16px 18px",
                textAlign: "center",
                border: "1px solid #fed7aa",
              }}
            >
              <Text style={{ fontSize: 12, color: "#9a3412", fontWeight: 500 }}>
                VAT Paid (Input)
              </Text>
              <Text strong style={{ fontSize: 20, color: "#f59e0b", display: "block", marginTop: 4 }}>
                KES {fmtK(vatPaid)}
              </Text>
              <Text style={{ fontSize: 10, color: "#64748b", display: "block", marginTop: 2 }}>
                Claimable on business purchases
              </Text>
            </div>
          </Col>

          <Col xs={24} sm={8}>
            <div
              style={{
                background: netVatPayable >= 0 ? "#fef2f2" : "#f0fdf4",
                borderRadius: 10,
                padding: isMobile ? "12px 14px" : "16px 18px",
                textAlign: "center",
                border: `1px solid ${netVatPayable >= 0 ? "#fecaca" : "#bbf7d0"}`,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: netVatPayable >= 0 ? "#991b1b" : "#166534",
                }}
              >
                {netVatPayable >= 0 ? "Net VAT Payable to KRA" : "VAT Refund Due"}
              </Text>
              <Text
                strong
                style={{
                  fontSize: 20,
                  color: netVatPayable >= 0 ? "#ef4444" : "#10b981",
                  display: "block",
                  marginTop: 4,
                }}
              >
                KES {fmtK(Math.abs(netVatPayable))}
              </Text>
              <Text style={{ fontSize: 10, color: "#64748b", display: "block", marginTop: 2 }}>
                {netVatPayable >= 0 ? "Due on 20th of next month" : "Credit carried forward"}
              </Text>
            </div>
          </Col>
        </Row>
      </ProCard>

      {/* ── Section 2: Sales Receipts Summary & Payment Breakdown ── */}
      <ProCard
        title={
          <Space size={8}>
            <DollarOutlined style={{ color: "#3b82f6" }} />
            <Text strong style={{ fontSize: 14 }}>
              Sales Receipts & Channels
            </Text>
          </Space>
        }
        extra={
          !isAdminLayout ? (
            <Button
              type="link"
              size="small"
              onClick={() => navigate("/accounting/receipts")}
              style={{ fontSize: 12, padding: 0 }}
            >
              Sales Receipts <ArrowRightOutlined />
            </Button>
          ) : undefined
        }
        bordered
        size="small"
        bodyStyle={{ paddingTop: 12 }}
      >
        {salesReceiptsSummary ? (
          <div>
            {/* Headline status cards */}
            <Row gutter={isMobile ? [8, 8] : [12, 12]} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={6}>
                <div
                  style={{
                    background: "#f0fdf4",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#166534", fontWeight: 500 }}>
                    Posted Receipts
                  </Text>
                  <Text strong style={{ fontSize: 16, color: "#10b981", display: "block", marginTop: 2 }}>
                    KES {fmtK(salesReceiptsSummary.total_posted)}
                  </Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div
                  style={{
                    background: "#fff7ed",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #fed7aa",
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#9a3412", fontWeight: 500 }}>
                    Pending Settlement
                  </Text>
                  <Text strong style={{ fontSize: 16, color: "#f59e0b", display: "block", marginTop: 2 }}>
                    KES {fmtK(salesReceiptsSummary.total_pending)}
                  </Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div
                  style={{
                    background: "#fef2f2",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #fecaca",
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#991b1b", fontWeight: 500 }}>
                    Voided Receipts
                  </Text>
                  <Text strong style={{ fontSize: 16, color: "#ef4444", display: "block", marginTop: 2 }}>
                    KES {fmtK(salesReceiptsSummary.total_voided)}
                  </Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div
                  style={{
                    background: "#eef2ff",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #c7d2fe",
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#3730a3", fontWeight: 500 }}>
                    VAT on Receipts
                  </Text>
                  <Text strong style={{ fontSize: 16, color: "#6366f1", display: "block", marginTop: 2 }}>
                    KES {fmtK(salesReceiptsSummary.total_vat_collected)}
                  </Text>
                </div>
              </Col>
            </Row>

            {/* Payment method grid */}
            <Title level={5} style={{ fontSize: 13, marginBottom: 8, color: "#0f172a" }}>
              Receipts by Payment Method
            </Title>
            <Row gutter={isMobile ? [8, 8] : [12, 12]}>
              {Object.entries(salesReceiptsSummary.by_payment_method || {}).map(([method, pdata]) => (
                <Col xs={12} sm={8} md={6} key={method}>
                  <div
                    style={{
                      background: "#f8fafc",
                      borderRadius: 8,
                      padding: "10px 12px",
                      borderLeft: `3px solid ${primaryColor}`,
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#64748b",
                        textTransform: "capitalize",
                        display: "block",
                        fontWeight: 500,
                      }}
                    >
                      {method.replace(/_/g, " ")}
                    </Text>
                    <Text strong style={{ fontSize: 14, color: "#0f172a", display: "block", marginTop: 2 }}>
                      KES {fmtK(pdata.total)}
                    </Text>
                    <Text style={{ fontSize: 10, color: "#94a3b8" }}>
                      {pdata.count} receipt{pdata.count !== 1 ? "s" : ""}
                    </Text>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: 12 }}>
            No sales receipts data available for this period
          </div>
        )}
      </ProCard>
    </div>
  );
};
