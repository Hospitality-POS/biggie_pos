import React, { useRef, useState, useEffect, useMemo } from "react";
import { ProDescriptions } from "@ant-design/pro-components";
import {
  Badge, Button, ColorPicker, DatePicker, Empty,
  Form, Input, Select, Space, Spin, Table, Tabs, Tag, Tooltip, Typography, Modal, Row, Col, Alert, message,
} from "antd";
import {
  ArrowRightOutlined, CheckCircleOutlined, CreditCardOutlined,
  DollarOutlined, EditOutlined, FileSearchOutlined, FilePdfOutlined,
  FileTextOutlined, PrinterOutlined, SaveOutlined,
  SafetyCertificateOutlined, WarningOutlined, ReloadOutlined, LinkOutlined, CopyOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoiceById, patchInvoice, verifyDigiTax, duplicateInvoice } from "@services/accounting/invoice";
import { refreshInvoiceEtr } from "@services/accounting/digiTax";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import { getNotesByInvoice } from "@services/accounting/notes";
import useSystemDetails from "@hooks/useSystemDetails";
import {
  TEMPLATES, TemplateId, InvoiceForPrint, SystemDetails,
} from "./InvoiceTemplates";
import { usePrimaryColor } from "../../../context/PrimaryColorContext";
import PrintBillModal from "../../../components/MODALS/PrintBillModal";
import { usePrintDocument, DocumentType } from "../../../components/MODALS/Hooks/usePrintDocument";

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
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

// ── Payment terms ──────────────────────────────────────────────────────────
const PAYMENT_TERMS = [
  "Due on Receipt", "Net 7", "Net 14", "Net 30",
  "Net 60", "Net 90", "50% Upfront", "Cash on Delivery",
].map((v) => ({ label: v, value: v }));

// ── Interfaces ─────────────────────────────────────────────────────────────
interface ProductRef { _id: string; name: string; price: number; }
interface UserRef { _id: string; username: string; }
interface VATDetail { rate: number; amount: number; net: number; }
interface InvoiceItem {
  _id: string; product_id?: ProductRef; description?: string;
  quantity: number; price: number; vat_amount: number;
}
interface PaymentRecord {
  _id: string; amount: number; method?: string;
  method_id?: { _id: string; name: string };
  reference?: string; notes?: string; payment_date?: string;
  createdAt: string; created_by?: UserRef; payment_status?: string;
}

interface SalesReceiptRecord {
  _id: string; receipt_no: string; receipt_date: string;
  grand_total: number; payment_method: string;
  payment_reference?: string; status: string;
}

export interface InvoiceDetailsInterface {
  _id: string; order_no: string; invoice_no?: string;
  shop_id?: string; source?: string; direction?: string;
  createdAt: string; issue_date?: string; due_date?: string;
  served_by?: UserRef; created_by?: UserRef;
  items: InvoiceItem[];
  subtotal: number; total_vat_amount: number;
  vat_breakdown?: Record<string, VATDetail>;
  discount_amount: number; vat_pricing_mode?: string;
  grand_total: number; amount_paid?: number; amount_due?: number;
  notes_adjustment?: number; status?: string;
  payment_ids?: PaymentRecord[]; payments?: PaymentRecord[];
  salesReceipts?: SalesReceiptRecord[];
  customer_id?: any; supplier_id?: any;
  counterparty_name?: string; counterparty_phone?: string;
  counterparty_email?: string; counterparty_kra_pin?: string;
  supplier_ref?: string; notes?: string; terms?: string;
  table_id?: { name: string };
  etr_enabled?: boolean;
  shop_kra_pin?: string | null;
  digitax?: {
    sale_id?: string;
    serial_number?: string;
    receipt_number?: number;
    invoice_number?: number;
    trader_invoice_number?: string;
    etims_url?: string;
    offline_url?: string;
    receipt_signature?: string;
    internal_data?: string;
    receipt_type_code?: string;
    sale_date?: string;
    sale_time?: string;
    submission_status?: "Pending" | "Submitted" | "Verified" | "COMPLETED" | "Failed" | "FAILED";
    submission_date?: string;
    error_message?: string | null;
  } | null;
  [key: string]: any;
}

// ── Small atoms ────────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span style={{
    display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.5px",
    textTransform: "uppercase" as const, color: C.subText, marginBottom: 8,
  }}>{children}</span>
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
    flexWrap: "wrap", gap: 4, padding: "7px 10px",
    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7,
  }}>
    <Text style={{ fontSize: 12, flex: "1 1 120px" }}>
      <span style={{ fontWeight: 700, color: C.darkText, marginRight: 4 }}>{item.quantity}×</span>
      {item.product_id?.name || item.description || "—"}
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

// ── Resolve counterparty ───────────────────────────────────────────────────
const resolveParty = (record: InvoiceDetailsInterface) => {
  if (record.direction === "supplier") {
    const s = record.supplier_id;
    if (s && typeof s === "object") {
      return { label: "Supplier", name: s.name || "—", phone: s.phone || "", email: s.email || "", location: "", kra_pin: s.kra_pin || "", ref: record.supplier_ref || "" };
    }
    return { label: "Supplier", name: record.counterparty_name || "—", phone: record.counterparty_phone || "", email: record.counterparty_email || "", location: "", kra_pin: record.counterparty_kra_pin || "", ref: record.supplier_ref || "" };
  }
  const cid = record.customer_id;
  if (cid && typeof cid === "object") {
    return { 
      label: "Customer", 
      name: cid.customer_name || cid.name || "—", 
      phone: cid.phone || cid.customer_phone || "", 
      email: cid.email || cid.customer_email || "", 
      location: cid.location || "",
      address: cid.address || null,
      kra_pin: cid.kra_pin || "", 
      ref: "" 
    };
  }
  return { 
    label: "Customer", 
    name: record.counterparty_name || "—", 
    phone: record.counterparty_phone || "", 
    email: record.counterparty_email || "", 
    location: "",
    address: null,
    kra_pin: record.counterparty_kra_pin || "", 
    ref: "" 
  };
};

// ═══════════════════════════════════════════════════════════════
// TAB 1 — Receipt / PDF  (NOW FIRST)
// ═══════════════════════════════════════════════════════════════

