import React, { forwardRef, useRef, useState } from "react";
import { Button, Empty, Form, Input, Modal, Segmented, Space, Spin, Switch, Typography } from "antd";
import {
  CalendarOutlined,
  DollarOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  MailOutlined,
  MobileOutlined,
  PrinterFilled,
  SendOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import { jsPDF } from "jspdf";
import autoTable from "@utils/autoTable";
import dayjs from "dayjs";
import useSystemDetails from "@hooks/useSystemDetails";
import { useThermalAgentPrint } from "@hooks/useThermalAgentPrint";
import ThermalPrintControls from "@components/Reports/ThermalPrintControls";
import { COOP_NAME } from "@utils/config";
import { sendSalesReportEmail, refToHtmlString } from "@services/emailReports";
import { THEME_C, hexToRgb } from "@utils/getPrimaryColor";

const { Text } = Typography;

type PrintMode = "thermal" | "a4";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = THEME_C;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Summary = { total_revenue: number; total_staff_earnings: number; platform_earnings: number } | null | undefined;

/**
 * Report totals. When the % split is on, each row's `totalSales` is that
 * person's earnings (the split is already applied server-side), so staff
 * earnings are the summed rows — never re-apply the percentage here.
 * `excluded` rows (e.g. admins) are taken out of revenue and earnings.
 */
const computeTotals = (data: EarnerRow[], summary: Summary, percentageEnabled: boolean, excluded: EarnerRow[] = []) => {
  const sum = (rows: EarnerRow[], pick: (r: EarnerRow) => number) => rows.reduce((s, r) => s + (pick(r) || 0), 0);
  const excludedSales = sum(excluded, (r) => r.totalSales);
  if (!percentageEnabled) {
    const revenue = sum(data, (r) => r.totalSales) - excludedSales;
    return { revenue, staffEarnings: revenue, platformCut: 0 };
  }
  const revenue = (summary?.total_revenue || sum(data, (r) => r.revenue ?? 0)) - sum(excluded, (r) => r.revenue ?? 0);
  const staffEarnings = (summary?.total_staff_earnings ?? sum(data, (r) => r.totalSales)) - excludedSales;
  return { revenue, staffEarnings, platformCut: revenue - staffEarnings };
};

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

// ── Shared props ──────────────────────────────────────────────────────────────
interface EarnerRow {
  id: string;
  name: string;
  totalSales: number;
  /** Gross revenue attributed to this staff member. */
  revenue?: number;
  isAdmin?: boolean;
}

interface ReportProps {
  data: EarnerRow[];
  startDate: string;
  endDate: string;
  brandName: string;
  staffPct: number;
  platformPct: number;
  summary?: { total_revenue: number; total_staff_earnings: number; platform_earnings: number } | null;
  staffEarningEnabled?: boolean;
  /** Shop flag — when false, staff figures are revenue (no % split shown). */
  percentageEnabled?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// THERMAL RECEIPT
// ══════════════════════════════════════════════════════════════════════════════
const ThermalReceipt = forwardRef<HTMLDivElement, ReportProps>(
  ({ data, startDate, endDate, brandName, staffPct, platformPct, summary, percentageEnabled = true }, ref) => {
    const { revenue, staffEarnings: totalStaffEarnings, platformCut } = computeTotals(data, summary, percentageEnabled);

    return (
      <>
        <style>{`@media print { @page { size: 80mm auto; margin: 4mm; } body * { visibility: hidden; } #thermal-earners, #thermal-earners * { visibility: visible; } #thermal-earners { position: absolute; inset: 0; } }`}</style>
        <div id="thermal-earners" ref={ref} style={{ fontFamily: "monospace", color: "#000", padding: "8px 4px", maxWidth: 320, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            {brandName && brandName !== "undefined undefined" && <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{brandName}</div>}
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1.5px" }}>TOP EARNERS REPORT</div>
            <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
            <div style={{ fontSize: 10, color: "#555" }}><strong>From:</strong> {dayjs(startDate).format("MMM DD, YYYY h:mm A")}</div>
            <div style={{ fontSize: 10, color: "#555" }}><strong>To:</strong> {dayjs(endDate).format("MMM DD, YYYY h:mm A")}</div>
            <div style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
          </div>

          {data.map((r, i) => (
            <div key={r.id} style={{ marginBottom: 6, borderBottom: "1px dotted #ddd", paddingBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: i === 0 ? 700 : 500, fontSize: 11 }}>
                <span>{i + 1}. {i === 0 ? "🏆 " : ""}{r.name}</span>
                <span>KSh. {fmt(r.totalSales)}</span>
              </div>
            </div>
          ))}

          <div style={{ borderTop: "1px dashed #999", marginTop: 10, paddingTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, padding: "2px 0", borderBottom: percentageEnabled ? "1px dotted #ddd" : "none" }}>
              <span>Total Revenue:</span><span>KSh. {fmt(revenue)}</span>
            </div>
            {percentageEnabled && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, padding: "2px 0", borderBottom: "1px dotted #ddd" }}>
                  <span>Total Staff Earnings:</span><span>KSh. {fmt(totalStaffEarnings)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, padding: "2px 0" }}>
                  <span>Platform Cut:</span><span>KSh. {fmt(platformCut)}</span>
                </div>
              </>
            )}
          </div>

          <div style={{ textAlign: "center", marginTop: 12, fontSize: 9, color: "#aaa" }}>
            {percentageEnabled && <div>Split: {staffPct}% staff · {platformPct}% platform</div>}
            <div>Powered by: <strong>{COOP_NAME}</strong></div>
            <div>{dayjs().format("MMM DD, YYYY [at] h:mm A")}</div>
          </div>
        </div>
      </>
    );
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// A4 REPORT
// ══════════════════════════════════════════════════════════════════════════════
const A4Report = forwardRef<HTMLDivElement, ReportProps>(
  ({ data, startDate, endDate, brandName, staffPct, platformPct, summary, percentageEnabled = true }, ref) => {
    const { revenue, staffEarnings: totalStaffEarnings, platformCut } = computeTotals(data, summary, percentageEnabled);

    return (
      <>
        <style>{`@media print { @page { size: A4 portrait; margin: 16mm; } body * { visibility: hidden; } #a4-earners, #a4-earners * { visibility: visible; } #a4-earners { position: absolute; inset: 0; } }`}</style>
        <div id="a4-earners" ref={ref} style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: C.darkText, background: "#fff" }}>
          <div style={{ background: C.primary, color: "#fff", padding: "24px 32px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                {brandName && brandName !== "undefined undefined" && <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{brandName}</div>}
                <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, letterSpacing: "1px" }}>TOP EARNERS REPORT</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 11, opacity: 0.9 }}>
                <div><strong>From:</strong> {dayjs(startDate).format("MMM DD, YYYY h:mm A")}</div>
                <div><strong>To:</strong> {dayjs(endDate).format("MMM DD, YYYY h:mm A")}</div>
                <div style={{ marginTop: 4, fontSize: 10, opacity: 0.7 }}>Generated {dayjs().format("MMM DD, YYYY")}</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, background: C.bg }}>
            {[
              { label: "Total Revenue", value: `KES ${fmt(revenue)}`, color: C.primary },
              ...(percentageEnabled ? [
                { label: `Total Staff Earnings (${staffPct}%)`, value: `KES ${fmt(totalStaffEarnings)}`, color: C.green },
                { label: `Platform Cut (${platformPct}%)`, value: `KES ${fmt(platformCut)}`, color: C.blue },
              ] : []),
              { label: "Top Earner", value: data[0]?.name || "—", color: C.orange },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ flex: 1, padding: "14px 16px", borderLeft: `3px solid ${color}`, background: "#fff", margin: "8px 0 8px 8px", borderRadius: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "20px 24px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 20 }}>
              <thead>
                <tr style={{ background: C.primary, color: "#fff" }}>
                  <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700 }}>#</th>
                  <th style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700 }}>Staff Member</th>
                  <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>{percentageEnabled ? "Total Earnings" : "Total Revenue"}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : C.bg }}>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, textAlign: "center" }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? C.primary : C.darkText }}>
                      {i === 0 ? "🏆 " : ""}{r.name}
                    </td>
                    <td style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: 600 }}>
                      KES {fmt(r.totalSales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <table style={{ width: 340, borderCollapse: "collapse", fontSize: 11 }}>
                <tbody>
                  <tr style={{ background: C.primaryLight }}>
                    <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.primary }}>Total Revenue</td>
                    <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: 700, color: C.primary }}>KES {fmt(revenue)}</td>
                  </tr>
                  {percentageEnabled && (
                    <>
                      <tr>
                        <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 500, color: C.darkText }}>Total Staff Earnings</td>
                        <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: 700, color: C.green }}>KES {fmt(totalStaffEarnings)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "7px 12px", fontWeight: 500, color: C.darkText }}>Platform Cut</td>
                        <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 700, color: C.blue }}>KES {fmt(platformCut)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 32, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 10, color: C.subText }}>
              <span>{percentageEnabled ? `Split ratio: ${staffPct}% staff · ${platformPct}% platform` : "Revenue per staff member"}</span>
              <span>Powered by <strong>{COOP_NAME}</strong></span>
              <span>Generated on {dayjs().format("MMM DD, YYYY [at] h:mm A")}</span>
            </div>
          </div>
        </div>
      </>
    );
  }
);

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
          <Input placeholder="cfo@company.com, accounts@company.com" />
        </Form.Item>

        <Form.Item name="intro" label="Personal Message (optional)">
          <Input.TextArea rows={3} placeholder="Please find the top earners report for the selected period." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ══════════════════════════════════════════════════════════════════════════════
