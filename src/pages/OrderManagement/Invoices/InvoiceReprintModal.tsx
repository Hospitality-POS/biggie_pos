import React, { useRef, useState } from "react";
import { Button, Modal, Segmented, Spin, Typography } from "antd";
import {
  FilePdfOutlined,
  PrinterFilled,
  PrinterOutlined,
  SafetyCertificateFilled,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import { QRCodeCanvas } from "qrcode.react";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import { useMutation } from "@tanstack/react-query";
import { rePrintInvoice } from "@services/cart";

const { Text } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  red: "#ef4444",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency", currency: "KES",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(v) || 0);

type PrintMode = "thermal" | "a4";

// ── Interfaces ─────────────────────────────────────────────────────────────
interface InvoiceItem {
  _id: string;
  product_id: { name: string };
  quantity: number;
  price: number;
  createdAt: string;
  created_by: { fullname: string; username: string };
  table_id: { name: string };
}

interface InvoiceDetailsInterface {
  _id: string;
  order_no: string;
  createdAt: string;
  subtotal: number;
  total_vat_amount: number;
  grand_total: number;
  discount_amount: number;
  items: InvoiceItem[];
  table_id?: { name: string };
  served_by?: { username: string };
}

interface InvoiceReprintModalProps {
  invoiceId: string;
  orderNo: string;
  invoiceData: InvoiceDetailsInterface;
}

interface SharedPrintProps {
  invoiceData: InvoiceDetailsInterface;
  BRAND_NAME1: string;
  orderNo: string;
  EMAIL_URL?: string;
  PHONE_NO?: string;
  QR_Code?: string;
  PIN?: string;
  TILL_NO?: string;
  Paybill_bs?: string;
  Paybill_ac?: string;
}

// ─── Thermal Receipt ───────────────────────────────────────────────────────
const ThermalReceipt = React.forwardRef<HTMLDivElement, SharedPrintProps & { data: InvoiceItem[] }>(
  ({ data, invoiceData, BRAND_NAME1, orderNo, EMAIL_URL, PHONE_NO, QR_Code, PIN, TILL_NO, Paybill_bs, Paybill_ac }, ref) => {
    if (!data || data.length === 0) return <div ref={ref} />;

    const storedTenant = localStorage.getItem("tenant");
    const isElectronics = (() => { try { return JSON.parse(storedTenant || "{}").business_type?.name === "Electronics"; } catch { return false; } })();

    const grandTotal = invoiceData?.grand_total || (invoiceData?.subtotal || 0) + (invoiceData?.total_vat_amount || 0);

    const mono: React.CSSProperties = { fontFamily: "monospace", color: C.darkText };
    const bold: React.CSSProperties = { ...mono, fontWeight: 800 };
    const hdr: React.CSSProperties = { ...bold, fontSize: "1.3em" };
    const sub: React.CSSProperties = { ...bold, fontSize: "0.85em" };
    const nor: React.CSSProperties = { ...mono, fontSize: "0.85em", fontWeight: 700 };

    return (
      <div id="receipt-thermal" ref={ref} style={{ color: C.darkText, maxWidth: 320, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 12 }}>
          <span style={hdr}>{BRAND_NAME1 || ""}</span>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={sub}>Phone: {PHONE_NO || "N/A"}</span>
            <span style={sub}>{TILL_NO ? `Till: ${TILL_NO}` : Paybill_bs ? `BizNo: ${Paybill_bs}` : "N/A"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={nor}>{Paybill_ac ? `Acc: ${Paybill_ac}` : "N/A"}</span>
            <span style={nor}>{PIN ? `PIN: ${PIN}` : "N/A"}</span>
          </div>

          <div style={{ borderTop: "1px dashed #999", margin: "6px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={sub}>Invoice Reprint</span>
            <span style={sub}>#{orderNo?.toUpperCase() || "N/A"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={nor}>Table: {invoiceData?.table_id?.name || "N/A"}</span>
            <span style={nor}>{invoiceData?.createdAt ? dayjs(invoiceData.createdAt).format("MMM DD YYYY H:mm") : "N/A"}</span>
          </div>
          <span style={nor}>Served By: {invoiceData.served_by?.username || "N/A"}</span>
        </div>

        {/* Items */}
        <div style={{ borderTop: "1px dashed #999", borderBottom: "1px dashed #999", padding: "6px 0", marginBottom: 8 }}>
          {/* Column headers */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ ...bold, width: "8%" }}>QTY</span>
            <span style={{ ...bold, flex: 1, paddingLeft: 4 }}>ITEM</span>
            <span style={{ ...bold, width: "20%", textAlign: "right" }}>PRICE</span>
            <span style={{ ...bold, width: "22%", textAlign: "right" }}>TOTAL</span>
          </div>
          {invoiceData.items.map((item) => (
            <div key={item._id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ ...nor, width: "8%" }}>{item.quantity || 0}</span>
              <span style={{ ...nor, flex: 1, paddingLeft: 4, wordBreak: "break-word" }}>{item.product_id?.name || "N/A"}</span>
              <span style={{ ...nor, width: "20%", textAlign: "right" }}>{(item.price || 0).toFixed(2)}</span>
              <span style={{ ...nor, width: "22%", textAlign: "right" }}>{((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={sub}>Subtotal:</span>
            <span style={sub}>Ksh. {(invoiceData?.subtotal || 0).toLocaleString()}</span>
          </div>
          {(invoiceData?.discount_amount || 0) > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={nor}>Discount:</span>
              <span style={nor}>- Ksh. {(invoiceData.discount_amount || 0).toLocaleString()}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={nor}>VAT:</span>
            <span style={nor}>Ksh. {(invoiceData?.total_vat_amount || 0).toLocaleString()}</span>
          </div>
          <div style={{ borderTop: "1px dashed #999", margin: "4px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={hdr}>AMOUNT DUE:</span>
            <span style={hdr}>Ksh. {grandTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Warranty — Electronics only */}
        {isElectronics && (
          <div style={{
            border: "2px solid #000", padding: "8px", margin: "10px 0",
            textAlign: "center", background: "#f9f9f9",
          }}>
            <span style={{ ...bold, fontSize: "1em" }}>
              <SafetyCertificateFilled /> WARRANTY: 6 MONTHS <SafetyCertificateFilled />
            </span>
            <div style={{ ...nor, textAlign: "center", marginTop: 4 }}>
              This receipt serves as your warranty certificate. Retain for warranty claims.
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 12, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ ...nor, letterSpacing: 2 }}>===========================</span>
          {QR_Code && (
            <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>
              <QRCodeCanvas value={QR_Code} size={90} />
            </div>
          )}
          <span style={{ ...sub, textAlign: "center" }}>Thank you for your business!</span>
          {EMAIL_URL && <span style={{ ...nor, textAlign: "center" }}>Email: {EMAIL_URL}</span>}
          <span style={{ ...nor, textAlign: "center" }}>Generated on {new Date().toLocaleDateString()}</span>
          <span style={{ ...nor, textAlign: "center" }}>Powered By: {COOP_NAME || ""}</span>
        </div>

        {/* Thermal print styles */}
        <style>{`
          @media print {
            #receipt-thermal { max-width: 80mm !important; }
            @page { size: 80mm auto; margin: 4mm; }
            * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important; color: black !important; font-weight: bold !important; }
          }
        `}</style>
      </div>
    );
  }
);

// ─── A4 PDF Content ────────────────────────────────────────────────────────
const A4Report = React.forwardRef<HTMLDivElement, SharedPrintProps>(
  ({ invoiceData, BRAND_NAME1, orderNo, EMAIL_URL, PHONE_NO, QR_Code, PIN, TILL_NO, Paybill_bs, Paybill_ac }, ref) => {
    const storedTenant = localStorage.getItem("tenant");
    const isElectronics = (() => { try { return JSON.parse(storedTenant || "{}").business_type?.name === "Electronics"; } catch { return false; } })();

    const grandTotal = invoiceData?.grand_total || (invoiceData?.subtotal || 0) + (invoiceData?.total_vat_amount || 0);

    const base: React.CSSProperties = { fontFamily: "'Segoe UI', Roboto, sans-serif", color: "#333" };
    const th: React.CSSProperties = {
      padding: "10px 12px", fontWeight: 700, fontSize: 13, color: "#1a1a1a",
      background: "#f5f5f5", borderBottom: "2px solid #ddd", textAlign: "left",
    };
    const td: React.CSSProperties = {
      padding: "9px 12px", fontSize: 13, color: "#333", borderBottom: "1px solid #eee",
    };

    return (
      <div id="receipt-a4" ref={ref} style={{
        ...base, background: "#fff", padding: 40, maxWidth: 860,
        margin: "0 auto", boxShadow: "0 0 10px rgba(0,0,0,0.1)",
      }}>
        {/* Cover band */}
        <div style={{
          background: C.primary, color: "#fff", margin: "-40px -40px 32px",
          padding: "22px 40px", display: "flex", justifyContent: "space-between", alignItems: "center",
          printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
        } as React.CSSProperties}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>{BRAND_NAME1}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Powered by: {COOP_NAME}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <span style={{
              background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: 6, padding: "4px 14px", fontWeight: 700, fontSize: 14, letterSpacing: 1,
            }}>
              INVOICE REPRINT
            </span>
            {QR_Code && <QRCodeCanvas value={QR_Code} size={72} />}
          </div>
        </div>

        {/* Two-column meta */}
        <div style={{ display: "flex", gap: 32, marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: 8 }}>
              Business Details
            </div>
            {[
              ["Phone", PHONE_NO],
              TILL_NO ? ["Till No", TILL_NO] : null,
              Paybill_bs ? ["Business No", Paybill_bs] : null,
              Paybill_ac ? ["Account No", Paybill_ac] : null,
              PIN ? ["PIN", PIN] : null,
              EMAIL_URL ? ["Email", EMAIL_URL] : null,
            ].filter(Boolean).map(([label, value]: any) => (
              <div key={label} style={{ fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: C.subText }}>{label}: </span>
                <span style={{ fontWeight: 600 }}>{value || "N/A"}</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700, marginBottom: 8 }}>
              Invoice Details
            </div>
            {[
              ["Order No", orderNo?.toUpperCase()],
              ["Table", invoiceData?.table_id?.name],
              ["Date", invoiceData?.createdAt ? dayjs(invoiceData.createdAt).format("MMM DD, YYYY h:mm A") : null],
              ["Served By", invoiceData.served_by?.username],
            ].map(([label, value]) => (
              <div key={label} style={{ fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: C.subText }}>{label}: </span>
                <span style={{ fontWeight: 600 }}>{value || "N/A"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Items table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: "8%", textAlign: "center" }}>QTY</th>
              <th style={th}>ITEM</th>
              <th style={{ ...th, textAlign: "right" }}>UNIT PRICE</th>
              <th style={{ ...th, textAlign: "right" }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items.map((item, i) => (
              <tr key={item._id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ ...td, textAlign: "center" }}>{item.quantity || 0}</td>
                <td style={{ ...td, fontWeight: 600 }}>{item.product_id?.name || "N/A"}</td>
                <td style={{ ...td, textAlign: "right" }}>{fmt(item.price || 0)}</td>
                <td style={{ ...td, textAlign: "right" }}>{fmt((item.price || 0) * (item.quantity || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{
          marginLeft: "auto", maxWidth: 340,
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "14px 18px", marginBottom: 24,
        }}>
          {[
            { label: "Subtotal", value: fmt(invoiceData?.subtotal || 0), color: "#333" },
            ...(invoiceData?.discount_amount > 0 ? [{ label: "Discount", value: `- ${fmt(invoiceData.discount_amount)}`, color: "#d32f2f" }] : []),
            { label: "VAT", value: fmt(invoiceData?.total_vat_amount || 0), color: "#333" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: C.subText }}>{label}</span>
              <span style={{ fontWeight: 600, color }}>{value}</span>
            </div>
          ))}
          <div style={{ borderTop: `2px solid ${C.border}`, margin: "10px 0 6px" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: C.darkText }}>Amount Due</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: C.primary }}>{fmt(grandTotal)}</span>
          </div>
        </div>

        {/* Warranty — Electronics only */}
        {isElectronics && (
          <div style={{
            border: "3px solid #000", borderRadius: 8, padding: "14px 20px",
            textAlign: "center", background: "#fff9e6", marginBottom: 24,
            printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
          } as React.CSSProperties}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              <SafetyCertificateFilled style={{ marginRight: 8 }} />
              WARRANTY: 6 MONTHS
              <SafetyCertificateFilled style={{ marginLeft: 8 }} />
            </div>
            <div style={{ fontSize: 13, marginTop: 6, color: "#555" }}>
              This receipt serves as your warranty certificate. Please retain for warranty claims.
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: `2px solid ${C.border}`, paddingTop: 20, textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Thank you for your business!</div>
          <div style={{ fontSize: 12, color: C.subText }}>Generated on {new Date().toLocaleDateString()}</div>
        </div>

        {/* A4 print styles */}
        <style>{`
          @media print {
            #receipt-a4 { box-shadow: none !important; }
            @page { size: A4 portrait; margin: 16mm; }
            * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}</style>
      </div>
    );
  }
);

// ─── Main Modal ────────────────────────────────────────────────────────────
function InvoiceReprintModal({ invoiceId, orderNo, invoiceData }: InvoiceReprintModalProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PrintMode>("thermal");
  const [data, setData] = useState<InvoiceItem[] | null>(null);

  const thermalRef = useRef<HTMLDivElement>(null);
  const a4Ref = useRef<HTMLDivElement>(null);

  const {
    BRAND_NAME1, EMAIL_URL, PIN, PHONE_NO, QR_Code,
    Paybill_bs, Paybill_ac, TILL_NO,
  } = useSystemDetails();

  const reprintMutation = useMutation(rePrintInvoice, {
    onSuccess: (res) => setData(res),
  });

  const printThermal = useReactToPrint({
    content: () => thermalRef.current,
    pageStyle: `@page { size: 80mm auto; margin: 4mm; } @media print { * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color: black !important; font-weight: bold !important; } }`,
  });

  const printA4 = useReactToPrint({
    content: () => a4Ref.current,
    pageStyle: `@page { size: A4 portrait; margin: 16mm; } @media print { * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }`,
  });

  const handleOpen = () => {
    setOpen(true);
    setData(null);
    setMode("thermal");
    reprintMutation.mutate(invoiceId);
  };

  const handlePrint = () => {
    if (mode === "thermal") printThermal();
    else printA4();
  };

  const canPrint = data && data.length > 0;

  const sharedProps: SharedPrintProps = {
    invoiceData, BRAND_NAME1, orderNo,
    EMAIL_URL, PHONE_NO, QR_Code, PIN, TILL_NO, Paybill_bs, Paybill_ac,
  };

  return (
    <>
      <Button
        type="primary" size="small" icon={<PrinterOutlined />}
        onClick={handleOpen}
        style={{ background: C.primary, borderColor: C.primary, borderRadius: 6 }}
      >
        Reprint
      </Button>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        destroyOnClose
        style={{ top: 16 }}
        width={mode === "a4" ? 960 : 560}
        styles={{ body: { maxHeight: "calc(100vh - 160px)", overflowY: "auto", padding: "16px 20px" } }}
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                background: C.primaryLight, borderRadius: 7,
                padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1,
              }}>
                <PrinterOutlined />
              </div>
              <Text strong style={{ fontSize: 14, color: C.darkText }}>
                Reprint Invoice — {orderNo}
              </Text>
            </div>
            {/* Mode toggle in title bar */}
            <Segmented
              size="small"
              value={mode}
              onChange={(v) => setMode(v as PrintMode)}
              options={[
                { label: <span><PrinterOutlined style={{ marginRight: 4 }} />Thermal</span>, value: "thermal" },
                { label: <span><FilePdfOutlined style={{ marginRight: 4 }} />A4 PDF</span>, value: "a4" },
              ]}
            />
          </div>
        }
        footer={[
          <Button key="cancel" onClick={() => setOpen(false)} style={{ borderRadius: 8 }}>
            Close
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={mode === "a4" ? <FilePdfOutlined /> : <PrinterFilled />}
            disabled={reprintMutation.isLoading || !canPrint}
            onClick={handlePrint}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}
          >
            {mode === "a4" ? "Save as PDF" : "Print Receipt"}
          </Button>,
        ]}
      >
        <Spin spinning={reprintMutation.isLoading} tip="Loading invoice data…">
          {data === null ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.subText }}>Loading invoice data…</div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.subText }}>No invoice data found.</div>
          ) : (
            <>
              {/* Both rendered, display toggled — same pattern as other print modals */}
              <div style={{ display: mode === "thermal" ? "block" : "none" }}>
                <ThermalReceipt ref={thermalRef} data={data} {...sharedProps} />
              </div>
              <div style={{ display: mode === "a4" ? "block" : "none" }}>
                <A4Report ref={a4Ref} {...sharedProps} />
              </div>
            </>
          )}
        </Spin>
      </Modal>
    </>
  );
}

export default InvoiceReprintModal;