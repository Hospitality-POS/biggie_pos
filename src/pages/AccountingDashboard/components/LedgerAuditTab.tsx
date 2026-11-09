import React from "react";
import { Row, Col, Typography, Space, Tag, Table, Alert, Button } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  FileTextOutlined,
  WarningOutlined,
  SwapOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  DashboardJournalSummary,
  DashboardNotesSummary,
  RecentJournalEntry,
} from "@services/accounting/accountingDashboard";
import { fmtK } from "@utils/formatters";
import { SOURCE_COLORS } from "./constants";

const { Text } = Typography;

interface LedgerAuditTabProps {
  journalSummary: DashboardJournalSummary;
  notesSummary: DashboardNotesSummary;
  recentEntries: RecentJournalEntry[];
  isMobile: boolean;
  isAdminLayout: boolean;
}

export const LedgerAuditTab: React.FC<LedgerAuditTabProps> = ({
  journalSummary,
  notesSummary,
  recentEntries = [],
  isMobile,
  isAdminLayout,
}) => {
  const navigate = useNavigate();

  const recentCols = [
    {
      title: "Entry #",
      dataIndex: "entry_no",
      width: 130,
      render: (v: string) => (
        <Text code style={{ fontSize: 11, whiteSpace: "nowrap" }}>
          {v}
        </Text>
      ),
    },
    {
      title: "Date",
      dataIndex: "entry_date",
      width: 90,
      render: (d: string) => (
        <span style={{ whiteSpace: "nowrap", fontSize: 11 }}>
          {dayjs(d).format("DD MMM YY")}
        </span>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      ellipsis: true,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: "Source",
      dataIndex: "source",
      width: 105,
      render: (s: string) => (
        <Tag
          style={{
            background: `${SOURCE_COLORS[s] || "#94a3b8"}18`,
            color: SOURCE_COLORS[s] || "#64748b",
            border: "none",
            fontSize: 10,
            borderRadius: 4,
            whiteSpace: "nowrap",
          }}
        >
          {s?.replace(/_/g, " ").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "total_debit",
      width: 115,
      align: "right" as const,
      render: (v: number) => (
        <Text strong style={{ fontSize: 12, color: "#1d39c4", whiteSpace: "nowrap" }}>
          KES {fmtK(v)}
        </Text>
      ),
    },
  ];

  return (
    <div style={{ width: "100%" }}>
      {/* ── Section 1: Recent Journal Entries ── */}
      <ProCard
        title={
          <Space size={8}>
            <FileTextOutlined style={{ color: "#3b82f6" }} />
            <Text strong style={{ fontSize: 14 }}>
              Recent General Ledger Entries
            </Text>
          </Space>
        }
        extra={
          <Space size="middle">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Tag color="default">📝 {journalSummary?.draft_count || 0} Draft</Tag>
              <Tag color="success">✓ {journalSummary?.posted_count || 0} Posted</Tag>
              {(journalSummary?.voided_count || 0) > 0 && (
                <Tag color="error">✗ {journalSummary?.voided_count} Voided</Tag>
              )}
            </div>
            {!isAdminLayout && (
              <Button
                type="link"
                size="small"
                onClick={() => navigate("/accounting/journals")}
                style={{ fontSize: 12, padding: 0 }}
              >
                All Journals <ArrowRightOutlined />
              </Button>
            )}
          </Space>
        }
        bordered
        size="small"
        style={{ marginBottom: isMobile ? 12 : 16 }}
        bodyStyle={{ paddingTop: 10 }}
      >
        <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
          <Table
            rowKey="_id"
            dataSource={recentEntries.slice(0, 8)}
            columns={recentCols}
            pagination={false}
            size="small"
            scroll={{ x: 550 }}
            locale={{ emptyText: "No posted journal entries recorded this period" }}
          />
        </div>
      </ProCard>

      {/* ── Section 2: Credit & Debit Notes Overview ── */}
      <ProCard
        title={
          <Space size={8}>
            <SwapOutlined style={{ color: "#8b5cf6" }} />
            <Text strong style={{ fontSize: 14 }}>
              Credit & Debit Notes
            </Text>
          </Space>
        }
        extra={
          !isAdminLayout ? (
            <Button
              type="link"
              size="small"
              onClick={() => navigate("/accounting/notes")}
              style={{ fontSize: 12, padding: 0 }}
            >
              Notes <ArrowRightOutlined />
            </Button>
          ) : undefined
        }
        bordered
        size="small"
        bodyStyle={{ paddingTop: 12 }}
      >
        {notesSummary?.pending_approval > 0 && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message={`${notesSummary.pending_approval} note${
              notesSummary.pending_approval > 1 ? "s" : ""
            } awaiting manager review and approval`}
            style={{ marginBottom: 12, fontSize: 12 }}
          />
        )}

        <Row gutter={isMobile ? [8, 8] : [16, 16]}>
          <Col xs={24} sm={12}>
            <div
              style={{
                background: "#f0fdf4",
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid #bbf7d0",
              }}
            >
              <Text style={{ fontSize: 12, color: "#166534", fontWeight: 500 }}>
                Total Credit Notes
              </Text>
              <Text strong style={{ fontSize: 18, color: "#10b981", display: "block", marginTop: 4 }}>
                KES {fmtK(notesSummary?.total_credit_notes || 0)}
              </Text>
              <Text style={{ fontSize: 10, color: "#64748b", display: "block", marginTop: 2 }}>
                Customer invoice reductions & returns
              </Text>
            </div>
          </Col>

          <Col xs={24} sm={12}>
            <div
              style={{
                background: "#fff7ed",
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid #fed7aa",
              }}
            >
              <Text style={{ fontSize: 12, color: "#9a3412", fontWeight: 500 }}>
                Net Ledger Adjustment
              </Text>
              <Text
                strong
                style={{
                  fontSize: 18,
                  color: (notesSummary?.net_adjustment || 0) >= 0 ? "#10b981" : "#ef4444",
                  display: "block",
                  marginTop: 4,
                }}
              >
                KES {fmtK(Math.abs(notesSummary?.net_adjustment || 0))}
              </Text>
              <Text style={{ fontSize: 10, color: "#64748b", display: "block", marginTop: 2 }}>
                {(notesSummary?.net_adjustment || 0) >= 0
                  ? "Net positive ledger balance"
                  : "Net negative adjustment offset"}
              </Text>
            </div>
          </Col>
        </Row>
      </ProCard>
    </div>
  );
};
