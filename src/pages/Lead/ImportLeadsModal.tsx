import { useState } from "react";
import { Button, message, Modal, Upload, Alert, Spin, Typography, Tag, Select } from "antd";
import {
  InboxOutlined, ReloadOutlined, ArrowRightOutlined, FileExcelOutlined,
  DownloadOutlined, InfoCircleOutlined, CloseCircleOutlined, UserOutlined,
} from "@ant-design/icons";
import {
  downloadLeadTemplate, analyseLeadFile, importLeadsFromExcel, AnalyseLeadResult, ImportLeadResult,
} from "@services/crm/leads";
import { fetchAllUsersList } from "@services/users";

const { Text } = Typography;
const { Dragger } = Upload;

interface User {
  _id: string;
  fullname?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  full_name?: string;
  displayName?: string;
  username?: string;
  user_name?: string;
  email?: string;
}

const ADVICE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  error: { icon: <CloseCircleOutlined />, color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  warning: { icon: <InfoCircleOutlined />, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  info: { icon: <InfoCircleOutlined />, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
};

const ColumnMappingTable = ({ mapping, missingRequired, missingRecommended }: {
  mapping: Record<string, string>;
  missingRequired: string[];
  missingRecommended: string[];
}) => (
  <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
      <thead>
        <tr style={{ background: "#f8fafc" }}>
          <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 500 }}>Excel Column</th>
          <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 500 }}>Lead Field</th>
          <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 500 }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(mapping).map(([excelCol, leadField]) => {
          const isMissing = missingRequired.includes(leadField) || missingRecommended.includes(leadField);
          return (
            <tr key={excelCol} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "6px 10px", color: "#334155" }}>{excelCol}</td>
              <td style={{ padding: "6px 10px", color: "#334155" }}>{leadField}</td>
              <td style={{ padding: "6px 10px" }}>
                {isMissing ? (
                  <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>Missing</Tag>
                ) : (
                  <Tag color="green" style={{ fontSize: 10, margin: 0 }}>Mapped</Tag>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const PreviewTable = ({ rows, users, rowAssignments, setRowAssignments, globalAssignedTo }: {
  rows: any[];
  users: User[];
  rowAssignments: Record<number, string>;
  setRowAssignments: (assignments: Record<number, string>) => void;
  globalAssignedTo?: string;
}) => (
  <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "auto", maxHeight: 300, maxWidth: "100%" }}>
    <table style={{ width: "max-content", borderCollapse: "collapse", fontSize: 10, minWidth: "100%" }}>
      <thead>
        <tr style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>
          <th style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 500, whiteSpace: "nowrap", minWidth: 150, backgroundColor: "#f8fafc", borderRight: "2px solid #3b82f6" }}>
            Assign to Staff
          </th>
          {Object.keys(rows[0] || {}).map((key) => (
            <th key={key} style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>
              {key}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
            <td style={{ padding: "4px 8px", minWidth: 150, backgroundColor: "#fff", borderRight: "2px solid #3b82f6" }}>
              <Select
                size="small"
                style={{ width: "100%", fontSize: 10 }}
                placeholder="Optional"
                allowClear
                value={rowAssignments[i] || globalAssignedTo || undefined}
                onChange={(value) => {
                  setRowAssignments({
                    ...rowAssignments,
                    [i]: value
                  });
                }}
                options={users.map((u) => ({
                  label: u.fullname || u.name || 'Unknown',
                  value: u._id
                }))}
              />
            </td>
            {Object.values(row).map((val: any, j) => (
              <td key={j} style={{ padding: "4px 8px", color: "#334155", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {val ?? "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

interface ImportLeadsModalProps {
  onSuccess: () => void;
}

const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "analysing" | "advice" | "importing" | "result">("upload");
  const [analysis, setAnalysis] = useState<AnalyseLeadResult | null>(null);
  const [importResult, setImportResult] = useState<ImportLeadResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string | undefined>(undefined);
  const [rowAssignments, setRowAssignments] = useState<Record<number, string>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const shopId = localStorage.getItem("shopId") || "";

  const handleOpen = async () => {
    setOpen(true);
    reset();
    // Fetch users for assignment
    setUsersLoading(true);
    try {
      const shopData = localStorage.getItem("shop");
      const shop = shopData ? JSON.parse(shopData) : null;
      const shop_id = shop?._id;

      const response = await fetchAllUsersList({
        shop_id: shop_id || undefined
      });

      const usersList = response?.data || response?.users || response || [];
      setUsers(Array.isArray(usersList) ? usersList : []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleClose = () => {
    if (step !== "analysing" && step !== "importing") {
      setOpen(false);
      reset();
    }
  };

  const reset = () => {
    setFile(null);
    setStep("upload");
    setAnalysis(null);
    setImportResult(null);
    setAssignedTo(undefined);
    setRowAssignments({});
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      await downloadLeadTemplate();
    } finally {
      setDownloading(false);
    }
  };

  const handleAnalyse = async (selectedFile: File) => {
    setStep("analysing");
    try {
      const result = await analyseLeadFile(selectedFile);
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
      const result = await importLeadsFromExcel(file, shopId, assignedTo, rowAssignments);
      setImportResult(result);
      setStep("result");
      if (result.summary.created > 0 || result.summary.updated > 0) onSuccess();
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
        <Button icon={<DownloadOutlined />} loading={downloading} onClick={handleDownloadTemplate} size="small"
          style={{ borderRadius: 6, background: "#059669", border: "none", color: "#fff", fontWeight: 500, flexShrink: 0 }}>
          Template
        </Button>
      </div>
      <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 6 }}>Upload any Excel file with lead data</Text>
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

        {/* Staff Assignment */}
        <div style={{ marginBottom: 14, padding: "12px", background: "#f0f9ff", borderRadius: 8, border: "1px solid #bae6fd" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <UserOutlined style={{ color: "#0284c7" }} />
            <Text strong style={{ fontSize: 13, color: "#0369a1" }}>Assign leads to staff (optional)</Text>
          </div>
          <Text style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 8 }}>
            Optionally assign all imported leads to a staff member, or assign individually in the preview table below.
          </Text>
          <Select
            placeholder="Select staff member (optional)"
            loading={usersLoading}
            allowClear
            style={{ width: "100%" }}
            value={assignedTo}
            onChange={setAssignedTo}
            options={users.map((u) => {
              const displayName = u.fullname || u.name || u.displayName || u.full_name || 
                (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.firstName) || 
                'Unknown';
              const username = u.username || u.user_name || u.email || 'N/A';
              return {
                label: `${displayName} (@${username})`,
                value: u._id
              };
            })}
          />
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
            <PreviewTable 
              rows={analysis.previewRows} 
              users={users}
              rowAssignments={rowAssignments}
              setRowAssignments={setRowAssignments}
              globalAssignedTo={assignedTo}
            />
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
              ? `Import ${analysis.totalDataRows} Lead${analysis.totalDataRows !== 1 ? "s" : ""}`
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
      <Text style={{ display: "block", marginTop: 16, color: "#64748b", fontSize: 14 }}>Importing leads…</Text>
      <Text style={{ display: "block", marginTop: 6, color: "#94a3b8", fontSize: 12 }}>
        {assignedTo ? "Assigning to selected staff member and creating leads" : "Creating leads"}
      </Text>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Total Rows", value: summary.total, color: "#6366f1", bg: "#eef2ff" },
            { label: "Created", value: summary.created, color: "#059669", bg: "#f0fdf4" },
            { label: "Updated", value: summary.updated, color: "#3b82f6", bg: "#eff6ff" },
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

        {assignedTo && (
          <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "8px 12px", marginBottom: 12, border: "1px solid #bbf7d0" }}>
            <Text style={{ fontSize: 12, color: "#065f46" }}>
              <UserOutlined style={{ marginRight: 6 }} />
              All leads assigned to selected staff member
            </Text>
          </div>
        )}

        {totalAutoCreated > 0 && (
          <Alert type="info" showIcon
            message={`${totalAutoCreated} supporting record(s) auto-created`}
            description={
              <div>
                {ac.staff?.length ? <div style={{ fontSize: 11 }}>Staff: {ac.staff.join(", ")}</div> : null}
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

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button onClick={handleClose} type="primary" style={{ borderRadius: 8, background: "#6c1c2c", border: "none" }}>
            Done
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Button
        icon={<FileExcelOutlined />}
        onClick={handleOpen}
        style={{ borderRadius: 8, height: 36, fontSize: 13 }}
      >
        Import Leads
      </Button>
      <Modal
        open={open}
        onCancel={handleClose}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileExcelOutlined style={{ color: "#059669" }} />
            <span>Import Leads from Excel</span>
          </div>
        }
        footer={null}
        width={700}
        styles={{ body: { padding: "20px" } }}
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

export default ImportLeadsModal;
