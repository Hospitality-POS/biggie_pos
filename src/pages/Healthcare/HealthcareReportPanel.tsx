import React, { forwardRef, useRef, useState } from "react";
import { Button, DatePicker, Empty, Form, InputNumber, Modal, Select, Space, Spin, Typography, message } from "antd";
import { DownloadOutlined, FileTextOutlined, PrinterFilled, PrinterOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import Papa from "papaparse";
import dayjs, { type Dayjs } from "dayjs";
import { fetchHealthcareReportRows, fetchPayers, healthcareError, type LabDepartment } from "@services/healthcare";
import { useHealthcareSettings } from "@hooks/useHealthcareSettings";
import useSystemDetails from "@hooks/useSystemDetails";
import { THEME_C } from "@utils/getPrimaryColor";
import { CLAIM_STATUS_TAG, money } from "./shared";
import { cellText, healthcareReportFor, isRight, type ReportDef } from "./healthcareReportDefs";

const { RangePicker } = DatePicker;
const { Text } = Typography;
const C = THEME_C;

interface Filters {
  range: [Dayjs, Dayjs];
  department?: LabDepartment;
  days: number;
  payer_id?: string;
  status?: string;
}

type Generated = { def: ReportDef; params: Record<string, string | number | undefined>; label: string };

/**
 * A healthcare report tab on the Reports page: its filters and the
 * Generate button, then the report itself in a modal — the same flow as
 * the store's reports.
 */
const HealthcareReportPanel: React.FC<{ tabKey: string }> = ({ tabKey }) => {
  const settings = useHealthcareSettings();
  const def = healthcareReportFor(tabKey);
  const [filters, setFilters] = useState<Filters>({ range: [dayjs().startOf("month"), dayjs()], days: 90 });
  const [generated, setGenerated] = useState<Generated | null>(null);

  const { data: payers = [] } = useQuery({
    queryKey: ["healthcare-payers", "all"],
    queryFn: () => fetchPayers(false),
    enabled: def?.key === "claims",
  });

  if (!def) return null;

  const rangePresets = [
    { label: "Today", value: [dayjs().startOf("day"), dayjs()] as [Dayjs, Dayjs] },
    { label: "This week", value: [dayjs().startOf("week"), dayjs()] as [Dayjs, Dayjs] },
    { label: "This month", value: [dayjs().startOf("month"), dayjs()] as [Dayjs, Dayjs] },
    { label: "Last month", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] as [Dayjs, Dayjs] },
  ];

  const generate = () => {
    const params: Record<string, string | number | undefined> = def.dated
      ? { from: filters.range[0].format("YYYY-MM-DD"), to: filters.range[1].format("YYYY-MM-DD") }
      : {};
    if (def.key === "lab") params.department = filters.department;
    if (def.key === "expiry") params.days = filters.days;
    if (def.key === "claims") Object.assign(params, { payer_id: filters.payer_id, status: filters.status });
    const label = def.dated
      ? `${filters.range[0].format("DD MMM YYYY")} → ${filters.range[1].format("DD MMM YYYY")}`
      : def.key === "expiry"
        ? `Expired, and expiring within ${filters.days} days · as of ${dayjs().format("DD MMM YYYY")}`
        : `As of ${dayjs().format("DD MMM YYYY")}`;
    setGenerated({ def, params, label });
  };

  return (
    <Form layout="vertical" onFinish={generate}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
        {def.dated && (
          <div style={{ flex: "1 1 300px", minWidth: 0 }}>
            <Form.Item label="Date range" required>
              <RangePicker
                value={filters.range}
                presets={rangePresets}
                format="DD MMM YYYY"
                allowClear={false}
                disabledDate={(d) => d.isAfter(dayjs())}
                onChange={(v) => v?.[0] && v[1] && setFilters((f) => ({ ...f, range: [v[0] as Dayjs, v[1] as Dayjs] }))}
                style={{ width: "100%", borderRadius: 8 }}
              />
            </Form.Item>
          </div>
        )}
        {def.key === "lab" && settings.lab && settings.radiology && (
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <Form.Item label="Department">
              <Select
                allowClear
                placeholder="Lab and imaging"
                value={filters.department}
                onChange={(v) => setFilters((f) => ({ ...f, department: v }))}
                options={[
                  { value: "lab", label: "Lab" },
                  { value: "radiology", label: "Imaging" },
                ]}
              />
            </Form.Item>
          </div>
        )}
        {def.key === "expiry" && (
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <Form.Item label="Expiring within (days)">
              <InputNumber min={1} max={730} value={filters.days} onChange={(v) => setFilters((f) => ({ ...f, days: Number(v) || 90 }))} style={{ width: "100%" }} />
            </Form.Item>
          </div>
        )}
        {def.key === "claims" && (
          <>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <Form.Item label="Payer">
                <Select
                  allowClear
                  placeholder="All payers"
                  value={filters.payer_id}
                  onChange={(v) => setFilters((f) => ({ ...f, payer_id: v }))}
                  options={payers.map((p) => ({ value: p._id, label: p.name }))}
                />
              </Form.Item>
            </div>
            <div style={{ flex: "1 1 180px", minWidth: 0 }}>
              <Form.Item label="Status">
                <Select
                  allowClear
                  placeholder="All statuses"
                  value={filters.status}
                  onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
                  options={Object.entries(CLAIM_STATUS_TAG).map(([value, t]) => ({ value, label: t.label }))}
                />
              </Form.Item>
            </div>
          </>
        )}
        {!def.dated && def.key === "ageing" && (
          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
            What each payer owes today, by how long since the claim was submitted.
          </Text>
        )}
      </div>
      <Form.Item style={{ marginBottom: 0 }}>
        <Button
          type="primary"
          htmlType="submit"
          icon={<PrinterOutlined />}
          style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, height: 40, fontWeight: 600, fontSize: 13, width: "100%" }}
        >
          Generate {def.label} Report
        </Button>
      </Form.Item>
      <ReportModal generated={generated} onClose={() => setGenerated(null)} />
    </Form>
  );
};

