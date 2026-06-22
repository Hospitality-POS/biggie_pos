import React, { useState } from "react";
import { Typography, Card, Table, Button, Space, Tag, Input, Modal, Form, message, Drawer, Descriptions, Upload, Spin } from "antd";
import { PlusOutlined, EditOutlined, EyeOutlined, DeleteOutlined, UploadOutlined, ReloadOutlined, SearchOutlined, ArrowDownOutlined, ArrowRightOutlined, FileExcelOutlined, InboxOutlined, InfoCircleOutlined, CloseCircleOutlined, CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchBanks, createBank, updateBank, deleteBank, getBankById, importBanks, downloadBankTemplate, analyseBankFile, Bank } from "@services/hr";

const { Title, Text } = Typography;

// ── Types for bank import ────────────────────────────────────────────────────────
type AdviceItem = { level: "success" | "warning" | "error" | "info"; message: string };
type AnalysisResult = {
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
  previewRows: Array<{ rowNum: number; [key: string]: any }>;
};
type ImportResult = {
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    format_detected?: { sheet: string; header_row: number; mapped_columns: number };
    auto_created?: { departments?: string[]; banks?: string[] };
  };
  errors: Array<{ row: number; name: string; reason: string }>;
};

// ── Configuration ───────────────────────────────────────────────────────────────
const ADVICE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  success: { icon: <CheckCircleOutlined />, color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  warning: { icon: <WarningOutlined />, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  error: { icon: <CloseCircleOutlined />, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  info: { icon: <InfoCircleOutlined />, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
};

const FIELD_LABELS: Record<string, string> = {
  bank_code: "Bank Code",
  bank_name: "Bank Name",
  bank_branch: "Branch",
  swift_code: "SWIFT Code",
  phone: "Phone",
  email: "Email",
  address: "Address",
  city: "City",
  country: "Country",
};

// ─────────────────────────────────────────────────────────────────────────────
// SMART IMPORT MODAL (defined outside component to prevent re-render issues)
// ─────────────────────────────────────────────────────────────────────────────
const ImportBanksModal: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "analysing" | "advice" | "importing" | "result">("upload");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleOpen = () => { setOpen(true); reset(); };
  const handleClose = () => { if (step !== "analysing" && step !== "importing") { setOpen(false); reset(); } };
  const reset = () => { setFile(null); setStep("upload"); setAnalysis(null); setImportResult(null); };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const blob = await downloadBankTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bank_import_template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success("Template downloaded successfully");
    } catch (error) {
      message.error("Failed to download template");
    } finally {
      setDownloading(false);
    }
  };

  const handleAnalyse = async (selectedFile: File) => {
    setStep("analysing");
    try {
      const result = await analyseBankFile(selectedFile);
      setAnalysis(result);
      setStep("advice");
    } catch (err: any) {
      console.error("Analysis failed:", err);
      message.warning("File analysis not available, proceeding with direct import");
      setFile(selectedFile);
      setStep("advice");
      setAnalysis({
        canImport: true,
        sheetUsed: "Sheet1",
        headerRowDetectedAt: 1,
        totalDataRows: 0,
        mappedColumns: [],
        unmappedColumns: [],
        missingRequired: [],
        missingRecommended: [],
        columnMapping: {},
        advice: [{ level: "info", message: "File analysis skipped - importing directly" }],
        previewRows: [],
      });
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setStep("importing");
    try {
      const result = await importBanks(file);
      setImportResult(result);
      setStep("result");
      // Refresh bank list
      onSuccess();
      // Close modal after showing result
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      console.error("Import failed:", err);
      message.error(err?.message || "Import failed");
      setStep("advice");
    }
  };

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
      <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 6 }}>Upload any Excel file with bank data</Text>
      <Text style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 12 }}>
        We'll detect your column headers automatically and show you a preview before importing anything.
      </Text>
      <Upload.Dragger
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
      </Upload.Dragger>
      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={handleClose} style={{ borderRadius: 8 }}>Cancel</Button>
      </div>
    </div>
  );

  const renderAnalysing = () => (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <Spin size="large" />
      <Text style={{ display: "block", marginTop: 16, color: "#64748b", fontSize: 14 }}>Reading your file and detecting column format…</Text>
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
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 14 }}>
          {(() => {
            const adviceArray = Array.isArray(analysis.advice) ? analysis.advice : (analysis.advice ? [analysis.advice] : []);
            return adviceArray.map((item, i) => {
              const cfg = ADVICE_CONFIG[item.level];
              return (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, padding: "10px 12px" }}>
                  <span style={{ color: cfg.color, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
                  <Text style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{item.message}</Text>
                </div>
              );
            });
          })()}
        </div>
        <div style={{ marginBottom: 14 }}>
          <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 8 }}>
            Column mapping
            <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginLeft: 8 }}>* required · † recommended</Text>
          </Text>
          <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            {Array.isArray(analysis.mappedColumns) && analysis.mappedColumns.map((mapping) => (
              <div key={mapping.field} style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: "#64748b" }}>{mapping.header}</Text>
                <Text style={{ fontSize: 12, fontWeight: 500, color: "#0f172a" }}>{FIELD_LABELS[mapping.field] || mapping.field}</Text>
              </div>
            ))}
          </div>
        </div>
        {analysis.previewRows.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <Text strong style={{ fontSize: 13, color: "#374151", display: "block", marginBottom: 8 }}>Data preview (first 5 rows)</Text>
            <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              {analysis.previewRows.slice(0, 5).map((row, i) => (
                <div key={i} style={{ padding: "8px 12px", borderBottom: i < analysis.previewRows.length - 1 ? "1px solid #f1f5f9" : "none", fontSize: 11, color: "#64748b" }}>
                  Row {row.rowNum}: {Object.values(row).slice(0, 3).join(" • ")}
                </div>
              ))}
            </div>
          </div>
        )}
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

  const renderImporting = () => (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <Spin size="large" />
      <Text style={{ display: "block", marginTop: 16, color: "#64748b", fontSize: 14 }}>Importing banks…</Text>
    </div>
  );

  const renderResult = () => {
    if (!importResult) return null;
    const { summary, errors } = importResult;
    if (!summary) return null;
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Total Rows", value: summary.total || 0, color: "#6366f1", bg: "#eef2ff" },
            { label: "Created", value: summary.created || 0, color: "#059669", bg: "#f0fdf4" },
            { label: "Updated", value: summary.updated || 0, color: "#3b82f6", bg: "#eff6ff" },
            { label: "Failed", value: summary.errors || 0, color: summary.errors ? "#f59e0b" : "#10b981", bg: summary.errors ? "#fffbeb" : "#f0fdf4" },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "10px 8px", textAlign: "center" as const }}>
              <Text style={{ fontSize: 22, fontWeight: 700, color: s.color, display: "block" }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: "#6b7280" }}>{s.label}</Text>
            </div>
          ))}
        </div>
        {errors && errors.length > 0 && (
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
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={reset} style={{ flex: 1, borderRadius: 8, height: 38 }}>Import Another</Button>
          <Button type="primary" onClick={handleClose} style={{ flex: 1, borderRadius: 8, height: 38, background: "#059669", border: "none" }}>Done</Button>
        </div>
      </div>
    );
  };

  const STEP_TITLES: Record<string, string> = {
    upload: "Import Banks from Excel",
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

const BanksList: React.FC = () => {
  const [searchText, setSearchText] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [isEditDrawerVisible, setIsEditDrawerVisible] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: banksData, isLoading, refetch } = useQuery({
    queryKey: ["hr-banks", { search: searchText }],
    queryFn: () => fetchBanks({ search: searchText }),
  });

  const banks = Array.isArray(banksData) ? banksData : banksData?.banks || [];

  const { data: bankDetail } = useQuery({
    queryKey: ["hr-bank", selectedBankId],
    queryFn: () => getBankById(selectedBankId),
    enabled: !!selectedBankId && isDetailDrawerVisible,
  });

  const createMutation = useMutation({
    mutationFn: createBank,
    onSuccess: () => {
      message.success("Bank created successfully");
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["hr-banks"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to create bank");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Bank> }) => updateBank(id, data),
    onSuccess: () => {
      message.success("Bank updated successfully");
      setIsEditDrawerVisible(false);
      editForm.resetFields();
      setSelectedBankId("");
      queryClient.invalidateQueries({ queryKey: ["hr-banks"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to update bank");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBank,
    onSuccess: () => {
      message.success("Bank deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-banks"] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Failed to delete bank");
    },
  });

  const handleCreate = (values: any) => {
    createMutation.mutate(values);
  };

  const handleEditBank = (record: Bank) => {
    setSelectedBankId(record._id);
    editForm.setFieldsValue(record);
    setIsEditDrawerVisible(true);
  };

  const handleUpdate = (values: any) => {
    updateMutation.mutate({ id: selectedBankId, data: values });
  };

  const handleDeleteBank = (id: string) => {
    Modal.confirm({
      title: "Delete Bank",
      content: "Are you sure you want to delete this bank?",
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleViewBank = (id: string) => {
    setSelectedBankId(id);
    setIsDetailDrawerVisible(true);
  };

  const columns = [
    {
      title: "Bank Code",
      dataIndex: "bank_code",
      key: "bank_code",
    },
    {
      title: "Bank Name",
      dataIndex: "bank_name",
      key: "bank_name",
    },
    {
      title: "Branch",
      dataIndex: "bank_branch",
      key: "bank_branch",
    },
    {
      title: "SWIFT Code",
      dataIndex: "swift_code",
      key: "swift_code",
      render: (code: string) => code || "-",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      render: (phone: string) => phone || "-",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email: string) => email || "-",
    },
    {
      title: "Status",
      dataIndex: "active",
      key: "active",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "red"}>
          {active ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Bank) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewBank(record._id)}>
            View
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditBank(record)}>
            Edit
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteBank(record._id)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Title level={4} style={{ margin: 0 }}>
            Banks
          </Title>
          <Space>
            <Input
              placeholder="Search banks..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Refresh
            </Button>
            <ImportBanksModal onSuccess={() => refetch()} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
              Add Bank
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={banks}
          rowKey="_id"
          loading={isLoading}
          pagination={{
            total: banksData?.total || 0,
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} banks`,
          }}
        />
      </Card>

      <Modal
        title="Add Bank"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="bank_code" label="Bank Code" rules={[{ required: true }]}>
            <Input placeholder="e.g., KCB" />
          </Form.Item>
          <Form.Item name="bank_name" label="Bank Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Kenya Commercial Bank" />
          </Form.Item>
          <Form.Item name="bank_branch" label="Branch" rules={[{ required: true }]}>
            <Input placeholder="e.g., Nairobi Branch" />
          </Form.Item>
          <Form.Item name="swift_code" label="SWIFT Code">
            <Input placeholder="e.g., KCBLKENX" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="e.g., +254 123 456 789" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="e.g., info@kcb.co.ke" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} placeholder="Street address" />
          </Form.Item>
          <Form.Item name="city" label="City">
            <Input placeholder="e.g., Nairobi" />
          </Form.Item>
          <Form.Item name="country" label="Country">
            <Input placeholder="e.g., Kenya" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="Bank Details"
        placement="right"
        width={720}
        open={isDetailDrawerVisible}
        onClose={() => {
          setIsDetailDrawerVisible(false);
          setSelectedBankId("");
        }}
      >
        {bankDetail && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Bank Code">{bankDetail.bank_code}</Descriptions.Item>
            <Descriptions.Item label="Bank Name">{bankDetail.bank_name}</Descriptions.Item>
            <Descriptions.Item label="Branch">{bankDetail.bank_branch}</Descriptions.Item>
            <Descriptions.Item label="SWIFT Code">{bankDetail.swift_code || "-"}</Descriptions.Item>
            <Descriptions.Item label="Phone">{bankDetail.phone || "-"}</Descriptions.Item>
            <Descriptions.Item label="Email">{bankDetail.email || "-"}</Descriptions.Item>
            <Descriptions.Item label="Address" span={2}>{bankDetail.address || "-"}</Descriptions.Item>
            <Descriptions.Item label="City">{bankDetail.city || "-"}</Descriptions.Item>
            <Descriptions.Item label="Country">{bankDetail.country || "-"}</Descriptions.Item>
            <Descriptions.Item label="Status" span={2}>
              <Tag color={bankDetail.active ? "green" : "red"}>
                {bankDetail.active ? "Active" : "Inactive"}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Drawer
        title="Edit Bank"
        placement="right"
        width={720}
        open={isEditDrawerVisible}
        onClose={() => {
          setIsEditDrawerVisible(false);
          editForm.resetFields();
          setSelectedBankId("");
        }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="bank_code" label="Bank Code" rules={[{ required: true }]}>
            <Input placeholder="e.g., KCB" />
          </Form.Item>
          <Form.Item name="bank_name" label="Bank Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Kenya Commercial Bank" />
          </Form.Item>
          <Form.Item name="bank_branch" label="Branch" rules={[{ required: true }]}>
            <Input placeholder="e.g., Nairobi Branch" />
          </Form.Item>
          <Form.Item name="swift_code" label="SWIFT Code">
            <Input placeholder="e.g., KCBLKENX" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="e.g., +254 123 456 789" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="e.g., info@kcb.co.ke" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} placeholder="Street address" />
          </Form.Item>
          <Form.Item name="city" label="City">
            <Input placeholder="e.g., Nairobi" />
          </Form.Item>
          <Form.Item name="country" label="Country">
            <Input placeholder="e.g., Kenya" />
          </Form.Item>
          <Form.Item name="active" label="Status" valuePropName="checked">
            <input type="checkbox" />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsEditDrawerVisible(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
              Update Bank
            </Button>
          </div>
        </Form>
      </Drawer>
    </div>
  );
};

export default BanksList;
