import React, { useEffect, useRef, useState } from "react";
import { Button, Drawer, Modal, Space, Switch, Typography } from "antd";
import {
    CloseOutlined,
    FilePdfOutlined,
    PrinterOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";

const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    tableHeader: "#f8fafc",
    tableBorder: "#e2e8f0",
    darkText: "#0f172a",
    subText: "#64748b",
    green: "#10b981",
    orange: "#f59e0b",
    red: "#ef4444",
};

// ── Mobile detection ──────────────────────────────────────────────────────────
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);
    return isMobile;
};

// ── Currency formatter ────────────────────────────────────────────────────────
const fmt = (v: number) =>
    new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        minimumFractionDigits: 2,
    }).format(Number(v) || 0);

// ── Interfaces ────────────────────────────────────────────────────────────────
interface POItem {
    _id: string;
    inventory_id: { name: string; sku?: string };
    unit_id: { name: string; abbreviation?: string };
    quantity_ordered: number;
    quantity_received: number;
    unit_price: number;
    total_price: number;
    notes?: string;
}

interface PO {
    _id: string;
    po_number: string;
    supplier_id: { name: string; contact?: string; email?: string };
    status: string;
    po_items: POItem[];
    total_amount: number;
    delivery_percentage: number;
    expected_delivery_date?: string;
    created_by: { name: string; email?: string };
    createdAt: string;
    notes?: string;
}

interface PrintPreviewModalProps {
    visible: boolean;
    onClose: () => void;
    data: PO | PO[] | null;
    type: "single" | "bulk" | "items";
    title?: string;
}

// ── Style helpers ─────────────────────────────────────────────────────────────
const cell = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    border: `1px solid ${C.tableBorder}`,
    padding: "7px 10px",
    ...extra,
});

const th = (extra: React.CSSProperties = {}): React.CSSProperties =>
    cell({
        background: C.tableHeader,
        fontWeight: 700,
        fontSize: 12,
        color: C.darkText,
        whiteSpace: "nowrap",
        ...extra,
    });

const td = (extra: React.CSSProperties = {}): React.CSSProperties =>
    cell({ fontSize: 12, color: "#374151", ...extra });

const itemDeliveryStatus = (item: POItem) => {
    if (item.quantity_received === 0)
        return { label: "Pending", color: C.red };
    if (item.quantity_received < item.quantity_ordered)
        return { label: "Partial", color: C.orange };
    return { label: "Delivered", color: C.green };
};

// ── Doc Header ────────────────────────────────────────────────────────────────
const DocHeader: React.FC<{ brand: string; docTitle: string }> = ({
    brand,
    docTitle,
}) => (
    <div
        style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `3px solid ${C.primary}`,
            paddingBottom: 16,
            marginBottom: 20,
        }}
    >
        <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.darkText, lineHeight: 1.2 }}>
                {brand}
            </div>
            <div style={{ fontSize: 11, color: C.subText, marginTop: 3 }}>
                Powered by {COOP_NAME}
            </div>
        </div>
        <div
            style={{
                background: C.primary,
                color: "#fff",
                padding: "8px 18px",
                borderRadius: 7,
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.5px",
            }}
        >
            {docTitle}
        </div>
    </div>
);

// ── Info Grid ─────────────────────────────────────────────────────────────────
const InfoGrid: React.FC<{ left: [string, string][]; right: [string, string][] }> = ({
    left, right,
}) => (
    <div
        style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
            background: "#f8fafc",
            border: `1px solid ${C.tableBorder}`,
            borderRadius: 8,
            padding: 12,
        }}
    >
        {[left, right].map((col, ci) => (
            <div key={ci} style={{ flex: "1 1 140px", minWidth: 0 }}>
                {col.map(([label, value]) => (
                    <div key={label} style={{ marginBottom: 5, fontSize: 12 }}>
                        <span style={{ fontWeight: 600, color: "#475569" }}>{label}: </span>
                        <span style={{ color: "#374151", wordBreak: "break-word" }}>{value}</span>
                    </div>
                ))}
            </div>
        ))}
    </div>
);

// ── Status Badge (print-safe colored text) ────────────────────────────────────
const StatusText: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
        pending: C.orange,
        approved: C.green,
        partially_delivered: "#3b82f6",
        fully_delivered: C.green,
        cancelled: C.red,
    };
    return (
        <span style={{ color: colors[status] || C.subText, fontWeight: 700, fontSize: 12 }}>
            {status.replace(/_/g, " ").toUpperCase()}
        </span>
    );
};

