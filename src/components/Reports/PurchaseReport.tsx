import React, { forwardRef, useMemo, useRef, useState } from "react";
import { Button, Empty, Form, Input, Modal, Segmented, Spin, Space, Typography } from "antd";
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  MailOutlined,
  MobileOutlined,
  PlusOutlined,
  PrinterFilled,
  SendOutlined,
  TagOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import { useAppSelector } from "../../store";
import useSystemDetails from "@hooks/useSystemDetails";
import { COOP_NAME } from "@utils/config";
import { sendPurchaseReportEmail, refToHtmlString } from "@services/emailReports";

const { Text } = Typography;

type PrintMode = "thermal" | "a4";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  primary: "#6c1c2c",
  primaryLight: "#f9f0f2",
  green: "#10b981",
  greenLight: "#f0fdf4",
  blue: "#3b82f6",
  blueLight: "#eff6ff",
  orange: "#f59e0b",
  orangeLight: "#fffbeb",
  red: "#ef4444",
  redLight: "#fef2f2",
  subText: "#64748b",
  darkText: "#0f172a",
  border: "#e2e8f0",
  bg: "#f8fafc",
  white: "#ffffff",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Summary card (screen only) ────────────────────────────────────────────────
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
  startDate: string;
  endDate: string;
  brandName: string;
  tableData: { index: number; name: string; amount: number }[];
  totalCost: number;
  totalDiscount: number;
  totalInclusiveDiscount: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// THERMAL RECEIPT
