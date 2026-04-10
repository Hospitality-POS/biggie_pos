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

// ── attemptSave: distinguishes block vs network errors ─────────────────────
async function attemptSave(
  recordPrint: (...args: any[]) => Promise<SavePrintResult | null>,
  opts: { print_format: PrintFormat; reason?: string }
): Promise<{ saved: boolean; blocked: boolean }> {
  try {
    const result = await recordPrint(opts);
    if (result) return { saved: true, blocked: false };
    // null result — treat as blocking to prevent silent limit bypass
    return { saved: false, blocked: true };
  } catch {
    // Network/500 error — non-blocking, allow physical print
    return { saved: false, blocked: false };
  }
}

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
    canPrint,
    isReprint,
    printsRemaining,
    printStatus,
    statusLoading,
    recordPrint,
  } = usePrintDocument({
    orderNo: cartDetails?.order_no,
    documentType,
    cartDetails,
    data,
  });

  // Client info helpers
  const clientName = cartDetails?.client_name ?? cartDetails?.clientName ?? null;
  const clientPhone = cartDetails?.client_pin ?? cartDetails?.clientPin ?? null;
  const clientEmail = cartDetails?.client_email ?? null;
  const hasClient = !!(clientName || clientPhone || clientEmail);

  const discountAmount = cartDetails?.discount
    ? cartDetails.discount_type === "percentage"
      ? (subtotal * cartDetails.discount) / 100
      : cartDetails.discount
    : 0;

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
      : `@media print { * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color: black !important; font-weight: bold !important; } }`,
  });

  useEffect(() => {
    if (pendingPrintRef.current && refReady && componentRef.current) {
      pendingPrintRef.current = false;
      triggerPrint();
    }
  }, [printTrigger, refReady, triggerPrint]);

  // ── Document type config ───────────────────────────────────────────────
  const getDocumentTypeConfig = () => {
    switch (documentType) {
      case "receipt": return { label: "RECEIPT", color: "#52c41a", icon: <FileTextOutlined />, amountLabel: "Amount Paid" };
      case "invoice": return { label: "INVOICE", color: "#1890ff", icon: <ReconciliationOutlined />, amountLabel: "Amount Due" };
      case "quotation": return { label: "QUOTATION", color: "#fa8c16", icon: <DollarOutlined />, amountLabel: "Total Estimate" };
      default: return { label: "BILL", color: "#722ed1", icon: <FileTextOutlined />, amountLabel: "Amount Due" };
    }
  };
  const docConfig = getDocumentTypeConfig();

  // ── Execute print + save ───────────────────────────────────────────────
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

      const { saved, blocked } = await attemptSave(recordPrint, {
        print_format: printFormat,
        reason,
      });

      if (blocked) {
        console.warn("[executePrint] Save blocked — aborting print.");
        setIsPrinting(false);
        return;
      }

      if (saved) {
        message.success(
          `${printFormat === "pdf" ? "PDF" : "Print"} ${isReprint ? "reprinted" : "printed"} and recorded successfully`
        );
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
    if (!canPrint) {
      message.error("Print limit reached.");
      return false;
    }
    if (isReprint && printStatus?.requires_reason) {
      setReasonModalOpen(true);
      return false;
    }
    await executePrint();
    return true;
  };

  const handleSendEmail = async (values: SendEmailValues) => {
    setSending(true);
    try {
      const htmlTable = refToHtmlString(componentRef);
      const fmtAmt = (n: number) =>
        `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

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
          { label: "VAT (16%)", value: fmtAmt(totalVatAmount), color: "#6366f1" },
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
  const baseText = { fontFamily: "monospace", fontWeight: 700, color: "#000000" };
  const hdr = { ...baseText, fontSize: "1.4em", fontWeight: 900 };
  const subhdr = { ...baseText, fontSize: "1.2em", fontWeight: 800 };
  const norm = { ...baseText, fontSize: "1.1em" };
  const tblHdr = { padding: 1, fontWeight: 900, fontSize: "1.2em", color: "#000000" };
  const tblData = { padding: 1, fontWeight: 700, fontSize: "1.1em", color: "#000000" };

  const pdfBase = { fontFamily: "'Segoe UI', Roboto, sans-serif", color: "#333" };
  const pdfHdr = { ...pdfBase, fontSize: "28px", fontWeight: 700, color: "#1a1a1a" };
  const pdfSub = { ...pdfBase, fontSize: "16px", fontWeight: 600, color: "#444" };
  const pdfNorm = { ...pdfBase, fontSize: "14px", fontWeight: 400 };
  const pdfTH = { padding: "12px 8px", fontWeight: 700, fontSize: "15px", color: "#1a1a1a", backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" };
  const pdfTD = { padding: "10px 8px", fontSize: "14px", color: "#333", borderBottom: "1px solid #eee" };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <ModalForm
        className="receiptM"
        modalProps={{ centered: true, destroyOnClose: true, width: isPdfView ? 900 : 600 }}
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
          <Button
            type="primary"
            icon={canPrint ? <PrinterOutlined /> : <LockOutlined />}
            disabled={statusLoading}
          >
            {isReprint ? "Reprint Bill" : "Print Bill"}
          </Button>
        }
        onFinish={handleFinish}
      >
        {/* ── Print limit warnings ─────────────────────────────────────── */}
        {!canPrint && (
          <Alert
            type="error" showIcon icon={<LockOutlined />}
            message="Print limit reached"
            description={`This document has reached the maximum number of prints allowed.${isPdfView ? " PDF saving is also disabled." : ""}`}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}
        {isReprint && canPrint && printsRemaining !== null && (
          <Alert
            type="warning" showIcon
            message={`Reprint — ${printsRemaining} print${printsRemaining !== 1 ? "s" : ""} remaining`}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

        {/* ── Document type + format toggles ──────────────────────────── */}
        <Space direction="vertical" style={{ marginBottom: 20, width: "100%" }}>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, paddingBottom: 2, borderBottom: "1px solid #f0f0f0" }}>
            <Typography variant="body1" style={{ fontWeight: 600, margin: 0 }}>Document Type :</Typography>
            <Select
              value={documentType}
              onChange={(v: DocumentType) => setDocumentType(v)}
              style={{ width: 200 }}
              options={[
                { label: "Bill", value: "bill" },
                { label: "Receipt", value: "receipt" },
                { label: "Invoice", value: "invoice" },
                { label: "Quotation", value: "quotation" },
              ]}
            />
            <Tag color={docConfig.color} style={{ fontSize: 14, padding: "4px 12px" }}>
              {docConfig.icon} {docConfig.label}
            </Tag>
          </Box>
          <Space direction="horizontal" style={{ display: "flex", justifyContent: "center", alignItems: "center", paddingTop: 2 }}>
            <PrinterOutlined style={{ fontSize: 18 }} />
            <Typography variant="body1" style={{ fontWeight: 600, margin: 0 }}>Thermal Receipt</Typography>
            <Switch
              checked={isPdfView}
              onChange={setIsPdfView}
              checkedChildren="PDF"
              unCheckedChildren="Thermal"
              disabled={!canPrint}
            />
            <Typography variant="body1" style={{ fontWeight: 600, margin: 0 }}>A4 PDF</Typography>
            <FilePdfOutlined style={{ fontSize: 18 }} />
          </Space>
        </Space>

        {/* ── Thermal receipt — always mounted, hidden in PDF mode ─────── */}
        <div
          ref={!isPdfView ? printableRef : undefined}
          className="receipt"
          id="receipt"
          style={{ color: "#000000", display: isPdfView ? "none" : "block" }}
        >
          <div className="logo-print" style={{ display: "flex", flexDirection: "column", marginBottom: 15 }}>
            <Typography variant="body1" style={hdr}>{BRAND_NAME1}</Typography>
            <Typography variant="body1" style={{ ...hdr, textAlign: "center", fontSize: "1.6em", marginTop: 5, marginBottom: 5, color: "#000" }}>
              {docConfig.label}
            </Typography>
            <Typography variant="body1" style={subhdr}>Phone: {PHONE_NO}</Typography>
            {Paybill_bs ? (
              <>
                <Typography variant="body1" style={subhdr}>Business No: {Paybill_bs}</Typography>
                {Paybill_ac && <Typography variant="body1" style={subhdr}>Account No: {Paybill_ac}</Typography>}
              </>
            ) : (
              TILL_NO && <Typography variant="body1" style={subhdr}>Till No: {TILL_NO}</Typography>
            )}
            {cartDetails?.clientPin && (
              <Typography variant="body1" style={norm}>Client Pin: {cartDetails?.clientPin}</Typography>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1" style={subhdr}>{cartDetails?.order_no}</Typography>
            <Typography variant="body1" style={subhdr}>
              Served By: {cartDetails?.served_by?.username || cartDetails?.created_by?.username || "Staff"}
            </Typography>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "-15px" }}>
            <Typography variant="body1" style={subhdr}>Table: {cartDetails?.table_id?.name}</Typography>
            <Typography variant="body1" style={norm}>
              Date: {new Date().toLocaleDateString()} {new Date().getHours()}:{new Date().getMinutes()}
            </Typography>
          </div>

          {/* Client section */}
          {hasClient && (
            <div style={{ marginTop: 14, marginBottom: 4, borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "6px 0" }}>
              <Typography variant="body1" style={{ ...subhdr, marginBottom: 2 }}>
                <UserOutlined style={{ marginRight: 4 }} /> CLIENT
              </Typography>
              {clientName && <Typography variant="body1" style={norm}>Name: {clientName}</Typography>}
              {clientPhone && <Typography variant="body1" style={norm}>Phone: {clientPhone}</Typography>}
              {clientEmail && <Typography variant="body1" style={norm}>Email: {clientEmail}</Typography>}
            </div>
          )}

          <TableContainer sx={{ mt: 3, width: "inherit" }}>
            <Table style={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...tblHdr, width: "10%" }}>#</TableCell>
                  <TableCell sx={tblHdr}>ITEM</TableCell>
                  <TableCell sx={{ ...tblHdr, textAlign: "right" }}>PRICE(.Ksh)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.map((item: any, index: number) => (
                  <TableRow key={item._id || index}>
                    <TableCell sx={{ ...tblData, width: "5%", textAlign: "left" }}>{item.quantity}</TableCell>
                    <TableCell component="th" scope="row" sx={{ ...tblData, wordWrap: "break-word" }}>{item?.product_id?.name}</TableCell>
                    <TableCell sx={{ ...tblData, textAlign: "right" }}>{item?.price?.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body1" style={subhdr}>Subtotal:</Typography>
              <Typography variant="body1" style={subhdr}>Ksh. {subtotal.toLocaleString()}</Typography>
            </div>
            {cartDetails?.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" style={norm}>
                  Discount{cartDetails.discount_type === "percentage" ? ` (${cartDetails.discount}%)` : ""}:
                </Typography>
                <Typography variant="body1" style={norm}>- Ksh. {discountAmount.toFixed(2)}</Typography>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body1" style={norm}>VAT (16%):</Typography>
              <Typography variant="body1" style={norm}>Ksh. {totalVatAmount.toLocaleString()}</Typography>
            </div>
            <div style={{ borderTop: "2px dashed #000", margin: "5px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body1" style={hdr}>{docConfig.amountLabel}:</Typography>
              <Typography variant="body1" style={hdr}>Ksh. {grandTotal.toLocaleString()}</Typography>
            </div>
          </div>

          {documentType === "quotation" && (
            <div style={{ margin: "15px 0" }}>
              <Typography variant="body1" style={{ ...norm, textAlign: "center" }}>* This quotation is valid for 30 days *</Typography>
              <Typography variant="body1" style={{ ...norm, textAlign: "center" }}>* Prices subject to change without notice *</Typography>
            </div>
          )}

          <Typography variant="body1" sx={{ textAlign: "center", fontWeight: 900, marginTop: 5 }}>
            ===========================
          </Typography>
          <div className="qrcoded" style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
            <QRCodeCanvas value={QR_Code} size={100} className="qrcode" />
          </div>
          <Typography variant="body1" style={{ ...subhdr, textAlign: "center", marginTop: 10 }}>
            Thank you for your {documentType === "quotation" ? "interest" : "support"}!
          </Typography>
          <Typography variant="body1" style={{ ...norm, textAlign: "center" }}>Info email: {EMAIL_URL}</Typography>
          <Typography variant="body1" style={{ ...norm, textAlign: "center" }}>Generated on {new Date().toLocaleDateString()}</Typography>
          <Typography variant="body1" style={{ ...norm, textAlign: "center" }}>Powered By Relia Tech Solutions</Typography>
        </div>

        {/* ── PDF / A4 view ────────────────────────────────────────────── */}
        {isPdfView && (
          <div
            ref={printableRef}
            style={{ backgroundColor: "#fff", padding: "40px", maxWidth: "800px", margin: "0 auto", boxShadow: "0 0 10px rgba(0,0,0,0.1)" }}
          >
            <Box sx={{ borderBottom: "3px solid #333", paddingBottom: 3, marginBottom: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <Typography variant="h3" style={pdfHdr}>{BRAND_NAME1}</Typography>
                <Box sx={{ backgroundColor: docConfig.color, color: "#fff", padding: "8px 20px", borderRadius: "8px", display: "flex", alignItems: "center", gap: 1 }}>
                  {docConfig.icon}
                  <Typography variant="h5" style={{ fontSize: "20px", fontWeight: 700, color: "#fff", margin: 0 }}>{docConfig.label}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Typography variant="body1" style={pdfSub}>Phone: {PHONE_NO}</Typography>
                  {Paybill_bs ? (
                    <>
                      <Typography variant="body1" style={pdfNorm}>Business No: {Paybill_bs}</Typography>
                      {Paybill_ac && <Typography variant="body1" style={pdfNorm}>Account No: {Paybill_ac}</Typography>}
                    </>
                  ) : (
                    TILL_NO && <Typography variant="body1" style={pdfNorm}>Till No: {TILL_NO}</Typography>
                  )}
                  {cartDetails?.clientPin && <Typography variant="body1" style={pdfNorm}>Client Pin: {cartDetails?.clientPin}</Typography>}
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <QRCodeCanvas value={QR_Code} size={120} />
                </Box>
              </Box>
            </Box>

            <Box sx={{ marginBottom: hasClient ? 2 : 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
                <Typography variant="body1" style={pdfSub}>
                  {documentType === "quotation" ? "Quote" : "Order"} No: {cartDetails?.order_no}
                </Typography>
                <Typography variant="body1" style={pdfNorm}>
                  Date: {new Date().toLocaleDateString()} {new Date().getHours()}:{new Date().getMinutes()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
                <Typography variant="body1" style={pdfNorm}>Table: {cartDetails?.table_id?.name}</Typography>
                <Typography variant="body1" style={pdfNorm}>Served By: {cartDetails?.served_by?.username || cartDetails?.created_by?.username || "Staff"}</Typography>
              </Box>
            </Box>

            {/* Client section */}
            {hasClient && (
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px 16px", marginBottom: 3 }}>
                <UserOutlined style={{ fontSize: 20, color: "#16a34a", marginTop: 2 }} />
                <Box>
                  <Typography variant="body1" style={{ ...pdfSub, color: "#16a34a", marginBottom: 4 }}>Client Details</Typography>
                  {clientName && <Typography variant="body1" style={pdfNorm}>Name: {clientName}</Typography>}
                  {clientPhone && <Typography variant="body1" style={pdfNorm}>Phone: {clientPhone}</Typography>}
                  {clientEmail && <Typography variant="body1" style={pdfNorm}>Email: {clientEmail}</Typography>}
                </Box>
              </Box>
            )}

            <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...pdfTH, width: "10%" }}>Qty</TableCell>
                    <TableCell sx={pdfTH}>Item Description</TableCell>
                    <TableCell sx={{ ...pdfTH, textAlign: "right" }}>Unit Price</TableCell>
                    <TableCell sx={{ ...pdfTH, textAlign: "right" }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.map((item: any, index: number) => (
                    <TableRow key={item._id || index}>
                      <TableCell sx={pdfTD}>{item.quantity}</TableCell>
                      <TableCell sx={pdfTD}>{item?.product_id?.name}</TableCell>
                      <TableCell sx={{ ...pdfTD, textAlign: "right" }}>Ksh. {(item?.price / item.quantity).toFixed(2)}</TableCell>
                      <TableCell sx={{ ...pdfTD, textAlign: "right" }}>Ksh. {item?.price?.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {cartDetails?.discount > 0 && (
              <Box sx={{ display: "flex", justifyContent: "center", marginBottom: 2 }}>
                <Box sx={{ backgroundColor: "#fff9e6", border: "2px solid #ffa500", borderRadius: "8px", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: 1 }}>
                  <RestOutlined style={{ fontSize: 18, color: "#ffa500" }} />
                  <Typography variant="body1" style={pdfSub}>
                    Discount Applied:{" "}
                    {cartDetails.discount_type === "amount"
                      ? `Ksh. ${cartDetails.discount.toLocaleString()}`
                      : `${cartDetails.discount}%`}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box sx={{ marginLeft: "auto", maxWidth: "400px", padding: 2, backgroundColor: "#f9f9f9", borderRadius: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
                <Typography variant="body1" style={pdfNorm}>Subtotal:</Typography>
                <Typography variant="body1" style={pdfNorm}>Ksh. {subtotal.toLocaleString()}</Typography>
              </Box>
              {cartDetails?.discount > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
                  <Typography variant="body1" style={pdfNorm}>
                    Discount{cartDetails.discount_type === "percentage" ? ` (${cartDetails.discount}%)` : ""}:
                  </Typography>
                  <Typography variant="body1" style={{ ...pdfNorm, color: "#d32f2f" }}>-Ksh. {discountAmount.toFixed(2)}</Typography>
                </Box>
              )}
              <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
                <Typography variant="body1" style={pdfNorm}>VAT (16%):</Typography>
                <Typography variant="body1" style={pdfNorm}>Ksh. {totalVatAmount.toLocaleString()}</Typography>
              </Box>
              <Divider sx={{ my: 1, borderColor: "#333", borderWidth: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="h5" style={{ ...pdfHdr, fontSize: "22px" }}>{docConfig.amountLabel}:</Typography>
                <Typography variant="h5" style={{ ...pdfHdr, fontSize: "22px" }}>Ksh. {grandTotal.toLocaleString()}</Typography>
              </Box>
            </Box>

            {documentType === "quotation" && (
              <Box sx={{ marginTop: 4, marginBottom: 3, backgroundColor: "#fffbe6", border: "2px solid #faad14", borderRadius: "8px", padding: 2 }}>
                <Typography variant="body1" style={{ ...pdfSub, textAlign: "center", marginBottom: 8 }}>Quotation Terms & Conditions</Typography>
                <Typography variant="body1" style={{ ...pdfNorm, marginBottom: 4 }}>• This quotation is valid for 30 days from the date of issue</Typography>
                <Typography variant="body1" style={{ ...pdfNorm, marginBottom: 4 }}>• Prices are subject to change without prior notice</Typography>
                <Typography variant="body1" style={{ ...pdfNorm, marginBottom: 4 }}>• Final pricing may vary based on product availability</Typography>
              </Box>
            )}

            <Box sx={{ borderTop: "2px solid #ddd", paddingTop: 3, marginTop: 4, textAlign: "center" }}>
              <Typography variant="body1" style={{ ...pdfSub, marginBottom: 8 }}>
                Thank you for your {documentType === "quotation" ? "interest" : "business"}!
              </Typography>
              <Typography variant="body1" style={{ ...pdfNorm, marginBottom: 4 }}>Email: {EMAIL_URL}</Typography>
              <Typography variant="body1" style={{ ...pdfNorm, marginBottom: 4 }}>Generated on {new Date().toLocaleDateString()}</Typography>
              <Typography variant="body1" style={{ ...pdfNorm, color: "#666" }}>Powered By Relia Tech Solutions</Typography>
            </Box>
          </div>
        )}

        <Box sx={{ mt: 2, display: "flex", justifyContent: "space-evenly", columnGap: 5 }} />
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
        onConfirm={async (reason) => {
          setReasonModalOpen(false);
          await executePrint(reason);
        }}
        onCancel={() => setReasonModalOpen(false)}
      />
    </>
  );
};

export default PrintSpaBillModal;