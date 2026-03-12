import React, { useEffect, useRef, useState } from "react";
import { ProDescriptions } from "@ant-design/pro-components";
import {
  Badge, Button, Empty, Space, Spin,
  Table, Tabs, Tag, Tooltip, Typography,
} from "antd";
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FilePdfOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import { getNotesByInvoice } from "@services/accounting/notes";
import useSystemDetails from "@hooks/useSystemDetails";

const { Text } = Typography;

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  orange: "#f59e0b",
  purple: "#8b5cf6",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

const fmt = (v: number) =>
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Mobile hook ──────────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProductRef { _id: string; name: string; price: number }
interface UserRef { _id: string; username: string }
interface VATDetail { rate: number; amount: number; net: number }

interface InvoiceItem {
  _id: string;
  product_id?: ProductRef;
  quantity: number;
  price: number;
  vat_amount: number;
}

interface PaymentRecord {
  _id: string;
  amount: number;
  method?: string;
  method_id?: { _id: string; name: string };
  reference?: string;
  notes?: string;
  createdAt: string;
  created_by?: UserRef;
}

export interface InvoiceDetailsInterface {
  _id: string;
  order_no: string;
  invoice_no?: string;
  shop_id?: string;
  createdAt: string;
  served_by?: UserRef;
  created_by?: UserRef;
  items: InvoiceItem[];
  subtotal: number;
  total_vat_amount: number;
  vat_breakdown?: Record<string, VATDetail>;
  discount_amount: number;
  vat_pricing_mode?: string;
  grand_total: number;
  amount_paid?: number;
  amount_due?: number;
  status?: string;
  payment_ids?: PaymentRecord[];
  payments?: PaymentRecord[];
  // any extra fields surfaced by the invoice controller
  [key: string]: any;
}

// ─── Shared micro-components ─────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span style={{
    display: "block", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.5px", textTransform: "uppercase",
    color: C.subText, marginBottom: 8,
  }}>
    {children}
  </span>
);

const MetaRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "7px 0", borderBottom: `1px solid ${C.border}`,
  }}>
    <Text style={{ fontSize: 11, color: C.subText, flexShrink: 0, marginRight: 12 }}>{label}</Text>
    <div style={{ textAlign: "right" }}>{children}</div>
  </div>
);

const ItemRow = ({ item }: { item: InvoiceItem }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    flexWrap: "wrap", gap: 4,
    padding: "7px 10px", background: C.bg,
    border: `1px solid ${C.border}`, borderRadius: 7,
  }}>
    <Text style={{ fontSize: 12, flex: "1 1 120px" }}>
      <span style={{ fontWeight: 700, color: C.darkText, marginRight: 4 }}>{item.quantity}×</span>
      {item.product_id?.name || "—"}
    </Text>
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
      <Text style={{ fontSize: 12 }}>KES {fmt(item.price)}</Text>
      {item.vat_amount > 0 && (
        <span style={{
          background: "#eff6ff", color: C.blue, border: "1px solid #bfdbfe",
          borderRadius: 5, padding: "1px 7px", fontSize: 10, fontWeight: 700,
        }}>
          VAT: KES {item.vat_amount.toFixed(2)}
        </span>
      )}
    </div>
  </div>
);

