import React from "react";
import { Card, Col, Row, Statistic, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { CateringLevyReportResponse, CateringLevyDocument } from "@services/accounting/reports";

// Tourism Catering Levy report — eligible sales, exempt sales, levy charged
// and the amount payable to the Tourism Fund (Catering Levy Payable, 2220).

const { Text } = Typography;

const fmt = (v: number) =>
  (v ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (r: number) => `${parseFloat(((r || 0) * 100).toFixed(2))}%`;

const CateringLevyReport: React.FC<{ data: CateringLevyReportResponse; showBranches?: boolean }> = ({ data, showBranches = true }) => {
  const { summary, ledger } = data;

  const stats = [
    { title: "Eligible sales", value: summary.eligible_sales, color: "#0f172a" },
    { title: "Exempt sales", value: summary.exempt_sales, color: "#64748b" },
    { title: "Levy charged", value: summary.levy_charged, color: "#0d9488" },
    { title: "Payable to Tourism Fund", value: ledger.payable, color: "#b45309" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Row gutter={[12, 12]}>
        {stats.map((s) => (
          <Col key={s.title} xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 10 }}>
              <Statistic title={s.title} value={fmt(s.value)} prefix="KES" valueStyle={{ fontSize: 18, color: s.color, fontWeight: 600 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card size="small" title="Catering Levy Payable (2220)" style={{ borderRadius: 10 }}>
        <Row gutter={[12, 8]}>
          <Col xs={24} md={8}>
            <Text type="secondary">Levy collected (posted)</Text>
            <div><Text strong>KES {fmt(ledger.levy_collected)}</Text></div>
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary">Adjustments & remittances</Text>
            <div><Text strong>− KES {fmt(ledger.adjustments)}</Text></div>
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary">Net payable</Text>
            <div><Text strong style={{ color: "#b45309" }}>KES {fmt(ledger.payable)}</Text></div>
          </Col>
        </Row>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 10 }}>
          {summary.documents} document{summary.documents === 1 ? "" : "s"}
          {summary.exempt_documents ? ` · ${summary.exempt_documents} exempt` : ""}
          {summary.rates.length ? ` · rate ${summary.rates.map(pct).join(", ")}` : ""}
          . Levy charged counts all invoices and receipts; the payable is from posted journal entries only.
        </Text>
      </Card>

      {showBranches && data.by_branch.length > 1 && (
        <Table
          size="small"
          title={() => <Text strong>By branch</Text>}
          rowKey={(r) => String(r.shop_id)}
          pagination={false}
          dataSource={data.by_branch}
          columns={[
            { title: "Branch", dataIndex: "shop_name" },
            { title: "Documents", dataIndex: "documents", align: "right" },
            { title: "Eligible sales (KES)", dataIndex: "eligible_sales", align: "right", render: fmt },
            { title: "Exempt sales (KES)", dataIndex: "exempt_sales", align: "right", render: fmt },
            { title: "Levy (KES)", dataIndex: "levy", align: "right", render: (v: number) => <Text strong>{fmt(v)}</Text> },
          ]}
        />
      )}

      <Table<CateringLevyDocument>
        size="small"
        title={() => <Text strong>Documents</Text>}
        rowKey={(r) => `${r.type}-${r.id}`}
        dataSource={data.documents}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        scroll={{ x: 900 }}
        columns={[
          { title: "Date", dataIndex: "date", render: (d: string) => dayjs(d).format("DD MMM YYYY"), width: 110 },
          { title: "Type", dataIndex: "type", render: (t: string) => <Tag color={t === "Invoice" ? "blue" : "green"} bordered={false}>{t}</Tag>, width: 120 },
          { title: "Number", dataIndex: "number", width: 140 },
          { title: "Customer", dataIndex: "customer" },
          ...(showBranches ? [{ title: "Branch", dataIndex: "shop_name" }] : []),
          { title: "Net sale (KES)", dataIndex: "base", align: "right" as const, render: fmt },
          { title: "Rate", dataIndex: "rate", align: "right" as const, render: pct, width: 70 },
          {
            title: "Levy (KES)", key: "levy", align: "right" as const,
            render: (_: unknown, r: CateringLevyDocument) => r.exempt ? <Tag bordered={false}>Exempt</Tag> : <Text strong>{fmt(r.levy)}</Text>,
          },
          { title: "Status", dataIndex: "status", width: 110 },
        ]}
      />
    </div>
  );
};

export default CateringLevyReport;
