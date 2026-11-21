import React, { useRef, useState } from "react";
import { Button, Empty, Modal, Segmented, Space, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  WalletOutlined, PrinterFilled, DownloadOutlined, DollarOutlined, ShoppingCartOutlined, CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import {
  getCreditReport,
  type CreditReport, type CreditReportRow, type CreditReportCustomer, type CreditReportCollection,
} from "@services/orders";
import useSystemDetails from "@hooks/useSystemDetails";
import { fmtKES } from "@utils/formatters";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;
const C = THEME_C;

type View = "orders" | "customers" | "collections";
export type DebtStatus = "unpaid" | "paid" | "all";

const fmtDate = (d?: string | null) => (d ? dayjs(d).format("DD MMM YYYY") : "—");
const STATUS_TAG: Record<string, string> = { Paid: "green", "Part paid": "orange", Unpaid: "red" };
const STATUS_TEXT: Record<DebtStatus, string> = { unpaid: "Still owed", paid: "Fully paid", all: "All pay-later sales" };

const downloadCsv = (filename: string, rows: Record<string, any>[]) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const SummaryCard: React.FC<{ label: string; value: string; sub?: string; color: string; bg: string; icon: React.ReactNode }> = ({
  label, value, sub, color, bg, icon,
}) => (
  <div style={{ flex: "1 1 160px", background: bg, borderRadius: 10, padding: "10px 12px", border: `1px solid ${C.border}` }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 11, color: C.subText }}>{label}</Text>
      <span style={{ color, fontSize: 13 }}>{icon}</span>
    </div>
    <div style={{ fontSize: 17, fontWeight: 700, color }}>{value}</div>
    {sub && <Text style={{ fontSize: 11, color: C.subText }}>{sub}</Text>}
  </div>
);

interface DebtsReportProps {
  openM: boolean;
  onCloseM: () => void;
  startDate: string;
  endDate: string;
  status: DebtStatus;
  customerId?: string;
  shopId?: string;
}

