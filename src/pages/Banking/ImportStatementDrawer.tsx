import React, { useState, useEffect } from "react";
import {
    ProForm, ProFormText,
    ProFormDatePicker, ProFormDigit, ProFormTextArea,
} from "@ant-design/pro-components";
import {
    Drawer, Divider, Typography, Upload, Alert, Space,
    Tag, Table, Button, Steps, Card, Select, Form, Row, Col,
    Tabs, Progress, Spin, message, Radio,
} from "antd";
import {
    InboxOutlined, FileExcelOutlined, CheckCircleOutlined,
    ArrowRightOutlined, SettingOutlined, FilePdfOutlined,
    CloudUploadOutlined, ReloadOutlined, BankOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import {
    importStatement,
    uploadAndParseStatement,
    ImportStatementInput,
    downloadExcelTemplate,
    downloadPDFTemplate,
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
    original_amount?: number;
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

const HEADER_PATTERNS: Record<string, string[]> = {
    date: ["transaction date", "date", "value date", "posting date"],
    description: ["description", "narrative", "details", "particulars", "transaction description"],
    reference: ["reference", "ref", "cheque no", "cheque", "check no", "transaction id"],
    debit: ["debits", "debit", "dr", "withdrawal", "money out", "amount out", "paid out"],
    credit: ["credits", "credit", "cr", "deposit", "money in", "amount in", "paid in"],
    amount: ["amount", "transaction amount", "amount (kes)", "amt"],
};

const inferColumnMap = (headers: string[]): Record<string, string> => {
    const map: Record<string, string> = {};
    Object.entries(HEADER_PATTERNS).forEach(([key, patterns]) => {
        const exact = headers.find((h) =>
            patterns.some((p) => h.toLowerCase().trim() === p)
        );
        if (exact) {
            map[key] = exact;
            return;
        }
        const partial = headers.find((h) =>
            patterns.some((p) => h.toLowerCase().includes(p))
        );
        if (partial) map[key] = partial;
    });
    return map;
};

const ImportStatementDrawer: React.FC<Props> = ({ open, onClose, onSuccess, shopId }) => {
    const [form] = ProForm.useForm();
    const [currentStep, setCurrentStep] = useState(0);
    const [importMethod, setImportMethod] = useState<"manual" | "auto">("manual");
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [fileName, setFileName] = useState<string>("");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [autoDetectedData, setAutoDetectedData] = useState<any>(null);
    const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
    const [selectedDateFormat, setSelectedDateFormat] = useState<string>("DD/MM/YYYY");
    const [amountColumnType, setAmountColumnType] = useState<"double" | "single">("double");
    const [columnMap, setColumnMap] = useState<Record<string, string>>({});

    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts", shopId],
        enabled: open,
        queryFn: () => getAllAccounts({ shop_id: shopId }),
    });

    const accounts = (accountsData?.accounts || []).filter((a: any) =>
        a.account_subtype === "Cash & Bank" && a.is_bank_account === true
    );

    const uploadMutation = useMutation({
        mutationFn: (formData: FormData) => uploadAndParseStatement(formData),
        onSuccess: (data) => {
            setAutoDetectedData(data);
            setParsedRows(data.parsed_transactions || []);
            setFileName(data.original_filename || "");
            setCurrentStep(2);
            setUploadProgress(100);

            // Auto-fill form with detected data
            if (data.statement_to) {
                form.setFieldsValue({
                    last_date: dayjs(data.statement_to),
                    opening_balance: data.opening_balance || 0,
                    closing_balance: data.closing_balance || 0,
                });
            }
        },
        onError: (error: any) => {
            setUploadProgress(0);
            const errorMessage = error?.response?.data?.message || error?.message || 'Upload failed. Please try again.';
            message.error(errorMessage);
            if (errorMessage.includes('account_id')) {
                setSelectedAccountId("");
            }
        },
    });

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
        setColumnMap({});
        setFileName("");
        setUploadProgress(0);
        setAutoDetectedData(null);
        setSelectedAccountId(undefined);
        setSelectedDateFormat("DD/MM/YYYY");
        setAmountColumnType("double");
        form.resetFields();
    };

    const parseExcelFile = (file: File) => {
        setFileName(file.name);

        const isHeaderRow = (row: any[]) => {
            const recognized = [
                "transaction date", "value date", "posting date", "date",
                "description", "narrative", "particulars", "details",
                "reference", "ref", "cheque", "check", "transaction id",
                "debits", "debit", "withdrawal", "money out", "dr",
                "credits", "credit", "deposit", "money in", "cr",
                "amount",
            ];
            let score = 0;
            row.forEach((cell) => {
                const s = String(cell || "").toLowerCase().trim();
                if (s && recognized.some((k) => s.includes(k))) score += 1;
            });
            return score >= 2;
        };

        const processRows = (rawRows: any[][]) => {
            const headerIndex = rawRows.findIndex((r) => r.length >= 3 && isHeaderRow(r));
            if (headerIndex === -1) {
                message.error("Could not detect a header row. Make sure the file has column headers.");
                return;
            }

            const headers = rawRows[headerIndex].map((h) => String(h || "").trim()).filter((h) => h.length > 0);
            const data = rawRows.slice(headerIndex + 1);

            const rows: Record<string, any>[] = data.map((r) => {
                const obj: Record<string, any> = {};
                headers.forEach((h, i) => {
                    obj[h] = r[i];
                });
                return obj;
            }).filter((r) => Object.values(r).some((v) => v !== undefined && v !== "" && v !== null));

            if (rows.length > 0) {
                setFileHeaders(headers);
                setRawRows(rows);

                const inferredMap = inferColumnMap(headers);
                setColumnMap(inferredMap);

                if (inferredMap.debit && inferredMap.credit) {
                    setAmountColumnType("double");
                } else if (inferredMap.amount) {
                    setAmountColumnType("single");
                }

                setCurrentStep(1);
            } else {
                message.error("No data rows found after the header.");
            }
        };

        const fileExt = file.name.split(".").pop()?.toLowerCase();

        if (fileExt === "csv") {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = String(e.target?.result || "").replace(/^\uFEFF/, "");
                const parsed = Papa.parse(text, {
                    header: false,
                    skipEmptyLines: true,
                    dynamicTyping: false,
                });
                processRows(parsed.data as any[][]);
            };
            reader.readAsText(file);
            return false;
        }

        // Excel (.xlsx, .xls)
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array", cellDates: true });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
            processRows(rawRows);
        };
        reader.readAsArrayBuffer(file);
        return false;
    };

    const parsePDFFile = (file: File) => {
        if (!selectedAccountId) {
            message.error("Please select a bank account before uploading");
            return false;
        }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("shop_id", shopId);
        formData.append("account_id", selectedAccountId);
        formData.append("bank_format", "auto");

        // Reset progress
        setUploadProgress(0);

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
        const fileSize = file.size / 1024 / 1024; // Size in MB

        // Validate file size (10MB limit as per guide)
        if (fileSize > 10) {
            message.error(`File size (${fileSize.toFixed(2)}MB) exceeds 10MB limit`);
            return false;
        }

        if (isExcel && importMethod === "manual") {
            parseExcelFile(file);
        } else if (isPDF && importMethod === "auto") {
            parsePDFFile(file);
        } else {
            // Show error if method mismatch
            const expectedFormat = importMethod === "manual" ? "Excel (.xlsx, .xls, .csv)" : "PDF (.pdf)";
            message.error(`Invalid file format. Expected: ${expectedFormat}`);
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

        const parsed: ParsedRow[] = rawRows
            .map((row) => {
                const description = row[descKey] || "";
                if (!description) return null;

                let debit = 0;
                let credit = 0;
                let originalAmount: number | undefined;

                if (amountColumnType === "single") {
                    // Single column: negative = debit, positive = credit
                    if (amtKey && row[amtKey] !== undefined) {
                        const amt = parseFloat(String(row[amtKey]).replace(/,/g, "")) || 0;
                        originalAmount = amt; // Store original signed amount
                        if (amt < 0) debit = Math.abs(amt);
                        else credit = amt;
                    }
                } else {
                    // Double column: separate debit and credit
                    // Use abs so statements with signed values in either column still render in the right column
                    debit = Math.abs(parseFloat(String(row[debitKey] || 0).replace(/,/g, "")) || 0);
                    credit = Math.abs(parseFloat(String(row[creditKey] || 0).replace(/,/g, "")) || 0);
                }

                const rawDate = row[dateKey];
                let transaction_date = "";
                if (rawDate) {
                    const parsed = dayjs(rawDate, selectedDateFormat);
                    transaction_date = parsed.isValid() ? parsed.toISOString() : rawDate;
                }

                return {
                    transaction_date,
                    description: String(description).trim(),
                    reference: refKey ? String(row[refKey] || "").trim() : undefined,
                    debit,
                    credit,
                    original_amount: originalAmount,
                    raw_row: row,
                };
            })
            .filter(Boolean) as ParsedRow[];

        setParsedRows(parsed);

        // Auto-fill last date, opening balance, and closing balance
        if (parsed.length > 0) {
            const validDates = parsed
                .map((r) => dayjs(r.transaction_date))
                .filter((d) => d.isValid())
                .sort((a, b) => a.valueOf() - b.valueOf());

            if (validDates.length > 0) {
                const lastDate = validDates[validDates.length - 1];

                form.setFieldsValue({
                    last_date: lastDate,
                });
            }

            // Try to determine opening and closing balances from transactions
            // For closing balance, use the last transaction's running balance if available
            // For opening balance, we can estimate from the first transaction or use 0
            const lastTransaction = parsed[parsed.length - 1];
            const firstTransaction = parsed[0];

            // Calculate closing balance from the data
            let closingBalance = 0;
            let openingBalance = 0;

            // Try to get balance from raw data if available
            if (lastTransaction.raw_row && Object.keys(lastTransaction.raw_row).length > 0) {
                // Look for common balance column names
                const balanceKeys = Object.keys(lastTransaction.raw_row).filter(
                    (k) => k.toLowerCase().includes("balance") || k.toLowerCase().includes("running")
                );
                if (balanceKeys.length > 0) {
                    const balanceValue = parseFloat(String(lastTransaction.raw_row[balanceKeys[0]]).replace(/,/g, "")) || 0;
                    closingBalance = balanceValue;
                }
            }

            // If no balance found, calculate from transactions
            if (closingBalance === 0) {
                const totalCredits = parsed.reduce((sum, r) => sum + r.credit, 0);
                const totalDebits = parsed.reduce((sum, r) => sum + r.debit, 0);
                closingBalance = totalCredits - totalDebits;
            }

            form.setFieldsValue({
                opening_balance: openingBalance,
                closing_balance: closingBalance,
            });
        }

        setCurrentStep(2);
    };

    const handleImport = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            const parsedDates = parsedRows
                .map((r) => dayjs(r.transaction_date))
                .filter((d) => d.isValid())
                .sort((a, b) => a.valueOf() - b.valueOf());
            const firstDate = parsedDates[0];
            const lastDate = values.last_date
                ? dayjs(values.last_date)
                : parsedDates[parsedDates.length - 1];

            const statement_from = firstDate ? dayjs(firstDate).startOf("day").toISOString() : undefined;
            const statement_to = lastDate ? dayjs(lastDate).endOf("day").toISOString() : undefined;

            let payload: ImportStatementInput;

            if (importMethod === "auto" && autoDetectedData) {
                // Use auto-detected data
                payload = {
                    shop_id: shopId,
                    account_id: selectedAccountId || values.account_id,
                    source_type: "pdf",
                    original_filename: fileName,
                    statement_from: statement_from || autoDetectedData.statement_from,
                    statement_to: statement_to || autoDetectedData.statement_to,
                    opening_balance: values.opening_balance || autoDetectedData.opening_balance || 0,
                    closing_balance: values.closing_balance || autoDetectedData.closing_balance || 0,
                    amount_column_type: amountColumnType,
                    date_format: selectedDateFormat,
                    transactions: parsedRows.map((r) => ({
                        transaction_date: r.transaction_date,
                        description: r.description,
                        reference: r.reference,
                        debit: r.debit,
                        credit: r.credit,
                        original_amount: r.original_amount,
                        raw_row: r.raw_row,
                    })),
                    notes: values.notes,
                };
            } else {
                // Manual mapping
                payload = {
                    shop_id: shopId,
                    account_id: selectedAccountId || values.account_id,
                    source_type: fileName.endsWith(".csv") ? "csv" : "excel",
                    original_filename: fileName,
                    statement_from,
                    statement_to,
                    opening_balance: values.opening_balance || 0,
                    closing_balance: values.closing_balance || 0,
                    amount_column_type: amountColumnType,
                    date_format: selectedDateFormat,
                    transactions: parsedRows.map((r) => ({
                        transaction_date: r.transaction_date,
                        description: r.description,
                        reference: r.reference,
                        debit: r.debit,
                        credit: r.credit,
                        original_amount: r.original_amount,
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
        ...(amountColumnType === "double"
            ? [
                { key: "debit", label: "Debit (Outflow)" },
                { key: "credit", label: "Credit (Inflow)" },
              ]
            : [
                { key: "amount", label: "Amount Column" },
              ]
        ),
        { key: "reference", label: "Reference / Cheque No" },
    ];

    const DATE_FORMATS = [
        { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
        { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
        { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
        { label: "DD-MMM-YYYY", value: "DD-MMM-YYYY" },
        { label: "MMM DD, YYYY", value: "MMM DD, YYYY" },
        { label: "YYYY/MM/DD", value: "YYYY/MM/DD" },
        { label: "DD.MM.YYYY", value: "DD.MM.YYYY" },
        { label: "MM.DD.YYYY", value: "MM.DD.YYYY" },
        { label: "YYYY.MM.DD", value: "YYYY.MM.DD" },
        { label: "DD/MM/YY", value: "DD/MM/YY" },
        { label: "MM/DD/YY", value: "MM/DD/YY" },
        { label: "YY/MM/DD", value: "YY/MM/DD" },
        { label: "DD-MMM-YY", value: "DD-MMM-YY" },
        { label: "MMM-DD-YY", value: "MMM-DD-YY" },
        { label: "YYYYMMDD", value: "YYYYMMDD" },
        { label: "MMDDYYYY", value: "MMDDYYYY" },
        { label: "DDMMYYYY", value: "DDMMYYYY" },
        { label: "D/M/YYYY", value: "D/M/YYYY" },
        { label: "M/D/YYYY", value: "M/D/YYYY" },
        { label: "YYYY-M-D", value: "YYYY-M-D" },
        { label: "D-M-YYYY", value: "D-M-YYYY" },
        { label: "M-D-YYYY", value: "M-D-YYYY" },
        { label: "DD Month YYYY", value: "DD MMMM YYYY" },
        { label: "Month DD, YYYY", value: "MMMM DD, YYYY" },
        { label: "YYYY Month DD", value: "YYYY MMMM DD" },
        { label: "DD-Month-YYYY", value: "DD-MMMM-YYYY" },
        { label: "Month-DD-YYYY", value: "MMMM-DD-YYYY" },
        { label: "DD/MM/YYYY HH:mm", value: "DD/MM/YYYY HH:mm" },
        { label: "DD/MM/YYYY HH:mm:ss", value: "DD/MM/YYYY HH:mm:ss" },
        { label: "YYYY-MM-DD HH:mm:ss", value: "YYYY-MM-DD HH:mm:ss" },
        { label: "YYYY-MM-DDTHH:mm:ss", value: "YYYY-MM-DDTHH:mm:ss" },
        { label: "DD/MM/YYYY HH:mm:ss.SSS", value: "DD/MM/YYYY HH:mm:ss.SSS" },
        { label: "Do MMM YYYY", value: "Do MMM YYYY" },
        { label: "MMM Do YYYY", value: "MMM Do YYYY" },
        { label: "dddd, MMMM D, YYYY", value: "dddd, MMMM D, YYYY" },
        { label: "MMMM D, YYYY", value: "MMMM D, YYYY" },
        { label: "YYYY, MMMM D", value: "YYYY, MMMM D" },
    ];

    const headerOptions = fileHeaders.map((h) => ({ label: h, value: h }));

    const previewColumns = [
        { title: "Date", dataIndex: "transaction_date", width: 120, render: (v: string) => dayjs(v).isValid() ? dayjs(v).format("DD MMM YYYY") : v },
        { title: "Description", dataIndex: "description", width: 240 },
        { title: "Reference", dataIndex: "reference", width: 120 },
        {
            title: "Debit", dataIndex: "debit", width: 110, align: "right" as const,
            render: (v: number, record: any) => {
                if (amountColumnType === "single" && record.original_amount !== undefined) {
                    // In single column mode, show the original signed amount
                    if (record.original_amount < 0) {
                        return <Text style={{ color: "#cf1322" }}>{record.original_amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>;
                    }
                    return <Text type="secondary">—</Text>;
                }
                // Double column mode
                return v > 0 ? <Text style={{ color: "#cf1322" }}>{v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text> : <Text type="secondary">—</Text>;
            },
        },
        {
            title: "Credit", dataIndex: "credit", width: 110, align: "right" as const,
            render: (v: number, record: any) => {
                if (amountColumnType === "single" && record.original_amount !== undefined) {
                    // In single column mode, show the original signed amount
                    if (record.original_amount > 0) {
                        return <Text style={{ color: "#389e0d" }}>{record.original_amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>;
                    }
                    return <Text type="secondary">—</Text>;
                }
                // Double column mode
                return v > 0 ? <Text style={{ color: "#389e0d" }}>{v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text> : <Text type="secondary">—</Text>;
            },
        },
    ];

    const accountOptions = accounts.map((a: any) => ({
        label: `${a.account_name} (${a.account_code})${a.bank_details?.bank_name ? ` - ${a.bank_details.bank_name}` : ''}`,
        value: a._id,
    }));

    const isMappingValid = columnMap["date"] && columnMap["description"];
    const isLoading = uploadMutation.isPending;

    return (
        <Drawer
            title={
                <Space>
                    <BankOutlined style={{ fontSize: 20 }} />
                    <Text strong style={{ fontSize: 16 }}>Import Bank Statement</Text>
                </Space>
            }
            open={open}
            onClose={onClose}
            width={700}
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
                            onClick={applyMapping}
                            disabled={!isMappingValid}
                            size="large"
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
                            size="large"
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
                style={{ marginBottom: 32 }}
                size="small"
            />

            {/* ── Step 0: Upload with Method Selection ── */}
            {currentStep === 0 && (
                <Space direction="vertical" style={{ width: "100%" }} size={20}>
                    {/* Bank Account Selection */}
                    <div>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                            <BankOutlined /> Bank Account
                        </Text>
                        <Select
                            placeholder="Select bank account for this import"
                            options={accountOptions}
                            value={selectedAccountId}
                            onChange={setSelectedAccountId}
                            style={{ width: "100%" }}
                            showSearch
                            optionFilterProp="label"
                            size="large"
                        />
                    </div>

                    {/* Import Method Selection */}
                    <div>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                            Import Method
                        </Text>
                        <Radio.Group
                            value={importMethod}
                            onChange={(e) => setImportMethod(e.target.value)}
                            style={{ width: "100%" }}
                        >
                            <Space direction="vertical" style={{ width: "100%" }}>
                                <Radio value="manual">
                                    <Space>
                                        <FileExcelOutlined style={{ color: "#52c41a" }} />
                                        <span>Excel/CSV - Map columns manually</span>
                                    </Space>
                                </Radio>
                                <Radio value="auto">
                                    <Space>
                                        <FilePdfOutlined style={{ color: "#ff4d4f" }} />
                                        <span>PDF - Auto-detect (Equity, KCB, Absa, etc.)</span>
                                    </Space>
                                </Radio>
                            </Space>
                        </Radio.Group>
                    </div>

                    {/* File Upload */}
                    <div>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                            Upload File
                        </Text>
                        {importMethod === "manual" ? (
                            <Dragger
                                accept=".xlsx,.xls,.csv"
                                beforeUpload={parseExcelFile}
                                showUploadList={false}
                                multiple={false}
                                disabled={!selectedAccountId}
                            >
                                <p className="ant-upload-drag-icon">
                                    <InboxOutlined style={{ color: selectedAccountId ? "#52c41a" : "#d9d9d9", fontSize: 48 }} />
                                </p>
                                <p className="ant-upload-text">
                                    {selectedAccountId ? "Click or drag Excel/CSV file here" : "Select a bank account first"}
                                </p>
                                <p className="ant-upload-hint">
                                    Supports .xlsx, .xls, .csv
                                </p>
                            </Dragger>
                        ) : (
                            <>
                                {isLoading ? (
                                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                                        <Spin size="large" />
                                        <Progress percent={uploadProgress} status="active" style={{ marginTop: 16 }} />
                                        <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                                            Parsing PDF statement...
                                        </Text>
                                    </div>
                                ) : (
                                    <Dragger
                                        accept=".pdf"
                                        beforeUpload={handleFileUpload}
                                        showUploadList={false}
                                        multiple={false}
                                        disabled={!selectedAccountId}
                                    >
                                        <p className="ant-upload-drag-icon">
                                            <FilePdfOutlined style={{ color: selectedAccountId ? "#ff4d4f" : "#d9d9d9", fontSize: 48 }} />
                                        </p>
                                        <p className="ant-upload-text">
                                            {selectedAccountId ? "Click or drag PDF bank statement here" : "Select a bank account first"}
                                        </p>
                                        <p className="ant-upload-hint">
                                            Auto-detects transactions from major Kenyan banks
                                        </p>
                                    </Dragger>
                                )}
                            </>
                        )}
                    </div>

                    {/* Download Templates */}
                    <div style={{ paddingTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Need a template?{" "}
                            <Button
                                type="link"
                                size="small"
                                icon={<FileExcelOutlined />}
                                onClick={() => {
                                    if (!selectedAccountId) {
                                        message.warning("Please select a bank account first");
                                        return;
                                    }
                                    downloadExcelTemplate(selectedAccountId);
                                }}
                                disabled={!selectedAccountId}
                            >
                                Download Excel
                            </Button>
                            {" or "}
                            <Button
                                type="link"
                                size="small"
                                icon={<FilePdfOutlined />}
                                onClick={() => {
                                    if (!selectedAccountId) {
                                        message.warning("Please select a bank account first");
                                        return;
                                    }
                                    downloadPDFTemplate(selectedAccountId);
                                }}
                                disabled={!selectedAccountId}
                            >
                                Download PDF
                            </Button>
                        </Text>
                    </div>
                </Space>
            )}

            {/* ── Step 1: Map Columns (Manual only) ── */}
            {currentStep === 1 && importMethod === "manual" && (
                <Space direction="vertical" style={{ width: "100%" }} size={20}>
                    {/* File Info */}
                    <Alert
                        type="success"
                        showIcon
                        message={`${rawRows.length} rows detected`}
                        description={`File: ${fileName}`}
                    />

                    {/* Amount Column Type */}
                    <div>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                            Amount Column Type
                        </Text>
                        <Radio.Group
                            value={amountColumnType}
                            onChange={(e) => {
                                setAmountColumnType(e.target.value);
                                setColumnMap((prev) => {
                                    const { debit, credit, amount, ...rest } = prev;
                                    return rest;
                                });
                            }}
                        >
                            <Radio value="double">Double Column (Debit & Credit)</Radio>
                            <Radio value="single">Single Column (Amount)</Radio>
                        </Radio.Group>
                    </div>

                    {/* Column Mapping */}
                    <div>
                        <Text strong style={{ display: "block", marginBottom: 12 }}>
                            Map Your Columns
                        </Text>
                        <Row gutter={[16, 16]}>
                            {INTERNAL_FIELDS.map((field) => (
                                <Col span={12} key={field.key}>
                                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                                        <Text style={{ fontSize: 13 }}>
                                            {field.label}
                                            {field.required && <span style={{ color: "#ff4d4f", marginLeft: 4 }}>*</span>}
                                        </Text>
                                        {field.key === "date" ? (
                                            <Space.Compact style={{ width: "100%" }}>
                                                <Select
                                                    placeholder="Select column"
                                                    options={headerOptions}
                                                    value={columnMap[field.key]}
                                                    onChange={(v) => setColumnMap((prev) => ({ ...prev, [field.key]: v }))}
                                                    style={{ flex: 1 }}
                                                    allowClear
                                                    showSearch
                                                    size="large"
                                                />
                                                <Select
                                                    placeholder="Format"
                                                    options={DATE_FORMATS}
                                                    value={selectedDateFormat}
                                                    onChange={setSelectedDateFormat}
                                                    style={{ width: 140 }}
                                                    size="large"
                                                />
                                            </Space.Compact>
                                        ) : (
                                            <Select
                                                placeholder="Select column"
                                                options={headerOptions}
                                                value={columnMap[field.key]}
                                                onChange={(v) => setColumnMap((prev) => ({ ...prev, [field.key]: v }))}
                                                style={{ width: "100%" }}
                                                allowClear
                                                showSearch
                                                size="large"
                                            />
                                        )}
                                    </Space>
                                </Col>
                            ))}
                        </Row>
                    </div>

                    {!isMappingValid && (
                        <Alert
                            type="warning"
                            showIcon
                            message="Date and Description fields are required"
                            style={{ marginTop: 8 }}
                        />
                    )}
                </Space>
            )}

            {/* ── Step 2: Preview & Import ── */}
            {currentStep === 2 && (
                <Space direction="vertical" style={{ width: "100%" }} size={20}>
                    {/* Summary */}
                    <Alert
                        type="success"
                        showIcon
                        message={`${parsedRows.length} transactions ready`}
                        description={
                            <Space split={<Divider type="vertical" />} size="middle">
                                <Text type="danger">
                                    Debits: {parsedRows.reduce((s, r) => s + r.debit, 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                </Text>
                                <Text type="success">
                                    Credits: {parsedRows.reduce((s, r) => s + r.credit, 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                </Text>
                            </Space>
                        }
                    />

                    {/* Statement Details */}
                    <ProForm
                        form={form}
                        submitter={false}
                        layout="vertical"
                        initialValues={{
                            opening_balance: autoDetectedData?.opening_balance || 0,
                            closing_balance: autoDetectedData?.closing_balance || 0,
                            account_id: selectedAccountId,
                        }}
                    >
                        <Row gutter={16}>
                            <Col span={12}>
                                <ProFormDigit
                                    name="opening_balance"
                                    label="Opening Balance"
                                    placeholder="0.00"
                                    fieldProps={{ precision: 2, prefix: "KES", size: "large" }}
                                />
                            </Col>
                            <Col span={12}>
                                <ProFormDigit
                                    name="closing_balance"
                                    label="Closing Balance"
                                    placeholder="0.00"
                                    fieldProps={{ precision: 2, prefix: "KES", size: "large" }}
                                />
                            </Col>
                        </Row>
                        <ProFormDatePicker
                            name="last_date"
                            label="Last date"
                            fieldProps={{ style: { width: "100%" }, size: "large", format: "DD/MM/YYYY" }}
                            rules={[{ required: true, message: "Required" }]}
                        />
                        <ProFormTextArea
                            name="notes"
                            label="Notes (optional)"
                            placeholder="Add any notes about this import"
                            fieldProps={{ rows: 2 }}
                        />
                    </ProForm>

                    {/* Transaction Preview */}
                    <div>
                        <Text strong style={{ display: "block", marginBottom: 12 }}>
                            Transaction Preview (first 10)
                        </Text>
                        <Table
                            rowKey={(_, i) => String(i)}
                            dataSource={parsedRows.slice(0, 10)}
                            columns={previewColumns}
                            size="small"
                            pagination={false}
                            scroll={{ x: 600 }}
                        />
                        {parsedRows.length > 10 && (
                            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                                …and {parsedRows.length - 10} more transactions
                            </Text>
                        )}
                    </div>
                </Space>
            )}
        </Drawer>
    );
};

export default ImportStatementDrawer;