import React, { useRef } from "react";
import { Modal, Table, Typography, Button, Spin } from "antd";
import { CloseOutlined, PrinterOutlined } from "@ant-design/icons";
import { useAppSelector } from "../../store";
import moment from "moment";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import { useReactToPrint } from "react-to-print";
import NubaLoader from "@components/spinner/NubaLoader";


// Embedded CSS for thermal printer compatibility
const styles = {
  reportContainer: {
    padding: 24,
    color: "#000000",
    fontWeight: "bold",
  },
  headerContainer: {
    textAlign: "center",
    marginBottom: 24,
  },
  titleText: {
    marginBottom: 8,
    color: "#000000",
    fontWeight: "bold",
  },
  subtitleText: {
    marginBottom: 16,
    color: "#000000",
    fontWeight: "bold",
  },
  dateText: {
    display: "block",
    color: "#000000",
    fontSize: "14px",
    fontWeight: "bold",
  },
  footerContainer: {
    textAlign: "center",
    marginTop: 24,
  },
  footerText: {
    display: "block",
    color: "#000000",
    fontSize: "14px",
    fontWeight: "bold",
  },
  generatedText: {
    display: "block",
    color: "#000000",
    fontSize: "12px",
    fontWeight: "bold",
  },
  printButton: {
    backgroundColor: "#6c1c2c",
    borderColor: "#6c1c2c",
  },
  summaryCell: {
    textAlign: "center",
    fontWeight: "bold",
    color: "#000000",
  },
};

// Inject CSS for thermal printer compatibility
const injectThermalPrintCSS = () => {
  const styleId = "thermal-print-styles";

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
        .ant-typography {
          color: #000000 !important;
          font-weight: bold !important;
        }
        
        /* Table styles for thermal printing */
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
        
        /* Summary rows */
        .ant-table-summary {
          border-top: 2px solid #000 !important;
        }
        
        .ant-table-summary td {
          font-weight: bold !important;
          text-align: center !important;
          color: #000000 !important;
        }
        
        /* Fix for ant design modal printing */
        .ant-modal-wrap,
        .ant-modal-mask,
        .ant-modal {
          position: absolute !important;
        }
        
        .ant-modal-content {
          box-shadow: none !important;
        }
        
        /* Ensure padding is appropriate for thermal paper */
        .ant-modal-body {
          padding: 0 !important;
        }
      }

      /* Regular view styles */
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
  // Inject the CSS for thermal printing when component mounts
  React.useEffect(() => {
    injectThermalPrintCSS();
  }, []);

  const { BRAND_NAME1 } = useSystemDetails();
  const componentRef = useRef<HTMLDivElement>(null);

  const { purchaseReport: data, loading } = useAppSelector(
    (state) => state.Report
  );

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  // Configure columns for the Ant Design Table
  const columns = [
    {
      title: "NO.",
      dataIndex: "index",
      key: "index",
      width: 60,
    },
    {
      title: "PAYMENT METHOD",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "AMOUNT (Ksh.)",
      dataIndex: "amount",
      key: "amount",
      align: "right" as const,
      render: (value: number) => value.toLocaleString(),
    },
  ];

  // Prepare data for the table
  const tableData = data?.payment_methods.map((item: any, index: number) => ({
    key: index,
    index: index + 1,
    name: item.name,
    amount: item.amount,
  }));

  // For summary information
  const summaryItems = [
    {
      label: "Overall Total",
      value: data?.totalCost || 0,
    },
    {
      label: "Overall Discount",
      value: data?.totalDiscountAmount || 0,
    },
    {
      label: "Overall Inclusive Discount",
      value: data?.totalInclusiveDiscount || 0,
    },
  ];

  if (loading) {
    return (
      <Spin
        size="large"
        fullscreen
        indicator={<NubaLoader />}
        tip="Generating Purchase report Please wait ..."
      />
    );
  }

  return (
    <Modal
      open={openM}
      onCancel={onCloseM}
      width={800}
      footer={[
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
          style={styles.printButton}
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
      {/* Print Content */}
      <div
        ref={componentRef}
        style={styles.reportContainer}
        className="receipt"
      >
        <div style={styles.headerContainer}>
          <Typography.Title
            level={3}
            style={styles.titleText}
          >
            {BRAND_NAME1}
          </Typography.Title>
          <Typography.Title
            level={4}
            style={styles.subtitleText}
          >
            SALES REPORT
          </Typography.Title>

          <Typography.Text style={styles.dateText}>
            From: {moment(startDate).format("MMM-DD-YYYY H:MM A")}
          </Typography.Text>
          <Typography.Text style={styles.dateText}>
            To: {moment(endDate).format("MMM-DD-YYYY H:MM A")}
          </Typography.Text>
        </div>

        {/* Table optimized for thermal printing */}
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
                    style={styles.summaryCell}
                  >
                    {item.label}: {item.value.toLocaleString()}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              ))}
            </Table.Summary>
          )}
          className="purchase-report-table"
        />

        <div style={styles.footerContainer}>
          <Typography.Text style={styles.footerText}>
            Powered by: {COOP_NAME}
          </Typography.Text>
          <Typography.Text style={styles.generatedText}>
            Generated on {moment().format("MMM/DD/YYYY H:MM A")}
          </Typography.Text>
        </div>
      </div>
    </Modal>
  );
};

export default PurchaseReportModal;