// ── The generated report: A4 preview, print, CSV ────────────────────────────

const ReportModal: React.FC<{
  generated: Generated | null;
  onClose: () => void;
}> = ({ generated, onClose }) => {
  const { BRAND_NAME1 } = useSystemDetails();
  const a4Ref = useRef<HTMLDivElement>(null);
  const printA4 = useReactToPrint({ content: () => a4Ref.current });
  const def = generated?.def;

  const { data: rows = [], isFetching } = useQuery({
    queryKey: ["healthcare-report", def?.key, generated?.params],
    queryFn: () => fetchHealthcareReportRows(def?.key ?? "visits", generated?.params),
    enabled: !!generated,
    onError: (error) => message.error(healthcareError(error, "Couldn't generate the report")),
  });

  const exportCsv = () => {
    if (!def) return;
    const csv = Papa.unparse({
      fields: def.columns.map((c) => c.title),
      data: rows.map((r) => def.columns.map((c) => (c.kind === "money" || c.kind === "number" ? r[c.key] ?? "" : cellText(c, r[c.key])))),
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${def.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Modal
      open={!!generated}
      onCancel={onClose}
      destroyOnClose
      width={1080}
      style={{ top: 20 }}
      styles={{ body: { padding: "16px 20px" } }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
            <FileTextOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>
            {def?.label} Report
          </Text>
        </div>
      }
      footer={
        <Space>
          <Button onClick={onClose} style={{ borderRadius: 8 }}>
            Cancel
          </Button>
          <Button icon={<DownloadOutlined />} disabled={isFetching || !rows.length} onClick={exportCsv} style={{ borderRadius: 8 }}>
            Export CSV
          </Button>
          <Button
            type="primary"
            icon={<PrinterFilled />}
            disabled={isFetching || !rows.length}
            onClick={printA4}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 600 }}
          >
            Print A4 Report
          </Button>
        </Space>
      }
    >
      <Spin spinning={isFetching} tip="Generating report…" style={{ display: "block", width: "100%" }}>
        {!rows.length && !isFetching ? (
          <Empty description={def?.emptyText} style={{ padding: "40px 0" }} />
        ) : (
          def &&
          generated && (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: 16, maxHeight: "62vh", overflow: "auto" }}>
                <A4Report ref={a4Ref} def={def} rows={rows} period={generated.label} brandName={BRAND_NAME1} />
              </div>
            </div>
          )
        )}
      </Spin>
    </Modal>
  );
};

const A4Report = forwardRef<HTMLDivElement, { def: ReportDef; rows: Record<string, unknown>[]; period: string; brandName?: string }>(
  ({ def, rows, period, brandName }, ref) => {
    const totals = def.columns.filter((c) => c.total);
    const sum = (key: string) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    return (
      <>
        <style>{`
          @media print {
            @page { size: A4 landscape; margin: 12mm; }
            body * { visibility: hidden; }
            #hc-report-a4, #hc-report-a4 * { visibility: visible; }
            #hc-report-a4 { position: absolute; inset: 0; }
          }
        `}</style>
        <div id="hc-report-a4" ref={ref} style={{ fontFamily: "'Segoe UI', Arial, sans-serif", color: C.darkText, background: "#fff" }}>
          <div
            style={
              {
                background: C.primary,
                color: "#fff",
                padding: "20px 24px 16px",
                printColorAdjust: "exact",
                WebkitPrintColorAdjust: "exact",
              } as React.CSSProperties
            }
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                {brandName && brandName !== "undefined undefined" && <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>{brandName}</div>}
                <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, letterSpacing: "1px" }}>{def.title}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 11, opacity: 0.9 }}>
                <div>{period}</div>
                <div style={{ marginTop: 4, fontSize: 10, opacity: 0.7 }}>
                  {rows.length} rows · generated {dayjs().format("DD MMM YYYY HH:mm")}
                </div>
              </div>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {def.columns.map((c) => (
                  <th
                    key={c.key}
                    style={{
                      padding: "7px 8px",
                      textAlign: isRight(c) ? "right" : "left",
                      fontWeight: 600,
                      color: C.subText,
                      borderBottom: `1px solid ${C.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  {def.columns.map((c) => (
                    <td key={c.key} style={{ padding: "6px 8px", textAlign: isRight(c) ? "right" : "left", verticalAlign: "top" }}>
                      {cellText(c, r[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {!!totals.length && (
              <tfoot>
                <tr style={{ background: C.bg, fontWeight: 700 }}>
                  {def.columns.map((c, i) => (
                    <td key={c.key} style={{ padding: "7px 8px", textAlign: isRight(c) ? "right" : "left", borderTop: `2px solid ${C.border}` }}>
                      {c.total ? (c.kind === "money" ? money(sum(c.key)) : sum(c.key)) : i === 0 ? "Total" : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </>
    );
  }
);
A4Report.displayName = "HealthcareA4Report";

export default HealthcareReportPanel;
