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
import { THEME_C } from "../../../../../../utils/getPrimaryColor";

const { Text } = Typography;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
    ...THEME_C,
    get primary() { return THEME_C.primary; },
    get primaryLight() { return THEME_C.primaryLight; },
    tableHeader: "#f8fafc",
    tableBorder: "#e2e8f0",
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

// ── Business shown on the document ────────────────────────────────────────────
interface Biz {
    name: string;
    logo?: string;
    phone?: string;
    email?: string;
    pin?: string;
    address?: string;
}

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

// ── Style helpers ─────────────────────────────────────────────────────────────
const LINE = "#e8edf3";

const th = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    padding: "9px 10px",
    background: C.primary,
    color: "#fff",
    fontWeight: 700,
    fontSize: 10.5,
    whiteSpace: "nowrap",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    verticalAlign: "middle",
    printColorAdjust: "exact",
    WebkitPrintColorAdjust: "exact",
    ...extra,
} as React.CSSProperties);

const td = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    padding: "9px 10px",
    borderBottom: `1px solid ${LINE}`,
    fontSize: 12,
    color: "#334155",
    verticalAlign: "middle",
    ...extra,
});

const sectionLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: C.primary,
    textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8,
};

const itemDeliveryStatus = (item: POItem) => {
    if (item.quantity_received === 0)
        return { label: "Pending", color: C.red };
    if (item.quantity_received < item.quantity_ordered)
        return { label: "Partial", color: C.orange };
    return { label: "Delivered", color: C.green };
};

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    pending: "#d97706",
    approved: "#059669",
    partially_delivered: "#2563eb",
    fully_delivered: "#059669",
    cancelled: "#dc2626",
};

const StatusPill: React.FC<{ status?: string }> = ({ status }) => {
    if (!status) return null;
    const color = STATUS_COLORS[status] || "#64748b";
    return (
        <span style={{
            display: "inline-block", padding: "3px 10px", borderRadius: 999,
            fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase",
            color, background: `${color}14`, border: `1px solid ${color}40`,
            printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
        } as React.CSSProperties}>
            {status.replace(/_/g, " ")}
        </span>
    );
};

// ── Doc Header: business on the left, document title + key facts on the right ─
const DocHeader: React.FC<{
    biz: Biz; docTitle: string;
    number?: string; date?: string; status?: string; subtitle?: string;
}> = ({ biz, docTitle, number, date, status, subtitle }) => (
    <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                {biz.logo && (
                    <img
                        src={biz.logo}
                        alt=""
                        style={{ height: 56, maxWidth: 140, objectFit: "contain" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                )}
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.darkText, lineHeight: 1.2 }}>{biz.name || "Business"}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, lineHeight: 1.6 }}>
                        {[biz.phone, biz.email].filter(Boolean).join("  ·  ")}
                        {(biz.pin || biz.address) && (
                            <div>{[biz.pin && `KRA PIN: ${biz.pin}`, biz.address].filter(Boolean).join("  ·  ")}</div>
                        )}
                    </div>
                </div>
            </div>
            <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.primary, letterSpacing: "1px", lineHeight: 1.1 }}>{docTitle}</div>
                {subtitle && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, fontWeight: 600 }}>{subtitle}</div>}
                {number && <div style={{ fontSize: 14, fontWeight: 700, color: C.darkText, marginTop: 6 }}>{number}</div>}
                {date && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Date: {date}</div>}
                {status && <div style={{ marginTop: 6 }}><StatusPill status={status} /></div>}
            </div>
        </div>
        <div style={{ display: "flex", height: 3, marginTop: 16, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ flex: 3, background: C.primary, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties} />
            <div style={{ flex: 1, background: C.primaryLight, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties} />
        </div>
    </div>
);

// ── Info cards (e.g. Supplier / Order details) ────────────────────────────────
const InfoGrid: React.FC<{
    left: [string, React.ReactNode][]; right: [string, React.ReactNode][]; titles?: [string, string];
}> = ({ left, right, titles = ["Details", "Order Details"] }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        {[left, right].map((col, ci) => (
            <div key={ci} style={{
                flex: "1 1 220px", minWidth: 0,
                border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px",
                background: "#fff",
            }}>
                <div style={sectionLabel}>{titles[ci]}</div>
                {col.map(([label, value]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, padding: "3px 0" }}>
                        <span style={{ color: "#64748b" }}>{label}</span>
                        <span style={{ color: "#0f172a", fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
                    </div>
                ))}
            </div>
        ))}
    </div>
);

// ── Summary (delivery progress) ───────────────────────────────────────────────
const SummaryBox: React.FC<{ items: [string, string | number][] }> = ({ items }) => (
    <div style={{ marginTop: 18 }}>
        <div style={sectionLabel}>Delivery Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
            {items.map(([label, value]) => (
                <div key={label} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "8px 12px", background: "#f8fafc" }}>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.darkText, marginTop: 2 }}>{value}</div>
                </div>
            ))}
        </div>
    </div>
);

