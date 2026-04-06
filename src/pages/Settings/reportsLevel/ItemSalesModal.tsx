import React, { forwardRef, useMemo, useRef, useState } from "react";
import { Button, Empty, Form, Input, Modal, Segmented, Spin, Typography, Switch, Select, Space } from "antd";
import {
  CalendarOutlined,
  DollarOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  GroupOutlined,
  MailOutlined,
  MobileOutlined,
  PlusOutlined,
  PrinterFilled,
  SendOutlined,
  ShoppingOutlined,
  TagOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import weekOfYear from "dayjs/plugin/weekOfYear";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import { sendSalesReportEmail, refToHtmlString } from "@services/emailReports";
import "@components/MODALS/bill.css";

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);

const { Text } = Typography;
type PrintMode = "thermal" | "a4";
type GroupBy = "none" | "day" | "week" | "month";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  primaryMid: "#8b2339",
  green: "#10b981",
  greenLight: "#f0fdf4",
  blue: "#3b82f6",
  blueLight: "#eff6ff",
  orange: "#f59e0b",
  orangeLight: "#fffbeb",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  bg: "#f8fafc",
  white: "#ffffff",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function getCategoryTotal(orderItems: any[]): number {
  if (!Array.isArray(orderItems)) return 0;
  return orderItems.reduce((s, i) => s + Number(i.total_amount || 0), 0);
}

function getSupplierTotal(orderItems: any[]): number {
  if (!Array.isArray(orderItems)) return 0;
  return orderItems.reduce((s, i) => s + Number(i.supplier_price || 0) * Number(i.quantity || 0), 0);
}

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

function groupDataByPeriod(data: any[], groupBy: GroupBy, startDate: string, endDate: string): PeriodGroup[] {
  if (groupBy === "none" || !data.length) return [];
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const periods: PeriodGroup[] = [];

  if (groupBy === "day") {
    let cur = start.startOf("day");
    while (cur.isBefore(end) || cur.isSame(end, "day")) {
      const label = cur.format("ddd, MMM DD");
      const fraction = 1 / Math.max(1, end.diff(start, "day") + 1);
      const slicedData = data.map((cat: any) => ({
        ...cat,
        orderItems: (cat.orderItems || []).map((oi: any) => ({
          ...oi,
          quantity: Number(oi.quantity || 0) * fraction,
          total_amount: Number(oi.total_amount || 0) * fraction,
          supplier_price: Number(oi.supplier_price || 0),
        })),
      }));
      const total = slicedData.reduce((s: number, c: any) => s + getCategoryTotal(c.orderItems), 0);
      const supplierTotal = slicedData.reduce((s: number, c: any) => s + getSupplierTotal(c.orderItems), 0);
      const commission = slicedData.reduce((s: number, c: any) => s + Number(c.commissionAmt || 0) * fraction, 0);
      periods.push({ label, data: slicedData, total, supplierTotal, commission });
      cur = cur.add(1, "day");
    }
  } else if (groupBy === "week") {
    let cur = start.startOf("isoWeek");
    let weekNum = 1;
    while (cur.isBefore(end)) {
      const weekEnd = cur.endOf("isoWeek");
      const label = `Week ${weekNum}: ${cur.format("MMM DD")} – ${weekEnd.format("MMM DD")}`;
      const totalDays = end.diff(start, "day") + 1;
      const fraction = 7 / totalDays;
      const slicedData = data.map((cat: any) => ({
        ...cat,
        orderItems: (cat.orderItems || []).map((oi: any) => ({
          ...oi,
          quantity: Number(oi.quantity || 0) * fraction,
          total_amount: Number(oi.total_amount || 0) * fraction,
          supplier_price: Number(oi.supplier_price || 0),
        })),
      }));
      const total = slicedData.reduce((s: number, c: any) => s + getCategoryTotal(c.orderItems), 0);
      const supplierTotal = slicedData.reduce((s: number, c: any) => s + getSupplierTotal(c.orderItems), 0);
      const commission = slicedData.reduce((s: number, c: any) => s + Number(c.commissionAmt || 0) * fraction, 0);
      periods.push({ label, data: slicedData, total, supplierTotal, commission });
      cur = cur.add(1, "week");
      weekNum++;
    }
  } else if (groupBy === "month") {
    let cur = start.startOf("month");
    while (cur.isBefore(end) || cur.isSame(end, "month")) {
      const label = cur.format("MMMM YYYY");
      const daysInMonth = cur.daysInMonth();
      const totalDays = end.diff(start, "day") + 1;
      const fraction = daysInMonth / totalDays;
      const slicedData = data.map((cat: any) => ({
        ...cat,
        orderItems: (cat.orderItems || []).map((oi: any) => ({
          ...oi,
          quantity: Number(oi.quantity || 0) * fraction,
          total_amount: Number(oi.total_amount || 0) * fraction,
          supplier_price: Number(oi.supplier_price || 0),
        })),
      }));
      const total = slicedData.reduce((s: number, c: any) => s + getCategoryTotal(c.orderItems), 0);
      const supplierTotal = slicedData.reduce((s: number, c: any) => s + getSupplierTotal(c.orderItems), 0);
      const commission = slicedData.reduce((s: number, c: any) => s + Number(c.commissionAmt || 0) * fraction, 0);
      periods.push({ label, data: slicedData, total, supplierTotal, commission });
      cur = cur.add(1, "month");
    }
  }

  return periods;
}

