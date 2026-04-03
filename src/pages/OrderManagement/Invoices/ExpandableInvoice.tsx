import React, { useRef, useState, useEffect } from "react";
import { ProDescriptions } from "@ant-design/pro-components";
import {
  Badge,
  Button,
  Empty,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileSearchOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import { getNotesByInvoice } from "@services/accounting/notes";
import useSystemDetails from "@hooks/useSystemDetails";
import {
  TEMPLATES,
  TemplateId,
  InvoiceForPrint,
  SystemDetails,
} from "./InvoiceTemplates";

const { Text } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
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
  (v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

// ── Interfaces ─────────────────────────────────────────────────────────────
interface ProductRef {
  _id: string;
  name: string;
  price: number;
}
interface UserRef {
  _id: string;
  username: string;
}
interface VATDetail {
  rate: number;
  amount: number;
  net: number;
}
interface InvoiceItem {
  _id: string;
  product_id?: ProductRef;
  description?: string;
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
  payment_date?: string;
  createdAt: string;
  created_by?: UserRef;
  payment_status?: string;
}

export interface InvoiceDetailsInterface {
  _id: string;
  order_no: string;
  invoice_no?: string;
  shop_id?: string;
  source?: string;
  direction?: string;
  createdAt: string;
  issue_date?: string;
  due_date?: string;
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
  notes_adjustment?: number;
  status?: string;
  payment_ids?: PaymentRecord[];
  payments?: PaymentRecord[];
  customer_id?: any;
  supplier_id?: any;
  counterparty_name?: string;
  counterparty_phone?: string;
  counterparty_email?: string;
  counterparty_kra_pin?: string;
  supplier_ref?: string;
  notes?: string;
  terms?: string;
  table_id?: { name: string };
  [key: string]: any;
}

// ── Small shared UI atoms ──────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span
    style={{
      display: "block",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
      color: C.subText,
      marginBottom: 8,
    }}
  >
    {children}
  </span>
);

const MetaRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "7px 0",
      borderBottom: `1px solid ${C.border}`,
    }}
  >
    <Text
      style={{ fontSize: 11, color: C.subText, flexShrink: 0, marginRight: 12 }}
    >
      {label}
    </Text>
    <div style={{ textAlign: "right" }}>{children}</div>
  </div>
);

