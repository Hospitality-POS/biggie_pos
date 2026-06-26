import React, { forwardRef, useRef, useState } from "react";
import { Button, Form, Input, Modal, Segmented, Space, Typography } from "antd";
import {
  FilePdfOutlined,
  MailOutlined,
  MobileOutlined,
  PrinterFilled,
  SendOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import { sendSalesReportEmail, refToHtmlString } from "@services/emailReports";

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

// ── Shared props ──────────────────────────────────────────────────────────────
interface ReportProps {
  data: { id: string; name: string; totalSales: number }[];
  startDate: string;
  endDate: string;
  brandName: string;
  staffPct: number;
  platformPct: number;
  summary?: { total_revenue: number; total_staff_earnings: number; platform_earnings: number } | null;
  staffEarningEnabled?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// THERMAL RECEIPT
// ══════════════════════════════════════════════════════════════════════════════
const ThermalReceipt = forwardRef<HTMLDivElement, ReportProps>(
  ({ data, startDate, endDate, brandName, staffPct, platformPct, summary, staffEarningEnabled }, ref) => {
    const grandTotal = data.reduce((s, r) => s + r.totalSales, 0);
    // Use summary values only if staff earning is enabled, otherwise use percentage calculation
    const totalStaffEarnings = staffEarningEnabled && summary?.total_staff_earnings 
      ? summary.total_staff_earnings 
      : grandTotal * staffPct / 100;
    const platformCut = staffEarningEnabled && summary?.platform_earnings 
      ? summary.platform_earnings 
      : grandTotal * platformPct / 100;

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
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, padding: "2px 0", borderBottom: "1px dotted #ddd" }}>
              <span>Total Revenue:</span><span>KSh. {fmt(summary?.total_revenue || grandTotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, padding: "2px 0", borderBottom: "1px dotted #ddd" }}>
              <span>Total Staff Earnings:</span><span>KSh. {fmt(totalStaffEarnings)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, padding: "2px 0" }}>
              <span>Platform Cut:</span><span>KSh. {fmt(platformCut)}</span>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 12, fontSize: 9, color: "#aaa" }}>
            <div>Split: {staffPct}% staff · {platformPct}% platform</div>
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
  ({ data, startDate, endDate, brandName, staffPct, platformPct, summary, staffEarningEnabled }, ref) => {
    const grandTotal = data.reduce((s, r) => s + r.totalSales, 0);
    // Use summary values only if staff earning is enabled, otherwise use percentage calculation
    const totalStaffEarnings = staffEarningEnabled && summary?.total_staff_earnings 
      ? summary.total_staff_earnings 
      : grandTotal * staffPct / 100;
    const platformCut = staffEarningEnabled && summary?.platform_earnings 
      ? summary.platform_earnings 
      : grandTotal * platformPct / 100;

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
              { label: "Grand Total Sales", value: `KES ${fmt(grandTotal)}`, color: C.primary },
              { label: `Total Staff Earnings (${staffPct}%)`, value: `KES ${fmt(totalStaffEarnings)}`, color: C.green },
              { label: `Platform Cut (${platformPct}%)`, value: `KES ${fmt(platformCut)}`, color: C.blue },
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
                  <th style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>Total Earnings</th>
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
                    <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: 700, color: C.primary }}>KES {fmt(summary?.total_revenue || grandTotal)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, fontWeight: 500, color: C.darkText }}>Total Staff Earnings</td>
                    <td style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: 700, color: C.green }}>KES {fmt(totalStaffEarnings)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "7px 12px", fontWeight: 500, color: C.darkText }}>Platform Cut</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 700, color: C.blue }}>KES {fmt(platformCut)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 32, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 10, color: C.subText }}>
              <span>Split ratio: {staffPct}% staff · {platformPct}% platform</span>
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
}: {
  data: { id: string; name: string; totalSales: number }[];
  startDate: string;
  endDate: string;
  staffPct: number;
  platformPct: number;
  open: boolean;
  onClose: () => void;
  summary?: { total_revenue: number; total_staff_earnings: number; platform_earnings: number } | null;
  staffEarningEnabled?: boolean;
}) {
  const { BRAND_NAME1 } = useSystemDetails();
  const [printMode, setPrintMode] = useState<PrintMode>("thermal");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const thermalRef = useRef<HTMLDivElement>(null);
  const a4Ref = useRef<HTMLDivElement>(null);

  const grandTotal = data.reduce((s, r) => s + r.totalSales, 0);
  // Use summary values only if staff earning is enabled, otherwise use percentage calculation
  const totalStaffEarnings = staffEarningEnabled && summary?.total_staff_earnings 
    ? summary.total_staff_earnings 
    : grandTotal * staffPct / 100;
  const platformCut = staffEarningEnabled && summary?.platform_earnings 
    ? summary.platform_earnings 
    : grandTotal * platformPct / 100;

  const printThermal = useReactToPrint({ content: () => thermalRef.current });
  const printA4 = useReactToPrint({ content: () => a4Ref.current });
  const handlePrint = () => printMode === "thermal" ? printThermal() : printA4();

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
          overallTotal: grandTotal,
          stockCost: 0,
          grossProfit: grandTotal,
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
    data, startDate, endDate, brandName: BRAND_NAME1, staffPct, platformPct, summary, staffEarningEnabled,
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
                <TrophyOutlined />
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button
              icon={<MailOutlined />}
              onClick={() => setEmailModalOpen(true)}
              style={{ borderColor: C.primary, color: C.primary }}
            >
              Send via Email
            </Button>
            <Space>
              <Button onClick={onClose}>Close</Button>
              <Button
                type="primary"
                icon={<PrinterFilled />}
                onClick={handlePrint}
                style={{ background: C.primary, borderColor: C.primary }}
              >
                Print
              </Button>
            </Space>
          </div>
        }
      >
        <div style={{ minHeight: 400, background: "#fff", padding: 20, borderRadius: 8 }}>
          {printMode === "thermal" ? <ThermalReceipt {...sharedProps} ref={thermalRef} /> : <A4Report {...sharedProps} ref={a4Ref} />}
        </div>
      </Modal>

      <SendEmailModal open={emailModalOpen} onClose={() => setEmailModalOpen(false)} onSend={handleSendEmail} sending={sending} />
    </>
  );
}

export default TopEarnersModal;