// ── Summary card (UI only) ────────────────────────────────────────────────────
const SummaryCard: React.FC<{
  label: string; value: string; color: string; bg: string; icon: React.ReactNode;
}> = ({ label, value, color, bg, icon }) => (
  <div style={{
    flex: "1 1 130px",
    background: bg,
    border: `1px solid ${color}25`,
    borderLeft: `3px solid ${color}`,
    borderRadius: 8,
    padding: "10px 14px",
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
  overallTotal: number;
  overallSupplierTotal: number;
  totalCommission: number;
  customerName?: string | null;
  groupBy: GroupBy;
  periods: PeriodGroup[];
}

// ══════════════════════════════════════════════════════════════════════════════
// THERMAL RECEIPT
// ══════════════════════════════════════════════════════════════════════════════
const ThermalReceipt = forwardRef<HTMLDivElement, ReportProps>(({
  data, startDate, endDate, brandName,
  overallTotal, overallSupplierTotal, totalCommission, customerName, groupBy, periods,
}, ref) => {
  const divider = (style?: React.CSSProperties) => (
    <div style={{ borderTop: "1px dashed #bbb", margin: "6px 0", ...style }} />
  );

  const renderItems = (items: any[]) =>
    items.map((oi: any, idx: number) => (
      <div key={oi.id || idx} style={{ paddingLeft: 8, paddingTop: 3 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, lineHeight: 1.4 }}>
          <span style={{ flex: 1, marginRight: 8 }}>×{Number(oi.quantity || 0).toFixed(1)} {oi.name || "Item"}</span>
          <span style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{fmt(oi.total_amount || oi.amount || 0)}</span>
        </div>
        {oi.supplier_price > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#888", paddingLeft: 8 }}>
            <span>Cost</span>
            <span>{fmt((oi.supplier_price || 0) * (oi.quantity || 0))}</span>
          </div>
        )}
      </div>
    ));

  const renderCategory = (item: any, i: number) => {
    const catTotal = getCategoryTotal(item.orderItems);
    return (
      <div key={item.id || i} style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 10.5, background: "#f0f0f0", padding: "3px 4px", marginBottom: 3 }}>
          <span>{item.name || "Uncategorized"}</span>
          <span>KES {fmt(catTotal)}</span>
        </div>
        {renderItems(item.orderItems || [])}
      </div>
    );
  };

  const renderTotalsBlock = (total: number, supplierTotal: number, commission: number, isGrand = false) => (
    <div style={{ paddingTop: 5, marginTop: 2 }}>
      {[
        { label: isGrand ? "Grand Total" : "Period Total", value: fmt(total), bold: true },
        { label: "Stock Cost", value: fmt(supplierTotal), bold: false },
        { label: "Commission", value: fmt(commission), bold: false },
      ].map(({ label, value, bold }) => (
        <div key={label} style={{
          display: "flex", justifyContent: "space-between",
          fontSize: bold ? 10.5 : 9.5, fontWeight: bold ? 700 : 400,
          padding: "1.5px 0",
          borderBottom: bold ? "1px solid #999" : "none",
        }}>
          <span>{label}:</span>
          <span>KES {value}</span>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          body * { visibility: hidden; }
          #itemsales-thermal, #itemsales-thermal * { visibility: visible; }
          #itemsales-thermal { position: absolute; inset: 0; }
        }
      `}</style>
      <div id="itemsales-thermal" ref={ref}
        style={{ fontFamily: "'Courier New', Courier, monospace", color: "#111", padding: "6px 2px", maxWidth: 300, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          {brandName && brandName !== "undefined undefined" && (
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.5px", marginBottom: 1 }}>{brandName}</div>
          )}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", marginBottom: 4 }}>ITEM SALES REPORT</div>
          {customerName && (
            <div style={{ fontSize: 9.5, fontWeight: 600, padding: "2px 0" }}>Customer: {customerName}</div>
          )}
          {divider()}
          <div style={{ fontSize: 9.5, color: "#444", lineHeight: 1.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>From:</span><span>{dayjs(startDate).format("MMM DD, YYYY HH:mm")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>To:</span><span>{dayjs(endDate).format("MMM DD, YYYY HH:mm")}</span>
            </div>
          </div>
          {divider()}
        </div>

        {/* Items */}
        {groupBy !== "none" && periods.length > 0 ? (
          periods.map((period, pi) => (
            <div key={pi} style={{ marginBottom: 10 }}>
              <div style={{ textAlign: "center", fontWeight: 800, fontSize: 9.5, background: "#222", color: "#fff", padding: "2px 4px", marginBottom: 5, letterSpacing: "0.8px" }}>
                {period.label.toUpperCase()}
              </div>
              {period.data.map((item: any, i: number) => renderCategory(item, i))}
              {divider({ margin: "5px 0 3px" })}
              {renderTotalsBlock(period.total, period.supplierTotal, period.commission)}
              {divider({ margin: "6px 0 0" })}
            </div>
          ))
        ) : (
          data.map((item: any, i: number) => renderCategory(item, i))
        )}

        {/* Grand totals */}
        {divider({ borderStyle: "solid", borderColor: "#555", margin: "8px 0 5px" })}
        {renderTotalsBlock(overallTotal, overallSupplierTotal, totalCommission, groupBy !== "none")}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 8.5, color: "#999" }}>
          {divider({ margin: "6px 0" })}
          <div>Powered by <strong>{COOP_NAME}</strong></div>
          <div>{dayjs().format("MMM DD, YYYY [at] HH:mm")}</div>
        </div>
      </div>
    </>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// A4 REPORT
// ══════════════════════════════════════════════════════════════════════════════
const A4Report = forwardRef<HTMLDivElement, ReportProps>(({
  data, startDate, endDate, brandName,
  overallTotal, overallSupplierTotal, totalCommission, customerName, groupBy, periods,
}, ref) => {

  const thStyle: React.CSSProperties = {
    padding: "8px 12px",
    textAlign: "left",
    fontWeight: 700,
    fontSize: 10,
    color: C.white,
    background: C.primary,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };

  const tdBase: React.CSSProperties = {
    padding: "7px 12px",
    fontSize: 11.5,
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: "middle",
  };

  const renderItemTable = (items: any[]) => (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <colgroup>
        <col style={{ width: "8%" }} />
        <col style={{ width: "46%" }} />
        <col style={{ width: "23%" }} />
        <col style={{ width: "23%" }} />
      </colgroup>
      <thead>
        <tr>
          <th style={{ ...thStyle, textAlign: "center" }}>QTY</th>
          <th style={{ ...thStyle }}>Item</th>
          <th style={{ ...thStyle, textAlign: "right" }}>Stock Cost</th>
          <th style={{ ...thStyle, textAlign: "right" }}>Amount (KES)</th>
        </tr>
      </thead>
      <tbody>
        {items.map((oi: any, idx: number) => (
          <tr key={oi.id || idx} style={{ background: idx % 2 === 0 ? C.white : C.bg }}>
            <td style={{ ...tdBase, textAlign: "center", color: C.subText, fontWeight: 500 }}>
              {Number(oi.quantity || 0).toFixed(1)}
            </td>
            <td style={{ ...tdBase, fontWeight: 600, color: C.darkText }}>
              {oi.name || "Item"}
            </td>
            <td style={{ ...tdBase, textAlign: "right", color: C.subText }}>
              {fmt((oi.supplier_price || 0) * (oi.quantity || 0))}
            </td>
            <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: C.darkText }}>
              {fmt(oi.total_amount || oi.amount || 0)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderCategoryBlock = (item: any, i: number) => {
    const catTotal = getCategoryTotal(item.orderItems);
    return (
      <div key={item.id || i} style={{ marginBottom: 16, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
        {/* Category header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: C.primaryLight,
          padding: "9px 12px",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontWeight: 700, fontSize: 12, color: C.primary }}>{item.name || "Uncategorized"}</span>
          <span style={{ fontWeight: 800, fontSize: 12, color: C.primary }}>KES {fmt(catTotal)}</span>
        </div>
        {/* Items table */}
        {item.orderItems?.length > 0 && renderItemTable(item.orderItems)}
      </div>
    );
  };

  const renderTotalsTable = (total: number, supplierTotal: number, commission: number, isGrand = false) => (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4, marginTop: 8 }}>
      <table style={{ width: 300, borderCollapse: "collapse" }}>
        <tbody>
          {[
            { label: isGrand ? "Grand Total" : "Period Total", value: `KES ${fmt(total)}`, accent: true },
            { label: "Stock Cost", value: `KES ${fmt(supplierTotal)}`, accent: false },
            { label: "Commission", value: `KES ${fmt(commission)}`, accent: false },
          ].map(({ label, value, accent }) => (
            <tr key={label} style={{ background: accent ? C.primaryLight : C.white }}>
              <td style={{
                padding: "6px 12px", fontSize: 11,
                borderBottom: `1px solid ${C.border}`,
                borderLeft: accent ? `3px solid ${C.primary}` : `3px solid transparent`,
                fontWeight: accent ? 700 : 500,
                color: accent ? C.primary : C.darkText,
              }}>{label}</td>
              <td style={{
                padding: "6px 12px", fontSize: 11,
                borderBottom: `1px solid ${C.border}`,
                textAlign: "right",
                fontWeight: accent ? 800 : 500,
                color: accent ? C.primary : C.darkText,
              }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 16mm; }
          body * { visibility: hidden; }
          #itemsales-a4, #itemsales-a4 * { visibility: visible; }
          #itemsales-a4 { position: absolute; inset: 0; }
        }
      `}</style>
      <div id="itemsales-a4" ref={ref}
        style={{ fontFamily: "'Segoe UI', system-ui, Arial, sans-serif", color: C.darkText, background: C.white }}>

        {/* Cover band */}
        <div style={{
          background: C.primary, color: C.white,
          padding: "22px 28px 20px",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        } as React.CSSProperties}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div>
              {brandName && brandName !== "undefined undefined" && (
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 2, letterSpacing: "-0.3px" }}>{brandName}</div>
              )}
              <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                Item Sales Report
              </div>
              {customerName && (
                <div style={{ marginTop: 6, fontSize: 11, background: "rgba(255,255,255,0.15)", borderRadius: 4, padding: "3px 10px", display: "inline-block" }}>
                  Customer: {customerName}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right", fontSize: 11, opacity: 0.88, lineHeight: 1.7, flexShrink: 0 }}>
              <div><strong>From:</strong> {dayjs(startDate).format("MMM DD, YYYY HH:mm")}</div>
              <div><strong>To:</strong>&nbsp;&nbsp;&nbsp;{dayjs(endDate).format("MMM DD, YYYY HH:mm")}</div>
              <div style={{ marginTop: 4, fontSize: 9.5, opacity: 0.65 }}>Generated {dayjs().format("MMM DD, YYYY [at] HH:mm")}</div>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{
          display: "flex",
          background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          padding: "12px 16px",
          gap: 12,
        }}>
          {[
            { label: "Total Sales", value: `KES ${fmt(overallTotal)}`, color: C.primary, bg: C.primaryLight },
            { label: "Stock Cost", value: `KES ${fmt(overallSupplierTotal)}`, color: C.blue, bg: C.blueLight },
            { label: "Commission", value: `KES ${fmt(totalCommission)}`, color: C.orange, bg: C.orangeLight },
            { label: "Gross Profit", value: `KES ${fmt(overallTotal - overallSupplierTotal)}`, color: C.green, bg: C.greenLight },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{
              flex: 1, background: bg,
              border: `1px solid ${color}20`,
              borderLeft: `3px solid ${color}`,
              borderRadius: 6, padding: "10px 12px",
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>

          {groupBy !== "none" && periods.length > 0 ? (
            periods.map((period, pi) => (
              <div key={pi} style={{ marginBottom: 24 }}>
                {/* Period header */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: C.primary, color: C.white,
                  padding: "9px 14px", borderRadius: "6px 6px 0 0",
                  printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
                } as React.CSSProperties}>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{period.label}</span>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>KES {fmt(period.total)}</span>
                </div>
                <div style={{ border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 6px 6px", padding: "14px 14px 8px" }}>
                  {period.data.map((item: any, i: number) => renderCategoryBlock(item, i))}
                  {renderTotalsTable(period.total, period.supplierTotal, period.commission)}
                </div>
              </div>
            ))
          ) : (
            <>
              {data.map((item: any, i: number) => renderCategoryBlock(item, i))}
              {renderTotalsTable(overallTotal, overallSupplierTotal, totalCommission)}
            </>
          )}

          {/* Footer */}
          <div style={{
            marginTop: 20,
            paddingTop: 12,
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: C.subText,
          }}>
            <span>Powered by <strong>{COOP_NAME}</strong></span>
            <span>Generated on {dayjs().format("MMM DD, YYYY [at] HH:mm")}</span>
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
          <Input prefix={<UserOutlined style={{ color: C.subText }} />} placeholder="e.g. Alice" />
        </Form.Item>
        <Form.Item name="cc" label="CC (optional)" extra="Separate multiple addresses with commas">
          <Input prefix={<PlusOutlined style={{ color: C.subText }} />} placeholder="cfo@company.com, accounts@company.com" />
        </Form.Item>
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
interface ItemSalesModalProps {
  open: boolean;
  onClose: () => void;
  data: any;
  loading: boolean;
  startDate: string;
  endDate: string;
  customerName?: string | null;
}

const ItemSalesModal: React.FC<ItemSalesModalProps> = ({
  open, onClose, data: rawData, loading, startDate, endDate, customerName = null,
}) => {
  const { BRAND_NAME1 } = useSystemDetails();
  const [printMode, setPrintMode] = useState<PrintMode>("thermal");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [groupingEnabled, setGroupingEnabled] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const thermalRef = useRef<HTMLDivElement>(null);
  const a4Ref = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    if (!rawData) return [];
    if (rawData.success && Array.isArray(rawData.data)) return rawData.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData.data && Array.isArray(rawData.data)) return rawData.data;
    return [];
  }, [rawData]);

  const availableGroupings = useMemo(() => detectAvailableGroupings(startDate, endDate), [startDate, endDate]);

  const groupByOptions = useMemo(() => {
    const labels: Record<GroupBy, string> = { none: "None", day: "By Day", week: "By Week", month: "By Month" };
    return availableGroupings.map(g => ({ label: labels[g], value: g }));
  }, [availableGroupings]);

  const effectiveGroupBy: GroupBy = groupingEnabled ? groupBy : "none";

  const periods = useMemo(
    () => groupDataByPeriod(data, effectiveGroupBy, startDate, endDate),
    [data, effectiveGroupBy, startDate, endDate]
  );

  const { overallTotal, totalCommission } = useMemo(() => {
    let total = 0, commission = 0;
    data.forEach((item: any) => {
      total += getCategoryTotal(item.orderItems);
      commission += Number(item.commissionAmt || 0);
    });
    return { overallTotal: total, totalCommission: commission };
  }, [data]);

  const overallSupplierTotal = useMemo(
    () => data.reduce((s: number, item: any) => s + getSupplierTotal(item.orderItems), 0),
    [data]
  );

  const grossProfit = overallTotal - overallSupplierTotal;
  const hasData = data.length > 0;

  const sharedProps: ReportProps = {
    data, startDate, endDate, brandName: BRAND_NAME1,
    overallTotal, overallSupplierTotal, totalCommission,
    customerName, groupBy: effectiveGroupBy, periods,
  };

  const printThermal = useReactToPrint({ content: () => thermalRef.current });
  const printA4 = useReactToPrint({ content: () => a4Ref.current });
  const handlePrint = () => printMode === "thermal" ? printThermal() : printA4();

  const canGroup = availableGroupings.length > 1;

  const handleSendEmail = async (values: SendEmailValues) => {
    setSending(true);
    try {
      const activeRef = printMode === "a4" ? a4Ref : thermalRef;
      const htmlTable = refToHtmlString(activeRef);

      const ok = await sendSalesReportEmail({
        to: values.to,
        recipientName: values.recipientName,
        intro: values.intro,
        cc: values.cc,
        totals: { overallTotal, stockCost: overallSupplierTotal, grossProfit, commission: totalCommission },
        dateRange: { from: startDate, to: endDate },
        htmlTable,
      });

      if (ok) setEmailModalOpen(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        destroyOnClose
        width={printMode === "a4" ? 960 : 740}
        style={{ top: 20 }}
        styles={{ body: { padding: "16px 20px" } }}
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
                <FileTextOutlined />
              </div>
              <div>
                <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>Item Sales Report</Text>
                {customerName && (
                  <Text style={{ fontSize: 11, color: C.subText }}>
                    <UserOutlined style={{ marginRight: 4 }} />{customerName}
                  </Text>
                )}
              </div>
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
                {printMode === "thermal" ? "Print Thermal" : "Print A4"}
              </Button>
            </Space>
          </div>
        }
      >
        <Spin spinning={loading} tip="Generating item sales report…" style={{ display: "block", width: "100%" }}>
          {!hasData && !loading ? (
            <Empty description="No sales data found for the selected period" style={{ padding: "40px 0" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Summary cards */}
              {hasData && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <SummaryCard label="Total Sales" value={`KES ${fmt(overallTotal)}`} color={C.primary} bg={C.primaryLight} icon={<DollarOutlined />} />
                  <SummaryCard label="Stock Cost" value={`KES ${fmt(overallSupplierTotal)}`} color={C.blue} bg={C.blueLight} icon={<ShoppingOutlined />} />
                  <SummaryCard label="Gross Profit" value={`KES ${fmt(grossProfit)}`} color={C.green} bg={C.greenLight} icon={<TagOutlined />} />
                  <SummaryCard label="Commission" value={`KES ${fmt(totalCommission)}`} color={C.orange} bg={C.orangeLight} icon={<TagOutlined />} />
                </div>
              )}

              {/* Date strip + grouping controls */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 14px",
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                flexWrap: "wrap",
              }}>
                <CalendarOutlined style={{ color: C.subText, fontSize: 12 }} />
                <Text style={{ fontSize: 12, color: C.subText, flex: 1 }}>
                  {dayjs(startDate).format("MMM DD, YYYY HH:mm")} → {dayjs(endDate).format("MMM DD, YYYY HH:mm")}
                </Text>

                {canGroup && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, borderLeft: `1px solid ${C.border}`, paddingLeft: 12 }}>
                    <GroupOutlined style={{ color: C.subText, fontSize: 12 }} />
                    <Text style={{ fontSize: 12, color: C.subText }}>Group by</Text>
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
                      <Select
                        size="small"
                        value={groupBy}
                        onChange={setGroupBy}
                        options={groupByOptions.filter(o => o.value !== "none")}
                        style={{ width: 110 }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Preview container */}
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.white, overflow: "hidden" }}>
                {/* Preview bar */}
                <div style={{
                  padding: "7px 14px",
                  background: C.bg,
                  borderBottom: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {printMode === "thermal"
                    ? <><MobileOutlined style={{ color: C.subText, fontSize: 11 }} /><Text style={{ fontSize: 11, color: C.subText }}>Thermal Receipt · 80mm</Text></>
                    : <><FilePdfOutlined style={{ color: C.primary, fontSize: 11 }} /><Text style={{ fontSize: 11, color: C.subText }}>A4 PDF Preview</Text></>
                  }
                  {groupingEnabled && effectiveGroupBy !== "none" && (
                    <span style={{ marginLeft: "auto", fontSize: 11, color: C.primary, background: C.primaryLight, borderRadius: 4, padding: "1px 8px" }}>
                      Grouped · {groupByOptions.find(o => o.value === effectiveGroupBy)?.label}
                    </span>
                  )}
                </div>

                <div style={{ padding: 16, maxHeight: "52vh", overflowY: "auto" }}>
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
};

export default ItemSalesModal;