import React, { useRef, useState } from "react";
import { Modal, Button, Space, Switch, Typography } from "antd";
import {
    PrinterOutlined,
    CloseOutlined,
    FilePdfOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";

// Color palette
const colors = {
    primary: "#6c1c2c",
    secondary: "#bc8c7c",
    tableHeader: "#f5f5f5",
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

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface PurchaseOrderItem {
    _id: string;
    inventory_id: { name: string; sku?: string };
    unit_id: { name: string; abbreviation?: string };
    quantity_ordered: number;
    quantity_received: number;
    unit_price: number;
    total_price: number;
    notes?: string;
}

interface PurchaseOrder {
    _id: string;
    po_number: string;
    supplier_id: { name: string; contact?: string; email?: string };
    status: string;
    po_items: PurchaseOrderItem[];
    total_amount: number;
    delivery_percentage: number;
    expected_delivery_date?: string;
    created_by: { name: string; email?: string };
    createdAt: string;
    notes?: string;
    deliveries?: any[];
}

interface PrintPreviewModalProps {
    visible: boolean;
    onClose: () => void;
    data: PurchaseOrder | PurchaseOrder[] | null;
    type: "single" | "bulk" | "items";
    title?: string;
}

// ─── Shared style helpers ─────────────────────────────────────────────────────

const cell = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    border: "1px solid #ddd",
    padding: "8px 10px",
    ...extra,
});

const thCell = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    ...cell(extra),
    backgroundColor: colors.tableHeader,
    fontWeight: 700,
    fontSize: 13,
    color: colors.darkText,
});

const tdCell = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    ...cell(extra),
    fontSize: 13,
    color: "#333",
});

const deliveryStatus = (item: PurchaseOrderItem) => {
    if (item.quantity_received === 0)
        return { label: "Not Delivered", color: "#ff4d4f" };
    if (item.quantity_received < item.quantity_ordered)
        return { label: "Partially Delivered", color: "#fa8c16" };
    return { label: "Fully Delivered", color: "#52c41a" };
};

// ─── Document Header ──────────────────────────────────────────────────────────

const DocHeader: React.FC<{ BRAND_NAME1: string; title: string }> = ({
    BRAND_NAME1,
    title,
}) => (
    <div
        style={{
            borderBottom: "3px solid #333",
            paddingBottom: 20,
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
        }}
    >
        <div>
            <div
                style={{ fontSize: 26, fontWeight: 700, color: colors.darkText, lineHeight: 1.2 }}
            >
                {BRAND_NAME1}
            </div>
            <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                Powered by: {COOP_NAME}
            </div>
        </div>
        <div
            style={{
                backgroundColor: colors.primary,
                color: "#fff",
                padding: "8px 20px",
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 16,
                textAlign: "center",
            }}
        >
            {title}
        </div>
    </div>
);

// ─── Info Grid ────────────────────────────────────────────────────────────────

const InfoGrid: React.FC<{ left: [string, string][]; right: [string, string][] }> = ({
    left,
    right,
}) => (
    <div
        style={{
            display: "flex",
            gap: 32,
            marginBottom: 24,
            background: "#f9f9f9",
            border: "1px solid #eee",
            borderRadius: 6,
            padding: 16,
        }}
    >
        {[left, right].map((col, ci) => (
            <div key={ci} style={{ flex: 1 }}>
                {col.map(([label, value]) => (
                    <div key={label} style={{ marginBottom: 6, fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: "#444" }}>{label}: </span>
                        <span style={{ color: "#333" }}>{value}</span>
                    </div>
                ))}
            </div>
        ))}
    </div>
);

// ─── Summary Box ─────────────────────────────────────────────────────────────

const SummaryBox: React.FC<{ items: [string, string | number][] }> = ({ items }) => (
    <div
        style={{
            background: "#f0f8ff",
            border: "1px solid #b8d4f0",
            borderRadius: 6,
            padding: 16,
            marginTop: 20,
        }}
    >
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px 32px",
            }}
        >
            {items.map(([label, value]) => (
                <div key={label} style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{label}: </span>
                    <span>{value}</span>
                </div>
            ))}
        </div>
    </div>
);

// ─── renderSinglePO ───────────────────────────────────────────────────────────

