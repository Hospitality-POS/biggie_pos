import React, { useRef, useEffect, useState } from "react";
import { Modal, Typography, Button, Spin, Switch, Space } from "antd";
import {
  PrinterOutlined,
  CloseOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import moment from "moment";
import {
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Box,
} from "@mui/material";
import { useAppSelector } from "../../store";
import { COOP_NAME } from "@utils/config";
import useSystemDetails from "@hooks/useSystemDetails";
import NubaLoader from "@components/spinner/NubaLoader";
import "@components/MODALS/bill.css";

// Color palette
const colors = {
  primary: "#6c1c2c",
  secondary: "#bc8c7c",
  tableHeader: "#f0f0f0",
  tableBorder: "#ddd",
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

// Inject CSS for thermal printer compatibility
const injectThermalPrintCSS = () => {
  const styleId = "thermal-print-styles-delivery-report";

  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement("style");
    styleElement.id = styleId;
    styleElement.innerHTML = `
      @media print {
        .receipt {
          width: 80mm;
          font-family: 'Courier New', monospace;
          color: #000000 !important;
          font-weight: bold !important;
        }

        .ant-modal-header,
        .ant-modal-footer,
        .ant-modal-close {
          display: none !important;
        }

        .MuiTypography-root {
          color: #000000 !important;
          font-weight: bold !important;
        }

        .MuiTableCell-root {
          border: 1px solid #000 !important;
          padding: 4px !important;
          color: #000000 !important;
          font-weight: bold !important;
          font-size: 12px !important;
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }

        .MuiTableHead-root .MuiTableCell-root {
          background-color: #f0f0f0 !important;
        }

        * {
          overflow: visible !important;
          white-space: normal !important;
        }

        .MuiTable-root {
          width: 100% !important;
          table-layout: fixed !important;
        }

        @page {
          size: 80mm auto;
          margin: 0mm;
        }
      }

      .MuiTableCell-root {
        color: #000000;
        font-weight: bold;
      }

      .MuiTableHead-root .MuiTableCell-root {
        background-color: ${colors.tableHeader};
      }

      .receipt {
        max-width: 100%;
        padding: 24px;
        color: #000000;
        font-weight: bold;
      }
    `;
    document.head.appendChild(styleElement);
  }
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function calcTotalCost(data: any[]): number {
  return (
    data?.reduce((acc: number, item: any) => {
      return acc + (Number(item.supplier_price) || 0) * Number(item.quantity);
    }, 0) || 0
  );
}

// ─── Thermal Content ──────────────────────────────────────────────────────────

const ThermalContent = React.forwardRef<
  HTMLDivElement,
  {
    data: any[];
    startDate: any;
    endDate: any;
    BRAND_NAME1: string;
    totalCost: number;
  }
>(({ data, startDate, endDate, BRAND_NAME1, totalCost }, ref) => (
  <div
    ref={ref}
    className="receipt"
    id="receipt"
    style={{ padding: 24, color: colors.darkText, fontWeight: "bold" }}
  >
    <div className="logo-print" style={{ display: "flex", flexDirection: "column" }}>
      <Typography.Title
        level={3}
        style={{
          textAlign: "center",
          marginBottom: 8,
          color: colors.darkText,
          fontWeight: "bold",
          fontFamily: "monospace",
        }}
      >
        {BRAND_NAME1}
      </Typography.Title>
      <Typography.Title
        level={4}
        style={{
          textAlign: "center",
          marginBottom: 16,
          color: colors.darkText,
          fontWeight: "bold",
          fontFamily: "monospace",
        }}
      >
        DELIVERY REPORT
      </Typography.Title>
    </div>

    <p style={{ textAlign: "center", fontFamily: "monospace" }}>
      From: {moment(startDate).format("MMM-DD-YYYY H:mm A")} <br /> to <br />
      {moment(endDate).format("MMM-DD-YYYY H:mm A")}
    </p>

    <TableContainer sx={{ mt: 2, width: "inherit", mb: 2, overflowX: "visible" }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontSize: "1em", padding: 1, fontWeight: "bold", backgroundColor: colors.tableHeader, borderColor: colors.tableBorder, whiteSpace: "nowrap", width: "40%" }}>
              Item(s)
            </TableCell>
            <TableCell sx={{ fontSize: "1em", padding: 1, fontWeight: "bold", backgroundColor: colors.tableHeader, borderColor: colors.tableBorder, whiteSpace: "nowrap", textAlign: "right", width: "20%" }}>
              Unit(s)
            </TableCell>
            <TableCell sx={{ fontSize: "1em", padding: 1, fontWeight: "bold", backgroundColor: colors.tableHeader, borderColor: colors.tableBorder, whiteSpace: "nowrap", textAlign: "right", width: "20%" }}>
              Qty
            </TableCell>
            <TableCell sx={{ fontSize: "1em", padding: 1, fontWeight: "bold", backgroundColor: colors.tableHeader, borderColor: colors.tableBorder, whiteSpace: "nowrap", textAlign: "right", width: "20%" }}>
              Price
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data?.map((item: any) => (
            <TableRow key={item.inventory_id}>
              <TableCell sx={{ padding: 1, borderColor: colors.tableBorder, fontWeight: "bold", wordBreak: "break-word" }}>
                {item.name}
              </TableCell>
              <TableCell sx={{ padding: 1, borderColor: colors.tableBorder, textAlign: "right" }}>
                {item.uom}
              </TableCell>
              <TableCell sx={{ padding: 1, borderColor: colors.tableBorder, textAlign: "right" }}>
                {item.quantity?.toFixed(1) || 0}
              </TableCell>
              <TableCell sx={{ padding: 1, borderColor: colors.tableBorder, textAlign: "right" }}>
                {item.supplier_price?.toFixed(2) || 0}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell
              colSpan={4}
              sx={{
                fontWeight: "bold",
                textAlign: "center",
                padding: 1,
                borderColor: colors.tableBorder,
                backgroundColor: colors.tableHeader,
              }}
            >
              Total Cost: Ksh. {totalCost.toLocaleString()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>

    <div style={{ textAlign: "center", marginTop: 16 }}>
      <Typography.Text style={{ display: "block", color: colors.darkText, fontSize: "14px", fontWeight: "bold", fontFamily: "monospace" }}>
        Powered by: {COOP_NAME}
      </Typography.Text>
      <Typography.Text style={{ display: "block", color: colors.darkText, fontSize: "12px", fontWeight: "bold", fontFamily: "monospace" }}>
        Generated on {moment().format("MMM/DD/YYYY H:mm A")}
      </Typography.Text>
    </div>
  </div>
));

// ─── PDF A4 Content ───────────────────────────────────────────────────────────

const PdfContent = React.forwardRef<
  HTMLDivElement,
  {
    data: any[];
    startDate: any;
    endDate: any;
    BRAND_NAME1: string;
    totalCost: number;
  }
>(({ data, startDate, endDate, BRAND_NAME1, totalCost }, ref) => {
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

  return (
    <div
      ref={ref}
      style={{
        backgroundColor: "#fff",
        padding: "40px",
        maxWidth: "900px",
        margin: "0 auto",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
      }}
    >
      {/* Header */}
      <Box sx={{ borderBottom: "3px solid #333", pb: 3, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography.Title level={2} style={pdfHeader as any}>
            {BRAND_NAME1}
          </Typography.Title>
          <Box sx={{ backgroundColor: colors.primary, px: 3, py: 1, borderRadius: 2 }}>
            <Typography.Text style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>
              DELIVERY REPORT
            </Typography.Text>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 4 }}>
          <Typography.Text style={pdfNormal}>
            <b>From:</b> {moment(startDate).format("MMM DD, YYYY h:mm A")}
          </Typography.Text>
          <Typography.Text style={pdfNormal}>
            <b>To:</b> {moment(endDate).format("MMM DD, YYYY h:mm A")}
          </Typography.Text>
        </Box>
      </Box>

      {/* Items Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: "1px solid #eee", mb: 4 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...pdfThCell, width: "40%" }}>Item(s)</TableCell>
              <TableCell sx={{ ...pdfThCell, textAlign: "right", width: "15%" }}>Unit(s)</TableCell>
              <TableCell sx={{ ...pdfThCell, textAlign: "right", width: "15%" }}>Qty</TableCell>
              <TableCell sx={{ ...pdfThCell, textAlign: "right", width: "20%" }}>Unit Price</TableCell>
              <TableCell sx={{ ...pdfThCell, textAlign: "right", width: "20%" }}>Line Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((item: any) => {
              const lineTotal =
                (Number(item.supplier_price) || 0) * Number(item.quantity);
              return (
                <TableRow key={item.inventory_id} hover>
                  <TableCell sx={{ ...pdfTdCell, fontWeight: 600 }}>{item.name}</TableCell>
                  <TableCell sx={{ ...pdfTdCell, textAlign: "right" }}>{item.uom}</TableCell>
                  <TableCell sx={{ ...pdfTdCell, textAlign: "right" }}>
                    {item.quantity?.toFixed(1) || 0}
                  </TableCell>
                  <TableCell sx={{ ...pdfTdCell, textAlign: "right" }}>
                    {formatCurrency(item.supplier_price || 0)}
                  </TableCell>
                  <TableCell sx={{ ...pdfTdCell, textAlign: "right" }}>
                    {formatCurrency(lineTotal)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary */}
      <Box
        sx={{
          ml: "auto",
          maxWidth: "320px",
          p: 2,
          backgroundColor: "#f9f9f9",
          borderRadius: 2,
          border: "1px solid #eee",
        }}
      >
        <Divider sx={{ my: 1, borderColor: "#ccc" }} />
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography.Text style={{ ...pdfSub, fontSize: "16px" }}>
            Total Cost:
          </Typography.Text>
          <Typography.Text style={{ ...pdfSub, fontSize: "16px" }}>
            {formatCurrency(totalCost)}
          </Typography.Text>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ borderTop: "2px solid #ddd", pt: 3, mt: 4, textAlign: "center" }}>
        <Typography.Text style={{ ...pdfSub, display: "block", marginBottom: 4 }}>
          Powered by: {COOP_NAME}
        </Typography.Text>
        <Typography.Text style={{ ...pdfNormal, display: "block", color: "#666" }}>
          Generated on {moment().format("MMM DD, YYYY h:mm A")}
        </Typography.Text>
      </Box>
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

interface DeliveryReportProps {
  openM: boolean;
  onCloseM: () => void;
  startDate: any;
  endDate: any;
}

const DeliveryReportModal: React.FC<DeliveryReportProps> = ({
  openM,
  onCloseM,
  startDate,
  endDate,
}) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const { BRAND_NAME1 } = useSystemDetails();
  const [isPdfView, setIsPdfView] = useState(false);

  const { deliveryReport: data, loading, error } = useAppSelector(
    (state) => state.Report
  );

  useEffect(() => {
    injectThermalPrintCSS();
  }, []);

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

  const totalCost = calcTotalCost(data);
  const sharedProps = { data, startDate, endDate, BRAND_NAME1, totalCost };

  if (error) return null;

  if (loading) {
    return (
      <Spin
        size="large"
        fullscreen
        indicator={<NubaLoader />}
        tip="Generating Delivery Report, please wait..."
      />
    );
  }

  return (
    <Modal
      open={openM}
      onCancel={onCloseM}
      width={isPdfView ? 1100 : 1000}
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: "calc(100vh - 150px)", overflowY: "auto" }}
      footer={[
        <Button
          key="print"
          type="primary"
          icon={isPdfView ? <FilePdfOutlined /> : <PrinterOutlined />}
          onClick={handlePrint}
          style={{ backgroundColor: colors.primary, borderColor: colors.primary }}
        >
          {isPdfView ? "Save as PDF" : "Print"}
        </Button>,
        <Button key="close" danger icon={<CloseOutlined />} onClick={onCloseM}>
          Close
        </Button>,
      ]}
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
        <Typography.Text strong>Thermal Receipt</Typography.Text>
        <Switch
          checked={isPdfView}
          onChange={(checked) => setIsPdfView(checked)}
          checkedChildren="PDF"
          unCheckedChildren="Thermal"
        />
        <Typography.Text strong>A4 PDF</Typography.Text>
        <FilePdfOutlined style={{ fontSize: 18 }} />
      </Space>

      {isPdfView ? (
        <PdfContent ref={componentRef} {...sharedProps} />
      ) : (
        <ThermalContent ref={componentRef} {...sharedProps} />
      )}
    </Modal>
  );
};

export default DeliveryReportModal;