// ── Notes block ───────────────────────────────────────────────────────────────
const NotesBlock: React.FC<{ notes?: string }> = ({ notes }) =>
    notes ? (
        <div style={{
            marginTop: 18, fontSize: 12, padding: "10px 14px",
            background: "#f8fafc", borderLeft: `3px solid ${C.primary}`,
            borderRadius: "0 8px 8px 0", color: "#334155",
        }}>
            <div style={{ ...sectionLabel, marginBottom: 4 }}>Notes</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{notes}</div>
        </div>
    ) : null;

// ── Footer ────────────────────────────────────────────────────────────────────
const PrintFooter: React.FC<{ label?: string }> = ({ label }) => (
    <div style={{
        marginTop: 28, paddingTop: 10,
        borderTop: `1px solid ${LINE}`,
        display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6,
        fontSize: 10.5, color: "#94a3b8",
    }}>
        <span>{label || "Generated on"} {new Date().toLocaleString("en-GB")}</span>
        <span>Powered by {COOP_NAME}</span>
    </div>
);

// ── PO Banner (bulk report, one per order) ────────────────────────────────────
const POBanner: React.FC<{ po: PO; showMeta?: boolean }> = ({ po, showMeta }) => (
    <div style={{
        borderLeft: `4px solid ${C.primary}`, background: "#f8fafc",
        borderRadius: "0 10px 10px 0", padding: "12px 16px", marginBottom: 16,
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: 10,
    }}>
        <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.darkText }}>{po.po_number}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{fmtDate(po.createdAt)}</div>
        </div>
        {showMeta && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#64748b" }}>
                <StatusPill status={po.status} />
                <span>Items: <strong style={{ color: C.darkText }}>{po.po_items?.length || 0}</strong></span>
                <span>Total: <strong style={{ color: C.primary }}>{fmt(po.total_amount || 0)}</strong></span>
            </div>
        )}
    </div>
);

