import React, { useRef, useEffect, useState } from "react";
import { Modal, Table, Typography, Button, Spin, Switch, Space } from "antd";
import {
  CloseOutlined,
  PrinterOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { useAppSelector } from "../../store";
import moment from "moment";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import { useReactToPrint } from "react-to-print";
import NubaLoader from "@components/spinner/NubaLoader";
import {
  Box,
  Divider,
  Paper,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

// Color palette
const colors = {
  primary: "#6c1c2c",
  secondary: "#bc8c7c",
  tableHeader: "#F6FFEC",
  tableBorder: "#ddd",
  darkText: "#000000",
};

// Currency formatting utility
const formatCurrency = (amount, options: any = {}) => {
  const {
    currency = "KES",
    showSymbol = true,
    decimals = 2,
    locale = "en-KE",
  } = options;

  const numericAmount = Number(amount) || 0;

  if (showSymbol) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numericAmount);
  } else {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numericAmount);
  }
};

// Inject CSS for thermal printer compatibility
const injectThermalPrintCSS = () => {
  const styleId = "thermal-print-styles-purchase-report";

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

        .ant-typography {
          color: #000000 !important;
          font-weight: bold !important;
        }

        .purchase-report-table {
          width: 100% !important;
          border-collapse: collapse !important;
        }

        .purchase-report-table th,
        .purchase-report-table td {
          border: 1px solid #000 !important;
          padding: 4px !important;
          color: #000000 !important;
          font-weight: bold !important;
          font-size: 12px !important;
        }

        .purchase-report-table th {
          background-color: #f0f0f0 !important;
        }

        .ant-table-summary {
          border-top: 2px solid #000 !important;
        }

        .ant-table-summary td {
          font-weight: bold !important;
          text-align: center !important;
          color: #000000 !important;
        }

        .ant-modal-wrap,
        .ant-modal-mask,
        .ant-modal {
          position: absolute !important;
        }

        .ant-modal-content {
          box-shadow: none !important;
        }

        .ant-modal-body {
          padding: 0 !important;
        }

        @page {
          size: 80mm auto;
          margin: 0mm;
        }
      }

      .purchase-report-table .ant-table-cell {
        color: #000000;
        font-weight: bold;
      }

      .receipt {
        max-width: 100%;
      }
    `;
    document.head.appendChild(styleElement);
  }
};

// ─── Thermal Content ──────────────────────────────────────────────────────────

const ThermalContent = React.forwardRef<
  HTMLDivElement,
  {
    data: any;
    startDate: any;
    endDate: any;
    BRAND_NAME1: string;
    tableData: any[];
    columns: any[];
    summaryItems: { label: string; value: number }[];
  }
>(({ data, startDate, endDate, BRAND_NAME1, tableData, columns, summaryItems }, ref) => (
  <div
    ref={ref}
    style={{ padding: 24, color: "#000000", fontWeight: "bold" }}
    className="receipt"
  >
    {/* Header */}
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <Typography.Title
        level={3}
        style={{ marginBottom: 8, color: colors.darkText, fontWeight: "bold", fontFamily: "monospace" }}
      >
        {BRAND_NAME1}
      </Typography.Title>
      <Typography.Title
        level={4}
        style={{ marginBottom: 16, color: colors.darkText, fontWeight: "bold", fontFamily: "monospace" }}
      >
        PURCHASE REPORT
      </Typography.Title>
      <Typography.Text
        style={{ display: "block", color: colors.darkText, fontSize: 14, fontWeight: "bold", fontFamily: "monospace" }}
      >
        From: {moment(startDate).format("MMM-DD-YYYY h:mm A")}
      </Typography.Text>
      <Typography.Text
        style={{ display: "block", color: colors.darkText, fontSize: 14, fontWeight: "bold", fontFamily: "monospace" }}
      >
        To: {moment(endDate).format("MMM-DD-YYYY h:mm A")}
      </Typography.Text>
    </div>

    {/* Table */}
    <Table
      columns={columns}
      dataSource={tableData}
      pagination={false}
      bordered
      size="small"
      style={{ marginBottom: 24 }}
      summary={() => (
        <Table.Summary>
          {summaryItems.map((item, index) => (
            <Table.Summary.Row key={index}>
              <Table.Summary.Cell
                index={0}
                colSpan={3}
                style={{ textAlign: "center", fontWeight: "bold", color: colors.darkText }}
              >
                {item.label}: {formatCurrency(item.value)}
              </Table.Summary.Cell>
            </Table.Summary.Row>
          ))}
        </Table.Summary>
      )}
      className="purchase-report-table"
    />

    {/* Footer */}
    <div style={{ textAlign: "center", marginTop: 24 }}>
      <Typography.Text
        style={{ display: "block", color: colors.darkText, fontSize: 14, fontWeight: "bold", fontFamily: "monospace" }}
      >
        Powered by: {COOP_NAME}
      </Typography.Text>
      <Typography.Text
        style={{ display: "block", color: colors.darkText, fontSize: 12, fontWeight: "bold", fontFamily: "monospace" }}
      >
        Generated on {moment().format("MMM/DD/YYYY h:mm A")}
      </Typography.Text>
    </div>
  </div>
));

// ─── PDF A4 Content ───────────────────────────────────────────────────────────

const PdfContent = React.forwardRef<
  HTMLDivElement,
  {
    data: any;
    startDate: any;
    endDate: any;
    BRAND_NAME1: string;
    tableData: any[];
    summaryItems: { label: string; value: number }[];
  }
>(({ data, startDate, endDate, BRAND_NAME1, tableData, summaryItems }, ref) => {
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
        <Box
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
        >
          <Typography.Title level={2} style={pdfHeader as any}>
            {BRAND_NAME1}
          </Typography.Title>
          <Box
            sx={{
              backgroundColor: colors.primary,
              color: "#fff",
              px: 3,
              py: 1,
              borderRadius: 2,
            }}
          >
            <Typography.Text style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>
              PURCHASE REPORT
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

      {/* Payment Methods Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: "1px solid #eee", mb: 4 }}
      >
        <MuiTable size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...pdfThCell, width: "10%" }}>NO.</TableCell>
              <TableCell sx={pdfThCell}>PAYMENT METHOD</TableCell>
              <TableCell sx={{ ...pdfThCell, textAlign: "right" }}>AMOUNT</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.key} hover>
                <TableCell sx={pdfTdCell}>{row.index}</TableCell>
                <TableCell sx={{ ...pdfTdCell, fontWeight: 600 }}>{row.name}</TableCell>
                <TableCell sx={{ ...pdfTdCell, textAlign: "right" }}>
                  {formatCurrency(row.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </MuiTable>
      </TableContainer>

      {/* Summary Totals */}
      <Box
        sx={{
          ml: "auto",
          maxWidth: "420px",
          p: 2,
          backgroundColor: "#f9f9f9",
          borderRadius: 2,
          border: "1px solid #eee",
        }}
      >
        {summaryItems.map((item, index) => (
          <React.Fragment key={index}>
            {index === summaryItems.length - 1 && (
              <Divider sx={{ my: 1, borderColor: "#ccc" }} />
            )}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: index < summaryItems.length - 1 ? 1 : 0,
              }}
            >
              <Typography.Text
                style={
                  index === summaryItems.length - 1
                    ? { ...pdfSub, fontSize: "16px" }
                    : pdfNormal
                }
              >
                {item.label}:
              </Typography.Text>
              <Typography.Text
                style={
                  index === summaryItems.length - 1
                    ? { ...pdfSub, fontSize: "16px" }
                    : pdfNormal
                }
              >
                {formatCurrency(item.value)}
              </Typography.Text>
            </Box>
          </React.Fragment>
        ))}
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

interface PurchaseReportProps {
  openM: boolean;
  onCloseM: () => void;
  startDate: any;
  endDate: any;
}

const PurchaseReportModal: React.FC<PurchaseReportProps> = ({
  openM,
  onCloseM,
  startDate,
  endDate,
}) => {
  const { BRAND_NAME1 } = useSystemDetails();
  const componentRef = useRef<HTMLDivElement>(null);
  const [isPdfView, setIsPdfView] = useState(false);

  const { purchaseReport: data, loading } = useAppSelector(
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

  // Table columns (for thermal view)
  const columns = [
    { title: "NO.", dataIndex: "index", key: "index", width: 60 },
    { title: "PAYMENT METHOD", dataIndex: "name", key: "name" },
    {
      title: "AMOUNT",
      dataIndex: "amount",
      key: "amount",
      align: "right" as const,
      render: (value: number) => formatCurrency(value),
    },
  ];

  const tableData =
    data?.payment_methods?.map((item: any, index: number) => ({
      key: index,
      index: index + 1,
      name: item.name || "N/A",
      amount: Number(item.amount || 0),
    })) || [];

  const summaryItems = [
    { label: "Overall Total", value: Number(data?.totalCost || 0) },
    { label: "Overall Discount", value: Number(data?.totalDiscountAmount || 0) },
    {
      label: "Overall Inclusive Discount",
      value: Number(data?.totalInclusiveDiscount || 0),
    },
  ];

  const sharedProps = {
    data,
    startDate,
    endDate,
    BRAND_NAME1,
    tableData,
    summaryItems,
  };

  if (loading) {
    return (
      <Spin
        size="large"
        spinning={true}
        indicator={<NubaLoader />}
        tip="Generating Purchase report. Please wait..."
      />
    );
  }

  return (
    <Modal
      open={openM}
      onCancel={onCloseM}
      width={isPdfView ? 1000 : 800}
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
        <ThermalContent
          ref={componentRef}
          columns={columns}
          {...sharedProps}
        />
      )}
    </Modal>
  );
};

export default PurchaseReportModal;