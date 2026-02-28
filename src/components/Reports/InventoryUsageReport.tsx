import React, { useRef, useEffect, useState } from "react";
import { Modal, Table, Typography, Button, Spin, Switch, Space } from "antd";
import {
    CloseOutlined,
    PrinterOutlined,
    FilePdfOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import { useAppSelector } from "../../store";
import moment from "moment";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
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
    tableHeader: "#f0f0f0",
    tableBorder: "#ddd",
    darkText: "#000000",
};

// Inject CSS for thermal printer compatibility
const injectThermalPrintCSS = () => {
    const styleId = "thermal-print-styles-inventory-usage";

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

        .ant-modal-header,
        .ant-modal-footer,
        .ant-modal-close,
        .print-buttons {
          display: none !important;
        }

        .ant-typography,
        .ant-table,
        .ant-table-cell {
          color: #000000 !important;
          font-weight: bold !important;
        }

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

        .col-name  { width: 40% !important; }
        .col-qty   { width: 30% !important; text-align: right !important; }
        .col-unit  { width: 30% !important; text-align: right !important; }

        * { overflow: visible !important; }

        @page {
          size: 80mm auto;
          margin: 0mm;
        }
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

// ─── Thermal Content ──────────────────────────────────────────────────────────

const ThermalContent = React.forwardRef<
    HTMLDivElement,
    {
        data: any[];
        startDate: any;
        endDate: any;
        BRAND_NAME1: string;
        columns: any[];
    }
>(({ data, startDate, endDate, BRAND_NAME1, columns }, ref) => (
    <div ref={ref} className="receipt" style={{ padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Typography.Title
                level={3}
                style={{
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
                    marginBottom: 16,
                    color: colors.darkText,
                    fontWeight: "bold",
                    fontFamily: "monospace",
                }}
            >
                INVENTORY USAGE REPORT
            </Typography.Title>
            <Typography.Text
                style={{
                    display: "block",
                    color: colors.darkText,
                    fontWeight: "bold",
                    fontFamily: "monospace",
                }}
            >
                From: {moment(startDate).format("MMM-DD-YYYY H:mm A")}
            </Typography.Text>
            <Typography.Text
                style={{
                    display: "block",
                    color: colors.darkText,
                    fontWeight: "bold",
                    fontFamily: "monospace",
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
                    fontSize: "14px",
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
                    fontSize: "12px",
                }}
            >
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
    }
>(({ data, startDate, endDate, BRAND_NAME1 }, ref) => {
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

    const totalQty = data?.reduce(
        (acc: number, item: any) => acc + Number(item.quantity || 0),
        0
    ) || 0;

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
                        sx={{ backgroundColor: colors.primary, px: 3, py: 1, borderRadius: 2 }}
                    >
                        <Typography.Text style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>
                            INVENTORY USAGE REPORT
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
                <MuiTable size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ ...pdfThCell, width: "55%" }}>Item Name</TableCell>
                            <TableCell sx={{ ...pdfThCell, textAlign: "right", width: "25%" }}>
                                Quantity
                            </TableCell>
                            <TableCell sx={{ ...pdfThCell, textAlign: "right", width: "20%" }}>
                                Unit
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data?.map((item: any) => (
                            <TableRow key={item.inventory_id} hover>
                                <TableCell sx={{ ...pdfTdCell, fontWeight: 600 }}>
                                    {item.name}
                                </TableCell>
                                <TableCell sx={{ ...pdfTdCell, textAlign: "right" }}>
                                    {Number(item.quantity || 0).toFixed(1)}
                                </TableCell>
                                <TableCell sx={{ ...pdfTdCell, textAlign: "right" }}>
                                    {item.uom}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </MuiTable>
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
                        Total Items:
                    </Typography.Text>
                    <Typography.Text style={{ ...pdfSub, fontSize: "16px" }}>
                        {data?.length || 0}
                    </Typography.Text>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                    <Typography.Text style={pdfNormal}>Total Qty:</Typography.Text>
                    <Typography.Text style={pdfNormal}>
                        {totalQty.toFixed(1)}
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

    // Ant Design columns for thermal view
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
            ),
        },
        {
            title: "Quantity",
            dataIndex: "quantity",
            key: "quantity",
            align: "right" as const,
            className: "col-qty",
            width: "25%",
            render: (value: number) => (
                <span style={{ fontWeight: "bold", color: colors.darkText }}>
                    {value.toFixed(1)}
                </span>
            ),
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
            ),
        },
    ];

    const sharedProps = { data, startDate, endDate, BRAND_NAME1 };

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
                    width={isPdfView ? 1100 : 800}
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
                        <ThermalContent ref={componentRef} columns={columns} {...sharedProps} />
                    )}
                </Modal>
            )}
        </>
    );
};

export default InventoryUsageReportModal;