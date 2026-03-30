import React, { forwardRef, useMemo, useRef, useState } from "react";
import { Button, Empty, Modal, Segmented, Spin, Typography } from "antd";
import {
  CalendarOutlined,
  CarOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  MobileOutlined,
  PrinterFilled,
  ShoppingOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import { useAppSelector } from "../../store";
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

function calcTotalCost(data: any[]): number {
  if (!Array.isArray(data)) return 0;
  return data.reduce((s, i) => s + (Number(i.supplier_price) || 0) * (Number(i.quantity) || 0), 0);
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
  totalCost: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// THERMAL RECEIPT
// ══════════════════════════════════════════════════════════════════════════════
const ThermalReceipt = forwardRef<HTMLDivElement, ReportProps>(({
  data, startDate, endDate, brandName, totalCost,
}, ref) => (
  <>
    <style>{`
      @media print {
        @page { size: 80mm auto; margin: 4mm; }
        body * { visibility: hidden; }
        #delivery-thermal, #delivery-thermal * { visibility: visible; }
        #delivery-thermal { position: absolute; inset: 0; }
      }
    `}</style>
    <div id="delivery-thermal" ref={ref}
      style={{ fontFamily: "monospace", color: "#000", padding: "8px 4px", maxWidth: 320, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        {brandName && brandName !== "undefined undefined" && (
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{brandName}</div>
        )}
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1.5px" }}>DELIVERY REPORT</div>
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
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontWeight: 700, borderBottom: "2px solid #000", paddingBottom: 3, marginBottom: 4 }}>
          <span style={{ flex: 2 }}>ITEM</span>
          <span style={{ width: 36, textAlign: "right" }}>UOM</span>
          <span style={{ width: 36, textAlign: "right" }}>QTY</span>
          <span style={{ width: 52, textAlign: "right" }}>PRICE</span>
        </div>
        {data?.map((item: any, i: number) => (
          <div key={item.inventory_id || i} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, padding: "3px 0", borderBottom: "1px dotted #ddd" }}>
            <span style={{ flex: 2, fontWeight: 600, wordBreak: "break-word", paddingRight: 4 }}>{item.name}</span>
            <span style={{ width: 36, textAlign: "right", color: "#777" }}>{item.uom}</span>
            <span style={{ width: 36, textAlign: "right" }}>{(item.quantity || 0).toFixed(1)}</span>
            <span style={{ width: 52, textAlign: "right" }}>{(item.supplier_price || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{ borderTop: "1px dashed #999", paddingTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, padding: "3px 0" }}>
          <span>Total Cost:</span>
          <span>KSh. {fmt(totalCost)}</span>
        </div>
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
  data, startDate, endDate, brandName, totalCost,
}, ref) => (
  <>
    <style>{`
      @media print {
        @page { size: A4 portrait; margin: 16mm; }
        body * { visibility: hidden; }
        #delivery-a4, #delivery-a4 * { visibility: visible; }
        #delivery-a4 { position: absolute; inset: 0; }
      }
    `}</style>
    <div id="delivery-a4" ref={ref}
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
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, letterSpacing: "1px" }}>DELIVERY REPORT</div>
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
          { label: "Total Cost", value: `KES ${fmt(totalCost)}`, color: C.primary },
          { label: "Total Items", value: `${data?.length || 0}`, color: C.blue },
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
              <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700 }}>Item</th>
              <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, width: 72 }}>Unit</th>
              <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, width: 72 }}>Qty</th>
              <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, width: 110 }}>Unit Price</th>
              <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, width: 120 }}>Line Total (KES)</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((item: any, i: number) => {
              const lineTotal = (Number(item.supplier_price) || 0) * (Number(item.quantity) || 0);
              return (
                <tr key={item.inventory_id || i} style={{ background: i % 2 === 0 ? "#fff" : C.bg }}>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{item.name}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", color: C.subText }}>{item.uom}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right" }}>{(item.quantity || 0).toFixed(1)}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right" }}>{fmt(item.supplier_price || 0)}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: 600 }}>{fmt(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <table style={{ width: 280, borderCollapse: "collapse", fontSize: 11 }}>
            <tbody>
              <tr style={{ background: C.primaryLight }}>
                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.primary }}>Total Cost</td>
                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: 700, color: C.primary }}>
                  KES {fmt(totalCost)}
                </td>
              </tr>
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
));

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ══════════════════════════════════════════════════════════════════════════════
interface DeliveryReportProps {
  openM: boolean;
  onCloseM: () => void;
  startDate: string;
  endDate: string;
}

const DeliveryReportModal: React.FC<DeliveryReportProps> = ({ openM, onCloseM, startDate, endDate }) => {
  const { BRAND_NAME1 } = useSystemDetails();
  const [printMode, setPrintMode] = useState<PrintMode>("thermal");

  const thermalRef = useRef<HTMLDivElement>(null);
  const a4Ref = useRef<HTMLDivElement>(null);

  const { deliveryReport: rawData, loading } = useAppSelector((state) => state.Report);
  const data = useMemo(() => (Array.isArray(rawData) ? rawData : []), [rawData]);
  const totalCost = useMemo(() => calcTotalCost(data), [data]);
  const hasData = data.length > 0;

  const sharedProps: ReportProps = { data, startDate, endDate, brandName: BRAND_NAME1, totalCost };

  const printThermal = useReactToPrint({ content: () => thermalRef.current });
  const printA4 = useReactToPrint({ content: () => a4Ref.current });
  const handlePrint = () => printMode === "thermal" ? printThermal() : printA4();

  return (
    <Modal
      open={openM}
      onCancel={onCloseM}
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
            <Text strong style={{ fontSize: 14, color: C.darkText }}>Delivery Report</Text>
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
          <Button onClick={onCloseM} style={{ borderRadius: 8 }}>Cancel</Button>
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
      <Spin spinning={loading} tip="Generating delivery report…" style={{ display: "block", width: "100%" }}>
        {!hasData && !loading ? (
          <Empty description="No delivery data found for the selected period" style={{ padding: "40px 0" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Summary cards */}
            {hasData && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <SummaryCard label="Total Cost" value={`KES ${fmt(totalCost)}`} color={C.primary} bg={C.primaryLight} icon={<ShoppingOutlined />} />
                <SummaryCard label="Total Items" value={`${data.length}`} color={C.blue} bg="#eff6ff" icon={<CarOutlined />} />
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

export default DeliveryReportModal;