const renderSinglePO = (record: PurchaseOrder, BRAND_NAME1: string) => (
    <div>
        <DocHeader BRAND_NAME1={BRAND_NAME1} title="PURCHASE ORDER" />

        <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.primary }}>
                {record.po_number}
            </div>
        </div>

        <InfoGrid
            left={[
                ["Supplier", record.supplier_id?.name || "N/A"],
                ["Contact", record.supplier_id?.contact || "N/A"],
                ["Email", record.supplier_id?.email || "N/A"],
            ]}
            right={[
                ["Status", record.status],
                [
                    "Expected Delivery",
                    record.expected_delivery_date
                        ? new Date(record.expected_delivery_date).toLocaleDateString()
                        : "Not set",
                ],
                ["Created By", record.created_by?.name || "Unknown"],
                ["Date", new Date(record.createdAt).toLocaleDateString()],
            ]}
        />

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
            <thead>
                <tr>
                    {["Item", "Unit", "Qty Ordered", "Qty Received", "Unit Price", "Total Price"].map(
                        (h) => (
                            <th key={h} style={thCell({ textAlign: h.includes("Price") || h.includes("Qty") ? "right" : "left" })}>
                                {h}
                            </th>
                        )
                    )}
                </tr>
            </thead>
            <tbody>
                {record.po_items.map((item, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={tdCell()}>{item.inventory_id?.name || "N/A"}</td>
                        <td style={tdCell()}>{item.unit_id?.name || "N/A"}</td>
                        <td style={tdCell({ textAlign: "right" })}>{item.quantity_ordered}</td>
                        <td style={tdCell({ textAlign: "right" })}>{item.quantity_received}</td>
                        <td style={tdCell({ textAlign: "right" })}>{formatCurrency(item.unit_price)}</td>
                        <td style={tdCell({ textAlign: "right" })}>{formatCurrency(item.total_price)}</td>
                    </tr>
                ))}
                <tr style={{ fontWeight: 700, backgroundColor: "#f0f0f0" }}>
                    <td colSpan={5} style={tdCell({ fontWeight: 700 })}>TOTAL AMOUNT</td>
                    <td style={tdCell({ textAlign: "right", fontWeight: 700 })}>
                        {formatCurrency(record.total_amount)}
                    </td>
                </tr>
            </tbody>
        </table>

        {record.notes && (
            <div style={{ marginTop: 16, fontSize: 13, padding: 12, background: "#fffbe6", borderRadius: 4 }}>
                <strong>Notes:</strong> {record.notes}
            </div>
        )}

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "#999", borderTop: "1px solid #eee", paddingTop: 12 }}>
            Generated on {new Date().toLocaleString()}
        </div>
    </div>
);

// ─── renderItemsOnly ──────────────────────────────────────────────────────────