// ─── TAB 1: Invoice details ───────────────────────────────────────────────────
const DetailsTab = ({ record, isMobile }: { record: InvoiceDetailsInterface; isMobile: boolean }) => {
  const {
    items = [], served_by, created_by, subtotal,
    total_vat_amount, vat_breakdown, discount_amount,
    vat_pricing_mode, grand_total, order_no, createdAt,
  } = record;

  const vatRows = vat_breakdown
    ? Object.entries(vat_breakdown).map(([type, d]) => ({
      label: `VAT (${type})`,
      value: `KES ${d?.amount?.toFixed(2) || "0.00"} (${((d?.rate || 0) * 100).toFixed(0)}%)`,
    }))
    : [];

  if (isMobile) return (
    <div style={{ padding: "8px 0" }}>
      {/* Meta block */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
        <SectionLabel>Order Details</SectionLabel>
        <MetaRow label="Invoice No."><Text strong style={{ fontSize: 12 }}>{order_no}</Text></MetaRow>
        <MetaRow label="Date"><Text style={{ fontSize: 12, color: C.subText }}>{new Date(createdAt).toLocaleString()}</Text></MetaRow>
        <MetaRow label="Served By"><Text style={{ fontSize: 12 }}>{served_by?.username || "N/A"}</Text></MetaRow>
        <MetaRow label="Created By"><Text style={{ fontSize: 12 }}>{created_by?.username || "N/A"}</Text></MetaRow>
        {vat_pricing_mode && (
          <MetaRow label="Pricing Mode"><Text style={{ fontSize: 12 }}>{vat_pricing_mode}</Text></MetaRow>
        )}
      </div>

      {/* Items */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
        <SectionLabel>Items ({items.length})</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((item) => <ItemRow key={item._id} item={item} />)}
        </div>
      </div>

      {/* Summary */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
        <SectionLabel>Summary</SectionLabel>
        <MetaRow label="Subtotal"><Text strong style={{ fontSize: 12 }}>KES {fmt(subtotal)}</Text></MetaRow>
        {vatRows.map((r, i) => <MetaRow key={i} label={r.label}><Text style={{ fontSize: 12 }}>{r.value}</Text></MetaRow>)}
        {total_vat_amount > 0 && (
          <MetaRow label="Total VAT">
            <span style={{ background: "#eff6ff", color: C.blue, border: "1px solid #bfdbfe", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
              KES {fmt(total_vat_amount)}
            </span>
          </MetaRow>
        )}
        {discount_amount > 0 && (
          <MetaRow label="Discount">
            <span style={{ background: "#fffbeb", color: C.orange, border: "1px solid #fde68a", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
              −KES {fmt(discount_amount)}
            </span>
          </MetaRow>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
          <Text style={{ fontSize: 12, color: C.subText }}>Grand Total</Text>
          <Text strong style={{ fontSize: 15, color: C.primary }}>KES {fmt(grand_total)}</Text>
        </div>
      </div>
    </div>
  );

  // ── Desktop ──
  return (
    <div style={{ padding: 16, background: C.bg }}>
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <ProDescriptions column={2} bordered size="small">
          <ProDescriptions.Item label="Invoice Number">
            <Text strong style={{ fontSize: 12 }}>{order_no}</Text>
          </ProDescriptions.Item>
          <ProDescriptions.Item label="Date">
            <Text style={{ fontSize: 12, color: C.subText }}>{new Date(createdAt).toLocaleString()}</Text>
          </ProDescriptions.Item>
          <ProDescriptions.Item label="Served By">
            <Text style={{ fontSize: 12 }}>{served_by?.username || "N/A"}</Text>
          </ProDescriptions.Item>
          <ProDescriptions.Item label="Created By">
            <Text style={{ fontSize: 12 }}>{created_by?.username || "N/A"}</Text>
          </ProDescriptions.Item>
          <ProDescriptions.Item label="Items" span={2}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
              {items.map((item) => <ItemRow key={item._id} item={item} />)}
            </div>
          </ProDescriptions.Item>
          {vat_pricing_mode && (
            <ProDescriptions.Item label="Pricing Mode" span={2}>
              <Text style={{ fontSize: 12 }}>{vat_pricing_mode}</Text>
            </ProDescriptions.Item>
          )}
          <ProDescriptions.Item label="Subtotal" span={2}>
            <Text strong style={{ fontSize: 12 }}>KES {fmt(subtotal)}</Text>
          </ProDescriptions.Item>
          {vatRows.map((r, i) => (
            <ProDescriptions.Item key={i} label={r.label}>
              <Text style={{ fontSize: 12 }}>{r.value}</Text>
            </ProDescriptions.Item>
          ))}
          {total_vat_amount > 0 && (
            <ProDescriptions.Item label="Total VAT" span={2}>
              <span style={{ background: "#eff6ff", color: C.blue, border: "1px solid #bfdbfe", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                KES {fmt(total_vat_amount)}
              </span>
            </ProDescriptions.Item>
          )}
          {discount_amount > 0 && (
            <ProDescriptions.Item label="Discount" span={2}>
              <span style={{ background: "#fffbeb", color: C.orange, border: "1px solid #fde68a", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                −KES {fmt(discount_amount)}
              </span>
            </ProDescriptions.Item>
          )}
          <ProDescriptions.Item label="Grand Total" span={2}>
            <Text strong style={{ fontSize: 14, color: C.primary }}>KES {fmt(grand_total)}</Text>
          </ProDescriptions.Item>
        </ProDescriptions>
      </div>
    </div>
  );
};

// ─── TAB 2: Payments ──────────────────────────────────────────────────────────
const PaymentsTab = ({ record }: { record: InvoiceDetailsInterface }) => {
  // payment_ids is populated by the backend and also remapped to `payments`
  const payments: PaymentRecord[] = record.payments || record.payment_ids || [];

  if (!payments.length) return (
    <div style={{ padding: "12px 16px" }}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={<Text style={{ fontSize: 12, color: C.subText }}>No payment records found</Text>}
        style={{ padding: "16px 0" }}
      />
    </div>
  );

  const total = payments.reduce((s, p) => s + (p.amount || 0), 0);

  const columns = [
    {
      title: "Date", dataIndex: "createdAt", key: "date", width: 140,
      render: (v: string) => <Text style={{ fontSize: 11, color: C.subText }}>{v ? dayjs(v).format("DD MMM YYYY HH:mm") : "—"}</Text>,
    },
    {
      title: "Method", key: "method",
      render: (_: any, r: PaymentRecord) => (
        <Tag color="blue" style={{ fontSize: 10 }}>
          <CreditCardOutlined style={{ marginRight: 3 }} />
          {r.method_id?.name || r.method || "—"}
        </Tag>
      ),
    },
    {
      title: "Reference", dataIndex: "reference", key: "ref",
      render: (v: string) => v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : <Text style={{ color: C.subText }}>—</Text>,
    },
    {
      title: "Amount", dataIndex: "amount", key: "amount", align: "right" as const,
      render: (v: number) => <Text strong style={{ fontSize: 12, color: C.green }}>KES {fmt(v)}</Text>,
    },
    {
      title: "By", key: "by",
      render: (_: any, r: PaymentRecord) => <Text style={{ fontSize: 11 }}>{r.created_by?.username || "—"}</Text>,
    },
  ];

  return (
    <div style={{ padding: "12px 16px" }}>
      <Table
        rowKey="_id"
        columns={columns}
        dataSource={payments}
        pagination={false}
        size="small"
        scroll={{ x: 500 }}
      />
      <div style={{
        display: "flex", justifyContent: "flex-end",
        padding: "8px 12px", background: "#f0fdf4",
        border: "1px solid #bbf7d0", borderRadius: 8, marginTop: 10,
        gap: 10, alignItems: "center",
      }}>
        <DollarOutlined style={{ color: C.green }} />
        <Text style={{ fontSize: 12, color: C.subText }}>Total Paid:</Text>
        <Text strong style={{ fontSize: 13, color: C.green }}>KES {fmt(total)}</Text>
      </div>
    </div>
  );
};

// ─── TAB 3: Credit / Debit Notes ─────────────────────────────────────────────
const NOTE_TYPE_COLOR: Record<string, string> = {
  CREDIT_NOTE: "green",
  DEBIT_NOTE: "orange",
};

const NotesTab = ({
  invoiceId, shopId, onOpenNote,
}: {
  invoiceId: string;
  shopId: string;
  onOpenNote: (id: string) => void;
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ["notes-by-invoice", invoiceId],
    queryFn: () => getNotesByInvoice(invoiceId, shopId),
    enabled: !!invoiceId && !!shopId,
  });

  const notes: any[] = data?.notes || [];
  const summary = data?.summary;

  if (isLoading) return (
    <div style={{ textAlign: "center", padding: "28px 0" }}>
      <Spin size="small" /><br />
      <Text style={{ fontSize: 12, color: C.subText }}>Loading notes…</Text>
    </div>
  );

  if (!notes.length) return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <span>
          <Text style={{ fontSize: 12, color: C.subText }}>No credit / debit notes attached to this invoice.</Text>
          <br />
          <Text style={{ fontSize: 11, color: C.subText }}>Go to <strong>Credit / Debit Notes</strong> to create one.</Text>
        </span>
      }
      style={{ padding: "20px 0" }}
    />
  );

  return (
    <div>
      {/* Summary strip */}
      {summary && (
        <div style={{
          display: "flex", gap: 20, flexWrap: "wrap",
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "8px 14px", marginBottom: 12,
        }}>
          {summary.total_credit_notes > 0 && (
            <Space size={4}>
              <Text style={{ fontSize: 11, color: C.subText }}>Credits applied:</Text>
              <Text strong style={{ fontSize: 11, color: C.green }}>−KES {fmt(summary.total_credit_notes)}</Text>
            </Space>
          )}
          {summary.total_debit_notes > 0 && (
            <Space size={4}>
              <Text style={{ fontSize: 11, color: C.subText }}>Debits applied:</Text>
              <Text strong style={{ fontSize: 11, color: C.orange }}>+KES {fmt(summary.total_debit_notes)}</Text>
            </Space>
          )}
        </div>
      )}

      {/* Note rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {notes.map((note: any) => (
          <div key={note._id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8,
            background: "#fff", border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "10px 14px",
          }}>
            {/* Left */}
            <Space size={8} wrap>
              <Tag color={NOTE_TYPE_COLOR[note.note_type] || "default"} style={{ fontSize: 10, margin: 0 }}>
                {note.note_type === "CREDIT_NOTE" ? "Credit Note" : "Debit Note"}
              </Tag>
              <Text code style={{ fontSize: 11 }}>{note.note_no}</Text>
              <Text style={{ fontSize: 12, color: C.darkText }}>{note.reason}</Text>
            </Space>

            {/* Middle */}
            <Space size={12} wrap>
              <Text strong style={{ fontSize: 13, color: note.note_type === "CREDIT_NOTE" ? C.green : C.orange }}>
                {note.note_type === "CREDIT_NOTE" ? "−" : "+"}KES {fmt(note.grand_total)}
              </Text>
              <Tag color={
                note.status === "Applied" ? "success" :
                  note.status === "Approved" ? "processing" :
                    note.status === "Voided" ? "error" : "default"
              } style={{ fontSize: 10 }}>
                {note.status}
              </Tag>
              <Text style={{ fontSize: 11, color: C.subText }}>
                {dayjs(note.issue_date).format("DD MMM YYYY")}
              </Text>
            </Space>

            {/* Right — open note in drawer */}
            <Tooltip title="Open note details">
              <Button
                size="small"
                type="primary"
                icon={<ArrowRightOutlined />}
                onClick={() => onOpenNote(note._id)}
                style={{ background: C.primary, borderColor: C.primary, borderRadius: 6, fontSize: 11 }}
              >
                View Note
              </Button>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── TAB 4: Receipt / PDF ─────────────────────────────────────────────────────
// The receipt is always mounted (display:none) so useReactToPrint can find it.
// When the tab is open we render a visible preview clone.
const ReceiptContent = ({ record, systemDetails }: { record: InvoiceDetailsInterface; systemDetails: any }) => {
  const items = record.items || [];
  const {
    BRAND_NAME1, EMAIL_URL, PHONE_NO, PIN, TILL_NO, Paybill_bs, Paybill_ac,
  } = systemDetails || {};

  return (
    <div style={{ fontFamily: "'Segoe UI', Roboto, sans-serif", color: "#1e293b", background: "#fff", padding: 32 }}>
      {/* Header */}
      <div style={{
        background: C.primary, color: "#fff",
        margin: "-32px -32px 24px", padding: "18px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.5 }}>{BRAND_NAME1 || "Business"}</div>
          {PHONE_NO && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 3 }}>{PHONE_NO}</div>}
          {EMAIL_URL && <div style={{ fontSize: 11, opacity: 0.8 }}>{EMAIL_URL}</div>}
          {PIN && <div style={{ fontSize: 11, opacity: 0.8 }}>PIN: {PIN}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: 5, padding: "4px 12px", fontWeight: 700, fontSize: 12, marginBottom: 6,
          }}>
            {record.status === "Draft" ? "QUOTE" : "TAX INVOICE"}
          </div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>{record.order_no || record.invoice_no}</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
            {record.createdAt ? dayjs(record.createdAt).format("DD MMM YYYY HH:mm") : ""}
          </div>
        </div>
      </div>

      {/* Customer / invoice meta */}
      <div style={{
        display: "flex", gap: 32, marginBottom: 22,
        paddingBottom: 14, borderBottom: `1px solid ${C.border}`,
        flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 10, color: C.subText, textTransform: "uppercase", fontWeight: 700, marginBottom: 5 }}>Billed To</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {record.customer_id?.customer_name || record.counterparty_name || "—"}
          </div>
          {record.counterparty_phone && <div style={{ fontSize: 11, color: C.subText }}>{record.counterparty_phone}</div>}
          {record.counterparty_email && <div style={{ fontSize: 11, color: C.subText }}>{record.counterparty_email}</div>}
        </div>
        {(TILL_NO || Paybill_bs) && (
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 10, color: C.subText, textTransform: "uppercase", fontWeight: 700, marginBottom: 5 }}>Pay To</div>
            {TILL_NO && <div style={{ fontSize: 12 }}>Till No: <strong>{TILL_NO}</strong></div>}
            {Paybill_bs && <div style={{ fontSize: 12 }}>Paybill: <strong>{Paybill_bs}</strong> Acc: <strong>{Paybill_ac}</strong></div>}
          </div>
        )}
      </div>

      {/* Items table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            {["#", "Item", "Qty", "Unit Price", "VAT", "Total"].map((h) => (
              <th key={h} style={{
                padding: "8px 10px", textAlign: ["#", "Qty"].includes(h) ? "center" : ["Unit Price", "VAT", "Total"].includes(h) ? "right" : "left",
                fontWeight: 700, fontSize: 11, borderBottom: "2px solid #e2e8f0",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length ? items.map((item, i) => (
            <tr key={item._id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
              <td style={{ padding: "7px 10px", textAlign: "center", borderBottom: "1px solid #f1f5f9" }}>{i + 1}</td>
              <td style={{ padding: "7px 10px", fontWeight: 600, borderBottom: "1px solid #f1f5f9" }}>{item.product_id?.name || "—"}</td>
              <td style={{ padding: "7px 10px", textAlign: "center", borderBottom: "1px solid #f1f5f9" }}>{item.quantity}</td>
              <td style={{ padding: "7px 10px", textAlign: "right", borderBottom: "1px solid #f1f5f9" }}>KES {fmt(item.price)}</td>
              <td style={{ padding: "7px 10px", textAlign: "right", borderBottom: "1px solid #f1f5f9" }}>
                {item.vat_amount > 0 ? `KES ${fmt(item.vat_amount)}` : "—"}
              </td>
              <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>
                KES {fmt(item.price * item.quantity)}
              </td>
            </tr>
          )) : (
            <tr><td colSpan={6} style={{ textAlign: "center", padding: 20, color: C.subText }}>No items</td></tr>
          )}
        </tbody>
      </table>

      {/* Totals block */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{
          width: 260, background: "#f8fafc",
          border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 16px",
        }}>
          {[
            { label: "Subtotal", value: fmt(record.subtotal || 0) },
            ...(record.discount_amount > 0 ? [{ label: "Discount", value: `− ${fmt(record.discount_amount)}` }] : []),
            { label: "VAT", value: fmt(record.total_vat_amount || 0) },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
              <span style={{ color: C.subText }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{value}</span>
            </div>
          ))}
          <div style={{ borderTop: `2px solid ${C.border}`, margin: "8px 0 6px" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Grand Total</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.primary }}>KES {fmt(record.grand_total)}</span>
          </div>
          {(record.amount_paid || 0) > 0 && <>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
              <span style={{ color: C.green }}>Amount Paid</span>
              <span style={{ fontWeight: 600, color: C.green }}>KES {fmt(record.amount_paid || 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: record.amount_due! > 0 ? C.orange : C.green }}>Balance Due</span>
              <span style={{ fontWeight: 600, color: record.amount_due! > 0 ? C.orange : C.green }}>
                KES {fmt(record.amount_due || 0)}
              </span>
            </div>
          </>}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, borderTop: `2px solid ${C.border}`, paddingTop: 16, textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>Thank you for your business!</div>
        <div style={{ fontSize: 11, color: C.subText }}>Printed on {new Date().toLocaleDateString()}</div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
};

// ─── Main exported component ──────────────────────────────────────────────────
export interface ExpandableInvoiceProps {
  record: InvoiceDetailsInterface;
  onOpenNote?: (noteId: string) => void;
}

const ExpandableInvoice = ({ record, onOpenNote }: ExpandableInvoiceProps) => {
  const isMobile = useIsMobile();
  const printRef = useRef<HTMLDivElement>(null);
  const systemDetails = useSystemDetails();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Invoice-${record.order_no || record._id}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 14mm; }
      @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    `,
  });

  // Resolve shop_id from record or from localStorage tenant fallback
  const shopId: string = (() => {
    if (record.shop_id) return String(record.shop_id);
    try {
      const t = JSON.parse(localStorage.getItem("tenant") || "{}");
      return t.default_shop?._id || t.shops?.[0]?._id || t._id || "";
    } catch { return ""; }
  })();

  // Prefetch note count for the tab badge
  const { data: notesData } = useQuery({
    queryKey: ["notes-by-invoice", record._id],
    queryFn: () => getNotesByInvoice(record._id, shopId),
    enabled: !!record._id && !!shopId,
    staleTime: 30_000,
  });
  const noteCount = notesData?.notes?.length || 0;
  const paymentCount = (record.payments || record.payment_ids || []).length;

  const tabItems = [
    // ── Tab 1: Details ──────────────────────────────────────────────────────
    {
      key: "details",
      label: (
        <Space size={4}>
          <FileTextOutlined />
          <span>Details</span>
        </Space>
      ),
      children: <DetailsTab record={record} isMobile={isMobile} />,
    },

    // ── Tab 2: Payments ─────────────────────────────────────────────────────
    {
      key: "payments",
      label: (
        <Space size={4}>
          <DollarOutlined />
          <span>Payments</span>
          {paymentCount > 0 && (
            <Badge count={paymentCount} size="small"
              style={{ backgroundColor: C.green, fontSize: 9, marginLeft: 2 }} />
          )}
        </Space>
      ),
      children: <PaymentsTab record={record} />,
    },

    // ── Tab 3: Credit / Debit Notes ─────────────────────────────────────────
    {
      key: "notes",
      label: (
        <Space size={4}>
          <FileSearchOutlined />
          <span>Credit / Debit Notes</span>
          {noteCount > 0 && (
            <Badge count={noteCount} size="small"
              style={{ backgroundColor: C.purple, fontSize: 9, marginLeft: 2 }} />
          )}
        </Space>
      ),
      children: (
        <div style={{ padding: "12px 16px" }}>
          <NotesTab
            invoiceId={record._id}
            shopId={shopId}
            onOpenNote={(id) => onOpenNote?.(id)}
          />
        </div>
      ),
    },

    // ── Tab 4: Receipt / PDF ────────────────────────────────────────────────
    {
      key: "receipt",
      label: (
        <Space size={4}>
          <FilePdfOutlined />
          <span>Receipt / PDF</span>
        </Space>
      ),
      children: (
        <div style={{ padding: 16 }}>
          {/* Toolbar */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#fff", border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "10px 16px", marginBottom: 14,
          }}>
            <div>
              <Text strong style={{ fontSize: 13 }}>
                {record.status === "Draft" ? "Quote" : "Invoice"} Receipt
              </Text>
              <Text style={{ fontSize: 11, color: C.subText, marginLeft: 8 }}>
                {record.order_no || record.invoice_no}
              </Text>
              {record.status && (
                <Tag
                  color={record.status === "Paid" ? "success" : record.status === "Draft" ? "warning" : "processing"}
                  style={{ marginLeft: 8, fontSize: 10 }}
                >
                  {record.status}
                </Tag>
              )}
            </div>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={handlePrint}
              style={{ background: C.primary, borderColor: C.primary, borderRadius: 6 }}
            >
              Download / Print PDF
            </Button>
          </div>

          {/* Preview */}
          <div style={{
            border: `1px solid ${C.border}`, borderRadius: 8,
            overflow: "hidden", maxHeight: 520, overflowY: "auto",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}>
            <ReceiptContent record={record} systemDetails={systemDetails} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ background: C.bg }}>
      {/*
        Hidden printable receipt — always mounted so useReactToPrint has a DOM ref.
        This is separate from the in-tab preview so the ref is never detached.
      */}
      <div style={{ position: "absolute", left: -9999, top: 0, width: 794 }}>
        <div ref={printRef}>
          <ReceiptContent record={record} systemDetails={systemDetails} />
        </div>
      </div>

      <Tabs
        size="small"
        defaultActiveKey="details"
        items={tabItems}
        tabBarStyle={{
          marginBottom: 0,
          background: "#fff",
          borderBottom: `1px solid ${C.border}`,
          paddingLeft: 16,
        }}
      />
    </div>
  );
};

export default ExpandableInvoice;