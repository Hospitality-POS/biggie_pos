import { useEffect, useState } from "react";
import { ProDescriptions } from "@ant-design/pro-components";
import { Typography } from "antd";

const { Text } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  green: "#10b981",
  blue: "#3b82f6",
  orange: "#f59e0b",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

const fmt = (v: number) =>
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Mobile hook ────────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

// ── Types ──────────────────────────────────────────────────────────────────
interface ProductRef { _id: string; name: string; price: number }
interface UserRef { _id: string; username: string }
interface VATDetail { rate: number; amount: number; net: number }
interface InvoiceItem { _id: string; product_id?: ProductRef; quantity: number; price: number; vat_amount: number }

export interface InvoiceDetailsInterface {
  _id: string;
  order_no: string;
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
}

// ── Shared sub-components ──────────────────────────────────────────────────
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

// ── Mobile layout ──────────────────────────────────────────────────────────
const MobileView = ({ record }: { record: InvoiceDetailsInterface }) => {
  const {
    items, served_by, created_by, subtotal,
    total_vat_amount, vat_breakdown, discount_amount,
    vat_pricing_mode, grand_total, order_no, createdAt,
  } = record;

  const vatBreakdownItems = vat_breakdown
    ? Object.entries(vat_breakdown).map(([type, d]) => ({
      label: `VAT (${type})`,
      value: `KES ${d?.amount?.toFixed(2) || "0.00"} (${((d?.rate || 0) * 100).toFixed(0)}%)`,
    }))
    : [];

  const section = (content: React.ReactNode) => (
    <div style={{
      background: "#fff", border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "12px 14px", marginBottom: 10,
    }}>
      {content}
    </div>
  );

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Order meta */}
      {section(
        <>
          <SectionLabel>Order Details</SectionLabel>
          <MetaRow label="Invoice No.">
            <Text strong style={{ fontSize: 12 }}>{order_no}</Text>
          </MetaRow>
          <MetaRow label="Date">
            <Text style={{ fontSize: 12, color: C.subText }}>{new Date(createdAt).toLocaleString()}</Text>
          </MetaRow>
          <MetaRow label="Served By">
            <Text style={{ fontSize: 12 }}>{served_by?.username || "N/A"}</Text>
          </MetaRow>
          <MetaRow label="Created By">
            <Text style={{ fontSize: 12 }}>{created_by?.username || "N/A"}</Text>
          </MetaRow>
          {vat_pricing_mode && (
            <MetaRow label="Pricing Mode">
              <Text style={{ fontSize: 12 }}>{vat_pricing_mode}</Text>
            </MetaRow>
          )}
        </>,
      )}

      {/* Items */}
      {section(
        <>
          <SectionLabel>Items ({items.length})</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((item) => <ItemRow key={item._id} item={item} />)}
          </div>
        </>,
      )}

      {/* Totals */}
      {section(
        <>
          <SectionLabel>Summary</SectionLabel>
          <MetaRow label="Subtotal">
            <Text strong style={{ fontSize: 12 }}>KES {fmt(subtotal)}</Text>
          </MetaRow>
          {vatBreakdownItems.map((item, i) => (
            <MetaRow key={i} label={item.label}>
              <Text style={{ fontSize: 12 }}>{item.value}</Text>
            </MetaRow>
          ))}
          {total_vat_amount > 0 && (
            <MetaRow label="Total VAT">
              <span style={{
                background: "#eff6ff", color: C.blue, border: "1px solid #bfdbfe",
                borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700,
              }}>
                KES {fmt(total_vat_amount)}
              </span>
            </MetaRow>
          )}
          {discount_amount > 0 && (
            <MetaRow label="Discount">
              <span style={{
                background: "#fffbeb", color: C.orange, border: "1px solid #fde68a",
                borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700,
              }}>
                −KES {fmt(discount_amount)}
              </span>
            </MetaRow>
          )}
          {/* Grand total — no border-bottom, stands alone */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
            <Text style={{ fontSize: 12, color: C.subText }}>Grand Total</Text>
            <Text strong style={{ fontSize: 15, color: C.primary }}>KES {fmt(grand_total)}</Text>
          </div>
        </>,
      )}
    </div>
  );
};

// ── Desktop layout (ProDescriptions) ──────────────────────────────────────
const DesktopView = ({ record }: { record: InvoiceDetailsInterface }) => {
  const {
    items, served_by, created_by, subtotal,
    total_vat_amount, vat_breakdown, discount_amount,
    vat_pricing_mode, grand_total, order_no, createdAt,
  } = record;

  const vatBreakdownItems = vat_breakdown
    ? Object.entries(vat_breakdown).map(([type, d]) => ({
      label: `VAT (${type})`,
      value: `KES ${d?.amount?.toFixed(2) || "0.00"} (${((d?.rate || 0) * 100).toFixed(0)}%)`,
    }))
    : [];

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

          {vatBreakdownItems.map((item, i) => (
            <ProDescriptions.Item key={i} label={item.label}>
              <Text style={{ fontSize: 12 }}>{item.value}</Text>
            </ProDescriptions.Item>
          ))}

          {total_vat_amount > 0 && (
            <ProDescriptions.Item label="Total VAT" span={2}>
              <span style={{
                background: "#eff6ff", color: C.blue, border: "1px solid #bfdbfe",
                borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700,
              }}>
                KES {fmt(total_vat_amount)}
              </span>
            </ProDescriptions.Item>
          )}

          {discount_amount > 0 && (
            <ProDescriptions.Item label="Discount" span={2}>
              <span style={{
                background: "#fffbeb", color: C.orange, border: "1px solid #fde68a",
                borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700,
              }}>
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

// ── Main ───────────────────────────────────────────────────────────────────
const ExpandableInvoice = ({ record }: { record: InvoiceDetailsInterface }) => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileView record={record} /> : <DesktopView record={record} />;
};

export default ExpandableInvoice;