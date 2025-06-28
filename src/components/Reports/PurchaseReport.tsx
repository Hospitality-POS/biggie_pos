import React, { useRef, useEffect } from "react";
import { Modal, Table, Typography, Button, Spin } from "antd";
import { CloseOutlined, PrinterOutlined } from "@ant-design/icons";
import { useAppSelector } from "../../store";
import moment from "moment";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import { useReactToPrint } from "react-to-print";
import NubaLoader from "@components/spinner/NubaLoader";

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

  const { purchaseReport: data, loading } = useAppSelector(
    (state) => state.Report
  );

  // Inject CSS for thermal printing when component mounts
  useEffect(() => {
    injectThermalPrintCSS();
  }, []);

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
      title: "AMOUNT",
      dataIndex: "amount",
      key: "amount",
      align: "right" as const,
      render: (value: number) => formatCurrency(value),
    },
  ];

  // Prepare data for the table
  const tableData = data?.payment_methods?.map((item: any, index: number) => ({
    key: index,
    index: index + 1,
    name: item.name || 'N/A',
    amount: Number(item.amount || 0),
  })) || [];

  // Summary information with proper currency formatting
  const summaryItems = [
    {
      label: "Overall Total",
      value: Number(data?.totalCost || 0),
    },
    {
      label: "Overall Discount",
      value: Number(data?.totalDiscountAmount || 0),
    },
    {
      label: "Overall Inclusive Discount",
      value: Number(data?.totalInclusiveDiscount || 0),
    },
  ];

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
            PURCHASE REPORT
          </Typography.Title>

          <Typography.Text style={styles.dateText}>
            From: {moment(startDate).format("MMM-DD-YYYY h:mm A")}
          </Typography.Text>
          <Typography.Text style={styles.dateText}>
            To: {moment(endDate).format("MMM-DD-YYYY h:mm A")}
          </Typography.Text>
        </div>

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
                    {item.label}: {formatCurrency(item.value)}
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
            Generated on {moment().format("MMM/DD/YYYY h:mm A")}
          </Typography.Text>
        </div>
      </div>
    </Modal>
  );
};

export default PurchaseReportModal;