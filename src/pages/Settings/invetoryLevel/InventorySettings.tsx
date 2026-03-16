import { useRef, useState, useEffect, useCallback } from "react";
import { ActionType, ProTable } from "@ant-design/pro-components";
import {
  Button, message, Popconfirm, Space, Tag, Image, Tooltip,
  Dropdown, Typography, Card, Skeleton, Empty, Modal, Upload, Alert, Checkbox,
} from "antd";
import {
  deleteInventory, fetchAllInventory, downloadInventoryTemplate,
  importInventoryFromExcel, deleteMultipleInventory, deleteAllInventory,
} from "@services/inventory";
import AddEditProInventoryModal from "@components/MODALS/pro/AddEditProInventoryModal";
import {
  DeleteOutlined, ShoppingCartOutlined, ToolOutlined, SwapOutlined,
  WarningOutlined, CheckCircleOutlined, StopOutlined, EyeOutlined,
  DownloadOutlined, FileExcelOutlined, FilePdfOutlined, AppstoreOutlined,
  ReloadOutlined, UploadOutlined, InboxOutlined, CloseCircleOutlined,
  CheckCircleFilled, ArrowDownOutlined, ExclamationCircleOutlined,
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

// ── Import Modal ──────────────────────────────────────────────────────────────
interface AutoCreated { units?: string[]; main_categories?: string[]; categories?: string[]; subcategories?: string[]; suppliers?: string[]; }
interface ImportResult { message: string; summary: { total: number; created: number; skipped: number; errors: number; auto_created?: AutoCreated }; errors: Array<{ row: number | string; name: string; reason: string }>; }

const ImportInventoryModal: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<"upload" | "result">("upload");
  const shopId = localStorage.getItem("shopId") || "";

  const handleOpen = () => { setOpen(true); setFile(null); setResult(null); setStep("upload"); };
  const handleClose = () => { if (!importing) { setOpen(false); setFile(null); setResult(null); setStep("upload"); } };
  const handleReset = () => { setFile(null); setResult(null); setStep("upload"); };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try { await downloadInventoryTemplate(); } finally { setDownloading(false); }
  };

  const handleImport = async () => {
    if (!file) return message.warning("Please select a file first");
    if (!shopId) return message.error("No shop selected");
    setImporting(true);
    try {
      const res = await importInventoryFromExcel(file, shopId);
      setResult(res); setStep("result");
      if (res.summary.created > 0) onSuccess();
    } catch { } finally { setImporting(false); }
  };

  return (
    <>
      <Button icon={<UploadOutlined />} onClick={handleOpen} style={{ borderRadius: 7, fontWeight: 500, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#059669" }}>Import Excel</Button>
      <Modal open={open} onCancel={handleClose} footer={null} width={480} centered closable={!importing}
        title={<Space><FileExcelOutlined style={{ color: "#059669", fontSize: 18 }} /><Text strong style={{ fontSize: 15 }}>Import Inventory from Excel</Text></Space>}
        styles={{ body: { padding: "16px 24px 24px" } }}
      >
        {step === "upload" ? (
          <div>
            <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "14px 16px", marginBottom: 16, border: "1px solid #bbf7d0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <Text strong style={{ fontSize: 13, color: "#065f46", display: "block" }}>Step 1 — Download Template</Text>
                  <Text style={{ fontSize: 12, color: "#6b7280" }}>Fill in the template with your inventory data</Text>
                </div>
                <Button icon={<ArrowDownOutlined />} loading={downloading} onClick={handleDownloadTemplate} size="small" style={{ borderRadius: 6, background: "#059669", border: "none", color: "#fff", fontWeight: 500, flexShrink: 0 }}>Template</Button>
              </div>
            </div>
            <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 8 }}>Step 2 — Upload Filled Template</Text>
            <Dragger accept=".xlsx,.xls" maxCount={1} showUploadList={false} beforeUpload={(f) => { setFile(f); return false; }} style={{ borderRadius: 10, borderColor: file ? "#059669" : "#d1d5db", background: file ? "#f0fdf4" : "#fafafa" }}>
              {file ? (
                <div style={{ padding: "16px 0" }}>
                  <CheckCircleFilled style={{ fontSize: 28, color: "#059669", marginBottom: 6 }} />
                  <div>
                    <Text strong style={{ color: "#065f46", fontSize: 13, display: "block" }}>{file.name}</Text>
                    <Text style={{ fontSize: 11, color: "#6b7280" }}>{(file.size / 1024).toFixed(1)} KB — click to change</Text>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "16px 0" }}>
                  <InboxOutlined style={{ fontSize: 28, color: "#9ca3af", marginBottom: 6 }} />
                  <div>
                    <Text style={{ fontSize: 13, color: "#374151", display: "block" }}>Drop your Excel file here</Text>
                    <Text style={{ fontSize: 11, color: "#9ca3af" }}>or click to browse · .xlsx / .xls</Text>
                  </div>
                </div>
              )}
            </Dragger>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Button onClick={handleClose} style={{ flex: 1, borderRadius: 8, height: 38 }} disabled={importing}>Cancel</Button>
              <Button type="primary" icon={<UploadOutlined />} onClick={handleImport} loading={importing} disabled={!file} style={{ flex: 2, borderRadius: 8, height: 38, background: "#059669", border: "none", fontWeight: 600 }}>{importing ? "Importing…" : "Import"}</Button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Total Rows", value: result?.summary.total, color: "#6366f1", bg: "#eef2ff" },
                { label: "Created", value: result?.summary.created, color: "#059669", bg: "#f0fdf4" },
                { label: "Skipped", value: result?.summary.skipped, color: result?.summary.skipped ? "#f59e0b" : "#10b981", bg: result?.summary.skipped ? "#fffbeb" : "#f0fdf4" },
              ].map((s) => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                  <Text style={{ fontSize: 20, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
                  <Text style={{ fontSize: 11, color: "#6b7280" }}>{s.label}</Text>
                </div>
              ))}
            </div>
            {result?.summary.auto_created && Object.keys(result.summary.auto_created).length > 0 && (() => {
              const ac = result.summary.auto_created!;
              const lines: string[] = [];
              if (ac.units?.length) lines.push(`Units: ${ac.units.join(", ")}`);
              if (ac.main_categories?.length) lines.push(`Main Categories: ${ac.main_categories.join(", ")}`);
              if (ac.categories?.length) lines.push(`Categories: ${ac.categories.join(", ")}`);
              if (ac.subcategories?.length) lines.push(`Sub-Categories: ${ac.subcategories.join(", ")}`);
              if (ac.suppliers?.length) lines.push(`Suppliers: ${ac.suppliers.join(", ")}`);
              const total = Object.values(ac).reduce((s, arr) => s + (arr?.length ?? 0), 0);
              return (
                <Alert type="info" showIcon message={`${total} supporting record(s) were auto-created`}
                  description={<div>
                    <div style={{ fontSize: 11, color: "#374151", marginBottom: 4 }}>The following items didn't exist and were created automatically:</div>
                    {lines.map((l, i) => <div key={i} style={{ fontSize: 11, color: "#4b5563" }}>• {l}</div>)}
                    {ac.suppliers?.length ? <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Suppliers created with placeholder phone — update in Settings.</div> : null}
                  </div>}
                  style={{ borderRadius: 8, marginBottom: 12 }}
                />
              );
            })()}
            {result?.errors && result.errors.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ fontSize: 12, color: "#374151", display: "block", marginBottom: 6 }}>
                  <CloseCircleOutlined style={{ color: "#ef4444", marginRight: 4 }} />{result.errors.length} row(s) had errors
                </Text>
                <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2" }}>
                  {result.errors.map((e, i) => (
                    <div key={i} style={{ padding: "8px 12px", borderBottom: i < result.errors.length - 1 ? "1px solid #fecaca" : "none" }}>
                      <Text style={{ fontSize: 12, color: "#dc2626", display: "block" }}>Row {e.row} — <strong>{e.name}</strong></Text>
                      <Text style={{ fontSize: 11, color: "#6b7280" }}>{e.reason}</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result?.summary.created === 0 && (result?.summary.errors ?? 0) > 0 && (
              <Alert type="warning" message="No items were imported" description="All rows had validation errors. Fix the issues above and re-upload." style={{ borderRadius: 8, marginBottom: 16 }} />
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={handleReset} style={{ flex: 1, borderRadius: 8, height: 38 }}>Import Another</Button>
              <Button type="primary" onClick={handleClose} style={{ flex: 1, borderRadius: 8, height: 38, background: "#059669", border: "none" }}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

// ── Mobile Card ───────────────────────────────────────────────────────────────
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

// ── Mobile List ───────────────────────────────────────────────────────────────
const MobileInventoryList: React.FC<{ tableRef: React.MutableRefObject<ActionType | undefined>; onExportExcel: () => void; onExportPDF: () => void; onImportSuccess: () => void; }> = ({ tableRef, onExportExcel, onExportPDF, onImportSuccess }) => {
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
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input placeholder="Search inventory…" value={searchText} onChange={(e) => setSearchText(e.target.value)}
          style={{ flex: 1, height: 36, borderRadius: 8, border: "1px solid #e2e8f0", padding: "0 12px", fontSize: 13, outline: "none", color: "#0f172a", background: "#f8fafc" }} />
        <Button icon={<ReloadOutlined />} onClick={loadItems} loading={loading} style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }} />
        <Dropdown menu={{ items: [{ key: "excel", label: "Export Excel", icon: <FileExcelOutlined />, onClick: onExportExcel }, { key: "pdf", label: "Export PDF", icon: <FilePdfOutlined />, onClick: onExportPDF }] }}>
          <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, height: 36, width: 36, padding: 0 }} />
        </Dropdown>
        <AddEditProInventoryModal actionRef={tableRef} />
      </div>

      {/* Import strip */}
      <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "10px 14px", marginBottom: 10, border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <Text strong style={{ fontSize: 13, color: "#065f46", display: "block" }}>Bulk Import</Text>
          <Text style={{ fontSize: 11, color: "#6b7280" }}>Upload an Excel file to add multiple items</Text>
        </div>
        <ImportInventoryModal onSuccess={() => { loadItems(); onImportSuccess(); }} />
      </div>

      {/* Bulk delete bar */}
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

      {/* Summary strip */}
      {!loading && items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Items", value: items.length, color: "#6366f1", bg: "#eef2ff" },
            { label: "Low Stock", value: lowStockCount, color: lowStockCount > 0 ? "#ef4444" : "#10b981", bg: lowStockCount > 0 ? "#fef2f2" : "#f0fdf4" },
            { label: "Total Value", value: `Ksh ${fmtK(totalValue)}`, color: "#10b981", bg: "#f0fdf4" },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: "#94a3b8" }}>{s.label}</Text>
            </div>
          ))}
        </div>
      )}

      {/* Cards */}
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => <Card key={i} style={{ borderRadius: 12, marginBottom: 10, border: "1px solid #e2e8f0" }} bodyStyle={{ padding: 14 }}><Skeleton active paragraph={{ rows: 2 }} /></Card>)
      ) : filtered.length === 0 ? (
        <Empty description="No inventory items found" style={{ padding: "40px 0" }} />
      ) : (
        filtered.map((record) => (
          <InventoryCard key={record._id} record={record} onDelete={(id) => deleteMutation.mutate(id)} deleting={deletingId === record._id}
            tableRef={tableRef} selected={selectedIds.has(record._id)} onSelect={handleSelect} selectMode={selectMode} />
        ))
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
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
          <Button danger size="small" icon={<DeleteOutlined />} loading={bulkDeleting} onClick={handleDeleteSelected} style={{ borderRadius: 6, fontWeight: 600 }}>
            Delete Selected
          </Button>
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