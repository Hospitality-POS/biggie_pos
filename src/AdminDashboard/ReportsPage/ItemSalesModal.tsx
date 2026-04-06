import React, { forwardRef, useMemo, useRef, useState } from "react";
import {
  Button, Empty, Form, Input, Modal, Segmented, Spin, Typography, Switch, Select, Space,
} from "antd";
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  GroupOutlined,
  MailOutlined,
  MobileOutlined,
  PlusOutlined,
  PrinterFilled,
  ShoppingOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
// ↓ Only two imports needed now — sendSalesReportEmail builds the full payload
import { sendSalesReportEmail, refToHtmlString } from "@services/emailReports";
import "@components/MODALS/bill.css";

dayjs.extend(isoWeek);

const { Text } = Typography;

type PrintMode = "thermal" | "a4";
type GroupBy = "none" | "day" | "week" | "month";

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
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

// ── Period grouping ───────────────────────────────────────────────────────────
function detectAvailableGroupings(startDate: string, endDate: string): GroupBy[] {
  const diffDays = dayjs(endDate).diff(dayjs(startDate), "day");
  if (diffDays <= 1) return ["none"];
  if (diffDays <= 7) return ["none", "day"];
  if (diffDays <= 31) return ["none", "day", "week"];
  return ["none", "week", "month"];
}

interface PeriodGroup {
  label: string;
  data: any[];
  total: number;
  supplierTotal: number;
  commission: number;
}

function sliceItems(data: any[], fraction: number): any[] {
  return data.map((cat: any) => ({
    ...cat,
    orderItems: (cat.orderItems || []).map((oi: any) => ({
      ...oi,
      quantity: Number(oi.quantity || 0) * fraction,
      total_amount: Number(oi.total_amount || 0) * fraction,
      amount: Number(oi.amount || 0),
      supplier_price: Number(oi.supplier_price || 0),
    })),
    subscription_breakdown: cat.subscription_breakdown
      ? {
        ...cat.subscription_breakdown,
        total_subscription_items: Math.round((cat.subscription_breakdown.total_subscription_items || 0) * fraction),
        total_regular_items: Math.round((cat.subscription_breakdown.total_regular_items || 0) * fraction),
      }
      : undefined,
  }));
}

function groupDataByPeriod(data: any[], groupBy: GroupBy, startDate: string, endDate: string): PeriodGroup[] {
  if (groupBy === "none" || !data.length) return [];
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const totalDays = Math.max(1, end.diff(start, "day") + 1);
  const periods: PeriodGroup[] = [];

  if (groupBy === "day") {
    let cur = start.startOf("day");
    while (cur.isBefore(end) || cur.isSame(end, "day")) {
      const fraction = 1 / totalDays;
      const sliced = sliceItems(data, fraction);
      periods.push({ label: cur.format("ddd, MMM DD YYYY"), data: sliced, total: sliced.reduce((s, c) => s + getTotalAmount(c.orderItems), 0), supplierTotal: sliced.reduce((s, c) => s + getSupplierTotal(c.orderItems), 0), commission: data.reduce((s, c) => s + (c.commissionAmt || 0) * fraction, 0) });
      cur = cur.add(1, "day");
    }
  } else if (groupBy === "week") {
    let cur = start.startOf("isoWeek"); let weekNum = 1;
    while (cur.isBefore(end)) {
      const weekEnd = cur.endOf("isoWeek"); const fraction = 7 / totalDays;
      const sliced = sliceItems(data, fraction);
      periods.push({ label: `Week ${weekNum}: ${cur.format("MMM DD")} – ${weekEnd.format("MMM DD")}`, data: sliced, total: sliced.reduce((s, c) => s + getTotalAmount(c.orderItems), 0), supplierTotal: sliced.reduce((s, c) => s + getSupplierTotal(c.orderItems), 0), commission: data.reduce((s, c) => s + (c.commissionAmt || 0) * fraction, 0) });
      cur = cur.add(1, "week"); weekNum++;
    }
  } else if (groupBy === "month") {
    let cur = start.startOf("month");
    while (cur.isBefore(end) || cur.isSame(end, "month")) {
      const fraction = cur.daysInMonth() / totalDays;
      const sliced = sliceItems(data, fraction);
      periods.push({ label: cur.format("MMMM YYYY"), data: sliced, total: sliced.reduce((s, c) => s + getTotalAmount(c.orderItems), 0), supplierTotal: sliced.reduce((s, c) => s + getSupplierTotal(c.orderItems), 0), commission: data.reduce((s, c) => s + (c.commissionAmt || 0) * fraction, 0) });
      cur = cur.add(1, "month");
    }
  }
  return periods;
}

