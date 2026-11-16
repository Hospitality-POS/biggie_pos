import React, { forwardRef, useMemo, useRef, useState } from "react";
import { Button, Empty, Modal, Segmented, Spin, Space, Switch, Table, Tooltip, Typography } from "antd";
import {
    AuditOutlined,
    DollarOutlined,
    RiseOutlined,
    CalendarOutlined,
    FilePdfOutlined,
    FileTextOutlined,
    MobileOutlined,
    PrinterFilled,
    ShoppingOutlined,
    UnorderedListOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import { useInventoryUsageReportQuery } from "@hooks/queries";
import useSystemDetails from "@hooks/useSystemDetails";
import { useThermalAgentPrint } from "@hooks/useThermalAgentPrint";
import ThermalPrintControls from "./ThermalPrintControls";
import { COOP_NAME } from "@utils/config";
import "@components/MODALS/bill.css";

const { Text } = Typography;
import { THEME_C } from "@utils/getPrimaryColor";

type PrintMode = "thermal" | "a4";

// ── Palette (Dynamic Getters) ─────────────────────────────────────────────────
const C = THEME_C;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtQty = (v: number) => Number(v || 0).toFixed(1);
const fmtMoney = (v: number | null | undefined) =>
    v == null ? "—" : Number(v).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v: number | null | undefined) => (v == null ? "—" : `${v.toFixed(1)}%`);

/** Usage row with prices worked out (API: buying_price, selling_price, cost_total, usage_type). */
interface PricedRow {
    buying: number | null;
    selling: number | null;
    cost: number | null;     // cost of the quantity used
    value: number | null;    // quantity × selling price
    profit: number | null;
    marginPct: number | null;
}

const priceRow = (item: any): PricedRow => {
    const qty = Number(item.quantity) || 0;
    const buying = typeof item.buying_price === "number" ? item.buying_price : null;
    // Internal-only items (ingredients, supplies) aren't sold on their own
    const selling = item.usage_type !== "internal" && typeof item.selling_price === "number" && item.selling_price > 0
        ? item.selling_price : null;
    const cost = typeof item.cost_total === "number" ? item.cost_total : buying != null ? buying * qty : null;
    const value = selling != null ? selling * qty : null;
    const profit = value != null && cost != null ? value - cost : null;
    const marginPct = selling != null && buying != null ? ((selling - buying) / selling) * 100 : null;
    return { buying, selling, cost, value, profit, marginPct };
};

interface MarginTotals { cost: number; value: number; profit: number; marginPct: number | null; priced: number }

const marginTotals = (data: any[]): MarginTotals => {
    let cost = 0, value = 0, profit = 0, pricedValue = 0, priced = 0;
    data.forEach((d) => {
        const p = priceRow(d);
        if (p.cost != null) cost += p.cost;
        if (p.value != null) value += p.value;
        if (p.profit != null) { profit += p.profit; pricedValue += p.value!; priced++; }
    });
    return { cost, value, profit, marginPct: pricedValue > 0 ? (profit / pricedValue) * 100 : null, priced };
};
const marginColor = (m: number | null) => (m == null ? C.subText : m < 0 ? "#dc2626" : m < 15 ? "#d97706" : "#16a34a");

