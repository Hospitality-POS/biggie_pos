import React, { useRef } from "react";
import { Modal, Table, Typography, Button, Spin } from "antd";
import { CloseOutlined, PrinterOutlined } from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import { useAppSelector } from "../../store";
import moment from "moment";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
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
  const styleId = "thermal-print-styles-sales";

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
        .sales-report-table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        
        .sales-report-table th,
        .sales-report-table td {
          border: 1px solid #000 !important;
          padding: 4px !important;
          color: #000000 !important;
          font-weight: bold !important;
          font-size: 12px !important;
        }
        
        .sales-report-table th {
          background-color: #f0f0f0 !important;
        }
        
        /* Nested tables */
        .sales-report-nested-table {
          width: 100% !important;
          margin-top: 4px !important;
          margin-bottom: 4px !important;
        }
        
        .sales-report-nested-table th,
        .sales-report-nested-table td {
          font-size: 10px !important;
          padding: 2px !important;
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
      .sales-report-table .ant-table-cell {
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

interface SalesReportProps {
  openM: boolean;
  onCloseM: () => void;
  startDate: any;
  endDate: any;
}

const SalesReportModal: React.FC<SalesReportProps> = ({
  openM,
  onCloseM,
  startDate,
  endDate,
}) => {
  // Inject the CSS for thermal printing when component mounts
  React.useEffect(() => {
    injectThermalPrintCSS();
  }, []);

  const componentRef = useRef<HTMLDivElement>(null);
  const { BRAND_NAME1 } = useSystemDetails();

  // Get data from Redux store
  const { salesReport: data, loading, error } = useAppSelector(
    (state) => state.Report
  );

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onAfterPrint: onCloseM,
  });

  const getTotalAmount = (orderItems: any[]) =>
    orderItems?.reduce((total, item) => total + (item.total_amount || 0), 0);

  const overallTotal = data?.reduce(
    (acc, item) => acc + getTotalAmount(item.orderItems),
    0
  );

  const columns = [
    {
      title: "Product",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Amount (Ksh)",
      dataIndex: "orderItems",
      key: "amount",
      align: "right" as const,
      render: (orderItems: any[]) => getTotalAmount(orderItems).toLocaleString(),
    },
  ];

  if (error) return null;

  if (loading) {
    return (
      <Spin
        size="large"
        fullscreen
        indicator={<NubaLoader />}
        tip="Generating Sales report Please wait ..."
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

        <Table
          columns={columns}
          dataSource={data?.map((item: any) => ({
            key: item.id,
            name: item.name,
            orderItems: item.orderItems,
          }))}
          pagination={false}
          bordered
          size="small"
          expandedRowRender={(record) => (
            <Table
              columns={[
                {
                  title: "Item Name",
                  dataIndex: "item_name",
                  key: "item_name",
                },
                {
                  title: "Quantity",
                  dataIndex: "quantity",
                  key: "quantity",
                  align: "center" as const,
                },
                {
                  title: "Price (Ksh)",
                  dataIndex: "price",
                  key: "price",
                  align: "right" as const,
                  render: (value) => value.toLocaleString(),
                },
                {
                  title: "Total (Ksh)",
                  key: "total_amount",
                  align: "right" as const,
                  render: (_, item) =>
                    (item.quantity * item.price).toLocaleString(),
                },
              ]}
              dataSource={record.orderItems.map((orderItem, index) => ({
                key: index,
                item_name: orderItem.name,
                quantity: orderItem.quantity,
                price: orderItem.total_amount,
              }))}
              pagination={false}
              bordered
              size="small"
              className="sales-report-nested-table"
            />
          )}
          style={{ marginBottom: 24 }}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell
                  index={0}
                  colSpan={2}
                  style={styles.summaryCell}
                >
                  Overall Total: Ksh {overallTotal?.toLocaleString()}
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
          className="sales-report-table"
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

export default SalesReportModal;