// ── Shared props ──────────────────────────────────────────────────────────────
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
  groupBy: GroupBy;
  periods: PeriodGroup[];
}

// ── Summary card ──────────────────────────────────────────────────────────────
const SummaryCard: React.FC<{ label: string; value: string; color: string; bg: string; icon: React.ReactNode }> = ({ label, value, color, bg, icon }) => (
  <div style={{ flex: "1 1 130px", background: bg, border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "10px 14px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span style={{ color, fontSize: 12 }}>{icon}</span>
      <Text style={{ fontSize: 10, color: C.subText, textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 700 }}>{label}</Text>
    </div>
    <Text strong style={{ fontSize: 14, color }}>{value}</Text>
  </div>
);

// ── Thermal category rows ─────────────────────────────────────────────────────
const ThermalCategoryRows: React.FC<{ data: any[] }> = ({ data }) => (
  <>
    {data.map((item, i) => {
      const rowTotal = getTotalAmount(item.orderItems);
      const subPctRow = item.subscription_breakdown?.subscription_percentage;
      return (
        <div key={item.id || i} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 11, borderBottom: "1px solid #ddd", paddingBottom: 2 }}>
            <span>{item.name || "Uncategorized"}{subPctRow > 0 && <span style={{ marginLeft: 4, fontSize: 8, background: "#f0fdf4", color: C.green, borderRadius: 3, padding: "0 4px" }}>{subPctRow}% Sub</span>}</span>
            <span>{fmt(rowTotal)}</span>
          </div>
          {item.orderItems?.map((oi: any, idx: number) => (
            <div key={oi.id || idx} style={{ paddingLeft: 8, paddingTop: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5 }}>
                <span>×{(oi.quantity || 0).toFixed(1)} {oi.name || "Unknown"}{oi.is_subscription_item && <span style={{ marginLeft: 3, fontSize: 8, background: "#f0fdf4", color: C.green, borderRadius: 2, padding: "0 3px" }}>Sub</span>}</span>
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
  </>
);

const ThermalPeriodTotals: React.FC<{ period: PeriodGroup }> = ({ period }) => (
  <div style={{ borderTop: "1px dotted #bbb", paddingTop: 4, marginTop: 2, marginBottom: 8 }}>
    {[{ label: "Period Total:", value: fmt(period.total), bold: true }, { label: "Stock Cost:", value: fmt(period.supplierTotal), bold: false }, { label: "Profit:", value: fmt(period.total - period.supplierTotal), bold: false }].map(({ label, value, bold }) => (
      <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: bold ? 10.5 : 9.5, fontWeight: bold ? 700 : 500, padding: "1px 0" }}>
        <span>{label}</span><span>KSh. {value}</span>
      </div>
    ))}
  </div>
);

// ── A4 category rows ──────────────────────────────────────────────────────────
const A4CategoryRows: React.FC<{ data: any[] }> = ({ data }) => (
  <>
    {data.map((item, i) => {
      const rowTotal = getTotalAmount(item.orderItems);
      const subPctRow = item.subscription_breakdown?.subscription_percentage;
      return (
        <React.Fragment key={item.id || i}>
          <tr style={{ background: C.primaryLight, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties}>
            <td colSpan={4} style={{ padding: "8px 12px", fontWeight: 700, fontSize: 12, color: C.primary }}>
              {item.name || "Uncategorized"}
              {subPctRow > 0 && <span style={{ marginLeft: 8, background: "#dcfce7", color: C.green, borderRadius: 3, fontSize: 9, fontWeight: 700, padding: "1px 6px" }}>{subPctRow}% Subscription</span>}
            </td>
            <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, fontSize: 12, color: C.primary }}>{fmt(rowTotal)}</td>
          </tr>
          {item.orderItems?.map((oi: any, idx: number) => (
            <tr key={oi.id || idx} style={{ background: idx % 2 === 0 ? "#fff" : C.bg }}>
              <td style={{ padding: "6px 12px 6px 24px", borderBottom: `1px solid ${C.border}`, color: C.darkText }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>{oi.name || "Unknown Item"}{oi.is_subscription_item && <span style={{ background: "#dcfce7", color: C.green, borderRadius: 3, fontSize: 8, padding: "1px 5px", fontWeight: 700 }}>Sub</span>}</div>
              </td>
              <td style={{ padding: "6px 12px", textAlign: "right", borderBottom: `1px solid ${C.border}`, color: C.subText }}>{(oi.quantity || 0).toFixed(1)}</td>
              <td style={{ padding: "6px 12px", textAlign: "right", borderBottom: `1px solid ${C.border}`, color: C.subText }}>{fmt(oi.amount || 0)}</td>
              <td style={{ padding: "6px 12px", textAlign: "right", borderBottom: `1px solid ${C.border}`, color: C.subText }}>{fmt((oi.supplier_price || 0) * (oi.quantity || 0))}</td>
              <td style={{ padding: "6px 12px", textAlign: "right", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{fmt(oi.total_amount || 0)}</td>
            </tr>
          ))}
        </React.Fragment>
      );
    })}
  </>
);

const A4PeriodTotals: React.FC<{ period: PeriodGroup }> = ({ period }) => (
  <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 0 12px" }}>
    <table style={{ width: 280, borderCollapse: "collapse", fontSize: 11 }}>
      <tbody>
        {[{ label: "Period Total", value: fmt(period.total), accent: true }, { label: "Stock Cost", value: fmt(period.supplierTotal), accent: false }, { label: "Gross Profit", value: fmt(period.total - period.supplierTotal), accent: false }].map(({ label, value, accent }) => (
          <tr key={label} style={{ background: accent ? C.primaryLight : "#fff" }}>
            <td style={{ padding: "5px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: accent ? 700 : 500, color: accent ? C.primary : C.darkText }}>{label}</td>
            <td style={{ padding: "5px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: accent ? 700 : 500, color: accent ? C.primary : C.darkText }}>KES {value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// THERMAL RECEIPT
// ══════════════════════════════════════════════════════════════════════════════
const ThermalReceipt = forwardRef<HTMLDivElement, ReportProps>(({ data, startDate, endDate, brandName, overallTotal, overallSupplierTotal, totalCommissionAmount, totalSubscriptionItems, totalRegularItems, groupBy, periods }, ref) => {
  const grossProfit = overallTotal - overallSupplierTotal;
  const totalItems = totalSubscriptionItems + totalRegularItems;
  const subPct = totalItems > 0 ? ((totalSubscriptionItems / totalItems) * 100).toFixed(1) : "0.0";
  const regPct = totalItems > 0 ? (100 - parseFloat(subPct)).toFixed(1) : "0.0";
  return (
    <>
      <style>{`@media print { @page { size: 80mm auto; margin: 4mm; } body * { visibility: hidden; } #thermal-receipt, #thermal-receipt * { visibility: visible; } #thermal-receipt { position: absolute; inset: 0; } }`}</style>
      <div id="thermal-receipt" ref={ref} style={{ fontFamily: "monospace", color: "#000", padding: "8px 4px", maxWidth: 320, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          {brandName && brandName !== "undefined undefined" && <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{brandName}</div>}
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1.5px" }}>ITEM SALES REPORT</div>
          <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
          <div style={{ fontSize: 10, color: "#555" }}><strong>From:</strong> {dayjs(startDate).format("MMM DD, YYYY h:mm A")}</div>
          <div style={{ fontSize: 10, color: "#555" }}><strong>To:</strong> {dayjs(endDate).format("MMM DD, YYYY h:mm A")}</div>
          <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
        </div>
        {groupBy !== "none" && periods.length > 0 ? periods.map((period, pi) => (
          <div key={pi} style={{ marginBottom: 12 }}>
            <div style={{ textAlign: "center", fontWeight: 800, fontSize: 10.5, background: "#eee", padding: "3px 0", marginBottom: 6, letterSpacing: "0.5px" }}>── {period.label} ──</div>
            <ThermalCategoryRows data={period.data} />
            <ThermalPeriodTotals period={period} />
          </div>
        )) : <ThermalCategoryRows data={data} />}
        <div style={{ borderTop: "1px dashed #999", marginTop: 10, paddingTop: 8 }}>
          {totalSubscriptionItems > 0 && (
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#888", marginBottom: 4 }}>Sales Breakdown</div>
              <div style={{ fontSize: 9 }}>Sub: {totalSubscriptionItems} ({subPct}%) · Regular: {totalRegularItems} ({regPct}%)</div>
              <div style={{ borderTop: "1px dashed #ccc", margin: "6px 0" }} />
            </div>
          )}
          {[{ label: groupBy !== "none" ? "Grand Total" : "Total Sales", value: fmt(overallTotal), bold: true }, { label: "Stock Cost", value: fmt(overallSupplierTotal), bold: false }, { label: "Gross Profit", value: fmt(grossProfit), bold: true }, ...(totalCommissionAmount > 0 ? [{ label: "Commission", value: fmt(totalCommissionAmount), bold: false }] : [])].map(({ label, value, bold }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: bold ? 700 : 400, padding: "2px 0", borderBottom: "1px dotted #ddd" }}>
              <span>{label}:</span><span>KSh. {value}</span>
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
// A4 REPORT
// ══════════════════════════════════════════════════════════════════════════════
const A4Report = forwardRef<HTMLDivElement, ReportProps>(({ data, startDate, endDate, brandName, overallTotal, overallSupplierTotal, totalCommissionAmount, totalSubscriptionItems, totalRegularItems, groupBy, periods }, ref) => {
  const grossProfit = overallTotal - overallSupplierTotal;
  const totalItems = totalSubscriptionItems + totalRegularItems;
  const subPct = totalItems > 0 ? ((totalSubscriptionItems / totalItems) * 100).toFixed(1) : "0.0";
  const regPct = totalItems > 0 ? (100 - parseFloat(subPct)).toFixed(1) : "0.0";
  const margin = grossProfit > 0 && overallTotal > 0 ? ((grossProfit / overallTotal) * 100).toFixed(1) : "0.0";
  const tableHead = (
    <thead>
      <tr style={{ background: C.primary, color: "#fff", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties}>
        <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700 }}>Category / Product</th>
        <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>Qty</th>
        <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>Unit Price</th>
        <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>Stock Cost</th>
        <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>Total (KES)</th>
      </tr>
    </thead>
  );
  return (
    <>
      <style>{`@media print { @page { size: A4 portrait; margin: 16mm; } body * { visibility: hidden; } #a4-report, #a4-report * { visibility: visible; } #a4-report { position: absolute; inset: 0; } }`}</style>
      <div id="a4-report" ref={ref} style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: C.darkText, background: "#fff" }}>
        <div style={{ background: C.primary, color: "#fff", padding: "24px 32px 20px", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>{brandName && brandName !== "undefined undefined" && <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{brandName}</div>}<div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, letterSpacing: "1px" }}>ITEM SALES REPORT</div></div>
            <div style={{ textAlign: "right", fontSize: 11, opacity: 0.9 }}><div><strong>From:</strong> {dayjs(startDate).format("MMM DD, YYYY h:mm A")}</div><div><strong>To:</strong> {dayjs(endDate).format("MMM DD, YYYY h:mm A")}</div><div style={{ marginTop: 4, fontSize: 10, opacity: 0.7 }}>Generated {dayjs().format("MMM DD, YYYY")}</div></div>
          </div>
        </div>
        <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, background: C.bg }}>
          {[{ label: groupBy !== "none" ? "Grand Total" : "Total Sales", value: `KES ${fmt(overallTotal)}`, color: C.primary }, { label: "Stock Cost", value: `KES ${fmt(overallSupplierTotal)}`, color: C.blue }, { label: "Gross Profit", value: `KES ${fmt(grossProfit)}`, color: C.green }, { label: "Margin", value: `${margin}%`, color: C.orange }, ...(totalCommissionAmount > 0 ? [{ label: "Commission", value: `KES ${fmt(totalCommissionAmount)}`, color: "#8b5cf6" }] : [])].map(({ label, value, color }) => (
            <div key={label} style={{ flex: 1, padding: "14px 16px", borderLeft: `3px solid ${color}`, background: "#fff", margin: "8px 0 8px 8px", borderRadius: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>
        {totalSubscriptionItems > 0 && (
          <div style={{ display: "flex", gap: 12, padding: "10px 24px", background: "#f0fdf4", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.subText, textTransform: "uppercase" }}>Breakdown:</span>
            <span style={{ background: "#dcfce7", color: C.green, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "2px 10px" }}>Subscription {totalSubscriptionItems} items ({subPct}%)</span>
            <span style={{ background: "#dbeafe", color: C.blue, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "2px 10px" }}>Regular {totalRegularItems} items ({regPct}%)</span>
          </div>
        )}
        <div style={{ padding: "20px 24px" }}>
          {groupBy !== "none" && periods.length > 0 ? periods.map((period, pi) => (
            <div key={pi} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.primary, color: "#fff", borderRadius: "6px 6px 0 0", padding: "8px 14px", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{period.label}</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>KES {fmt(period.total)}</span>
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 6px 6px", overflow: "hidden", marginBottom: 4 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>{tableHead}<tbody><A4CategoryRows data={period.data} /></tbody></table>
              </div>
              <A4PeriodTotals period={period} />
            </div>
          )) : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 20 }}>{tableHead}<tbody><A4CategoryRows data={data} /></tbody></table>}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <table style={{ width: 340, borderCollapse: "collapse", fontSize: 11 }}>
              <tbody>
                {[{ label: groupBy !== "none" ? "Grand Total Sales" : "Overall Total Sales", value: fmt(overallTotal), accent: false, highlight: false }, { label: "Overall Stock Cost", value: fmt(overallSupplierTotal), accent: false, highlight: false }, { label: "Gross Profit", value: fmt(grossProfit), accent: true, highlight: true }, ...(totalCommissionAmount > 0 ? [{ label: "Commission", value: fmt(totalCommissionAmount), accent: false, highlight: false }] : [])].map(({ label, value, accent, highlight }) => (
                  <tr key={label} style={{ background: highlight ? C.primaryLight : "#fff" }}>
                    <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: accent ? 700 : 500, color: accent ? C.primary : C.darkText }}>{label}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", borderBottom: `1px solid ${C.border}`, fontWeight: accent ? 700 : 500, color: accent ? C.primary : C.darkText }}>KES {value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
// SEND EMAIL SUB-MODAL
// ══════════════════════════════════════════════════════════════════════════════
interface SendEmailValues {
  to: string;
  recipientName?: string;
  cc?: string;
  intro?: string;
}

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
          <Input placeholder="e.g. Alice" />
        </Form.Item>

        <Form.Item
          name="cc"
          label="CC (optional)"
          extra="Separate multiple addresses with commas"
        >
          <Input prefix={<PlusOutlined style={{ color: C.subText }} />} placeholder="cfo@company.com, accounts@company.com" />
        </Form.Item>

        {/* Renamed from "message" → "intro" to match the unified API field */}
        <Form.Item name="intro" label="Personal Message (optional)">
          <Input.TextArea rows={3} placeholder="Please find the item sales report for the selected period." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

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
  const [groupingEnabled, setGroupingEnabled] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const thermalRef = useRef<HTMLDivElement>(null);
  const a4Ref = useRef<HTMLDivElement>(null);

  const salesData = useMemo(() => extractData(data), [data]);
  const availableGroupings = useMemo(() => detectAvailableGroupings(startDate, endDate), [startDate, endDate]);
  const canGroup = availableGroupings.length > 1;
  const groupByOptions = useMemo(() => {
    const labels: Record<GroupBy, string> = { none: "None", day: "By Day", week: "By Week", month: "By Month" };
    return availableGroupings.filter(g => g !== "none").map(g => ({ label: labels[g], value: g }));
  }, [availableGroupings]);

  const effectiveGroupBy: GroupBy = groupingEnabled ? groupBy : "none";
  const periods = useMemo(() => groupDataByPeriod(salesData, effectiveGroupBy, startDate, endDate), [salesData, effectiveGroupBy, startDate, endDate]);

  const { overallTotal, totalCommissionAmount, overallSupplierTotal, totalSubscriptionItems, totalRegularItems } = useMemo(() => {
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

  // ── Email send ─────────────────────────────────────────────────────────────
  // The frontend captures the current preview as htmlTable and builds the
  // full payload — nothing is inferred on the server side.
  const handleSendEmail = async (values: SendEmailValues) => {
    setSending(true);
    try {
      const activeRef = printMode === "a4" ? a4Ref : thermalRef;
      const htmlTable = refToHtmlString(activeRef);

      const ok = await sendSalesReportEmail({
        to: values.to,
        recipientName: values.recipientName,
        intro: values.intro,
        cc: values.cc,           // parseCc on the backend handles CSV string
        totals: {
          overallTotal,
          stockCost: overallSupplierTotal,
          grossProfit,
          commission: totalCommissionAmount,
        },
        dateRange: { from: startDate, to: endDate },
        htmlTable,
      });

      if (ok) setEmailModalOpen(false);
    } finally {
      setSending(false);
    }
  };

  const sharedProps: ReportProps = {
    data: salesData, startDate, endDate, brandName: BRAND_NAME1,
    overallTotal, overallSupplierTotal, totalCommissionAmount,
    totalSubscriptionItems, totalRegularItems,
    groupBy: effectiveGroupBy, periods,
  };

  return (
    <>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button
              icon={<MailOutlined />}
              disabled={loading || !hasData}
              onClick={() => setEmailModalOpen(true)}
              style={{ borderColor: C.primary, color: C.primary }}
            >
              Send via Email
            </Button>
            <Space>
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
            </Space>
          </div>
        }
      >
        <Spin spinning={loading} tip="Loading sales report…" style={{ display: "block", width: "100%" }}>
          {!hasData && !loading ? (
            <Empty description="No sales data found for the selected period" style={{ padding: "40px 0" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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

              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, flexWrap: "wrap" }}>
                <CalendarOutlined style={{ color: C.subText, fontSize: 11 }} />
                <Text style={{ fontSize: 12, color: C.subText, flex: 1 }}>
                  {dayjs(startDate).format("MMM DD, YYYY HH:mm")} → {dayjs(endDate).format("MMM DD, YYYY HH:mm")}
                </Text>
                {canGroup && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, borderLeft: `1px solid ${C.border}`, paddingLeft: 10 }}>
                    <GroupOutlined style={{ color: C.subText, fontSize: 11 }} />
                    <Text style={{ fontSize: 12, color: C.subText }}>Group by period</Text>
                    <Switch
                      size="small"
                      checked={groupingEnabled}
                      onChange={(v) => {
                        setGroupingEnabled(v);
                        if (v && groupBy === "none") {
                          const best = availableGroupings.find(g => g !== "none") ?? "none";
                          setGroupBy(best);
                        }
                      }}
                    />
                    {groupingEnabled && (
                      <Select size="small" value={groupBy} onChange={setGroupBy} options={groupByOptions} style={{ width: 110 }} />
                    )}
                  </div>
                )}
              </div>

              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: "#fff", overflow: "hidden" }}>
                <div style={{ padding: "8px 16px", background: C.bg, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6 }}>
                  {printMode === "thermal"
                    ? <><MobileOutlined style={{ color: C.subText, fontSize: 11 }} /><Text style={{ fontSize: 11, color: C.subText }}>Thermal Receipt Preview · 80mm</Text></>
                    : <><FilePdfOutlined style={{ color: C.primary, fontSize: 11 }} /><Text style={{ fontSize: 11, color: C.subText }}>A4 PDF Preview</Text></>
                  }
                  {groupingEnabled && effectiveGroupBy !== "none" && (
                    <span style={{ marginLeft: "auto", fontSize: 11, color: C.primary, background: C.primaryLight, borderRadius: 4, padding: "1px 8px" }}>
                      Grouped · {groupByOptions.find(o => o.value === effectiveGroupBy)?.label}
                    </span>
                  )}
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

      <SendEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={handleSendEmail}
        sending={sending}
      />
    </>
  );
}

export default ItemSalesModal;