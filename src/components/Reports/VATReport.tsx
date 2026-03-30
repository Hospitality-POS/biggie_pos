import React, { forwardRef, useRef, useState } from "react";
import { Button, Empty, Modal, Segmented, Spin, Typography } from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  MobileOutlined,
  PercentageOutlined,
  PrinterFilled,
  SettingOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import { useAppSelector } from "../../store";
import { COOP_NAME } from "@utils/config";
import useSystemDetails from "@hooks/useSystemDetails";
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
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v: number) => `${((v || 0) * 100).toFixed(2)}%`;

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
  data: any;
  startDate: string;
  endDate: string;
  brandName: string;
}

// ── Thermal row helper ────────────────────────────────────────────────────────
const TRow: React.FC<{ label: string; value: React.ReactNode; bold?: boolean }> = ({ label, value, bold }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: bold ? 700 : 400, padding: "2px 0", borderBottom: "1px dotted #ddd" }}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const TSectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", textAlign: "center", margin: "10px 0 6px", borderTop: "1px dashed #ccc", paddingTop: 8 }}>
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// THERMAL RECEIPT
// ══════════════════════════════════════════════════════════════════════════════
const ThermalReceipt = forwardRef<HTMLDivElement, ReportProps>(({
  data, startDate, endDate, brandName,
}, ref) => {
  const { summary, vat_by_type, pricing_modes, vat_configuration, period_info } = data || {};

  return (
    <>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          body * { visibility: hidden; }
          #vat-thermal, #vat-thermal * { visibility: visible; }
          #vat-thermal { position: absolute; inset: 0; }
        }
      `}</style>
      <div id="vat-thermal" ref={ref}
        style={{ fontFamily: "monospace", color: "#000", padding: "8px 4px", maxWidth: 320, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          {brandName && brandName !== "undefined undefined" && (
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{brandName}</div>
          )}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px" }}>VAT SUMMARY REPORT</div>
          <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
          <div style={{ fontSize: 10, color: "#555" }}>
            <strong>From:</strong> {dayjs(startDate).format("MMM DD, YYYY h:mm A")}
          </div>
          <div style={{ fontSize: 10, color: "#555" }}>
            <strong>To:</strong> {dayjs(endDate).format("MMM DD, YYYY h:mm A")}
          </div>
          <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
        </div>

        {/* VAT Configuration */}
        <TSectionTitle>VAT Configuration</TSectionTitle>
        <TRow label="VAT Enabled" value={vat_configuration?.vat_enabled ? "YES" : "NO"} bold />
        <TRow label="Pricing Mode" value={vat_configuration?.vat_mode || "N/A"} />
        <TRow label="Standard Rate" value={pct(vat_configuration?.standard_rate)} />

        {/* Summary Statistics */}
        <TSectionTitle>Summary Statistics</TSectionTitle>
        <TRow label="Total VAT Collected" value={`KES ${fmt(summary?.totalVAT)}`} bold />
        <TRow label="Total Revenue" value={`KES ${fmt(summary?.totalRevenue)}`} />
        <TRow label="Total Subtotal" value={`KES ${fmt(summary?.totalSubtotal)}`} />
        <TRow label="Total Discount" value={`KES ${fmt(summary?.totalDiscount)}`} />
        <TRow label="Invoice Count" value={summary?.invoiceCount || 0} />
        <TRow label="Avg VAT / Invoice" value={`KES ${fmt(summary?.averageVATPerInvoice)}`} />
        <TRow label="VAT % of Revenue" value={`${summary?.vatAsPercentageOfRevenue || 0}%`} />

        {/* VAT by Type */}
        {vat_by_type?.length > 0 && (
          <>
            <TSectionTitle>VAT Breakdown by Type</TSectionTitle>
            {vat_by_type.map((item: any, i: number) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <TRow label={item.vatType} value={`KES ${fmt(item.totalVAT)}`} bold />
                <TRow label="  Invoices" value={item.invoiceCount || 0} />
                <TRow label="  Rate" value={pct(item.vatRate)} />
              </div>
            ))}
          </>
        )}

        {/* Pricing Modes */}
        {Object.keys(pricing_modes || {}).length > 0 && (
          <>
            <TSectionTitle>VAT by Pricing Mode</TSectionTitle>
            {Object.entries(pricing_modes).map(([key, value]: [string, any], i: number) => (
              <div key={key} style={{ marginBottom: 6 }}>
                <TRow label={key} value={`KES ${fmt(value.totalVAT)}`} bold />
                <TRow label="  Invoices" value={value.invoiceCount || 0} />
              </div>
            ))}
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 9, color: "#aaa", borderTop: "1px dashed #ccc", paddingTop: 8 }}>
          <div>Completed Orders: <strong>{period_info?.completed_orders_count || 0}</strong></div>
          <div>Powered by: <strong>{COOP_NAME}</strong></div>
          <div>{dayjs().format("MMM DD, YYYY [at] h:mm A")}</div>
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
}, ref) => {
  const { summary, vat_by_type, pricing_modes, vat_configuration, period_info } = data || {};

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 16mm; }
          body * { visibility: hidden; }
          #vat-a4, #vat-a4 * { visibility: visible; }
          #vat-a4 { position: absolute; inset: 0; }
        }
      `}</style>
      <div id="vat-a4" ref={ref}
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
              <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, letterSpacing: "1px" }}>VAT SUMMARY REPORT</div>
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
            { label: "VAT Collected", value: `KES ${fmt(summary?.totalVAT)}`, color: C.primary },
            { label: "Total Revenue", value: `KES ${fmt(summary?.totalRevenue)}`, color: C.blue },
            { label: "VAT % Revenue", value: `${summary?.vatAsPercentageOfRevenue || 0}%`, color: C.green },
            { label: "Invoices", value: `${summary?.invoiceCount || 0}`, color: C.orange },
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

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Two-column: Summary + Config */}
          <div style={{ display: "flex", gap: 16 }}>

            {/* Summary table */}
            <div style={{ flex: 2 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Summary Statistics</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <tbody>
                  {[
                    { label: "Total VAT Collected", value: `KES ${fmt(summary?.totalVAT)}`, accent: true },
                    { label: "Total Revenue", value: `KES ${fmt(summary?.totalRevenue)}`, accent: false },
                    { label: "Total Subtotal", value: `KES ${fmt(summary?.totalSubtotal)}`, accent: false },
                    { label: "Total Discount", value: `KES ${fmt(summary?.totalDiscount)}`, accent: false },
                    { label: "Invoice Count", value: `${summary?.invoiceCount || 0}`, accent: false },
                    { label: "Avg VAT per Invoice", value: `KES ${fmt(summary?.averageVATPerInvoice)}`, accent: false },
                    { label: "VAT % of Revenue", value: `${summary?.vatAsPercentageOfRevenue || 0}%`, accent: false },
                  ].map(({ label, value, accent }) => (
                    <tr key={label} style={{ background: accent ? C.primaryLight : "#fff" }}>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.border}`, fontWeight: accent ? 700 : 500, color: accent ? C.primary : C.darkText }}>{label}</td>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: accent ? 700 : 500, color: accent ? C.primary : C.darkText }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Config + Completed Orders */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>VAT Configuration</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <tbody>
                  {[
                    { label: "VAT Enabled", value: vat_configuration?.vat_enabled ? "YES" : "NO" },
                    { label: "Pricing Mode", value: vat_configuration?.vat_mode || "N/A" },
                    { label: "Standard Rate", value: pct(vat_configuration?.standard_rate) },
                  ].map(({ label, value }) => (
                    <tr key={label}>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.border}`, color: C.subText, fontSize: 10 }}>{label}</td>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: 600 }}>{value}</td>
                    </tr>
                  ))}
                  <tr style={{ background: C.bg }}>
                    <td style={{ padding: "6px 10px", color: C.subText, fontSize: 10 }}>Completed Orders</td>
                    <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: C.primary }}>{period_info?.completed_orders_count || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* VAT by Type */}
          {vat_by_type?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>VAT Breakdown by Type</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{
                    background: C.primary, color: "#fff",
                    printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
                  } as React.CSSProperties}>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700 }}>VAT Type</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, width: 80 }}>Rate</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, width: 80 }}>Invoices</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, width: 140 }}>Total VAT (KES)</th>
                  </tr>
                </thead>
                <tbody>
                  {vat_by_type.map((item: any, i: number) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.bg }}>
                      <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{item.vatType}</td>
                      <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", color: C.subText }}>{pct(item.vatRate)}</td>
                      <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right" }}>{item.invoiceCount || 0}</td>
                      <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: 700, color: C.primary }}>{fmt(item.totalVAT)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pricing Modes */}
          {Object.keys(pricing_modes || {}).length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>VAT by Pricing Mode</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{
                    background: C.primary, color: "#fff",
                    printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
                  } as React.CSSProperties}>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700 }}>Pricing Mode</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, width: 80 }}>Invoices</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, width: 140 }}>Total VAT (KES)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(pricing_modes).map(([key, value]: [string, any], i: number) => (
                    <tr key={key} style={{ background: i % 2 === 0 ? "#fff" : C.bg }}>
                      <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{key}</td>
                      <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right" }}>{value.invoiceCount || 0}</td>
                      <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: 700, color: C.primary }}>{fmt(value.totalVAT)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div style={{ paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 10, color: C.subText }}>
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
interface VATReportProps {
  openM: boolean;
  onCloseM: () => void;
  startDate: string;
  endDate: string;
}

const VATReportModal: React.FC<VATReportProps> = ({ openM, onCloseM, startDate, endDate }) => {
  const { BRAND_NAME1 } = useSystemDetails();
  const [printMode, setPrintMode] = useState<PrintMode>("thermal");

  const thermalRef = useRef<HTMLDivElement>(null);
  const a4Ref = useRef<HTMLDivElement>(null);

  const { vatReport: data, loading } = useAppSelector((state: any) => state.Report);
  const { summary, vat_by_type } = data || {};
  const hasData = !!(summary || vat_by_type?.length);

  const printThermal = useReactToPrint({ content: () => thermalRef.current });
  const printA4 = useReactToPrint({ content: () => a4Ref.current });
  const handlePrint = () => printMode === "thermal" ? printThermal() : printA4();

  const sharedProps: ReportProps = { data, startDate, endDate, brandName: BRAND_NAME1 };

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
            <Text strong style={{ fontSize: 14, color: C.darkText }}>VAT Summary Report</Text>
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
      <Spin spinning={loading} tip="Generating VAT report…" style={{ display: "block", width: "100%" }}>
        {!hasData && !loading ? (
          <Empty description="No VAT data found for the selected period" style={{ padding: "40px 0" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Summary cards */}
            {hasData && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <SummaryCard label="VAT Collected" value={`KES ${fmt(summary?.totalVAT)}`} color={C.primary} bg={C.primaryLight} icon={<PercentageOutlined />} />
                <SummaryCard label="Total Revenue" value={`KES ${fmt(summary?.totalRevenue)}`} color={C.blue} bg="#eff6ff" icon={<TagOutlined />} />
                <SummaryCard label="Invoices" value={`${summary?.invoiceCount || 0}`} color={C.green} bg="#f0fdf4" icon={<CheckCircleOutlined />} />
                <SummaryCard label="VAT Config" value={summary?.vat_configuration?.vat_enabled !== false ? "Active" : "Off"} color={C.orange} bg="#fffbeb" icon={<SettingOutlined />} />
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

export default VATReportModal;