import React, { useRef, useState, useCallback, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Box,
  Typography,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from "@mui/material";
import "./bill.css";
import { useReactToPrint } from "react-to-print";
import useSystemDetails from "@hooks/useSystemDetails";
import {
  PrinterFilled,
  PrinterOutlined,
  RestOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  DollarOutlined,
  ReconciliationOutlined,
  UserOutlined,
  MailOutlined,
  PlusOutlined,
  SendOutlined,
  LockOutlined,
  WarningOutlined,
  FontColorsOutlined,
  PercentageOutlined,
  IdcardOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  Modal,
  Switch,
  Space,
  Select,
  Tag,
  Alert,
  message,
  Tooltip,
  Segmented,
  Slider as AntSlider,
} from "antd";
import { ModalForm } from "@ant-design/pro-form";
import { useAppSelector } from "src/store";
import { sendEmail, refToHtmlString } from "@services/emailReports";
import {
  usePrintDocument,
  type DocumentType,
  type PrintFormat,
  type PrintStatusResult,
  type SavePrintResult,
} from "../MODALS/Hooks/usePrintDocument";

// ── Props ──────────────────────────────────────────────────────────────────
interface PrintBillProps {
  cartDetails: any;
  data: any;
}

interface SendEmailValues {
  to: string;
  recipientName?: string;
  cc?: string;
  intro?: string;
}

const C = { primary: "#6c1c2c", subText: "#64748b" };

// ── Sub-modals ─────────────────────────────────────────────────────────────
const SendEmailModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSend: (values: SendEmailValues) => Promise<void>;
  sending: boolean;
  docLabel: string;
}> = ({ open, onClose, onSend, sending, docLabel }) => {
  const [form] = Form.useForm();
  const handleOk = async () => {
    const values = await form.validateFields();
    await onSend(values);
    form.resetFields();
  };
  return (
    <Modal
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={handleOk}
      confirmLoading={sending}
      okText={<Space><SendOutlined />Send {docLabel}</Space>}
      okButtonProps={{ style: { background: C.primary, borderColor: C.primary } }}
      title={<Space><MailOutlined style={{ color: C.primary }} /><span>Send {docLabel} via Email</span></Space>}
      width={480}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item name="to" label="Recipient Email"
          rules={[
            { required: true, message: "Recipient email is required" },
            { type: "email", message: "Enter a valid email address" },
          ]}>
          <Input prefix={<MailOutlined style={{ color: C.subText }} />} placeholder="customer@email.com" />
        </Form.Item>
        <Form.Item name="recipientName" label="Recipient Name">
          <Input prefix={<UserOutlined style={{ color: C.subText }} />} placeholder="e.g. John Kamau" />
        </Form.Item>
        <Form.Item name="cc" label="CC (optional)" extra="Separate multiple addresses with commas">
          <Input prefix={<PlusOutlined style={{ color: C.subText }} />} placeholder="accounts@company.com" />
        </Form.Item>
        <Form.Item name="intro" label="Personal Message (optional)">
          <Input.TextArea rows={3} placeholder="Please find your document attached." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const ReprintReasonModal: React.FC<{
  open: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}> = ({ open, onConfirm, onCancel }) => {
  const [form] = Form.useForm();
  return (
    <Modal
      open={open}
      onOk={async () => {
        const { reason } = await form.validateFields();
        form.resetFields();
        onConfirm(reason);
      }}
      onCancel={() => { form.resetFields(); onCancel(); }}
      okText="Confirm Reprint"
      okButtonProps={{ style: { background: C.primary, borderColor: C.primary } }}
      title={<Space><WarningOutlined style={{ color: "#f59e0b" }} />Reprint Reason Required</Space>}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item name="reason" label="Reason for reprint"
          rules={[{ required: true, message: "Please enter a reason" }]}>
          <Input.TextArea rows={3} placeholder="e.g. Customer lost original receipt" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ── attemptSave ────────────────────────────────────────────────────────────
async function attemptSave(
  recordPrint: (...args: any[]) => Promise<SavePrintResult | null>,
  opts: { print_format: PrintFormat; reason?: string }
): Promise<{ saved: boolean; blocked: boolean }> {
  try {
    const result = await recordPrint(opts);
    if (result) return { saved: true, blocked: false };
    return { saved: false, blocked: true };
  } catch {
    return { saved: false, blocked: false };
  }
}

// ── Receipt styles helper — supports font size and weight ───────────────
const makeReceiptStyles = (bold: boolean, fontSize: number) => {
  const weight = bold ? 700 : 400;
  const headerWeight = bold ? 900 : 600;
  const base = { fontFamily: "'Courier New', Courier, monospace", color: "#000000" };
  const baseFontSize = `${fontSize}px`;
  const smallFontSize = `${fontSize - 1}px`;
  const smallerFontSize = `${fontSize - 1.5}px`;

  return {
    shopName: { ...base, fontSize: `${fontSize + 2}px`, fontWeight: headerWeight, letterSpacing: "0.5px" },
    docType: { ...base, fontSize: `${fontSize + 4}px`, fontWeight: headerWeight, textAlign: "center" as const, letterSpacing: "2px" },
    meta: { ...base, fontSize: smallFontSize, fontWeight: weight },
    label: { ...base, fontSize: baseFontSize, fontWeight: bold ? 700 : 500 },
    value: { ...base, fontSize: baseFontSize, fontWeight: weight },
    tblHdr: { padding: "4px 2px", fontWeight: headerWeight, fontSize: baseFontSize, color: "#000", borderBottom: "1px solid #000" },
    tblData: { padding: "3px 2px", fontWeight: weight, fontSize: smallFontSize, color: "#000" },
    total: { ...base, fontSize: `${fontSize + 2}px`, fontWeight: headerWeight },
    footer: { ...base, fontSize: smallerFontSize, fontWeight: weight, textAlign: "center" as const },
    clientHdr: { ...base, fontSize: baseFontSize, fontWeight: headerWeight, letterSpacing: "1px" },
  };
};

// ── Dividers ───────────────────────────────────────────────────────────────
const DashedLine = () => <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />;
const SolidLine = () => <div style={{ borderTop: "1px solid #000", margin: "6px 0" }} />;
const DoubleLine = () => (
  <div style={{ margin: "6px 0" }}>
    <div style={{ borderTop: "2px solid #000" }} />
    <div style={{ borderTop: "1px solid #000", marginTop: "2px" }} />
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────
const PrintSpaBillModal: React.FC<PrintBillProps> = ({ cartDetails, data }) => {
  const { subtotal, totalVatAmount, grandTotal } = useAppSelector((state) => state.cart);

  const componentRef = useRef<HTMLDivElement | null>(null);
  const [refReady, setRefReady] = useState(false);

  const printableRef = useCallback((node: HTMLDivElement | null) => {
    componentRef.current = node;
    setRefReady(!!node);
  }, []);

  const [isPdfView, setIsPdfView] = useState(false);
  const [isBold, setIsBold] = useState(true);
  const [fontSize, setFontSize] = useState(11);
  const [showDiscount, setShowDiscount] = useState(true);
  const [showVat, setShowVat] = useState(true);
  const [documentType, setDocumentType] = useState<DocumentType>("bill");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const pendingPrintRef = useRef(false);
  const [printTrigger, setPrintTrigger] = useState(0);

  const {
    BRAND_NAME1, EMAIL_URL, PIN, PHONE_NO,
    QR_Code, Paybill_bs, Paybill_ac, TILL_NO,
  } = useSystemDetails();

  const {
    canPrint, isReprint, printsRemaining,
    printStatus, statusLoading, recordPrint,
  } = usePrintDocument({
    orderNo: cartDetails?.order_no,
    documentType,
    cartDetails,
    data,
  });

  // Client info helpers with KRA PIN
  const clientName = cartDetails?.client_name ?? cartDetails?.clientName ?? null;
  const clientPhone = cartDetails?.client_phone ?? cartDetails?.clientPhone ?? null;
  const clientEmail = cartDetails?.client_email ?? cartDetails?.clientEmail ?? null;
  const clientKraPin = cartDetails?.client_kra_pin ?? cartDetails?.clientKraPin ?? cartDetails?.client_pin ?? null;
  const hasClient = !!(clientName || clientPhone || clientEmail || clientKraPin);

  const discountAmount =
    cartDetails?.discount > 0
      ? cartDetails.discount_type === "percentage"
        ? parseFloat((subtotal * (cartDetails.discount / 100)).toFixed(2))
        : cartDetails.discount
      : 0;

  // ── Display price helper ───────────────────────────────────────────────
  const getDisplayPrice = useCallback(
    (item: any): number => {
      if (showDiscount || discountAmount === 0) return item.price;
      const itemTotal = item.price * item.quantity;
      const discountRatio = discountAmount / subtotal;
      return (itemTotal * (1 - discountRatio)) / item.quantity;
    },
    [showDiscount, discountAmount, subtotal]
  );

  const triggerPrint = useReactToPrint({
    content: () => componentRef.current,
    onBeforeGetContent: () =>
      new Promise<void>((resolve, reject) => {
        if (componentRef.current) resolve();
        else reject(new Error("[react-to-print] ref is null"));
      }),
    onAfterPrint: () => setIsPrinting(false),
    onPrintError: (_loc, err) => {
      console.error("Print error:", err);
      message.error("Failed to print document");
      setIsPrinting(false);
    },
    pageStyle: isPdfView
      ? `@page { size: A4; margin: 20mm; }
         @media print { * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } body { margin: 0; padding: 0; } }`
      : `@media print {
           * {
             color-adjust: exact !important;
             -webkit-print-color-adjust: exact !important;
             print-color-adjust: exact !important;
             color: black !important;
             ${isBold ? "font-weight: bold !important;" : ""}
           }
         }`,
  });

  useEffect(() => {
    if (pendingPrintRef.current && refReady && componentRef.current) {
      pendingPrintRef.current = false;
      triggerPrint();
    }
  }, [printTrigger, refReady, triggerPrint]);

  const getDocumentTypeConfig = () => {
    switch (documentType) {
      case "receipt": return { label: "RECEIPT", color: "#52c41a", icon: <FileTextOutlined />, amountLabel: "Amount Paid" };
      case "invoice": return { label: "INVOICE", color: "#1890ff", icon: <ReconciliationOutlined />, amountLabel: "Amount Due" };
      case "quotation": return { label: "QUOTATION", color: "#fa8c16", icon: <DollarOutlined />, amountLabel: "Total Estimate" };
      default: return { label: "BILL", color: "#722ed1", icon: <FileTextOutlined />, amountLabel: "Amount Due" };
    }
  };
  const docConfig = getDocumentTypeConfig();

  const executePrint = useCallback(async (reason?: string) => {
    if (!canPrint) {
      message.error("Print limit reached. Printing is not allowed for this document.");
      return;
    }
    if (!refReady || !componentRef.current) {
      message.warning("Document is not ready yet. Please try again.");
      return;
    }
    setIsPrinting(true);
    try {
      const printFormat: PrintFormat = isPdfView ? "pdf" : "thermal";
      const { saved, blocked } = await attemptSave(recordPrint, { print_format: printFormat, reason });
      if (blocked) { setIsPrinting(false); return; }
      if (saved) {
        message.success(`${printFormat === "pdf" ? "PDF" : "Print"} ${isReprint ? "reprinted" : "printed"} and recorded successfully`);
      }
      pendingPrintRef.current = true;
      setPrintTrigger((n) => n + 1);
    } catch (err) {
      console.error("executePrint error:", err);
      message.error("Failed to process print request");
      setIsPrinting(false);
    }
  }, [canPrint, isPdfView, refReady, recordPrint, isReprint]);

  const handleFinish = async () => {
    if (!canPrint) { message.error("Print limit reached."); return false; }
    if (isReprint && printStatus?.requires_reason) { setReasonModalOpen(true); return false; }
    await executePrint();
    return true;
  };

  const handleSendEmail = async (values: SendEmailValues) => {
    setSending(true);
    try {
      const htmlTable = refToHtmlString(componentRef);
      const fmtAmt = (n: number) => `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
      const ok = await sendEmail({
        to: values.to,
        recipientName: values.recipientName ?? clientName ?? undefined,
        intro: values.intro,
        cc: values.cc,
        subject: `${docConfig.label} — ${cartDetails?.order_no ?? "Order"}`,
        bannerLabel: `${docConfig.label} — ${cartDetails?.order_no ?? ""}`,
        bannerType: "Sales",
        summary: [
          { label: "Subtotal", value: fmtAmt(subtotal), color: C.primary },
          { label: "VAT", value: fmtAmt(totalVatAmount), color: "#6366f1" },
          { label: docConfig.amountLabel, value: fmtAmt(grandTotal), color: "#10b981" },
        ],
        htmlTable,
        outro: `Thank you for your ${documentType === "quotation" ? "interest" : "business"}!`,
      });
      if (ok) setEmailModalOpen(false);
    } finally {
      setSending(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────
  const S = makeReceiptStyles(isBold, fontSize);

  const pdfBase = { fontFamily: "'Segoe UI', Roboto, sans-serif", color: "#333" };
  const pdfHdr = { ...pdfBase, fontSize: "28px", fontWeight: 700, color: "#1a1a1a" };
  const pdfSub = { ...pdfBase, fontSize: "16px", fontWeight: 600, color: "#444" };
  const pdfNorm = { ...pdfBase, fontSize: "14px", fontWeight: 400 };
  const pdfTH = { padding: "12px 8px", fontWeight: 700, fontSize: "15px", color: "#1a1a1a", backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" };
  const pdfTD = { padding: "10px 8px", fontSize: "14px", color: "#333", borderBottom: "1px solid #eee" };

  const printDate = new Date();
  const printDateStr = printDate.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
  const printTimeStr = `${String(printDate.getHours()).padStart(2, "0")}:${String(printDate.getMinutes()).padStart(2, "0")}`;

  // ── Font size presets — extended for larger options ────────────────────
  const fontSizes = [
    { value: 9, label: "Small" },
    { value: 11, label: "Normal" },
    { value: 13, label: "Large" },
    { value: 15, label: "X-Large" },
    { value: 17, label: "XX-Large" },
    { value: 20, label: "Huge" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <ModalForm
        className="receiptM"
        modalProps={{ centered: true, destroyOnClose: true, width: isPdfView ? 900 : 680 }}
        submitter={{
          render: (_, defaultDoms) => (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <Button
                icon={<MailOutlined />}
                onClick={() => setEmailModalOpen(true)}
                style={{ borderColor: C.primary, color: C.primary, borderRadius: 7 }}
                disabled={!canPrint || isPrinting}
              >
                Send via Email
              </Button>
              <Space>{defaultDoms[0]}{defaultDoms[1]}</Space>
            </div>
          ),
          submitButtonProps: {
            icon: isPdfView ? <FilePdfOutlined /> : <PrinterFilled />,
            style: { background: C.primary, borderColor: C.primary },
            disabled: !canPrint || isPrinting,
            loading: isPrinting,
          },
          searchConfig: {
            submitText: isPdfView ? "Save as PDF" : isReprint ? "Reprint Document" : "Print Document",
            resetText: "Cancel",
          },
        }}
        trigger={
          <Button type="primary" icon={canPrint ? <PrinterOutlined /> : <LockOutlined />} disabled={statusLoading}>
            {isReprint ? "Reprint Bill" : "Print Bill"}
          </Button>
        }
        onFinish={handleFinish}
      >
        {/* ── Alerts ──────────────────────────────────────────────────── */}
        {!canPrint && (
          <Alert type="error" showIcon icon={<LockOutlined />}
            message="Print limit reached"
            description={`This document has reached the maximum number of prints allowed.${isPdfView ? " PDF saving is also disabled." : ""}`}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}
        {isReprint && canPrint && printsRemaining !== null && (
          <Alert type="warning" showIcon
            message={`Reprint — ${printsRemaining} print${printsRemaining !== 1 ? "s" : ""} remaining`}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div style={{
          background: "#fafafa",
          border: "1px solid #e8e8e8",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          {/* Row 1: Document type */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
              Document Type:
            </span>
            <Select
              value={documentType}
              onChange={(v: DocumentType) => setDocumentType(v)}
              style={{ width: 170 }}
              options={[
                { label: "Bill", value: "bill" },
                { label: "Receipt", value: "receipt" },
                { label: "Invoice", value: "invoice" },
                { label: "Quotation", value: "quotation" },
              ]}
            />
            <Tag color={docConfig.color} style={{ fontSize: 13, padding: "3px 10px", borderRadius: 6, margin: 0 }}>
              {docConfig.icon}&nbsp;{docConfig.label}
            </Tag>
          </div>

          {/* Row 2: Format + Font controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            {/* Format toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PrinterOutlined style={{ fontSize: 16, color: "#6b7280" }} />
              <span style={{ fontSize: 13, color: "#374151" }}>Thermal</span>
              <Switch
                checked={isPdfView}
                onChange={setIsPdfView}
                checkedChildren="PDF"
                unCheckedChildren="POS"
                disabled={!canPrint}
                style={{ background: isPdfView ? C.primary : undefined }}
              />
              <span style={{ fontSize: 13, color: "#374151" }}>A4 PDF</span>
              <FilePdfOutlined style={{ fontSize: 16, color: "#6b7280" }} />
            </div>

            <div style={{ width: 1, height: 24, background: "#e5e7eb" }} />

            {/* Font controls — thermal only */}
            {!isPdfView && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FontColorsOutlined style={{ fontSize: 16, color: "#6b7280" }} />
                  <span style={{ fontSize: 13, color: "#374151" }}>Text Weight:</span>
                  <Segmented
                    size="small"
                    value={isBold ? "bold" : "normal"}
                    onChange={(v) => setIsBold(v === "bold")}
                    options={[
                      {
                        label: (
                          <Tooltip title="Bold — high contrast, easy to scan">
                            <span style={{ fontWeight: 700, fontSize: 13 }}>Bold</span>
                          </Tooltip>
                        ),
                        value: "bold",
                      },
                      {
                        label: (
                          <Tooltip title="Normal — cleaner, lighter look">
                            <span style={{ fontWeight: 400, fontSize: 13 }}>Normal</span>
                          </Tooltip>
                        ),
                        value: "normal",
                      },
                    ]}
                  />
                </div>

                <div style={{ width: 1, height: 24, background: "#e5e7eb" }} />

                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <Tooltip title="Decrease Font Size">
                    <ZoomOutOutlined style={{ fontSize: 16, color: "#6b7280" }} />
                  </Tooltip>
                  <AntSlider
                    min={8}
                    max={20}
                    value={fontSize}
                    onChange={setFontSize}
                    style={{ width: 130, margin: 0 }}
                    tooltip={{ formatter: (v) => `${v}px` }}
                    marks={{
                      8: "",
                      11: "",
                      13: "",
                      15: "",
                      17: "",
                      20: "",
                    }}
                  />
                  <Tooltip title="Increase Font Size">
                    <ZoomInOutlined style={{ fontSize: 16, color: "#6b7280" }} />
                  </Tooltip>
                  <span style={{ fontSize: 12, color: "#6b7280", minWidth: 45 }}>
                    {fontSize}px
                  </span>
                  <Select
                    value={fontSize}
                    onChange={setFontSize}
                    size="small"
                    style={{ width: 110 }}
                    options={fontSizes.map((fs) => ({ label: fs.label, value: fs.value }))}
                  />
                </div>
              </>
            )}
          </div>

          {/* Row 3: Show/hide Discount & VAT */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
              Show on Print:
            </span>

            <Tooltip title={discountAmount > 0 ? "Toggle discount line on printed document" : "No discount applied to this order"}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <PercentageOutlined style={{ fontSize: 15, color: showDiscount ? "#6c1c2c" : "#9ca3af" }} />
                <span style={{ fontSize: 13, color: "#374151" }}>Discount</span>
                <Switch
                  size="small"
                  checked={showDiscount}
                  onChange={setShowDiscount}
                  disabled={discountAmount === 0}
                  style={{ background: showDiscount && discountAmount > 0 ? C.primary : undefined }}
                />
              </div>
            </Tooltip>

            <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />

            <Tooltip title="Toggle VAT line on printed document">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <DollarOutlined style={{ fontSize: 15, color: showVat ? "#6c1c2c" : "#9ca3af" }} />
                <span style={{ fontSize: 13, color: "#374151" }}>VAT</span>
                <Switch
                  size="small"
                  checked={showVat}
                  onChange={setShowVat}
                  style={{ background: showVat ? C.primary : undefined }}
                />
              </div>
            </Tooltip>
          </div>
        </div>

        {/* ── THERMAL RECEIPT ─────────────────────────────────────────── */}
        <div
          ref={!isPdfView ? printableRef : undefined}
          className="receipt"
          id="receipt"
          style={{ color: "#000000", display: isPdfView ? "none" : "block" }}
        >
          {/* Header — centred */}
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <div style={S.shopName}>{BRAND_NAME1}</div>
            <div style={S.docType}>{docConfig.label}</div>
            <SolidLine />
            <div style={S.meta}>Tel: {PHONE_NO}</div>
            {/* ── Always show payment details if Paybill or Till No exists ── */}
            {Paybill_bs && (
              <div style={S.meta}>
                Paybill: {Paybill_bs}{Paybill_ac ? `  Acc: ${Paybill_ac}` : ""}
              </div>
            )}
            {TILL_NO && (
              <div style={S.meta}>Till No: {TILL_NO}</div>
            )}
          </div>

          <DashedLine />

          {/* Order meta */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={S.label}>Order: {cartDetails?.order_no}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={S.meta}>Cashier: {cartDetails?.served_by?.username || cartDetails?.created_by?.username || "Staff"}</span>
            <span style={S.meta}>Table: {cartDetails?.table_id?.name}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={S.meta}>Date: {printDateStr}</span>
            <span style={S.meta}>Time: {printTimeStr}</span>
          </div>

          {/* Client section — spa-specific with KRA PIN */}
          {hasClient && (
            <>
              <DashedLine />
              <div style={{ marginBottom: 4 }}>
                <div style={{ ...S.clientHdr, marginBottom: 3 }}>CLIENT</div>
                {clientName && <div style={S.meta}>Name:  {clientName}</div>}
                {clientPhone && <div style={S.meta}>Phone: {clientPhone}</div>}
                {clientEmail && <div style={S.meta}>Email: {clientEmail}</div>}
                {clientKraPin && (
                  <div style={{ ...S.meta, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <IdcardOutlined style={{ fontSize: fontSize - 2 }} /> KRA PIN: {clientKraPin}
                  </div>
                )}
              </div>
            </>
          )}

          <DashedLine />

          {/* Items */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...S.tblHdr, textAlign: "left", width: "8%" }}>QTY</th>
                <th style={{ ...S.tblHdr, textAlign: "left" }}>DESCRIPTION</th>
                <th style={{ ...S.tblHdr, textAlign: "right", width: "28%" }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((item: any, index: number) => {
                const displayPrice = getDisplayPrice(item);
                return (
                  <tr key={item._id || index}>
                    <td style={{ ...S.tblData, textAlign: "left", verticalAlign: "top" }}>{item.quantity}</td>
                    <td style={{ ...S.tblData, textAlign: "left", verticalAlign: "top", wordBreak: "break-word" }}>
                      {item?.product_id?.name}
                      {item.quantity > 1 && (
                        <div style={{ ...S.meta, fontSize: `${fontSize - 2}px`, color: "#555" }}>
                          @ {displayPrice.toFixed(2)} each
                        </div>
                      )}
                    </td>
                    <td style={{ ...S.tblData, textAlign: "right", verticalAlign: "top" }}>
                      {(displayPrice * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <DashedLine />

          {/* Totals — right-aligned block */}
          <div style={{ paddingLeft: "30%" }}>
            {(showDiscount || discountAmount === 0) && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={S.value}>Subtotal</span>
                <span style={S.value}>Ksh {subtotal.toLocaleString()}</span>
              </div>
            )}
            {showDiscount && discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={S.value}>
                  Discount{cartDetails.discount_type === "percentage" ? ` (${cartDetails.discount}%)` : ""}
                </span>
                <span style={S.value}>- Ksh {discountAmount.toFixed(2)}</span>
              </div>
            )}
            {showVat && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={S.value}>VAT</span>
                <span style={S.value}>Ksh {totalVatAmount.toFixed(2)}</span>
              </div>
            )}
            <DoubleLine />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={S.total}>{docConfig.amountLabel.toUpperCase()}</span>
              <span style={S.total}>Ksh {grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {documentType === "quotation" && (
            <>
              <DashedLine />
              <div style={{ textAlign: "center" }}>
                <div style={S.meta}>* This quotation is valid for 30 days *</div>
                <div style={S.meta}>* Prices subject to change without notice *</div>
              </div>
            </>
          )}

          {/* Footer */}
          <DashedLine />
          <div style={{ textAlign: "center", marginTop: 6 }}>
            <div className="qrcoded" style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
              <QRCodeCanvas value={QR_Code} size={90} className="qrcode" />
            </div>
            <div style={S.footer}>Thank you for your {documentType === "quotation" ? "interest" : "visit"}!</div>
            <div style={S.footer}>{EMAIL_URL}</div>
            <div style={S.footer}>Printed: {printDateStr} {printTimeStr}</div>
            <div style={{ ...S.footer, marginTop: 4, fontSize: `${fontSize - 2}px`, color: "#555" }}>
              Powered By BasePoint Cloud
            </div>
          </div>
        </div>
        {/* ── END THERMAL ─────────────────────────────────────────────── */}

        {/* ── PDF / A4 VIEW ────────────────────────────────────────────── */}
        {isPdfView && (
          <div
            ref={printableRef}
            style={{ backgroundColor: "#fff", padding: "40px", maxWidth: "800px", margin: "0 auto", boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}
          >
            {/* Header */}
            <Box sx={{ borderBottom: "3px solid #333", pb: 3, mb: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h3" style={pdfHdr}>{BRAND_NAME1}</Typography>
                <Box sx={{ backgroundColor: docConfig.color, color: "#fff", padding: "8px 20px", borderRadius: "8px", display: "flex", alignItems: "center", gap: 1 }}>
                  {docConfig.icon}
                  <Typography variant="h5" style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: 0 }}>{docConfig.label}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Typography variant="body1" style={pdfSub}>Tel: {PHONE_NO}</Typography>
                  {/* ── Always show payment details if Paybill or Till No exists ── */}
                  {Paybill_bs && (
                    <>
                      <Typography variant="body1" style={pdfNorm}>Paybill: {Paybill_bs}</Typography>
                      {Paybill_ac && <Typography variant="body1" style={pdfNorm}>Account No: {Paybill_ac}</Typography>}
                    </>
                  )}
                  {TILL_NO && (
                    <Typography variant="body1" style={pdfNorm}>Till No: {TILL_NO}</Typography>
                  )}
                </Box>
                <Box><QRCodeCanvas value={QR_Code} size={120} /></Box>
              </Box>
            </Box>

            {/* Order meta */}
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: hasClient ? 2 : 3, backgroundColor: "#f8fafc", borderRadius: 2, p: 2 }}>
              <Box>
                <Typography style={pdfSub}>{documentType === "quotation" ? "Quote" : "Order"} No: {cartDetails?.order_no}</Typography>
                <Typography style={pdfNorm}>Table: {cartDetails?.table_id?.name}</Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography style={pdfNorm}>Date: {printDateStr}</Typography>
                <Typography style={pdfNorm}>Time: {printTimeStr}</Typography>
                <Typography style={pdfNorm}>Cashier: {cartDetails?.served_by?.username || cartDetails?.created_by?.username || "Staff"}</Typography>
              </Box>
            </Box>

            {/* Client section with KRA PIN */}
            {hasClient && (
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", p: "12px 16px", mb: 3 }}>
                <UserOutlined style={{ fontSize: 20, color: "#16a34a", marginTop: 2 }} />
                <Box>
                  <Typography style={{ ...pdfSub, color: "#16a34a", marginBottom: 4 }}>Client Details</Typography>
                  {clientName && <Typography style={pdfNorm}>Name: {clientName}</Typography>}
                  {clientPhone && <Typography style={pdfNorm}>Phone: {clientPhone}</Typography>}
                  {clientEmail && <Typography style={pdfNorm}>Email: {clientEmail}</Typography>}
                  {clientKraPin && (
                    <Typography style={{ ...pdfNorm, marginTop: 2 }}>
                      <IdcardOutlined style={{ marginRight: 4 }} /> KRA PIN: {clientKraPin}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* Items table */}
            <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...pdfTH, width: "8%" }}>Qty</TableCell>
                    <TableCell sx={pdfTH}>Item Description</TableCell>
                    <TableCell sx={{ ...pdfTH, textAlign: "right" }}>Unit Price (Ksh)</TableCell>
                    <TableCell sx={{ ...pdfTH, textAlign: "right" }}>Total (Ksh)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.map((item: any, index: number) => {
                    const displayPrice = getDisplayPrice(item);
                    return (
                      <TableRow key={item._id || index}>
                        <TableCell sx={pdfTD}>{item.quantity}</TableCell>
                        <TableCell sx={pdfTD}>{item?.product_id?.name}</TableCell>
                        <TableCell sx={{ ...pdfTD, textAlign: "right" }}>{displayPrice.toFixed(2)}</TableCell>
                        <TableCell sx={{ ...pdfTD, textAlign: "right" }}>{(displayPrice * item.quantity).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Discount banner */}
            {showDiscount && discountAmount > 0 && (
              <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                <Box sx={{ backgroundColor: "#fff9e6", border: "2px solid #ffa500", borderRadius: "8px", px: 2, py: 1, display: "inline-flex", alignItems: "center", gap: 1 }}>
                  <RestOutlined style={{ fontSize: 18, color: "#ffa500" }} />
                  <Typography style={pdfSub}>
                    Discount Applied:{" "}
                    {cartDetails.discount_type === "amount"
                      ? `Ksh ${cartDetails.discount.toLocaleString()}`
                      : `${cartDetails.discount}%`}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Totals box */}
            <Box sx={{ ml: "auto", maxWidth: "380px", p: 2, backgroundColor: "#f9f9f9", borderRadius: 2, border: "1px solid #e2e8f0" }}>
              {(showDiscount || discountAmount === 0) && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography style={pdfNorm}>Subtotal</Typography>
                  <Typography style={pdfNorm}>Ksh {subtotal.toLocaleString()}</Typography>
                </Box>
              )}
              {showDiscount && discountAmount > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography style={pdfNorm}>
                    Discount{cartDetails.discount_type === "percentage" ? ` (${cartDetails.discount}%)` : ""}
                  </Typography>
                  <Typography style={{ ...pdfNorm, color: "#d32f2f" }}>- Ksh {discountAmount.toFixed(2)}</Typography>
                </Box>
              )}
              {showVat && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography style={pdfNorm}>VAT</Typography>
                  <Typography style={pdfNorm}>Ksh {totalVatAmount.toFixed(2)}</Typography>
                </Box>
              )}
              <Divider sx={{ my: 1.5, borderColor: "#333", borderWidth: 2 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography style={{ ...pdfHdr, fontSize: "20px" }}>{docConfig.amountLabel}</Typography>
                <Typography style={{ ...pdfHdr, fontSize: "20px" }}>Ksh {grandTotal.toLocaleString()}</Typography>
              </Box>
            </Box>

            {/* Quotation terms */}
            {documentType === "quotation" && (
              <Box sx={{ mt: 4, mb: 3, backgroundColor: "#fffbe6", border: "2px solid #faad14", borderRadius: "8px", p: 2 }}>
                <Typography style={{ ...pdfSub, textAlign: "center", marginBottom: 8 }}>Quotation Terms & Conditions</Typography>
                <Typography style={{ ...pdfNorm, marginBottom: 4 }}>• Valid for 30 days from date of issue</Typography>
                <Typography style={{ ...pdfNorm, marginBottom: 4 }}>• Prices subject to change without prior notice</Typography>
                <Typography style={{ ...pdfNorm, marginBottom: 4 }}>• Final pricing may vary based on product availability</Typography>
              </Box>
            )}

            {/* Footer */}
            <Box sx={{ borderTop: "2px solid #ddd", pt: 3, mt: 4, textAlign: "center" }}>
              <Typography style={{ ...pdfSub, marginBottom: 8 }}>
                Thank you for your {documentType === "quotation" ? "interest" : "visit"}!
              </Typography>
              <Typography style={{ ...pdfNorm, mb: 0.5 }}>Email: {EMAIL_URL}</Typography>
              <Typography style={{ ...pdfNorm, mb: 0.5 }}>Printed: {printDateStr} {printTimeStr}</Typography>
              <Typography style={{ ...pdfNorm, color: "#666" }}>Powered By BasePoint Cloud</Typography>
            </Box>
          </div>
        )}

        <Box sx={{ mt: 2 }} />
      </ModalForm>

      <SendEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={handleSendEmail}
        sending={sending}
        docLabel={docConfig.label}
      />

      <ReprintReasonModal
        open={reasonModalOpen}
        onConfirm={async (reason) => { setReasonModalOpen(false); await executePrint(reason); }}
        onCancel={() => setReasonModalOpen(false)}
      />
    </>
  );
};

export default PrintSpaBillModal;