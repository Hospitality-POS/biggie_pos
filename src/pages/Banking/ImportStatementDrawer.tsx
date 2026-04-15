import React, { useState, useEffect } from "react";
import {
    ProForm, ProFormSelect, ProFormText,
    ProFormDateRangePicker, ProFormDigit, ProFormTextArea,
} from "@ant-design/pro-components";
import {
    Drawer, Divider, Typography, Upload, Alert, Space,
    Tag, Table, Button, Steps, Card, Select, Form, Row, Col,
    Tabs, Progress, Spin,
} from "antd";
import {
    InboxOutlined, FileExcelOutlined, CheckCircleOutlined,
    ArrowRightOutlined, SettingOutlined, FilePdfOutlined,
    CloudUploadOutlined, ReloadOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
    importStatement,
    uploadAndParseStatement,
    getColumnMappings,
    ColumnMapping,
    ImportStatementInput,
} from "@services/accounting/bankStatementImport";
import { getAllAccounts } from "@services/accounting/accounts";
import dayjs from "dayjs";

const { Text, Title } = Typography;
const { Dragger } = Upload;

interface ParsedRow {
    transaction_date: string;
    description: string;
    reference?: string;
    debit: number;
    credit: number;
    balance?: number;
    raw_row?: Record<string, any>;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    shopId: string;
}

const STEP_LABELS = ["Upload File", "Map Columns", "Preview & Import"];
const IMPORT_METHODS = [
    { key: "manual", label: "Manual Mapping", icon: <SettingOutlined /> },
    { key: "auto", label: "Auto-Detect (PDF)", icon: <FilePdfOutlined /> },
];