// ── Summary Box ───────────────────────────────────────────────────────────────
const SummaryBox: React.FC<{ items: [string, string | number][] }> = ({ items }) => (
    <div
        style={{
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: 8,
            padding: 14,
            marginTop: 16,
        }}
    >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 24px" }}>
            {items.map(([label, value]) => (
                <div key={label} style={{ fontSize: 12 }}>
                    <span style={{ fontWeight: 600, color: "#475569" }}>{label}: </span>
                    <span style={{ color: C.darkText }}>{value}</span>
                </div>
            ))}
        </div>
    </div>
);

// ── Notes block ───────────────────────────────────────────────────────────────
const NotesBlock: React.FC<{ notes?: string }> = ({ notes }) =>
    notes ? (
        <div
            style={{
                marginTop: 14,
                fontSize: 12,
                padding: "10px 12px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 6,
                color: "#374151",
            }}
        >
            <strong>Notes: </strong>{notes}
        </div>
    ) : null;

// ── Footer line ───────────────────────────────────────────────────────────────
const PrintFooter: React.FC<{ label?: string }> = ({ label }) => (
    <div
        style={{
            marginTop: 24,
            paddingTop: 10,
            borderTop: `1px solid ${C.tableBorder}`,
            textAlign: "center",
            fontSize: 11,
            color: "#94a3b8",
        }}
    >
        {label || "Generated on"} {new Date().toLocaleString()}
    </div>
);

// ── PO number banner ──────────────────────────────────────────────────────────
const POBanner: React.FC<{ po: PO; showMeta?: boolean }> = ({ po, showMeta }) => (
    <div
        style={{
            background: C.primaryLight,
            border: `1px solid #f3c6cd`,
            borderRadius: 7,
            padding: "10px 14px",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
        }}
    >
        <div style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>{po.po_number}</div>
        {showMeta && (
            <div style={{ fontSize: 12, color: C.subText }}>
                Status: <StatusText status={po.status} /> &nbsp;·&nbsp;
                Items: <strong>{po.po_items?.length || 0}</strong> &nbsp;·&nbsp;
                Total: <strong>{fmt(po.total_amount || 0)}</strong>
            </div>
        )}
    </div>
);