const renderItemsOnly = (record: PurchaseOrder, BRAND_NAME1: string) => (
    <div>
        <DocHeader BRAND_NAME1={BRAND_NAME1} title="PURCHASE ORDER ITEMS" />

        <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.primary }}>
                {record.po_number}
            </div>
        </div>

        <InfoGrid
            left={[
                ["Supplier", record.supplier_id?.name || "N/A"],
                ["Contact", record.supplier_id?.contact || "N/A"],
                ["Status", record.status],
            ]}
            right={[
                [
                    "Expected Delivery",
                    record.expected_delivery_date
                        ? new Date(record.expected_delivery_date).toLocaleDateString()
                        : "Not set",
                ],
                ["Created By", record.created_by?.name || "Unknown"],
                ["Created Date", new Date(record.createdAt).toLocaleDateString()],
            ]}
        />

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
            <thead>
                <tr>
                    {[
                        ["Item Name", "left"],
                        ["SKU", "left"],
                        ["Unit", "left"],
                        ["Qty Ordered", "right"],
                        ["Qty Received", "right"],
                        ["Qty Pending", "right"],
                        ["Unit Price", "right"],
                        ["Total Price", "right"],
                        ["Status", "center"],
                    ].map(([h, align]) => (
                        <th key={h} style={thCell({ textAlign: align as any })}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {record.po_items.map((item, i) => {
                    const { label, color } = deliveryStatus(item);
                    return (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                            <td style={tdCell({ fontWeight: 600 })}>{item.inventory_id?.name || "N/A"}</td>
                            <td style={tdCell()}>{item.inventory_id?.sku || "N/A"}</td>
                            <td style={tdCell()}>{item.unit_id?.abbreviation || item.unit_id?.name || "N/A"}</td>
                            <td style={tdCell({ textAlign: "right" })}>{item.quantity_ordered}</td>
                            <td style={tdCell({ textAlign: "right" })}>{item.quantity_received}</td>
                            <td style={tdCell({ textAlign: "right" })}>{item.quantity_ordered - item.quantity_received}</td>
                            <td style={tdCell({ textAlign: "right" })}>{formatCurrency(item.unit_price)}</td>
                            <td style={tdCell({ textAlign: "right" })}>{formatCurrency(item.total_price)}</td>
                            <td style={tdCell({ textAlign: "center", color, fontWeight: 700 })}>{label}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>

        <SummaryBox
            items={[
                ["Total Items", record.po_items.length],
                ["Total Amount", formatCurrency(record.total_amount)],
                ["Delivery Progress", `${record.delivery_percentage}%`],
                ["Not Delivered", record.po_items.filter((i) => i.quantity_received === 0).length],
                ["Partially Delivered", record.po_items.filter((i) => i.quantity_received > 0 && i.quantity_received < i.quantity_ordered).length],
                ["Fully Delivered", record.po_items.filter((i) => i.quantity_received >= i.quantity_ordered).length],
            ]}
        />

        {record.notes && (
            <div style={{ marginTop: 16, fontSize: 13, padding: 12, background: "#fffbe6", borderRadius: 4 }}>
                <strong>Notes:</strong> {record.notes}
            </div>
        )}

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "#999", borderTop: "1px solid #eee", paddingTop: 12 }}>
            Generated on {new Date().toLocaleString()}
        </div>
    </div>
);

// ─── renderBulkPOs ────────────────────────────────────────────────────────────

const renderBulkPOs = (records: PurchaseOrder[], BRAND_NAME1: string) => (
    <div>
        <DocHeader BRAND_NAME1={BRAND_NAME1} title="BULK PURCHASE ORDERS REPORT" />

        <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 15, color: "#555" }}>
                Total Purchase Orders: <strong>{records.length}</strong> &nbsp;|&nbsp; Generated:{" "}
                <strong>{new Date().toLocaleString()}</strong>
            </div>
        </div>

        {records.map((record, index) => (
            <div
                key={record._id}
                style={{
                    marginBottom: 48,
                    border: "2px solid #ddd",
                    borderRadius: 8,
                    padding: 24,
                    pageBreakBefore: index > 0 ? "always" : "auto",
                }}
            >
                {/* PO Header Banner */}
                <div
                    style={{
                        background: "#f0f8ff",
                        border: "1px solid #b8d4f0",
                        borderRadius: 6,
                        padding: "12px 16px",
                        marginBottom: 20,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div style={{ fontSize: 17, fontWeight: 700, color: colors.primary }}>
                        {record.po_number}
                    </div>
                    <div style={{ fontSize: 13, color: "#555" }}>
                        Status: <strong>{record.status}</strong> &nbsp;|&nbsp; Items:{" "}
                        <strong>{record.po_items?.length || 0}</strong> &nbsp;|&nbsp; Total:{" "}
                        <strong>{formatCurrency(record.total_amount || 0)}</strong>
                    </div>
                </div>

                <InfoGrid
                    left={[
                        ["Supplier", record.supplier_id?.name || "N/A"],
                        ["Contact", record.supplier_id?.contact || "N/A"],
                        ["Email", record.supplier_id?.email || "N/A"],
                    ]}
                    right={[
                        [
                            "Expected Delivery",
                            record.expected_delivery_date
                                ? new Date(record.expected_delivery_date).toLocaleDateString()
                                : "Not set",
                        ],
                        ["Created By", record.created_by?.name || "Unknown"],
                        ["Created Date", new Date(record.createdAt).toLocaleDateString()],
                        ["Delivery Progress", `${record.delivery_percentage || 0}%`],
                    ]}
                />

                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
                    <thead>
                        <tr>
                            {[
                                ["Item", "left"],
                                ["SKU", "left"],
                                ["Unit", "left"],
                                ["Qty Ordered", "right"],
                                ["Qty Received", "right"],
                                ["Qty Pending", "right"],
                                ["Unit Price", "right"],
                                ["Total Price", "right"],
                            ].map(([h, align]) => (
                                <th key={h} style={thCell({ textAlign: align as any })}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {record.po_items?.length ? (
                            <>
                                {record.po_items.map((item, ii) => (
                                    <tr key={ii} style={{ backgroundColor: ii % 2 === 0 ? "#fff" : "#fafafa" }}>
                                        <td style={tdCell({ fontWeight: 600 })}>{item.inventory_id?.name || "N/A"}</td>
                                        <td style={tdCell()}>{item.inventory_id?.sku || "N/A"}</td>
                                        <td style={tdCell()}>{item.unit_id?.abbreviation || item.unit_id?.name || "N/A"}</td>
                                        <td style={tdCell({ textAlign: "right" })}>{item.quantity_ordered}</td>
                                        <td style={tdCell({ textAlign: "right" })}>{item.quantity_received}</td>
                                        <td style={tdCell({ textAlign: "right" })}>{item.quantity_ordered - item.quantity_received}</td>
                                        <td style={tdCell({ textAlign: "right" })}>{formatCurrency(item.unit_price)}</td>
                                        <td style={tdCell({ textAlign: "right" })}>{formatCurrency(item.total_price)}</td>
                                    </tr>
                                ))}
                                <tr style={{ fontWeight: 700, backgroundColor: "#f0f0f0" }}>
                                    <td colSpan={7} style={tdCell({ fontWeight: 700 })}>TOTAL AMOUNT</td>
                                    <td style={tdCell({ textAlign: "right", fontWeight: 700 })}>
                                        {formatCurrency(record.total_amount || 0)}
                                    </td>
                                </tr>
                            </>
                        ) : (
                            <tr>
                                <td colSpan={8} style={tdCell({ textAlign: "center", color: "#999" })}>
                                    No items
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {record.notes && (
                    <div style={{ marginBottom: 12, fontSize: 13, padding: 10, background: "#fffbe6", borderRadius: 4 }}>
                        <strong>Notes:</strong> {record.notes}
                    </div>
                )}

                <SummaryBox
                    items={[
                        ["Total Items", record.po_items?.length || 0],
                        ["Total Amount", formatCurrency(record.total_amount || 0)],
                        ["Delivery Progress", `${record.delivery_percentage || 0}%`],
                        ["Not Delivered", record.po_items?.filter((i) => i.quantity_received === 0).length || 0],
                        ["Partially Delivered", record.po_items?.filter((i) => i.quantity_received > 0 && i.quantity_received < i.quantity_ordered).length || 0],
                        ["Fully Delivered", record.po_items?.filter((i) => i.quantity_received >= i.quantity_ordered).length || 0],
                    ]}
                />
            </div>
        ))}

        <div style={{ marginTop: 32, textAlign: "center", fontSize: 12, color: "#999", borderTop: "1px solid #eee", paddingTop: 12 }}>
            End of Report — Generated on {new Date().toLocaleString()}
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
    visible,
    onClose,
    data,
    type,
    title,
}) => {
    const componentRef = useRef<HTMLDivElement>(null);
    const [isPdfView, setIsPdfView] = useState(true); // default to PDF for this modal
    const { BRAND_NAME1 } = useSystemDetails();

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
          }
          .ant-modal-mask,
          .ant-modal-wrap,
          .ant-modal-header,
          .ant-modal-footer {
            display: none !important;
          }
          .ant-modal-content {
            box-shadow: none !important;
            border: none !important;
          }
          body { margin: 0 !important; padding: 0 !important; }
        }
      `,
    });

    const renderContent = () => {
        if (!data) return null;
        switch (type) {
            case "single":
                return renderSinglePO(data as PurchaseOrder, BRAND_NAME1);
            case "bulk":
                return renderBulkPOs(data as PurchaseOrder[], BRAND_NAME1);
            case "items":
                return renderItemsOnly(data as PurchaseOrder, BRAND_NAME1);
            default:
                return null;
        }
    };

    return (
        <Modal
            title={title || "Print Preview"}
            open={visible}
            onCancel={onClose}
            width="90%"
            style={{ top: 20 }}
            footer={
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    {/* Toggle */}
                    <Space>
                        <PrinterOutlined style={{ fontSize: 16 }} />
                        <Typography.Text strong>Thermal</Typography.Text>
                        <Switch
                            checked={isPdfView}
                            onChange={(checked) => setIsPdfView(checked)}
                            checkedChildren="PDF"
                            unCheckedChildren="Thermal"
                        />
                        <Typography.Text strong>A4 PDF</Typography.Text>
                        <FilePdfOutlined style={{ fontSize: 16 }} />
                    </Space>

                    {/* Actions */}
                    <Space>
                        <Button icon={<CloseOutlined />} onClick={onClose}>
                            Close
                        </Button>
                        <Button
                            type="primary"
                            icon={isPdfView ? <FilePdfOutlined /> : <PrinterOutlined />}
                            onClick={handlePrint}
                            style={{ backgroundColor: colors.primary, borderColor: colors.primary }}
                        >
                            {isPdfView ? "Save as PDF" : "Print"}
                        </Button>
                    </Space>
                </Space>
            }
        >
            {/* Toggle inside body for visibility */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
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
            </div>

            <div style={{ maxHeight: "70vh", overflow: "auto" }}>
                <div
                    ref={componentRef}
                    style={{
                        fontFamily: isPdfView ? "'Segoe UI', Roboto, sans-serif" : "'Courier New', monospace",
                        padding: isPdfView ? "32px" : "16px",
                        backgroundColor: "#fff",
                        ...(isPdfView
                            ? { boxShadow: "0 0 10px rgba(0,0,0,0.08)", maxWidth: 900, margin: "0 auto" }
                            : {}),
                    }}
                >
                    {renderContent()}
                </div>
            </div>
        </Modal>
    );
};

export default PrintPreviewModal;