// ── Mobile item card ──────────────────────────────────────────────────────────
const MobileItemCard: React.FC<{ item: POItem; index: number; showDeliveryStatus?: boolean }> = ({
    item, showDeliveryStatus,
}) => {
    const { label, color } = itemDeliveryStatus(item);
    const lineTotal = (item.quantity_ordered || 0) * (item.unit_price || 0);
    return (
        <div style={{
            background: "#fff", border: `1px solid ${LINE}`,
            borderRadius: 10, padding: "12px 14px", marginBottom: 8,
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.darkText, flex: 1, marginRight: 8, lineHeight: 1.3 }}>
                    {item.inventory_id?.name || "N/A"}
                </span>
                {showDeliveryStatus && (
                    <span style={{
                        fontSize: 10, fontWeight: 700, color, whiteSpace: "nowrap",
                        padding: "3px 9px", borderRadius: 999, background: `${color}14`,
                        border: `1px solid ${color}40`,
                    }}>{label}</span>
                )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 16px", fontSize: 12 }}>
                <div><span style={{ color: "#64748b" }}>Unit: </span>{item.unit_id?.abbreviation || item.unit_id?.name || "—"}</div>
                <div><span style={{ color: "#64748b" }}>Ordered: </span><strong>{item.quantity_ordered}</strong></div>
                <div><span style={{ color: "#64748b" }}>Received: </span>{item.quantity_received}</div>
                <div><span style={{ color: "#64748b" }}>Pending: </span>{item.quantity_ordered - item.quantity_received}</div>
                <div><span style={{ color: "#64748b" }}>Unit Price: </span>{fmt(item.unit_price)}</div>
                <div>
                    <span style={{ color: "#64748b" }}>Total: </span>
                    <strong style={{ color: C.primary }}>{fmt(item.total_price || lineTotal)}</strong>
                </div>
            </div>
        </div>
    );
};

// ── Totals panel (right-aligned, under the items) ─────────────────────────────
const TotalsPanel: React.FC<{ po: PO }> = ({ po }) => {
    const ordered = (po.po_items || []).reduce((s, i) => s + (Number(i.quantity_ordered) || 0), 0);
    const received = (po.po_items || []).reduce((s, i) => s + (Number(i.quantity_received) || 0), 0);
    return (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <div style={{ width: 300, maxWidth: "100%", fontSize: 12 }}>
                {[
                    ["Line items", String(po.po_items?.length || 0)],
                    ["Quantity ordered", ordered.toLocaleString()],
                    ["Quantity received", received.toLocaleString()],
                ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 12px", color: "#475569" }}>
                        <span>{k}</span><span style={{ fontWeight: 600, color: "#0f172a" }}>{v}</span>
                    </div>
                ))}
                <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginTop: 6, padding: "9px 12px", borderRadius: 8,
                    background: C.primary, color: "#fff", fontWeight: 800, fontSize: 14,
                    printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
                } as React.CSSProperties}>
                    <span>Total Amount</span><span>{fmt(po.total_amount || 0)}</span>
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
                <div style={sectionLabel}>Items ({po.po_items?.length || 0})</div>
                {po.po_items?.length ? (
                    po.po_items.map((item, i) => (
                        <MobileItemCard key={i} item={item} index={i} showDeliveryStatus={showDeliveryStatus} />
                    ))
                ) : (
                    <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>No items</div>
                )}
                <TotalsPanel po={po} />
            </div>
        );
    }

    // Column definitions drive both headers and cells
    const cols: { label: string; align: "left" | "right" | "center"; width?: string }[] = [
        { label: "#", align: "center", width: "34px" },
        { label: "Item", align: "left" },
        ...(showSKU ? [{ label: "SKU", align: "left" as const, width: "90px" }] : []),
        { label: "Unit", align: "left", width: "64px" },
        { label: "Ordered", align: "right", width: "70px" },
        { label: "Received", align: "right", width: "76px" },
        { label: "Pending", align: "right", width: "70px" },
        { label: "Unit Price", align: "right", width: "100px" },
        { label: "Total", align: "right", width: "110px" },
        ...(showDeliveryStatus ? [{ label: "Status", align: "center" as const, width: "84px" }] : []),
    ];

    return (
        <div style={{ marginBottom: 6 }}>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup>
                        {cols.map((col, i) => (
                            <col key={i} style={col.width ? { width: col.width } : {}} />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            {cols.map((col, i) => (
                                <th key={col.label} style={th({
                                    textAlign: col.align,
                                    ...(i === 0 ? { borderRadius: "6px 0 0 0" } : {}),
                                    ...(i === cols.length - 1 ? { borderRadius: "0 6px 0 0" } : {}),
                                })}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {po.po_items?.length ? (
                            po.po_items.map((item, i) => {
                                const { label, color } = itemDeliveryStatus(item);
                                return (
                                    <tr key={i}>
                                        <td style={td({ textAlign: "center", color: "#94a3b8" })}>{i + 1}</td>
                                        <td style={td({ fontWeight: 600, color: "#0f172a" })}>{item.inventory_id?.name || "N/A"}</td>
                                        {showSKU && <td style={td({ color: "#64748b" })}>{item.inventory_id?.sku || "—"}</td>}
                                        <td style={td()}>{item.unit_id?.abbreviation || item.unit_id?.name || "—"}</td>
                                        <td style={td({ textAlign: "right" })}>{item.quantity_ordered}</td>
                                        <td style={td({ textAlign: "right" })}>{item.quantity_received}</td>
                                        <td style={td({ textAlign: "right" })}>{item.quantity_ordered - item.quantity_received}</td>
                                        <td style={td({ textAlign: "right" })}>{fmt(item.unit_price)}</td>
                                        <td style={td({ textAlign: "right", fontWeight: 700, color: "#0f172a" })}>{fmt(item.total_price)}</td>
                                        {showDeliveryStatus && (
                                            <td style={td({ textAlign: "center" })}>
                                                <span style={{ fontSize: 10, fontWeight: 700, color, padding: "2px 8px", borderRadius: 999, background: `${color}14` }}>{label}</span>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
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
            <TotalsPanel po={po} />
        </div>
    );
};

const deliverySummaryItems = (po: PO): [string, string | number][] => [
    ["Delivery Progress", `${po.delivery_percentage || 0}%`],
    ["Not Delivered", po.po_items?.filter((i) => i.quantity_received === 0).length || 0],
    ["Partial", po.po_items?.filter((i) => i.quantity_received > 0 && i.quantity_received < i.quantity_ordered).length || 0],
    ["Fully Delivered", po.po_items?.filter((i) => i.quantity_received >= i.quantity_ordered).length || 0],
];

const partyOf = (po: PO) => {
    const isCustomer = po.direction === "customer";
    return {
        isCustomer,
        label: isCustomer ? "Customer" : "Supplier",
        name: (isCustomer ? po.customer_id?.customer_name : po.supplier_id?.name) || "—",
        phone: (isCustomer ? po.customer_id?.phone : po.supplier_id?.phone) || "—",
        email: (isCustomer ? po.customer_id?.email : po.supplier_id?.email) || "—",
    };
};

const orderDetails = (po: PO, extra: [string, React.ReactNode][] = []): [string, React.ReactNode][] => [
    ["Order type", po.direction === "customer" ? "Sales order" : "Purchase"],
    ["Expected delivery", po.expected_delivery_date ? fmtDate(po.expected_delivery_date) : "Not set"],
    ["Created by", po.created_by?.fullname || "—"],
    ...extra,
];

// ── Single PO render ──────────────────────────────────────────────────────────
const renderSinglePO = (po: PO, biz: Biz, isMobile?: boolean) => {
    const p = partyOf(po);
    return (
        <div>
            <DocHeader
                biz={biz}
                docTitle={p.isCustomer ? "SALES ORDER" : "PURCHASE ORDER"}
                number={po.po_number}
                date={fmtDate(po.createdAt)}
                status={po.status}
            />
            <InfoGrid
                titles={[p.isCustomer ? "Bill To" : "Supplier", "Order Details"]}
                left={[["Name", p.name], ["Phone", p.phone], ["Email", p.email]]}
                right={orderDetails(po)}
            />
            <POItemsTable po={po} isMobile={isMobile} />
            <NotesBlock notes={po.notes} />
            <PrintFooter />
        </div>
    );
};

// ── Items only render ─────────────────────────────────────────────────────────
const renderItemsOnly = (po: PO, biz: Biz, isMobile?: boolean) => {
    const p = partyOf(po);
    return (
        <div>
            <DocHeader
                biz={biz}
                docTitle={p.isCustomer ? "SALES ORDER ITEMS" : "PO ITEMS DETAIL"}
                number={po.po_number}
                date={fmtDate(po.createdAt)}
                status={po.status}
            />
            <InfoGrid
                titles={[p.isCustomer ? "Customer" : "Supplier", "Order Details"]}
                left={[["Name", p.name], ["Phone", p.phone]]}
                right={orderDetails(po)}
            />
            <POItemsTable po={po} showDeliveryStatus showSKU isMobile={isMobile} />
            <SummaryBox items={deliverySummaryItems(po)} />
            <NotesBlock notes={po.notes} />
            <PrintFooter />
        </div>
    );
};

// ── Bulk PO render ────────────────────────────────────────────────────────────
const renderBulkPOs = (pos: PO[], biz: Biz, isMobile?: boolean) => (
    <div>
        <DocHeader
            biz={biz}
            docTitle="PURCHASE ORDERS"
            subtitle={`${pos.length} order${pos.length !== 1 ? "s" : ""}`}
            date={fmtDate(new Date().toISOString())}
        />
        {pos.map((po, index) => {
            const p = partyOf(po);
            return (
                <div key={po._id} style={{
                    marginBottom: 28,
                    paddingBottom: 20,
                    borderBottom: index < pos.length - 1 ? `1px dashed ${LINE}` : "none",
                    pageBreakBefore: index > 0 ? "always" : "auto",
                }}>
                    <POBanner po={po} showMeta />
                    <InfoGrid
                        titles={[p.label, "Order Details"]}
                        left={[["Name", p.name], ["Phone", p.phone], ["Email", p.email]]}
                        right={orderDetails(po, [["Progress", `${po.delivery_percentage || 0}%`]])}
                    />
                    <POItemsTable po={po} showSKU isMobile={isMobile} />
                    <NotesBlock notes={po.notes} />
                    <SummaryBox items={deliverySummaryItems(po)} />
                </div>
            );
        })}
        <PrintFooter label="End of report —" />
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
    const sys = useSystemDetails();
    const biz: Biz = {
        name: sys.BRAND_NAME1,
        logo: sys.tenant_logo?.url,
        phone: sys.PHONE_NO,
        email: sys.EMAIL_URL,
        pin: sys.PIN,
        address: sys.PO_BOX,
    };
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
            case "single": return renderSinglePO(data as PO, biz, isMobile);
            case "bulk": return renderBulkPOs(data as PO[], biz, isMobile);
            case "items": return renderItemsOnly(data as PO, biz, isMobile);
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
            {/* Toggle bar — mobile only; desktop shows it in the footer */}
            {isMobile && <div style={{
                display: "flex", justifyContent: "center", alignItems: "center", gap: 10,
                padding: isMobile ? "10px 14px" : "8px 12px",
                background: "#f8fafc", borderBottom: `1px solid ${C.tableBorder}`, flexShrink: 0,
            }}>
                {PrintToggle}
            </div>}

            {/* Scrollable preview */}
            <div style={{
                flex: 1, overflowY: "auto", overflowX: "auto",
                background: "#f1f5f9",
                padding: isMobile ? "12px 8px" : "24px 16px",
                WebkitOverflowScrolling: "touch",
            }}>
                <div
                    ref={componentRef}
                    style={{
                        fontFamily: isPdf ? "'Segoe UI', system-ui, Arial, sans-serif" : "'Courier New', Courier, monospace",
                        padding: isMobile ? 14 : isPdf ? 36 : 16,
                        background: "#fff",
                        minHeight: 200,
                        ...(!isMobile
                            ? { boxShadow: "0 1px 3px rgba(15,23,42,0.08), 0 8px 24px rgba(15,23,42,0.06)", borderRadius: 4, maxWidth: isPdf ? 860 : 420, margin: "0 auto" }
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