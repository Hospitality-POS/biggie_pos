import React, { useRef, useState } from "react";
import { ModalForm } from "@ant-design/pro-form";
import { Button, Spin, Switch, Space } from "antd";
import {
  PrinterOutlined,
  PrinterFilled,
  SafetyCertificateFilled,
  FilePdfOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import {
  Typography,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Grid,
  Box,
  Paper,
  Divider,
} from "@mui/material";
import moment from "moment";
import { QRCodeCanvas } from "qrcode.react";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import { useMutation } from "@tanstack/react-query";
import { rePrintInvoice } from "@services/cart";

// Color palette
const colors = {
  primary: "#6c1c2c",
  secondary: "#bc8c7c",
  darkText: "#000000",
};

// Currency formatting utility
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

interface InvoiceItem {
  _id: string;
  product_id: { name: string };
  quantity: number;
  price: number;
  createdAt: string;
  created_by: { fullname: string; username: string };
  table_id: { name: string };
}

// ─── Thermal PrintableContent ─────────────────────────────────────────────────

const ThermalContent = React.forwardRef<
  HTMLDivElement,
  {
    data: InvoiceItem[];
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
>(
  (
    {
      data,
      invoiceData,
      BRAND_NAME1,
      orderNo,
      EMAIL_URL,
      PHONE_NO,
      QR_Code,
      PIN,
      TILL_NO,
      Paybill_bs,
      Paybill_ac,
    },
    ref
  ) => {
    if (!data || data?.length === 0) return <div ref={ref} />;

    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const isElectronicsStore = tenant?.business_type?.name === "Electronics";

    const smallTextStyle = { fontSize: "0.9em", fontWeight: 800 };
    const baseTextStyle = { fontFamily: "monospace", fontWeight: 700, color: colors.darkText };
    const headerStyle = { ...baseTextStyle, fontSize: "1.4em", fontWeight: 900 };
    const subheaderStyle = { ...baseTextStyle, fontSize: "0.9em", fontWeight: 800 };
    const normalTextStyle = { ...baseTextStyle, fontSize: "0.9em" };
    const warrantyStyle = {
      ...subheaderStyle,
      textAlign: "center" as const,
      border: "2px solid #000",
      padding: "8px",
      margin: "10px 0",
      backgroundColor: "#f9f9f9",
      fontWeight: 900,
    };
    const tableHeaderStyle = { padding: 1, fontWeight: 800, fontSize: "1.1em", color: colors.darkText };
    const tableDataStyle = { padding: 1, fontWeight: 700, fontSize: "1.1em", color: colors.darkText };

    const calculatedGrandTotal =
      invoiceData?.grand_total ||
      (invoiceData?.subtotal || 0) + (invoiceData?.total_vat_amount || 0);

    return (
      <div className="receipt" id="receipt" ref={ref} style={{ color: colors.darkText }}>
        <div className="logo-print" style={{ display: "flex", flexDirection: "column", marginBottom: 15 }}>
          <Typography variant="body1" style={headerStyle}>
            {BRAND_NAME1 || ""}
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="body2" style={subheaderStyle}>Phone: {PHONE_NO || "N/A"}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" style={subheaderStyle}>
                {TILL_NO ? `Till No: ${TILL_NO}` : Paybill_bs ? `Business No: ${Paybill_bs}` : "N/A"}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" style={subheaderStyle}>
                {Paybill_ac ? `Account No: ${Paybill_ac}` : "N/A"}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" style={normalTextStyle}>
                {PIN ? `PIN: ${PIN}` : "N/A"}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" style={smallTextStyle}>Invoice Reprint</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" style={smallTextStyle}>
                Order No: {orderNo?.toUpperCase() || "N/A"}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" style={smallTextStyle}>
                Table: {invoiceData?.table_id?.name || "N/A"}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" style={smallTextStyle}>
                Date:{" "}
                {invoiceData?.createdAt
                  ? moment(invoiceData.createdAt).format("MMM-DD-YYYY H:mm A")
                  : "N/A"}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" style={smallTextStyle}>
                Served By: {invoiceData.served_by?.username || "N/A"}
              </Typography>
            </Grid>
          </Grid>
        </div>

        <TableContainer sx={{ mt: 3, width: "inherit" }}>
          <Table style={{ tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ ...tableHeaderStyle, width: "19%" }}>QTY</TableCell>
                <TableCell sx={tableHeaderStyle}>ITEM</TableCell>
                <TableCell sx={{ ...tableHeaderStyle, textAlign: "right" }}>PRICE</TableCell>
                <TableCell sx={{ ...tableHeaderStyle, textAlign: "right" }}>TOTAL</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoiceData.items.map((item) => (
                <TableRow key={item._id}>
                  <TableCell sx={{ ...tableDataStyle, width: "5%", textAlign: "left" }}>
                    {item.quantity || 0}
                  </TableCell>
                  <TableCell component="th" scope="row" sx={{ ...tableDataStyle, wordWrap: "break-word" }}>
                    {item.product_id?.name || "N/A"}
                  </TableCell>
                  <TableCell sx={{ ...tableDataStyle, textAlign: "right" }}>
                    {(item.price || 0).toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ ...tableDataStyle, textAlign: "right" }}>
                    {((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="body1" style={subheaderStyle}>Subtotal:</Typography>
          <Typography variant="body1" style={subheaderStyle}>
            Ksh. {(invoiceData?.subtotal || 0).toLocaleString()}
          </Typography>
        </div>
        {invoiceData?.discount_amount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1" style={normalTextStyle}>Discount:</Typography>
            <Typography variant="body1" style={normalTextStyle}>
              - Ksh. {(invoiceData?.discount_amount || 0).toLocaleString()}
            </Typography>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="body1" style={normalTextStyle}>VAT:</Typography>
          <Typography variant="body1" style={normalTextStyle}>
            Ksh. {(invoiceData?.total_vat_amount || 0).toLocaleString()}
          </Typography>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="body1" style={headerStyle}>Amount Due:</Typography>
          <Typography variant="body1" style={headerStyle}>
            Ksh. {calculatedGrandTotal.toLocaleString()}
          </Typography>
        </div>

        {isElectronicsStore && (
          <>
            <div style={{ margin: "15px 0" }}>
              <Typography variant="body1" style={warrantyStyle}>
                <SafetyCertificateFilled /> WARRANTY: 6 MONTHS <SafetyCertificateFilled />
              </Typography>
            </div>
            <div style={{ margin: "10px 0" }}>
              <Typography variant="body1" style={{ ...normalTextStyle, textAlign: "center" }}>
                * This receipt serves as your warranty certificate *
              </Typography>
              <Typography variant="body1" style={{ ...normalTextStyle, textAlign: "center" }}>
                * Please retain for warranty claims *
              </Typography>
            </div>
          </>
        )}

        <Typography variant="body1" sx={{ textAlign: "center", fontWeight: 900, margin: "15px 0" }}>
          ===========================
        </Typography>

        {QR_Code && (
          <div className="qrcoded" style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
            <QRCodeCanvas value={QR_Code} size={100} className="qrcode" />
          </div>
        )}

        <Typography variant="body1" style={{ ...subheaderStyle, textAlign: "center", marginTop: 10 }}>
          Thank you for your business!
        </Typography>
        {EMAIL_URL && (
          <Typography variant="body1" style={{ ...normalTextStyle, textAlign: "center" }}>
            Info email: {EMAIL_URL}
          </Typography>
        )}
        <Typography variant="body1" style={{ ...normalTextStyle, textAlign: "center" }}>
          Generated on {new Date().toLocaleDateString()}
        </Typography>
        <Typography variant="body1" style={{ ...normalTextStyle, textAlign: "center" }}>
          Powered By: {COOP_NAME || ""}
        </Typography>
      </div>
    );
  }
);

// ─── PDF A4 Content ───────────────────────────────────────────────────────────

const PdfContent = React.forwardRef<
  HTMLDivElement,
  {
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
>(
  (
    {
      invoiceData,
      BRAND_NAME1,
      orderNo,
      EMAIL_URL,
      PHONE_NO,
      QR_Code,
      PIN,
      TILL_NO,
      Paybill_bs,
      Paybill_ac,
    },
    ref
  ) => {
    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    const isElectronicsStore = tenant?.business_type?.name === "Electronics";

    const pdfBase = { fontFamily: "'Segoe UI', Roboto, sans-serif", color: "#333" };
    const pdfHeader = { ...pdfBase, fontSize: "26px", fontWeight: 700, color: "#1a1a1a" };
    const pdfSub = { ...pdfBase, fontSize: "15px", fontWeight: 600, color: "#444" };
    const pdfNormal = { ...pdfBase, fontSize: "13px", fontWeight: 400 };

    const pdfThCell = {
      padding: "10px 8px",
      fontWeight: 700,
      fontSize: "14px",
      color: "#1a1a1a",
      backgroundColor: "#f5f5f5",
      borderBottom: "2px solid #ddd",
    };

    const pdfTdCell = {
      padding: "8px",
      fontSize: "13px",
      color: "#333",
      borderBottom: "1px solid #eee",
    };

    const calculatedGrandTotal =
      invoiceData?.grand_total ||
      (invoiceData?.subtotal || 0) + (invoiceData?.total_vat_amount || 0);

    return (
      <div
        ref={ref}
        style={{
          backgroundColor: "#fff",
          padding: "40px",
          maxWidth: "900px",
          margin: "0 auto",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          fontFamily: "'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* Header */}
        <Box sx={{ borderBottom: "3px solid #333", pb: 3, mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <div>
              <div style={{ ...pdfHeader, lineHeight: 1.2 }}>{BRAND_NAME1}</div>
              <div style={{ ...pdfNormal, color: "#666", marginTop: 4 }}>
                Powered by: {COOP_NAME}
              </div>
            </div>
            <Box sx={{ textAlign: "right" }}>
              <Box sx={{ backgroundColor: colors.primary, color: "#fff", px: 3, py: 1, borderRadius: 2, mb: 1 }}>
                <span style={{ fontWeight: 700, fontSize: 18 }}>INVOICE REPRINT</span>
              </Box>
              {QR_Code && <QRCodeCanvas value={QR_Code} size={80} />}
            </Box>
          </Box>

          {/* Business info + order info in two columns */}
          <Box sx={{ display: "flex", gap: 4 }}>
            <Box sx={{ flex: 1 }}>
              <div style={pdfSub}>Business Details</div>
              <div style={pdfNormal}>Phone: {PHONE_NO || "N/A"}</div>
              {TILL_NO && <div style={pdfNormal}>Till No: {TILL_NO}</div>}
              {Paybill_bs && <div style={pdfNormal}>Business No: {Paybill_bs}</div>}
              {Paybill_ac && <div style={pdfNormal}>Account No: {Paybill_ac}</div>}
              {PIN && <div style={pdfNormal}>PIN: {PIN}</div>}
              {EMAIL_URL && <div style={pdfNormal}>Email: {EMAIL_URL}</div>}
            </Box>
            <Box sx={{ flex: 1 }}>
              <div style={pdfSub}>Invoice Details</div>
              <div style={pdfNormal}>Order No: <strong>{orderNo?.toUpperCase() || "N/A"}</strong></div>
              <div style={pdfNormal}>Table: {invoiceData?.table_id?.name || "N/A"}</div>
              <div style={pdfNormal}>
                Date:{" "}
                {invoiceData?.createdAt
                  ? moment(invoiceData.createdAt).format("MMM DD, YYYY h:mm A")
                  : "N/A"}
              </div>
              <div style={pdfNormal}>Served By: {invoiceData.served_by?.username || "N/A"}</div>
            </Box>
          </Box>
        </Box>

        {/* Items Table */}
        <Box component={Paper} elevation={0} sx={{ border: "1px solid #eee", mb: 4 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...pdfThCell, width: "10%", textAlign: "center" }}>QTY</th>
                <th style={{ ...pdfThCell, textAlign: "left" }}>ITEM</th>
                <th style={{ ...pdfThCell, textAlign: "right" }}>UNIT PRICE</th>
                <th style={{ ...pdfThCell, textAlign: "right" }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map((item, i) => (
                <tr key={item._id} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ ...pdfTdCell, textAlign: "center" }}>{item.quantity || 0}</td>
                  <td style={{ ...pdfTdCell, fontWeight: 600 }}>{item.product_id?.name || "N/A"}</td>
                  <td style={{ ...pdfTdCell, textAlign: "right" }}>{formatCurrency(item.price || 0)}</td>
                  <td style={{ ...pdfTdCell, textAlign: "right" }}>
                    {formatCurrency((item.price || 0) * (item.quantity || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>

        {/* Totals */}
        <Box
          sx={{
            ml: "auto",
            maxWidth: "380px",
            p: 2,
            backgroundColor: "#f9f9f9",
            borderRadius: 2,
            border: "1px solid #eee",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <span style={pdfNormal}>Subtotal:</span>
            <span style={pdfNormal}>{formatCurrency(invoiceData?.subtotal || 0)}</span>
          </Box>
          {invoiceData?.discount_amount > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <span style={{ ...pdfNormal, color: "#d32f2f" }}>Discount:</span>
              <span style={{ ...pdfNormal, color: "#d32f2f" }}>
                - {formatCurrency(invoiceData?.discount_amount || 0)}
              </span>
            </Box>
          )}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <span style={pdfNormal}>VAT:</span>
            <span style={pdfNormal}>{formatCurrency(invoiceData?.total_vat_amount || 0)}</span>
          </Box>
          <Divider sx={{ my: 1, borderColor: "#ccc" }} />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ ...pdfSub, fontSize: "16px" }}>Amount Due:</span>
            <span style={{ ...pdfSub, fontSize: "16px" }}>{formatCurrency(calculatedGrandTotal)}</span>
          </Box>
        </Box>

        {/* Warranty — Electronics only */}
        {isElectronicsStore && (
          <Box
            sx={{
              mt: 4,
              border: "3px solid #000",
              borderRadius: 2,
              p: 2,
              textAlign: "center",
              backgroundColor: "#fff9e6",
            }}
          >
            <div style={{ ...pdfSub, fontSize: "18px" }}>
              <SafetyCertificateFilled style={{ marginRight: 8 }} />
              WARRANTY: 6 MONTHS
              <SafetyCertificateFilled style={{ marginLeft: 8 }} />
            </div>
            <div style={{ ...pdfNormal, marginTop: 8 }}>
              This receipt serves as your warranty certificate. Please retain for warranty claims.
            </div>
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ borderTop: "2px solid #ddd", pt: 3, mt: 4, textAlign: "center" }}>
          <div style={{ ...pdfSub, marginBottom: 4 }}>Thank you for your business!</div>
          <div style={{ ...pdfNormal, color: "#666" }}>
            Generated on {new Date().toLocaleDateString()}
          </div>
        </Box>
      </div>
    );
  }
);

// ─── Main Component ───────────────────────────────────────────────────────────

function InvoiceReprintModal({
  invoiceId,
  orderNo,
  invoiceData,
}: InvoiceReprintModalProps) {
  const componentRef = useRef<HTMLDivElement>(null);
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
  const [data, setData] = useState<InvoiceItem[] | null>(null);
  const [isPdfView, setIsPdfView] = useState(false);

  const reprintMutation = useMutation(rePrintInvoice, {
    onSuccess: (data) => setData(data),
    onError: (error) => console.log(error),
  });

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    pageStyle: isPdfView
      ? `
        @page { size: A4; margin: 20mm; }
        @media print {
          * {
            color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body { margin: 0; padding: 0; }
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

  const canPrint = data && data?.length > 0;

  const sharedProps = {
    invoiceData,
    BRAND_NAME1,
    orderNo,
    EMAIL_URL,
    PHONE_NO,
    QR_Code,
    PIN,
    TILL_NO,
    Paybill_bs,
    Paybill_ac,
  };

  return (
    <ModalForm
      className="receiptM"
      modalProps={{
        centered: true,
        destroyOnClose: true,
        cancelText: "Cancel",
        okText: isPdfView ? "Save as PDF" : "Reprint Invoice",
        okButtonProps: {
          icon: isPdfView ? <FilePdfOutlined /> : <PrinterFilled />,
          disabled: reprintMutation.isLoading || !canPrint,
          style: { backgroundColor: colors.primary, borderColor: colors.primary },
        },
        width: isPdfView ? 1100 : 700,
        bodyStyle: { maxHeight: "calc(100vh - 150px)", overflowY: "auto" },
      }}
      trigger={
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          style={{ backgroundColor: colors.primary, borderColor: colors.primary }}
          onClick={() => reprintMutation.mutate(invoiceId)}
        >
          {reprintMutation.isLoading ? "Loading..." : "Reprint Invoice"}
        </Button>
      }
      onFinish={async () => {
        if (canPrint) handlePrint();
        return true;
      }}
    >
      {/* Thermal / PDF Toggle */}
      <Space
        direction="horizontal"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <PrinterOutlined style={{ fontSize: 18 }} />
        <span style={{ fontWeight: 600 }}>Thermal Receipt</span>
        <Switch
          checked={isPdfView}
          onChange={(checked) => setIsPdfView(checked)}
          checkedChildren="PDF"
          unCheckedChildren="Thermal"
        />
        <span style={{ fontWeight: 600 }}>A4 PDF</span>
        <FilePdfOutlined style={{ fontSize: 18 }} />
      </Space>

      <Spin spinning={reprintMutation.isLoading} tip="Loading invoice data...">
        {data === null ? (
          <div className="text-center p-4">Click the button to load invoice data</div>
        ) : data?.length === 0 ? (
          <div className="text-center p-4">No invoice data found</div>
        ) : isPdfView ? (
          <PdfContent ref={componentRef} {...sharedProps} />
        ) : (
          <ThermalContent ref={componentRef} data={data} {...sharedProps} />
        )}
      </Spin>
    </ModalForm>
  );
}

export default InvoiceReprintModal;