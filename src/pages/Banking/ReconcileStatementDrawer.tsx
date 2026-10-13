import React, { useState, useEffect } from "react";
import {
    Drawer, Typography, Upload, Alert, Space,
    Table, Button, Steps, Select, Row, Col, Radio, message, Statistic, Card, Tag,
} from "antd";
import {
    InboxOutlined, CheckCircleOutlined,
    BankOutlined, DiffOutlined, WarningOutlined, CloudUploadOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import dayjs from "dayjs";
import {
    compareStatement,
    importStatement,
    CompareStatementResult,
} from "@services/accounting/bankStatementImport";
import { getAllAccounts } from "@services/accounting/accounts";

const { Text } = Typography;
const { Dragger } = Upload;

interface ParsedRow {
    transaction_date: string;
    description: string;
    reference?: string;
    debit: number;
    credit: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    shopId: string;
    // When opened from a specific import's row action, the account is
    // already known — skip the account picker and reconcile against that
    // account's transactions directly.
    presetAccountId?: string;
    presetAccountName?: string;
}

const STEP_LABELS = ["Upload File", "Map Columns", "Reconciliation Result"];

const HEADER_PATTERNS: Record<string, string[]> = {
    date: ["transaction date", "date", "value date", "posting date"],
    description: ["description", "narrative", "details", "particulars", "transaction description"],
    reference: ["reference", "ref", "cheque no", "cheque", "check no", "transaction id"],
    debit: ["debits", "debit", "dr", "withdrawal", "money out", "amount out", "paid out"],
    credit: ["credits", "credit", "cr", "deposit", "money in", "amount in", "paid in"],
    amount: ["amount", "transaction amount", "amount (kes)", "amt"],
};

const DATE_FORMATS = [
    { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
    { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
    { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
    { label: "DD-MMM-YYYY", value: "DD-MMM-YYYY" },
    { label: "DD/MM/YY", value: "DD/MM/YY" },
    { label: "YYYY-MM-DD HH:mm:ss", value: "YYYY-MM-DD HH:mm:ss" },
    { label: "DD Month YYYY", value: "DD MMMM YYYY" },
    { label: "Month DD, YYYY", value: "MMMM DD, YYYY" },
];

const inferColumnMap = (headers: string[]): Record<string, string> => {
    const map: Record<string, string> = {};
    Object.entries(HEADER_PATTERNS).forEach(([key, patterns]) => {
        const exact = headers.find((h) => patterns.some((p) => h.toLowerCase().trim() === p));
        if (exact) {
            map[key] = exact;
            return;
        }
        const partial = headers.find((h) => patterns.some((p) => h.toLowerCase().includes(p)));
        if (partial) map[key] = partial;
    });
    return map;
};

const fmt = (v: number) => (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 });

const ReconcileStatementDrawer: React.FC<Props> = ({
    open, onClose, onSuccess, shopId, presetAccountId, presetAccountName,
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
    const [fileName, setFileName] = useState("");
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
    const [columnMap, setColumnMap] = useState<Record<string, string>>({});
    const [amountColumnType, setAmountColumnType] = useState<"double" | "single">("double");
    const [selectedDateFormat, setSelectedDateFormat] = useState("DD/MM/YYYY");
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [result, setResult] = useState<CompareStatementResult | null>(null);

    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts", shopId],
        enabled: open,
        queryFn: () => getAllAccounts({ shop_id: shopId }),
    });

    const accounts = (accountsData?.accounts || []).filter((a: any) =>
        a.account_subtype === "Cash & Bank" && a.is_bank_account === true
    );
    const accountOptions = accounts.map((a: any) => ({
        label: `${a.account_name} (${a.account_code})${a.bank_details?.bank_name ? ` - ${a.bank_details.bank_name}` : ""}`,
        value: a._id,
    }));

    const compareMutation = useMutation({
        mutationFn: () =>
            compareStatement({
                shop_id: shopId,
                account_id: selectedAccountId as string,
                transactions: parsedRows,
            }),
        onSuccess: (data) => {
            setResult(data);
            setCurrentStep(2);
        },
    });

    const importMissingMutation = useMutation({
        mutationFn: () => {
            const rows = result?.missing_in_system || [];
            const dates = rows
                .map((r) => dayjs(r.transaction_date))
                .filter((d) => d.isValid())
                .sort((a, b) => a.valueOf() - b.valueOf());
            return importStatement({
                shop_id: shopId,
                account_id: selectedAccountId as string,
                source_type: fileName.endsWith(".csv") ? "csv" : "excel",
                original_filename: fileName,
                statement_from: dates[0]?.startOf("day").toISOString(),
                statement_to: dates[dates.length - 1]?.endOf("day").toISOString(),
                amount_column_type: "double",
                date_format: selectedDateFormat,
                transactions: rows.map((r) => ({
                    transaction_date: r.transaction_date,
                    description: r.description,
                    reference: r.reference,
                    debit: r.debit,
                    credit: r.credit,
                })),
                notes: `Imported from reconciliation gap-fill against ${fileName}`,
            });
        },
        onSuccess: () => {
            onSuccess();
            resetState();
            onClose();
        },
    });

    useEffect(() => {
        if (!open) {
            resetState();
        } else if (presetAccountId) {
            setSelectedAccountId(presetAccountId);
        }
    }, [open, presetAccountId]);

    const resetState = () => {
        setCurrentStep(0);
        setSelectedAccountId(undefined);
        setFileName("");
        setFileHeaders([]);
        setRawRows([]);
        setColumnMap({});
        setAmountColumnType("double");
        setSelectedDateFormat("DD/MM/YYYY");
        setParsedRows([]);
        setResult(null);
    };

    const parseFile = (file: File) => {
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

        const processRows = (allRows: any[][]) => {
            const headerIndex = allRows.findIndex((r) => r.length >= 3 && isHeaderRow(r));
            if (headerIndex === -1) {
                message.error("Could not detect a header row. Make sure the file has column headers.");
                return;
            }

            const headers = allRows[headerIndex].map((h) => String(h || "").trim()).filter((h) => h.length > 0);
            const data = allRows.slice(headerIndex + 1);

            const rows: Record<string, any>[] = data
                .map((r) => {
                    const obj: Record<string, any> = {};
                    headers.forEach((h, i) => { obj[h] = r[i]; });
                    return obj;
                })
                .filter((r) => Object.values(r).some((v) => v !== undefined && v !== "" && v !== null));

            if (rows.length > 0) {
                setFileHeaders(headers);
                setRawRows(rows);

                const inferredMap = inferColumnMap(headers);
                setColumnMap(inferredMap);
                setAmountColumnType(inferredMap.debit && inferredMap.credit ? "double" : "single");

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
                const parsed = Papa.parse(text, { header: false, skipEmptyLines: true, dynamicTyping: false });
                processRows(parsed.data as any[][]);
            };
            reader.readAsText(file);
            return false;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array", cellDates: true });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const allRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
            processRows(allRows);
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

        const parsed: ParsedRow[] = rawRows
            .map((row) => {
                const description = row[descKey] || "";
                if (!description) return null;

                let debit = 0;
                let credit = 0;

                if (amountColumnType === "single") {
                    if (amtKey && row[amtKey] !== undefined) {
                        const amt = parseFloat(String(row[amtKey]).replace(/,/g, "")) || 0;
                        if (amt < 0) debit = Math.abs(amt);
                        else credit = amt;
                    }
                } else {
                    debit = Math.abs(parseFloat(String(row[debitKey] || 0).replace(/,/g, "")) || 0);
                    credit = Math.abs(parseFloat(String(row[creditKey] || 0).replace(/,/g, "")) || 0);
                }

                const rawDate = row[dateKey];
                let transaction_date = "";
                if (rawDate) {
                    const d = dayjs(rawDate, selectedDateFormat);
                    transaction_date = d.isValid() ? d.toISOString() : rawDate;
                }

                return {
                    transaction_date,
                    description: String(description).trim(),
                    reference: refKey ? String(row[refKey] || "").trim() : undefined,
                    debit,
                    credit,
                };
            })
            .filter(Boolean) as ParsedRow[];

        setParsedRows(parsed);
        compareMutation.mutate();
    };

    const headerOptions = fileHeaders.map((h) => ({ label: h, value: h }));
    const isMappingValid = columnMap["date"] && columnMap["description"] &&
        (amountColumnType === "single" ? columnMap["amount"] : (columnMap["debit"] || columnMap["credit"]));

    const diffColumns = [
        { title: "Date", dataIndex: "transaction_date", width: 110, render: (v: string) => dayjs(v).isValid() ? dayjs(v).format("DD MMM YYYY") : v },
        { title: "Description", dataIndex: "description", ellipsis: true },
        { title: "Reference", dataIndex: "reference", width: 110 },
        { title: "Debit", dataIndex: "debit", width: 110, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#cf1322" }}>{fmt(v)}</Text> : <Text type="secondary">—</Text> },
        { title: "Credit", dataIndex: "credit", width: 110, align: "right" as const, render: (v: number) => v > 0 ? <Text style={{ color: "#389e0d" }}>{fmt(v)}</Text> : <Text type="secondary">—</Text> },
    ];

    const missingInUploadColumns = [
        ...diffColumns,
        { title: "Import No.", dataIndex: "import_no", width: 150, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    ];

    const isComparing = compareMutation.isPending;

    return (
        <Drawer
            title={
                <Space>
                    <DiffOutlined style={{ fontSize: 20 }} />
                    <Text strong style={{ fontSize: 16 }}>Reconcile Bank Statement</Text>
                </Space>
            }
            open={open}
            onClose={onClose}
            width={820}
            destroyOnClose
            footer={
                <Space style={{ justifyContent: "flex-end", width: "100%", display: "flex" }}>
                    <Button onClick={onClose}>Close</Button>
                    {currentStep === 1 && (
                        <Button
                            type="primary"
                            onClick={applyMapping}
                            disabled={!isMappingValid}
                            loading={isComparing}
                            size="large"
                        >
                            Compare Against System
                        </Button>
                    )}
                    {currentStep === 2 && (result?.missing_in_system_count || 0) > 0 && (
                        <Button
                            type="primary"
                            icon={<CloudUploadOutlined />}
                            onClick={() => importMissingMutation.mutate()}
                            loading={importMissingMutation.isPending}
                            size="large"
                        >
                            Import {result?.missing_in_system_count} Missing Transactions
                        </Button>
                    )}
                </Space>
            }
        >
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 20 }}
                message="What this does"
                description="Re-upload the same (or updated) bank excel/CSV. It's compared against everything already imported for the selected account by matching date + debit + credit, so you can see exactly which transactions are missing from the system, or which system transactions no longer appear on the statement."
            />

            <Steps
                current={currentStep}
                items={STEP_LABELS.map((t) => ({ title: t }))}
                style={{ marginBottom: 32 }}
                size="small"
            />

            {currentStep === 0 && (
                <Space direction="vertical" style={{ width: "100%" }} size={20}>
                    <div>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                            <BankOutlined /> Bank Account
                        </Text>
                        {presetAccountId ? (
                            <Alert
                                type="info"
                                showIcon
                                message={`Reconciling against: ${presetAccountName || "selected account"}`}
                                description="Opened from an import row — the account is locked to that import's account."
                            />
                        ) : (
                            <Select
                                placeholder="Select the bank account to reconcile"
                                options={accountOptions}
                                value={selectedAccountId}
                                onChange={setSelectedAccountId}
                                style={{ width: "100%" }}
                                showSearch
                                optionFilterProp="label"
                                size="large"
                            />
                        )}
                    </div>
                    <div>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                            Upload Excel / CSV Statement
                        </Text>
                        <Dragger
                            accept=".xlsx,.xls,.csv"
                            beforeUpload={parseFile}
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
                            <p className="ant-upload-hint">Supports .xlsx, .xls, .csv</p>
                        </Dragger>
                    </div>
                </Space>
            )}

            {currentStep === 1 && (
                <Space direction="vertical" style={{ width: "100%" }} size={20}>
                    <Alert
                        type="success"
                        showIcon
                        message={`${rawRows.length} rows detected`}
                        description={`File: ${fileName}`}
                    />

                    <div>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>Amount Column Type</Text>
                        <Radio.Group
                            value={amountColumnType}
                            onChange={(e) => setAmountColumnType(e.target.value)}
                        >
                            <Radio value="double">Double Column (Debit & Credit)</Radio>
                            <Radio value="single">Single Column (Amount)</Radio>
                        </Radio.Group>
                    </div>

                    <div>
                        <Text strong style={{ display: "block", marginBottom: 12 }}>Map Your Columns</Text>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                                    <Text style={{ fontSize: 13 }}>Transaction Date *</Text>
                                    <Space.Compact style={{ width: "100%" }}>
                                        <Select
                                            placeholder="Select column"
                                            options={headerOptions}
                                            value={columnMap["date"]}
                                            onChange={(v) => setColumnMap((prev) => ({ ...prev, date: v }))}
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
                                            style={{ width: 160 }}
                                            size="large"
                                        />
                                    </Space.Compact>
                                </Space>
                            </Col>
                            <Col span={12}>
                                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                                    <Text style={{ fontSize: 13 }}>Description *</Text>
                                    <Select
                                        placeholder="Select column"
                                        options={headerOptions}
                                        value={columnMap["description"]}
                                        onChange={(v) => setColumnMap((prev) => ({ ...prev, description: v }))}
                                        style={{ width: "100%" }}
                                        allowClear
                                        showSearch
                                        size="large"
                                    />
                                </Space>
                            </Col>
                            {amountColumnType === "double" ? (
                                <>
                                    <Col span={12}>
                                        <Space direction="vertical" size={6} style={{ width: "100%" }}>
                                            <Text style={{ fontSize: 13 }}>Debit (Outflow)</Text>
                                            <Select
                                                placeholder="Select column"
                                                options={headerOptions}
                                                value={columnMap["debit"]}
                                                onChange={(v) => setColumnMap((prev) => ({ ...prev, debit: v }))}
                                                style={{ width: "100%" }}
                                                allowClear
                                                showSearch
                                                size="large"
                                            />
                                        </Space>
                                    </Col>
                                    <Col span={12}>
                                        <Space direction="vertical" size={6} style={{ width: "100%" }}>
                                            <Text style={{ fontSize: 13 }}>Credit (Inflow)</Text>
                                            <Select
                                                placeholder="Select column"
                                                options={headerOptions}
                                                value={columnMap["credit"]}
                                                onChange={(v) => setColumnMap((prev) => ({ ...prev, credit: v }))}
                                                style={{ width: "100%" }}
                                                allowClear
                                                showSearch
                                                size="large"
                                            />
                                        </Space>
                                    </Col>
                                </>
                            ) : (
                                <Col span={12}>
                                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                                        <Text style={{ fontSize: 13 }}>Amount Column</Text>
                                        <Select
                                            placeholder="Select column"
                                            options={headerOptions}
                                            value={columnMap["amount"]}
                                            onChange={(v) => setColumnMap((prev) => ({ ...prev, amount: v }))}
                                            style={{ width: "100%" }}
                                            allowClear
                                            showSearch
                                            size="large"
                                        />
                                    </Space>
                                </Col>
                            )}
                            <Col span={12}>
                                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                                    <Text style={{ fontSize: 13 }}>Reference / Cheque No</Text>
                                    <Select
                                        placeholder="Select column"
                                        options={headerOptions}
                                        value={columnMap["reference"]}
                                        onChange={(v) => setColumnMap((prev) => ({ ...prev, reference: v }))}
                                        style={{ width: "100%" }}
                                        allowClear
                                        showSearch
                                        size="large"
                                    />
                                </Space>
                            </Col>
                        </Row>
                    </div>

                    {!isMappingValid && (
                        <Alert type="warning" showIcon message="Date, Description, and an amount column are required" />
                    )}
                </Space>
            )}

            {currentStep === 2 && result && (
                <Space direction="vertical" style={{ width: "100%" }} size={20}>
                    <Row gutter={16}>
                        <Col span={6}>
                            <Card size="small" bordered>
                                <Statistic title="In Uploaded File" value={result.uploaded_count} valueStyle={{ fontSize: 18 }} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small" bordered>
                                <Statistic title="Already Matched" value={result.matched_count} valueStyle={{ fontSize: 18, color: "#52c41a" }} prefix={<CheckCircleOutlined />} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small" bordered>
                                <Statistic title="Missing from System" value={result.missing_in_system_count} valueStyle={{ fontSize: 18, color: "#ff4d4f" }} prefix={<WarningOutlined />} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small" bordered>
                                <Statistic title="Missing from Upload" value={result.missing_in_upload_count} valueStyle={{ fontSize: 18, color: "#faad14" }} prefix={<WarningOutlined />} />
                            </Card>
                        </Col>
                    </Row>

                    <Alert
                        type={Math.abs(result.totals.uploaded_debits - result.totals.system_debits) < 0.01 && Math.abs(result.totals.uploaded_credits - result.totals.system_credits) < 0.01 ? "success" : "warning"}
                        showIcon
                        message="Debit / Credit Totals"
                        description={
                            <Space direction="vertical" size={4}>
                                <Text>Uploaded file: <Text type="danger">DR {fmt(result.totals.uploaded_debits)}</Text> / <Text type="success">CR {fmt(result.totals.uploaded_credits)}</Text></Text>
                                <Text>Already in system: <Text type="danger">DR {fmt(result.totals.system_debits)}</Text> / <Text type="success">CR {fmt(result.totals.system_credits)}</Text></Text>
                                <Text strong>Difference: DR {fmt(result.totals.uploaded_debits - result.totals.system_debits)} / CR {fmt(result.totals.uploaded_credits - result.totals.system_credits)}</Text>
                            </Space>
                        }
                    />

                    <div>
                        <Space style={{ marginBottom: 8 }}>
                            <Text strong>Missing from System</Text>
                            <Tag color="error">{result.missing_in_system_count} rows</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>— found in the upload, not yet imported</Text>
                        </Space>
                        <Table
                            rowKey={(_, i) => `mis-${i}`}
                            dataSource={result.missing_in_system}
                            columns={diffColumns}
                            size="small"
                            pagination={{ pageSize: 10 }}
                            locale={{ emptyText: "Nothing missing — every row in this file is already in the system" }}
                            scroll={{ x: 600 }}
                        />
                    </div>

                    <div>
                        <Space style={{ marginBottom: 8 }}>
                            <Text strong>Missing from Upload</Text>
                            <Tag color="warning">{result.missing_in_upload_count} rows</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>— already imported, not present in this file</Text>
                        </Space>
                        <Table
                            rowKey={(_, i) => `miu-${i}`}
                            dataSource={result.missing_in_upload}
                            columns={missingInUploadColumns}
                            size="small"
                            pagination={{ pageSize: 10 }}
                            locale={{ emptyText: "Nothing extra — every imported transaction appears in this file" }}
                            scroll={{ x: 750 }}
                        />
                    </div>
                </Space>
            )}
        </Drawer>
    );
};

export default ReconcileStatementDrawer;