const TemplateThumbnail: React.FC<{
  tpl: (typeof TEMPLATES)[number]; selected: boolean; onSelect: () => void; invoiceColor: string;
}> = ({ tpl, selected, onSelect, invoiceColor }) => {
  const primaryColor = usePrimaryColor();
  
  return (
  <button onClick={onSelect} style={{
    flex: "0 0 96px", cursor: "pointer",
    border: selected ? `2.5px solid ${primaryColor}` : `1.5px solid ${C.border}`,
    borderRadius: 9, overflow: "hidden", background: "#fff", padding: 0,
    transition: "border-color 0.15s, transform 0.12s",
    transform: selected ? "scale(1.05)" : "scale(1)",
    boxShadow: selected ? `0 0 0 3px ${primaryColor}20` : "none",
    position: "relative",
  }}>
    <div style={{
      height: 54, background: tpl.id === 1 ? primaryColor : tpl.id === 6 ? invoiceColor : tpl.thumbBg,
      display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
    }}>
      <div style={{ width: "68%", opacity: 0.42 }}>
        <div style={{ height: 3, background: tpl.thumbAccent, borderRadius: 2, marginBottom: 4 }} />
        <div style={{ height: 2, background: tpl.thumbAccent, borderRadius: 2, marginBottom: 3, width: "80%" }} />
        <div style={{ height: 2, background: tpl.thumbAccent, borderRadius: 2, width: "55%" }} />
      </div>
      {selected && (
        <div style={{
          position: "absolute", top: 4, right: 5,
          background: primaryColor, borderRadius: "50%", width: 15, height: 15,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <CheckCircleOutlined style={{ color: "#fff", fontSize: 9 }} />
        </div>
      )}
    </div>
    <div style={{ padding: "5px 6px", borderTop: `1px solid ${C.border}` }}>
      <div style={{
        fontSize: 10, fontWeight: selected ? 700 : 500,
        color: selected ? primaryColor : C.darkText,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {tpl.name}
      </div>
    </div>
  </button>
  );
};

const ReceiptTab = ({
  record,
  sys,
  invoiceColor,
  onColorChange,
  primaryColor,
  printProps,
  creditNotes,
}: {
  record: InvoiceDetailsInterface;
  sys: SystemDetails;
  invoiceColor: string;
  onColorChange: (color: string) => void;
  primaryColor: string;
  printProps: any;
  creditNotes?: any[];
}) => {
  const [selected, setSelected] = useState<TemplateId>(1);
  const inv = record ? {
    ...record,
    credit_notes: creditNotes || [],
  } as unknown as InvoiceForPrint : undefined;

  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const ref3 = useRef<HTMLDivElement>(null);
  const ref4 = useRef<HTMLDivElement>(null);
  const ref5 = useRef<HTMLDivElement>(null);
  const ref6 = useRef<HTMLDivElement>(null);
  const allRefs: Record<TemplateId, React.RefObject<HTMLDivElement>> = { 1: ref1, 2: ref2, 3: ref3, 4: ref4, 5: ref5, 6: ref6 };

  const PAGE = `@page { size: A4 portrait; margin: 12mm; } @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }`;
  const title = `Invoice-${record.order_no || record._id}`;

  const p1 = useReactToPrint({ content: () => ref1.current, documentTitle: title, pageStyle: PAGE });
  const p2 = useReactToPrint({ content: () => ref2.current, documentTitle: title, pageStyle: PAGE });
  const p3 = useReactToPrint({ content: () => ref3.current, documentTitle: title, pageStyle: PAGE });
  const p4 = useReactToPrint({ content: () => ref4.current, documentTitle: title, pageStyle: PAGE });
  const p5 = useReactToPrint({ content: () => ref5.current, documentTitle: title, pageStyle: PAGE });
  const p6 = useReactToPrint({ content: () => ref6.current, documentTitle: title, pageStyle: PAGE });
  const printMap: Record<TemplateId, () => void> = { 1: p1, 2: p2, 3: p3, 4: p4, 5: p5, 6: p6 };

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "10px 14px", marginBottom: 14, flexWrap: "wrap", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text strong style={{ fontSize: 13 }}>
            {record.status === "Draft" ? "Quote" : "Invoice"} Preview
          </Text>
          <Text style={{ fontSize: 11, color: C.subText }}>{record.order_no || record.invoice_no}</Text>
          {record.status && (
            <Tag color={record.status === "Paid" ? "success" : record.status === "Draft" ? "warning" : record.status === "Overdue" ? "error" : "processing"}
              style={{ fontSize: 10 }}>
              {record.status}
            </Tag>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Button type="primary" icon={<PrinterOutlined />}
            onClick={() => printMap[selected]()}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 6 }}>
            Download / Print PDF
          </Button>
          <PrintBillModal
            cartDetails={record}
            data={(record.items || []).map((item: any) => ({
              ...item,
              product_id: typeof item.product_id === 'string' 
                ? { _id: item.product_id, name: item.description || 'Item' }
                : item.product_id,
              price: item.unit_price || item.price || 0,
            }))}
            subtotal={record.subtotal}
            totalVatAmount={record.total_vat_amount}
            grandTotal={record.grand_total}
            {...printProps}
          />
        </div>
      </div>

      {/* Template picker */}
      <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
        <Text style={{
          fontSize: 10, fontWeight: 700, color: C.subText,
          textTransform: "uppercase", letterSpacing: "0.5px",
          display: "block", marginBottom: 8,
        }}>
          Choose print template
        </Text>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TEMPLATES.map((tpl) => (
            <TemplateThumbnail key={tpl.id} tpl={tpl}
              selected={selected === tpl.id}
              onSelect={() => setSelected(tpl.id as TemplateId)}
              invoiceColor={invoiceColor} />
          ))}
        </div>
        
        {/* Color picker for Custom template */}
        {selected === 6 && (
          <div style={{ 
            marginTop: 12, 
            padding: 8, 
            background: "#f8fafc", 
            borderRadius: 6, 
            border: `1px solid ${C.border}` 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={{ fontSize: 11, color: C.subText, fontWeight: 500 }}>
                Custom color:
              </Text>
              <ColorPicker
                value={invoiceColor}
                onChange={(color) => onColorChange(color.toHexString())}
                size="small"
                presets={[{
                  label: "Presets",
                  colors: [
                    primaryColor, // Primary color as first option
                    "#6c1c2c", "#1e40af", "#065f46", "#7c3aed",
                    "#b45309", "#0f766e", "#be185d", "#1d4ed8",
                    "#374151", "#0369a1",
                  ],
                }]}
              />
              <Button 
                size="small" 
                onClick={() => onColorChange(primaryColor)}
                style={{ fontSize: 10, height: 24, padding: "0 8px" }}
              >
                Reset to Primary
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Live preview */}
      <div style={{
        border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden",
        maxHeight: 520, overflowY: "auto",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}>
        {([1, 2, 3, 4, 5, 6] as TemplateId[]).map((id) => {
          const Tpl = TEMPLATES[id - 1].component;
          return (
            <div key={id} style={{ display: id === selected ? "block" : "none" }}>
              <Tpl ref={allRefs[id]} inv={inv} sys={sys} accentColor={invoiceColor} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TAB 2 — Details (with inline Edit)
// ═══════════════════════════════════════════════════════════════
const DetailsTab = ({
  record,
  isMobile,
  onSave,
}: {
  record: InvoiceDetailsInterface;
  isMobile: boolean;
  onSave?: (updated: Partial<InvoiceDetailsInterface>) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();
  const [addressForm] = Form.useForm();
  const [addressEditOpen, setAddressEditOpen] = useState(false);

  const {
    items = [], served_by, created_by, subtotal, total_vat_amount,
    vat_breakdown, discount_amount, vat_pricing_mode, grand_total,
    order_no, createdAt, issue_date, due_date,
    notes_adjustment, status, notes, terms,
    payments, payment_ids, salesReceipts,
  } = record;

  // Calculate total payments including sales receipts
  const regularPayments = (payments || payment_ids || []).reduce((s, p) => s + (p.amount || 0), 0);
  const salesReceiptsTotal = (salesReceipts || []).reduce((s, r) => s + (r.grand_total || 0), 0);
  const calculatedAmountPaid = regularPayments + salesReceiptsTotal;
  const calculatedAmountDue = Math.max(0, grand_total - calculatedAmountPaid);

  const party = resolveParty(record);

  const vatRows = vat_breakdown
    ? Object.entries(vat_breakdown).map(([type, d]) => ({
      label: `VAT (${type})`,
      value: `KES ${d?.amount?.toFixed(2) || "0.00"} (${((d?.rate || 0) * 100).toFixed(0)}%)`,
    }))
    : [];

  const statusColor = status === "Paid" ? C.green : status === "Pending" ? C.orange : status === "Overdue" ? C.red : status === "Draft" ? C.subText : C.blue;
  const statusBg = status === "Paid" ? "#f0fdf4" : status === "Pending" ? "#fffbeb" : status === "Overdue" ? "#fef2f2" : "#f8fafc";

  const handleSave = async () => {
    const v = await form.validateFields();
    onSave?.({
      notes: v.notes,
      terms: v.terms,
      due_date: v.due_date?.toISOString(),
      counterparty_name: v.counterparty_name,
      counterparty_phone: v.counterparty_phone,
      counterparty_email: v.counterparty_email,
      counterparty_kra_pin: v.counterparty_kra_pin,
    });
    setEditing(false);
  };

  // ── Edit form ──
  if (editing) {
    return (
      <div style={{ padding: 16, background: C.bg }}>
        <div style={{
          background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10,
          padding: "16px 20px", marginBottom: 12,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text strong style={{ fontSize: 13, color: C.darkText }}>Edit Invoice Details</Text>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="small" onClick={() => setEditing(false)} style={{ borderRadius: 6 }}>Cancel</Button>
              <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSave}
                style={{ background: C.primary, borderColor: C.primary, borderRadius: 6 }}>
                Save Changes
              </Button>
            </div>
          </div>

          <Form form={form} layout="vertical" initialValues={{
            notes: record.notes,
            terms: record.terms,
            due_date: record.due_date ? dayjs(record.due_date) : null,
            counterparty_name: party.name !== "—" ? party.name : "",
            counterparty_phone: party.phone,
            counterparty_email: party.email,
            counterparty_kra_pin: party.kra_pin,
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <Form.Item name="counterparty_name" label={`${party.label} Name`}>
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
              <Form.Item name="counterparty_phone" label="Phone">
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
              <Form.Item name="counterparty_email" label="Email">
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
              <Form.Item name="counterparty_kra_pin" label="KRA PIN">
                <Input style={{ borderRadius: 8 }} />
              </Form.Item>
              <Form.Item name="due_date" label="Due Date">
                <DatePicker style={{ width: "100%", borderRadius: 8 }} format="DD MMM YYYY" />
              </Form.Item>
              <Form.Item name="terms" label="Payment Terms">
                <Select placeholder="Select payment terms" allowClear options={PAYMENT_TERMS} style={{ borderRadius: 8 }} />
              </Form.Item>
            </div>
            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={3} style={{ borderRadius: 8 }} />
            </Form.Item>
          </Form>
        </div>
      </div>
    );
  }

  // ── View mode ──
  const editBtn = (
    <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(true)}
      style={{ borderRadius: 6, borderColor: C.border }}>
      Edit
    </Button>
  );

  if (isMobile) return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>{editBtn}</div>
      {/* Party */}
      <div style={{
        background: "#fff", border: `1px solid ${C.border}`,
        borderRadius: 10, padding: "12px 14px", marginBottom: 10,
      }}>
        <SectionLabel>{party.label}</SectionLabel>
        <MetaRow label="Name"><Text strong style={{ fontSize: 12 }}>{party.name}</Text></MetaRow>
        {party.phone && <MetaRow label="Phone"><Text style={{ fontSize: 12 }}>{party.phone}</Text></MetaRow>}
        {party.email && <MetaRow label="Email"><Text style={{ fontSize: 12, color: C.subText }}>{party.email}</Text></MetaRow>}
        {party.location && <MetaRow label="Location"><Text style={{ fontSize: 12 }}>{party.location}</Text></MetaRow>}
        {party.kra_pin && <MetaRow label="KRA PIN"><Text style={{ fontSize: 12 }}>{party.kra_pin}</Text></MetaRow>}
        {party.ref && <MetaRow label="Supplier Ref"><Text style={{ fontSize: 12 }}>{party.ref}</Text></MetaRow>}
      </div>
      {/* Meta */}
      <div style={{
        background: "#fff", border: `1px solid ${C.border}`,
        borderRadius: 10, padding: "12px 14px", marginBottom: 10,
      }}>
        <SectionLabel>Invoice Details</SectionLabel>
        <MetaRow label="Invoice No."><Text strong style={{ fontSize: 12 }}>{order_no}</Text></MetaRow>
        <MetaRow label="Date"><Text style={{ fontSize: 12, color: C.subText }}>{dayjs(issue_date || createdAt).format("DD MMM YYYY HH:mm")}</Text></MetaRow>
        {due_date && <MetaRow label="Due Date"><Text style={{ fontSize: 12, color: C.red }}>{dayjs(due_date).format("DD MMM YYYY")}</Text></MetaRow>}
        <MetaRow label="Status">
          <span style={{ background: statusBg, color: statusColor, border: `1px solid ${statusColor}30`, borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
            {status || "—"}
          </span>
        </MetaRow>
        {served_by && <MetaRow label="Served By"><Text style={{ fontSize: 12 }}>{served_by.username}</Text></MetaRow>}
        {created_by && <MetaRow label="Created By"><Text style={{ fontSize: 12 }}>{created_by.username}</Text></MetaRow>}
        {terms && <MetaRow label="Terms"><Text style={{ fontSize: 12 }}>{terms}</Text></MetaRow>}
        {notes && <MetaRow label="Notes"><Text style={{ fontSize: 12 }}>{notes}</Text></MetaRow>}
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
        {calculatedAmountPaid > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6 }}>
              <Text style={{ fontSize: 12, color: C.green }}>Amount Paid</Text>
              <Text strong style={{ fontSize: 13, color: C.green }}>KES {fmt(calculatedAmountPaid)}</Text>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
              <Text style={{ fontSize: 12, color: calculatedAmountDue > 0 ? C.orange : C.green }}>Balance Due</Text>
              <Text strong style={{ fontSize: 13, color: calculatedAmountDue > 0 ? C.orange : C.green }}>KES {fmt(calculatedAmountDue)}</Text>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Desktop
  return (
    <div style={{ padding: 16, background: C.bg }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>{editBtn}</div>
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
        <ProDescriptions column={2} bordered size="small"
          title={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px" }}>
              <Text strong style={{ fontSize: 12 }}>{party.label} Information</Text>
              {party.address && (
                <Button 
                  size="small" 
                  icon={<EditOutlined />} 
                  onClick={() => {
                    addressForm.setFieldsValue(party.address);
                    setAddressEditOpen(true);
                  }}
                >
                  Edit Address
                </Button>
              )}
            </div>
          }
        >
          <ProDescriptions.Item label="Name"><Text strong style={{ fontSize: 12 }}>{party.name}</Text></ProDescriptions.Item>
          <ProDescriptions.Item label="Phone"><Text style={{ fontSize: 12 }}>{party.phone || "—"}</Text></ProDescriptions.Item>
          <ProDescriptions.Item label="Email"><Text style={{ fontSize: 12, color: C.subText }}>{party.email || "—"}</Text></ProDescriptions.Item>
          <ProDescriptions.Item label="Location"><Text style={{ fontSize: 12 }}>{party.location || "—"}</Text></ProDescriptions.Item>
          {party.address && (
            <>
              <ProDescriptions.Item label="Street Address"><Text style={{ fontSize: 12 }}>{party.address.street || "—"}</Text></ProDescriptions.Item>
              <ProDescriptions.Item label="City"><Text style={{ fontSize: 12 }}>{party.address.city || "—"}</Text></ProDescriptions.Item>
              <ProDescriptions.Item label="County"><Text style={{ fontSize: 12 }}>{party.address.county || "—"}</Text></ProDescriptions.Item>
              <ProDescriptions.Item label="Country"><Text style={{ fontSize: 12 }}>{party.address.country || "—"}</Text></ProDescriptions.Item>
              {party.address.postal_code && <ProDescriptions.Item label="Postal Code"><Text style={{ fontSize: 12 }}>{party.address.postal_code}</Text></ProDescriptions.Item>}
            </>
          )}
          {party.kra_pin && <ProDescriptions.Item label="KRA PIN" span={2}><Text style={{ fontSize: 12 }}>{party.kra_pin}</Text></ProDescriptions.Item>}
          {party.ref && <ProDescriptions.Item label="Supplier Ref" span={2}><Text style={{ fontSize: 12 }}>{party.ref}</Text></ProDescriptions.Item>}
        </ProDescriptions>
      </div>
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <ProDescriptions column={2} bordered size="small"
          title={<Text strong style={{ fontSize: 12, padding: "8px 12px", display: "block" }}>Invoice Details</Text>}
        >
          <ProDescriptions.Item label="Invoice Number"><Text strong style={{ fontSize: 12 }}>{order_no}</Text></ProDescriptions.Item>
          <ProDescriptions.Item label="Date"><Text style={{ fontSize: 12, color: C.subText }}>{dayjs(issue_date || createdAt).format("DD MMM YYYY HH:mm")}</Text></ProDescriptions.Item>
          {due_date && <ProDescriptions.Item label="Due Date"><Text style={{ fontSize: 12, color: C.red }}>{dayjs(due_date).format("DD MMM YYYY")}</Text></ProDescriptions.Item>}
          <ProDescriptions.Item label="Status">
            <span style={{ background: statusBg, color: statusColor, border: `1px solid ${statusColor}30`, borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{status || "—"}</span>
          </ProDescriptions.Item>
          <ProDescriptions.Item label="Pricing Mode"><Text style={{ fontSize: 12 }}>{vat_pricing_mode || "—"}</Text></ProDescriptions.Item>
          {served_by && <ProDescriptions.Item label="Served By"><Text style={{ fontSize: 12 }}>{served_by.username}</Text></ProDescriptions.Item>}
          {created_by && <ProDescriptions.Item label="Created By"><Text style={{ fontSize: 12 }}>{created_by.username}</Text></ProDescriptions.Item>}
          {terms && <ProDescriptions.Item label="Terms" span={2}><Text style={{ fontSize: 12 }}>{terms}</Text></ProDescriptions.Item>}
          {notes && <ProDescriptions.Item label="Notes" span={2}><Text style={{ fontSize: 12 }}>{notes}</Text></ProDescriptions.Item>}
          <ProDescriptions.Item label="Items" span={2}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
              {items.map((item) => <ItemRow key={item._id} item={item} />)}
            </div>
          </ProDescriptions.Item>
          <ProDescriptions.Item label="Subtotal" span={2}><Text strong style={{ fontSize: 12 }}>KES {fmt(subtotal)}</Text></ProDescriptions.Item>
          {vatRows.map((r, i) => <ProDescriptions.Item key={i} label={r.label}><Text style={{ fontSize: 12 }}>{r.value}</Text></ProDescriptions.Item>)}
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
          <ProDescriptions.Item label="Grand Total" span={2}><Text strong style={{ fontSize: 14, color: C.primary }}>KES {fmt(grand_total)}</Text></ProDescriptions.Item>
          {calculatedAmountPaid > 0 && (
            <>
              <ProDescriptions.Item label="Amount Paid"><Text strong style={{ fontSize: 12, color: C.green }}>KES {fmt(calculatedAmountPaid)}</Text></ProDescriptions.Item>
              <ProDescriptions.Item label="Balance Due"><Text strong style={{ fontSize: 12, color: calculatedAmountDue > 0 ? C.orange : C.green }}>KES {fmt(calculatedAmountDue)}</Text></ProDescriptions.Item>
            </>
          )}
        </ProDescriptions>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TAB 3 — Payments
// ═══════════════════════════════════════════════════════════════
const PaymentsTab = ({
  record, onOpenPrint,
}: {
  record: InvoiceDetailsInterface; onOpenPrint: () => void;
}) => {
  const payments: PaymentRecord[] = record.payments || record.payment_ids || [];
  const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const salesReceiptsTotal = (record.salesReceipts || []).reduce((s, r) => s + (r.grand_total || 0), 0);
  const grandTotal = record.grand_total || 0;
  // Calculate amount due by subtracting both regular payments and sales receipts from grand total
  const amountDue = Math.max(0, grandTotal - total - salesReceiptsTotal);
  const queryClient = useQueryClient();

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: () => duplicateInvoice(record._id),
    onSuccess: () => {
      message.success("Invoice duplicated successfully");
      queryClient.invalidateQueries({ queryKey: ["invoice", record._id] });
      queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
    },
  });

  const handleDuplicate = () => {
    duplicateMutation.mutate();
  };

  const columns = [
    {
      title: "Date", key: "date", width: 150,
      render: (_: any, r: PaymentRecord) => (
        <Text style={{ fontSize: 11, color: C.subText }}>
          {r.payment_date || r.createdAt ? dayjs(r.payment_date || r.createdAt).format("DD MMM YYYY HH:mm") : "—"}
        </Text>
      ),
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
      title: "Notes", dataIndex: "notes", key: "notes",
      render: (v: string) => <Text style={{ fontSize: 11, color: C.subText }}>{v || "—"}</Text>,
    },
    {
      title: "By", key: "by",
      render: (_: any, r: PaymentRecord) => <Text style={{ fontSize: 11 }}>{r.created_by?.username || "—"}</Text>,
    },
    {
      title: "Status", key: "status",
      render: (_: any, r: PaymentRecord) => {
        if (!r.payment_status) return <Text style={{ color: C.subText }}>—</Text>;
        const color = r.payment_status === "COMPLETED" ? C.green : r.payment_status === "REFUNDED" ? C.red : r.payment_status === "FAILED" ? C.red : C.orange;
        return (
          <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 4, padding: "1px 7px" }}>
            {r.payment_status}
          </span>
        );
      },
    },
    {
      title: "Amount", dataIndex: "amount", key: "amount", align: "right" as const,
      render: (v: number) => <Text strong style={{ fontSize: 12, color: C.green }}>KES {fmt(v)}</Text>,
    },
  ];

  return (
    <div style={{ padding: "12px 16px" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        {[
          { label: "Total Paid", value: `KES ${fmt(total)}`, color: C.green, bg: "#f0fdf4", border: "#bbf7d0" },
          { label: "Balance Due", value: `KES ${fmt(amountDue)}`, color: amountDue > 0 ? C.orange : C.green, bg: "#fff7ed", border: "#fed7aa" },
          { label: "Invoice Total", value: `KES ${fmt(grandTotal)}`, color: C.primary, bg: C.bg, border: C.border },
        ].map((item) => (
          <div key={item.label} style={{
            flex: "1 1 120px", background: item.bg,
            border: `1px solid ${item.border}`, borderLeft: `3px solid ${item.color}`,
            borderRadius: 8, padding: "8px 12px",
          }}>
            <Text style={{ fontSize: 10, color: C.subText, display: "block", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}>
              {item.label}
            </Text>
            <Text strong style={{ fontSize: 14, color: item.color }}>{item.value}</Text>
          </div>
        ))}
        <Button icon={<PrinterOutlined />} onClick={onOpenPrint}
          style={{ alignSelf: "center", borderRadius: 8, borderColor: C.primary, color: C.primary }}>
          Download Receipt
        </Button>
        <Button 
          icon={<CopyOutlined />} 
          onClick={handleDuplicate}
          loading={duplicateMutation.isPending}
          style={{ alignSelf: "center", borderRadius: 8, borderColor: C.primary, color: C.primary }}>
          Duplicate
        </Button>
      </div>
      {!payments.length ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<Text style={{ fontSize: 12, color: C.subText }}>No payment records found</Text>}
          style={{ padding: "16px 0" }} />
      ) : (
        <Table rowKey={(r) => r._id || String(Math.random())} columns={columns}
          dataSource={payments} pagination={false} size="small" scroll={{ x: 620 }} />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TAB 4 — Payment Receipts (Sales Receipts)
// ═══════════════════════════════════════════════════════════════
const SalesReceiptsTab = ({ record }: { record: InvoiceDetailsInterface }) => {
  const salesReceipts: SalesReceiptRecord[] = record.salesReceipts || [];
  const total = salesReceipts.reduce((s, r) => s + (r.grand_total || 0), 0);
  const regularPayments = (record.payments || record.payment_ids || []).reduce((s, p) => s + (p.amount || 0), 0);
  const grandTotal = record.grand_total || 0;
  // Calculate amount due by subtracting both regular payments and sales receipts from grand total
  const amountDue = Math.max(0, grandTotal - regularPayments - total);

  const columns = [
    {
      title: "Receipt No",
      dataIndex: "receipt_no",
      key: "receipt_no",
      render: (text: string) => <Text strong style={{ fontFamily: "monospace", fontSize: 11 }}>{text}</Text>,
    },
    {
      title: "Date",
      dataIndex: "receipt_date",
      key: "receipt_date",
      render: (date: string) => <Text style={{ fontSize: 11 }}>{dayjs(date).format("DD MMM YYYY")}</Text>,
    },
    {
      title: "Amount",
      dataIndex: "grand_total",
      key: "grand_total",
      align: "right" as const,
      render: (amount: number) => <Text strong style={{ fontSize: 11, color: C.green }}>KES {fmt(amount)}</Text>,
    },
    {
      title: "Method",
      dataIndex: "payment_method",
      key: "payment_method",
      render: (method: string) => <Tag color="blue" style={{ fontSize: 10 }}>{method}</Tag>,
    },
    {
      title: "Reference",
      dataIndex: "payment_reference",
      key: "payment_reference",
      render: (v: string) => v ? <Text code style={{ fontSize: 10 }}>{v}</Text> : <Text style={{ color: C.subText, fontSize: 10 }}>—</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "Posted" ? "success" : "warning"} style={{ fontSize: 10 }}>{status}</Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: "12px 16px" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        {[
          { label: "Total Receipts", value: `KES ${fmt(total)}`, color: C.green, bg: "#f0fdf4", border: "#bbf7d0" },
          { label: "Balance Due", value: `KES ${fmt(amountDue)}`, color: amountDue > 0 ? C.orange : C.green, bg: "#fff7ed", border: "#fed7aa" },
          { label: "Invoice Total", value: `KES ${fmt(grandTotal)}`, color: C.primary, bg: C.bg, border: C.border },
        ].map((item) => (
          <div key={item.label} style={{
            flex: "1 1 120px", background: item.bg,
            border: `1px solid ${item.border}`, borderLeft: `3px solid ${item.color}`,
            borderRadius: 8, padding: "8px 12px",
          }}>
            <Text style={{ fontSize: 10, color: C.subText, display: "block", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}>
              {item.label}
            </Text>
            <Text strong style={{ fontSize: 14, color: item.color }}>{item.value}</Text>
          </div>
        ))}
      </div>
      {!salesReceipts.length ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<Text style={{ fontSize: 12, color: C.subText }}>No payment receipts linked to this invoice</Text>}
          style={{ padding: "16px 0" }} />
      ) : (
        <Table rowKey="_id" columns={columns}
          dataSource={salesReceipts} pagination={false} size="small" scroll={{ x: 600 }} />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TAB 5 — Credit / Debit Notes
// ═══════════════════════════════════════════════════════════════
const NOTE_TYPE_COLOR: Record<string, string> = { CREDIT_NOTE: "green", DEBIT_NOTE: "orange" };

const NotesTab = ({ invoiceId, shopId, onOpenNote }: { invoiceId: string; shopId: string; onOpenNote: (id: string) => void }) => {
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
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <span>
          <Text style={{ fontSize: 12, color: C.subText }}>No credit / debit notes attached to this invoice.</Text><br />
          <Text style={{ fontSize: 11, color: C.subText }}>Go to <strong>Credit / Debit Notes</strong> to create one.</Text>
        </span>
      }
      style={{ padding: "20px 0" }} />
  );

  return (
    <div>
      {summary && (
        <div style={{
          display: "flex", gap: 20, flexWrap: "wrap",
          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "8px 14px", marginBottom: 12,
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
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {notes.map((note: any) => (
          <div key={note._id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8, background: "#fff",
            border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px",
          }}>
            <Space size={8} wrap>
              <Tag color={NOTE_TYPE_COLOR[note.note_type] || "default"} style={{ fontSize: 10, margin: 0 }}>
                {note.note_type === "CREDIT_NOTE" ? "Credit Note" : "Debit Note"}
              </Tag>
              <Text code style={{ fontSize: 11 }}>{note.note_no}</Text>
              <Text style={{ fontSize: 12, color: C.darkText }}>{note.reason}</Text>
            </Space>
            <Space size={12} wrap>
              <Text strong style={{ fontSize: 13, color: note.note_type === "CREDIT_NOTE" ? C.green : C.orange }}>
                {note.note_type === "CREDIT_NOTE" ? "−" : "+"}KES {fmt(note.grand_total)}
              </Text>
              <Tag color={note.status === "Applied" ? "success" : note.status === "Approved" ? "processing" : note.status === "Voided" ? "error" : "default"}
                style={{ fontSize: 10 }}>{note.status}</Tag>
              <Text style={{ fontSize: 11, color: C.subText }}>{dayjs(note.issue_date).format("DD MMM YYYY")}</Text>
            </Space>
            <Tooltip title="Open note details">
              <Button size="small" type="primary" icon={<ArrowRightOutlined />}
                onClick={() => onOpenNote(note._id)}
                style={{ background: C.primary, borderColor: C.primary, borderRadius: 6, fontSize: 11 }}>
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
// TAB 5 — ETR / DigiTax
// ═══════════════════════════════════════════════════════════════
const EtrTab = ({ record }: { record: InvoiceDetailsInterface }) => {
  const queryClient = useQueryClient();
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePollRef = useRef(false);

  const digitax = record.digitax;
  const etrEnabled = record.etr_enabled;
  const shopKraPin = record.shop_kra_pin;

  // Poll for ETR updates
  const startPoll = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    const TERMINAL = ["Verified", "COMPLETED", "Failed", "FAILED"];
    activePollRef.current = true;
    setPolling(true);
    const doPoll = () => {
      pollRef.current = setTimeout(async () => {
        if (!activePollRef.current) return;
        try {
          const res = await getInvoiceById(record._id);
          if (!activePollRef.current) return;
          const st = res.invoice?.digitax?.submission_status;
          if (st && TERMINAL.includes(st)) {
            setPolling(false);
            activePollRef.current = false;
            queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
          } else {
            doPoll();
          }
        } catch {
          setPolling(false);
          activePollRef.current = false;
        }
      }, 4000);
    };
    doPoll();
  };

  const stopPoll = () => {
    activePollRef.current = false;
    if (pollRef.current) clearTimeout(pollRef.current);
    setPolling(false);
  };

  useEffect(() => {
    if (etrEnabled && digitax && !["Verified", "COMPLETED", "Failed", "FAILED"].includes(digitax.submission_status || "")) {
      startPoll();
    }
    return stopPoll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etrEnabled, digitax?.submission_status]);

  // Retry ETR submission
  const retryMutation = useMutation({
    mutationFn: () => patchInvoice(record._id, { etr_enabled: true }),
    onSuccess: () => {
      message.success("ETR re-submission triggered");
      startPoll();
      queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
    },
    onError: () => message.error("Failed to trigger ETR retry"),
  });

  // Refresh ETR status from DigiTax
  const refreshMutation = useMutation({
    mutationFn: () => refreshInvoiceEtr(record._id),
    onSuccess: (res) => {
      if (res.success) {
        message.success("ETR status refreshed");
        stopPoll();
        queryClient.invalidateQueries({ queryKey: ["invoice", record._id] });
        queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
      } else {
        message.error(res.error || "ETR refresh failed");
      }
    },
    onError: () => message.error("ETR refresh failed"),
  });

  // Manual verification with KRA
  const verifyMutation = useMutation({
    mutationFn: () => verifyDigiTax(record._id),
    onSuccess: (res) => {
      if (res.verified) {
        message.success("Invoice verified with KRA");
        queryClient.invalidateQueries({ queryKey: ["invoices-unsettled"] });
      } else {
        message.warning("Verification not yet confirmed by KRA");
      }
    },
    onError: () => message.error("Failed to verify with KRA"),
  });

  // Status badge
  const st = digitax?.submission_status;
  let statusBadge: React.ReactNode;
  if (!etrEnabled) {
    statusBadge = <Tag color="default">ETR Disabled</Tag>;
  } else if (!digitax || !st) {
    statusBadge = <Tag color="default" icon={polling ? <Spin size="small" /> : undefined}>In Flight</Tag>;
  } else if (st === "Verified" || st === "COMPLETED") {
    statusBadge = <Tag color="success">ETR Verified</Tag>;
  } else if (st === "Submitted") {
    statusBadge = <Tag color="processing">Submitted to KRA</Tag>;
  } else if (st === "Failed" || st === "FAILED") {
    statusBadge = <Tag color="error">ETR Failed</Tag>;
  } else {
    statusBadge = <Tag color="default">Pending</Tag>;
  }

  if (!etrEnabled) {
    return (
      <div style={{ padding: "12px 16px" }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<Text style={{ fontSize: 12, color: C.subText }}>ETR is not enabled for this invoice</Text>}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 16px" }}>
      {/* Header with status */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}`,
      }}>
        <Space>
          <SafetyCertificateOutlined style={{ color: "#16a34a" }} />
          <Text strong style={{ fontSize: 13 }}>ETR / KRA DigiTax</Text>
          {statusBadge}
        </Space>
        <Space>
          {(st === "Pending" || !st) && etrEnabled && (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={refreshMutation.isLoading}
              onClick={() => refreshMutation.mutate()}
            >
              Refresh ETR Status
            </Button>
          )}
          {st === "Submitted" && (
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              loading={verifyMutation.isLoading}
              onClick={() => verifyMutation.mutate()}
              type="primary"
            >
              Verify with KRA
            </Button>
          )}
          {(st === "Failed" || st === "FAILED") && (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={retryMutation.isLoading}
              onClick={() => retryMutation.mutate()}
              danger
            >
              Retry
            </Button>
          )}
        </Space>
      </div>

      {!shopKraPin ? (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="KRA PIN not configured"
          description="Go to Settings → Company to add your shop's KRA PIN."
          style={{ marginBottom: 12 }}
        />
      ) : (
        <>
          {/* KRA PIN */}
          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 8, padding: "10px 14px", marginBottom: 12,
          }}>
            <Text style={{ fontSize: 11, color: C.subText, display: "block", marginBottom: 4 }}>Shop KRA PIN</Text>
            <Text code style={{ fontSize: 13, fontFamily: "monospace" }}>{shopKraPin}</Text>
          </div>

          {/* DigiTax details */}
          {digitax ? (
            <Row gutter={16} style={{ marginBottom: 12 }}>
              {digitax.serial_number && (
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>CU Serial No.</Text>
                    <Text code style={{ fontSize: 12, fontFamily: "monospace" }}>{digitax.serial_number}</Text>
                  </div>
                </Col>
              )}
              {digitax.receipt_number != null && (
                <Col span={12}>
                  <div style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>Receipt No.</Text>
                    <Text strong style={{ fontSize: 12 }}>{digitax.receipt_number}</Text>
                  </div>
                </Col>
              )}
              {digitax.receipt_signature && (
                <Col span={24}>
                  <div style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>Receipt Signature</Text>
                    <Text code style={{ fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>{digitax.receipt_signature}</Text>
                  </div>
                </Col>
              )}
            </Row>
          ) : (
            <Space style={{ marginBottom: 12 }}>
              {polling && <Spin size="small" />}
              <Text style={{ fontSize: 12, color: C.subText }}>
                {polling ? "Awaiting KRA DigiTax response…" : "ETR submission in progress"}
              </Text>
            </Space>
          )}

          {/* Error message */}
          {digitax?.error_message && (
            <Alert
              type="error"
              showIcon
              message="DigiTax Error"
              description={digitax.error_message}
              style={{ marginBottom: 12 }}
            />
          )}

          {/* Verification links */}
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            {digitax?.etims_url && (
              <a
                href={digitax.etims_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12 }}
              >
                <LinkOutlined style={{ marginRight: 4 }} />
                Verify on KRA eTIMS
              </a>
            )}
            {digitax?.offline_url && (st === "Verified" || st === "COMPLETED") ? (
              <a
                href={digitax.offline_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: C.green }}
              >
                <LinkOutlined style={{ marginRight: 4 }} />
                View KRA Receipt
              </a>
            ) : digitax?.offline_url ? (
              <Text style={{ fontSize: 11, color: C.subText }}>
                Receipt link available once ETR is verified
              </Text>
            ) : null}
          </Space>

          {/* QR Code — only show when receipt is verified */}
          {(digitax?.etims_url || digitax?.offline_url) && (st === "Verified" || st === "COMPLETED") && (
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <SectionLabel>QR Code for Verification</SectionLabel>
              <div style={{
                display: "inline-block", padding: 12, background: "white",
                borderRadius: 8, border: "1px solid #e5e7eb",
              }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(digitax.etims_url || digitax.offline_url!)}`}
                  alt="ETR QR Code"
                  style={{ width: 150, height: 150, display: "block" }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Payment Receipt Templates
// ═══════════════════════════════════════════════════════════════

const ReceiptTemplateModern = React.forwardRef<HTMLDivElement, {
  inv: InvoiceDetailsInterface; sys: SystemDetails; accentColor?: string;
}>(({ inv, sys, accentColor = "#6c1c2c" }, ref) => {
  const payments: PaymentRecord[] = inv.payments || inv.payment_ids || [];
  const party = resolveParty(inv);
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const balanceDue = Math.max(0, (inv.grand_total || 0) - totalPaid);
  const receiptNo = (() => {
    const base = inv.order_no || inv.invoice_no || "";
    return base ? base.replace(/^(INV|QUOTE|BILL)-?/, "REC-") : `REC-${dayjs().format("YYYYMMDD")}-${(inv._id || "").slice(-6).toUpperCase()}`;
  })();
  return (
    <div ref={ref} style={{ fontFamily: "'Segoe UI', Roboto, sans-serif", color: "#0f172a", background: "#fff", width: "100%" }}>

      {/* ── Full-width header (no negative-margin hack) ── */}
      <div style={{ background: accentColor, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "stretch", minHeight: 110 }}>
        <div style={{ display: "flex", flexDirection: "column" as const, justifyContent: "center", padding: "20px 36px" }}>
          <div style={{ fontSize: 9, opacity: 0.7, letterSpacing: 2, textTransform: "uppercase" as const, marginBottom: 2 }}>Payment Receipt</div>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{sys.BRAND_NAME1 || "Business"}</div>
          <div style={{ fontSize: 11, opacity: 0.75, fontFamily: "monospace", marginTop: 4, letterSpacing: 0.5 }}>{receiptNo}</div>
          {sys.PHONE_NO && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 3 }}>{sys.PHONE_NO}</div>}
          {sys.EMAIL_URL && <div style={{ fontSize: 11, opacity: 0.8 }}>{sys.EMAIL_URL}</div>}
          {sys.PIN && <div style={{ fontSize: 11, opacity: 0.8 }}>KRA PIN: {sys.PIN}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.13)", minWidth: 150, padding: "16px 28px" }}>
          {sys.tenant_logo?.url
            ? <img src={sys.tenant_logo.url} alt="logo" style={{ maxHeight: 82, maxWidth: 140, width: "auto", objectFit: "contain" }} />
            : <img src="/relia.png" alt="logo" style={{ maxHeight: 82, maxWidth: 140, width: "auto", objectFit: "contain", opacity: 0.88 }} />
          }
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "28px 36px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 24, flexWrap: "wrap" as const }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 6 }}>Received From</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{party.name}</div>
            {party.phone && <div style={{ fontSize: 12, color: "#64748b" }}>{party.phone}</div>}
            {party.email && <div style={{ fontSize: 12, color: "#64748b" }}>{party.email}</div>}
            {party.kra_pin && <div style={{ fontSize: 12, color: "#64748b" }}>KRA PIN: {party.kra_pin}</div>}
          </div>
          <div style={{ textAlign: "right" as const }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 6 }}>Receipt Info</div>
            <div style={{ fontSize: 12 }}>Receipt No: <strong style={{ fontFamily: "monospace" }}>{receiptNo}</strong></div>
            <div style={{ fontSize: 12 }}>Invoice: <strong>{inv.order_no}</strong></div>
            {inv.paid_date && <div style={{ fontSize: 12, color: "#64748b" }}>Paid: <strong>{dayjs(inv.paid_date).format("DD MMM YYYY HH:mm")}</strong></div>}
            <div style={{ fontSize: 12 }}>Status: <span style={{ color: "#10b981", fontWeight: 700 }}>{inv.status}</span></div>
          </div>
        </div>

        <div style={{ background: `${accentColor}10`, border: `2px solid ${accentColor}28`, borderRadius: 10, padding: "16px 20px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" as const, marginBottom: 2 }}>Total Paid</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: accentColor }}>KES {fmt(totalPaid)}</div>
          </div>
          <div style={{ textAlign: "center" as const }}>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" as const, marginBottom: 2 }}>Invoice Total</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>KES {fmt(inv.grand_total)}</div>
          </div>
          {balanceDue === 0 ? (
            <div style={{ background: "#f0fdf4", border: "2px solid #10b981", borderRadius: 8, padding: "8px 18px", fontSize: 14, fontWeight: 800, color: "#10b981", letterSpacing: 1 }}>✓ PAID IN FULL</div>
          ) : (
            <div style={{ textAlign: "right" as const }}>
              <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 600, textTransform: "uppercase" as const, marginBottom: 2 }}>Balance Due</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>KES {fmt(balanceDue)}</div>
            </div>
          )}
        </div>

        {payments.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 8 }}>Payment Details</div>
            <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["Date", "Method", "Amount"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: h === "Amount" ? "right" as const : "left" as const, fontWeight: 700, fontSize: 11, borderBottom: "2px solid #e2e8f0", color: "#374151" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={p._id || String(i)} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", color: "#64748b" }}>{dayjs(p.payment_date || p.createdAt).format("DD MMM YYYY HH:mm")}</td>
                    <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{p.method_id?.name || p.method || "—"}</span>
                    </td>
                    <td style={{ padding: "7px 10px", borderBottom: "1px solid #f1f5f9", textAlign: "right" as const, fontWeight: 700, color: "#10b981" }}>KES {fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700 }}>Thank you for your payment!</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{[sys.EMAIL_URL, sys.PHONE_NO].filter(Boolean).join(" · ")}</div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>Printed {new Date().toLocaleDateString("en-KE")}</div>
        </div>
      </div>
      <style>{`@media print{@page{size:A4 portrait;margin:0}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`}</style>
    </div>
  );
});
ReceiptTemplateModern.displayName = "ReceiptTemplateModern";

const ReceiptTemplateCompact = React.forwardRef<HTMLDivElement, {
  inv: InvoiceDetailsInterface; sys: SystemDetails; accentColor?: string;
}>(({ inv, sys, accentColor = "#6c1c2c" }, ref) => {
  const payments: PaymentRecord[] = inv.payments || inv.payment_ids || [];
  const party = resolveParty(inv);
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const balanceDue = Math.max(0, (inv.grand_total || 0) - totalPaid);
  const receiptNo = (() => {
    const base = inv.order_no || inv.invoice_no || "";
    return base ? base.replace(/^(INV|QUOTE|BILL)-?/, "REC-") : `REC-${dayjs().format("YYYYMMDD")}-${(inv._id || "").slice(-6).toUpperCase()}`;
  })();
  return (
    <div ref={ref} style={{ fontFamily: "'Courier New', Courier, monospace", color: "#000", background: "#fff", padding: "28px 22px", width: "100%", maxWidth: 400, margin: "0 auto", boxSizing: "border-box" as const }}>
      <div style={{ textAlign: "center" as const, borderBottom: "2px dashed #000", paddingBottom: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{sys.BRAND_NAME1 || "Business"}</div>
        {sys.PHONE_NO && <div style={{ fontSize: 11 }}>{sys.PHONE_NO}</div>}
        {sys.EMAIL_URL && <div style={{ fontSize: 11 }}>{sys.EMAIL_URL}</div>}
        {sys.PIN && <div style={{ fontSize: 11 }}>KRA PIN: {sys.PIN}</div>}
        <div style={{ fontSize: 14, fontWeight: 800, marginTop: 10, letterSpacing: 2, color: accentColor }}>PAYMENT RECEIPT</div>
        <div style={{ fontSize: 11, marginTop: 4, letterSpacing: 1 }}>{receiptNo}</div>
      </div>

      <div style={{ fontSize: 12, marginBottom: 12 }}>
        {([
          ["Receipt No", receiptNo],
          ["Invoice", inv.order_no || "—"],
          ["Customer", party.name],
          ...(inv.paid_date ? [["Date Paid", dayjs(inv.paid_date).format("DD MMM YYYY HH:mm")]] : []),
        ] as [string, string][]).map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between" as const, marginBottom: 3 }}>
            <span style={{ color: "#555" }}>{label}:</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "10px 0", marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, marginBottom: 6, letterSpacing: 1, color: "#555" }}>Payments</div>
        {payments.length === 0 && <div style={{ fontSize: 11, color: "#888" }}>No payments recorded</div>}
        {payments.map((p, i) => (
          <div key={p._id || String(i)} style={{ marginBottom: 8, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" as const }}>
              <span style={{ fontWeight: 700 }}>{p.method_id?.name || p.method || "Payment"}</span>
              <span style={{ fontWeight: 700 }}>KES {fmt(p.amount)}</span>
            </div>
            {p.reference && <div style={{ fontSize: 10, color: "#555" }}>Ref: {p.reference}</div>}
            {(p.payment_date || p.createdAt) && <div style={{ fontSize: 10, color: "#555" }}>{dayjs(p.payment_date || p.createdAt).format("DD MMM YYYY HH:mm")}</div>}
          </div>
        ))}
      </div>

      {([
        ["Invoice Total", `KES ${fmt(inv.grand_total)}`, false],
        ["Amount Paid", `KES ${fmt(totalPaid)}`, false],
        ["Balance Due", `KES ${fmt(balanceDue)}`, true],
      ] as [string, string, boolean][]).map(([label, value, isBold], i) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between" as const, borderTop: i === 2 ? "1px solid #000" : "none", paddingTop: i === 2 ? 4 : 0, marginTop: i === 2 ? 4 : 2, fontWeight: isBold ? 700 : 400, fontSize: 12 }}>
          <span>{label}:</span><span>{value}</span>
        </div>
      ))}

      {balanceDue === 0 && (
        <div style={{ textAlign: "center" as const, border: `3px solid ${accentColor}`, padding: "6px 0", fontWeight: 800, fontSize: 13, letterSpacing: 2, marginTop: 10, color: accentColor }}>*** PAID IN FULL ***</div>
      )}

      <div style={{ textAlign: "center" as const, borderTop: "2px dashed #000", paddingTop: 10, marginTop: 12, fontSize: 11 }}>
        <div style={{ fontWeight: 600 }}>Thank you for your payment!</div>
        <div style={{ fontSize: 10, marginTop: 4, color: "#555" }}>Printed {new Date().toLocaleDateString("en-KE")}</div>
      </div>
      <style>{`@media print{@page{size:80mm auto;margin:4mm}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`}</style>
    </div>
  );
});
ReceiptTemplateCompact.displayName = "ReceiptTemplateCompact";

const RECEIPT_STYLES = [
  { id: "modern" as const, name: "A4 Modern", desc: "Professional A4 payment receipt" },
  { id: "compact" as const, name: "Compact / Thermal", desc: "80mm thermal-style receipt" },
];

const PaymentReceiptDownload: React.FC<{
  inv: InvoiceDetailsInterface; sys: SystemDetails; primaryColor: string;
}> = ({ inv, sys, primaryColor }) => {
  const [style, setStyle] = useState<"modern" | "compact">("modern");
  const modernRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLDivElement>(null);
  const title = `Receipt-${inv.order_no || inv._id}`;
  const printModern = useReactToPrint({ content: () => modernRef.current, documentTitle: title, pageStyle: "@page{size:A4 portrait;margin:12mm}@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}" });
  const printCompact = useReactToPrint({ content: () => compactRef.current, documentTitle: title, pageStyle: "@page{size:80mm auto;margin:4mm}@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}" });

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, flexWrap: "wrap" as const, gap: 10 }}>
        <div>
          <Text strong style={{ fontSize: 13 }}>Payment Receipt</Text>
          <Text style={{ fontSize: 11, color: C.subText, marginLeft: 8 }}>{inv.order_no}</Text>
        </div>
        <Button type="primary" icon={<PrinterOutlined />}
          onClick={() => style === "modern" ? printModern() : printCompact()}
          style={{ background: primaryColor, borderColor: primaryColor, borderRadius: 6 }}>
          Download / Print PDF
        </Button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {RECEIPT_STYLES.map((s) => (
          <button key={s.id} onClick={() => setStyle(s.id)} style={{
            flex: "0 0 auto", cursor: "pointer",
            border: style === s.id ? `2.5px solid ${primaryColor}` : `1.5px solid ${C.border}`,
            borderRadius: 9, background: "#fff", padding: "8px 16px",
            transform: style === s.id ? "scale(1.04)" : "scale(1)",
            boxShadow: style === s.id ? `0 0 0 3px ${primaryColor}20` : "none",
            transition: "all 0.12s",
          }}>
            <div style={{ fontSize: 11, fontWeight: style === s.id ? 700 : 500, color: style === s.id ? primaryColor : C.darkText }}>{s.name}</div>
            <div style={{ fontSize: 10, color: C.subText }}>{s.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", maxHeight: 540, overflowY: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: style === "modern" ? "block" : "none" }}>
          <ReceiptTemplateModern ref={modernRef} inv={inv} sys={sys} accentColor={primaryColor} />
        </div>
        <div style={{ display: style === "compact" ? "flex" : "none", justifyContent: "center" as const, background: "#f1f5f9", padding: 24 }}>
          <ReceiptTemplateCompact ref={compactRef} inv={inv} sys={sys} accentColor={primaryColor} />
        </div>
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
  defaultTab?: string;
}

const ExpandableInvoice = ({ record, onOpenNote, defaultTab = "receipt" }: ExpandableInvoiceProps) => {
  const isMobile = useIsMobile();
  const sys: SystemDetails = useSystemDetails();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [receiptPdfOpen, setReceiptPdfOpen] = useState(false);
  const primaryColor = usePrimaryColor();
  const [invoiceColor, setInvoiceColor] = useState(primaryColor);
  const queryClient = useQueryClient();

  // Use usePrintDocument for print status
  const orderNo = useMemo(() => record.order_no, [record.order_no]);
  const documentType: DocumentType = "invoice";

  console.log('Invoice totals passed to usePrintDocument:', {
    subtotal: record.subtotal,
    total_vat_amount: record.total_vat_amount,
    grand_total: record.grand_total,
  });

  const {
    canPrint,
    isReprint,
    printsRemaining,
    printStatus,
    statusLoading,
    recordPrint,
  } = usePrintDocument({
    orderNo,
    documentType,
    cartDetails: record,
    data: record.items || [],
    subtotal: record.subtotal,
    totalVatAmount: record.total_vat_amount,
    grandTotal: record.grand_total,
  });

  const printProps = {
    canPrint,
    isReprint,
    printsRemaining,
    printStatus,
    statusLoading,
    recordPrint,
  };

  // Fetch fresh invoice data to support ETR refresh
  const { data: freshInvoice } = useQuery({
    queryKey: ["invoice", record._id],
    queryFn: () => getInvoiceById(record._id),
    enabled: !!record._id,
    staleTime: 5000,
  });

  // Use fresh data if available, otherwise fall back to prop
  const invoiceData = freshInvoice?.invoice || record;

  // Persist color per invoice
  useEffect(() => {
    const saved = localStorage.getItem(`invoice_color_${record._id}`);
    if (saved) setInvoiceColor(saved);
  }, [record._id]);

  const handleColorChange = (color: string) => {
    setInvoiceColor(color);
    localStorage.setItem(`invoice_color_${record._id}`, color);
  };

  const shopId: string = (() => {
    if (record.shop_id) return String(record.shop_id);
    try {
      const t = JSON.parse(localStorage.getItem("tenant") || "{}");
      return t.default_shop?._id || t.shops?.[0]?._id || t._id || "";
    } catch { return ""; }
  })();

  const { data: notesData } = useQuery({
    queryKey: ["notes-by-invoice", record._id],
    queryFn: () => getNotesByInvoice(record.invoice_no || record._id, shopId),
    enabled: !!record._id && !!shopId,
    staleTime: 30_000,
  });
  const noteCount = notesData?.notes?.length || 0;
  const paymentCount = (invoiceData.payments || invoiceData.payment_ids || []).length;
  const salesReceiptCount = (invoiceData.salesReceipts || []).length;

  // Tab order: Receipt first, then Details, Payments, Payment Receipts, Notes
  const tabItems = [
    {
      key: "receipt",
      label: (
        <Space size={4}>
          <FilePdfOutlined />
          <span>Invoice / PDF</span>
        </Space>
      ),
      children: (
        <ReceiptTab
          record={invoiceData}
          sys={sys}
          invoiceColor={invoiceColor}
          onColorChange={handleColorChange}
          primaryColor={primaryColor}
          printProps={printProps}
          creditNotes={notesData?.notes || []}
        />
      ),
    },
    {
      key: "details",
      label: (
        <Space size={4}>
          <FileTextOutlined />
          <span>Details</span>
        </Space>
      ),
      children: (
        <DetailsTab
          record={invoiceData as InvoiceDetailsInterface}
          isMobile={isMobile}
          onSave={(updated) => {
            // Pass to parent or call update API
            console.log("Save invoice updates:", updated);
          }}
        />
      ),
    },
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
      children: (
        <PaymentsTab record={invoiceData as InvoiceDetailsInterface} onOpenPrint={() => setReceiptPdfOpen(true)} />
      ),
    },
    {
      key: "sales-receipts",
      label: (
        <Space size={4}>
          <DollarOutlined />
          <span>Payment Receipts</span>
          {salesReceiptCount > 0 && (
            <Badge count={salesReceiptCount} size="small"
              style={{ backgroundColor: C.blue, fontSize: 9, marginLeft: 2 }} />
          )}
        </Space>
      ),
      children: (
        <SalesReceiptsTab record={invoiceData as InvoiceDetailsInterface} />
      ),
    },
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
          <NotesTab invoiceId={record.invoice_no || record._id} shopId={shopId} onOpenNote={(id) => onOpenNote?.(id)} />
        </div>
      ),
    },
    ...(record.etr_enabled ? [{
      key: "etr",
      label: (
        <Space size={4}>
          <SafetyCertificateOutlined />
          <span>ETR / DigiTax</span>
        </Space>
      ),
      children: <EtrTab record={invoiceData as InvoiceDetailsInterface} />,
    }] : []),
  ];

  return (
    <div style={{ background: C.bg }}>
      <Tabs
        size="small"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        tabBarStyle={{
          marginBottom: 0, background: "#fff",
          borderBottom: `1px solid ${C.border}`, paddingLeft: 16,
        }}
      />
      <Modal
        open={receiptPdfOpen}
        onCancel={() => setReceiptPdfOpen(false)}
        title={null}
        footer={null}
        width="min(92vw, 900px)"
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        <PaymentReceiptDownload
          inv={invoiceData as InvoiceDetailsInterface}
          sys={sys}
          primaryColor={primaryColor}
        />
      </Modal>
    </div>
  );

  return (
    <>
      <div style={{ padding: 16, background: C.bg }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>{editBtn}</div>
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
          <ProDescriptions column={2} bordered size="small"
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px" }}>
                <Text strong style={{ fontSize: 12 }}>{party.label} Information</Text>
                {party.address && (
                  <Button 
                    size="small" 
                    icon={<EditOutlined />} 
                    onClick={() => {
                      addressForm.setFieldsValue(party.address);
                      setAddressEditOpen(true);
                    }}
                  >
                    Edit Address
                  </Button>
                )}
              </div>
            }
          >
            <ProDescriptions.Item label="Name"><Text strong style={{ fontSize: 12 }}>{party.name}</Text></ProDescriptions.Item>
            <ProDescriptions.Item label="Phone"><Text style={{ fontSize: 12 }}>{party.phone || "—"}</Text></ProDescriptions.Item>
            <ProDescriptions.Item label="Email"><Text style={{ fontSize: 12, color: C.subText }}>{party.email || "—"}</Text></ProDescriptions.Item>
            <ProDescriptions.Item label="Location"><Text style={{ fontSize: 12 }}>{party.location || "—"}</Text></ProDescriptions.Item>
            {party.address && (
              <>
                <ProDescriptions.Item label="Street Address"><Text style={{ fontSize: 12 }}>{party.address.street || "—"}</Text></ProDescriptions.Item>
                <ProDescriptions.Item label="City"><Text style={{ fontSize: 12 }}>{party.address.city || "—"}</Text></ProDescriptions.Item>
                <ProDescriptions.Item label="County"><Text style={{ fontSize: 12 }}>{party.address.county || "—"}</Text></ProDescriptions.Item>
                <ProDescriptions.Item label="Country"><Text style={{ fontSize: 12 }}>{party.address.country || "—"}</Text></ProDescriptions.Item>
                {party.address.postal_code && <ProDescriptions.Item label="Postal Code"><Text style={{ fontSize: 12 }}>{party.address.postal_code}</Text></ProDescriptions.Item>}
              </>
            )}
            {party.kra_pin && <ProDescriptions.Item label="KRA PIN" span={2}><Text style={{ fontSize: 12 }}>{party.kra_pin}</Text></ProDescriptions.Item>}
            {party.ref && <ProDescriptions.Item label="Supplier Ref" span={2}><Text style={{ fontSize: 12 }}>{party.ref}</Text></ProDescriptions.Item>}
          </ProDescriptions>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          <ProDescriptions column={2} bordered size="small"
            title={<Text strong style={{ fontSize: 12, padding: "8px 12px", display: "block" }}>Invoice Details</Text>}
          >
            <ProDescriptions.Item label="Invoice Number"><Text strong style={{ fontSize: 12 }}>{order_no}</Text></ProDescriptions.Item>
            <ProDescriptions.Item label="Date"><Text style={{ fontSize: 12, color: C.subText }}>{dayjs(issue_date || createdAt).format("DD MMM YYYY HH:mm")}</Text></ProDescriptions.Item>
            {due_date && <ProDescriptions.Item label="Due Date"><Text style={{ fontSize: 12, color: C.red }}>{dayjs(due_date).format("DD MMM YYYY")}</Text></ProDescriptions.Item>}
            <ProDescriptions.Item label="Status">
              <span style={{ background: statusBg, color: statusColor, border: `1px solid ${statusColor}30`, borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{status || "—"}</span>
            </ProDescriptions.Item>
            <ProDescriptions.Item label="Pricing Mode"><Text style={{ fontSize: 12 }}>{vat_pricing_mode || "—"}</Text></ProDescriptions.Item>
            {served_by && <ProDescriptions.Item label="Served By"><Text style={{ fontSize: 12 }}>{served_by.username}</Text></ProDescriptions.Item>}
            {created_by && <ProDescriptions.Item label="Created By"><Text style={{ fontSize: 12 }}>{created_by.username}</Text></ProDescriptions.Item>}
            {terms && <ProDescriptions.Item label="Terms" span={2}><Text style={{ fontSize: 12 }}>{terms}</Text></ProDescriptions.Item>}
            {notes && <ProDescriptions.Item label="Notes" span={2}><Text style={{ fontSize: 12 }}>{notes}</Text></ProDescriptions.Item>}
            <ProDescriptions.Item label="Items" span={2}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                {items.map((item) => <ItemRow key={item._id} item={item} />)}
              </div>
            </ProDescriptions.Item>
            <ProDescriptions.Item label="Subtotal" span={2}><Text strong style={{ fontSize: 12 }}>KES {fmt(subtotal)}</Text></ProDescriptions.Item>
            {vatRows.map((r, i) => <ProDescriptions.Item key={i} label={r.label}><Text style={{ fontSize: 12 }}>{r.value}</Text></ProDescriptions.Item>)}
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
            <ProDescriptions.Item label="Grand Total" span={2}><Text strong style={{ fontSize: 14, color: C.primary }}>KES {fmt(grand_total)}</Text></ProDescriptions.Item>
            {(amount_paid || 0) > 0 && (
              <>
                <ProDescriptions.Item label="Amount Paid"><Text strong style={{ fontSize: 12, color: C.green }}>KES {fmt(amount_paid || 0)}</Text></ProDescriptions.Item>
                <ProDescriptions.Item label="Balance Due"><Text strong style={{ fontSize: 12, color: (amount_due || 0) > 0 ? C.orange : C.green }}>KES {fmt(amount_due || 0)}</Text></ProDescriptions.Item>
              </>
            )}
          </ProDescriptions>
        </div>
      </div>

      {/* Address Edit Modal */}
      <Modal
        title="Edit Customer Address"
        open={addressEditOpen}
        onCancel={() => setAddressEditOpen(false)}
        onOk={() => {
          // TODO: Implement address update functionality
          console.log('Address update:', addressForm.getFieldsValue());
          setAddressEditOpen(false);
        }}
        width={600}
      >
        <Form form={addressForm} layout="vertical">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="street" label="Street Address">
                <Input placeholder="e.g. 123 Main Street" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="city" label="City">
                <Input placeholder="e.g. Nairobi" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="county" label="County">
                <Input placeholder="e.g. Nairobi County" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="country" label="Country">
                <Input placeholder="e.g. Kenya" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="postal_code" label="Postal Code">
                <Input placeholder="e.g. 00100" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};

export default ExpandableInvoice;