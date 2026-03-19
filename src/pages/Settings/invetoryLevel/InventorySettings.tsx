import { useRef, useState, useEffect, useCallback } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
  Button, message, Popconfirm, Space, Tag, Image, Tooltip,
  Dropdown, Typography, Card, Skeleton, Empty, Modal, Upload, Alert, Checkbox, Spin,
} from "antd";
import {
  deleteInventory, fetchAllInventory, downloadInventoryTemplate,
  importInventoryFromExcel, deleteMultipleInventory, deleteAllInventory,
  analyseInventoryFile,
} from "@services/inventory";
import AddEditProInventoryModal from "@components/MODALS/pro/AddEditProInventoryModal";
import {
  DeleteOutlined, ShoppingCartOutlined, ToolOutlined, SwapOutlined,
  WarningOutlined, CheckCircleOutlined, StopOutlined, EyeOutlined,
  DownloadOutlined, FileExcelOutlined, FilePdfOutlined, AppstoreOutlined,
  ReloadOutlined, UploadOutlined, InboxOutlined, CloseCircleOutlined,
  CheckCircleFilled, ArrowDownOutlined, ExclamationCircleOutlined,
  InfoCircleOutlined, ArrowRightOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import React from "react";

const { Text, Title } = Typography;
const { Dragger } = Upload;
const { confirm } = Modal;

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

const fmtK = (v: number) => {
  if (!v && v !== 0) return "0";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("en-KE", { minimumFractionDigits: 0 });
};

const USAGE_CONFIG: Record<string, { icon: React.ReactNode; color: string; text: string; bg: string }> = {
  selling: { icon: <ShoppingCartOutlined />, color: "#10b981", text: "For Sale", bg: "#f0fdf4" },
  internal: { icon: <ToolOutlined />, color: "#f97316", text: "Internal", bg: "#fff7ed" },
  both: { icon: <SwapOutlined />, color: "#3b82f6", text: "Both", bg: "#eff6ff" },
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; text: string; bg: string }> = {
  active: { icon: <CheckCircleOutlined />, color: "#10b981", text: "Active", bg: "#f0fdf4" },
  inactive: { icon: <StopOutlined />, color: "#64748b", text: "Inactive", bg: "#f1f5f9" },
  discontinued: { icon: <WarningOutlined />, color: "#f59e0b", text: "Discontinued", bg: "#fffbeb" },
};

const renderUsageType = (u: string) => {
  const cfg = USAGE_CONFIG[u];
  if (!cfg) return <Text type="secondary">—</Text>;
  return <Tag icon={cfg.icon} style={{ background: cfg.bg, color: cfg.color, border: "none", borderRadius: 6, fontSize: 11, fontWeight: 500, padding: "2px 8px" }}>{cfg.text}</Tag>;
};

const renderStatus = (s: string) => {
  const cfg = STATUS_CONFIG[s];
  if (!cfg) return <Text type="secondary">—</Text>;
  return <Tag icon={cfg.icon} style={{ background: cfg.bg, color: cfg.color, border: "none", borderRadius: 6, fontSize: 11, fontWeight: 500, padding: "2px 8px" }}>{cfg.text}</Tag>;
};

const renderStockLevel = (record: any) => {
  const { quantity, min_viable_quantity } = record;
  if (!min_viable_quantity) return <Text strong style={{ color: "#3b82f6" }}>{quantity?.toLocaleString()}</Text>;
  const isLow = quantity <= min_viable_quantity;
  const isCritical = quantity <= min_viable_quantity * 0.5;
  return (
    <Space size={4}>
      <Text strong style={{ color: isCritical ? "#ef4444" : isLow ? "#f59e0b" : "#10b981" }}>{quantity?.toLocaleString()}</Text>
      {isLow && <Tooltip title={`Low stock! Min: ${min_viable_quantity}`}><WarningOutlined style={{ color: isCritical ? "#ef4444" : "#f59e0b", fontSize: 12 }} /></Tooltip>}
    </Space>
  );
};

const renderPrice = (record: any) => {
  const { price, supplier_price, usage_type } = record;
  if (usage_type === "internal") return <Text type="secondary" style={{ fontSize: 12 }}>N/A</Text>;
  if (!price) return <Text style={{ color: "#ef4444", fontSize: 12 }}>No price</Text>;
  const margin = supplier_price && price ? (((price - supplier_price) / price) * 100).toFixed(1) : null;
  return (
    <Space direction="vertical" size={2}>
      <Text strong style={{ color: "#0f172a" }}>Ksh {fmtK(price)}</Text>
      {supplier_price && <Text style={{ fontSize: 11, color: "#94a3b8" }}>Cost: Ksh {fmtK(supplier_price)}</Text>}
      {margin && <Tag style={{ fontSize: 10, padding: "0 5px", border: "none", borderRadius: 4, background: parseFloat(margin) > 20 ? "#f0fdf4" : parseFloat(margin) > 10 ? "#fffbeb" : "#fef2f2", color: parseFloat(margin) > 20 ? "#10b981" : parseFloat(margin) > 10 ? "#f59e0b" : "#ef4444" }}>{margin}% margin</Tag>}
    </Space>
  );
};

const ProductThumbnail = ({ src }: { src?: string }) => {
  if (src) return <Image width={44} height={44} src={src} style={{ objectFit: "cover", borderRadius: 8 }} placeholder={<div style={{ width: 44, height: 44, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}><EyeOutlined style={{ color: "#94a3b8" }} /></div>} />;
  return <div style={{ width: 44, height: 44, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}><AppstoreOutlined style={{ color: "#94a3b8", fontSize: 16 }} /></div>;
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface AutoCreated { units?: string[]; main_categories?: string[]; categories?: string[]; subcategories?: string[]; suppliers?: string[]; }
interface ImportResult {
  message: string;
  summary: {
    total: number; created: number; skipped: number; errors: number;
    auto_created?: AutoCreated;
    format_detected?: { sheet: string; header_row: number; mapped_columns: number };
  };
  errors: Array<{ row: number | string; name: string; reason: string }>;
}
interface AdviceItem { level: "success" | "warning" | "error" | "info"; message: string; }
interface AnalysisResult {
  canImport: boolean;
  sheetUsed: string;
  headerRowDetectedAt: number;
  totalDataRows: number;
  mappedColumns: string[];
  unmappedColumns: string[];
  missingRequired: string[];
  missingRecommended: string[];
  columnMapping: Record<string, string>;
  advice: AdviceItem[];
  previewRows: Array<{ rowNum: number; name: string; quantity: string; unit: string; usage_type: string; price: string; category: string; supplier: string; barcode: string; }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVICE CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const ADVICE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  success: { icon: <CheckCircleOutlined />, color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  warning: { icon: <WarningOutlined />, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  error: { icon: <CloseCircleOutlined />, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  info: { icon: <InfoCircleOutlined />, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
};

const FIELD_LABELS: Record<string, string> = {
  name: "Product Name", quantity: "Quantity", unit_name: "Unit of Measure",
  price: "Selling Price", supplier_price: "Supplier Cost",
  category_name: "Category", subcategory_name: "Subcategory", main_category_name: "Main Category",
  supplier_name: "Supplier", barcode: "Barcode", status: "Status", vat_type: "VAT Type",
  min_viable_quantity: "Min Stock Level", location: "Storage Location",
  manufacturer: "Manufacturer", desc: "Description", weight_value: "Weight Value", weight_unit: "Weight Unit",
};
const REQUIRED_FIELDS = ["name", "quantity", "unit_name"];
const RECOMMENDED_FIELDS = ["price", "category_name", "supplier_name"];

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN MAPPING TABLE
// ─────────────────────────────────────────────────────────────────────────────
const ColumnMappingTable: React.FC<{ mapping: Record<string, string>; missingRequired: string[]; missingRecommended: string[] }> = ({ mapping, missingRequired, missingRecommended }) => {
  const rows = Object.keys(FIELD_LABELS).map(field => ({
    field,
    label: FIELD_LABELS[field],
    yourColumn: mapping[field] || null,
    required: missingRequired.includes(field) ? "required" : missingRecommended.includes(field) ? "recommended" : "optional",
    mapped: !!mapping[field],
  }));

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 60px", background: "#f8fafc", padding: "7px 12px", borderBottom: "1px solid #e2e8f0" }}>
        {["Our Field", "Your Column", ""].map((h, i) => (
          <Text key={i} style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{h}</Text>
        ))}
      </div>
      <div style={{ maxHeight: 260, overflowY: "auto" }}>
        {rows.map((row, i) => (
          <div key={row.field} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 60px", padding: "6px 12px", borderBottom: i < rows.length - 1 ? "1px solid #f1f5f9" : "none", background: !row.mapped && row.required === "required" ? "#fef2f2" : !row.mapped && row.required === "recommended" ? "#fffbeb" : "#fff" }}>
            <div>
              <Text style={{ fontSize: 12, color: "#374151" }}>{row.label}</Text>
              {row.required === "required" && <Text style={{ fontSize: 10, color: "#dc2626", marginLeft: 4 }}>*</Text>}
              {row.required === "recommended" && <Text style={{ fontSize: 10, color: "#d97706", marginLeft: 4 }}>†</Text>}
            </div>
            <div>
              {row.yourColumn
                ? <Tag style={{ fontSize: 11, background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 4 }}>{row.yourColumn}</Tag>
                : <Text style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" as const }}>not found</Text>}
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              {row.mapped
                ? <CheckCircleFilled style={{ color: "#10b981", fontSize: 14 }} />
                : row.required === "required"
                  ? <CloseCircleOutlined style={{ color: "#ef4444", fontSize: 14 }} />
                  : row.required === "recommended"
                    ? <WarningOutlined style={{ color: "#f59e0b", fontSize: 14 }} />
                    : <Text style={{ fontSize: 11, color: "#cbd5e1" }}>—</Text>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA PREVIEW TABLE
// ─────────────────────────────────────────────────────────────────────────────
const PreviewTable: React.FC<{ rows: AnalysisResult["previewRows"] }> = ({ rows }) => {
  if (!rows.length) return null;
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Row", "Name", "Qty", "Unit", "Type", "Price", "Category", "Supplier"].map(h => (
                <th key={h} style={{ padding: "7px 10px", textAlign: "left" as const, fontWeight: 600, color: "#64748b", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.5, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "6px 10px", color: "#94a3b8" }}>{row.rowNum}</td>
                <td style={{ padding: "6px 10px", fontWeight: 500, color: "#0f172a", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{row.name || <Text type="secondary">—</Text>}</td>
                <td style={{ padding: "6px 10px", color: "#374151" }}>{row.quantity || "—"}</td>
                <td style={{ padding: "6px 10px", color: "#374151" }}>{row.unit || "—"}</td>
                <td style={{ padding: "6px 10px" }}>
                  {row.usage_type
                    ? <Tag style={{ fontSize: 10, border: "none", borderRadius: 4, background: row.usage_type === "selling" ? "#f0fdf4" : row.usage_type === "internal" ? "#fff7ed" : "#eff6ff", color: row.usage_type === "selling" ? "#059669" : row.usage_type === "internal" ? "#f97316" : "#3b82f6" }}>{row.usage_type}</Tag>
                    : <Text type="secondary">—</Text>}
                </td>
                <td style={{ padding: "6px 10px", color: "#374151" }}>{row.price ? `Ksh ${row.price}` : "—"}</td>
                <td style={{ padding: "6px 10px", color: "#374151", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{row.category || "—"}</td>
                <td style={{ padding: "6px 10px", color: "#374151", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{row.supplier || "—"}</td>
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

// ─────────────────────────────────────────────────────────────────────────────
// SMART IMPORT MODAL
// ─────────────────────────────────────────────────────────────────────────────
const ImportInventoryModal: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "analysing" | "advice" | "importing" | "result">("upload");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const shopId = localStorage.getItem("shopId") || "";

  const handleOpen = () => { setOpen(true); reset(); };
  const handleClose = () => { if (step !== "analysing" && step !== "importing") { setOpen(false); reset(); } };
  const reset = () => { setFile(null); setStep("upload"); setAnalysis(null); setImportResult(null); };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try { await downloadInventoryTemplate(); } finally { setDownloading(false); }
  };

  const handleAnalyse = async (selectedFile: File) => {
    setStep("analysing");
    try {
      const result = await analyseInventoryFile(selectedFile);
      setAnalysis(result);
      setStep("advice");
    } catch (err: any) {
      message.error(err?.message || "Failed to analyse file");
      setStep("upload");
    }
  };

  const handleImport = async () => {
    if (!file || !shopId) return;
    setStep("importing");
    try {
      const result = await importInventoryFromExcel(file, shopId);
      setImportResult(result);
      setStep("result");
      if (result.summary.created > 0) onSuccess();
    } catch (err: any) {
      message.error(err?.message || "Import failed");
      setStep("advice");
    }
  };

  // ── Step: Upload ────────────────────────────────────────────────────────────
  const renderUpload = () => (
    <div>
      <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "13px 16px", marginBottom: 16, border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <Text strong style={{ fontSize: 13, color: "#065f46", display: "block" }}>Have our template?</Text>
          <Text style={{ fontSize: 12, color: "#6b7280" }}>Download it for best results — but any Excel file works</Text>
        </div>
        <Button icon={<ArrowDownOutlined />} loading={downloading} onClick={handleDownloadTemplate} size="small"
          style={{ borderRadius: 6, background: "#059669", border: "none", color: "#fff", fontWeight: 500, flexShrink: 0 }}>
          Template
        </Button>
      </div>
      <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 6 }}>Upload any Excel file with inventory data</Text>
      <Text style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 12 }}>
        We'll detect your column headers automatically and show you a preview before importing anything.
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
            <Text style={{ fontSize: 12, color: "#9ca3af" }}>or click to browse · .xlsx / .xls · any format accepted</Text>
          </div>
        </div>
      </Dragger>
      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={handleClose} style={{ borderRadius: 8 }}>Cancel</Button>
      </div>
    </div>
  );

  // ── Step: Analysing ─────────────────────────────────────────────────────────
  const renderAnalysing = () => (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <Spin size="large" />
      <Text style={{ display: "block", marginTop: 16, color: "#64748b", fontSize: 14 }}>Reading your file and detecting column format…</Text>
      {file && <Text style={{ display: "block", marginTop: 6, color: "#94a3b8", fontSize: 12 }}>{file.name}</Text>}
    </div>
  );

  // ── Step: Advice ─────────────────────────────────────────────────────────────
  const renderAdvice = () => {
    if (!analysis) return null;
    return (
      <div>
        {/* Summary bar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Sheet", value: analysis.sheetUsed, color: "#6366f1", bg: "#eef2ff" },
            { label: "Header at row", value: analysis.headerRowDetectedAt, color: "#0ea5e9", bg: "#f0f9ff" },
            { label: "Data rows", value: analysis.totalDataRows, color: "#10b981", bg: "#f0fdf4" },
            { label: "Cols mapped", value: analysis.mappedColumns.length, color: "#f97316", bg: "#fff7ed" },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 8, padding: "8px 6px", textAlign: "center" as const }}>
              <Text style={{ fontSize: 14, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</Text>
            </div>
          ))}
        </div>

        {/* Advice items */}
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

        {/* Column mapping */}
        <div style={{ marginBottom: 14 }}>
          <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 8 }}>
            Column mapping
            <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginLeft: 8 }}>* required · † recommended</Text>
          </Text>
          <ColumnMappingTable mapping={analysis.columnMapping} missingRequired={analysis.missingRequired} missingRecommended={analysis.missingRecommended} />
        </div>

        {/* Data preview */}
        {analysis.previewRows.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 8 }}>Data preview</Text>
            <PreviewTable rows={analysis.previewRows} />
          </div>
        )}

        {/* Unmapped columns */}
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

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
          <Button onClick={reset} icon={<ReloadOutlined />} style={{ borderRadius: 8, height: 38 }}>Try Different File</Button>
          <Button
            type="primary" icon={<ArrowRightOutlined />} onClick={handleImport}
            disabled={!analysis.canImport}
            style={{ flex: 1, borderRadius: 8, height: 38, background: analysis.canImport ? "#059669" : undefined, border: "none", fontWeight: 600 }}
          >
            {analysis.canImport
              ? `Import ${analysis.totalDataRows} Row${analysis.totalDataRows !== 1 ? "s" : ""}`
              : "Cannot Import — Fix Errors First"}
          </Button>
        </div>
      </div>
    );
  };

  // ── Step: Importing ─────────────────────────────────────────────────────────
  const renderImporting = () => (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <Spin size="large" />
      <Text style={{ display: "block", marginTop: 16, color: "#64748b", fontSize: 14 }}>Importing inventory…</Text>
      <Text style={{ display: "block", marginTop: 6, color: "#94a3b8", fontSize: 12 }}>Auto-creating missing units, categories and suppliers as needed</Text>
    </div>
  );

  // ── Step: Result ─────────────────────────────────────────────────────────────
  const renderResult = () => {
    if (!importResult) return null;
    const { summary, errors } = importResult;
    const ac = summary.auto_created || {};
    const totalAutoCreated = Object.values(ac).reduce((s, arr) => s + (arr?.length ?? 0), 0);
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Total Rows", value: summary.total, color: "#6366f1", bg: "#eef2ff" },
            { label: "Created", value: summary.created, color: "#059669", bg: "#f0fdf4" },
            { label: "Skipped", value: summary.skipped, color: summary.skipped ? "#f59e0b" : "#10b981", bg: summary.skipped ? "#fffbeb" : "#f0fdf4" },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "10px 8px", textAlign: "center" as const }}>
              <Text style={{ fontSize: 22, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: "#6b7280" }}>{s.label}</Text>
            </div>
          ))}
        </div>

        {summary.format_detected && (
          <div style={{ background: "#f0f9ff", borderRadius: 8, padding: "8px 12px", marginBottom: 12, border: "1px solid #bae6fd" }}>
            <Text style={{ fontSize: 12, color: "#0369a1" }}>
              <InfoCircleOutlined style={{ marginRight: 6 }} />
              Imported from sheet <strong>{summary.format_detected.sheet}</strong> · Header at row {summary.format_detected.header_row} · {summary.format_detected.mapped_columns} columns mapped
            </Text>
          </div>
        )}

        {totalAutoCreated > 0 && (
          <Alert type="info" showIcon
            message={`${totalAutoCreated} supporting record(s) auto-created`}
            description={
              <div>
                {ac.units?.length ? <div style={{ fontSize: 11 }}>Units: {ac.units.join(", ")}</div> : null}
                {ac.main_categories?.length ? <div style={{ fontSize: 11 }}>Main Categories: {ac.main_categories.join(", ")}</div> : null}
                {ac.categories?.length ? <div style={{ fontSize: 11 }}>Categories: {ac.categories.join(", ")}</div> : null}
                {ac.subcategories?.length ? <div style={{ fontSize: 11 }}>Sub-Categories: {ac.subcategories.join(", ")}</div> : null}
                {ac.suppliers?.length ? <div style={{ fontSize: 11 }}>Suppliers: {ac.suppliers.join(", ")} — update phone/email in Settings.</div> : null}
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

        {summary.created === 0 && summary.errors > 0 && (
          <Alert type="warning" message="No items were imported" description="All rows had validation errors. Fix the issues above and re-upload." style={{ borderRadius: 8, marginBottom: 16 }} />
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={reset} style={{ flex: 1, borderRadius: 8, height: 38 }}>Import Another</Button>
          <Button type="primary" onClick={handleClose} style={{ flex: 1, borderRadius: 8, height: 38, background: "#059669", border: "none" }}>Done</Button>
        </div>
      </div>
    );
  };

  const STEP_TITLES: Record<string, string> = {
    upload: "Import Inventory from Excel",
    analysing: "Analysing Your File…",
    advice: "File Analysis & Preview",
    importing: "Importing…",
    result: "Import Complete",
  };

  return (
    <>
      <Button icon={<UploadOutlined />} onClick={handleOpen}
        style={{ borderRadius: 7, fontWeight: 500, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#059669" }}>
        Import Excel
      </Button>
      <Modal
        open={open} onCancel={handleClose} footer={null}
        width={step === "advice" ? 680 : 480}
        centered destroyOnClose
        closable={step !== "analysing" && step !== "importing"}
        title={<Space><FileExcelOutlined style={{ color: "#059669", fontSize: 18 }} /><Text strong style={{ fontSize: 15 }}>{STEP_TITLES[step]}</Text></Space>}
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

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE CARD
// ─────────────────────────────────────────────────────────────────────────────
interface InventoryCardProps {
  record: any; onDelete: (id: string) => void; deleting: boolean;
  tableRef: React.MutableRefObject<ActionType | undefined>;
  selected: boolean; onSelect: (id: string, checked: boolean) => void; selectMode: boolean;
}

const InventoryCard: React.FC<InventoryCardProps> = ({ record, onDelete, deleting, tableRef, selected, onSelect, selectMode }) => {
  const { quantity, min_viable_quantity } = record;
  const isLow = min_viable_quantity && quantity <= min_viable_quantity;
  const isCritical = min_viable_quantity && quantity <= min_viable_quantity * 0.5;
  return (
    <Card
      style={{ borderRadius: 12, marginBottom: 10, border: selected ? "1.5px solid #ef4444" : isLow ? `1px solid ${isCritical ? "#fca5a5" : "#fde68a"}` : "1px solid #e2e8f0", boxShadow: selected ? "0 0 0 2px #fee2e2" : "0 1px 4px rgba(0,0,0,0.05)", background: selected ? "#fff5f5" : "#fff", transition: "all 0.15s" }}
      bodyStyle={{ padding: "12px 14px" }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
        {selectMode && <Checkbox checked={selected} onChange={(e) => onSelect(record._id, e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />}
        <ProductThumbnail src={record.thumbnail} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <Text strong style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.3 }}>{record.name}</Text>
            {renderStatus(record.status)}
          </div>
          {record.code && <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4, fontSize: 11, color: "#64748b", marginTop: 3, display: "inline-block" }}>{record.code}</code>}
          {record.desc && <Text style={{ fontSize: 11, color: "#94a3b8", display: "block", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{record.desc}</Text>}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "8px 10px", background: "#f8fafc", borderRadius: 8, marginBottom: 10 }}>
        <div style={{ textAlign: "center" }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Stock</Text>
          {renderStockLevel(record)}
          <Text style={{ fontSize: 10, color: "#94a3b8" }}>{record?.unit_id?.name || "units"}</Text>
        </div>
        <div style={{ textAlign: "center", borderLeft: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0" }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Price</Text>
          {record.usage_type === "internal" ? <Text style={{ fontSize: 12, color: "#94a3b8" }}>N/A</Text> : <Text strong style={{ fontSize: 13, color: "#10b981" }}>{record.price ? `Ksh ${fmtK(record.price)}` : "—"}</Text>}
        </div>
        <div style={{ textAlign: "center" }}>
          <Text style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>Usage</Text>
          {renderUsageType(record.usage_type)}
        </div>
      </div>
      {record?.subcategory_id?.name && <div style={{ marginBottom: 8 }}><Tag style={{ background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 5, fontSize: 11 }}>{record.subcategory_id.name}</Tag></div>}
      {!selectMode && (
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><AddEditProInventoryModal actionRef={tableRef} data={record} edit={true} /></div>
          <Popconfirm title="Delete inventory item?" description="This action cannot be undone." onConfirm={() => onDelete(record._id)} okText="Delete" okButtonProps={{ danger: true }} cancelText="Cancel" placement="topRight">
            <Button danger size="middle" icon={<DeleteOutlined />} loading={deleting} style={{ borderRadius: 8, width: 38, padding: 0 }} />
          </Popconfirm>
        </div>
      )}
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE LIST
// ─────────────────────────────────────────────────────────────────────────────
const MobileInventoryList: React.FC<{
  tableRef: React.MutableRefObject<ActionType | undefined>;
  onExportExcel: () => void; onExportPDF: () => void; onImportSuccess: () => void;
}> = ({ tableRef, onExportExcel, onExportPDF, onImportSuccess }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const shopId = localStorage.getItem("shopId") || "";

  const loadItems = useCallback(async () => {
    setLoading(true);
    try { const data = await fetchAllInventory({}); setItems(data); }
    catch { message.error("Failed to load inventory"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadItems(); }, []);

  const deleteMutation = useMutation(deleteInventory, {
    onMutate: (id: string) => setDeletingId(id),
    onSuccess: () => { message.success("Item deleted"); setDeletingId(null); loadItems(); },
    onError: () => { message.error("Failed to delete"); setDeletingId(null); },
  });

  const filtered = items.filter((item) => !searchText || item.name?.toLowerCase().includes(searchText.toLowerCase()) || item.code?.toLowerCase().includes(searchText.toLowerCase()));
  const lowStockCount = items.filter((i) => i.min_viable_quantity && i.quantity <= i.min_viable_quantity).length;
  const totalValue = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0);

  const toggleSelectMode = () => { setSelectMode(v => !v); setSelectedIds(new Set()); };
  const handleSelect = (id: string, checked: boolean) => { setSelectedIds(prev => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; }); };
  const allSelected = filtered.length > 0 && filtered.every(i => selectedIds.has(i._id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return message.warning("No items selected");
    confirm({
      title: `Delete ${selectedIds.size} selected item(s)?`,
      icon: <ExclamationCircleOutlined style={{ color: "#ef4444" }} />,
      content: "This action cannot be undone.",
      okText: "Delete", okButtonProps: { danger: true }, cancelText: "Cancel",
      onOk: async () => {
        setBulkDeleting(true);
        try { const r = await deleteMultipleInventory(Array.from(selectedIds)); message.success(`${r.deleted} item(s) deleted`); setSelectMode(false); setSelectedIds(new Set()); loadItems(); }
        catch { } finally { setBulkDeleting(false); }
      },
    });
  };

  const handleDeleteAll = () => {
    confirm({
      title: "Delete ALL inventory items?",
      icon: <ExclamationCircleOutlined style={{ color: "#ef4444" }} />,
      content: <div><Text>Permanently deletes <strong>all {items.length} items</strong>.</Text><br /><Text type="danger" style={{ fontSize: 12 }}>Cannot be undone.</Text></div>,
      okText: "Delete All", okButtonProps: { danger: true }, cancelText: "Cancel",
      onOk: async () => {
        setBulkDeleting(true);
        try { const r = await deleteAllInventory(shopId); message.success(`${r.deleted} item(s) deleted`); setSelectMode(false); setSelectedIds(new Set()); loadItems(); }
        catch { } finally { setBulkDeleting(false); }
      },
    });
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input placeholder="Search inventory…" value={searchText} onChange={(e) => setSearchText(e.target.value)}
          style={{ flex: 1, height: 36, borderRadius: 8, border: "1px solid #e2e8f0", padding: "0 12px", fontSize: 13, outline: "none", color: "#0f172a", background: "#f8fafc" }} />
        <Button icon={<ReloadOutlined />} onClick={loadItems} loading={loading} style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }} />
        <Dropdown menu={{ items: [{ key: "excel", label: "Export Excel", icon: <FileExcelOutlined />, onClick: onExportExcel }, { key: "pdf", label: "Export PDF", icon: <FilePdfOutlined />, onClick: onExportPDF }] }}>
          <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }} />
        </Dropdown>
        <AddEditProInventoryModal actionRef={tableRef} />
      </div>

      <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", marginBottom: 10, border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <Text strong style={{ fontSize: 13, color: "#065f46", display: "block" }}>Bulk Import</Text>
          <Text style={{ fontSize: 11, color: "#6b7280" }}>Upload any Excel file — we'll detect the format automatically</Text>
        </div>
        <ImportInventoryModal onSuccess={() => { loadItems(); onImportSuccess(); }} />
      </div>

      <div style={{ background: "#fff1f2", borderRadius: 10, padding: "10px 14px", marginBottom: 14, border: "1px solid #fecdd3", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" as const }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button size="small" onClick={toggleSelectMode}
            style={{ borderRadius: 6, fontSize: 12, background: selectMode ? "#fee2e2" : "#fff", border: selectMode ? "1px solid #fca5a5" : "1px solid #e2e8f0", color: selectMode ? "#dc2626" : "#374151" }}>
            {selectMode ? "Cancel Selection" : "Select Items"}
          </Button>
          {selectMode && (
            <Checkbox indeterminate={someSelected} checked={allSelected} onChange={(e) => setSelectedIds(e.target.checked ? new Set(filtered.map(i => i._id)) : new Set())}>
              <Text style={{ fontSize: 12, color: "#374151" }}>{selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}</Text>
            </Checkbox>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {selectMode && selectedIds.size > 0 && (
            <Button danger size="small" icon={<DeleteOutlined />} loading={bulkDeleting} onClick={handleDeleteSelected} style={{ borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              Delete {selectedIds.size}
            </Button>
          )}
          <Button danger size="small" icon={<DeleteOutlined />} loading={bulkDeleting} onClick={handleDeleteAll}
            style={{ borderRadius: 6, fontSize: 12, background: "#fff1f2", border: "1px solid #fca5a5", color: "#dc2626" }}>
            Delete All
          </Button>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Items", value: items.length, color: "#6366f1", bg: "#eef2ff" },
            { label: "Low Stock", value: lowStockCount, color: lowStockCount > 0 ? "#ef4444" : "#10b981", bg: lowStockCount > 0 ? "#fef2f2" : "#f0fdf4" },
            { label: "Total Value", value: `Ksh ${fmtK(totalValue)}`, color: "#10b981", bg: "#f0fdf4" },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 8, padding: "8px 6px", textAlign: "center" as const }}>
              <Text style={{ fontSize: 13, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</Text>
            </div>
          ))}
        </div>
      )}

      {loading
        ? Array.from({ length: 4 }).map((_, i) => <Card key={i} style={{ borderRadius: 12, marginBottom: 10, border: "1px solid #e2e8f0" }} bodyStyle={{ padding: 14 }}><Skeleton active paragraph={{ rows: 2 }} /></Card>)
        : filtered.length === 0
          ? <Empty description="No inventory items found" style={{ padding: "40px 0" }} />
          : filtered.map((record) => (
            <InventoryCard key={record._id} record={record} onDelete={(id) => deleteMutation.mutate(id)} deleting={deletingId === record._id}
              tableRef={tableRef} selected={selectedIds.has(record._id)} onSelect={handleSelect} selectMode={selectMode} />
          ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const InventorySettings = () => {
  const paymentRef = useRef<ActionType>();
  const isMobile = useIsMobile();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const shopId = localStorage.getItem("shopId") || "";

  const deleteInventoryMutation = useMutation(deleteInventory, {
    onSuccess: () => { paymentRef.current?.reload(); message.success("Item deleted"); },
    onError: () => message.error("Failed to delete"),
  });

  const handleDeleteSelected = () => {
    if (selectedRowKeys.length === 0) return message.warning("No items selected");
    confirm({
      title: `Delete ${selectedRowKeys.length} selected item(s)?`,
      icon: <ExclamationCircleOutlined style={{ color: "#ef4444" }} />,
      content: "This action cannot be undone.",
      okText: "Delete", okButtonProps: { danger: true }, cancelText: "Cancel",
      onOk: async () => {
        setBulkDeleting(true);
        try { const r = await deleteMultipleInventory(selectedRowKeys as string[]); message.success(`${r.deleted} item(s) deleted`); setSelectedRowKeys([]); paymentRef.current?.reload(); }
        catch { } finally { setBulkDeleting(false); }
      },
    });
  };

  const handleDeleteAll = () => {
    confirm({
      title: "Delete ALL inventory items?",
      icon: <ExclamationCircleOutlined style={{ color: "#ef4444" }} />,
      content: <div><Text>This will permanently delete <strong>all inventory items</strong> in this shop.</Text><br /><Text type="danger" style={{ fontSize: 12 }}>Cannot be undone.</Text></div>,
      okText: "Delete All", okButtonProps: { danger: true }, cancelText: "Cancel",
      onOk: async () => {
        setBulkDeleting(true);
        try { const r = await deleteAllInventory(shopId); message.success(`${r.deleted} item(s) deleted`); setSelectedRowKeys([]); paymentRef.current?.reload(); }
        catch { } finally { setBulkDeleting(false); }
      },
    });
  };

  const exportToExcel = async () => {
    try {
      const data = await fetchAllInventory({});
      const exportData = data.map((item: any) => ({ Code: item.code, Name: item.name, Price: item.price, "Supplier Cost": item.supplier_price, Subcategory: item.category_id?.name || "", Quantity: item.quantity, Status: item.min_viable_quantity >= item.quantity ? "Out of Stock" : "In Stock", Unit: item.unit_id?.name || "", "Min Viable Quantity": item.min_viable_quantity }));
      const ws = XLSX.utils.json_to_sheet(exportData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Inventory");
      ws["!cols"] = Object.keys(exportData[0] || {}).map(() => ({ wch: 16 }));
      XLSX.writeFile(wb, `inventory_${new Date().toISOString().split("T")[0]}.xlsx`); message.success("Excel exported");
    } catch { message.error("Export failed"); }
  };

  const exportToPDF = async () => {
    try {
      const data = await fetchAllInventory({}); const doc = new jsPDF();
      doc.setFontSize(16); doc.text("Inventory Report", 14, 15); doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);
      const tableData = data.map((item: any) => [item.code, item.name, `Ksh ${item.price?.toLocaleString()}`, `Ksh ${item.supplier_price?.toLocaleString()}`, item.category_id?.name || "", item.quantity, item.min_viable_quantity >= item.quantity ? "Out of Stock" : "In Stock", item.unit_id?.name || ""]);
      (doc as any).autoTable({ head: [["Code", "Name", "Price", "Cost", "Category", "Qty", "Status", "Unit"]], body: tableData, startY: 35, styles: { fontSize: 8 }, headStyles: { fillColor: [99, 102, 241] }, alternateRowStyles: { fillColor: [248, 250, 252] } });
      doc.save(`inventory_${new Date().toISOString().split("T")[0]}.pdf`); message.success("PDF exported");
    } catch { message.error("Export failed"); }
  };

  const exportMenuItems = [
    { key: "excel", label: "Export to Excel", icon: <FileExcelOutlined />, onClick: exportToExcel },
    { key: "pdf", label: "Export to PDF", icon: <FilePdfOutlined />, onClick: exportToPDF },
  ];

  if (isMobile) {
    return (
      <div>
        <div style={{ marginBottom: 14 }}>
          <Space align="center" size={10}>
            <div style={{ background: "#f0fdf4", borderRadius: 9, padding: "7px 8px", color: "#10b981", fontSize: 16, lineHeight: 1 }}><AppstoreOutlined /></div>
            <div><Title level={5} style={{ margin: 0, color: "#0f172a" }}>Product Inventory</Title><Text style={{ fontSize: 12, color: "#64748b" }}>Stock levels, pricing & status</Text></div>
          </Space>
        </div>
        <MobileInventoryList tableRef={paymentRef} onExportExcel={exportToExcel} onExportPDF={exportToPDF} onImportSuccess={() => paymentRef.current?.reload()} />
      </div>
    );
  }

  return (
    <ProTable
      rowKey="_id" cardBordered style={{ borderRadius: 12 }} scroll={{ x: 1200 }}
      pagination={{ pageSize: 10, showQuickJumper: true, showSizeChanger: true, showTotal: (total, range) => <Text style={{ fontSize: 12, color: "#64748b" }}>{range[0]}–{range[1]} of {total} items</Text> }}
      columns={[
        { title: "Image", dataIndex: "thumbnail", hideInSearch: true, width: 70, render: (_: any, record: any) => <ProductThumbnail src={record.thumbnail} /> },
        { title: "Code", dataIndex: "code", hideInSearch: false, width: 110, sorter: true, fieldProps: { placeholder: "Enter code" }, render: (text: any) => <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontSize: 12, color: "#64748b" }}>{text}</code> },
        { title: "Product Name", dataIndex: "name", hideInSearch: false, fixed: "left" as const, sorter: true, ellipsis: true, fieldProps: { placeholder: "Search name" }, render: (text: any, record: any) => <Space direction="vertical" size={2}><Text strong style={{ fontSize: 13, color: "#0f172a" }}>{text}</Text>{record.desc && <Text style={{ fontSize: 11, color: "#94a3b8", display: "block", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{record.desc}</Text>}</Space> },
        { title: "Category", dataIndex: "subcategory_id", hideInSearch: true, width: 120, render: (_: any, record: any) => record?.subcategory_id?.name ? <Tag style={{ background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 5, fontSize: 11 }}>{record.subcategory_id.name}</Tag> : <Text type="secondary" style={{ fontSize: 12 }}>—</Text> },
        { title: "Usage", dataIndex: "usage_type", hideInSearch: true, width: 110, render: (_: any, record: any) => renderUsageType(record.usage_type), filters: [{ text: "For Sale", value: "selling" }, { text: "Internal", value: "internal" }, { text: "Both", value: "both" }] },
        { title: "Stock", dataIndex: "quantity", hideInSearch: true, width: 130, sorter: true, render: (_: any, record: any) => <Space direction="vertical" size={2}>{renderStockLevel(record)}<Text style={{ fontSize: 11, color: "#94a3b8" }}>{record?.unit_id?.name || "units"}</Text>{record.min_viable_quantity && <Text style={{ fontSize: 11, color: "#94a3b8" }}>Min: {record.min_viable_quantity}</Text>}</Space> },
        { title: "Pricing", dataIndex: "price", hideInSearch: true, width: 130, render: (_: any, record: any) => renderPrice(record) },
        { title: "Status", dataIndex: "status", hideInSearch: true, width: 110, render: (_: any, record: any) => renderStatus(record.status), filters: [{ text: "Active", value: "active" }, { text: "Inactive", value: "inactive" }, { text: "Discontinued", value: "discontinued" }] },
        {
          title: "Actions", dataIndex: "actions", hideInSearch: true, width: 140, fixed: "right" as const,
          render: (_: any, record: any) => (
            <Space size={6}>
              <AddEditProInventoryModal actionRef={paymentRef} data={record} edit={true} />
              <Popconfirm title="Delete inventory item?" description="This action cannot be undone." onConfirm={() => deleteInventoryMutation.mutate(record._id)} okText="Delete" okButtonProps={{ danger: true }} cancelText="Cancel">
                <Button danger size="small" icon={<DeleteOutlined />} style={{ borderRadius: 6, height: 28, width: 28, padding: 0 }} />
              </Popconfirm>
            </Space>
          ),
        },
      ]}
      request={async (params, sort, filter) => {
        try {
          const queryParams = { ...params, current: params.current || 1, pageSize: params.pageSize || 10, ...(sort && Object.keys(sort).length > 0 && { sortField: Object.keys(sort)[0], sortOrder: Object.values(sort)[0] === "ascend" ? "asc" : "desc" }), ...(filter && Object.keys(filter).length > 0 && { ...filter }) };
          const data = await fetchAllInventory(queryParams);
          return { data, success: true, total: data.length };
        } catch { message.error("Failed to fetch inventory"); return { data: [], success: false, total: 0 }; }
      }}
      rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys), alwaysShowAlert: false }}
      tableAlertRender={({ selectedRowKeys: keys }: any) => keys.length > 0 ? (
        <Space size={8}>
          <Text style={{ fontSize: 13 }}>{keys.length} item(s) selected</Text>
          <Button danger size="small" icon={<DeleteOutlined />} loading={bulkDeleting} onClick={handleDeleteSelected} style={{ borderRadius: 6, fontWeight: 600 }}>Delete Selected</Button>
        </Space>
      ) : null}
      tableAlertOptionRender={() => <Button type="link" danger size="small" onClick={() => setSelectedRowKeys([])}>Clear selection</Button>}
      actionRef={paymentRef}
      search={{ searchText: "Search", resetText: "Reset", labelWidth: "auto", collapsed: false }}
      dateFormatter="string"
      headerTitle={
        <Space size={8}>
          <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "5px 6px", color: "#10b981", fontSize: 15, lineHeight: 1 }}><AppstoreOutlined /></div>
          <Text strong style={{ fontSize: 14, color: "#0f172a" }}>Product Inventory</Text>
        </Space>
      }
      toolBarRender={() => [
        <ImportInventoryModal key="import" onSuccess={() => paymentRef.current?.reload()} />,
        <AddEditProInventoryModal actionRef={paymentRef} key="add" />,
        <Dropdown key="export" menu={{ items: exportMenuItems }} placement="bottomRight">
          <Button icon={<DownloadOutlined />} style={{ borderRadius: 7, fontWeight: 500, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#374151" }}>Export</Button>
        </Dropdown>,
        <Popconfirm key="delete-all" title="Delete ALL inventory items?" description="Permanently deletes every item in this shop. Cannot be undone." onConfirm={handleDeleteAll} okText="Delete All" okButtonProps={{ danger: true }} cancelText="Cancel" placement="bottomRight">
          <Button danger icon={<DeleteOutlined />} loading={bulkDeleting} style={{ borderRadius: 7, fontWeight: 500 }}>Delete All</Button>
        </Popconfirm>,
      ]}
      options={{ setting: { listsHeight: 400 }, reload: true, density: true, fullScreen: true }}
    />
  );
};

export default InventorySettings;