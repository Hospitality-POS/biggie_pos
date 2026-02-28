import React, { useRef, useMemo, forwardRef, useEffect, useState } from "react";
import { ModalForm } from "@ant-design/pro-form";
import { Typography, Button, Spin, Switch, Space } from "antd";
import { PrinterOutlined, PrinterFilled, FilePdfOutlined } from "@ant-design/icons";
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
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import "@components/MODALS/bill.css";

// Color palette
const colors = {
  primary: "#6c1c2c",
  secondary: "#bc8c7c",
  tableHeader: "#F6FFEC",
  tableBorder: "#ddd",
  darkText: "#000000",
};

// Currency formatting utility
const formatCurrency = (amount, options = {}) => {
  const {
    currency = "KES",
    showSymbol = true,
    decimals = 2,
    locale = "en-KE",
  } = options as any;

  const numericAmount = Number(amount) || 0;

  if (showSymbol) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
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
  const styleId = "thermal-print-styles-item-sales";

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
        
        .nested-table .MuiTableCell-root {
          font-size: 10px !important;
          padding: 2px !important;
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
    `;
    document.head.appendChild(styleElement);
  }
};

// ─── Thermal PrintableContent ────────────────────────────────────────────────

const ThermalContent = forwardRef(
  (
    {
      data,
      startDate,
      endDate,
      BRAND_NAME1,
      overallTotal,
      overallSupplierTotal,
      totalCommissionAmount,
      COOP_NAME,
      customerName,
    }: any,
    ref
  ) => (
    <div className="receipt" id="receipt" ref={ref as any}>
      <div
        className="logo-print"
        style={{ display: "flex", flexDirection: "column" }}
      >
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
            marginBottom: customerName ? 4 : 16,
            color: colors.darkText,
            fontWeight: "bold",
            fontFamily: "monospace",
          }}
        >
          ITEM SALES REPORT
        </Typography.Title>

        {customerName && (
          <Typography.Text
            style={{
              textAlign: "center",
              display: "block",
              marginBottom: 16,
              fontFamily: "monospace",
              fontSize: 13,
              color: colors.darkText,
              fontWeight: "bold",
              borderTop: "1px dashed #000",
              borderBottom: "1px dashed #000",
              padding: "4px 0",
            }}
          >
            Customer: {customerName}
          </Typography.Text>
        )}
      </div>

      <p style={{ textAlign: "center", fontFamily: "monospace" }}>
        From: {moment(startDate).format("MMM-DD-YYYY H:mm A")} <br />
        to <br />
        {moment(endDate).format("MMM-DD-YYYY H:mm A")}
      </p>

      <TableContainer sx={{ mt: 2, width: "inherit", mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontSize: "1em",
                  padding: 1,
                  fontWeight: "bold",
                  backgroundColor: colors.tableHeader,
                  borderColor: colors.tableBorder,
                }}
              >
                Product
              </TableCell>
              <TableCell
                sx={{
                  fontSize: "1em",
                  textAlign: "right",
                  fontWeight: "bold",
                  padding: 1,
                  backgroundColor: colors.tableHeader,
                  borderColor: colors.tableBorder,
                }}
              >
                Amount
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((item) => (
              <React.Fragment key={item.id}>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      padding: 1,
                      borderColor: colors.tableBorder,
                    }}
                  >
                    {item.name}
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "right",
                      fontWeight: "bold",
                      padding: 1,
                      borderColor: colors.tableBorder,
                    }}
                  >
                    {formatCurrency(getTotalAmount(item.orderItems))}
                  </TableCell>
                </TableRow>
                {item.orderItems?.length > 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      sx={{ padding: 0, borderColor: colors.tableBorder }}
                    >
                      <TableContainer sx={{ width: "inherit" }}>
                        <Table className="nested-table">
                          <TableHead>
                            <TableRow>
                              <TableCell
                                sx={{
                                  padding: 1,
                                  width: "15%",
                                  backgroundColor: colors.tableHeader,
                                  borderColor: colors.tableBorder,
                                }}
                              >
                                QTY
                              </TableCell>
                              <TableCell
                                sx={{
                                  padding: 1,
                                  width: "45%",
                                  backgroundColor: colors.tableHeader,
                                  borderColor: colors.tableBorder,
                                }}
                              >
                                ITEM
                              </TableCell>
                              <TableCell
                                sx={{
                                  padding: 1,
                                  width: "20%",
                                  backgroundColor: colors.tableHeader,
                                  borderColor: colors.tableBorder,
                                }}
                              >
                                STOCK COST
                              </TableCell>
                              <TableCell
                                sx={{
                                  padding: 1,
                                  width: "20%",
                                  backgroundColor: colors.tableHeader,
                                  borderColor: colors.tableBorder,
                                }}
                              >
                                PRICE
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {item.orderItems.map((orderItem) => (
                              <TableRow key={orderItem.id}>
                                <TableCell
                                  sx={{
                                    borderBottom: "none",
                                    padding: 1,
                                    borderColor: colors.tableBorder,
                                  }}
                                >
                                  {Number(orderItem.quantity || 0).toFixed(1)}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    borderBottom: "none",
                                    padding: 1,
                                    fontWeight: "bold",
                                    borderColor: colors.tableBorder,
                                  }}
                                >
                                  {orderItem.name}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    borderBottom: "none",
                                    padding: 1,
                                    textAlign: "right",
                                    borderColor: colors.tableBorder,
                                  }}
                                >
                                  {formatCurrency(
                                    (orderItem.supplier_price || 0) *
                                    (orderItem.quantity || 0)
                                  )}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    borderBottom: "none",
                                    padding: 1,
                                    textAlign: "right",
                                    borderColor: colors.tableBorder,
                                  }}
                                >
                                  {formatCurrency(orderItem.amount || 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <div style={{ textAlign: "center", marginTop: 12, marginBottom: 12 }}>
        <span style={{ display: "block", fontWeight: "bold", fontSize: "12px" }}>
          Overall Total: {formatCurrency(overallTotal)}
        </span>
        <span style={{ display: "block", fontWeight: "bold", fontSize: "12px" }}>
          Overall Stock Total: {formatCurrency(overallSupplierTotal)}
        </span>
        <span style={{ display: "block", fontWeight: "bold", fontSize: "12px" }}>
          Overall Commission: {formatCurrency(totalCommissionAmount)}
        </span>
      </div>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Typography.Text
          style={{
            display: "block",
            color: colors.darkText,
            fontSize: "14px",
            fontWeight: "bold",
            fontFamily: "monospace",
          }}
        >
          Powered by: {COOP_NAME}
        </Typography.Text>
        <Typography.Text
          style={{
            display: "block",
            color: colors.darkText,
            fontSize: "12px",
            fontWeight: "bold",
            fontFamily: "monospace",
          }}
        >
          Generated on {moment().format("MMM/DD/YYYY")}
        </Typography.Text>
      </div>
    </div>
  )
);

// ─── PDF A4 Content ──────────────────────────────────────────────────────────

const PdfContent = forwardRef(
  (
    {
      data,
      startDate,
      endDate,
      BRAND_NAME1,
      overallTotal,
      overallSupplierTotal,
      totalCommissionAmount,
      COOP_NAME,
      customerName,
    }: any,
    ref
  ) => {
    const pdfBase = {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      color: "#333",
    };

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

    const summaryRow = (label: string, value: string, bold = false) => (
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: bold ? 0 : 1,
        }}
      >
        <Typography.Text style={bold ? { ...pdfSub, fontSize: "16px" } : pdfNormal}>
          {label}
        </Typography.Text>
        <Typography.Text style={bold ? { ...pdfSub, fontSize: "16px" } : pdfNormal}>
          {value}
        </Typography.Text>
      </Box>
    );

    return (
      <div
        ref={ref as any}
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
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
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
                ITEM SALES REPORT
              </Typography.Text>
            </Box>
          </Box>

          {customerName && (
            <Box
              sx={{
                backgroundColor: "#fef3f3",
                border: `1px solid ${colors.secondary}`,
                borderRadius: 1,
                px: 2,
                py: 1,
                mb: 2,
              }}
            >
              <Typography.Text style={{ ...pdfSub, color: colors.primary }}>
                Customer: {customerName}
              </Typography.Text>
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 4 }}>
            <Box>
              <Typography.Text style={pdfNormal}>
                <b>From:</b> {moment(startDate).format("MMM DD, YYYY h:mm A")}
              </Typography.Text>
            </Box>
            <Box>
              <Typography.Text style={pdfNormal}>
                <b>To:</b> {moment(endDate).format("MMM DD, YYYY h:mm A")}
              </Typography.Text>
            </Box>
          </Box>
        </Box>

        {/* Items Table */}
        {data?.map((item) => (
          <Box key={item.id} sx={{ mb: 4 }}>
            {/* Category Header */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f9f0f1",
                border: `1px solid ${colors.secondary}`,
                borderRadius: "4px 4px 0 0",
                px: 2,
                py: 1,
              }}
            >
              <Typography.Text style={{ ...pdfSub, color: colors.primary }}>
                {item.name}
              </Typography.Text>
              <Typography.Text style={{ ...pdfSub, color: colors.primary }}>
                {formatCurrency(getTotalAmount(item.orderItems))}
              </Typography.Text>
            </Box>

            {/* Nested Items */}
            {item.orderItems?.length > 0 && (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{ border: `1px solid ${colors.secondary}`, borderTop: "none" }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...pdfThCell, width: "10%" }}>QTY</TableCell>
                      <TableCell sx={pdfThCell}>ITEM</TableCell>
                      <TableCell sx={{ ...pdfThCell, textAlign: "right" }}>
                        STOCK COST
                      </TableCell>
                      <TableCell sx={{ ...pdfThCell, textAlign: "right" }}>
                        PRICE
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {item.orderItems.map((orderItem) => (
                      <TableRow key={orderItem.id} hover>
                        <TableCell sx={pdfTdCell}>
                          {Number(orderItem.quantity || 0).toFixed(1)}
                        </TableCell>
                        <TableCell sx={{ ...pdfTdCell, fontWeight: 600 }}>
                          {orderItem.name}
                        </TableCell>
                        <TableCell sx={{ ...pdfTdCell, textAlign: "right" }}>
                          {formatCurrency(
                            (orderItem.supplier_price || 0) * (orderItem.quantity || 0)
                          )}
                        </TableCell>
                        <TableCell sx={{ ...pdfTdCell, textAlign: "right" }}>
                          {formatCurrency(orderItem.amount || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ))}

        {/* Summary Totals */}
        <Box
          sx={{
            ml: "auto",
            maxWidth: "420px",
            p: 2,
            backgroundColor: "#f9f9f9",
            borderRadius: 2,
            border: "1px solid #eee",
            mt: 2,
          }}
        >
          {summaryRow("Overall Total:", formatCurrency(overallTotal))}
          {summaryRow("Overall Stock Total:", formatCurrency(overallSupplierTotal))}
          <Divider sx={{ my: 1, borderColor: "#ccc" }} />
          {summaryRow(
            "Overall Commission:",
            formatCurrency(totalCommissionAmount),
            true
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            borderTop: "2px solid #ddd",
            pt: 3,
            mt: 4,
            textAlign: "center",
          }}
        >
          <Typography.Text style={{ ...pdfSub, display: "block", marginBottom: 4 }}>
            Powered by: {COOP_NAME}
          </Typography.Text>
          <Typography.Text style={{ ...pdfNormal, display: "block", color: "#666" }}>
            Generated on {moment().format("MMM DD, YYYY")}
          </Typography.Text>
        </Box>
      </div>
    );
  }
);

// ─── Main Component ──────────────────────────────────────────────────────────

function ItemSalesModal({
  data,
  startDate,
  endDate,
  loading,
  customerName = null,
}) {
  const componentRef = useRef(null);
  const { BRAND_NAME1 } = useSystemDetails();
  const [isPdfView, setIsPdfView] = useState(false);

  useEffect(() => {
    injectThermalPrintCSS();
  }, []);

  const { overallTotal, totalCommissionAmount } = useMemo(() => {
    let total = 0;
    let commission = 0;

    data?.forEach((item) => {
      total += getTotalAmount(item.orderItems);
      commission += Number(item.commissionAmt || 0);
    });

    return { overallTotal: total, totalCommissionAmount: commission };
  }, [data]);

  const overallSupplierTotal = useMemo(
    () =>
      data?.reduce(
        (accumulator, item) =>
          accumulator + getSupplierTotalAmount(item.orderItems),
        0
      ) || 0,
    [data]
  );

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

  const sharedProps = {
    key: JSON.stringify(data) + customerName + isPdfView,
    ref: componentRef,
    data,
    startDate,
    endDate,
    BRAND_NAME1,
    overallTotal,
    overallSupplierTotal,
    totalCommissionAmount,
    COOP_NAME,
    customerName,
  };

  return (
    <ModalForm
      className="receiptM"
      modalProps={{
        centered: true,
        destroyOnClose: true,
        cancelText: "Cancel",
        okText: isPdfView ? "Save as PDF" : "Confirm Print",
        okButtonProps: {
          icon: isPdfView ? <FilePdfOutlined /> : <PrinterFilled />,
          disabled: loading,
          style: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
          },
        },
        width: isPdfView ? 1100 : 1000,
        bodyStyle: {
          maxHeight: "calc(100vh - 150px)",
          overflowY: "auto",
        },
      }}
      trigger={
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          htmlType="submit"
          style={{
            backgroundColor: colors.primary,
            borderColor: colors.primary,
          }}
        >
          {customerName
            ? `Print Report — ${customerName}`
            : "Print Item Sales Report"}
        </Button>
      }
      onFinish={async () => {
        handlePrint();
        return true;
      }}
    >
      {/* Toggle: Thermal vs PDF */}
      <Space
        direction="horizontal"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 16,
          padding: "8px 0",
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

      <Spin
        spinning={loading || !startDate}
        tip="Kindly fill in the form to load the report..."
      >
        {isPdfView ? (
          <PdfContent {...sharedProps} />
        ) : (
          <ThermalContent {...sharedProps} />
        )}
      </Spin>
    </ModalForm>
  );
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function getTotalAmount(orderItems) {
  return (
    orderItems?.reduce(
      (total, item) => total + Number(item.total_amount || 0),
      0
    ) || 0
  );
}

function getSupplierTotalAmount(orderItems) {
  return (
    orderItems?.reduce((total, item) => {
      const supplierPrice = Number(item.supplier_price || 0);
      const quantity = Number(item.quantity || 0);
      return total + supplierPrice * quantity;
    }, 0) || 0
  );
}

export default ItemSalesModal;