// ══════════════════════════════════════════════════════════════════════════════
const ThermalReceipt = forwardRef<HTMLDivElement, ReportProps>(({
  startDate, endDate, brandName, tableData,
  totalCost, totalDiscount, totalInclusiveDiscount,
}, ref) => {
  const divider = (style?: React.CSSProperties) => (
    <div style={{ borderTop: "1px dashed #bbb", margin: "6px 0", ...style }} />
  );

  return (
    <>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          body * { visibility: hidden; }
          #purchase-thermal, #purchase-thermal * { visibility: visible; }
          #purchase-thermal { position: absolute; inset: 0; }
        }
      `}</style>
      <div id="purchase-thermal" ref={ref}
        style={{ fontFamily: "'Courier New', Courier, monospace", color: "#111", padding: "6px 2px", maxWidth: 300, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          {brandName && brandName !== "undefined undefined" && (
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.5px", marginBottom: 1 }}>{brandName}</div>
          )}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", marginBottom: 4 }}>PURCHASE REPORT</div>
          {divider()}
          <div style={{ fontSize: 9.5, color: "#444", lineHeight: 1.7 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>From:</span><span>{dayjs(startDate).format("MMM DD, YYYY HH:mm")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>To:</span><span>{dayjs(endDate).format("MMM DD, YYYY HH:mm")}</span>
            </div>
          </div>
          {divider()}
        </div>

        {/* Column headers */}
        <div style={{ display: "flex", fontSize: 8.5, fontWeight: 700, borderBottom: "2px solid #111", paddingBottom: 3, marginBottom: 4, letterSpacing: "0.3px" }}>
          <span style={{ width: 22, flexShrink: 0 }}>#</span>
          <span style={{ flex: 1 }}>PAYMENT METHOD</span>
          <span style={{ whiteSpace: "nowrap" }}>AMOUNT (KSh)</span>
        </div>

        {/* Rows */}
        <div style={{ marginBottom: 6 }}>
          {tableData.map((row) => (
            <div key={row.index} style={{ display: "flex", fontSize: 10, padding: "3px 0", borderBottom: "1px dotted #ccc", lineHeight: 1.4 }}>
              <span style={{ width: 22, flexShrink: 0, color: "#888" }}>{row.index}</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{row.name}</span>
              <span style={{ whiteSpace: "nowrap" }}>{fmt(row.amount)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        {divider({ borderStyle: "solid", borderColor: "#555" })}
        {[
          { label: "Overall Total", value: totalCost, bold: true },
          { label: "Overall Discount", value: totalDiscount, bold: false },
          { label: "Inclusive Discount", value: totalInclusiveDiscount, bold: false },
        ].map(({ label, value, bold }) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between",
            fontSize: bold ? 10.5 : 9.5,
            fontWeight: bold ? 700 : 400,
            padding: "2px 0",
            borderBottom: bold ? "1px solid #888" : "none",
          }}>
            <span>{label}:</span>
            <span>KSh. {fmt(value)}</span>
          </div>
        ))}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 8.5, color: "#999" }}>
          {divider({ margin: "8px 0 5px" })}
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
  startDate, endDate, brandName, tableData,
  totalCost, totalDiscount, totalInclusiveDiscount,
}, ref) => {
  const thStyle: React.CSSProperties = {
    padding: "9px 14px",
    textAlign: "left",
    fontWeight: 700,
    fontSize: 10,
    color: C.white,
    background: C.primary,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    printColorAdjust: "exact",
    WebkitPrintColorAdjust: "exact",
  } as React.CSSProperties;

  const tdBase: React.CSSProperties = {
    padding: "8px 14px",
    fontSize: 12,
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: "middle",
  };

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 16mm; }
          body * { visibility: hidden; }
          #purchase-a4, #purchase-a4 * { visibility: visible; }
          #purchase-a4 { position: absolute; inset: 0; }
        }
      `}</style>
      <div id="purchase-a4" ref={ref}
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
                Purchase Report
              </div>
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
            { label: "Total Sales", value: `KES ${fmt(totalCost)}`, color: C.primary, bg: C.primaryLight },
            { label: "Total Discount", value: `KES ${fmt(totalDiscount)}`, color: C.orange, bg: C.orangeLight },
            { label: "Inclusive Discount", value: `KES ${fmt(totalInclusiveDiscount)}`, color: C.red, bg: C.redLight },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{
              flex: 1,
              background: bg,
              border: `1px solid ${color}20`,
              borderLeft: `3px solid ${color}`,
              borderRadius: 6,
              padding: "10px 14px",
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.subText, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>

          {/* Payment methods table */}
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "8%" }} />
              <col style={{ width: "60%" }} />
              <col style={{ width: "32%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "center" }}>No.</th>
                <th style={{ ...thStyle }}>Payment Method</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Amount (KES)</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={row.index} style={{ background: i % 2 === 0 ? C.white : C.bg }}>
                  <td style={{ ...tdBase, textAlign: "center", color: C.subText, fontWeight: 500 }}>{row.index}</td>
                  <td style={{ ...tdBase, fontWeight: 600, color: C.darkText }}>{row.name}</td>
                  <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: C.darkText }}>{fmt(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals summary */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <table style={{ width: 320, borderCollapse: "collapse" }}>
              <tbody>
                {[
                  { label: "Overall Total", value: totalCost, accent: true },
                  { label: "Overall Discount", value: totalDiscount, accent: false },
                  { label: "Overall Inclusive Discount", value: totalInclusiveDiscount, accent: false },
                ].map(({ label, value, accent }) => (
                  <tr key={label} style={{ background: accent ? C.primaryLight : C.white }}>
                    <td style={{
                      padding: "7px 12px", fontSize: 11,
                      borderBottom: `1px solid ${C.border}`,
                      borderLeft: accent ? `3px solid ${C.primary}` : `3px solid transparent`,
                      fontWeight: accent ? 700 : 500,
                      color: accent ? C.primary : C.darkText,
                    }}>{label}</td>
                    <td style={{
                      padding: "7px 12px", fontSize: 11,
                      borderBottom: `1px solid ${C.border}`,
                      textAlign: "right",
                      fontWeight: accent ? 800 : 500,
                      color: accent ? C.primary : C.darkText,
                    }}>KES {fmt(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 28, paddingTop: 12,
            borderTop: `1px solid ${C.border}`,
            display: "flex", justifyContent: "space-between",
            fontSize: 10, color: C.subText,
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
          <Input.TextArea rows={3} placeholder="Please find the purchase report for the selected period." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ══════════════════════════════════════════════════════════════════════════════
interface PurchaseReportProps {
  openM: boolean;
  onCloseM: () => void;
  startDate: string;
  endDate: string;
}

const PurchaseReportModal: React.FC<PurchaseReportProps> = ({ openM, onCloseM, startDate, endDate }) => {
  const { BRAND_NAME1 } = useSystemDetails();
  const [printMode, setPrintMode] = useState<PrintMode>("thermal");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const thermalRef = useRef<HTMLDivElement>(null);
  const a4Ref = useRef<HTMLDivElement>(null);

  const { purchaseReport: data, loading } = useAppSelector((state) => state.Report);

  const tableData = useMemo(() => {
    const raw: { name: string; amount: number }[] = (data?.payment_methods || []).map((item: any) => ({
      name: (item.name || "N/A").trim(),
      amount: Number(item.amount || 0),
    }));

    // Normalise: lowercase + strip hyphens/spaces/dots
    // "M-Pesa" / "Mpesa" / "mpesa" → "mpesa", "Cash" / "cash" → "cash"
    const normalise = (s: string) => s.toLowerCase().replace(/[-\s.]/g, "");
    const map = new Map<string, { name: string; amount: number }>();
    for (const row of raw) {
      const key = normalise(row.name);
      if (map.has(key)) {
        map.get(key)!.amount += row.amount;
      } else {
        map.set(key, { name: row.name, amount: row.amount });
      }
    }

    return Array.from(map.values())
      .filter((r) => r.amount > 0)          // hide zero-balance methods
      .map((r, i) => ({ index: i + 1, ...r }));
  }, [data]);

  const totalCost = Number(data?.totalCost || 0);
  const totalDiscount = Number(data?.totalDiscountAmount || 0);
  const totalInclusiveDiscount = Number(data?.totalInclusiveDiscount || 0);
  const hasData = tableData.length > 0;

  const sharedProps: ReportProps = {
    startDate, endDate, brandName: BRAND_NAME1,
    tableData, totalCost, totalDiscount, totalInclusiveDiscount,
  };

  const printThermal = useReactToPrint({ content: () => thermalRef.current });
  const printA4 = useReactToPrint({ content: () => a4Ref.current });
  const handlePrint = () => printMode === "thermal" ? printThermal() : printA4();

  const handleSendEmail = async (values: SendEmailValues) => {
    setSending(true);
    try {
      const activeRef = printMode === "a4" ? a4Ref : thermalRef;
      const htmlTable = refToHtmlString(activeRef);

      const ok = await sendPurchaseReportEmail({
        to: values.to,
        recipientName: values.recipientName,
        intro: values.intro,
        cc: values.cc,
        totals: {
          overallTotal: totalCost,
          totalDiscount,
          totalInclusiveDiscount,
        },
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
        open={openM}
        onCancel={onCloseM}
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
              <Text strong style={{ fontSize: 14, color: C.darkText }}>Purchase Report</Text>
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
              <Button onClick={onCloseM} style={{ borderRadius: 8 }}>Cancel</Button>
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
        <Spin spinning={loading} tip="Generating purchase report…" style={{ display: "block", width: "100%" }}>
          {!hasData && !loading ? (
            <Empty description="No purchase data found for the selected period" style={{ padding: "40px 0" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Summary cards */}
              {hasData && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <SummaryCard label="Total Sales" value={`KES ${fmt(totalCost)}`} color={C.primary} bg={C.primaryLight} icon={<BarChartOutlined />} />
                  <SummaryCard label="Discount" value={`KES ${fmt(totalDiscount)}`} color={C.orange} bg={C.orangeLight} icon={<TagOutlined />} />
                  <SummaryCard label="Inclusive Discount" value={`KES ${fmt(totalInclusiveDiscount)}`} color={C.red} bg={C.redLight} icon={<CheckCircleOutlined />} />
                  <SummaryCard label="Payment Methods" value={`${tableData.length}`} color={C.blue} bg={C.blueLight} icon={<CreditCardOutlined />} />
                </div>
              )}

              {/* Date strip */}
              {startDate && endDate && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 14px",
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                }}>
                  <CalendarOutlined style={{ color: C.subText, fontSize: 12 }} />
                  <Text style={{ fontSize: 12, color: C.subText }}>
                    {dayjs(startDate).format("MMM DD, YYYY HH:mm")} → {dayjs(endDate).format("MMM DD, YYYY HH:mm")}
                  </Text>
                </div>
              )}

              {/* Preview container */}
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.white, overflow: "hidden" }}>
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

export default PurchaseReportModal;