function TopEarnersModal({
  data,
  startDate,
  endDate,
  staffPct,
  platformPct,
  open,
  onClose,
  summary,
  staffEarningEnabled,
  percentageEnabled = true,
}: {
  data: EarnerRow[];
  startDate: string;
  endDate: string;
  staffPct: number;
  platformPct: number;
  open: boolean;
  onClose: () => void;
  summary?: { total_revenue: number; total_staff_earnings: number; platform_earnings: number } | null;
  staffEarningEnabled?: boolean;
  /** Shop flag — when false, staff figures are revenue (no % split shown). */
  percentageEnabled?: boolean;
}) {
  const { BRAND_NAME1 } = useSystemDetails();
  const [printMode, setPrintMode] = useState<PrintMode>("thermal");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [excludeAdmin, setExcludeAdmin] = useState(false);
  const hasAdmin = data.some((r) => r.isAdmin);

  const thermalRef = useRef<HTMLDivElement>(null);
  const a4Ref = useRef<HTMLDivElement>(null);

  const { revenue, staffEarnings: totalStaffEarnings, platformCut } = computeTotals(data, summary, percentageEnabled);

  const printA4 = useReactToPrint({ content: () => a4Ref.current });
  const thermal = useThermalAgentPrint(thermalRef);
  const handlePrint = () => printMode === "thermal" ? void thermal.print() : printA4();

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryRgb = hexToRgb(C.primary);

    // Optionally drop admin accounts: their revenue and earnings come off the totals.
    const rows = excludeAdmin ? data.filter((r) => !r.isAdmin) : data;
    const excluded = excludeAdmin ? data.filter((r) => r.isAdmin) : [];
    const totals = computeTotals(data, summary, percentageEnabled, excluded);

    // Header band
    doc.setFillColor(...primaryRgb);
    doc.rect(0, 0, pageWidth, 28, "F");
    doc.setTextColor(255);
    const hasBrand = BRAND_NAME1 && BRAND_NAME1 !== "undefined undefined";
    if (hasBrand) {
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text(BRAND_NAME1, 14, 12);
    }
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("TOP EARNERS REPORT", 14, hasBrand ? 20 : 15);
    doc.setFontSize(8);
    doc.text(`From: ${dayjs(startDate).format("MMM DD, YYYY h:mm A")}`, pageWidth - 14, 11, { align: "right" });
    doc.text(`To: ${dayjs(endDate).format("MMM DD, YYYY h:mm A")}`, pageWidth - 14, 16, { align: "right" });
    doc.text(`Generated ${dayjs().format("MMM DD, YYYY h:mm A")}`, pageWidth - 14, 21, { align: "right" });
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 36,
      head: [["#", "Staff Member", percentageEnabled ? "Total Earnings (KES)" : "Total Revenue (KES)"]],
      body: rows.map((r, i) => [i + 1, r.name, fmt(r.totalSales)]),
      theme: "grid",
      styles: { fontSize: 9 },
      columnStyles: { 0: { halign: "center", cellWidth: 14 }, 2: { halign: "right" } },
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      didParseCell: (cell) => {
        if (cell.section === "body" && cell.row.index === 0) cell.cell.styles.fontStyle = "bold";
      },
    });

    const summaryRows: string[][] = [["Total Revenue", `KES ${fmt(totals.revenue)}`]];
    if (percentageEnabled) {
      summaryRows.push(
        [`Total Staff Earnings (${staffPct}%)`, `KES ${fmt(totals.staffEarnings)}`],
        [`Platform Cut (${platformPct}%)`, `KES ${fmt(totals.platformCut)}`],
      );
    }
    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY || 60) + 8,
      body: summaryRows,
      theme: "plain",
      tableWidth: 90,
      margin: { left: pageWidth - 14 - 90 },
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right", fontStyle: "bold" } },
    });

    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Powered by ${COOP_NAME}`, 14, footerY);
    if (percentageEnabled) {
      doc.text(`Split: ${staffPct}% staff · ${platformPct}% platform`, pageWidth - 14, footerY, { align: "right" });
    }

    doc.save(`top-earners-report-${dayjs().format("YYYYMMDD-HHmm")}.pdf`);
  };

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
        totals: {
          overallTotal: revenue,
          stockCost: 0,
          grossProfit: revenue,
          commission: totalStaffEarnings,
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
    data, startDate, endDate, brandName: BRAND_NAME1, staffPct, platformPct, summary, staffEarningEnabled, percentageEnabled,
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        destroyOnClose
        width={printMode === "a4" ? 960 : 840}
        style={{ top: 20 }}
        // Footer gets the same inset as the body so buttons line up with the content edges.
        styles={{ body: { padding: "16px 20px" }, footer: { padding: "4px 20px 0", marginTop: 4 } }}
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
                <FileTextOutlined />
              </div>
              <Text strong style={{ fontSize: 14, color: C.darkText }}>Top Earners Report</Text>
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
            <Space wrap align="center" size={8}>
              <Button
                icon={<MailOutlined />}
                onClick={() => setEmailModalOpen(true)}
                style={{ borderColor: C.primary, color: C.primary, borderRadius: 8 }}
              >
                Send via Email
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadPdf}
                disabled={data.length === 0}
                style={{ borderColor: C.primary, color: C.primary, borderRadius: 8 }}
              >
                Download PDF
              </Button>
            </Space>
            <Space wrap align="center" size={8} style={{ marginLeft: "auto", justifyContent: "flex-end" }}>
              {printMode === "thermal" && (
                <ThermalPrintControls
                  size="middle"
                  target={thermal.target}
                  onTargetChange={thermal.setTarget}
                  zones={thermal.zoneOptions}
                  zoneKey={thermal.zoneKey}
                  onZoneChange={thermal.setZoneKey}
                  loading={thermal.agentsLoading}
                />
              )}
              <Button onClick={onClose} style={{ borderRadius: 8 }}>Cancel</Button>
              <Button
                type="primary"
                icon={<PrinterFilled />}
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
        <Spin spinning={false} tip="Loading top earners report…" style={{ display: "block", width: "100%" }}>
          {data.length === 0 ? (
            <Empty description="No top earners data found for the selected period" style={{ padding: "40px 0" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <SummaryCard label="Total Revenue" value={`KES ${fmt(revenue)}`} color={C.primary} bg={C.primaryLight} icon={<DollarOutlined />} />
                  {percentageEnabled && (
                    <>
                      <SummaryCard label={`Staff Earnings (${staffPct}%)`} value={`KES ${fmt(totalStaffEarnings)}`} color={C.green} bg="#f0fdf4" icon={<TrophyOutlined />} />
                      <SummaryCard label={`Platform Cut (${platformPct}%)`} value={`KES ${fmt(platformCut)}`} color={C.blue} bg="#eff6ff" icon={<SendOutlined />} />
                    </>
                  )}
                  <SummaryCard label="Top Earners" value={`${data.length}`} color={C.orange} bg="#fffbeb" icon={<TrophyOutlined />} />
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, flexWrap: "wrap" }}>
                <CalendarOutlined style={{ color: C.subText, fontSize: 11 }} />
                <Text style={{ fontSize: 12, color: C.subText, flex: 1 }}>
                  {dayjs(startDate).format("MMM DD, YYYY HH:mm")} → {dayjs(endDate).format("MMM DD, YYYY HH:mm")}
                </Text>
                {hasAdmin && (
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <Switch size="small" checked={excludeAdmin} onChange={setExcludeAdmin} />
                    <Text style={{ fontSize: 12, color: C.subText }}>Exclude admin from PDF</Text>
                  </label>
                )}
              </div>

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

      <SendEmailModal open={emailModalOpen} onClose={() => setEmailModalOpen(false)} onSend={handleSendEmail} sending={sending} />
    </>
  );
}

export default TopEarnersModal;
