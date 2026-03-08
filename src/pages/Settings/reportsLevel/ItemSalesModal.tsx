import React, { forwardRef, useMemo, useRef, useState } from "react";
import { Button, Empty, Modal, Segmented, Spin, Typography } from "antd";
import {
  CalendarOutlined,
  DollarOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  MobileOutlined,
  PrinterFilled,
  ShoppingOutlined,
  TagOutlined,
  UserOutlined,
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
  indigo: "#6366f1",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
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
  overallTotal: number;
  overallSupplierTotal: number;
  totalCommission: number;
  customerName?: string | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// THERMAL RECEIPT
// ══════════════════════════════════════════════════════════════════════════════
const ThermalReceipt = forwardRef<HTMLDivElement, ReportProps>(({
  data, startDate, endDate, brandName,
  overallTotal, overallSupplierTotal, totalCommission, customerName,
}, ref) => (
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
      style={{ fontFamily: "monospace", color: "#000", padding: "8px 4px", maxWidth: 320, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        {brandName && brandName !== "undefined undefined" && (
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{brandName}</div>
        )}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px" }}>ITEM SALES REPORT</div>
        {customerName && (
          <div style={{ fontSize: 10, fontWeight: 700, margin: "6px 0", padding: "3px 0", borderTop: "1px dashed #999", borderBottom: "1px dashed #999" }}>
            Customer: {customerName}
          </div>
        )}
        <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
        <div style={{ fontSize: 10, color: "#555" }}>
          <strong>From:</strong> {dayjs(startDate).format("MMM DD, YYYY h:mm A")}
        </div>
        <div style={{ fontSize: 10, color: "#555" }}>
          <strong>To:</strong> {dayjs(endDate).format("MMM DD, YYYY h:mm A")}
        </div>
        <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
      </div>

      {/* Categories + sub-items */}
      {data.map((item: any, i: number) => {
        const catTotal = getCategoryTotal(item.orderItems);
        return (
          <div key={item.id || i} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 11, borderBottom: "1px solid #ccc", paddingBottom: 2 }}>
              <span>{item.name || "Uncategorized"}</span>
              <span>KES {fmt(catTotal)}</span>
            </div>
            {item.orderItems?.map((oi: any, idx: number) => (
              <div key={oi.id || idx} style={{ paddingLeft: 8, paddingTop: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5 }}>
                  <span>×{Number(oi.quantity || 0).toFixed(1)} {oi.name || "Item"}</span>
                  <span>{fmt(oi.amount || 0)}</span>
                </div>
                {oi.supplier_price > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#777" }}>
                    <span style={{ paddingLeft: 8 }}>Stock cost</span>
                    <span>{fmt((oi.supplier_price || 0) * (oi.quantity || 0))}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {/* Totals */}
      <div style={{ borderTop: "1px dashed #999", paddingTop: 8 }}>
        {[
          { label: "Overall Total:", value: fmt(overallTotal), bold: true },
          { label: "Overall Stock Total:", value: fmt(overallSupplierTotal), bold: false },
          { label: "Overall Commission:", value: fmt(totalCommission), bold: false },
        ].map(({ label, value, bold }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: bold ? 11 : 10, fontWeight: bold ? 700 : 500, padding: "2px 0", borderBottom: "1px dotted #ddd" }}>
            <span>{label}</span>
            <span>KES {value}</span>
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
  data, startDate, endDate, brandName,
  overallTotal, overallSupplierTotal, totalCommission, customerName,
}, ref) => (
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
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, letterSpacing: "1px" }}>ITEM SALES REPORT</div>
            {customerName && (
              <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4, background: "rgba(255,255,255,0.15)", borderRadius: 4, padding: "2px 8px", display: "inline-block" }}>
                Customer: {customerName}
              </div>
            )}
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
          { label: "Overall Total", value: `KES ${fmt(overallTotal)}`, color: C.primary },
          { label: "Stock Cost", value: `KES ${fmt(overallSupplierTotal)}`, color: C.blue },
          { label: "Commission", value: `KES ${fmt(totalCommission)}`, color: C.orange },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            flex: 1, padding: "12px 14px", marginLeft: 8, borderRadius: 6,
            background: "#fff", border: `1px solid ${C.border}`, borderLeft: `3px solid ${color}`,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Items */}
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {data.map((item: any, i: number) => {
          const catTotal = getCategoryTotal(item.orderItems);
          return (
            <div key={item.id || i}>
              {/* Category header */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: C.primaryLight, border: `1px solid ${C.border}`,
                borderRadius: "6px 6px 0 0", padding: "8px 12px",
                printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
              } as React.CSSProperties}>
                <span style={{ fontWeight: 700, fontSize: 12, color: C.primary }}>{item.name || "Uncategorized"}</span>
                <span style={{ fontWeight: 700, fontSize: 12, color: C.primary }}>KES {fmt(catTotal)}</span>
              </div>
              {/* Sub-items table */}
              {item.orderItems?.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: `1px solid ${C.border}`, borderTop: "none" }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th style={{ padding: "6px 12px", textAlign: "left", fontWeight: 600, color: C.subText, width: 55, borderBottom: `1px solid ${C.border}` }}>QTY</th>
                      <th style={{ padding: "6px 12px", textAlign: "left", fontWeight: 600, color: C.subText, borderBottom: `1px solid ${C.border}` }}>ITEM</th>
                      <th style={{ padding: "6px 12px", textAlign: "right", fontWeight: 600, color: C.subText, width: 120, borderBottom: `1px solid ${C.border}` }}>STOCK COST</th>
                      <th style={{ padding: "6px 12px", textAlign: "right", fontWeight: 600, color: C.subText, width: 110, borderBottom: `1px solid ${C.border}` }}>PRICE (KES)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.orderItems.map((oi: any, idx: number) => (
                      <tr key={oi.id || idx} style={{ background: idx % 2 === 0 ? "#fff" : C.bg }}>
                        <td style={{ padding: "6px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "center", color: C.subText }}>
                          {Number(oi.quantity || 0).toFixed(1)}
                        </td>
                        <td style={{ padding: "6px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>
                          {oi.name || "Item"}
                        </td>
                        <td style={{ padding: "6px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", color: C.subText }}>
                          {fmt((oi.supplier_price || 0) * (oi.quantity || 0))}
                        </td>
                        <td style={{ padding: "6px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: 600 }}>
                          {fmt(oi.amount || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}

        {/* Summary */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <table style={{ width: 320, borderCollapse: "collapse", fontSize: 11 }}>
            <tbody>
              {[
                { label: "Overall Total", value: `KES ${fmt(overallTotal)}`, accent: true },
                { label: "Stock Cost", value: `KES ${fmt(overallSupplierTotal)}`, accent: false },
                { label: "Commission", value: `KES ${fmt(totalCommission)}`, accent: false },
              ].map(({ label, value, accent }) => (
                <tr key={label} style={{ background: accent ? C.primaryLight : "#fff" }}>
                  <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: accent ? 700 : 500, color: accent ? C.primary : C.darkText }}>{label}</td>
                  <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: accent ? 700 : 500, color: accent ? C.primary : C.darkText }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 10, color: C.subText }}>
          <span>Powered by <strong>{COOP_NAME}</strong></span>
          <span>Generated on {dayjs().format("MMM DD, YYYY [at] h:mm A")}</span>
        </div>
      </div>
    </div>
  </>
));

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL  — controlled via open / onClose props from AdminReports
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

  const thermalRef = useRef<HTMLDivElement>(null);
  const a4Ref = useRef<HTMLDivElement>(null);

  // Normalise data — handle { success, data: [] } envelope OR plain array
  const data = useMemo(() => {
    if (!rawData) return [];
    if (rawData.success && Array.isArray(rawData.data)) return rawData.data;
    if (Array.isArray(rawData)) return rawData;
    if (rawData.data && Array.isArray(rawData.data)) return rawData.data;
    return [];
  }, [rawData]);

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
    overallTotal, overallSupplierTotal, totalCommission: totalCommission, customerName,
  };

  const printThermal = useReactToPrint({ content: () => thermalRef.current });
  const printA4 = useReactToPrint({ content: () => a4Ref.current });
  const handlePrint = () => printMode === "thermal" ? printThermal() : printA4();

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
            <div>
              <Text strong style={{ fontSize: 14, color: C.darkText, display: "block" }}>Item Sales Report</Text>
              {customerName && (
                <Text style={{ fontSize: 11, color: C.subText }}><UserOutlined style={{ marginRight: 4 }} />{customerName}</Text>
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
      <Spin spinning={loading} tip="Generating item sales report…" style={{ display: "block", width: "100%" }}>
        {!hasData && !loading ? (
          <Empty description="No sales data found for the selected period" style={{ padding: "40px 0" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Summary cards */}
            {hasData && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <SummaryCard label="Total Sales" value={`KES ${fmt(overallTotal)}`} color={C.primary} bg={C.primaryLight} icon={<DollarOutlined />} />
                <SummaryCard label="Stock Cost" value={`KES ${fmt(overallSupplierTotal)}`} color={C.blue} bg="#eff6ff" icon={<ShoppingOutlined />} />
                <SummaryCard label="Gross Profit" value={`KES ${fmt(grossProfit)}`} color={C.green} bg="#f0fdf4" icon={<TagOutlined />} />
                <SummaryCard label="Commission" value={`KES ${fmt(totalCommission)}`} color={C.orange} bg="#fffbeb" icon={<TagOutlined />} />
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

export default ItemSalesModal;