import React, { useRef, useMemo, forwardRef, useEffect } from "react";
import { ModalForm } from "@ant-design/pro-form";
import { Typography, Button, Spin } from "antd";
import { PrinterOutlined, PrinterFilled } from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import moment from "moment";
import {
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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
    currency = 'KES',
    showSymbol = true,
    decimals = 2,
    locale = 'en-KE'
  } = options;

  const numericAmount = Number(amount) || 0;

  if (showSymbol) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
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

const PrintableContent = forwardRef(
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
    },
    ref
  ) => (
    <div className="receipt" id="receipt" ref={ref}>
      <div className="logo-print" style={{ display: "flex", flexDirection: "column" }}>
        <Typography.Title
          level={3}
          style={{
            textAlign: "center",
            marginBottom: 8,
            color: colors.darkText,
            fontWeight: "bold",
            fontFamily: "monospace"
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
            fontFamily: "monospace"
          }}
        >
          ITEM SALES REPORT
        </Typography.Title>
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
                  borderColor: colors.tableBorder
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
                  borderColor: colors.tableBorder
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
                      borderColor: colors.tableBorder
                    }}
                  >
                    {item.name}
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "right",
                      fontWeight: "bold",
                      padding: 1,
                      borderColor: colors.tableBorder
                    }}
                  >
                    {formatCurrency(getTotalAmount(item.orderItems))}
                  </TableCell>
                </TableRow>
                {item.orderItems?.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={2} sx={{ padding: 0, borderColor: colors.tableBorder }}>
                      <TableContainer sx={{ width: "inherit" }}>
                        <Table className="nested-table">
                          <TableHead>
                            <TableRow>
                              <TableCell
                                sx={{
                                  padding: 1,
                                  width: "15%",
                                  backgroundColor: colors.tableHeader,
                                  borderColor: colors.tableBorder
                                }}
                              >
                                QTY
                              </TableCell>
                              <TableCell
                                sx={{
                                  padding: 1,
                                  width: "45%",
                                  backgroundColor: colors.tableHeader,
                                  borderColor: colors.tableBorder
                                }}
                              >
                                ITEM
                              </TableCell>
                              <TableCell
                                sx={{
                                  padding: 1,
                                  width: "20%",
                                  backgroundColor: colors.tableHeader,
                                  borderColor: colors.tableBorder
                                }}
                              >
                                STOCK COST
                              </TableCell>
                              <TableCell
                                sx={{
                                  padding: 1,
                                  width: "20%",
                                  backgroundColor: colors.tableHeader,
                                  borderColor: colors.tableBorder
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
                                    borderColor: colors.tableBorder
                                  }}
                                >
                                  {Number(orderItem.quantity || 0).toFixed(1)}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    borderBottom: "none",
                                    padding: 1,
                                    fontWeight: "bold",
                                    borderColor: colors.tableBorder
                                  }}
                                >
                                  {orderItem.name}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    borderBottom: "none",
                                    padding: 1,
                                    textAlign: "right",
                                    borderColor: colors.tableBorder
                                  }}
                                >
                                  {formatCurrency(
                                    (orderItem.supplier_price || 0) * (orderItem.quantity || 0)
                                  )}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    borderBottom: "none",
                                    padding: 1,
                                    textAlign: "right",
                                    borderColor: colors.tableBorder
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
            fontFamily: "monospace"
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
            fontFamily: "monospace"
          }}
        >
          Generated on {moment().format("MMM/DD/YYYY")}
        </Typography.Text>
      </div>
    </div>
  )
);

function ItemSalesModal({ data, startDate, endDate, loading }) {
  const componentRef = useRef(null);
  const { BRAND_NAME1 } = useSystemDetails();

  // Inject CSS for thermal printing when component mounts
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

    return {
      overallTotal: total,
      totalCommissionAmount: commission
    };
  }, [data]);

  const overallSupplierTotal = useMemo(() =>
    data?.reduce(
      (accumulator, item) => accumulator + getSupplierTotalAmount(item.orderItems),
      0
    ) || 0,
    [data]
  );

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  return (
    <ModalForm
      className="receiptM"
      modalProps={{
        centered: true,
        destroyOnClose: true,
        cancelText: "Cancel",
        okText: "Confirm Print",
        okButtonProps: {
          icon: <PrinterFilled />,
          disabled: loading,
          style: {
            backgroundColor: colors.primary,
            borderColor: colors.primary
          }
        },
        width: 1000,
        bodyStyle: {
          maxHeight: 'calc(100vh - 150px)',
          overflowY: 'auto'
        }
      }}
      trigger={
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          htmlType="submit"
          style={{
            backgroundColor: colors.primary,
            borderColor: colors.primary
          }}
        >
          Print Item Sales Report
        </Button>
      }
      onFinish={async () => {
        handlePrint();
        return true;
      }}
    >
      <Spin
        spinning={loading || !startDate}
        tip="Kindly fill in the form to load the report..."
      >
        <PrintableContent
          key={JSON.stringify(data)}
          ref={componentRef}
          data={data}
          startDate={startDate}
          endDate={endDate}
          BRAND_NAME1={BRAND_NAME1}
          overallTotal={overallTotal}
          overallSupplierTotal={overallSupplierTotal}
          totalCommissionAmount={totalCommissionAmount}
          COOP_NAME={COOP_NAME}
        />
      </Spin>
    </ModalForm>
  );
}

// Helper functions
function getTotalAmount(orderItems) {
  return orderItems?.reduce(
    (total, item) => total + Number(item.total_amount || 0),
    0
  ) || 0;
}

function getSupplierTotalAmount(orderItems) {
  return orderItems?.reduce((total, item) => {
    const supplierPrice = Number(item.supplier_price || 0);
    const quantity = Number(item.quantity || 0);
    return total + (supplierPrice * quantity);
  }, 0) || 0;
}

export default ItemSalesModal;