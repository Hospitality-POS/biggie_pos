import React, { useEffect, useRef, useState } from "react";
import { Button, Drawer, Form, Input, Modal, Space, Switch, Typography } from "antd";
import {
    CloseOutlined,
    FilePdfOutlined,
    MailOutlined,
    PrinterOutlined,
    PlusOutlined,
    SendOutlined,
    UserOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import { sendPurchaseOrderEmail, refToHtmlString } from "@services/emailReports";

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
    blue: "#3b82f6",
    white: "#ffffff",
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
    direction?: 'supplier' | 'customer';
    supplier_id?: { name: string; phone?: string; email?: string } | null;
    customer_id?: { customer_name: string; phone?: string; email?: string; address?: any } | null;
    status: string;
    po_items: POItem[];
    total_amount: number;
    delivery_percentage: number;
    expected_delivery_date?: string;
    created_by: { fullname: string; email?: string };
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

interface SendEmailValues {
    to: string;
    recipientName?: string;
    cc?: string;
    intro?: string;
}

// ── Style helpers ─────────────────────────────────────────────────────────────
const cell = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    border: `1px solid ${C.tableBorder}`,
    padding: "7px 10px",
    verticalAlign: "middle",
    ...extra,
});

const th = (extra: React.CSSProperties = {}): React.CSSProperties =>
    cell({
        background: `linear-gradient(135deg, ${C.primary} 0%, #8b2a3e 100%)`,
        fontWeight: 700,
        fontSize: 11,
        color: C.white,
        whiteSpace: "nowrap",
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
        ...extra,
    } as React.CSSProperties);

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
const DocHeader: React.FC<{ brand: string; docTitle: string }> = ({ brand, docTitle }) => (
    <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: `3px solid ${C.primary}`,
        paddingBottom: 20,
        marginBottom: 24,
    }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img 
                src="/logo.png" 
                alt="Company Logo" 
                style={{ 
                    width: 60, 
                    height: 60, 
                    objectFit: "contain",
                    borderRadius: 8,
                }}
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
            <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: C.darkText, lineHeight: 1.2 }}>{brand}</div>
                <div style={{ fontSize: 12, color: C.subText, marginTop: 4, fontWeight: 500 }}>Powered by {COOP_NAME}</div>
            </div>
        </div>
        <div style={{
            background: `linear-gradient(135deg, ${C.primary} 0%, #8b2a3e 100%)`, 
            color: C.white,
            padding: "10px 24px", 
            borderRadius: 8,
            fontWeight: 700, 
            fontSize: 15, 
            letterSpacing: "0.5px",
            boxShadow: "0 2px 8px rgba(108, 28, 44, 0.3)",
            printColorAdjust: "exact", 
            WebkitPrintColorAdjust: "exact",
        } as React.CSSProperties}>
            {docTitle}
        </div>
    </div>
);

