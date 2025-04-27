import React, { useRef, useEffect } from "react";
import { Modal, Table, Typography, Button, Spin } from "antd";
import { CloseOutlined, PrinterOutlined } from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import { useAppSelector } from "../../store";
import moment from "moment";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import NubaLoader from "@components/spinner/NubaLoader";

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
    const styleId = "thermal-print-styles-inventory-usage";

    // Only add if it doesn't already exist
    if (!document.getElementById(styleId)) {
        const styleElement = document.createElement("style");
        styleElement.id = styleId;
        styleElement.innerHTML = `
      @media print {
        body {
          width: 80mm !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .receipt {
          width: 80mm !important;
          font-family: 'Courier New', monospace !important;
          color: #000000 !important;
          font-weight: bold !important;
          padding: 5mm !important;
        }
        
        /* Hide elements not needed for printing */
        .ant-modal-header,
        .ant-modal-footer,
        .ant-modal-close,
        .print-buttons {
          display: none !important;
        }
        
        /* Ensure text is dark and bold for thermal printing */
        .ant-typography, 
        .ant-table, 
        .ant-table-cell {
          color: #000000 !important;
          font-weight: bold !important;
        }
        
        /* Adjust table for thermal printer width */
        .ant-table {
          width: 70mm !important;
          table-layout: fixed !important;
          font-size: 9pt !important;
        }
        
        .ant-table-thead > tr > th {
          background-color: #f0f0f0 !important;
          padding: 4px !important;
          font-size: 9pt !important;
          white-space: nowrap !important;
          border: 1px solid #000 !important;
        }
        
        .ant-table-tbody > tr > td {
          padding: 4px !important;
          font-size: 9pt !important;
          border: 1px solid #000 !important;
        }
        
        /* Custom column widths for thermal */
        .col-name {
          width: 40% !important;
        }
        
        .col-qty {
          width: 30% !important;
          text-align: right !important;
        }
        
        .col-unit {
          width: 30% !important;
          text-align: right !important;
        }
        
        /* Prevent text truncation */
        * {
          overflow: visible !important;
        }
        
        /* Page setup for thermal */
        @page {
          size: 80mm auto;
          margin: 0mm;
        }
      }

      /* Regular view styles */
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

interface InventoryUsageReportProps {
    openM: boolean;
    onCloseM: () => void;
    startDate: any;
    endDate: any;
}

const InventoryUsageReportModal: React.FC<InventoryUsageReportProps> = ({
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

    // Get data from Redux store
    const {
        deliveryReport: data,
        loading,
        error,
    } = useAppSelector((state) => state.Report);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        onAfterPrint: () => {
            // Optional callback after printing
        }
    });

    const columns = [
        {
            title: "Item Name",
            dataIndex: "name",
            key: "name",
            className: "col-name",
            ellipsis: false,
            width: "50%",
            render: (text: string) => (
                <span style={{ fontWeight: "bold", color: colors.darkText }}>{text}</span>
            )
        },
        {
            title: "Quantity",
            dataIndex: "quantity",
            key: "quantity",
            align: "right" as const,
            className: "col-qty",
            width: "25%",
            render: (value: number) => (
                <span style={{ fontWeight: "bold", color: colors.darkText }}>{value.toFixed(1)}</span>
            )
        },
        {
            title: "Unit",
            dataIndex: "uom",
            key: "uom",
            align: "right" as const,
            className: "col-unit",
            width: "25%",
            render: (text: string) => (
                <span style={{ fontWeight: "bold", color: colors.darkText }}>{text}</span>
            )
        },
    ];

    if (error) return null;

    return (
        <>
            {loading ? (
                <Spin
                    size="large"
                    fullscreen
                    indicator={<NubaLoader />}
                    tip="Generating Inventory Usage Report..."
                />
            ) : (
                <Modal
                    open={openM}
                    onCancel={onCloseM}
                    width={800}
                    style={{ top: 20 }}
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
                    <div ref={componentRef} className="receipt" style={{ padding: 24 }}>
                        <div style={{ textAlign: "center", marginBottom: 24 }}>
                            <Typography.Title
                                level={3}
                                style={{
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
                                    marginBottom: 16,
                                    color: colors.darkText,
                                    fontWeight: "bold",
                                    fontFamily: "monospace"
                                }}
                            >
                                INVENTORY USAGE REPORT
                            </Typography.Title>

                            <Typography.Text
                                style={{
                                    display: "block",
                                    color: colors.darkText,
                                    fontWeight: "bold",
                                    fontFamily: "monospace"
                                }}
                            >
                                From: {moment(startDate).format("MMM-DD-YYYY H:mm A")}
                            </Typography.Text>
                            <Typography.Text
                                style={{
                                    display: "block",
                                    color: colors.darkText,
                                    fontWeight: "bold",
                                    fontFamily: "monospace"
                                }}
                            >
                                To: {moment(endDate).format("MMM-DD-YYYY H:mm A")}
                            </Typography.Text>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={data?.map((item: any) => ({
                                key: item.inventory_id,
                                name: item.name,
                                quantity: item.quantity,
                                uom: item.uom,
                            }))}
                            pagination={false}
                            bordered
                            size="small"
                            style={{ marginBottom: 24 }}
                            className="inventory-table"
                        />

                        <div style={{ textAlign: "center", marginTop: 24 }}>
                            <Typography.Text
                                style={{
                                    display: "block",
                                    color: colors.darkText,
                                    fontWeight: "bold",
                                    fontFamily: "monospace",
                                    fontSize: "14px"
                                }}
                            >
                                Powered by: {COOP_NAME}
                            </Typography.Text>
                            <Typography.Text
                                style={{
                                    display: "block",
                                    color: colors.darkText,
                                    fontWeight: "bold",
                                    fontFamily: "monospace",
                                    fontSize: "12px"
                                }}
                            >
                                Generated on {moment().format("MMM/DD/YYYY H:mm A")}
                            </Typography.Text>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default InventoryUsageReportModal;