// Reports → Duka → Debts (Pay Later): opened from the Debts tab's Generate
// button, like the other report modals.
const DebtsReportModal: React.FC<DebtsReportProps> = ({ openM, onCloseM, startDate, endDate, status, customerId, shopId }) => {
  const { BRAND_NAME1 } = useSystemDetails();
  const [view, setView] = useState<View>("orders");
  const printRef = useRef<HTMLDivElement>(null);

  const params = {
    shop_id: shopId,
    status,
    customer_id: customerId,
    start_date: startDate ? dayjs(startDate).format("YYYY-MM-DD") : undefined,
    end_date: endDate ? dayjs(endDate).format("YYYY-MM-DD") : undefined,
  };

  const { data: report, isLoading } = useQuery<CreditReport>({
    queryKey: ["creditReport", params],
    queryFn: () => getCreditReport(params),
    enabled: openM && !!startDate && !!endDate,
  });

  const print = useReactToPrint({ content: () => printRef.current });
  const totals = report?.totals;
  const hasData = !!report && (report.rows.length > 0 || report.collections.length > 0);
  const periodText = `${fmtDate(startDate)} – ${fmtDate(endDate)}`;

  const exportCsv = () => {
    if (!report) return;
    const stamp = dayjs().format("YYYY-MM-DD");
    if (view === "orders") {
      downloadCsv(`Debts_by_order_${stamp}.csv`, report.rows.map((r) => ({
        "Sold": fmtDate(r.sold_at), "Order No": r.order_no, "Customer": r.customer_name, "Phone": r.customer_phone,
        "Table": r.table, "Served By": r.served_by, "Bill": r.bill, "Paid": r.paid, "Owed": r.owed,
        "Status": r.status, "Days Owed": r.status === "Paid" ? "" : r.days_outstanding, "Last Payment": fmtDate(r.last_paid_at),
      })));
    } else if (view === "customers") {
      downloadCsv(`Debts_by_customer_${stamp}.csv`, report.by_customer.map((c) => ({
        "Customer": c.customer_name, "Phone": c.customer_phone, "Orders": c.orders, "Bill": c.bill, "Paid": c.paid,
        "Owed": c.owed, "Credit Limit": c.credit_limit || "None", "Total Balance": c.total_balance, "Oldest Unpaid": fmtDate(c.oldest_unpaid),
      })));
    } else {
      downloadCsv(`Debt_collections_${stamp}.csv`, report.collections.map((p) => ({
        "Date": fmtDate(p.paid_at), "Order No": p.order_no, "Customer": p.customer_name,
        "Method": p.method, "Reference": p.reference, "Amount": p.amount,
      })));
    }
  };

  const orderColumns: ColumnsType<CreditReportRow> = [
    { title: "Sold", dataIndex: "sold_at", render: (v) => fmtDate(v) },
    { title: "Order No.", dataIndex: "order_no" },
    {
      title: "Customer", key: "customer",
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 12 }}>{r.customer_name}</Text>
          {r.customer_phone && <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{r.customer_phone}</Text>}
        </div>
      ),
    },
    { title: "Bill", dataIndex: "bill", align: "right", render: (v) => fmtKES(v) },
    { title: "Paid", dataIndex: "paid", align: "right", render: (v) => fmtKES(v) },
    { title: "Owed", dataIndex: "owed", align: "right", render: (v) => <Text strong style={{ color: v > 0 ? C.orange : C.darkText }}>{fmtKES(v)}</Text> },
    { title: "Status", dataIndex: "status", render: (v) => <Tag color={STATUS_TAG[v]}>{v}</Tag> },
    {
      title: "Days owed", dataIndex: "days_outstanding", align: "right",
      render: (v, r) => (r.status === "Paid" ? "—" : <Tag color={v >= 30 ? "red" : v >= 7 ? "orange" : "default"}>{v}d</Tag>),
    },
    { title: "Last payment", dataIndex: "last_paid_at", render: (v) => fmtDate(v) },
  ];

  const customerColumns: ColumnsType<CreditReportCustomer> = [
    {
      title: "Customer", key: "customer",
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 12 }}>{r.customer_name}</Text>
          {r.customer_phone && <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{r.customer_phone}</Text>}
        </div>
      ),
    },
    { title: "Orders", dataIndex: "orders", align: "right" },
    { title: "Bill", dataIndex: "bill", align: "right", render: (v) => fmtKES(v) },
    { title: "Paid", dataIndex: "paid", align: "right", render: (v) => fmtKES(v) },
    { title: "Owed", dataIndex: "owed", align: "right", render: (v) => <Text strong style={{ color: v > 0 ? C.orange : C.darkText }}>{fmtKES(v)}</Text> },
    { title: "Credit limit", dataIndex: "credit_limit", align: "right", render: (v) => (v > 0 ? fmtKES(v) : "None") },
    {
      title: "Credit left", key: "left", align: "right",
      render: (_, r) => {
        if (!(r.credit_limit > 0)) return "Unlimited";
        const left = r.credit_limit - r.total_balance;
        return left <= 0 ? <Tag color="red">Limit reached</Tag> : fmtKES(left);
      },
    },
    { title: "Oldest unpaid", dataIndex: "oldest_unpaid", render: (v) => fmtDate(v) },
  ];

  const collectionColumns: ColumnsType<CreditReportCollection> = [
    { title: "Date", dataIndex: "paid_at", render: (v) => fmtDate(v) },
    { title: "Order No.", dataIndex: "order_no" },
    { title: "Customer", dataIndex: "customer_name" },
    { title: "Method", dataIndex: "method" },
    { title: "Reference", dataIndex: "reference", render: (v) => v || "—" },
    { title: "Amount", dataIndex: "amount", align: "right", render: (v) => <Text strong style={{ color: C.green }}>{fmtKES(v)}</Text> },
  ];

  const viewLabel = view === "orders" ? "By order" : view === "customers" ? "By customer" : "Collections";

  return (
    <Modal
      open={openM}
      onCancel={onCloseM}
      destroyOnClose
      width={1040}
      style={{ top: 20 }}
      styles={{ body: { padding: "16px 20px" } }}
      title={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 32, gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
              <WalletOutlined />
            </div>
            <Text strong style={{ fontSize: 14, color: C.darkText }}>Debts Report (Pay Later)</Text>
          </div>
          <Segmented
            value={view}
            onChange={(v) => setView(v as View)}
            options={[
              { value: "orders", label: "By order" },
              { value: "customers", label: "By customer" },
              { value: "collections", label: "Collections" },
            ]}
            style={{ fontSize: 12 }}
          />
        </div>
      }
      footer={
        <Space>
          <Button onClick={onCloseM} style={{ borderRadius: 8 }}>Cancel</Button>
          <Button icon={<DownloadOutlined />} disabled={isLoading || !hasData} onClick={exportCsv} style={{ borderRadius: 8 }}>
            Export CSV
          </Button>
          <Button
            type="primary" icon={<PrinterFilled />} disabled={isLoading || !hasData} onClick={print}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 600 }}
          >
            Print A4 Report
          </Button>
        </Space>
      }
    >
      <Spin spinning={isLoading} tip="Generating debts report…" style={{ display: "block", width: "100%" }}>
        {!hasData && !isLoading ? (
          <Empty description="No pay-later sales found for the selected filters" style={{ padding: "40px 0" }} />
        ) : (
          <div ref={printRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } body { -webkit-print-color-adjust: exact; } }`}</style>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
              <Text strong style={{ fontSize: 13 }}>{BRAND_NAME1 || "Debts Report"}</Text>
              <Text style={{ fontSize: 12, color: C.subText }}>
                Sales {periodText} · {STATUS_TEXT[status]} · {viewLabel}
              </Text>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <SummaryCard label="Owed" value={fmtKES(totals?.owed || 0)} sub={`${totals?.unpaid_orders || 0} unpaid order(s)`} color={C.orange} bg="#fff7ed" icon={<WalletOutlined />} />
              <SummaryCard label="Sold on credit" value={fmtKES(totals?.bill || 0)} sub={`${totals?.orders || 0} order(s)`} color={C.purple} bg="#f5f3ff" icon={<ShoppingCartOutlined />} />
              <SummaryCard label="Paid on these orders" value={fmtKES(totals?.paid || 0)} sub="At sale + collected since" color={C.blue} bg="#eff6ff" icon={<CheckCircleOutlined />} />
              <SummaryCard label="Collected in period" value={fmtKES(totals?.collected || 0)} sub={`${report?.collections?.length || 0} payment(s)`} color={C.green} bg="#f0fdf4" icon={<DollarOutlined />} />
            </div>

            {view === "orders" && (
              <Table<CreditReportRow>
                rowKey="_id" size="small" dataSource={report?.rows || []} columns={orderColumns}
                scroll={{ x: 900 }} pagination={false}
                summary={(data) => {
                  if (!data.length) return null;
                  const sum = (k: "bill" | "paid" | "owed") => data.reduce((s, r) => s + (r[k] || 0), 0);
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}><Text strong>Total</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right"><Text strong>{fmtKES(sum("bill"))}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right"><Text strong>{fmtKES(sum("paid"))}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right"><Text strong style={{ color: C.orange }}>{fmtKES(sum("owed"))}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={6} colSpan={3} />
                    </Table.Summary.Row>
                  );
                }}
              />
            )}
            {view === "customers" && (
              <Table<CreditReportCustomer>
                rowKey={(r) => String(r.customer_id || r.customer_name)} size="small"
                dataSource={report?.by_customer || []} columns={customerColumns} scroll={{ x: 900 }} pagination={false}
              />
            )}
            {view === "collections" && (
              <Table<CreditReportCollection>
                rowKey="_id" size="small" dataSource={report?.collections || []} columns={collectionColumns}
                scroll={{ x: 700 }} pagination={false}
                locale={{ emptyText: <Empty description="No payments collected on debts in this period" /> }}
              />
            )}
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default DebtsReportModal;
