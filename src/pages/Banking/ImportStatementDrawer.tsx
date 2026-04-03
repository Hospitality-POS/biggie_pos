import React, { useState, useEffect } from "react";
import {
    ProForm, ProFormSelect, ProFormText,
    ProFormDateRangePicker, ProFormDigit, ProFormTextArea,
} from "@ant-design/pro-components";
import {
    Drawer, Divider, Typography, Upload, Alert, Space,
    Tag, Table, Button, Steps, Card, Select, Form, Row, Col,
} from "antd";
import {
    InboxOutlined, FileExcelOutlined, CheckCircleOutlined,
    ArrowRightOutlined, SettingOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
    importStatement,
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

const ImportStatementDrawer: React.FC<Props> = ({ open, onClose, onSuccess, shopId }) => {
    const [form] = ProForm.useForm();
    const [currentStep, setCurrentStep] = useState(0);
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [selectedMapping, setSelectedMapping] = useState<string | null>(null);
    const [columnMap, setColumnMap] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [fileName, setFileName] = useState<string>("");

    const { data: mappingsData } = useQuery({
        queryKey: ["column-mappings", shopId],
        queryFn: () => getColumnMappings(shopId),
        enabled: open,
    });

    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts", shopId],
        queryFn: () => getAllAccounts({ shop_id: shopId }),
        enabled: open,
    });

    const columnMappings = mappingsData?.mappings || [];
    const accounts = (accountsData?.accounts || []).filter((a: any) => a.is_bank_account || a.account_type === "ASSET");

    useEffect(() => {
        if (!open) {
            setCurrentStep(0);
            setFileHeaders([]);
            setRawRows([]);
            setParsedRows([]);
            setSelectedMapping(null);
            setColumnMap({});
            setFileName("");
            form.resetFields();
        }
    }, [open, form]);

    useEffect(() => {
        if (selectedMapping && columnMappings.length) {
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
    }, [selectedMapping, columnMappings, fileHeaders]);

    const parseFile = (file: File) => {
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

            const payload: ImportStatementInput = {
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
        { key: "date", label: "Transaction Date *" },
        { key: "description", label: "Description *" },
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

    return (
        <Drawer
            title={
                <Space>
                    <FileExcelOutlined style={{ color: "#52c41a" }} />
                    <Text strong>Import Bank Statement</Text>
                </Space>
            }
            open={open}
            onClose={onClose}
            width={760}
            destroyOnClose
            footer={
                <Space style={{ justifyContent: "flex-end", width: "100%", display: "flex" }}>
                    <Button onClick={onClose}>Cancel</Button>
                    {currentStep > 0 && (
                        <Button onClick={() => setCurrentStep(currentStep - 1)}>Back</Button>
                    )}
                    {currentStep === 1 && (
                        <Button
                            type="primary"
                            icon={<ArrowRightOutlined />}
                            onClick={applyMapping}
                            disabled={!columnMap["date"] || !columnMap["description"]}
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

            {/* ── Step 0: Upload ── */}
            {currentStep === 0 && (
                <Space direction="vertical" style={{ width: "100%" }} size={16}>
                    <Alert
                        type="info"
                        showIcon
                        message="Supported formats: Excel (.xlsx, .xls) and CSV (.csv)"
                        description="The first row should contain column headers. Up to 5,000 rows per import."
                    />
                    <Dragger
                        accept=".xlsx,.xls,.csv"
                        beforeUpload={parseFile}
                        showUploadList={false}
                        multiple={false}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined style={{ color: "#52c41a", fontSize: 40 }} />
                        </p>
                        <p className="ant-upload-text">Click or drag a bank statement file here</p>
                        <p className="ant-upload-hint">Excel or CSV format — first row must be headers</p>
                    </Dragger>
                </Space>
            )}

            {/* ── Step 1: Map Columns ── */}
            {currentStep === 1 && (
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
                                    <Text style={{ fontSize: 12 }}>{field.label}</Text>
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
                </Space>
            )}

            {/* ── Step 2: Preview & Import ── */}
            {currentStep === 2 && (
                <Space direction="vertical" style={{ width: "100%" }} size={16}>
                    <Alert
                        type="success"
                        showIcon
                        message={`${parsedRows.length} transactions ready to import`}
                        description={`Total Debits: ${parsedRows.reduce((s, r) => s + r.debit, 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })} | Total Credits: ${parsedRows.reduce((s, r) => s + r.credit, 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`}
                    />

                    <ProForm
                        form={form}
                        submitter={false}
                        layout="vertical"
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
                            placeholder="Optional"
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