// ── Info Grid ─────────────────────────────────────────────────────────────────
const InfoGrid: React.FC<{ left: [string, string][]; right: [string, string][] }> = ({ left, right }) => (
    <div style={{
        display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24,
        background: "linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%)", 
        border: `1px solid ${C.tableBorder}`,
        borderRadius: 12, padding: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
        {[left, right].map((col, ci) => (
            <div key={ci} style={{ flex: "1 1 160px", minWidth: 0 }}>
                {col.map(([label, value]) => (
                    <div key={label} style={{ marginBottom: 8, fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: "#475569", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.5px" }}>{label}: </span>
                        <span style={{ color: "#1e293b", wordBreak: "break-word", fontWeight: 500 }}>{value}</span>
                    </div>
                ))}
            </div>
        ))}
    </div>
);

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusText: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
        pending: C.orange,
        approved: C.green,
        partially_delivered: C.blue,
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
    <div style={{
        background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", 
        border: "2px solid #0ea5e9",
        borderRadius: 10, padding: 16, marginTop: 20,
        boxShadow: "0 2px 8px rgba(14, 165, 233, 0.15)",
    }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
            {items.map(([label, value]) => (
                <div key={label} style={{ fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: "#0369a1", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.5px" }}>{label}: </span>
                    <span style={{ color: C.darkText, fontWeight: 600 }}>{value}</span>
                </div>
            ))}
        </div>
    </div>
);

// ── Notes block ───────────────────────────────────────────────────────────────
const NotesBlock: React.FC<{ notes?: string }> = ({ notes }) =>
    notes ? (
        <div style={{
            marginTop: 16, fontSize: 12, padding: "12px 16px",
            background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", 
            border: "2px solid #f59e0b",
            borderRadius: 10, color: "#374151",
            boxShadow: "0 2px 8px rgba(245, 158, 11, 0.15)",
        }}>
            <strong style={{ color: "#b45309", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>Notes: </strong>
            <span style={{ fontWeight: 500 }}>{notes}</span>
        </div>
    ) : null;

// ── Footer ────────────────────────────────────────────────────────────────────
const PrintFooter: React.FC<{ label?: string }> = ({ label }) => (
    <div style={{
        marginTop: 24, paddingTop: 10,
        borderTop: `1px solid ${C.tableBorder}`,
        textAlign: "center", fontSize: 11, color: "#94a3b8",
    }}>
        {label || "Generated on"} {new Date().toLocaleString()}
    </div>
);

// ── PO Banner ─────────────────────────────────────────────────────────────────
const POBanner: React.FC<{ po: PO; showMeta?: boolean }> = ({ po, showMeta }) => (
    <div style={{
        background: `linear-gradient(135deg, ${C.primaryLight} 0%, #fce7eb 100%)`, 
        border: `2px solid ${C.primary}`,
        borderRadius: 10, padding: "14px 18px", marginBottom: 20,
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: 10,
        boxShadow: "0 2px 8px rgba(108, 28, 44, 0.15)",
    }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.primary, letterSpacing: "0.3px" }}>{po.po_number}</div>
        {showMeta && (
            <div style={{ fontSize: 12, color: C.subText, fontWeight: 500 }}>
                Status: <StatusText status={po.status} /> &nbsp;·&nbsp;
                Items: <strong style={{ color: C.darkText }}>{po.po_items?.length || 0}</strong> &nbsp;·&nbsp;
                Total: <strong style={{ color: C.primary }}>{fmt(po.total_amount || 0)}</strong>
            </div>
        )}
    </div>
);

// ── Mobile item card ──────────────────────────────────────────────────────────
const MobileItemCard: React.FC<{ item: POItem; index: number; showDeliveryStatus?: boolean }> = ({
    item, index, showDeliveryStatus,
}) => {
    const { label, color } = itemDeliveryStatus(item);
    const lineTotal = (item.quantity_ordered || 0) * (item.unit_price || 0);
    return (
        <div style={{
            background: index % 2 === 0 ? "#fff" : "linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%)",
            border: `1px solid ${C.tableBorder}`,
            borderRadius: 10, padding: "14px 16px", marginBottom: 10,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.darkText, flex: 1, marginRight: 8, lineHeight: 1.3 }}>
                    {item.inventory_id?.name || "N/A"}
                </span>
                {showDeliveryStatus && (
                    <span style={{ 
                        fontSize: 10, fontWeight: 700, color, whiteSpace: "nowrap",
                        padding: "4px 10px", borderRadius: 12, background: `${color}15`,
                        border: `1px solid ${color}40`
                    }}>{label}</span>
                )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: 12 }}>
                <div><span style={{ color: C.subText, fontWeight: 500 }}>Unit: </span>{item.unit_id?.abbreviation || item.unit_id?.name || "—"}</div>
                <div><span style={{ color: C.subText, fontWeight: 500 }}>Ordered: </span><strong>{item.quantity_ordered}</strong></div>
                <div><span style={{ color: C.subText, fontWeight: 500 }}>Received: </span>{item.quantity_received}</div>
                <div><span style={{ color: C.subText, fontWeight: 500 }}>Pending: </span>{item.quantity_ordered - item.quantity_received}</div>
                <div><span style={{ color: C.subText, fontWeight: 500 }}>Unit Price: </span>{fmt(item.unit_price)}</div>
                <div>
                    <span style={{ color: C.subText, fontWeight: 500 }}>Total: </span>
                    <strong style={{ color: C.primary, fontSize: 13 }}>{fmt(item.total_price || lineTotal)}</strong>
                </div>
            </div>
        </div>
    );
};

// ── Items table ───────────────────────────────────────────────────────────────
const POItemsTable: React.FC<{
    po: PO; showDeliveryStatus?: boolean; showSKU?: boolean; isMobile?: boolean;
}> = ({ po, showDeliveryStatus, showSKU, isMobile }) => {
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
                        <div style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "14px 18px", background: `linear-gradient(135deg, ${C.primaryLight} 0%, #fce7eb 100%)`,
                            borderRadius: 10, border: `2px solid ${C.primary}`, marginTop: 8,
                            boxShadow: "0 2px 8px rgba(108, 28, 44, 0.15)",
                        }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: C.primary, letterSpacing: "0.5px" }}>TOTAL AMOUNT</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>{fmt(po.total_amount)}</span>
                        </div>
                    </>
                ) : (
                    <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>No items</div>
                )}
            </div>
        );
    }

    // Build column definitions — drives both headers and cells
    const cols: { label: string; align: "left" | "right" | "center"; width?: string }[] = [
        { label: "Item", align: "left" },
        ...(showSKU ? [{ label: "SKU", align: "left" as const }] : []),
        { label: "Unit", align: "left", width: "60px" },
        { label: "Ordered", align: "right", width: "72px" },
        { label: "Received", align: "right", width: "80px" },
        { label: "Pending", align: "right", width: "72px" },
        { label: "Unit Price", align: "right", width: "100px" },
        { label: "Total", align: "right", width: "110px" },
        ...(showDeliveryStatus ? [{ label: "Status", align: "center" as const, width: "80px" }] : []),
    ];

    const totalColSpan = cols.length - 1;

    return (
        <div style={{ overflowX: "auto", marginBottom: 14 }}>
            <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                    {cols.map((col, i) => (
                        <col key={i} style={col.width ? { width: col.width } : {}} />
                    ))}
                </colgroup>
                <thead>
                    <tr>
                        {cols.map((col) => (
                            <th key={col.label} style={th({ textAlign: col.align })}>{col.label}</th>
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
                            {/* Total row */}
                            <tr style={{ background: `linear-gradient(135deg, ${C.primaryLight} 0%, #fce7eb 100%)` }}>
                                <td
                                    colSpan={totalColSpan}
                                    style={td({ fontWeight: 800, textAlign: "right", color: C.primary, borderLeft: `3px solid ${C.primary}`, fontSize: 13, letterSpacing: "0.5px" })}
                                >
                                    TOTAL AMOUNT
                                </td>
                                <td style={td({ textAlign: "right", fontWeight: 800, color: C.primary, fontSize: 14 })}>
                                    {fmt(po.total_amount)}
                                </td>
                            </tr>
                        </>
                    ) : (
                        <tr>
                            <td colSpan={cols.length} style={td({ textAlign: "center", color: "#94a3b8" })}>
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
const renderSinglePO = (po: PO, brand: string, isMobile?: boolean) => {
    const isCustomer = po.direction === 'customer';
    const counterpartyName = isCustomer ? po.customer_id?.customer_name : po.supplier_id?.name;
    const counterpartyContact = isCustomer ? po.customer_id?.phone : po.supplier_id?.phone;
    const counterpartyEmail = isCustomer ? po.customer_id?.email : po.supplier_id?.email;
    const counterpartyLabel = isCustomer ? 'Customer' : 'Supplier';
    const directionLabel = isCustomer ? 'Customer (Sales)' : 'Supplier (Purchase)';
    const docTitle = isCustomer ? 'SALES ORDER' : 'PURCHASE ORDER';

    return (
        <div>
            <DocHeader brand={brand} docTitle={docTitle} />
            <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: C.primary }}>{po.po_number}</div>
                <div style={{ fontSize: 11, color: C.subText, marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {directionLabel}
                </div>
            </div>
            <InfoGrid
                left={[
                    [counterpartyLabel, counterpartyName || "N/A"],
                    ["Contact", counterpartyContact || "N/A"],
                    ["Email", counterpartyEmail || "N/A"],
                ]}
                right={[
                    ["Status", po.status?.replace(/_/g, " ").toUpperCase() || "N/A"],
                    ["Expected", po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : "Not set"],
                    ["Created By", po.created_by?.fullname || "Unknown"],
                    ["Date", new Date(po.createdAt).toLocaleDateString()],
                ]}
            />
            <POItemsTable po={po} isMobile={isMobile} />
            <NotesBlock notes={po.notes} />
            <PrintFooter />
        </div>
    );
};

// ── Items only render ─────────────────────────────────────────────────────────
const renderItemsOnly = (po: PO, brand: string, isMobile?: boolean) => {
    const isCustomer = po.direction === 'customer';
    const counterpartyName = isCustomer ? po.customer_id?.customer_name : po.supplier_id?.name;
    const counterpartyContact = isCustomer ? po.customer_id?.phone : po.supplier_id?.phone;
    const counterpartyLabel = isCustomer ? 'Customer' : 'Supplier';
    const directionLabel = isCustomer ? 'Customer (Sales)' : 'Supplier (Purchase)';
    const docTitle = isCustomer ? 'SALES ORDER ITEMS' : 'PO ITEMS DETAIL';

    return (
        <div>
            <DocHeader brand={brand} docTitle={docTitle} />
            <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: C.primary }}>{po.po_number}</div>
                <div style={{ fontSize: 11, color: C.subText, marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {directionLabel}
                </div>
            </div>
            <InfoGrid
                left={[
                    [counterpartyLabel, counterpartyName || "N/A"],
                    ["Contact", counterpartyContact || "N/A"],
                    ["Status", po.status?.replace(/_/g, " ").toUpperCase() || "N/A"],
                ]}
                right={[
                    ["Expected", po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : "Not set"],
                    ["Created By", po.created_by?.fullname || "Unknown"],
                    ["Date", new Date(po.createdAt).toLocaleDateString()],
                ]}
            />
            <POItemsTable po={po} showDeliveryStatus showSKU isMobile={isMobile} />
            <SummaryBox items={deliverySummaryItems(po)} />
            <NotesBlock notes={po.notes} />
            <PrintFooter />
        </div>
    );
};

// ── Bulk PO render ────────────────────────────────────────────────────────────
const renderBulkPOs = (pos: PO[], brand: string, isMobile?: boolean) => (
    <div>
        <DocHeader brand={brand} docTitle="BULK PO REPORT" />
        <div style={{ textAlign: "center", marginBottom: 20, fontSize: 13, color: C.subText }}>
            {pos.length} Purchase Order{pos.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Generated {new Date().toLocaleString()}
        </div>
        {pos.map((po, index) => {
            const isCustomer = po.direction === 'customer';
            const counterpartyName = isCustomer ? po.customer_id?.customer_name : po.supplier_id?.name;
            const counterpartyContact = isCustomer ? po.customer_id?.phone : po.supplier_id?.phone;
            const counterpartyEmail = isCustomer ? po.customer_id?.email : po.supplier_id?.email;
            const counterpartyLabel = isCustomer ? 'Customer' : 'Supplier';
            const directionLabel = isCustomer ? 'Customer (Sales)' : 'Supplier (Purchase)';
            
            return (
                <div key={po._id} style={{
                    marginBottom: 40,
                    border: `2px solid ${C.tableBorder}`,
                    borderRadius: 12,
                    padding: isMobile ? 16 : 24,
                    pageBreakBefore: index > 0 ? "always" : "auto",
                    background: "#fff",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                }}>
                    <POBanner po={po} showMeta />
                    <InfoGrid
                        left={[
                            [counterpartyLabel, counterpartyName || "N/A"],
                            ["Contact", counterpartyContact || "N/A"],
                            ["Email", counterpartyEmail || "N/A"],
                        ]}
                        right={[
                            ["Expected", po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : "Not set"],
                            ["Created By", po.created_by?.fullname || "Unknown"],
                            ["Date", new Date(po.createdAt).toLocaleDateString()],
                            ["Progress", `${po.delivery_percentage || 0}%`],
                        ]}
                    />
                    <POItemsTable po={po} showSKU isMobile={isMobile} />
                    <NotesBlock notes={po.notes} />
                    <SummaryBox items={deliverySummaryItems(po)} />
                </div>
            );
        })}
        <PrintFooter label="End of Report —" />
    </div>
);

// ── Derive email meta from PO data ────────────────────────────────────────────
const getPoEmailMeta = (type: string, data: PO | PO[] | null) => {
    if (!data) return { poMeta: { totalAmount: 0 } };
    if (type === "bulk") {
        const pos = data as PO[];
        return {
            poMeta: {
                isBulk: true,
                count: pos.length,
                totalAmount: pos.reduce((s, po) => s + (po.total_amount || 0), 0),
            },
        };
    }
    const po = data as PO;
    const isCustomer = po.direction === 'customer';
    const counterpartyName = isCustomer ? po.customer_id?.customer_name : po.supplier_id?.name;
    return {
        poMeta: {
            poNumber: po.po_number,
            counterpartyName: counterpartyName,
            direction: po.direction || 'supplier',
            totalAmount: po.total_amount || 0,
            deliveryPercentage: po.delivery_percentage || 0,
        },
    };
};

// ══════════════════════════════════════════════════════════════════════════════
// SEND EMAIL SUB-MODAL
// ══════════════════════════════════════════════════════════════════════════════
const SendEmailModal: React.FC<{
    open: boolean;
    onClose: () => void;
    onSend: (values: SendEmailValues) => Promise<void>;
    sending: boolean;
}> = ({ open, onClose, onSend, sending }) => {
    const [form] = Form.useForm();

    const handleOk = async () => {
        const values = await form.validateFields();
        await onSend(values);
        form.resetFields();
    };

    return (
        <Modal
            open={open}
            onCancel={() => { form.resetFields(); onClose(); }}
            onOk={handleOk}
            confirmLoading={sending}
            okText={<Space><SendOutlined />Send Report</Space>}
            okButtonProps={{ style: { background: C.primary, borderColor: C.primary } }}
            title={<Space><MailOutlined style={{ color: C.primary }} /><span>Send Report via Email</span></Space>}
            width={480}
            destroyOnClose
        >
            <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
                <Form.Item
                    name="to"
                    label="Recipient Email"
                    rules={[
                        { required: true, message: "Recipient email is required" },
                        { type: "email", message: "Enter a valid email address" },
                    ]}
                >
                    <Input prefix={<MailOutlined style={{ color: C.subText }} />} placeholder="manager@company.com" />
                </Form.Item>
                <Form.Item name="recipientName" label="Recipient Name">
                    <Input prefix={<UserOutlined style={{ color: C.subText }} />} placeholder="e.g. Alice" />
                </Form.Item>
                <Form.Item name="cc" label="CC (optional)" extra="Separate multiple addresses with commas">
                    <Input prefix={<PlusOutlined style={{ color: C.subText }} />} placeholder="cfo@company.com, accounts@company.com" />
                </Form.Item>
                <Form.Item name="intro" label="Personal Message (optional)">
                    <Input.TextArea rows={3} placeholder="Please find the attached purchase order report." />
                </Form.Item>
            </Form>
        </Modal>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ══════════════════════════════════════════════════════════════════════════════
const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
    visible, onClose, data, type, title,
}) => {
    const componentRef = useRef<HTMLDivElement>(null);
    const [isPdf, setIsPdf] = useState(true);
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const { BRAND_NAME1 } = useSystemDetails();
    const isMobile = useIsMobile();

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        pageStyle: isPdf
            ? `@page { size: A4; margin: 18mm; }
               @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }`
            : `@media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }`,
    });

    const renderContent = () => {
        if (!data) return null;
        switch (type) {
            case "single": return renderSinglePO(data as PO, BRAND_NAME1, isMobile);
            case "bulk": return renderBulkPOs(data as PO[], BRAND_NAME1, isMobile);
            case "items": return renderItemsOnly(data as PO, BRAND_NAME1, isMobile);
            default: return null;
        }
    };

    // ── Email send ────────────────────────────────────────────────────────────
    const handleSendEmail = async (values: SendEmailValues) => {
        setSending(true);
        try {
            const htmlTable = refToHtmlString(componentRef);
            const { poMeta } = getPoEmailMeta(type, data);

            const ok = await sendPurchaseOrderEmail({
                to: values.to,
                recipientName: values.recipientName,
                intro: values.intro,
                cc: values.cc,
                poMeta,
                htmlTable,
            });

            if (ok) setEmailModalOpen(false);
        } finally {
            setSending(false);
        }
    };

    // ── Toggle pill ───────────────────────────────────────────────────────────
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

    // ── Action buttons ────────────────────────────────────────────────────────
    const ActionButtons = (
        <Space size={8}>
            <Button
                icon={<MailOutlined />}
                disabled={!data}
                onClick={() => setEmailModalOpen(true)}
                style={{ borderColor: C.primary, color: C.primary, borderRadius: 7, height: isMobile ? 38 : 32 }}
            >
                Send via Email
            </Button>
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
                style={{ background: C.primary, borderColor: C.primary, borderRadius: 7, fontWeight: 500, height: isMobile ? 38 : 32 }}
            >
                {isPdf ? "Save as PDF" : "Print"}
            </Button>
        </Space>
    );

    // ── Inner layout ──────────────────────────────────────────────────────────
    const InnerLayout = (
        <>
            {/* Toggle bar */}
            <div style={{
                display: "flex", justifyContent: "center", alignItems: "center", gap: 10,
                padding: isMobile ? "10px 14px" : "8px 12px",
                background: "#f8fafc", borderBottom: `1px solid ${C.tableBorder}`, flexShrink: 0,
            }}>
                {PrintToggle}
            </div>

            {/* Scrollable preview */}
            <div style={{
                flex: 1, overflowY: "auto", overflowX: "auto",
                background: isMobile ? "#f1f5f9" : "#fff",
                padding: isMobile ? "12px 8px" : 0,
                WebkitOverflowScrolling: "touch",
            }}>
                <div
                    ref={componentRef}
                    style={{
                        fontFamily: isPdf ? "'Segoe UI', system-ui, Arial, sans-serif" : "'Courier New', Courier, monospace",
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
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 16px", borderTop: `1px solid ${C.tableBorder}`,
                    background: "#fff", flexShrink: 0, gap: 8,
                }}>
                    <Text style={{ fontSize: 12, color: C.subText }}>
                        {isPdf ? "A4 format ready" : "Thermal format ready"}
                    </Text>
                    {ActionButtons}
                </div>
            )}
        </>
    );

    // ── Mobile: Drawer ────────────────────────────────────────────────────────
    if (isMobile) {
        return (
            <>
                <Drawer
                    open={visible}
                    onClose={onClose}
                    placement="bottom"
                    height="94vh"
                    title={
                        <Space size={8}>
                            <div style={{
                                background: C.primaryLight, borderRadius: 7,
                                padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1,
                            }}>
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

                <SendEmailModal
                    open={emailModalOpen}
                    onClose={() => setEmailModalOpen(false)}
                    onSend={handleSendEmail}
                    sending={sending}
                />
            </>
        );
    }

    // ── Desktop: Modal ────────────────────────────────────────────────────────
    return (
        <>
            <Modal
                title={
                    <Space size={10}>
                        <div style={{
                            background: C.primaryLight, borderRadius: 8,
                            padding: "5px 7px", color: C.primary, fontSize: 15, lineHeight: 1,
                        }}>
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

            <SendEmailModal
                open={emailModalOpen}
                onClose={() => setEmailModalOpen(false)}
                onSend={handleSendEmail}
                sending={sending}
            />
        </>
    );
};

export default PrintPreviewModal;