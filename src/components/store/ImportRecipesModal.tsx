import { useState } from "react";
import { Button, Dropdown, message, Modal, Space, Upload, Alert, Spin, Tag, Typography } from "antd";
import {
  FileExcelOutlined, InboxOutlined, ReloadOutlined,
  ArrowRightOutlined, ArrowDownOutlined, CheckCircleOutlined,
  WarningOutlined, CloseCircleOutlined, CheckCircleFilled,
  InfoCircleOutlined, CarryOutOutlined, DownOutlined,
} from "@ant-design/icons";
import {
  downloadRecipeTemplate,
  analyseRecipeFile,
  importRecipesFromExcel,
  RECIPE_TEMPLATE_SAMPLES,
  AnalyseRecipeResult,
  ImportRecipeResult,
} from "@services/recipe";

const { Dragger } = Upload;
const { Text } = Typography;

const ADVICE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  success: { icon: <CheckCircleOutlined />, color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  warning: { icon: <WarningOutlined />, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  error: { icon: <CloseCircleOutlined />, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  info: { icon: <InfoCircleOutlined />, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
};

const FIELD_LABELS: Record<string, string> = {
  service: "Service Name", inventory: "Inventory Item", variant: "Variant",
  quantity: "Quantity", unit: "Unit", format: "Format", ratio: "Ratio",
};

const ColumnMappingTable: React.FC<{ mapping: Record<string, string>; missingRequired: string[] }> = ({ mapping, missingRequired }) => {
  const rows = Object.keys(FIELD_LABELS).map(field => ({
    field,
    label: FIELD_LABELS[field],
    yourColumn: mapping[field] || null,
    required: missingRequired.includes(field) ? "required" : field === "service" || field === "inventory" || field === "quantity" ? "ok" : "optional",
    mapped: !!mapping[field],
  }));

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 60px", background: "#f8fafc", padding: "7px 12px", borderBottom: "1px solid #e2e8f0" }}>
        {["Our Field", "Your Column", ""].map((h, i) => (
          <Text key={i} style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{h}</Text>
        ))}
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto" }}>
        {rows.map((row, i) => (
          <div key={row.field} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 60px", padding: "6px 12px", borderBottom: i < rows.length - 1 ? "1px solid #f1f5f9" : "none", background: !row.mapped && row.required === "required" ? "#fef2f2" : "#fff" }}>
            <div>
              <Text style={{ fontSize: 12, color: "#374151" }}>{row.label}</Text>
              {(row.field === "service" || row.field === "inventory" || row.field === "quantity") && <Text style={{ fontSize: 10, color: "#dc2626", marginLeft: 4 }}>*</Text>}
            </div>
            <div>
              {row.yourColumn
                ? <Tag style={{ fontSize: 11, background: "#eef2ff", color: "#4338ca", border: "none", borderRadius: 4 }}>{row.yourColumn}</Tag>
                : <Text style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" as const }}>not found</Text>}
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              {row.mapped
                ? <CheckCircleFilled style={{ color: "#10b981", fontSize: 14 }} />
                : row.required === "required"
                  ? <CloseCircleOutlined style={{ color: "#ef4444", fontSize: 14 }} />
                  : <Text style={{ fontSize: 11, color: "#cbd5e1" }}>—</Text>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PreviewTable: React.FC<{ rows: AnalyseRecipeResult["previewRows"] }> = ({ rows }) => {
  if (!rows.length) return null;
  const cell: React.CSSProperties = { padding: "6px 10px", color: "#374151", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Row", "Service", "Inventory Item", "Variant", "Qty", "Unit", "Format", "Status"].map(h => (
                <th key={h} style={{ padding: "7px 10px", textAlign: "left" as const, fontWeight: 600, color: "#64748b", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.5, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: row.ok ? (i % 2 === 0 ? "#fff" : "#fafafa") : "#fef2f2" }}>
                <td style={{ ...cell, color: "#94a3b8" }}>{row.rowNum}</td>
                <td style={{ ...cell, fontWeight: 500, color: "#0f172a" }}>{row.service || <Text type="secondary">—</Text>}</td>
                <td style={cell}>{row.inventory || "—"}</td>
                <td style={cell}>{row.variant || "—"}</td>
                <td style={cell}>{row.quantity || "—"}</td>
                <td style={cell}>{row.unit || "—"}</td>
                <td style={cell}>
                  <Tag color={row.format === "ratio" ? "green" : "blue"} style={{ fontSize: 10 }}>{row.format || "direct"}</Tag>
                </td>
                <td style={{ ...cell, maxWidth: 200, whiteSpace: "normal" }}>
                  {row.ok
                    ? <CheckCircleFilled style={{ color: "#10b981" }} />
                    : <Text style={{ fontSize: 11, color: "#dc2626" }}>{row.issue}</Text>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: "5px 12px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
        <Text style={{ fontSize: 11, color: "#94a3b8" }}>Showing first {rows.length} rows of your data</Text>
      </div>
    </div>
  );
};

interface ImportRecipesModalProps {
  onSuccess: () => void;
}

const ImportRecipesModal: React.FC<ImportRecipesModalProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "analysing" | "advice" | "importing" | "result">("upload");
  const [analysis, setAnalysis] = useState<AnalyseRecipeResult | null>(null);
  const [importResult, setImportResult] = useState<ImportRecipeResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const shopId = localStorage.getItem("shopId") || "";

  const handleOpen = () => { setOpen(true); reset(); };
  const handleClose = () => { if (step !== "analysing" && step !== "importing") { setOpen(false); reset(); } };
  const reset = () => { setFile(null); setStep("upload"); setAnalysis(null); setImportResult(null); };

  const handleDownloadTemplate = async (sample?: string) => {
    setDownloading(true);
    try { await downloadRecipeTemplate(sample); } finally { setDownloading(false); }
  };

  const handleAnalyse = async (selectedFile: File) => {
    setStep("analysing");
    try {
      const result = await analyseRecipeFile(selectedFile);
      setAnalysis(result);
      setStep("advice");
    } catch (err: unknown) {
      const error = err as { message?: string };
      message.error(error?.message || "Failed to analyse file");
      setStep("upload");
    }
  };

  const handleImport = async () => {
    if (!file || !shopId) return;
    setStep("importing");
    try {
      const result = await importRecipesFromExcel(file, shopId);
      setImportResult(result);
      setStep("result");
      if (result.summary.services > 0) onSuccess();
    } catch (err: unknown) {
      const error = err as { message?: string };
      message.error(error?.message || "Import failed");
      setStep("advice");
    }
  };

  const renderUpload = () => (
    <div>
      <div style={{ background: "#eef2ff", borderRadius: 10, padding: "13px 16px", marginBottom: 16, border: "1px solid #c7d2fe", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <Text strong style={{ fontSize: 13, color: "#3730a3", display: "block" }}>Have our template?</Text>
          <Text style={{ fontSize: 12, color: "#6b7280" }}>Your services &amp; items prefilled, or pick an industry sample</Text>
        </div>
        <Dropdown
          menu={{
            items: [
              { key: "data", label: "My data (current formulas)" },
              { type: "divider" },
              ...RECIPE_TEMPLATE_SAMPLES.map((s) => ({ key: s.key, label: `${s.label} sample` })),
            ],
            onClick: ({ key }) => handleDownloadTemplate(key === "data" ? undefined : key),
          }}
        >
          <Button icon={<ArrowDownOutlined />} loading={downloading} size="small"
            style={{ borderRadius: 6, background: "#4f46e5", border: "none", color: "#fff", fontWeight: 500, flexShrink: 0 }}>
            Template <DownOutlined style={{ fontSize: 10 }} />
          </Button>
        </Dropdown>
      </div>
      <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 6 }}>Upload an Excel file with your formulas</Text>
      <Text style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 12 }}>
        Each row is one formula line — a service can have many rows (multiple inventory items), and the same
        inventory item can be used by many services. Existing formulas for the listed services are replaced.
      </Text>
      <Dragger
        accept=".xlsx,.xls" maxCount={1} showUploadList={false}
        beforeUpload={(f) => { setFile(f); handleAnalyse(f); return false; }}
        style={{ borderRadius: 10, borderColor: "#d1d5db", background: "#fafafa" }}
      >
        <div style={{ padding: "20px 0" }}>
          <InboxOutlined style={{ fontSize: 36, color: "#9ca3af", marginBottom: 8 }} />
          <div>
            <Text style={{ fontSize: 14, color: "#374151", display: "block" }}>Drop your Excel file here</Text>
            <Text style={{ fontSize: 12, color: "#9ca3af" }}>or click to browse · .xlsx / .xls</Text>
          </div>
        </div>
      </Dragger>
      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={handleClose} style={{ borderRadius: 8 }}>Cancel</Button>
      </div>
    </div>
  );

  const renderAnalysing = () => (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <Spin size="large" />
      <Text style={{ display: "block", marginTop: 16, color: "#64748b", fontSize: 14 }}>Reading your file and matching services &amp; inventory items…</Text>
      {file && <Text style={{ display: "block", marginTop: 6, color: "#94a3b8", fontSize: 12 }}>{file.name}</Text>}
    </div>
  );

  const renderAdvice = () => {
    if (!analysis) return null;
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Sheet", value: analysis.sheetUsed, color: "#6366f1", bg: "#eef2ff" },
            { label: "Data rows", value: analysis.totalDataRows, color: "#0ea5e9", bg: "#f0f9ff" },
            { label: "Valid rows", value: analysis.validRows, color: "#10b981", bg: "#f0fdf4" },
            { label: "Services ready", value: analysis.servicesReady, color: "#f97316", bg: "#fff7ed" },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 8, padding: "8px 6px", textAlign: "center" as const }}>
              <Text style={{ fontSize: 14, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</Text>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 14 }}>
          {analysis.advice.map((item, i) => {
            const cfg = ADVICE_CONFIG[item.level];
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, padding: "10px 12px" }}>
                <span style={{ color: cfg.color, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
                <Text style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{item.message}</Text>
              </div>
            );
          })}
        </div>

        <div style={{ marginBottom: 14 }}>
          <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 8 }}>
            Column mapping
            <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginLeft: 8 }}>* required</Text>
          </Text>
          <ColumnMappingTable mapping={analysis.columnMapping} missingRequired={analysis.missingRequired} />
        </div>

        {analysis.previewRows.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 8 }}>Data preview &amp; validation</Text>
            <PreviewTable rows={analysis.previewRows} />
          </div>
        )}

        {analysis.unmappedColumns.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Ignored columns (not recognised):</Text>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
              {analysis.unmappedColumns.map(col => (
                <Tag key={col} style={{ fontSize: 11, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", borderRadius: 4 }}>{col}</Tag>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
          <Button onClick={reset} icon={<ReloadOutlined />} style={{ borderRadius: 8, height: 38 }}>Try Different File</Button>
          <Button
            type="primary" icon={<ArrowRightOutlined />} onClick={handleImport}
            disabled={!analysis.canImport}
            style={{ flex: 1, borderRadius: 8, height: 38, background: analysis.canImport ? "#4f46e5" : undefined, border: "none", fontWeight: 600 }}
          >
            {analysis.canImport
              ? `Import ${analysis.validRows} Line${analysis.validRows !== 1 ? "s" : ""} for ${analysis.servicesReady} Service${analysis.servicesReady !== 1 ? "s" : ""}`
              : "Cannot Import — Fix Errors First"}
          </Button>
        </div>
      </div>
    );
  };

  const renderImporting = () => (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <Spin size="large" />
      <Text style={{ display: "block", marginTop: 16, color: "#64748b", fontSize: 14 }}>Saving formulas…</Text>
      <Text style={{ display: "block", marginTop: 6, color: "#94a3b8", fontSize: 12 }}>Each service's formula is replaced with the rows from your file</Text>
    </div>
  );

  const renderResult = () => {
    if (!importResult) return null;
    const { summary, errors, warnings } = importResult;
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Total Rows", value: summary.total, color: "#6366f1", bg: "#eef2ff" },
            { label: "Services Updated", value: summary.services, color: "#059669", bg: "#f0fdf4" },
            { label: "Lines Saved", value: summary.items, color: "#3b82f6", bg: "#eff6ff" },
            { label: "Skipped", value: summary.skipped, color: summary.skipped ? "#f59e0b" : "#10b981", bg: summary.skipped ? "#fffbeb" : "#f0fdf4" },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "10px 8px", textAlign: "center" as const }}>
              <Text style={{ fontSize: 22, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: "#6b7280" }}>{s.label}</Text>
            </div>
          ))}
        </div>

        {summary.replaced > 0 && (
          <div style={{ background: "#f0f9ff", borderRadius: 8, padding: "8px 12px", marginBottom: 12, border: "1px solid #bae6fd" }}>
            <Text style={{ fontSize: 12, color: "#0369a1" }}>
              <InfoCircleOutlined style={{ marginRight: 6 }} />
              {summary.replaced} service(s) had their existing formula replaced
            </Text>
          </div>
        )}

        {(warnings || []).length > 0 && (
          <Alert type="warning" showIcon
            message={`${warnings.length} warning(s)`}
            description={
              <div>
                {warnings.map((w, i) => <div key={i} style={{ fontSize: 11 }}>{w}</div>)}
              </div>
            }
            style={{ borderRadius: 8, marginBottom: 12 }}
          />
        )}

        {errors.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 12, color: "#374151", display: "block", marginBottom: 6 }}>
              <CloseCircleOutlined style={{ color: "#ef4444", marginRight: 4 }} />{errors.length} row(s) had errors
            </Text>
            <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2" }}>
              {errors.map((e, i) => (
                <div key={i} style={{ padding: "8px 12px", borderBottom: i < errors.length - 1 ? "1px solid #fecaca" : "none" }}>
                  <Text style={{ fontSize: 12, color: "#dc2626", display: "block" }}>Row {e.row} — <strong>{e.name}</strong></Text>
                  <Text style={{ fontSize: 11, color: "#6b7280" }}>{e.reason}</Text>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.services === 0 && summary.errors > 0 && (
          <Alert type="warning" message="No formulas were imported" description="All rows had validation errors. Fix the issues above and re-upload." style={{ borderRadius: 8, marginBottom: 16 }} />
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={reset} style={{ flex: 1, borderRadius: 8, height: 38 }}>Import Another</Button>
          <Button type="primary" onClick={handleClose} style={{ flex: 1, borderRadius: 8, height: 38, background: "#4f46e5", border: "none" }}>Done</Button>
        </div>
      </div>
    );
  };

  const STEP_TITLES: Record<string, string> = {
    upload: "Import Formulas from Excel",
    analysing: "Analysing Your File…",
    advice: "File Analysis & Preview",
    importing: "Importing…",
    result: "Import Complete",
  };

  return (
    <>
      <Button icon={<CarryOutOutlined />} onClick={handleOpen}
        style={{ borderRadius: 7, fontWeight: 500, background: "#eef2ff", border: "1px solid #c7d2fe", color: "#4f46e5" }}>
        Import Formulas
      </Button>
      <Modal
        open={open} onCancel={handleClose} footer={null}
        width={step === "advice" ? 720 : 520}
        centered destroyOnClose
        closable={step !== "analysing" && step !== "importing"}
        title={<Space><FileExcelOutlined style={{ color: "#4f46e5", fontSize: 18 }} /><Text strong style={{ fontSize: 15 }}>{STEP_TITLES[step]}</Text></Space>}
        styles={{ body: { padding: "16px 24px 24px", maxHeight: "80vh", overflowY: "auto" } }}
      >
        {step === "upload" && renderUpload()}
        {step === "analysing" && renderAnalysing()}
        {step === "advice" && renderAdvice()}
        {step === "importing" && renderImporting()}
        {step === "result" && renderResult()}
      </Modal>
    </>
  );
};

export default ImportRecipesModal;
