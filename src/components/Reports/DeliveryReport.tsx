import React, { useRef, useEffect } from "react";
import { Modal, Typography, Button, Spin } from "antd";
import { PrinterOutlined, CloseOutlined } from "@ant-design/icons";
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

// Inject CSS for thermal printer compatibility
const injectThermalPrintCSS = () => {
  const styleId = "thermal-print-styles-delivery-report";

  // Only add if it doesn't already exist
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
        
        /* Hide elements not needed for printing */
        .ant-modal-header,
        .ant-modal-footer,
        .ant-modal-close {
          display: none !important;
        }
        
        /* Ensure text is dark and bold for thermal printing */
        .MuiTypography-root {
          color: #000000 !important;
          font-weight: bold !important;
        }
        
        /* Table styles for thermal printing */
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
        
        /* Prevent text truncation */
        * {
          overflow: visible !important;
          white-space: normal !important;
        }
        
        /* Set table to full width */
        .MuiTable-root {
          width: 100% !important;
          table-layout: fixed !important;
        }
        
        /* Ensure receipt fits on paper */
        @page {
          size: 80mm auto;
          margin: 0mm;
        }
      }

      /* Regular view styles */
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
      
      /* Adjust header styling */
      .report-header {
        text-align: center;
        margin-bottom: 24px;
      }
      
      /* Summary section */
      .summary-row {
        text-align: center;
        font-weight: bold;
        font-size: 12px;
      }
      
      /* Footer styling */
      .report-footer {
        text-align: center;
        margin-top: 24px;
      }
    `;
    document.head.appendChild(styleElement);
  }
};

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
  // Inject the CSS for thermal printing when component mounts
  useEffect(() => {
    injectThermalPrintCSS();
  }, []);

  const componentRef = useRef<HTMLDivElement>(null);
  const { BRAND_NAME1 } = useSystemDetails();

  const {
    deliveryReport: data,
    loading,
    error,
  } = useAppSelector((state) => state.Report);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onAfterPrint: onCloseM,
  });

  // Calculate total cost
  const totalCost = data
    ?.reduce((acc: number, item: any) => {
      const itemTotal = (Number(item.supplier_price) || 0) * Number(item.quantity);
      return acc + itemTotal;
    }, 0)
    ?.toFixed(2) || "0.00";

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
      width={1000}
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}
      footer={[
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
          style={{
            backgroundColor: colors.primary,
            borderColor: colors.primary
          }}
        >
          Print
        </Button>,
        <Button
          key="close"
          danger
          icon={<CloseOutlined />}
          onClick={onCloseM}
        >
          Close
        </Button>,
      ]}
    >
      <div
        ref={componentRef}
        className="receipt"
        id="receipt"
        style={{
          padding: 24,
          color: colors.darkText,
          fontWeight: "bold"
        }}
      >
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
                <TableCell
                  sx={{
                    fontSize: "1em",
                    padding: 1,
                    fontWeight: "bold",
                    backgroundColor: colors.tableHeader,
                    borderColor: colors.tableBorder,
                    whiteSpace: "nowrap",
                    width: "40%"
                  }}
                >
                  Item(s)
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: "1em",
                    padding: 1,
                    fontWeight: "bold",
                    backgroundColor: colors.tableHeader,
                    borderColor: colors.tableBorder,
                    whiteSpace: "nowrap",
                    textAlign: "right",
                    width: "20%"
                  }}
                >
                  Unit(s)
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: "1em",
                    padding: 1,
                    fontWeight: "bold",
                    backgroundColor: colors.tableHeader,
                    borderColor: colors.tableBorder,
                    whiteSpace: "nowrap",
                    textAlign: "right",
                    width: "20%"
                  }}
                >
                  Qty
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: "1em",
                    padding: 1,
                    fontWeight: "bold",
                    backgroundColor: colors.tableHeader,
                    borderColor: colors.tableBorder,
                    whiteSpace: "nowrap",
                    textAlign: "right",
                    width: "20%"
                  }}
                >
                  Price
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.map((item: any) => (
                <TableRow key={item.inventory_id}>
                  <TableCell
                    sx={{
                      padding: 1,
                      borderColor: colors.tableBorder,
                      fontWeight: "bold",
                      wordBreak: "break-word"
                    }}
                  >
                    {item.name}
                  </TableCell>
                  <TableCell
                    sx={{
                      padding: 1,
                      borderColor: colors.tableBorder,
                      textAlign: "right"
                    }}
                  >
                    {item.uom}
                  </TableCell>
                  <TableCell
                    sx={{
                      padding: 1,
                      borderColor: colors.tableBorder,
                      textAlign: "right"
                    }}
                  >
                    {item.quantity?.toFixed(1) || 0}
                  </TableCell>
                  <TableCell
                    sx={{
                      padding: 1,
                      borderColor: colors.tableBorder,
                      textAlign: "right"
                    }}
                  >
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
                  Total Cost: Ksh. {totalCost?.toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

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
            Generated on {moment().format("MMM/DD/YYYY H:MM A")}
          </Typography.Text>
        </div>
      </div>
    </Modal>
  );
};

export default DeliveryReportModal;