const ItemRow = ({ item }: { item: InvoiceItem }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 4,
      padding: "7px 10px",
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 7,
    }}
  >
    <Text style={{ fontSize: 12, flex: "1 1 120px" }}>
      <span style={{ fontWeight: 700, color: C.darkText, marginRight: 4 }}>
        {item.quantity}×
      </span>
      {item.product_id?.name || item.description || "—"}
    </Text>
    <div
      style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
    >
      <Text style={{ fontSize: 12 }}>KES {fmt(item.price)}</Text>
      {item.vat_amount > 0 && (
        <span
          style={{
            background: "#eff6ff",
            color: C.blue,
            border: "1px solid #bfdbfe",
            borderRadius: 5,
            padding: "1px 7px",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          VAT: KES {item.vat_amount.toFixed(2)}
        </span>
      )}
    </div>
  </div>
);

// ── Resolve counterparty (customer OR supplier) ────────────────────────────
const resolveParty = (record: InvoiceDetailsInterface) => {
  if (record.direction === "supplier") {
    const s = record.supplier_id;
    if (s && typeof s === "object") {
      return {
        label: "Supplier",
        name: s.name || "—",
        phone: s.phone || "",
        email: s.email || "",
        location: "",
        kra_pin: s.kra_pin || "",
        ref: record.supplier_ref || "",
      };
    }
    return {
      label: "Supplier",
      name: record.counterparty_name || "—",
      phone: record.counterparty_phone || "",
      email: record.counterparty_email || "",
      location: "",
      kra_pin: record.counterparty_kra_pin || "",
      ref: record.supplier_ref || "",
    };
  }
  const cid = record.customer_id;
  if (cid && typeof cid === "object") {
    return {
      label: "Customer",
      name: cid.customer_name || cid.name || "—",
      phone: cid.phone || cid.customer_phone || "",
      email: cid.email || cid.customer_email || "",
      location: cid.location || "",
      kra_pin: cid.kra_pin || "",
      ref: "",
    };
  }
  return {
    label: "Customer",
    name: record.counterparty_name || "—",
    phone: record.counterparty_phone || "",
    email: record.counterparty_email || "",
    location: "",
    kra_pin: record.counterparty_kra_pin || "",
    ref: "",
  };
};

// ═══════════════════════════════════════════════════════════════
// TAB 1 — Details
// ═══════════════════════════════════════════════════════════════
const DetailsTab = ({
  record,
  isMobile,
}: {
  record: InvoiceDetailsInterface;
  isMobile: boolean;
}) => {
  const {
    items = [],
    served_by,
    created_by,
    subtotal,
    total_vat_amount,
    vat_breakdown,
    discount_amount,
    vat_pricing_mode,
    grand_total,
    order_no,
    createdAt,
    issue_date,
    due_date,
    amount_paid,
    amount_due,
    notes_adjustment,
    status,
    notes,
    terms,
  } = record;

  const party = resolveParty(record);

  const vatRows = vat_breakdown
    ? Object.entries(vat_breakdown).map(([type, d]) => ({
      label: `VAT (${type})`,
      value: `KES ${d?.amount?.toFixed(2) || "0.00"} (${(
        (d?.rate || 0) * 100
      ).toFixed(0)}%)`,
    }))
    : [];

  const statusColor =
    status === "Paid"
      ? C.green
      : status === "Pending"
        ? C.orange
        : status === "Overdue"
          ? C.red
          : status === "Draft"
            ? C.subText
            : C.blue;
  const statusBg =
    status === "Paid"
      ? "#f0fdf4"
      : status === "Pending"
        ? "#fffbeb"
        : status === "Overdue"
          ? "#fef2f2"
          : "#f8fafc";

  // ── Mobile ──
  if (isMobile)
    return (
      <div style={{ padding: "8px 0" }}>
        {/* Party */}
        <div
          style={{
            background: "#fff",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 10,
          }}
        >
          <SectionLabel>{party.label}</SectionLabel>
          <MetaRow label="Name">
            <Text strong style={{ fontSize: 12 }}>
              {party.name}
            </Text>
          </MetaRow>
          {party.phone && (
            <MetaRow label="Phone">
              <Text style={{ fontSize: 12 }}>{party.phone}</Text>
            </MetaRow>
          )}
          {party.email && (
            <MetaRow label="Email">
              <Text style={{ fontSize: 12, color: C.subText }}>{party.email}</Text>
            </MetaRow>
          )}
          {party.location && (
            <MetaRow label="Location">
              <Text style={{ fontSize: 12 }}>{party.location}</Text>
            </MetaRow>
          )}
          {party.kra_pin && (
            <MetaRow label="KRA PIN">
              <Text style={{ fontSize: 12 }}>{party.kra_pin}</Text>
            </MetaRow>
          )}
          {party.ref && (
            <MetaRow label="Supplier Ref">
              <Text style={{ fontSize: 12 }}>{party.ref}</Text>
            </MetaRow>
          )}
        </div>

        {/* Meta */}
        <div
          style={{
            background: "#fff",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 10,
          }}
        >
          <SectionLabel>Invoice Details</SectionLabel>
          <MetaRow label="Invoice No.">
            <Text strong style={{ fontSize: 12 }}>
              {order_no}
            </Text>
          </MetaRow>
          <MetaRow label="Date">
            <Text style={{ fontSize: 12, color: C.subText }}>
              {dayjs(issue_date || createdAt).format("DD MMM YYYY HH:mm")}
            </Text>
          </MetaRow>
          {due_date && (
            <MetaRow label="Due Date">
              <Text style={{ fontSize: 12, color: C.red }}>
                {dayjs(due_date).format("DD MMM YYYY")}
              </Text>
            </MetaRow>
          )}
          <MetaRow label="Status">
            <span
              style={{
                background: statusBg,
                color: statusColor,
                border: `1px solid ${statusColor}30`,
                borderRadius: 5,
                padding: "2px 8px",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {status || "—"}
            </span>
          </MetaRow>
          {served_by && (
            <MetaRow label="Served By">
              <Text style={{ fontSize: 12 }}>{served_by.username}</Text>
            </MetaRow>
          )}
          {created_by && (
            <MetaRow label="Created By">
              <Text style={{ fontSize: 12 }}>{created_by.username}</Text>
            </MetaRow>
          )}
          {vat_pricing_mode && (
            <MetaRow label="Pricing Mode">
              <Text style={{ fontSize: 12 }}>{vat_pricing_mode}</Text>
            </MetaRow>
          )}
          {terms && (
            <MetaRow label="Terms">
              <Text style={{ fontSize: 12 }}>{terms}</Text>
            </MetaRow>
          )}
          {notes && (
            <MetaRow label="Notes">
              <Text style={{ fontSize: 12 }}>{notes}</Text>
            </MetaRow>
          )}
        </div>

        {/* Items */}
        <div
          style={{
            background: "#fff",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 10,
          }}
        >
          <SectionLabel>Items ({items.length})</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((item) => (
              <ItemRow key={item._id} item={item} />
            ))}
          </div>
        </div>

        {/* Summary */}
        <div
          style={{
            background: "#fff",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <SectionLabel>Summary</SectionLabel>
          <MetaRow label="Subtotal">
            <Text strong style={{ fontSize: 12 }}>
              KES {fmt(subtotal)}
            </Text>
          </MetaRow>
          {vatRows.map((r, i) => (
            <MetaRow key={i} label={r.label}>
              <Text style={{ fontSize: 12 }}>{r.value}</Text>
            </MetaRow>
          ))}
          {total_vat_amount > 0 && (
            <MetaRow label="Total VAT">
              <span
                style={{
                  background: "#eff6ff",
                  color: C.blue,
                  border: "1px solid #bfdbfe",
                  borderRadius: 5,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                KES {fmt(total_vat_amount)}
              </span>
            </MetaRow>
          )}
          {discount_amount > 0 && (
            <MetaRow label="Discount">
              <span
                style={{
                  background: "#fffbeb",
                  color: C.orange,
                  border: "1px solid #fde68a",
                  borderRadius: 5,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                −KES {fmt(discount_amount)}
              </span>
            </MetaRow>
          )}
          {(notes_adjustment || 0) !== 0 && (
            <MetaRow label="Notes Adjustment">
              <Text style={{ fontSize: 12, color: C.orange }}>
                KES {fmt(notes_adjustment!)}
              </Text>
            </MetaRow>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 10,
            }}
          >
            <Text style={{ fontSize: 12, color: C.subText }}>Grand Total</Text>
            <Text strong style={{ fontSize: 15, color: C.primary }}>
              KES {fmt(grand_total)}
            </Text>
          </div>
          {(amount_paid || 0) > 0 && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 6,
                }}
              >
                <Text style={{ fontSize: 12, color: C.green }}>Amount Paid</Text>
                <Text strong style={{ fontSize: 13, color: C.green }}>
                  KES {fmt(amount_paid || 0)}
                </Text>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: (amount_due || 0) > 0 ? C.orange : C.green,
                  }}
                >
                  Balance Due
                </Text>
                <Text
                  strong
                  style={{
                    fontSize: 13,
                    color: (amount_due || 0) > 0 ? C.orange : C.green,
                  }}
                >
                  KES {fmt(amount_due || 0)}
                </Text>
              </div>
            </>
          )}
        </div>
      </div>
    );

  // ── Desktop ──
  return (
    <div style={{ padding: 16, background: C.bg }}>
      <div
        style={{
          background: "#fff",
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        <ProDescriptions
          column={2}
          bordered
          size="small"
          title={
            <Text
              strong
              style={{ fontSize: 12, padding: "8px 12px", display: "block" }}
            >
              {party.label} Information
            </Text>
          }
        >
          <ProDescriptions.Item label="Name">
            <Text strong style={{ fontSize: 12 }}>
              {party.name}
            </Text>
          </ProDescriptions.Item>
          <ProDescriptions.Item label="Phone">
            <Text style={{ fontSize: 12 }}>{party.phone || "—"}</Text>
          </ProDescriptions.Item>
          <ProDescriptions.Item label="Email">
            <Text style={{ fontSize: 12, color: C.subText }}>
              {party.email || "—"}
            </Text>
          </ProDescriptions.Item>
          <ProDescriptions.Item label="Location">
            <Text style={{ fontSize: 12 }}>{party.location || "—"}</Text>
          </ProDescriptions.Item>
          {party.kra_pin && (
            <ProDescriptions.Item label="KRA PIN" span={2}>
              <Text style={{ fontSize: 12 }}>{party.kra_pin}</Text>
            </ProDescriptions.Item>
          )}
          {party.ref && (
            <ProDescriptions.Item label="Supplier Ref" span={2}>
              <Text style={{ fontSize: 12 }}>{party.ref}</Text>
            </ProDescriptions.Item>
          )}
        </ProDescriptions>
      </div>

      <div
        style={{
          background: "#fff",
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <ProDescriptions
          column={2}
          bordered
          size="small"
          title={
            <Text
              strong
              style={{ fontSize: 12, padding: "8px 12px", display: "block" }}
            >
              Invoice Details
            </Text>
          }
        >
          <ProDescriptions.Item label="Invoice Number">
            <Text strong style={{ fontSize: 12 }}>
              {order_no}
            </Text>
          </ProDescriptions.Item>
          <ProDescriptions.Item label="Date">
            <Text style={{ fontSize: 12, color: C.subText }}>
              {dayjs(issue_date || createdAt).format("DD MMM YYYY HH:mm")}
            </Text>
          </ProDescriptions.Item>
          {due_date && (
            <ProDescriptions.Item label="Due Date">
              <Text style={{ fontSize: 12, color: C.red }}>
                {dayjs(due_date).format("DD MMM YYYY")}
              </Text>
            </ProDescriptions.Item>
          )}
          <ProDescriptions.Item label="Status">
            <span
              style={{
                background: statusBg,
                color: statusColor,
                border: `1px solid ${statusColor}30`,
                borderRadius: 5,
                padding: "2px 8px",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {status || "—"}
            </span>
          </ProDescriptions.Item>
          <ProDescriptions.Item label="Pricing Mode">
            <Text style={{ fontSize: 12 }}>{vat_pricing_mode || "—"}</Text>
          </ProDescriptions.Item>
          {served_by && (
            <ProDescriptions.Item label="Served By">
              <Text style={{ fontSize: 12 }}>{served_by.username}</Text>
            </ProDescriptions.Item>
          )}
          {created_by && (
            <ProDescriptions.Item label="Created By">
              <Text style={{ fontSize: 12 }}>{created_by.username}</Text>
            </ProDescriptions.Item>
          )}
          {terms && (
            <ProDescriptions.Item label="Terms" span={2}>
              <Text style={{ fontSize: 12 }}>{terms}</Text>
            </ProDescriptions.Item>
          )}
          {notes && (
            <ProDescriptions.Item label="Notes" span={2}>
              <Text style={{ fontSize: 12 }}>{notes}</Text>
            </ProDescriptions.Item>
          )}
          <ProDescriptions.Item label="Items" span={2}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                width: "100%",
              }}
            >
              {items.map((item) => (
                <ItemRow key={item._id} item={item} />
              ))}
            </div>
          </ProDescriptions.Item>
          <ProDescriptions.Item label="Subtotal" span={2}>
            <Text strong style={{ fontSize: 12 }}>
              KES {fmt(subtotal)}
            </Text>
          </ProDescriptions.Item>
          {vatRows.map((r, i) => (
            <ProDescriptions.Item key={i} label={r.label}>
              <Text style={{ fontSize: 12 }}>{r.value}</Text>
            </ProDescriptions.Item>
          ))}
          {total_vat_amount > 0 && (
            <ProDescriptions.Item label="Total VAT" span={2}>
              <span
                style={{
                  background: "#eff6ff",
                  color: C.blue,
                  border: "1px solid #bfdbfe",
                  borderRadius: 5,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                KES {fmt(total_vat_amount)}
              </span>
            </ProDescriptions.Item>
          )}
          {discount_amount > 0 && (
            <ProDescriptions.Item label="Discount" span={2}>
              <span
                style={{
                  background: "#fffbeb",
                  color: C.orange,
                  border: "1px solid #fde68a",
                  borderRadius: 5,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                −KES {fmt(discount_amount)}
              </span>
            </ProDescriptions.Item>
          )}
          {(notes_adjustment || 0) !== 0 && (
            <ProDescriptions.Item label="Notes Adjustment" span={2}>
              <Text style={{ fontSize: 12, color: C.orange }}>
                KES {fmt(notes_adjustment!)}
              </Text>
            </ProDescriptions.Item>
          )}
          <ProDescriptions.Item label="Grand Total" span={2}>
            <Text strong style={{ fontSize: 14, color: C.primary }}>
              KES {fmt(grand_total)}
            </Text>
          </ProDescriptions.Item>
          {(amount_paid || 0) > 0 && (
            <>
              <ProDescriptions.Item label="Amount Paid">
                <Text strong style={{ fontSize: 12, color: C.green }}>
                  KES {fmt(amount_paid || 0)}
                </Text>
              </ProDescriptions.Item>
              <ProDescriptions.Item label="Balance Due">
                <Text
                  strong
                  style={{
                    fontSize: 12,
                    color: (amount_due || 0) > 0 ? C.orange : C.green,
                  }}
                >
                  KES {fmt(amount_due || 0)}
                </Text>
              </ProDescriptions.Item>
            </>
          )}
        </ProDescriptions>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TAB 2 — Payments
// ═══════════════════════════════════════════════════════════════
const PaymentsTab = ({
  record,
  onOpenPrint,
}: {
  record: InvoiceDetailsInterface;
  onOpenPrint: () => void;
}) => {
  const payments: PaymentRecord[] = record.payments || record.payment_ids || [];
  const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const amountDue = record.amount_due || 0;
  const grandTotal = record.grand_total || 0;

  const columns = [
    {
      title: "Date",
      key: "date",
      width: 150,
      render: (_: any, r: PaymentRecord) => (
        <Text style={{ fontSize: 11, color: C.subText }}>
          {r.payment_date || r.createdAt
            ? dayjs(r.payment_date || r.createdAt).format("DD MMM YYYY HH:mm")
            : "—"}
        </Text>
      ),
    },
    {
      title: "Method",
      key: "method",
      render: (_: any, r: PaymentRecord) => (
        <Tag color="blue" style={{ fontSize: 10 }}>
          <CreditCardOutlined style={{ marginRight: 3 }} />
          {r.method_id?.name || r.method || "—"}
        </Tag>
      ),
    },
    {
      title: "Reference",
      dataIndex: "reference",
      key: "ref",
      render: (v: string) =>
        v ? (
          <Text code style={{ fontSize: 11 }}>
            {v}
          </Text>
        ) : (
          <Text style={{ color: C.subText }}>—</Text>
        ),
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      render: (v: string) => (
        <Text style={{ fontSize: 11, color: C.subText }}>{v || "—"}</Text>
      ),
    },
    {
      title: "By",
      key: "by",
      render: (_: any, r: PaymentRecord) => (
        <Text style={{ fontSize: 11 }}>{r.created_by?.username || "—"}</Text>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_: any, r: PaymentRecord) => {
        if (!r.payment_status)
          return <Text style={{ color: C.subText }}>—</Text>;
        const color =
          r.payment_status === "COMPLETED"
            ? C.green
            : r.payment_status === "REFUNDED"
              ? C.red
              : r.payment_status === "FAILED"
                ? C.red
                : C.orange;
        return (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color,
              background: `${color}15`,
              border: `1px solid ${color}40`,
              borderRadius: 4,
              padding: "1px 7px",
            }}
          >
            {r.payment_status}
          </span>
        );
      },
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right" as const,
      render: (v: number) => (
        <Text strong style={{ fontSize: 12, color: C.green }}>
          KES {fmt(v)}
        </Text>
      ),
    },
  ];

  return (
    <div style={{ padding: "12px 16px" }}>
      {/* Summary strip */}
      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}
      >
        <div
          style={{
            flex: "1 1 120px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderLeft: `3px solid ${C.green}`,
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: C.subText,
              display: "block",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            Total Paid
          </Text>
          <Text strong style={{ fontSize: 14, color: C.green }}>
            KES {fmt(total)}
          </Text>
        </div>
        <div
          style={{
            flex: "1 1 120px",
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderLeft: `3px solid ${C.orange}`,
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: C.subText,
              display: "block",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            Balance Due
          </Text>
          <Text
            strong
            style={{
              fontSize: 14,
              color: amountDue > 0 ? C.orange : C.green,
            }}
          >
            KES {fmt(amountDue)}
          </Text>
        </div>
        <div
          style={{
            flex: "1 1 120px",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${C.primary}`,
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: C.subText,
              display: "block",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            Invoice Total
          </Text>
          <Text strong style={{ fontSize: 14, color: C.primary }}>
            KES {fmt(grandTotal)}
          </Text>
        </div>
        <Button
          icon={<PrinterOutlined />}
          onClick={onOpenPrint}
          style={{
            alignSelf: "center",
            borderRadius: 8,
            borderColor: C.primary,
            color: C.primary,
          }}
        >
          Download Receipt
        </Button>
      </div>

      {!payments.length ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text style={{ fontSize: 12, color: C.subText }}>
              No payment records found
            </Text>
          }
          style={{ padding: "16px 0" }}
        />
      ) : (
        <Table
          rowKey={(r) => r._id || String(Math.random())}
          columns={columns}
          dataSource={payments}
          pagination={false}
          size="small"
          scroll={{ x: 620 }}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TAB 3 — Credit / Debit Notes
// ═══════════════════════════════════════════════════════════════
const NOTE_TYPE_COLOR: Record<string, string> = {
  CREDIT_NOTE: "green",
  DEBIT_NOTE: "orange",
};

const NotesTab = ({
  invoiceId,
  shopId,
  onOpenNote,
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

  if (isLoading)
    return (
      <div style={{ textAlign: "center", padding: "28px 0" }}>
        <Spin size="small" />
        <br />
        <Text style={{ fontSize: 12, color: C.subText }}>Loading notes…</Text>
      </div>
    );

  if (!notes.length)
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span>
            <Text style={{ fontSize: 12, color: C.subText }}>
              No credit / debit notes attached to this invoice.
            </Text>
            <br />
            <Text style={{ fontSize: 11, color: C.subText }}>
              Go to <strong>Credit / Debit Notes</strong> to create one.
            </Text>
          </span>
        }
        style={{ padding: "20px 0" }}
      />
    );

  return (
    <div>
      {summary && (
        <div
          style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "8px 14px",
            marginBottom: 12,
          }}
        >
          {summary.total_credit_notes > 0 && (
            <Space size={4}>
              <Text style={{ fontSize: 11, color: C.subText }}>
                Credits applied:
              </Text>
              <Text strong style={{ fontSize: 11, color: C.green }}>
                −KES {fmt(summary.total_credit_notes)}
              </Text>
            </Space>
          )}
          {summary.total_debit_notes > 0 && (
            <Space size={4}>
              <Text style={{ fontSize: 11, color: C.subText }}>
                Debits applied:
              </Text>
              <Text strong style={{ fontSize: 11, color: C.orange }}>
                +KES {fmt(summary.total_debit_notes)}
              </Text>
            </Space>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {notes.map((note: any) => (
          <div
            key={note._id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              background: "#fff",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "10px 14px",
            }}
          >
            <Space size={8} wrap>
              <Tag
                color={NOTE_TYPE_COLOR[note.note_type] || "default"}
                style={{ fontSize: 10, margin: 0 }}
              >
                {note.note_type === "CREDIT_NOTE" ? "Credit Note" : "Debit Note"}
              </Tag>
              <Text code style={{ fontSize: 11 }}>
                {note.note_no}
              </Text>
              <Text style={{ fontSize: 12, color: C.darkText }}>
                {note.reason}
              </Text>
            </Space>
            <Space size={12} wrap>
              <Text
                strong
                style={{
                  fontSize: 13,
                  color:
                    note.note_type === "CREDIT_NOTE" ? C.green : C.orange,
                }}
              >
                {note.note_type === "CREDIT_NOTE" ? "−" : "+"}KES{" "}
                {fmt(note.grand_total)}
              </Text>
              <Tag
                color={
                  note.status === "Applied"
                    ? "success"
                    : note.status === "Approved"
                      ? "processing"
                      : note.status === "Voided"
                        ? "error"
                        : "default"
                }
                style={{ fontSize: 10 }}
              >
                {note.status}
              </Tag>
              <Text style={{ fontSize: 11, color: C.subText }}>
                {dayjs(note.issue_date).format("DD MMM YYYY")}
              </Text>
            </Space>
            <Tooltip title="Open note details">
              <Button
                size="small"
                type="primary"
                icon={<ArrowRightOutlined />}
                onClick={() => onOpenNote(note._id)}
                style={{
                  background: C.primary,
                  borderColor: C.primary,
                  borderRadius: 6,
                  fontSize: 11,
                }}
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

// ═══════════════════════════════════════════════════════════════
// TAB 4 — Receipt / PDF  (5-template picker)
// ═══════════════════════════════════════════════════════════════

const TemplateThumbnail: React.FC<{
  tpl: (typeof TEMPLATES)[number];
  selected: boolean;
  onSelect: () => void;
}> = ({ tpl, selected, onSelect }) => (
  <button
    onClick={onSelect}
    style={{
      flex: "0 0 96px",
      cursor: "pointer",
      border: selected
        ? `2.5px solid ${C.primary}`
        : `1.5px solid ${C.border}`,
      borderRadius: 9,
      overflow: "hidden",
      background: "#fff",
      padding: 0,
      transition: "border-color 0.15s, transform 0.12s",
      transform: selected ? "scale(1.05)" : "scale(1)",
      boxShadow: selected ? `0 0 0 3px ${C.primaryLight}` : "none",
      position: "relative",
    }}
  >
    {/* Colour swatch */}
    <div
      style={{
        height: 54,
        background: tpl.thumbBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div style={{ width: "68%", opacity: 0.42 }}>
        <div
          style={{
            height: 3,
            background: tpl.thumbAccent,
            borderRadius: 2,
            marginBottom: 4,
          }}
        />
        <div
          style={{
            height: 2,
            background: tpl.thumbAccent,
            borderRadius: 2,
            marginBottom: 3,
            width: "80%",
          }}
        />
        <div
          style={{
            height: 2,
            background: tpl.thumbAccent,
            borderRadius: 2,
            width: "55%",
          }}
        />
      </div>
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 4,
            right: 5,
            background: C.primary,
            borderRadius: "50%",
            width: 15,
            height: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckCircleOutlined style={{ color: "#fff", fontSize: 9 }} />
        </div>
      )}
    </div>
    {/* Label */}
    <div
      style={{
        padding: "5px 6px",
        borderTop: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: selected ? 700 : 500,
          color: selected ? C.primary : C.darkText,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {tpl.name}
      </div>
    </div>
  </button>
);

const ReceiptTab = ({
  record,
  sys,
}: {
  record: InvoiceDetailsInterface;
  sys: SystemDetails;
}) => {
  const [selected, setSelected] = useState<TemplateId>(1);

  // Cast — InvoiceDetailsInterface is a superset of InvoiceForPrint
  const inv = record as unknown as InvoiceForPrint;

  // One ref per template so switching is instant (all rendered, only one visible)
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const ref3 = useRef<HTMLDivElement>(null);
  const ref4 = useRef<HTMLDivElement>(null);
  const ref5 = useRef<HTMLDivElement>(null);
  const allRefs: Record<TemplateId, React.RefObject<HTMLDivElement>> = {
    1: ref1, 2: ref2, 3: ref3, 4: ref4, 5: ref5,
  };

  const PAGE = `
    @page { size: A4 portrait; margin: 12mm; }
    @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  `;
  const title = `Invoice-${record.order_no || record._id}`;

  const p1 = useReactToPrint({ content: () => ref1.current, documentTitle: title, pageStyle: PAGE });
  const p2 = useReactToPrint({ content: () => ref2.current, documentTitle: title, pageStyle: PAGE });
  const p3 = useReactToPrint({ content: () => ref3.current, documentTitle: title, pageStyle: PAGE });
  const p4 = useReactToPrint({ content: () => ref4.current, documentTitle: title, pageStyle: PAGE });
  const p5 = useReactToPrint({ content: () => ref5.current, documentTitle: title, pageStyle: PAGE });
  const printMap: Record<TemplateId, () => void> = {
    1: p1, 2: p2, 3: p3, 4: p4, 5: p5,
  };

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#fff",
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text strong style={{ fontSize: 13 }}>
            {record.status === "Draft" ? "Quote" : "Invoice"} Receipt
          </Text>
          <Text style={{ fontSize: 11, color: C.subText }}>
            {record.order_no || record.invoice_no}
          </Text>
          {record.status && (
            <Tag
              color={
                record.status === "Paid"
                  ? "success"
                  : record.status === "Draft"
                    ? "warning"
                    : record.status === "Overdue"
                      ? "error"
                      : "processing"
              }
              style={{ fontSize: 10 }}
            >
              {record.status}
            </Tag>
          )}
        </div>
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          onClick={() => printMap[selected]()}
          style={{
            background: C.primary,
            borderColor: C.primary,
            borderRadius: 6,
          }}
        >
          Download / Print PDF
        </Button>
      </div>

      {/* Template picker */}
      <div
        style={{
          marginBottom: 12,
          paddingBottom: 12,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: C.subText,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            display: "block",
            marginBottom: 8,
          }}
        >
          Choose print template
        </Text>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TEMPLATES.map((tpl) => (
            <TemplateThumbnail
              key={tpl.id}
              tpl={tpl}
              selected={selected === tpl.id}
              onSelect={() => setSelected(tpl.id as TemplateId)}
            />
          ))}
        </div>
      </div>

      {/* Live preview — all 5 rendered, only selected shown */}
      <div
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          overflow: "hidden",
          maxHeight: 520,
          overflowY: "auto",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        {([1, 2, 3, 4, 5] as TemplateId[]).map((id) => {
          const Tpl = TEMPLATES[id - 1].component;
          return (
            <div
              key={id}
              style={{ display: id === selected ? "block" : "none" }}
            >
              <Tpl ref={allRefs[id]} inv={inv} sys={sys} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Root export
// ═══════════════════════════════════════════════════════════════
export interface ExpandableInvoiceProps {
  record: InvoiceDetailsInterface;
  onOpenNote?: (noteId: string) => void;
}

const ExpandableInvoice = ({ record, onOpenNote }: ExpandableInvoiceProps) => {
  const isMobile = useIsMobile();
  const sys: SystemDetails = useSystemDetails();
  const [activeTab, setActiveTab] = useState("details");

  const shopId: string = (() => {
    if (record.shop_id) return String(record.shop_id);
    try {
      const t = JSON.parse(localStorage.getItem("tenant") || "{}");
      return t.default_shop?._id || t.shops?.[0]?._id || t._id || "";
    } catch {
      return "";
    }
  })();

  const { data: notesData } = useQuery({
    queryKey: ["notes-by-invoice", record._id],
    queryFn: () => getNotesByInvoice(record._id, shopId),
    enabled: !!record._id && !!shopId,
    staleTime: 30_000,
  });
  const noteCount = notesData?.notes?.length || 0;
  const paymentCount = (record.payments || record.payment_ids || []).length;

  const tabItems = [
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
    {
      key: "payments",
      label: (
        <Space size={4}>
          <DollarOutlined />
          <span>Payments</span>
          {paymentCount > 0 && (
            <Badge
              count={paymentCount}
              size="small"
              style={{ backgroundColor: C.green, fontSize: 9, marginLeft: 2 }}
            />
          )}
        </Space>
      ),
      // "Download Receipt" in Payments tab jumps to the Receipt/PDF tab
      children: (
        <PaymentsTab
          record={record}
          onOpenPrint={() => setActiveTab("receipt")}
        />
      ),
    },
    {
      key: "notes",
      label: (
        <Space size={4}>
          <FileSearchOutlined />
          <span>Credit / Debit Notes</span>
          {noteCount > 0 && (
            <Badge
              count={noteCount}
              size="small"
              style={{ backgroundColor: C.purple, fontSize: 9, marginLeft: 2 }}
            />
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
    {
      key: "receipt",
      label: (
        <Space size={4}>
          <FilePdfOutlined />
          <span>Receipt / PDF</span>
        </Space>
      ),
      children: <ReceiptTab record={record} sys={sys} />,
    },
  ];

  return (
    <div style={{ background: C.bg }}>
      <Tabs
        size="small"
        activeKey={activeTab}
        onChange={setActiveTab}
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