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
import { ENTITY_NAME } from "@utils/config";
import useSystemDetails from "@hooks/useSystemDetails";
import {
  PrinterFilled,
  PrinterOutlined,
  RestOutlined,
  SafetyCertificateFilled,
  FilePdfOutlined,
  FileTextOutlined,
  DollarOutlined,
  ReconciliationOutlined,
  MailOutlined,
  PlusOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, Modal, Switch, Space, Select, Tag } from "antd";
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
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={handleOk}
      confirmLoading={sending}
      okText={
        <Space>
          <SendOutlined />
          Send {docLabel}
        </Space>
      }
      okButtonProps={{ style: { background: C.primary, borderColor: C.primary } }}
      title={
        <Space>
          <MailOutlined style={{ color: C.primary }} />
          <span>Send {docLabel} via Email</span>
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
          <Input.TextArea
            rows={3}
            placeholder="Please find your document attached."
          />
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
  const [documentType, setDocumentType] = useState<
    "bill" | "receipt" | "invoice" | "quotation"
  >("bill");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const storedTenant = localStorage.getItem("tenant");
  const tenant = storedTenant ? JSON.parse(storedTenant) : null;
  const isElectronicsStore = tenant?.business_type?.name === "Electronics";

  const {
    BRAND_NAME1,
    EMAIL_URL,
    PIN,
    PHONE_NO,
    QR_Code,
    Paybill_bs,
    Paybill_ac,
    TILL_NO,
  } = useSystemDetails();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
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
          color: black !important;
          font-weight: bold !important;
        }
      }
    `,
  });

  // Get document type label and color
  const getDocumentTypeConfig = () => {
    switch (documentType) {
      case "receipt":
        return {
          label: "RECEIPT",
          color: "#52c41a",
          icon: <FileTextOutlined />,
          amountLabel: "Amount Paid",
        };
      case "invoice":
        return {
          label: "INVOICE",
          color: "#1890ff",
          icon: <ReconciliationOutlined />,
          amountLabel: "Amount Due",
        };
      case "quotation":
        return {
          label: "QUOTATION",
          color: "#fa8c16",
          icon: <DollarOutlined />,
          amountLabel: "Total Estimate",
        };
      default:
        return {
          label: "BILL",
          color: "#722ed1",
          icon: <FileTextOutlined />,
          amountLabel: "Amount Due",
        };
    }
  };

  const docConfig = getDocumentTypeConfig();

  // ── Email send ─────────────────────────────────────────────────────────────
  const handleSendEmail = async (values: SendEmailValues) => {
    setSending(true);
    try {
      const htmlTable = refToHtmlString(componentRef);
      const fmtAmt = (n: number) =>
        `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
      const ok = await sendEmail({
        to: values.to,
        recipientName:
          values.recipientName ??
          cartDetails?.client_name ??
          cartDetails?.clientName ??
          undefined,
        intro: values.intro,
        cc: values.cc,
        subject: `${docConfig.label} — ${cartDetails?.order_no ?? "Order"}`,
        bannerLabel: `${docConfig.label} — ${cartDetails?.order_no ?? ""}`,
        bannerType: "Sales",
        summary: [
          { label: "Subtotal", value: fmtAmt(subtotal), color: C.primary },
          { label: "VAT", value: fmtAmt(totalVatAmount), color: "#6366f1" },
          {
            label: docConfig.amountLabel,
            value: fmtAmt(grandTotal),
            color: "#10b981",
          },
        ],
        htmlTable,
        outro: `Thank you for your ${documentType === "quotation" ? "interest" : "business"
          }!`,
      });
      if (ok) setEmailModalOpen(false);
    } finally {
      setSending(false);
    }
  };

  // Thermal receipt styles
  const baseTextStyle = {
    fontFamily: "monospace",
    fontWeight: 700,
    color: "#000000",
  };

  const headerStyle = {
    ...baseTextStyle,
    fontSize: "1.4em",
    fontWeight: 900,
  };

  const subheaderStyle = {
    ...baseTextStyle,
    fontSize: "1.2em",
    fontWeight: 800,
  };

  const normalTextStyle = {
    ...baseTextStyle,
    fontSize: "1.1em",
  };

  const tableHeaderStyle = {
    padding: 1,
    fontWeight: 900,
    fontSize: "1.2em",
    color: "#000000",
  };

  const tableDataStyle = {
    padding: 1,
    fontWeight: 700,
    fontSize: "1.1em",
    color: "#000000",
  };

  const warrantyStyle = {
    ...subheaderStyle,
    textAlign: "center",
    border: "2px solid #000",
    padding: "8px",
    margin: "10px 0",
    backgroundColor: "#f9f9f9",
    fontWeight: 900,
  };

  // PDF A4 styles
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

  const pdfWarrantyStyle = {
    textAlign: "center",
    border: "3px solid #000",
    padding: "15px",
    margin: "20px 0",
    backgroundColor: "#fff9e6",
    fontWeight: 700,
    fontSize: "18px",
    borderRadius: "8px",
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
            submitText: isPdfView ? "Save as PDF" : "Print Document",
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
          direction="vertical"
          style={{
            marginBottom: 20,
            width: "100%",
          }}
        >
          {/* Document Type Selector */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
              paddingBottom: 2,
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <Typography variant="body1" style={{ fontWeight: 600, margin: 0 }}>
              Document Type:
            </Typography>
            <Select
              value={documentType}
              onChange={(value) => setDocumentType(value)}
              style={{ width: 200 }}
              options={[
                {
                  label: "Bill",
                  value: "bill",
                  icon: <FileTextOutlined />,
                },
                {
                  label: "Receipt",
                  value: "receipt",
                  icon: <FileTextOutlined />,
                },
                {
                  label: "Invoice",
                  value: "invoice",
                  icon: <ReconciliationOutlined />,
                },
                {
                  label: "Quotation",
                  value: "quotation",
                  icon: <DollarOutlined />,
                },
              ]}
            />
            <Tag
              color={docConfig.color}
              style={{ fontSize: 14, padding: "4px 12px" }}
            >
              {docConfig.icon} {docConfig.label}
            </Tag>
          </Box>

          {/* Print Type Toggle */}
          <Space
            direction="horizontal"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              paddingTop: 2,
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
        </Space>

        {/* Thermal Receipt View */}
        {!isPdfView && (
          <div
            className="receipt"
            id="receipt"
            ref={componentRef}
            style={{ color: "#000000" }}
          >
            <div
              className="logo-print"
              style={{
                display: "flex",
                flexDirection: "column",
                marginBottom: 15,
              }}
            >
              <Typography variant="body1" style={headerStyle}>
                {BRAND_NAME1}
              </Typography>
              <Typography
                variant="body1"
                style={{
                  ...headerStyle,
                  textAlign: "center",
                  fontSize: "1.6em",
                  marginTop: 5,
                  marginBottom: 5,
                  color: "#000",
                }}
              >
                {docConfig.label}
              </Typography>
              <Typography variant="body1" style={subheaderStyle}>
                Phone: {PHONE_NO}
              </Typography>
              {Paybill_bs ? (
                <>
                  <Typography variant="body1" style={subheaderStyle}>
                    Business No : {Paybill_bs}
                  </Typography>
                  {Paybill_ac && (
                    <Typography variant="body1" style={subheaderStyle}>
                      Account No: {Paybill_ac}
                    </Typography>
                  )}
                </>
              ) : (
                TILL_NO && (
                  <Typography variant="body1" style={subheaderStyle}>
                    Till No: {TILL_NO}
                  </Typography>
                )
              )}
              <Typography variant="body1" style={normalTextStyle}>
                {cartDetails?.clientPin &&
                  `Client Pin: ${cartDetails?.clientPin}`}
              </Typography>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body1" style={subheaderStyle}>
                {cartDetails?.order_no}
              </Typography>
              <Typography variant="body1" style={subheaderStyle}>
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
                marginBottom: "-15px",
              }}
            >
              <Typography variant="body1" style={subheaderStyle}>
                Table: {cartDetails?.table_id?.name}
              </Typography>
              <Typography variant="body1" style={normalTextStyle}>
                Date: {new Date().toLocaleDateString()} {new Date().getHours()}:
                {new Date().getMinutes()}
              </Typography>
            </div>

            <TableContainer sx={{ mt: 3, width: "inherit" }}>
              <Table style={{ tableLayout: "fixed" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...tableHeaderStyle, width: "10%" }}>
                      #
                    </TableCell>
                    <TableCell sx={tableHeaderStyle}>ITEM</TableCell>
                    <TableCell sx={{ ...tableHeaderStyle, textAlign: "right" }}>
                      PRICE(.Ksh)
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data?.map(
                    (item: {
                      _id: React.Key | null | undefined;
                      quantity: any;
                      product_id: {
                        name: any;
                      };
                      price: number;
                    }) => (
                      <TableRow key={item._id}>
                        <TableCell
                          sx={{
                            ...tableDataStyle,
                            width: "5%",
                            textAlign: "left",
                          }}
                        >
                          {item.quantity}
                        </TableCell>
                        <TableCell
                          component="th"
                          scope="row"
                          sx={{
                            ...tableDataStyle,
                            wordWrap: "break-word",
                          }}
                        >
                          {item?.product_id?.name}
                        </TableCell>
                        <TableCell
                          sx={{
                            ...tableDataStyle,
                            textAlign: "right",
                          }}
                        >
                          {item?.price?.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" style={subheaderStyle}>
                  Subtotal:
                </Typography>
                <Typography variant="body1" style={subheaderStyle}>
                  Ksh. {subtotal.toLocaleString()}
                </Typography>
              </div>
              {cartDetails?.discount > 0 && (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Typography variant="body1" style={normalTextStyle}>
                    Discount:
                  </Typography>
                  <Typography variant="body1" style={normalTextStyle}>
                    - Ksh.{" "}
                    {(cartDetails.discount_type === "percentage"
                      ? subtotal * (cartDetails.discount / 100)
                      : cartDetails.discount
                    ).toLocaleString()}
                  </Typography>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" style={normalTextStyle}>
                  VAT:
                </Typography>
                <Typography variant="body1" style={normalTextStyle}>
                  Ksh. {totalVatAmount.toLocaleString()}
                </Typography>
              </div>
              <div
                style={{ borderTop: "2px dashed #000", margin: "5px 0" }}
              ></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" style={headerStyle}>
                  {docConfig.amountLabel}:
                </Typography>
                <Typography variant="body1" style={headerStyle}>
                  Ksh. {grandTotal.toLocaleString()}
                </Typography>
              </div>
            </div>
            {isElectronicsStore && documentType !== "quotation" && (
              <>
                <div style={{ margin: "15px 0" }}>
                  <Typography variant="body1" style={warrantyStyle}>
                    <SafetyCertificateFilled /> WARRANTY: 6 MONTHS{" "}
                    <SafetyCertificateFilled />
                  </Typography>
                </div>
                <div style={{ margin: "10px 0" }}>
                  <Typography
                    variant="body1"
                    style={{ ...normalTextStyle, textAlign: "center" }}
                  >
                    * This receipt serves as your warranty certificate *
                  </Typography>
                  <Typography
                    variant="body1"
                    style={{ ...normalTextStyle, textAlign: "center" }}
                  >
                    * Please retain for warranty claims *
                  </Typography>
                </div>
              </>
            )}

            {documentType === "quotation" && (
              <div style={{ margin: "15px 0" }}>
                <Typography
                  variant="body1"
                  style={{ ...normalTextStyle, textAlign: "center" }}
                >
                  * This quotation is valid for 30 days *
                </Typography>
                <Typography
                  variant="body1"
                  style={{ ...normalTextStyle, textAlign: "center" }}
                >
                  * Prices subject to change without notice *
                </Typography>
              </div>
            )}

            <Typography
              variant="body1"
              sx={{
                textAlign: "center",
                fontWeight: 900,
                marginTop: isElectronicsStore ? 0 : 5,
              }}
            >
              ===========================
            </Typography>
            <div
              className="qrcoded"
              style={{
                marginTop: 4,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <QRCodeCanvas value={QR_Code} size={100} className="qrcode" />
            </div>
            <Typography
              variant="body1"
              style={{
                ...subheaderStyle,
                textAlign: "center",
                marginTop: 10,
              }}
            >
              Thank you for your{" "}
              {documentType === "quotation" ? "interest" : "support"}!
            </Typography>
            <Typography
              variant="body1"
              style={{
                ...normalTextStyle,
                textAlign: "center",
              }}
            >
              Info email: {EMAIL_URL}
            </Typography>
            <Typography
              variant="body1"
              style={{
                ...normalTextStyle,
                textAlign: "center",
              }}
            >
              Generated on {new Date().toLocaleDateString()}
            </Typography>
            <Typography
              variant="body1"
              style={{
                ...normalTextStyle,
                textAlign: "center",
              }}
            >
              Powered By Relia Tech Solutions
            </Typography>
          </div>
        )}

        {/* PDF A4 View */}
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
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 2,
                }}
              >
                <Typography
                  variant="h3"
                  style={{
                    ...pdfHeaderStyle,
                  }}
                >
                  {BRAND_NAME1}
                </Typography>
                <Box
                  sx={{
                    backgroundColor: docConfig.color,
                    color: "#fff",
                    padding: "8px 20px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  {docConfig.icon}
                  <Typography
                    variant="h5"
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "#fff",
                      margin: 0,
                    }}
                  >
                    {docConfig.label}
                  </Typography>
                </Box>
              </Box>
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
                  {Paybill_bs ? (
                    <>
                      <Typography variant="body1" style={pdfNormalTextStyle}>
                        Business No: {Paybill_bs}
                      </Typography>
                      {Paybill_ac && (
                        <Typography variant="body1" style={pdfNormalTextStyle}>
                          Account No: {Paybill_ac}
                        </Typography>
                      )}
                    </>
                  ) : (
                    TILL_NO && (
                      <Typography variant="body1" style={pdfNormalTextStyle}>
                        Till No: {TILL_NO}
                      </Typography>
                    )
                  )}
                  {cartDetails?.clientPin && (
                    <Typography variant="body1" style={pdfNormalTextStyle}>
                      Client Pin: {cartDetails?.clientPin}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <QRCodeCanvas value={QR_Code} size={120} />
                </Box>
              </Box>
            </Box>

            {/* Order Details */}
            <Box sx={{ marginBottom: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 1,
                }}
              >
                <Typography variant="body1" style={pdfSubheaderStyle}>
                  {documentType === "quotation" ? "Quote" : "Order"} No:{" "}
                  {cartDetails?.order_no}
                </Typography>
                <Typography variant="body1" style={pdfNormalTextStyle}>
                  Date: {new Date().toLocaleDateString()}{" "}
                  {new Date().getHours()}:{new Date().getMinutes()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" style={pdfNormalTextStyle}>
                  Table: {cartDetails?.table_id?.name}
                </Typography>
                <Typography variant="body1" style={pdfNormalTextStyle}>
                  Served By: {cartDetails?.created_by?.username}
                </Typography>
              </Box>
            </Box>

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
                  {data?.map(
                    (item: {
                      _id: React.Key | null | undefined;
                      quantity: any;
                      product_id: {
                        name: any;
                      };
                      price: number;
                    }) => (
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
                    )
                  )}
                </TableBody>
              </Table>
            </TableContainer>

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
                  Ksh. {subtotal.toLocaleString()}
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
                    Discount:
                  </Typography>
                  <Typography
                    variant="body1"
                    style={{ ...pdfNormalTextStyle, color: "#d32f2f" }}
                  >
                    - Ksh.{" "}
                    {(cartDetails.discount_type === "percentage"
                      ? subtotal * (cartDetails.discount / 100)
                      : cartDetails.discount
                    ).toLocaleString()}
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
                  VAT:
                </Typography>
                <Typography variant="body1" style={pdfNormalTextStyle}>
                  Ksh. {totalVatAmount.toLocaleString()}
                </Typography>
              </Box>
              <Divider sx={{ my: 1, borderColor: "#333", borderWidth: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography
                  variant="h5"
                  style={{ ...pdfHeaderStyle, fontSize: "22px" }}
                >
                  {docConfig.amountLabel}:
                </Typography>
                <Typography
                  variant="h5"
                  style={{ ...pdfHeaderStyle, fontSize: "22px" }}
                >
                  Ksh. {grandTotal.toLocaleString()}
                </Typography>
              </Box>
            </Box>

            {/* Warranty Section for Electronics (not for quotations) */}
            {isElectronicsStore && documentType !== "quotation" && (
              <Box sx={{ marginTop: 4, marginBottom: 3 }}>
                <Typography variant="body1" style={pdfWarrantyStyle}>
                  <SafetyCertificateFilled style={{ marginRight: 8 }} />
                  WARRANTY: 6 MONTHS
                  <SafetyCertificateFilled style={{ marginLeft: 8 }} />
                </Typography>
                <Box sx={{ textAlign: "center", marginTop: 2 }}>
                  <Typography variant="body1" style={pdfNormalTextStyle}>
                    This receipt serves as your warranty certificate
                  </Typography>
                  <Typography variant="body1" style={pdfNormalTextStyle}>
                    Please retain for warranty claims
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Quotation Terms */}
            {documentType === "quotation" && (
              <Box
                sx={{
                  marginTop: 4,
                  marginBottom: 3,
                  backgroundColor: "#fffbe6",
                  border: "2px solid #faad14",
                  borderRadius: "8px",
                  padding: 2,
                }}
              >
                <Typography
                  variant="body1"
                  style={{
                    ...pdfSubheaderStyle,
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  Quotation Terms & Conditions
                </Typography>
                <Typography
                  variant="body1"
                  style={{ ...pdfNormalTextStyle, marginBottom: 4 }}
                >
                  • This quotation is valid for 30 days from the date of issue
                </Typography>
                <Typography
                  variant="body1"
                  style={{ ...pdfNormalTextStyle, marginBottom: 4 }}
                >
                  • Prices are subject to change without prior notice
                </Typography>
                <Typography
                  variant="body1"
                  style={{ ...pdfNormalTextStyle, marginBottom: 4 }}
                >
                  • Final pricing may vary based on product availability
                </Typography>
              </Box>
            )}

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
                Thank you for your{" "}
                {documentType === "quotation" ? "interest" : "business"}!
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
        docLabel={docConfig.label}
      />
    </>
  );
};

export default PrintBillModal;