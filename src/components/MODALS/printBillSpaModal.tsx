import React, { useRef, useState } from "react";
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
  UserOutlined,
  MailOutlined,
  PlusOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, Modal, Switch, Space } from "antd";
import { ModalForm } from "@ant-design/pro-form";
import { useAppSelector } from "src/store";
import { sendEmail, refToHtmlString } from "@services/emailReports";

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

const SendEmailModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSend: (values: SendEmailValues) => Promise<void>;
  sending: boolean;
}> = ({ open, onClose, onSend, sending }) => {
  const [form] = Form.useForm();
  const handleOk = async () => {
    const values = await form.validateFields();
    await onSend(values);
    form.resetFields();
  };
  return (
    <Modal
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={handleOk}
      confirmLoading={sending}
      okText={
        <Space>
          <SendOutlined />
          Send Receipt
        </Space>
      }
      okButtonProps={{ style: { background: C.primary, borderColor: C.primary } }}
      title={
        <Space>
          <MailOutlined style={{ color: C.primary }} />
          <span>Send Receipt via Email</span>
        </Space>
      }
      width={480}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="to"
          label="Recipient Email"
          rules={[
            { required: true, message: "Recipient email is required" },
            { type: "email", message: "Enter a valid email address" },
          ]}
        >
          <Input
            prefix={<MailOutlined style={{ color: C.subText }} />}
            placeholder="customer@email.com"
          />
        </Form.Item>
        <Form.Item name="recipientName" label="Recipient Name">
          <Input
            prefix={<UserOutlined style={{ color: C.subText }} />}
            placeholder="e.g. John Kamau"
          />
        </Form.Item>
        <Form.Item
          name="cc"
          label="CC (optional)"
          extra="Separate multiple addresses with commas"
        >
          <Input
            prefix={<PlusOutlined style={{ color: C.subText }} />}
            placeholder="accounts@company.com"
          />
        </Form.Item>
        <Form.Item name="intro" label="Personal Message (optional)">
          <Input.TextArea rows={3} placeholder="Please find your receipt attached." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const PrintBillModal: React.FC<PrintBillProps> = ({ cartDetails, data }) => {
  const { subtotal, totalVatAmount, grandTotal } = useAppSelector(
    (state) => state.cart
  );
  const componentRef = useRef<HTMLDivElement>(null);
  const [isPdfView, setIsPdfView] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const {
    BRAND_NAME1,
    EMAIL_URL,
    PIN,
    PHONE_NO,
    QR_Code,
    Paybill_bs,
    Paybill_ac,
  } = useSystemDetails();

  // Normalise client fields — handles both old (clientPin/clientName) and
  // new (client_pin / client_name / client_email) field names on cartDetails
  const clientName = cartDetails?.client_name ?? cartDetails?.clientName ?? null;
  const clientPhone = cartDetails?.client_pin ?? cartDetails?.clientPin ?? null;
  const clientEmail = cartDetails?.client_email ?? null;
  const hasClient = !!(clientName || clientPhone || clientEmail);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    pageStyle: isPdfView
      ? `
      @page {
        size: A4;
        margin: 20mm;
      }
      @media print {
        * {
          color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 0;
        }
      }
    `
      : `
      @media print {
        * {
          color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `,
  });

  const darkTextColor = "#000000";
  const boldFontWeight = 700;

  const discountAmount = cartDetails?.discount
    ? cartDetails.discount_type === "percentage"
      ? (subtotal * cartDetails.discount) / 100
      : cartDetails.discount
    : 0;

  // ── Email send ─────────────────────────────────────────────────────────────
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
        subject: `Receipt — ${cartDetails?.order_no ?? "Order"}`,
        bannerLabel: `RECEIPT — ${cartDetails?.order_no ?? ""}`,
        bannerType: "Sales",
        summary: [
          { label: "Subtotal", value: fmtAmt(subtotal), color: C.primary },
          { label: "VAT (16%)", value: fmtAmt(totalVatAmount), color: "#6366f1" },
          { label: "Total Amount", value: fmtAmt(grandTotal), color: "#10b981" },
        ],
        htmlTable,
        outro: "Thank you for your business!",
      });
      if (ok) setEmailModalOpen(false);
    } finally {
      setSending(false);
    }
  };

  // ── PDF styles ─────────────────────────────────────────────────────────────
  const pdfBaseTextStyle = {
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    color: "#333",
  };
  const pdfHeaderStyle = {
    ...pdfBaseTextStyle,
    fontSize: "28px",
    fontWeight: 700,
    color: "#1a1a1a",
  };
  const pdfSubheaderStyle = {
    ...pdfBaseTextStyle,
    fontSize: "16px",
    fontWeight: 600,
    color: "#444",
  };
  const pdfNormalTextStyle = {
    ...pdfBaseTextStyle,
    fontSize: "14px",
    fontWeight: 400,
  };
  const pdfTableHeaderStyle = {
    padding: "12px 8px",
    fontWeight: 700,
    fontSize: "15px",
    color: "#1a1a1a",
    backgroundColor: "#f5f5f5",
    borderBottom: "2px solid #ddd",
  };
  const pdfTableDataStyle = {
    padding: "10px 8px",
    fontSize: "14px",
    color: "#333",
    borderBottom: "1px solid #eee",
  };

  return (
    <>
      <ModalForm
        className="receiptM"
        modalProps={{
          centered: true,
          destroyOnClose: true,
          width: isPdfView ? 900 : 600,
        }}
        // ── FIX: use submitter prop to render custom footer with email button ──
        submitter={{
          render: (_, defaultDoms) => (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              {/* Left side: Send via Email */}
              <Button
                icon={<MailOutlined />}
                onClick={() => setEmailModalOpen(true)}
                style={{
                  borderColor: C.primary,
                  color: C.primary,
                  borderRadius: 7,
                }}
              >
                Send via Email
              </Button>

              {/* Right side: Cancel + Print/PDF */}
              <Space>
                {defaultDoms[0]} {/* Cancel button */}
                {defaultDoms[1]} {/* Submit button */}
              </Space>
            </div>
          ),
          submitButtonProps: {
            icon: isPdfView ? <FilePdfOutlined /> : <PrinterFilled />,
            style: { background: C.primary, borderColor: C.primary },
          },
          searchConfig: {
            submitText: isPdfView ? "Save as PDF" : "Print Receipt",
            resetText: "Cancel",
          },
        }}
        trigger={
          <Button type="primary" icon={<PrinterOutlined />}>
            Print Bill
          </Button>
        }
        onFinish={async () => {
          handlePrint();
          return true;
        }}
      >
        <Space
          direction="horizontal"
          style={{
            marginBottom: 20,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <PrinterOutlined style={{ fontSize: 18 }} />
          <Typography variant="body1" style={{ fontWeight: 600, margin: 0 }}>
            Thermal Receipt
          </Typography>
          <Switch
            checked={isPdfView}
            onChange={(checked) => setIsPdfView(checked)}
            checkedChildren="PDF"
            unCheckedChildren="Thermal"
          />
          <Typography variant="body1" style={{ fontWeight: 600, margin: 0 }}>
            A4 PDF
          </Typography>
          <FilePdfOutlined style={{ fontSize: 18 }} />
        </Space>

        {/* ════════════════════════════════════════════════════════════════════
            THERMAL RECEIPT
        ════════════════════════════════════════════════════════════════════ */}
        {!isPdfView && (
          <div
            className="receipt"
            id="receipt"
            ref={componentRef}
            style={{ color: darkTextColor, fontWeight: boldFontWeight }}
          >
            {/* Store header */}
            <div
              className="logo-print"
              style={{
                display: "flex",
                flexDirection: "column",
                marginBottom: 10,
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              <Typography
                variant="body1"
                style={{
                  fontFamily: "monospace",
                  fontSize: "1em",
                  color: darkTextColor,
                  fontWeight: boldFontWeight,
                }}
              >
                {BRAND_NAME1}
              </Typography>
              <Typography
                variant="body1"
                style={{
                  fontSize: "0.9em",
                  fontFamily: "monospace",
                  color: darkTextColor,
                  fontWeight: boldFontWeight,
                }}
              >
                Phone: {PHONE_NO}
              </Typography>
              <Typography
                variant="body1"
                style={{
                  fontSize: "0.9em",
                  fontFamily: "monospace",
                  color: darkTextColor,
                  fontWeight: boldFontWeight,
                }}
              >
                Paybill No: {Paybill_bs}
              </Typography>
              <Typography
                variant="body1"
                style={{
                  fontSize: "0.9em",
                  fontFamily: "monospace",
                  color: darkTextColor,
                  fontWeight: boldFontWeight,
                }}
              >
                Account No: {Paybill_ac}
              </Typography>
            </div>

            {/* Order meta */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              <Typography
                variant="body1"
                style={{
                  fontSize: "0.9em",
                  fontFamily: "monospace",
                  color: darkTextColor,
                  fontWeight: boldFontWeight,
                }}
              >
                {cartDetails?.order_no}
              </Typography>
              <Typography
                variant="body1"
                style={{
                  fontSize: "0.9em",
                  fontFamily: "monospace",
                  color: darkTextColor,
                  fontWeight: boldFontWeight,
                }}
              >
                Served By:{" "}
                {cartDetails?.served_by?.username ||
                  cartDetails?.created_by?.username ||
                  "Staff"}
              </Typography>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "-10px",
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              <Typography
                variant="body1"
                style={{
                  fontSize: "0.9em",
                  fontFamily: "monospace",
                  color: darkTextColor,
                  fontWeight: boldFontWeight,
                }}
              >
                Table: {cartDetails?.table_id?.name}
              </Typography>
              <Typography
                variant="body1"
                style={{
                  fontSize: "0.8em",
                  fontFamily: "monospace",
                  color: darkTextColor,
                  fontWeight: boldFontWeight,
                }}
              >
                Date: {new Date().toLocaleDateString()} {new Date().getHours()}:
                {new Date().getMinutes()}
              </Typography>
            </div>

            {/* ── Client details block (thermal) ── */}
            {hasClient && (
              <div
                style={{
                  marginTop: 14,
                  marginBottom: 4,
                  borderTop: "1px dashed #000",
                  borderBottom: "1px dashed #000",
                  padding: "6px 0",
                  color: darkTextColor,
                  fontWeight: boldFontWeight,
                }}
              >
                <Typography
                  variant="body1"
                  style={{
                    fontSize: "0.9em",
                    fontFamily: "monospace",
                    fontWeight: 900,
                    color: darkTextColor,
                    marginBottom: 2,
                  }}
                >
                  <UserOutlined style={{ marginRight: 4 }} /> CLIENT
                </Typography>
                {clientName && (
                  <Typography
                    variant="body1"
                    style={{
                      fontSize: "0.9em",
                      fontFamily: "monospace",
                      color: darkTextColor,
                      fontWeight: boldFontWeight,
                    }}
                  >
                    Name: {clientName}
                  </Typography>
                )}
                {clientPhone && (
                  <Typography
                    variant="body1"
                    style={{
                      fontSize: "0.9em",
                      fontFamily: "monospace",
                      color: darkTextColor,
                      fontWeight: boldFontWeight,
                    }}
                  >
                    Phone: {clientPhone}
                  </Typography>
                )}
                {clientEmail && (
                  <Typography
                    variant="body1"
                    style={{
                      fontSize: "0.9em",
                      fontFamily: "monospace",
                      color: darkTextColor,
                      fontWeight: boldFontWeight,
                    }}
                  >
                    Email: {clientEmail}
                  </Typography>
                )}
              </div>
            )}

            {/* Items table */}
            <TableContainer sx={{ mt: 2, width: "inherit" }}>
              <Table style={{ tableLayout: "fixed", color: darkTextColor }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        padding: 0.5,
                        fontWeight: boldFontWeight,
                        width: "10%",
                        color: darkTextColor,
                      }}
                    >
                      #
                    </TableCell>
                    <TableCell
                      sx={{
                        padding: 0.5,
                        fontWeight: boldFontWeight,
                        color: darkTextColor,
                      }}
                    >
                      ITEM
                    </TableCell>
                    <TableCell
                      sx={{
                        padding: 0.5,
                        textAlign: "right",
                        fontWeight: boldFontWeight,
                        color: darkTextColor,
                      }}
                    >
                      PRICE(.Ksh)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.map((item: any) => (
                    <TableRow key={item._id}>
                      <TableCell
                        sx={{
                          padding: 0.8,
                          fontSize: "0.9em",
                          width: "5%",
                          textAlign: "left",
                          fontWeight: boldFontWeight,
                          color: darkTextColor,
                        }}
                      >
                        {item.quantity}
                      </TableCell>
                      <TableCell
                        component="th"
                        scope="row"
                        sx={{
                          padding: 0.8,
                          fontSize: "0.9em",
                          fontWeight: boldFontWeight,
                          wordWrap: "break-word",
                          color: darkTextColor,
                        }}
                      >
                        {item?.product_id?.name}
                      </TableCell>
                      <TableCell
                        sx={{
                          padding: 0.8,
                          textAlign: "right",
                          fontSize: "0.9em",
                          fontWeight: boldFontWeight,
                          color: darkTextColor,
                        }}
                      >
                        {item?.price?.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {cartDetails?.discount > 0 && (
              <Typography
                variant="body1"
                style={{
                  fontSize: "0.9em",
                  fontFamily: "monospace",
                  textAlign: "center",
                  fontWeight: boldFontWeight,
                  color: darkTextColor,
                }}
              >
                <RestOutlined style={{ color: darkTextColor }} /> Discount:{" "}
                {cartDetails.discount_type === "amount"
                  ? `KSH. ${cartDetails.discount.toLocaleString()}`
                  : `${cartDetails.discount}%`}
              </Typography>
            )}

            {/* Subtotal */}
            <Typography
              variant="body1"
              style={{
                fontSize: "0.9em",
                fontFamily: "monospace",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: boldFontWeight,
                color: darkTextColor,
                margin: "4px 0",
              }}
            >
              <span>Subtotal:</span>
              <span>Ksh. {subtotal?.toFixed(2)}</span>
            </Typography>

            {/* Discount */}
            {cartDetails?.discount > 0 && (
              <Typography
                variant="body1"
                style={{
                  fontSize: "0.9em",
                  fontFamily: "monospace",
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: boldFontWeight,
                  color: darkTextColor,
                  margin: "4px 0",
                }}
              >
                <span>
                  Discount:{" "}
                  {cartDetails.discount_type === "percentage"
                    ? `(${cartDetails.discount}%)`
                    : ""}
                </span>
                <span>-Ksh. {discountAmount.toFixed(2)}</span>
              </Typography>
            )}

            {/* VAT */}
            <Typography
              variant="body1"
              style={{
                fontSize: "0.9em",
                fontFamily: "monospace",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: boldFontWeight,
                color: darkTextColor,
                margin: "4px 0",
              }}
            >
              <span>VAT (16%):</span>
              <span>Ksh. {totalVatAmount?.toFixed(2)}</span>
            </Typography>

            {/* Grand Total */}
            <Typography
              variant="body1"
              style={{
                fontSize: "1em",
                fontFamily: "monospace",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: boldFontWeight,
                color: darkTextColor,
                margin: "8px 0",
                borderTop: "1px dashed #000",
                paddingTop: "4px",
              }}
            >
              <span>Total Amount:</span>
              <span>Ksh. {grandTotal?.toFixed(2)}</span>
            </Typography>

            <Typography
              variant="body1"
              sx={{
                textAlign: "center",
                fontWeight: boldFontWeight,
                color: darkTextColor,
              }}
            >
              ===========================
            </Typography>
            <div className="qrcoded" style={{ marginTop: 4 }}>
              <QRCodeCanvas value={QR_Code} size={70} className="qrcode" />
            </div>
            <Typography
              variant="body1"
              style={{
                fontSize: "0.8em",
                fontFamily: "monospace",
                textAlign: "center",
                marginTop: 8,
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              Thank you for your support!
            </Typography>
            <Typography
              variant="body1"
              style={{
                fontSize: "0.8em",
                fontFamily: "monospace",
                textAlign: "center",
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              Info email: {EMAIL_URL}
            </Typography>
            <Typography
              variant="body1"
              style={{
                fontSize: "0.7em",
                fontFamily: "monospace",
                textAlign: "center",
                color: darkTextColor,
                fontWeight: boldFontWeight,
              }}
            >
              Generated on {new Date().toLocaleDateString()}
            </Typography>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            PDF A4 VIEW
        ════════════════════════════════════════════════════════════════════ */}
        {isPdfView && (
          <div
            ref={componentRef}
            style={{
              backgroundColor: "#fff",
              padding: "40px",
              maxWidth: "800px",
              margin: "0 auto",
              boxShadow: "0 0 10px rgba(0,0,0,0.1)",
            }}
          >
            {/* Header Section */}
            <Box
              sx={{
                borderBottom: "3px solid #333",
                paddingBottom: 3,
                marginBottom: 3,
              }}
            >
              <Typography
                variant="h3"
                style={{
                  ...pdfHeaderStyle,
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                {BRAND_NAME1}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box>
                  <Typography variant="body1" style={pdfSubheaderStyle}>
                    Phone: {PHONE_NO}
                  </Typography>
                  <Typography variant="body1" style={pdfNormalTextStyle}>
                    Paybill No: {Paybill_bs}
                  </Typography>
                  <Typography variant="body1" style={pdfNormalTextStyle}>
                    Account No: {Paybill_ac}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <QRCodeCanvas value={QR_Code} size={120} />
                </Box>
              </Box>
            </Box>

            {/* Order Details */}
            <Box sx={{ marginBottom: hasClient ? 2 : 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 1,
                }}
              >
                <Typography variant="body1" style={pdfSubheaderStyle}>
                  Order No: {cartDetails?.order_no}
                </Typography>
                <Typography variant="body1" style={pdfNormalTextStyle}>
                  Date: {new Date().toLocaleDateString()}{" "}
                  {new Date().getHours()}:{new Date().getMinutes()}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 1,
                }}
              >
                <Typography variant="body1" style={pdfNormalTextStyle}>
                  Table: {cartDetails?.table_id?.name}
                </Typography>
                <Typography variant="body1" style={pdfNormalTextStyle}>
                  Served By:{" "}
                  {cartDetails?.served_by?.username ||
                    cartDetails?.created_by?.username ||
                    "Staff"}
                </Typography>
              </Box>
            </Box>

            {/* ── Client details block (PDF) ── */}
            {hasClient && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.5,
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: 3,
                }}
              >
                <UserOutlined
                  style={{ fontSize: 20, color: "#16a34a", marginTop: 2 }}
                />
                <Box>
                  <Typography
                    variant="body1"
                    style={{
                      ...pdfSubheaderStyle,
                      color: "#16a34a",
                      marginBottom: 4,
                    }}
                  >
                    Client Details
                  </Typography>
                  {clientName && (
                    <Typography variant="body1" style={pdfNormalTextStyle}>
                      Name: {clientName}
                    </Typography>
                  )}
                  {clientPhone && (
                    <Typography variant="body1" style={pdfNormalTextStyle}>
                      Phone: {clientPhone}
                    </Typography>
                  )}
                  {clientEmail && (
                    <Typography variant="body1" style={pdfNormalTextStyle}>
                      Email: {clientEmail}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* Items Table */}
            <TableContainer component={Paper} elevation={0} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...pdfTableHeaderStyle, width: "10%" }}>
                      Qty
                    </TableCell>
                    <TableCell sx={pdfTableHeaderStyle}>
                      Item Description
                    </TableCell>
                    <TableCell
                      sx={{ ...pdfTableHeaderStyle, textAlign: "right" }}
                    >
                      Unit Price
                    </TableCell>
                    <TableCell
                      sx={{ ...pdfTableHeaderStyle, textAlign: "right" }}
                    >
                      Total
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.map((item: any) => (
                    <TableRow key={item._id}>
                      <TableCell sx={pdfTableDataStyle}>
                        {item.quantity}
                      </TableCell>
                      <TableCell sx={pdfTableDataStyle}>
                        {item?.product_id?.name}
                      </TableCell>
                      <TableCell
                        sx={{ ...pdfTableDataStyle, textAlign: "right" }}
                      >
                        Ksh. {(item?.price / item.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell
                        sx={{ ...pdfTableDataStyle, textAlign: "right" }}
                      >
                        Ksh. {item?.price?.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Discount Badge */}
            {cartDetails?.discount > 0 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 2,
                }}
              >
                <Box
                  sx={{
                    backgroundColor: "#fff9e6",
                    border: "2px solid #ffa500",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <RestOutlined style={{ fontSize: 18, color: "#ffa500" }} />
                  <Typography variant="body1" style={pdfSubheaderStyle}>
                    Discount Applied:{" "}
                    {cartDetails.discount_type === "amount"
                      ? `Ksh. ${cartDetails.discount.toLocaleString()}`
                      : `${cartDetails.discount}%`}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Totals Section */}
            <Box
              sx={{
                marginLeft: "auto",
                maxWidth: "400px",
                padding: 2,
                backgroundColor: "#f9f9f9",
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 1,
                }}
              >
                <Typography variant="body1" style={pdfNormalTextStyle}>
                  Subtotal:
                </Typography>
                <Typography variant="body1" style={pdfNormalTextStyle}>
                  Ksh. {subtotal?.toFixed(2)}
                </Typography>
              </Box>
              {cartDetails?.discount > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 1,
                  }}
                >
                  <Typography variant="body1" style={pdfNormalTextStyle}>
                    Discount{" "}
                    {cartDetails.discount_type === "percentage"
                      ? `(${cartDetails.discount}%)`
                      : ""}
                    :
                  </Typography>
                  <Typography
                    variant="body1"
                    style={{ ...pdfNormalTextStyle, color: "#d32f2f" }}
                  >
                    -Ksh. {discountAmount.toFixed(2)}
                  </Typography>
                </Box>
              )}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 1,
                }}
              >
                <Typography variant="body1" style={pdfNormalTextStyle}>
                  VAT (16%):
                </Typography>
                <Typography variant="body1" style={pdfNormalTextStyle}>
                  Ksh. {totalVatAmount?.toFixed(2)}
                </Typography>
              </Box>
              <Divider sx={{ my: 1, borderColor: "#333", borderWidth: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography
                  variant="h5"
                  style={{ ...pdfHeaderStyle, fontSize: "22px" }}
                >
                  Total Amount:
                </Typography>
                <Typography
                  variant="h5"
                  style={{ ...pdfHeaderStyle, fontSize: "22px" }}
                >
                  Ksh. {grandTotal?.toFixed(2)}
                </Typography>
              </Box>
            </Box>

            {/* Footer */}
            <Box
              sx={{
                borderTop: "2px solid #ddd",
                paddingTop: 3,
                marginTop: 4,
                textAlign: "center",
              }}
            >
              <Typography
                variant="body1"
                style={{ ...pdfSubheaderStyle, marginBottom: 8 }}
              >
                Thank you for your business!
              </Typography>
              <Typography
                variant="body1"
                style={{ ...pdfNormalTextStyle, marginBottom: 4 }}
              >
                Email: {EMAIL_URL}
              </Typography>
              <Typography
                variant="body1"
                style={{ ...pdfNormalTextStyle, marginBottom: 4 }}
              >
                Generated on {new Date().toLocaleDateString()}
              </Typography>
              <Typography
                variant="body1"
                style={{ ...pdfNormalTextStyle, color: "#666" }}
              >
                Powered By Relia Tech Solutions
              </Typography>
            </Box>
          </div>
        )}

        <Box
          sx={{
            mt: 2,
            display: "flex",
            justifyContent: "space-evenly",
            columnGap: 5,
          }}
        ></Box>
      </ModalForm>

      <SendEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={handleSendEmail}
        sending={sending}
      />
    </>
  );
};

export default PrintBillModal;