import React, { useRef, useState } from "react";
import { Alert, Button, Modal, Spin, Typography, Tooltip } from "antd";
import {
  BankOutlined,
  CheckCircleOutlined,
  FilePdfOutlined,
  PrinterFilled,
  PrinterOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import { useQuery } from "@tanstack/react-query";
import useSystemDetails from "@hooks/useSystemDetails";
import { getAllInvoices } from "@services/cart";
import { getNotesByInvoice } from "@services/accounting/notes";
import {
  TEMPLATES,
  TemplateId,
  InvoiceForPrint,
  SystemDetails,
} from "./InvoiceTemplates";
import { usePrimaryColor } from "../../../context/PrimaryColorContext";

const { Text } = Typography;

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Props ──────────────────────────────────────────────────────────────────
interface InvoiceReprintModalProps {
  /** The invoice record already loaded in the parent table row */
  invoiceData: InvoiceForPrint;
  invoiceId: string;
  orderNo: string;
  /** Optional: show the "Reprint" trigger button; default true */
  showTrigger?: boolean;
}

// ── Template thumbnail ─────────────────────────────────────────────────────
const TemplateThumbnail: React.FC<{
  tpl: (typeof TEMPLATES)[number];
  selected: boolean;
  onSelect: () => void;
}> = ({ tpl, selected, onSelect }) => {
  const primaryColor = usePrimaryColor();
  
  return (
  <button
    onClick={onSelect}
    style={{
      flex: "0 0 110px",
      cursor: "pointer",
      border: selected ? `2.5px solid ${primaryColor}` : `1.5px solid ${C.border}`,
      borderRadius: 10,
      overflow: "hidden",
      background: "#fff",
      padding: 0,
      transition: "border-color 0.15s, transform 0.12s",
      transform: selected ? "scale(1.04)" : "scale(1)",
      boxShadow: selected ? `0 0 0 3px ${primaryColor}20` : "none",
      position: "relative",
    }}
  >
    {/* Colour swatch */}
    <div
      style={{
        height: 72,
        background: tpl.id === 1 ? primaryColor : tpl.thumbBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div style={{ width: "70%", opacity: 0.38 }}>
        <div style={{ height: 3, background: tpl.thumbAccent, borderRadius: 2, marginBottom: 5 }} />
        <div style={{ height: 2, background: tpl.thumbAccent, borderRadius: 2, marginBottom: 3, width: "80%" }} />
        <div style={{ height: 2, background: tpl.thumbAccent, borderRadius: 2, marginBottom: 3, width: "60%" }} />
        <div style={{ height: 2, background: tpl.thumbAccent, borderRadius: 2, width: "90%" }} />
      </div>
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 5,
            right: 6,
            background: primaryColor,
            borderRadius: "50%",
            width: 18,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CheckCircleOutlined style={{ color: "#fff", fontSize: 11 }} />
        </div>
      )}
    </div>
    {/* Label */}
    <div style={{ padding: "6px 8px", borderTop: `1px solid ${C.border}`, textAlign: "left" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: selected ? 700 : 500,
          color: selected ? primaryColor : C.darkText,
          marginBottom: 1,
        }}
      >
        {tpl.name}
      </div>
    </div>
  </button>
);
};

// ── Main component ─────────────────────────────────────────────────────────
const InvoiceReprintModal: React.FC<InvoiceReprintModalProps> = ({
  invoiceData,
  invoiceId,
  orderNo,
  showTrigger = true,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(1);

  // One ref per template — we always render all five (hidden) so printing is instant
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const ref3 = useRef<HTMLDivElement>(null);
  const ref4 = useRef<HTMLDivElement>(null);
  const ref5 = useRef<HTMLDivElement>(null);
  const allRefs: Record<TemplateId, React.RefObject<HTMLDivElement>> = {
    1: ref1, 2: ref2, 3: ref3, 4: ref4, 5: ref5,
  };

  const sys: SystemDetails = useSystemDetails();

  // Re-fetch the invoice to get fully populated payment data (payments[], items[], etc.)
  const { data: freshInvoice, isLoading } = useQuery<InvoiceForPrint>({
    queryKey: ["invoice-for-print", invoiceId],
    queryFn: async () => {
      const res = await getAllInvoices({ invoice_id: invoiceId, limit: 1 });
      const found = Array.isArray(res) ? res[0] : res?.data?.[0];
      return found ?? invoiceData;
    },
    enabled: open && !!invoiceId,
    staleTime: 30_000,
    placeholderData: invoiceData,
  });

  // Fetch credit notes for the invoice
  const { data: notesData } = useQuery({
    queryKey: ["notes-by-invoice", invoiceId],
    queryFn: () => getNotesByInvoice(invoiceId, localStorage.getItem("shopId") || ""),
    enabled: open && !!invoiceId,
    staleTime: 30_000,
  });

  const inv: InvoiceForPrint = freshInvoice ? {
    ...freshInvoice,
    credit_notes: notesData?.notes || [],
  } : invoiceData;

  const PAGE_STYLE = `
    @page { size: A4 portrait; margin: 12mm; }
    @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  `;

  const print1 = useReactToPrint({ content: () => ref1.current, documentTitle: `Invoice-${orderNo}`, pageStyle: PAGE_STYLE });
  const print2 = useReactToPrint({ content: () => ref2.current, documentTitle: `Invoice-${orderNo}`, pageStyle: PAGE_STYLE });
  const print3 = useReactToPrint({ content: () => ref3.current, documentTitle: `Invoice-${orderNo}`, pageStyle: PAGE_STYLE });
  const print4 = useReactToPrint({ content: () => ref4.current, documentTitle: `Invoice-${orderNo}`, pageStyle: PAGE_STYLE });
  const print5 = useReactToPrint({ content: () => ref5.current, documentTitle: `Invoice-${orderNo}`, pageStyle: PAGE_STYLE });

  const printMap: Record<TemplateId, () => void> = {
    1: print1, 2: print2, 3: print3, 4: print4, 5: print5,
  };

  const handlePrint = () => printMap[selectedTemplate]();

  return (
    <>
      {showTrigger && (
        <Tooltip title="Print / Save Invoice PDF">
          <Button
            type="primary"
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => setOpen(true)}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 6 }}
          >
            Reprint
          </Button>
        </Tooltip>
      )}

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        destroyOnClose={false}
        style={{ top: 12 }}
        width={1000}
        styles={{
          body: { padding: 0, maxHeight: "calc(100vh - 140px)", overflowY: "auto" },
        }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 32 }}>
            <div
              style={{
                background: C.primaryLight,
                borderRadius: 7,
                padding: "4px 6px",
                color: C.primary,
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              <PrinterOutlined />
            </div>
            <Text strong style={{ fontSize: 14, color: C.darkText }}>
              Print Invoice — {orderNo}
            </Text>
            {inv.status && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  color: C.subText,
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  padding: "1px 8px",
                }}
              >
                {inv.status}
              </span>
            )}
          </div>
        }
        footer={[
          <Button key="cancel" onClick={() => setOpen(false)} style={{ borderRadius: 8 }}>
            Close
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterFilled />}
            onClick={handlePrint}
            disabled={isLoading}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8 }}
          >
            Print / Save PDF
          </Button>,
        ]}
      >
        <Spin spinning={isLoading} tip="Loading invoice data…">
          {/* ── Template picker ── */}
          <div style={{ padding: "16px 20px 0" }}>
            <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.subText,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  display: "block",
                  marginBottom: 10,
                }}
              >
                Choose a print template
              </Text>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {TEMPLATES.map((tpl) => (
                  <TemplateThumbnail
                    key={tpl.id}
                    tpl={tpl}
                    selected={selectedTemplate === tpl.id}
                    onSelect={() => setSelectedTemplate(tpl.id as TemplateId)}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: C.subText }}>
                Preview —{" "}
                <strong style={{ color: C.darkText }}>
                  {TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
                </strong>
              </Text>
              <Text style={{ fontSize: 11, color: C.subText }}>
                Scroll inside the preview · Click "Print / Save PDF" when ready
              </Text>
            </div>
          </div>

          {/* ── Missing bank details notice ── */}
          {(!sys.bank_details || sys.bank_details.filter(Boolean).length === 0) && !sys.Paybill_bs && !sys.Paybill_ac && (
            <div style={{ padding: "0 20px 12px" }}>
              <Alert
                type="warning"
                showIcon
                icon={<BankOutlined />}
                message="No bank / payment details configured"
                description="Bank details won't appear on this invoice. Add them in System Setup so customers know how to pay."
                action={
                  <Button
                    size="small"
                    type="primary"
                    icon={<BankOutlined />}
                    onClick={() => {
                      window.open("/system-setup?tab=bank-details", "_blank");
                    }}
                    style={{ borderRadius: 6 }}
                  >
                    Add Bank Details
                  </Button>
                }
              />
            </div>
          )}

          {/* ── Preview panel ── */}
          <div style={{ padding: "0 20px 20px" }}>
            <div
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                maxHeight: 560,
                overflowY: "auto",
              }}
            >
              {([1, 2, 3, 4, 5] as TemplateId[]).map((id) => {
                const Tpl = TEMPLATES[id - 1].component;
                return (
                  <div key={id} style={{ display: id === selectedTemplate ? "block" : "none" }}>
                    <Tpl ref={allRefs[id]} inv={inv} sys={sys} />
                  </div>
                );
              })}
            </div>
          </div>
        </Spin>
      </Modal>
    </>
  );
};

export default InvoiceReprintModal;