// ── Mobile item card (replaces table row on small screens) ───────────────────
const MobileItemCard: React.FC<{ item: POItem; index: number; showDeliveryStatus?: boolean }> = ({
    item, index, showDeliveryStatus,
}) => {
    const { label, color } = itemDeliveryStatus(item);
    const lineTotal = (item.quantity_ordered || 0) * (item.unit_price || 0);
    return (
        <div
            style={{
                background: index % 2 === 0 ? "#fff" : "#f8fafc",
                border: `1px solid ${C.tableBorder}`,
                borderRadius: 7,
                padding: "10px 12px",
                marginBottom: 8,
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.darkText, flex: 1, marginRight: 8 }}>
                    {item.inventory_id?.name || "N/A"}
                </span>
                {showDeliveryStatus && (
                    <span style={{ fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap" }}>{label}</span>
                )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 12 }}>
                <div><span style={{ color: C.subText }}>Unit: </span>{item.unit_id?.abbreviation || item.unit_id?.name || "—"}</div>
                <div><span style={{ color: C.subText }}>Ordered: </span><strong>{item.quantity_ordered}</strong></div>
                <div><span style={{ color: C.subText }}>Received: </span>{item.quantity_received}</div>
                <div><span style={{ color: C.subText }}>Pending: </span>{item.quantity_ordered - item.quantity_received}</div>
                <div><span style={{ color: C.subText }}>Unit Price: </span>{fmt(item.unit_price)}</div>
                <div>
                    <span style={{ color: C.subText }}>Total: </span>
                    <strong style={{ color: C.green }}>{fmt(item.total_price || lineTotal)}</strong>
                </div>
            </div>
        </div>
    );
};

// ── Items table (shared) — scrollable on mobile, table on desktop ─────────────
const POItemsTable: React.FC<{ po: PO; showDeliveryStatus?: boolean; showSKU?: boolean; isMobile?: boolean }> = ({
    po, showDeliveryStatus, showSKU, isMobile,
}) => {
    // On mobile, render stacked cards instead of a wide table
    if (isMobile) {
        return (
            <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.subText, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Items ({po.po_items?.length || 0})
                </div>
                {po.po_items?.length ? (
                    <>
                        {po.po_items.map((item, i) => (
                            <MobileItemCard key={i} item={item} index={i} showDeliveryStatus={showDeliveryStatus} />
                        ))}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 12px",
                                background: "#f1f5f9",
                                borderRadius: 7,
                                border: `1px solid ${C.tableBorder}`,
                                marginTop: 4,
                            }}
                        >
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.darkText }}>TOTAL AMOUNT</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: C.primary }}>{fmt(po.total_amount)}</span>
                        </div>
                    </>
                ) : (
                    <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>No items</div>
                )}
            </div>
        );
    }

    const headers: [string, string][] = [
        ["Item", "left"],
        ...(showSKU ? [["SKU", "left"] as [string, string]] : []),
        ["Unit", "left"],
        ["Ordered", "right"],
        ["Received", "right"],
        ["Pending", "right"],
        ["Unit Price", "right"],
        ["Total", "right"],
        ...(showDeliveryStatus ? [["Status", "center"] as [string, string]] : []),
    ];

    const colSpanForTotal = headers.length - 1;

    return (
        <div style={{ overflowX: "auto", marginBottom: 14 }}>
            <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        {headers.map(([h, align]) => (
                            <th key={h} style={th({ textAlign: align as any })}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {po.po_items?.length ? (
                        <>
                            {po.po_items.map((item, i) => {
                                const { label, color } = itemDeliveryStatus(item);
                                return (
                                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                        <td style={td({ fontWeight: 600 })}>{item.inventory_id?.name || "N/A"}</td>
                                        {showSKU && <td style={td()}>{item.inventory_id?.sku || "—"}</td>}
                                        <td style={td()}>{item.unit_id?.abbreviation || item.unit_id?.name || "—"}</td>
                                        <td style={td({ textAlign: "right" })}>{item.quantity_ordered}</td>
                                        <td style={td({ textAlign: "right" })}>{item.quantity_received}</td>
                                        <td style={td({ textAlign: "right" })}>{item.quantity_ordered - item.quantity_received}</td>
                                        <td style={td({ textAlign: "right" })}>{fmt(item.unit_price)}</td>
                                        <td style={td({ textAlign: "right", fontWeight: 600 })}>{fmt(item.total_price)}</td>
                                        {showDeliveryStatus && (
                                            <td style={td({ textAlign: "center", color, fontWeight: 700 })}>{label}</td>
                                        )}
                                    </tr>
                                );
                            })}
                            <tr style={{ background: "#f1f5f9" }}>
                                <td colSpan={colSpanForTotal} style={td({ fontWeight: 700, textAlign: "right", color: C.darkText })}>
                                    TOTAL AMOUNT
                                </td>
                                <td style={td({ textAlign: "right", fontWeight: 800, color: C.primary, fontSize: 13 })}>
                                    {fmt(po.total_amount)}
                                </td>
                            </tr>
                        </>
                    ) : (
                        <tr>
                            <td colSpan={headers.length} style={td({ textAlign: "center", color: "#94a3b8" })}>
                                No items
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const deliverySummaryItems = (po: PO): [string, string | number][] => [
    ["Total Items", po.po_items?.length || 0],
    ["Total Amount", fmt(po.total_amount || 0)],
    ["Delivery Progress", `${po.delivery_percentage || 0}%`],
    ["Not Delivered", po.po_items?.filter((i) => i.quantity_received === 0).length || 0],
    ["Partial", po.po_items?.filter((i) => i.quantity_received > 0 && i.quantity_received < i.quantity_ordered).length || 0],
    ["Fully Delivered", po.po_items?.filter((i) => i.quantity_received >= i.quantity_ordered).length || 0],
];

// ── Single PO render ──────────────────────────────────────────────────────────
const renderSinglePO = (po: PO, brand: string, isMobile?: boolean) => (
    <div>
        <DocHeader brand={brand} docTitle="PURCHASE ORDER" />
        <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: C.primary }}>{po.po_number}</div>
        </div>
        <InfoGrid
            left={[
                ["Supplier", po.supplier_id?.name || "N/A"],
                ["Contact", po.supplier_id?.contact || "N/A"],
                ["Email", po.supplier_id?.email || "N/A"],
            ]}
            right={[
                ["Status", po.status?.replace(/_/g, " ").toUpperCase() || "N/A"],
                ["Expected", po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : "Not set"],
                ["Created By", po.created_by?.name || "Unknown"],
                ["Date", new Date(po.createdAt).toLocaleDateString()],
            ]}
        />
        <POItemsTable po={po} isMobile={isMobile} />
        <NotesBlock notes={po.notes} />
        <PrintFooter />
    </div>
);

// ── Items only render ─────────────────────────────────────────────────────────
const renderItemsOnly = (po: PO, brand: string, isMobile?: boolean) => (
    <div>
        <DocHeader brand={brand} docTitle="PO ITEMS DETAIL" />
        <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: C.primary }}>{po.po_number}</div>
        </div>
        <InfoGrid
            left={[
                ["Supplier", po.supplier_id?.name || "N/A"],
                ["Contact", po.supplier_id?.contact || "N/A"],
                ["Status", po.status?.replace(/_/g, " ").toUpperCase() || "N/A"],
            ]}
            right={[
                ["Expected", po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : "Not set"],
                ["Created By", po.created_by?.name || "Unknown"],
                ["Date", new Date(po.createdAt).toLocaleDateString()],
            ]}
        />
        <POItemsTable po={po} showDeliveryStatus showSKU isMobile={isMobile} />
        <SummaryBox items={deliverySummaryItems(po)} />
        <NotesBlock notes={po.notes} />
        <PrintFooter />
    </div>
);

// ── Bulk PO render ────────────────────────────────────────────────────────────
const renderBulkPOs = (pos: PO[], brand: string, isMobile?: boolean) => (
    <div>
        <DocHeader brand={brand} docTitle="BULK PO REPORT" />
        <div style={{ textAlign: "center", marginBottom: 20, fontSize: 13, color: C.subText }}>
            {pos.length} Purchase Order{pos.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Generated {new Date().toLocaleString()}
        </div>

        {pos.map((po, index) => (
            <div
                key={po._id}
                style={{
                    marginBottom: 40,
                    border: `1px solid ${C.tableBorder}`,
                    borderRadius: 8,
                    padding: isMobile ? 12 : 20,
                    pageBreakBefore: index > 0 ? "always" : "auto",
                }}
            >
                <POBanner po={po} showMeta />
                <InfoGrid
                    left={[
                        ["Supplier", po.supplier_id?.name || "N/A"],
                        ["Contact", po.supplier_id?.contact || "N/A"],
                        ["Email", po.supplier_id?.email || "N/A"],
                    ]}
                    right={[
                        ["Expected", po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : "Not set"],
                        ["Created By", po.created_by?.name || "Unknown"],
                        ["Date", new Date(po.createdAt).toLocaleDateString()],
                        ["Progress", `${po.delivery_percentage || 0}%`],
                    ]}
                />
                <POItemsTable po={po} showSKU isMobile={isMobile} />
                <NotesBlock notes={po.notes} />
                <SummaryBox items={deliverySummaryItems(po)} />
            </div>
        ))}

        <PrintFooter label="End of Report —" />
    </div>
);

// ── Main modal ────────────────────────────────────────────────────────────────
const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
    visible,
    onClose,
    data,
    type,
    title,
}) => {
    const componentRef = useRef<HTMLDivElement>(null);
    const [isPdf, setIsPdf] = useState(true);
    const { BRAND_NAME1 } = useSystemDetails();
    const isMobile = useIsMobile();

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        pageStyle: isPdf
            ? `@page { size: A4; margin: 18mm; }
         @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }`
            : `@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
         .ant-modal-mask, .ant-modal-wrap, .ant-modal-header, .ant-modal-footer { display: none !important; } }`,
    });

    const renderContent = () => {
        if (!data) return null;
        // Always print with desktop table (isMobile=false) so PDF is never empty/card-based
        switch (type) {
            case "single": return renderSinglePO(data as PO, BRAND_NAME1, isMobile);
            case "bulk": return renderBulkPOs(data as PO[], BRAND_NAME1, isMobile);
            case "items": return renderItemsOnly(data as PO, BRAND_NAME1, isMobile);
            default: return null;
        }
    };

    // ── Shared: toggle pill ───────────────────────────────────────────────────────
    const PrintToggle = (
        <Space size={6} align="center">
            <PrinterOutlined style={{ color: C.subText, fontSize: 14 }} />
            <Text style={{ fontSize: 12, color: C.subText }}>Thermal</Text>
            <Switch
                checked={isPdf}
                onChange={setIsPdf}
                checkedChildren="A4"
                unCheckedChildren="TH"
                style={{ background: isPdf ? C.primary : "#94a3b8" }}
            />
            <Text style={{ fontSize: 12, color: C.subText }}>A4 PDF</Text>
            <FilePdfOutlined style={{ color: C.subText, fontSize: 14 }} />
        </Space>
    );

    // ── Shared: action buttons ────────────────────────────────────────────────────
    const ActionButtons = (
        <Space size={8}>
            <Button
                icon={<CloseOutlined />}
                onClick={onClose}
                style={{ borderRadius: 7, height: isMobile ? 38 : 32 }}
            >
                Close
            </Button>
            <Button
                type="primary"
                icon={isPdf ? <FilePdfOutlined /> : <PrinterOutlined />}
                onClick={handlePrint}
                style={{
                    background: C.primary,
                    borderColor: C.primary,
                    borderRadius: 7,
                    fontWeight: 500,
                    height: isMobile ? 38 : 32,
                }}
            >
                {isPdf ? "Save as PDF" : "Print"}
            </Button>
        </Space>
    );

    // ── Inner layout (reused in both Drawer and Modal) ────────────────────────────
    const InnerLayout = (
        <>
            {/* Toggle bar */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 10,
                    padding: isMobile ? "10px 14px" : "8px 12px",
                    background: "#f8fafc",
                    borderBottom: `1px solid ${C.tableBorder}`,
                    flexShrink: 0,
                }}
            >
                {PrintToggle}
            </div>

            {/* Scrollable preview — ref lives HERE directly in JSX, never in a variable */}
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "auto",
                    background: isMobile ? "#f1f5f9" : "#fff",
                    padding: isMobile ? "12px 8px" : 0,
                    WebkitOverflowScrolling: "touch",
                }}
            >
                <div
                    ref={componentRef}
                    style={{
                        fontFamily: isPdf ? "'Segoe UI', Roboto, sans-serif" : "'Courier New', monospace",
                        padding: isMobile ? 12 : isPdf ? 28 : 16,
                        background: "#fff",
                        minHeight: 200,
                        ...(isPdf && !isMobile
                            ? { boxShadow: "0 0 0 1px rgba(0,0,0,0.04)", maxWidth: 920, margin: "0 auto" }
                            : {}),
                        ...(isMobile
                            ? { borderRadius: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }
                            : {}),
                    }}
                >
                    {renderContent()}
                </div>
            </div>

            {/* Mobile pinned action bar */}
            {isMobile && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        borderTop: `1px solid ${C.tableBorder}`,
                        background: "#fff",
                        flexShrink: 0,
                        gap: 8,
                    }}
                >
                    <Text style={{ fontSize: 12, color: C.subText }}>
                        {isPdf ? "A4 format ready" : "Thermal format ready"}
                    </Text>
                    {ActionButtons}
                </div>
            )}
        </>
    );

    // ── Mobile: full-screen bottom Drawer ─────────────────────────────────────────
    if (isMobile) {
        return (
            <Drawer
                open={visible}
                onClose={onClose}
                placement="bottom"
                height="94vh"
                title={
                    <Space size={8}>
                        <div
                            style={{
                                background: C.primaryLight,
                                borderRadius: 7,
                                padding: "4px 6px",
                                color: C.primary,
                                fontSize: 14,
                                lineHeight: 1,
                            }}
                        >
                            <PrinterOutlined />
                        </div>
                        <Text strong style={{ fontSize: 13, color: C.darkText }}>
                            {title || "Print Preview"}
                        </Text>
                    </Space>
                }
                styles={{
                    body: { padding: 0, display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" },
                    header: { padding: "12px 16px", borderBottom: `1px solid ${C.tableBorder}` },
                }}
                closeIcon={<CloseOutlined style={{ fontSize: 13 }} />}
            >
                {InnerLayout}
            </Drawer>
        );
    }

    // ── Desktop: Modal ────────────────────────────────────────────────────────────
    return (
        <Modal
            title={
                <Space size={10}>
                    <div
                        style={{
                            background: C.primaryLight,
                            borderRadius: 8,
                            padding: "5px 7px",
                            color: C.primary,
                            fontSize: 15,
                            lineHeight: 1,
                        }}
                    >
                        <PrinterOutlined />
                    </div>
                    <Text strong style={{ fontSize: 14, color: C.darkText }}>
                        {title || "Print Preview"}
                    </Text>
                </Space>
            }
            open={visible}
            onCancel={onClose}
            width="88%"
            style={{ top: 16 }}
            styles={{ body: { padding: 0 } }}
            footer={
                <Space style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    {PrintToggle}
                    {ActionButtons}
                </Space>
            }
        >
            <div style={{ maxHeight: "72vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {InnerLayout}
            </div>
        </Modal>
    );
};

export default PrintPreviewModal;