const ImportStatementDrawer: React.FC<Props> = ({ open, onClose, onSuccess, shopId }) => {
    const [form] = ProForm.useForm();
    const [currentStep, setCurrentStep] = useState(0);
    const [importMethod, setImportMethod] = useState<"manual" | "auto">("manual");
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [selectedMapping, setSelectedMapping] = useState<string | null>(null);
    const [columnMap, setColumnMap] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [fileName, setFileName] = useState<string>("");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [autoDetectedData, setAutoDetectedData] = useState<any>(null);

    const { data: mappingsData } = useQuery({
        queryKey: ["column-mappings", shopId],
        queryFn: () => getColumnMappings(shopId),
        enabled: open && importMethod === "manual",
    });

    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts", shopId],
        queryFn: () => getAllAccounts({ shop_id: shopId }),
        enabled: open,
    });

    const uploadMutation = useMutation({
        mutationFn: (formData: FormData) => uploadAndParseStatement(formData),
        onSuccess: (data) => {
            setAutoDetectedData(data);
            setParsedRows(data.parsed_transactions || []);
            setFileName(data.original_filename || "");
            setCurrentStep(2);
            setUploadProgress(100);

            // Auto-fill form with detected data
            if (data.statement_from || data.statement_to) {
                form.setFieldsValue({
                    period: [
                        data.statement_from ? dayjs(data.statement_from) : null,
                        data.statement_to ? dayjs(data.statement_to) : null,
                    ],
                    opening_balance: data.opening_balance || 0,
                    closing_balance: data.closing_balance || 0,
                });
            }
        },
        onError: (error: any) => {
            setUploadProgress(0);
        },
    });

    const columnMappings = mappingsData?.mappings || [];
    const accounts = (accountsData?.accounts || []).filter((a: any) =>
        a.is_bank_account || a.account_type === "ASSET" || a.account_type === "BANK"
    );

    useEffect(() => {
        if (!open) {
            resetState();
        }
    }, [open]);

    const resetState = () => {
        setCurrentStep(0);
        setImportMethod("manual");
        setFileHeaders([]);
        setRawRows([]);
        setParsedRows([]);
        setSelectedMapping(null);
        setColumnMap({});
        setFileName("");
        setUploadProgress(0);
        setAutoDetectedData(null);
        form.resetFields();
    };

    useEffect(() => {
        if (selectedMapping && columnMappings.length && importMethod === "manual") {
            const mapping = columnMappings.find((m: ColumnMapping) => m._id === selectedMapping);
            if (mapping?.field_map) {
                const newMap: Record<string, string> = {};
                Object.entries(mapping.field_map).forEach(([field, header]) => {
                    if (header && fileHeaders.includes(header as string)) {
                        newMap[field] = header as string;
                    }
                });
                setColumnMap(newMap);
            }
        }
    }, [selectedMapping, columnMappings, fileHeaders, importMethod]);

    const parseExcelFile = (file: File) => {
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array", cellDates: true });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { raw: false });
            if (rows.length > 0) {
                setFileHeaders(Object.keys(rows[0]));
                setRawRows(rows);
                setCurrentStep(1);
            }
        };
        reader.readAsArrayBuffer(file);
        return false;
    };

    const parsePDFFile = (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("shop_id", shopId);
        formData.append("bank_format", "auto");

        // Simulate progress
        const interval = setInterval(() => {
            setUploadProgress((prev) => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                return prev + 10;
            });
        }, 500);

        uploadMutation.mutate(formData, {
            onSettled: () => clearInterval(interval),
        });
        return false;
    };

    const handleFileUpload = (file: File) => {
        const isExcel = file.name.match(/\.(xlsx|xls|csv)$/i);
        const isPDF = file.name.match(/\.pdf$/i);

        if (isExcel && importMethod === "manual") {
            parseExcelFile(file);
        } else if (isPDF && importMethod === "auto") {
            parsePDFFile(file);
        } else {
            // Show error if method mismatch
            return false;
        }
        return false;
    };

    const applyMapping = () => {
        const dateKey = columnMap["date"];
        const descKey = columnMap["description"];
        const debitKey = columnMap["debit"];
        const creditKey = columnMap["credit"];
        const amtKey = columnMap["amount"];
        const refKey = columnMap["reference"];
        const balKey = columnMap["balance"];

        const parsed: ParsedRow[] = rawRows
            .map((row) => {
                const description = row[descKey] || "";
                if (!description) return null;

                let debit = 0;
                let credit = 0;

                if (amtKey && row[amtKey] !== undefined) {
                    const amt = parseFloat(String(row[amtKey]).replace(/,/g, "")) || 0;
                    if (amt < 0) debit = Math.abs(amt);
                    else credit = amt;
                } else {
                    debit = parseFloat(String(row[debitKey] || 0).replace(/,/g, "")) || 0;
                    credit = parseFloat(String(row[creditKey] || 0).replace(/,/g, "")) || 0;
                }

                const rawDate = row[dateKey];
                let transaction_date = "";
                if (rawDate) {
                    const parsed = dayjs(rawDate);
                    transaction_date = parsed.isValid() ? parsed.toISOString() : rawDate;
                }

                return {
                    transaction_date,
                    description: String(description).trim(),
                    reference: refKey ? String(row[refKey] || "").trim() : undefined,
                    debit,
                    credit,
                    balance: balKey ? parseFloat(String(row[balKey] || 0).replace(/,/g, "")) || undefined : undefined,
                    raw_row: row,
                };
            })
            .filter(Boolean) as ParsedRow[];

        setParsedRows(parsed);
        setCurrentStep(2);
    };

    const handleImport = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            let payload: ImportStatementInput;

            if (importMethod === "auto" && autoDetectedData) {
                // Use auto-detected data
                payload = {
                    shop_id: shopId,
                    account_id: values.account_id,
                    source_type: "pdf",
                    original_filename: fileName,
                    statement_from: values.period?.[0]?.toISOString() || autoDetectedData.statement_from,
                    statement_to: values.period?.[1]?.toISOString() || autoDetectedData.statement_to,
                    opening_balance: values.opening_balance || autoDetectedData.opening_balance || 0,
                    closing_balance: values.closing_balance || autoDetectedData.closing_balance || 0,
                    transactions: parsedRows.map((r) => ({
                        transaction_date: r.transaction_date,
                        description: r.description,
                        reference: r.reference,
                        debit: r.debit,
                        credit: r.credit,
                        balance: r.balance,
                        raw_row: r.raw_row,
                    })),
                    notes: values.notes,
                };
            } else {
                // Manual mapping
                payload = {
                    shop_id: shopId,
                    account_id: values.account_id,
                    source_type: fileName.endsWith(".csv") ? "csv" : "excel",
                    original_filename: fileName,
                    column_mapping_id: selectedMapping || undefined,
                    statement_from: values.period?.[0]?.toISOString(),
                    statement_to: values.period?.[1]?.toISOString(),
                    opening_balance: values.opening_balance || 0,
                    closing_balance: values.closing_balance || 0,
                    transactions: parsedRows.map((r) => ({
                        transaction_date: r.transaction_date,
                        description: r.description,
                        reference: r.reference,
                        debit: r.debit,
                        credit: r.credit,
                        balance: r.balance,
                        raw_row: r.raw_row,
                    })),
                    notes: values.notes,
                };
            }

            await importStatement(payload);
            onSuccess();
            onClose();
        } catch (err) {
            // validation or API error — antd message handled in service
        } finally {
            setSubmitting(false);
        }
    };

    const INTERNAL_FIELDS = [
        { key: "date", label: "Transaction Date *", required: true },
        { key: "description", label: "Description *", required: true },
        { key: "debit", label: "Debit (Outflow)" },
        { key: "credit", label: "Credit (Inflow)" },
        { key: "amount", label: "Single Amount Column" },
        { key: "reference", label: "Reference / Cheque No" },
        { key: "balance", label: "Running Balance" },
    ];

    const headerOptions = fileHeaders.map((h) => ({ label: h, value: h }));

    const previewColumns = [
        { title: "Date", dataIndex: "transaction_date", width: 120, render: (v: string) => dayjs(v).isValid() ? dayjs(v).format("DD MMM YYYY") : v },
        { title: "Description", dataIndex: "description", ellipsis: true },
        { title: "Reference", dataIndex: "reference", width: 120 },
        {
            title: "Debit", dataIndex: "debit", width: 110, align: "right" as const,
            render: (v: number) => v > 0 ? <Text style={{ color: "#cf1322" }}>{v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text> : <Text type="secondary">—</Text>,
        },
        {
            title: "Credit", dataIndex: "credit", width: 110, align: "right" as const,
            render: (v: number) => v > 0 ? <Text style={{ color: "#389e0d" }}>{v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text> : <Text type="secondary">—</Text>,
        },
    ];

    const accountOptions = accounts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));

    const mappingOptions = columnMappings.map((m: ColumnMapping) => ({
        label: `${m.name}${m.is_default ? " (Default)" : ""}${m.bank_name ? ` — ${m.bank_name}` : ""}`,
        value: m._id,
    }));

    const isMappingValid = columnMap["date"] && columnMap["description"];
    const isLoading = uploadMutation.isPending;

    return (
        <Drawer
            title={
                <Space>
                    {importMethod === "auto" ?
                        <FilePdfOutlined style={{ color: "#ff4d4f" }} /> :
                        <FileExcelOutlined style={{ color: "#52c41a" }} />
                    }
                    <Text strong>Import Bank Statement</Text>
                    {fileName && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                            {fileName}
                        </Tag>
                    )}
                </Space>
            }
            open={open}
            onClose={onClose}
            width={820}
            destroyOnClose
            footer={
                <Space style={{ justifyContent: "flex-end", width: "100%", display: "flex" }}>
                    <Button onClick={onClose}>Cancel</Button>
                    {currentStep > 0 && currentStep < 2 && (
                        <Button onClick={() => setCurrentStep(currentStep - 1)}>Back</Button>
                    )}
                    {currentStep === 1 && importMethod === "manual" && (
                        <Button
                            type="primary"
                            icon={<ArrowRightOutlined />}
                            onClick={applyMapping}
                            disabled={!isMappingValid}
                        >
                            Preview
                        </Button>
                    )}
                    {currentStep === 2 && (
                        <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={handleImport}
                            loading={submitting}
                            disabled={parsedRows.length === 0}
                        >
                            Import {parsedRows.length} Transactions
                        </Button>
                    )}
                </Space>
            }
        >
            <Steps
                current={currentStep}
                items={STEP_LABELS.map((t) => ({ title: t }))}
                style={{ marginBottom: 24 }}
                size="small"
            />

            {/* ── Step 0: Upload with Method Selection ── */}
            {currentStep === 0 && (
                <Space direction="vertical" style={{ width: "100%" }} size={16}>
                    <Alert
                        type="info"
                        showIcon
                        message="Choose import method"
                        description={
                            <div>
                                <p><strong>Manual Mapping:</strong> Upload Excel/CSV files and map columns manually or use saved templates.</p>
                                <p><strong>Auto-Detect (PDF):</strong> Upload PDF bank statements - automatically detects transactions from major Kenyan banks (Equity, KCB, Absa, etc.)</p>
                            </div>
                        }
                    />

                    <Tabs
                        activeKey={importMethod}
                        onChange={(key) => setImportMethod(key as "manual" | "auto")}
                        items={IMPORT_METHODS.map(method => ({
                            key: method.key,
                            label: (
                                <Space>
                                    {method.icon}
                                    {method.label}
                                </Space>
                            ),
                            children: null,
                        }))}
                    />

                    {importMethod === "manual" && (
                        <>
                            <Dragger
                                accept=".xlsx,.xls,.csv"
                                beforeUpload={parseExcelFile}
                                showUploadList={false}
                                multiple={false}
                            >
                                <p className="ant-upload-drag-icon">
                                    <InboxOutlined style={{ color: "#52c41a", fontSize: 40 }} />
                                </p>
                                <p className="ant-upload-text">Click or drag an Excel/CSV file here</p>
                                <p className="ant-upload-hint">
                                    Excel (.xlsx, .xls) or CSV format — first row must be headers
                                </p>
                            </Dragger>
                        </>
                    )}

                    {importMethod === "auto" && (
                        <>
                            {isLoading ? (
                                <Card>
                                    <Space direction="vertical" style={{ width: "100%" }} align="center">
                                        <Spin size="large" />
                                        <Progress percent={uploadProgress} status="active" />
                                        <Text type="secondary">Parsing PDF statement...</Text>
                                    </Space>
                                </Card>
                            ) : (
                                <Dragger
                                    accept=".pdf"
                                    beforeUpload={handleFileUpload}
                                    showUploadList={false}
                                    multiple={false}
                                >
                                    <p className="ant-upload-drag-icon">
                                        <FilePdfOutlined style={{ color: "#ff4d4f", fontSize: 40 }} />
                                    </p>
                                    <p className="ant-upload-text">Click or drag a PDF bank statement here</p>
                                    <p className="ant-upload-hint">
                                        Supports Equity, KCB, Absa, Stanbic, and Cooperative Bank formats
                                    </p>
                                </Dragger>
                            )}
                        </>
                    )}
                </Space>
            )}

            {/* ── Step 1: Map Columns (Manual only) ── */}
            {currentStep === 1 && importMethod === "manual" && (
                <Space direction="vertical" style={{ width: "100%" }} size={16}>
                    <Alert
                        type="success"
                        showIcon
                        message={`${rawRows.length} rows detected in "${fileName}"`}
                        description={`Headers found: ${fileHeaders.join(", ")}`}
                    />

                    <Card size="small" title={<Space><SettingOutlined /><Text>Column Mapping Template</Text></Space>}>
                        <Space direction="vertical" style={{ width: "100%" }} size={8}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Load a saved template or map columns manually below
                            </Text>
                            <Select
                                placeholder="Load a saved column mapping template..."
                                options={mappingOptions}
                                value={selectedMapping}
                                onChange={setSelectedMapping}
                                style={{ width: "100%" }}
                                allowClear
                            />
                        </Space>
                    </Card>

                    <Divider orientation="left" plain>
                        <Text type="secondary" style={{ fontSize: 12 }}>Map your columns</Text>
                    </Divider>

                    <Row gutter={[12, 12]}>
                        {INTERNAL_FIELDS.map((field) => (
                            <Col span={12} key={field.key}>
                                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                                    <Text style={{ fontSize: 12 }}>
                                        {field.label}
                                        {field.required && <span style={{ color: "#ff4d4f" }}>*</span>}
                                    </Text>
                                    <Select
                                        placeholder="Select column..."
                                        options={headerOptions}
                                        value={columnMap[field.key]}
                                        onChange={(v) => setColumnMap((prev) => ({ ...prev, [field.key]: v }))}
                                        style={{ width: "100%" }}
                                        allowClear
                                        showSearch
                                    />
                                </Space>
                            </Col>
                        ))}
                    </Row>

                    {!isMappingValid && (
                        <Alert
                            type="warning"
                            showIcon
                            message="Date and Description fields are required for mapping"
                            style={{ marginTop: 8 }}
                        />
                    )}
                </Space>
            )}

            {/* ── Step 2: Preview & Import ── */}
            {currentStep === 2 && (
                <Space direction="vertical" style={{ width: "100%" }} size={16}>
                    <Alert
                        type="success"
                        showIcon
                        message={`${parsedRows.length} transactions ready to import`}
                        description={
                            <Space split={<Divider type="vertical" />}>
                                <Text type="danger">
                                    Total Debits: {parsedRows.reduce((s, r) => s + r.debit, 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                </Text>
                                <Text type="success">
                                    Total Credits: {parsedRows.reduce((s, r) => s + r.credit, 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                </Text>
                                {autoDetectedData?.auto_categorized !== undefined && (
                                    <Tag color="green">
                                        {autoDetectedData.auto_categorized} auto-categorized
                                    </Tag>
                                )}
                            </Space>
                        }
                    />

                    <ProForm
                        form={form}
                        submitter={false}
                        layout="vertical"
                        initialValues={{
                            opening_balance: autoDetectedData?.opening_balance || 0,
                            closing_balance: autoDetectedData?.closing_balance || 0,
                        }}
                    >
                        <ProFormSelect
                            name="account_id"
                            label="Bank Account"
                            options={accountOptions}
                            placeholder="Select the bank / cash account"
                            rules={[{ required: true, message: "Account is required" }]}
                            showSearch
                            fieldProps={{ optionFilterProp: "label" }}
                        />
                        <Row gutter={12}>
                            <Col span={12}>
                                <ProFormDigit
                                    name="opening_balance"
                                    label="Opening Balance"
                                    placeholder="0.00"
                                    fieldProps={{ precision: 2, prefix: "KES" }}
                                />
                            </Col>
                            <Col span={12}>
                                <ProFormDigit
                                    name="closing_balance"
                                    label="Closing / Statement Balance"
                                    placeholder="0.00"
                                    fieldProps={{ precision: 2, prefix: "KES" }}
                                />
                            </Col>
                        </Row>
                        <ProFormDateRangePicker
                            name="period"
                            label="Statement Period"
                            fieldProps={{ style: { width: "100%" } }}
                        />
                        <ProFormTextArea
                            name="notes"
                            label="Notes"
                            placeholder="Optional notes about this import"
                            fieldProps={{ rows: 2 }}
                        />
                    </ProForm>

                    <Divider orientation="left" plain>
                        <Text type="secondary" style={{ fontSize: 12 }}>Transaction Preview (first 10)</Text>
                    </Divider>

                    <Table
                        rowKey={(_, i) => String(i)}
                        dataSource={parsedRows.slice(0, 10)}
                        columns={previewColumns}
                        size="small"
                        pagination={false}
                        scroll={{ x: 600 }}
                    />

                    {parsedRows.length > 10 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            …and {parsedRows.length - 10} more transactions
                        </Text>
                    )}
                </Space>
            )}
        </Drawer>
    );
};

export default ImportStatementDrawer;