// ── Summary card ──────────────────────────────────────────────────────────────
const SummaryCard: React.FC<{
    label: string; value: string; color: string; bg: string; icon: React.ReactNode;
}> = ({ label, value, color, bg, icon }) => (
    <div style={{
        flex: "1 1 130px", background: bg,
        border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`,
        borderRadius: 8, padding: "10px 14px",
    }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ color, fontSize: 12 }}>{icon}</span>
            <Text style={{ fontSize: 10, color: C.subText, textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 700 }}>
                {label}
            </Text>
        </div>
        <Text strong style={{ fontSize: 14, color }}>{value}</Text>
    </div>
);

// ── Shared props ──────────────────────────────────────────────────────────────
interface ReportProps {
    data: any[];
    startDate: string;
    endDate: string;
    brandName: string;
    totalQty: number;
    /** Include buying / selling price, cost, sales value, profit and margin */
    showMargin: boolean;
    totals: MarginTotals;
}

// ══════════════════════════════════════════════════════════════════════════════
// THERMAL RECEIPT
// ══════════════════════════════════════════════════════════════════════════════
const ThermalReceipt = forwardRef<HTMLDivElement, ReportProps>(({
    data, startDate, endDate, brandName, totalQty, showMargin, totals,
}, ref) => (
    <>
        <style>{`
      @media print {
        @page { size: 80mm auto; margin: 4mm; }
        body * { visibility: hidden; }
        #invusage-thermal, #invusage-thermal * { visibility: visible; }
        #invusage-thermal { position: absolute; inset: 0; }
      }
    `}</style>
        <div id="invusage-thermal" ref={ref}
            style={{ fontFamily: "monospace", color: "#000", padding: "8px 4px", maxWidth: 320, margin: "0 auto" }}>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 10 }}>
                {brandName && brandName !== "undefined undefined" && (
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{brandName}</div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px" }}>INVENTORY USAGE REPORT</div>
                <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
                <div style={{ fontSize: 10, color: "#555" }}>
                    <strong>From:</strong> {dayjs(startDate).format("MMM DD, YYYY h:mm A")}
                </div>
                <div style={{ fontSize: 10, color: "#555" }}>
                    <strong>To:</strong> {dayjs(endDate).format("MMM DD, YYYY h:mm A")}
                </div>
                <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
            </div>

            {/* Items */}
            <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", fontSize: 9, fontWeight: 700, borderBottom: "2px solid #000", paddingBottom: 3, marginBottom: 4 }}>
                    <span style={{ flex: 3 }}>ITEM NAME</span>
                    <span style={{ width: 44, textAlign: "right" }}>QTY</span>
                    <span style={{ width: 36, textAlign: "right" }}>UNIT</span>
                </div>
                {data.map((item: any, i: number) => (
                    <div key={(item.inventory_id || i) + ":" + (item.variant_id || "")} style={{ display: "flex", flexWrap: "wrap", fontSize: 10, padding: "3px 0", borderBottom: "1px dotted #ddd" }}>
                        <span style={{ flex: 3, fontWeight: 600, wordBreak: "break-word", paddingRight: 4 }}>{item.name}</span>
                        <span style={{ width: 44, textAlign: "right" }}>{fmtQty(item.quantity)}</span>
                        <span style={{ width: 36, textAlign: "right", color: "#777" }}>{item.uom}</span>
                        {showMargin && (() => {
                            const p = priceRow(item);
                            return (
                                <span style={{ flexBasis: "100%", fontSize: 9, color: "#555", paddingTop: 1 }}>
                                    Buy {fmtMoney(p.buying)} · Sell {fmtMoney(p.selling)} · Margin {fmtPct(p.marginPct)}
                                    {p.profit != null && <> · Profit {fmtMoney(p.profit)}</>}
                                </span>
                            );
                        })()}
                    </div>
                ))}
            </div>

            {/* Totals */}
            <div style={{ borderTop: "1px dashed #999", paddingTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, padding: "2px 0", borderBottom: "1px dotted #ddd" }}>
                    <span>Total Items:</span>
                    <span>{data.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, padding: "2px 0" }}>
                    <span>Total Qty:</span>
                    <span>{fmtQty(totalQty)}</span>
                </div>
                {showMargin && [
                    ["Cost of usage", fmtMoney(totals.cost)],
                    ["Selling value", fmtMoney(totals.value)],
                    ["Gross profit", fmtMoney(totals.profit)],
                    ["Margin", fmtPct(totals.marginPct)],
                ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, padding: "2px 0", borderTop: "1px dotted #ddd" }}>
                        <span>{k}:</span><span>{v}</span>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div style={{ textAlign: "center", marginTop: 14, fontSize: 9, color: "#aaa" }}>
                <div>Powered by: <strong>{COOP_NAME}</strong></div>
                <div>{dayjs().format("MMM DD, YYYY [at] h:mm A")}</div>
            </div>
        </div>
    </>
));

// ══════════════════════════════════════════════════════════════════════════════
// A4 REPORT
// ══════════════════════════════════════════════════════════════════════════════
const A4Report = forwardRef<HTMLDivElement, ReportProps>(({
    data, startDate, endDate, brandName, totalQty, showMargin, totals,
}, ref) => (
    <>
        <style>{`
      @media print {
        @page { size: A4 portrait; margin: 16mm; }
        body * { visibility: hidden; }
        #invusage-a4, #invusage-a4 * { visibility: visible; }
        #invusage-a4 { position: absolute; inset: 0; }
      }
    `}</style>
        <div id="invusage-a4" ref={ref}
            style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: C.darkText, background: "#fff" }}>

            {/* Cover band */}
            <div style={{
                background: C.primary, color: "#fff", padding: "24px 32px 20px",
                printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
            } as React.CSSProperties}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        {brandName && brandName !== "undefined undefined" && (
                            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{brandName}</div>
                        )}
                        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, letterSpacing: "1px" }}>INVENTORY USAGE REPORT</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11, opacity: 0.9 }}>
                        <div><strong>From:</strong> {dayjs(startDate).format("MMM DD, YYYY h:mm A")}</div>
                        <div><strong>To:</strong>   {dayjs(endDate).format("MMM DD, YYYY h:mm A")}</div>
                        <div style={{ marginTop: 4, fontSize: 10, opacity: 0.7 }}>Generated {dayjs().format("MMM DD, YYYY")}</div>
                    </div>
                </div>
            </div>

            {/* KPI row */}
            <div style={{ display: "flex", background: C.bg, borderBottom: `2px solid ${C.border}`, padding: "8px 8px 8px 0" }}>
                {[
                    { label: "Unique Items", value: `${data.length}`, color: C.blue },
                    { label: "Total Qty", value: fmtQty(totalQty), color: C.primary },
                    ...(showMargin ? [
                        { label: "Cost of usage", value: fmtMoney(totals.cost), color: C.orange },
                        { label: "Selling value", value: fmtMoney(totals.value), color: C.blue },
                        { label: "Gross profit", value: fmtMoney(totals.profit), color: totals.profit < 0 ? "#dc2626" : "#16a34a" },
                        { label: "Margin", value: fmtPct(totals.marginPct), color: marginColor(totals.marginPct) },
                    ] : []),
                ].map(({ label, value, color }) => (
                    <div key={label} style={{
                        flex: 1, padding: "12px 16px", marginLeft: 8, borderRadius: 6,
                        background: "#fff", border: `1px solid ${C.border}`, borderLeft: `3px solid ${color}`,
                    }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={{ padding: "20px 24px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                        <tr style={{
                            background: C.primary, color: "#fff",
                            printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
                        } as React.CSSProperties}>
                            <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700 }}>Item Name</th>
                            <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, width: 100 }}>Quantity</th>
                            <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, width: 80 }}>Unit</th>
                            {showMargin && ["Buying", "Selling", "Margin", "Cost", "Sales value", "Profit"].map((h) => (
                                <th key={h} style={{ padding: "9px 8px", textAlign: "right", fontWeight: 700 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item: any, i: number) => (
                            <tr key={(item.inventory_id || i) + ":" + (item.variant_id || "")} style={{ background: i % 2 === 0 ? "#fff" : C.bg }}>
                                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{item.name}</td>
                                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right" }}>{fmtQty(item.quantity)}</td>
                                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", color: C.subText }}>{item.uom}</td>
                                {showMargin && (() => {
                                    const p = priceRow(item);
                                    const td = (v: React.ReactNode, color?: string, bold = false) => (
                                        <td style={{ padding: "8px 8px", borderBottom: `1px solid ${C.border}`, textAlign: "right", whiteSpace: "nowrap", color, fontWeight: bold ? 700 : 400 }}>{v}</td>
                                    );
                                    return (<>
                                        {td(fmtMoney(p.buying))}
                                        {td(fmtMoney(p.selling))}
                                        {td(fmtPct(p.marginPct), marginColor(p.marginPct), true)}
                                        {td(fmtMoney(p.cost))}
                                        {td(fmtMoney(p.value))}
                                        {td(fmtMoney(p.profit), p.profit != null && p.profit < 0 ? "#dc2626" : undefined, true)}
                                    </>);
                                })()}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Summary */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                    <table style={{ width: 280, borderCollapse: "collapse", fontSize: 11 }}>
                        <tbody>
                            {[
                                { label: "Total Items", value: `${data.length}`, accent: false },
                                { label: "Total Qty", value: fmtQty(totalQty), accent: !showMargin },
                                ...(showMargin ? [
                                    { label: "Cost of usage", value: fmtMoney(totals.cost), accent: false },
                                    { label: "Selling value", value: fmtMoney(totals.value), accent: false },
                                    { label: `Gross profit (${fmtPct(totals.marginPct)} margin)`, value: fmtMoney(totals.profit), accent: true },
                                ] : []),
                            ].map(({ label, value, accent }) => (
                                <tr key={label} style={{ background: accent ? C.primaryLight : "#fff" }}>
                                    <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: accent ? 700 : 500, color: accent ? C.primary : C.darkText }}>{label}</td>
                                    <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: accent ? 700 : 500, color: accent ? C.primary : C.darkText }}>{value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {showMargin && (
                    <div style={{ marginTop: 12, fontSize: 10, color: C.subText }}>
                        Buying = supplier price; cost uses the cost recorded on each usage where available.
                        Selling value = quantity used × current selling price (internal-only items have none).
                    </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: 32, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 10, color: C.subText }}>
                    <span>Powered by <strong>{COOP_NAME}</strong></span>
                    <span>Generated on {dayjs().format("MMM DD, YYYY [at] h:mm A")}</span>
                </div>
            </div>
        </div>
    </>
));

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ══════════════════════════════════════════════════════════════════════════════
interface InventoryUsageReportProps {
    openM: boolean;
    onCloseM: () => void;
    startDate: string;
    endDate: string;
    data?: any[];
}

const InventoryUsageReportModal: React.FC<InventoryUsageReportProps> = ({
    openM, onCloseM, startDate, endDate, data: propData,
}) => {
    const { BRAND_NAME1 } = useSystemDetails();
    const [printMode, setPrintMode] = useState<PrintMode>("thermal");
    // Prices & margin view — remembered in this browser
    const [showMargin, setShowMargin] = useState<boolean>(() => {
        try { return localStorage.getItem("inventoryUsage.showMargin") === "1"; } catch { return false; }
    });
    const toggleMargin = (on: boolean) => {
        setShowMargin(on);
        try { localStorage.setItem("inventoryUsage.showMargin", on ? "1" : "0"); } catch { /* ignore */ }
        if (on) setPrintMode("a4"); // the price columns need the A4 width
    };

    const thermalRef = useRef<HTMLDivElement>(null);
    const a4Ref = useRef<HTMLDivElement>(null);

    const { data: queryData, isLoading } = useInventoryUsageReportQuery(
        { startDate, endDate },
        { enabled: openM && !propData && !!startDate && !!endDate }
    );

    const rawData = propData || queryData;
    const loading = !propData && isLoading;
    const data = useMemo(() => (Array.isArray(rawData) ? rawData : []), [rawData]);
    const totalQty = useMemo(() => data.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0), [data]);
    const hasData = data.length > 0;

    const totals = useMemo(() => marginTotals(data), [data]);
    const pricesMissing = useMemo(() => data.some((d: any) => d.buying_price === undefined && d.selling_price === undefined), [data]);
    const sharedProps: ReportProps = { data, startDate, endDate, brandName: BRAND_NAME1, totalQty, showMargin, totals };

    const printA4 = useReactToPrint({ content: () => a4Ref.current });
    const thermal = useThermalAgentPrint(thermalRef);
    const handlePrint = () => printMode === "thermal" ? void thermal.print() : printA4();

    return (
        <Modal
            open={openM}
            onCancel={onCloseM}
            destroyOnClose
            width={printMode === "a4" || showMargin ? 1040 : 760}
            style={{ top: 20 }}
            styles={{ body: { padding: "16px 20px" } }}
            title={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 32 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
                            <FileTextOutlined />
                        </div>
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>Inventory Usage Report</Text>
                    </div>
                    <Segmented
                        value={printMode}
                        onChange={(v) => setPrintMode(v as PrintMode)}
                        options={[
                            { label: <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 4px" }}><MobileOutlined />Thermal</span>, value: "thermal" },
                            { label: <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 4px" }}><FilePdfOutlined />A4 PDF</span>, value: "a4" },
                        ]}
                        style={{ fontSize: 12 }}
                    />
                </div>
            }
            footer={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                        {printMode === "thermal" && (
                            <ThermalPrintControls
                                target={thermal.target}
                                onTargetChange={thermal.setTarget}
                                zones={thermal.zoneOptions}
                                zoneKey={thermal.zoneKey}
                                onZoneChange={thermal.setZoneKey}
                                loading={thermal.agentsLoading}
                            />
                        )}
                    </div>
                    <Space>
                        <Button onClick={onCloseM} style={{ borderRadius: 8 }}>Cancel</Button>
                        <Button
                            type="primary"
                            icon={<PrinterFilled />}
                            disabled={loading || !hasData}
                            loading={thermal.printing}
                            onClick={handlePrint}
                            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 600 }}
                        >
                            {printMode === "thermal"
                                ? thermal.target === "agent" ? "Send to Printer" : "Print Thermal Receipt"
                                : "Print A4 Report"}
                        </Button>
                    </Space>
                </div>
            }
        >
            <Spin spinning={loading} tip="Generating inventory usage report…" style={{ display: "block", width: "100%" }}>
                {!hasData && !loading ? (
                    <Empty description="No inventory usage data found for the selected period" style={{ padding: "40px 0" }} />
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                        {/* Summary cards */}
                        {hasData && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                <SummaryCard label="Unique Items" value={`${data.length}`} color={C.blue} bg="#eff6ff" icon={<UnorderedListOutlined />} />
                                <SummaryCard label="Total Qty" value={fmtQty(totalQty)} color={C.primary} bg={C.primaryLight} icon={<ShoppingOutlined />} />
                                {showMargin && <>
                                    <SummaryCard label="Cost of usage" value={`KES ${fmtMoney(totals.cost)}`} color={C.orange} bg="#fff7ed" icon={<DollarOutlined />} />
                                    <SummaryCard label="Selling value" value={`KES ${fmtMoney(totals.value)}`} color={C.blue} bg="#eff6ff" icon={<DollarOutlined />} />
                                    <SummaryCard label="Gross profit" value={`KES ${fmtMoney(totals.profit)}`} color={totals.profit < 0 ? "#dc2626" : "#16a34a"} bg="#f0fdf4" icon={<RiseOutlined />} />
                                    <SummaryCard label="Margin" value={fmtPct(totals.marginPct)} color={marginColor(totals.marginPct)} bg="#f8fafc" icon={<RiseOutlined />} />
                                </>}
                            </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, flexWrap: "wrap" }}>
                            <CalendarOutlined style={{ color: C.subText, fontSize: 11 }} />
                            <Text style={{ fontSize: 12, color: C.subText, flex: 1 }}>
                                {dayjs(startDate).format("MMM DD, YYYY HH:mm")} → {dayjs(endDate).format("MMM DD, YYYY HH:mm")}
                            </Text>
                            <Tooltip title="Show buying price, selling price, cost, profit and margin for each item">
                                <Space size={6}>
                                    <Switch size="small" checked={showMargin} onChange={toggleMargin} />
                                    <Text style={{ fontSize: 12, color: C.darkText }}>Prices & margin</Text>
                                </Space>
                            </Tooltip>
                        </div>

                        {showMargin && pricesMissing && (
                            <Text type="warning" style={{ fontSize: 12 }}>
                                Prices aren't available from the server yet — update the API to see buying/selling prices.
                            </Text>
                        )}

                        {/* Sortable on-screen breakdown */}
                        {showMargin && (
                            <Table
                                size="small"
                                rowKey={(r: any) => `${r.inventory_id}:${r.variant_id || ""}`}
                                dataSource={data}
                                pagination={data.length > 15 ? { pageSize: 15, size: "small" } : false}
                                scroll={{ x: 900 }}
                                columns={[
                                    { title: "Item", dataIndex: "name", fixed: "left" as const, width: 200, sorter: (a: any, b: any) => String(a.name).localeCompare(String(b.name)) },
                                    { title: "Used", key: "qty", align: "right" as const, width: 100, sorter: (a: any, b: any) => a.quantity - b.quantity,
                                        render: (_: any, r: any) => <span style={{ whiteSpace: "nowrap" }}>{fmtQty(r.quantity)} <Text type="secondary" style={{ fontSize: 11 }}>{r.uom}</Text></span> },
                                    { title: "Buying", key: "buy", align: "right" as const, render: (_: any, r: any) => fmtMoney(priceRow(r).buying) },
                                    { title: "Selling", key: "sell", align: "right" as const, render: (_: any, r: any) => fmtMoney(priceRow(r).selling) },
                                    { title: "Margin", key: "margin", align: "right" as const, defaultSortOrder: undefined,
                                        sorter: (a: any, b: any) => (priceRow(a).marginPct ?? -1e9) - (priceRow(b).marginPct ?? -1e9),
                                        render: (_: any, r: any) => { const m = priceRow(r).marginPct; return <Text strong style={{ color: marginColor(m) }}>{fmtPct(m)}</Text>; } },
                                    { title: "Cost", key: "cost", align: "right" as const, sorter: (a: any, b: any) => (priceRow(a).cost ?? 0) - (priceRow(b).cost ?? 0),
                                        render: (_: any, r: any) => fmtMoney(priceRow(r).cost) },
                                    { title: "Sales value", key: "value", align: "right" as const, sorter: (a: any, b: any) => (priceRow(a).value ?? 0) - (priceRow(b).value ?? 0),
                                        render: (_: any, r: any) => fmtMoney(priceRow(r).value) },
                                    { title: "Profit", key: "profit", align: "right" as const, sorter: (a: any, b: any) => (priceRow(a).profit ?? 0) - (priceRow(b).profit ?? 0),
                                        render: (_: any, r: any) => { const p = priceRow(r).profit; return <Text strong style={{ color: p != null && p < 0 ? "#dc2626" : undefined }}>{fmtMoney(p)}</Text>; } },
                                ]}
                            />
                        )}

                        {/* Preview */}
                        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: "#fff", overflow: "hidden" }}>
                            <div style={{ padding: "8px 16px", background: C.bg, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6 }}>
                                {printMode === "thermal"
                                    ? <><MobileOutlined style={{ color: C.subText, fontSize: 11 }} /><Text style={{ fontSize: 11, color: C.subText }}>Thermal Receipt Preview · 80mm</Text></>
                                    : <><FilePdfOutlined style={{ color: C.primary, fontSize: 11 }} /><Text style={{ fontSize: 11, color: C.subText }}>A4 PDF Preview</Text></>
                                }
                            </div>
                            <div style={{ padding: 16, maxHeight: "50vh", overflowY: "auto" }}>
                                <div style={{ display: printMode === "thermal" ? "block" : "none" }}>
                                    <ThermalReceipt ref={thermalRef} {...sharedProps} />
                                </div>
                                <div style={{ display: printMode === "a4" ? "block" : "none" }}>
                                    <A4Report ref={a4Ref} {...sharedProps} />
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </Spin>
        </Modal>
    );
};

export default InventoryUsageReportModal;