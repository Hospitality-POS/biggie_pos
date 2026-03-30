import React, { forwardRef, useMemo, useRef, useState } from "react";
import { Button, Empty, Modal, Segmented, Spin, Typography } from "antd";
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  MobileOutlined,
  PrinterFilled,
  PrinterOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import "@components/MODALS/bill.css";

const { Text } = Typography;

type PrintMode = "thermal" | "a4";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  blue: "#3b82f6",
  orange: "#f59e0b",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  v.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function getTotalAmount(orderItems: any[]): number {
  if (!Array.isArray(orderItems)) return 0;
  return orderItems.reduce((s, i) => s + (i.total_amount || 0), 0);
}
function getSupplierTotal(orderItems: any[]): number {
  if (!Array.isArray(orderItems)) return 0;
  return orderItems.reduce((s, i) => s + (Number(i.supplier_price) || 0) * (Number(i.quantity) || 0), 0);
}
function extractData(data: any): any[] {
  if (!data) return [];
  if (data.success && Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

// ── Shared props type ─────────────────────────────────────────────────────────
interface ReportProps {
  data: any[];
  startDate: string;
  endDate: string;
  brandName: string;
  overallTotal: number;
  overallSupplierTotal: number;
  totalCommissionAmount: number;
  totalSubscriptionItems: number;
  totalRegularItems: number;
}

// ── Summary card (screen only) ────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════════════
// THERMAL RECEIPT
// ══════════════════════════════════════════════════════════════════════════════
const ThermalReceipt = forwardRef<HTMLDivElement, ReportProps>(({
  data, startDate, endDate, brandName,
  overallTotal, overallSupplierTotal, totalCommissionAmount,
  totalSubscriptionItems, totalRegularItems,
}, ref) => {
  const grossProfit = overallTotal - overallSupplierTotal;
  const totalItems = totalSubscriptionItems + totalRegularItems;
  const subPct = totalItems > 0 ? ((totalSubscriptionItems / totalItems) * 100).toFixed(1) : "0.0";
  const regPct = totalItems > 0 ? (100 - parseFloat(subPct)).toFixed(1) : "0.0";

  return (
    <>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          body * { visibility: hidden; }
          #thermal-receipt, #thermal-receipt * { visibility: visible; }
          #thermal-receipt { position: absolute; inset: 0; }
        }
      `}</style>
      <div id="thermal-receipt" ref={ref}
        style={{ fontFamily: "monospace", color: "#000", padding: "8px 4px", maxWidth: 320, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          {brandName && brandName !== "undefined undefined" && (
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{brandName}</div>
          )}
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1.5px" }}>ITEM SALES REPORT</div>
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
        {data.map((item, i) => {
          const rowTotal = getTotalAmount(item.orderItems);
          const subPctRow = item.subscription_breakdown?.subscription_percentage;
          return (
            <div key={item.id || i} style={{ marginBottom: 8 }}>
              {/* Category */}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 11, borderBottom: "1px solid #ddd", paddingBottom: 2 }}>
                <span>
                  {item.name || "Uncategorized"}
                  {subPctRow > 0 && (
                    <span style={{ marginLeft: 4, fontSize: 8, background: "#f0fdf4", color: C.green, borderRadius: 3, padding: "0 4px" }}>
                      {subPctRow}% Sub
                    </span>
                  )}
                </span>
                <span>{fmt(rowTotal)}</span>
              </div>
              {/* Sub-items */}
              {item.orderItems?.map((oi: any, idx: number) => (
                <div key={oi.id || idx} style={{ paddingLeft: 8, paddingTop: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5 }}>
                    <span>
                      ×{(oi.quantity || 0).toFixed(1)} {oi.name || "Unknown"}
                      {oi.is_subscription_item && (
                        <span style={{ marginLeft: 3, fontSize: 8, background: "#f0fdf4", color: C.green, borderRadius: 2, padding: "0 3px" }}>Sub</span>
                      )}
                    </span>
                    <span>{fmt(oi.total_amount || 0)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#777" }}>
                    <span>Stock: {fmt((oi.supplier_price || 0) * (oi.quantity || 0))} · Price: {fmt(oi.amount || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* Footer */}
        <div style={{ borderTop: "1px dashed #999", marginTop: 10, paddingTop: 8 }}>
          {totalSubscriptionItems > 0 && (
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#888", marginBottom: 4 }}>Sales Breakdown</div>
              <div style={{ fontSize: 9 }}>
                Sub: {totalSubscriptionItems} ({subPct}%) · Regular: {totalRegularItems} ({regPct}%)
              </div>
              <div style={{ borderTop: "1px dashed #ccc", margin: "6px 0" }} />
            </div>
          )}
          {[
            { label: "Total Sales", value: fmt(overallTotal), bold: true },
            { label: "Stock Cost", value: fmt(overallSupplierTotal), bold: false },
            { label: "Gross Profit", value: fmt(grossProfit), bold: true },
            ...(totalCommissionAmount > 0 ? [{ label: "Commission", value: fmt(totalCommissionAmount), bold: false }] : []),
          ].map(({ label, value, bold }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: bold ? 700 : 400, padding: "2px 0", borderBottom: "1px dotted #ddd" }}>
              <span>{label}:</span>
              <span>KSh. {value}</span>
            </div>
          ))}
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 9, color: "#aaa" }}>
            <div>Powered by: <strong>{COOP_NAME}</strong></div>
            <div>{dayjs().format("MMM DD, YYYY [at] h:mm A")}</div>
          </div>
        </div>
      </div>
    </>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// A4 PDF REPORT
// ══════════════════════════════════════════════════════════════════════════════
const A4Report = forwardRef<HTMLDivElement, ReportProps>(({
  data, startDate, endDate, brandName,
  overallTotal, overallSupplierTotal, totalCommissionAmount,
  totalSubscriptionItems, totalRegularItems,
}, ref) => {
  const grossProfit = overallTotal - overallSupplierTotal;
  const totalItems = totalSubscriptionItems + totalRegularItems;
  const subPct = totalItems > 0 ? ((totalSubscriptionItems / totalItems) * 100).toFixed(1) : "0.0";
  const regPct = totalItems > 0 ? (100 - parseFloat(subPct)).toFixed(1) : "0.0";
  const margin = grossProfit > 0 ? ((grossProfit / overallTotal) * 100).toFixed(1) : "0.0";

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 16mm; }
          body * { visibility: hidden; }
          #a4-report, #a4-report * { visibility: visible; }
          #a4-report { position: absolute; inset: 0; }
          .a4-page-break { page-break-before: always; }
        }
      `}</style>
      <div id="a4-report" ref={ref}
        style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: C.darkText, padding: "0", background: "#fff" }}>

        {/* ── Cover band ──────────────────────────────────────────────── */}
        <div style={{
          background: C.primary, color: "#fff",
          padding: "24px 32px 20px", marginBottom: 0,
          printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
        } as React.CSSProperties}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              {brandName && brandName !== "undefined undefined" && (
                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{brandName}</div>
              )}
              <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, letterSpacing: "1px" }}>ITEM SALES REPORT</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, opacity: 0.9 }}>
              <div><strong>From:</strong> {dayjs(startDate).format("MMM DD, YYYY h:mm A")}</div>
              <div><strong>To:</strong>   {dayjs(endDate).format("MMM DD, YYYY h:mm A")}</div>
              <div style={{ marginTop: 4, fontSize: 10, opacity: 0.7 }}>
                Generated {dayjs().format("MMM DD, YYYY")}
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI row ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, background: C.bg }}>
          {[
            { label: "Total Sales", value: `KES ${fmt(overallTotal)}`, color: C.primary },
            { label: "Stock Cost", value: `KES ${fmt(overallSupplierTotal)}`, color: C.blue },
            { label: "Gross Profit", value: `KES ${fmt(grossProfit)}`, color: C.green },
            { label: "Margin", value: `${margin}%`, color: C.orange },
            ...(totalCommissionAmount > 0
              ? [{ label: "Commission", value: `KES ${fmt(totalCommissionAmount)}`, color: "#8b5cf6" }]
              : []),
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              flex: 1, padding: "14px 16px", borderRight: `1px solid ${C.border}`,
              borderLeft: `3px solid ${color}`, background: "#fff", margin: "8px 0 8px 8px", borderRadius: 6,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── Subscription banner ─────────────────────────────────────── */}
        {totalSubscriptionItems > 0 && (
          <div style={{ display: "flex", gap: 12, padding: "10px 24px", background: "#f0fdf4", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.subText, textTransform: "uppercase" }}>Breakdown:</span>
            <span style={{ background: "#dcfce7", color: C.green, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "2px 10px" }}>
              Subscription {totalSubscriptionItems} items ({subPct}%)
            </span>
            <span style={{ background: "#dbeafe", color: C.blue, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "2px 10px" }}>
              Regular {totalRegularItems} items ({regPct}%)
            </span>
          </div>
        )}

        {/* ── Main table ──────────────────────────────────────────────── */}
        <div style={{ padding: "20px 24px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: C.primary, color: "#fff", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties}>
                <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700 }}>Category / Product</th>
                <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>Qty</th>
                <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>Unit Price</th>
                <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>Stock Cost</th>
                <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>Total (KES)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => {
                const rowTotal = getTotalAmount(item.orderItems);
                const subPctRow = item.subscription_breakdown?.subscription_percentage;
                return (
                  <React.Fragment key={item.id || i}>
                    {/* Category row */}
                    <tr style={{ background: C.primaryLight, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties}>
                      <td colSpan={4} style={{ padding: "8px 12px", fontWeight: 700, fontSize: 12, color: C.primary }}>
                        {item.name || "Uncategorized"}
                        {subPctRow > 0 && (
                          <span style={{ marginLeft: 8, background: "#dcfce7", color: C.green, borderRadius: 3, fontSize: 9, fontWeight: 700, padding: "1px 6px" }}>
                            {subPctRow}% Subscription
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: C.primary }}>
                        {fmt(rowTotal)}
                      </td>
                    </tr>
                    {/* Sub-items */}
                    {item.orderItems?.map((oi: any, idx: number) => (
                      <tr key={oi.id || idx} style={{ background: idx % 2 === 0 ? "#fff" : C.bg }}>
                        <td style={{ padding: "6px 12px 6px 24px", borderBottom: `1px solid ${C.border}`, color: C.darkText }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {oi.name || "Unknown Item"}
                            {oi.is_subscription_item && (
                              <span style={{ background: "#dcfce7", color: C.green, borderRadius: 3, fontSize: 8, padding: "1px 5px", fontWeight: 700 }}>Sub</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "6px 12px", textAlign: "right", borderBottom: `1px solid ${C.border}`, color: C.subText }}>
                          {(oi.quantity || 0).toFixed(1)}
                        </td>
                        <td style={{ padding: "6px 12px", textAlign: "right", borderBottom: `1px solid ${C.border}`, color: C.subText }}>
                          {fmt(oi.amount || 0)}
                        </td>
                        <td style={{ padding: "6px 12px", textAlign: "right", borderBottom: `1px solid ${C.border}`, color: C.subText }}>
                          {fmt((oi.supplier_price || 0) * (oi.quantity || 0))}
                        </td>
                        <td style={{ padding: "6px 12px", textAlign: "right", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>
                          {fmt(oi.total_amount || 0)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* ── Summary table ──────────────────────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <table style={{ width: 340, borderCollapse: "collapse", fontSize: 11 }}>
              <tbody>
                {[
                  { label: "Overall Total Sales", value: fmt(overallTotal), accent: false, highlight: false },
                  { label: "Overall Stock Cost", value: fmt(overallSupplierTotal), accent: false, highlight: false },
                  { label: "Gross Profit", value: fmt(grossProfit), accent: true, highlight: true },
                  ...(totalCommissionAmount > 0
                    ? [{ label: "Commission", value: fmt(totalCommissionAmount), accent: false, highlight: false }]
                    : []),
                ].map(({ label, value, accent, highlight }) => (
                  <tr key={label} style={{ background: highlight ? C.primaryLight : "#fff" }}>
                    <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: accent ? 700 : 500, color: accent ? C.primary : C.darkText }}>
                      {label}
                    </td>
                    <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: `1px solid ${C.border}`, fontWeight: accent ? 700 : 500, color: accent ? C.primary : C.darkText }}>
                      KES {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 32, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 10, color: C.subText }}>
            <span>Powered by <strong>{COOP_NAME}</strong></span>
            <span>Generated on {dayjs().format("MMM DD, YYYY [at] h:mm A")}</span>
          </div>
        </div>
      </div>
    </>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ══════════════════════════════════════════════════════════════════════════════
function ItemSalesModal({ data, startDate, endDate, loading, open, onClose }: {
  data: any;
  startDate: string;
  endDate: string;
  loading: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const { BRAND_NAME1 } = useSystemDetails();
  const [printMode, setPrintMode] = useState<PrintMode>("thermal");

  const thermalRef = useRef<HTMLDivElement>(null);
  const a4Ref = useRef<HTMLDivElement>(null);

  const salesData = useMemo(() => extractData(data), [data]);

  const { overallTotal, totalCommissionAmount, overallSupplierTotal, totalSubscriptionItems, totalRegularItems } =
    useMemo(() => {
      let total = 0, commission = 0, supplierTotal = 0, subItems = 0, regItems = 0;
      salesData.forEach((item) => {
        total += getTotalAmount(item.orderItems);
        supplierTotal += getSupplierTotal(item.orderItems);
        commission += item.commissionAmt || 0;
        if (item.subscription_breakdown) {
          subItems += item.subscription_breakdown.total_subscription_items || 0;
          regItems += item.subscription_breakdown.total_regular_items || 0;
        }
      });
      return { overallTotal: total, totalCommissionAmount: commission, overallSupplierTotal: supplierTotal, totalSubscriptionItems: subItems, totalRegularItems: regItems };
    }, [salesData]);

  const grossProfit = overallTotal - overallSupplierTotal;
  const hasData = salesData.length > 0;

  const printThermal = useReactToPrint({ content: () => thermalRef.current });
  const printA4 = useReactToPrint({ content: () => a4Ref.current });
  const handlePrint = () => printMode === "thermal" ? printThermal() : printA4();

  const sharedProps: ReportProps = {
    data: salesData, startDate, endDate, brandName: BRAND_NAME1,
    overallTotal, overallSupplierTotal, totalCommissionAmount,
    totalSubscriptionItems, totalRegularItems,
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      destroyOnClose
      width={printMode === "a4" ? 960 : 760}
      style={{ top: 20 }}
      styles={{ body: { padding: "16px 20px" } }}
      title={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
              <FileTextOutlined />
            </div>
            <Text strong style={{ fontSize: 14, color: C.darkText }}>Item Sales Report</Text>
          </div>
          {/* Toggle */}
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
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose} style={{ borderRadius: 8 }}>Cancel</Button>
          <Button
            type="primary"
            icon={<PrinterFilled />}
            disabled={loading || !hasData}
            onClick={handlePrint}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 600 }}
          >
            {printMode === "thermal" ? "Print Thermal Receipt" : "Print A4 Report"}
          </Button>
        </div>
      }
    >
      <Spin spinning={loading} tip="Loading sales report…" style={{ display: "block", width: "100%" }}>
        {!hasData && !loading ? (
          <Empty description="No sales data found for the selected period" style={{ padding: "40px 0" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Summary cards */}
            {hasData && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <SummaryCard label="Total Sales" value={`KES ${fmt(overallTotal)}`} color={C.primary} bg={C.primaryLight} icon={<DollarOutlined />} />
                <SummaryCard label="Stock Cost" value={`KES ${fmt(overallSupplierTotal)}`} color={C.blue} bg="#eff6ff" icon={<ShoppingOutlined />} />
                <SummaryCard label="Gross Profit" value={`KES ${fmt(grossProfit)}`} color={C.green} bg="#f0fdf4" icon={<BarChartOutlined />} />
                {totalCommissionAmount > 0 && (
                  <SummaryCard label="Commission" value={`KES ${fmt(totalCommissionAmount)}`} color={C.orange} bg="#fffbeb" icon={<CheckCircleOutlined />} />
                )}
              </div>
            )}

            {/* Date strip */}
            {startDate && endDate && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                <CalendarOutlined style={{ color: C.subText, fontSize: 11 }} />
                <Text style={{ fontSize: 12, color: C.subText }}>
                  {dayjs(startDate).format("MMM DD, YYYY HH:mm")} → {dayjs(endDate).format("MMM DD, YYYY HH:mm")}
                </Text>
              </div>
            )}

            {/* Preview — only active mode visible on screen, both rendered for print */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: "#fff", overflow: "hidden" }}>
              {/* Mode label */}
              <div style={{ padding: "8px 16px", background: C.bg, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6 }}>
                {printMode === "thermal"
                  ? <><MobileOutlined style={{ color: C.subText, fontSize: 11 }} /><Text style={{ fontSize: 11, color: C.subText }}>Thermal Receipt Preview · 80mm</Text></>
                  : <><FilePdfOutlined style={{ color: C.primary, fontSize: 11 }} /><Text style={{ fontSize: 11, color: C.subText }}>A4 PDF Preview</Text></>
                }
              </div>
              <div style={{ padding: 16, maxHeight: "50vh", overflowY: "auto" }}>
                {/* Thermal — hidden from screen when A4 active, but always rendered for printing */}
                <div style={{ display: printMode === "thermal" ? "block" : "none" }}>
                  <ThermalReceipt key={`t-${JSON.stringify(salesData)}`} ref={thermalRef} {...sharedProps} />
                </div>
                {/* A4 — hidden from screen when thermal active, but always rendered for printing */}
                <div style={{ display: printMode === "a4" ? "block" : "none" }}>
                  <A4Report key={`a-${JSON.stringify(salesData)}`} ref={a4Ref} {...sharedProps} />
                </div>
              </div>
            </div>
          </div>
        )}
      </Spin>
    </Modal>
  );
}

export default ItemSalesModal;