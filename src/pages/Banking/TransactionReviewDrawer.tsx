import React, { useState, useEffect } from "react";
import {
    Drawer, Table, Typography, Space, Tag, Button, Tooltip,
    Select, Popconfirm, Badge, Alert, Row, Col, Statistic,
    Tabs, Progress, App, Modal, Form, Input, DatePicker, Card,
} from "antd";
import {
    CheckCircleOutlined, StopOutlined,
    SendOutlined, ReloadOutlined, TagOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getImportById,
    reApplyRules,
    categorizeTransaction,
    bulkCategorize,
    excludeTransaction,
    uncategorizeTransaction,
    pushToReconciliation,
    pushToJournalEntries,
    RawTransaction,
    TransactionStatus,
    BankStatementImport,
    CategorizeTransactionInput,
} from "@services/accounting/bankStatementImport";
import { getAllAccounts } from "@services/accounting/accounts";
import { fetchAllSuppliers } from "@services/supplier";
import { getAllReconciliations, BankReconciliation } from "@services/accounting/reconciliation";
import dayjs from "dayjs";

const { Text, Title } = Typography;

const STATUS_COLORS: Record<TransactionStatus, string> = {
    Uncategorized: "warning",
    Categorized: "success",
    Excluded: "default",
    Pushed: "processing",
};

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    importRecord: BankStatementImport | null;
    shopId: string;
}

interface CategorizeTxnModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (data: CategorizeTransactionInput) => void;
    transaction: RawTransaction | null;
    accounts: any[];
    suppliers: any[];
    loading: boolean;
}

const CategorizeTxnModal: React.FC<CategorizeTxnModalProps> = ({
    open, onClose, onConfirm, transaction, accounts, suppliers, loading,
}) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open && transaction) {
            form.setFieldsValue({
                account_id: transaction.account_id || undefined,
                record_type: transaction.record_type || undefined,
                target_account_id: transaction.target_account_id || undefined,
                vendor_id: transaction.vendor_id || undefined,
                vat_treatment: transaction.vat_treatment || undefined,
                tax: transaction.tax || undefined,
                tax_exemption_reason: transaction.tax_exemption_reason || undefined,
                reference_number: transaction.reference_number || undefined,
                custom_reference: transaction.custom_reference || undefined,
                reporting_tags: transaction.reporting_tags || undefined,
            });
        } else {
            form.resetFields();
        }
    }, [open, transaction, form]);

    const accountOptions = accounts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));

    const supplierOptions = suppliers.map((s: any) => ({
        label: s.name,
        value: s._id,
    }));

    const handleOk = async () => {
        const values = await form.validateFields();
        onConfirm(values);
    };

    return (
        <Modal
            open={open}
            title={
                <Space direction="vertical" size={0}>
                    <Text strong>Categorize Transaction</Text>
                    {transaction && (
                        <Text type="secondary" style={{ fontSize: 12 }}>{transaction.description}</Text>
                    )}
                </Space>
            }
            onCancel={onClose}
            onOk={handleOk}
            confirmLoading={loading}
            okText="Save"
            width={600}
            destroyOnClose
        >
            <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                <Form.Item
                    name="account_id"
                    label="Account"
                    rules={[{ required: true, message: "Please select an account" }]}
                >
                    <Select
                        placeholder="Select account..."
                        options={accountOptions}
                        showSearch
                        optionFilterProp="label"
                        allowClear
                        size="large"
                    />
                </Form.Item>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item name="record_type" label="Record Type">
                            <Select
                                placeholder="Select type..."
                                options={[
                                    { label: "Income", value: "income" },
                                    { label: "Expense", value: "expense" },
                                    { label: "Transfer", value: "transfer" },
                                    { label: "Refund", value: "refund" },
                                ]}
                                allowClear
                                size="large"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="vendor_id" label="Vendor">
                            <Select
                                placeholder="Select vendor..."
                                options={supplierOptions}
                                showSearch
                                optionFilterProp="label"
                                allowClear
                                size="large"
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.record_type !== curr.record_type}>
                    {({ getFieldValue }) =>
                        getFieldValue("record_type") === "transfer" ? (
                            <Form.Item name="target_account_id" label="Target Account">
                                <Select
                                    placeholder="Select target account..."
                                    options={accountOptions}
                                    showSearch
                                    optionFilterProp="label"
                                    allowClear
                                    size="large"
                                />
                            </Form.Item>
                        ) : null
                    }
                </Form.Item>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item name="vat_treatment" label="VAT Treatment">
                            <Select
                                placeholder="Select..."
                                options={[
                                    { label: "VAT Registered", value: "vat_registered" },
                                    { label: "Non VAT Registered", value: "non_vat_registered" },
                                ]}
                                allowClear
                                size="large"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="tax" label="Tax">
                            <Select
                                placeholder="Select..."
                                options={[
                                    { label: "Taxable", value: "taxable" },
                                    { label: "Exempt", value: "exempt" },
                                ]}
                                allowClear
                                size="large"
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.tax !== curr.tax}>
                    {({ getFieldValue }) =>
                        getFieldValue("tax") === "exempt" ? (
                            <Form.Item
                                name="tax_exemption_reason"
                                label="Tax Exemption Reason"
                                rules={[{ required: true, message: "Please provide exemption reason" }]}
                            >
                                <Input placeholder="Reason for tax exemption..." size="large" />
                            </Form.Item>
                        ) : null
                    }
                </Form.Item>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item name="reference_number" label="Reference Number">
                            <Select
                                placeholder="Select..."
                                options={[
                                    { label: "From Bank Statement", value: "from_bank_statement" },
                                    { label: "Custom", value: "custom" },
                                ]}
                                allowClear
                                size="large"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.reference_number !== curr.reference_number}>
                            {({ getFieldValue }) =>
                                getFieldValue("reference_number") === "custom" ? (
                                    <Form.Item name="custom_reference" label="Custom Reference">
                                        <Input placeholder="Enter custom reference..." size="large" />
                                    </Form.Item>
                                ) : null
                            }
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item name="reporting_tags" label="Reporting Tags">
                    <Select
                        mode="tags"
                        placeholder="Add tags..."
                        size="large"
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

const TransactionReviewDrawer: React.FC<Props> = ({
    open, onClose, onSuccess, importRecord, shopId,
}) => {
    const { modal } = App.useApp();
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState<TransactionStatus | "ALL">("ALL");
    const [page, setPage] = useState(1);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [categorizeModal, setCategorizeModal] = useState(false);
    const [activeTxn, setActiveTxn] = useState<RawTransaction | null>(null);
    const [categorizingBulk, setCategorizingBulk] = useState(false);
    const [bulkAccountId, setBulkAccountId] = useState<string | null>(null);
    const [pushModalOpen, setPushModalOpen] = useState(false);
    const [pushMode, setPushMode] = useState<"reconciliation" | "journal">("reconciliation");
    const [pushTarget, setPushTarget] = useState<string>("");
    const [dateRange, setDateRange] = useState<[string, string] | null>(null);

    const importId = importRecord?._id;

    const { data, isLoading } = useQuery({
        queryKey: ["import-detail", importId, statusFilter, page, dateRange],
        queryFn: () =>
            getImportById(importId!, {
                status_filter: statusFilter === "ALL" ? undefined : statusFilter,
                page: dateRange ? 1 : page,
                limit: dateRange ? 10000 : 50,
            }),
        enabled: open && !!importId,
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });

    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts", shopId],
        queryFn: () => getAllAccounts({ shop_id: shopId }),
        enabled: open,
    });

    const { data: suppliersData } = useQuery({
        queryKey: ["suppliers", shopId],
        queryFn: () => fetchAllSuppliers({ name: "", email: "" }),
        enabled: open,
    });

    const { data: reconciliationsData } = useQuery({
        queryKey: ["reconciliations", shopId],
        queryFn: () => getAllReconciliations({ shop_id: shopId, status: "Open" }),
        enabled: open,
    });

    const accounts = accountsData?.accounts || [];
    const suppliers = Array.isArray(suppliersData) ? suppliersData : [];
    const reconciliations = reconciliationsData?.reconciliations || [];
    const accountOptions = accounts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));
    const supplierOptions = suppliers.map((s: any) => ({
        label: s.name,
        value: s._id,
    }));
    const reconciliationOptions = reconciliations.map((r: BankReconciliation) => ({
        label: `${r.reconciliation_no} — ${r.account_name} (${dayjs(r.period_start).format("DD MMM YYYY")} to ${dayjs(r.period_end).format("DD MMM YYYY")})`,
        value: r._id,
    }));

    const importDetail = data?.import;
    const allTransactions = importDetail?.transactions || [];
    const totalTxns = data?.transaction_total || 0;
    const totalPages = data?.totalPages || 1;

    // Client-side date filtering
    const transactions = dateRange
        ? allTransactions.filter((txn: RawTransaction) => {
            const txnDate = dayjs(txn.transaction_date).format('YYYY-MM-DD');
            return txnDate >= dateRange[0] && txnDate <= dateRange[1];
        })
        : allTransactions;

    useEffect(() => {
        if (!open) {
            setPage(1);
            setSelectedRowKeys([]);
            setStatusFilter("ALL");
            setDateRange(null);
        }
    }, [open]);

    const reApplyMutation = useMutation({
        mutationFn: () => reApplyRules(importId!, { reset_categorized: false }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["import-detail", importId] });
            onSuccess();
        },
    });

    const categorizeMutation = useMutation({
        mutationFn: ({ txnId, data }: { txnId: string; data: CategorizeTransactionInput }) =>
            categorizeTransaction(importId!, txnId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["import-detail", importId] });
            setCategorizeModal(false);
            setActiveTxn(null);
        },
    });

    const excludeMutation = useMutation({
        mutationFn: (txnId: string) => excludeTransaction(importId!, txnId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["import-detail", importId] }),
    });

    const uncategorizeMutation = useMutation({
        mutationFn: (txnId: string) => uncategorizeTransaction(importId!, txnId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["import-detail", importId] }),
    });

    const bulkCategorizeMutation = useMutation({
        mutationFn: ({ account_id, txn_ids }: { account_id: string; txn_ids: string[] }) =>
            bulkCategorize(importId!, { txn_ids, account_id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["import-detail", importId] });
            setSelectedRowKeys([]);
            setBulkAccountId(null);
            setCategorizingBulk(false);
            onSuccess();
        },
    });

    const pushMutation = useMutation({
        mutationFn: () => {
            if (pushMode === "reconciliation") {
                return pushToReconciliation(importId!, {
                    reconciliation_id: pushTarget,
                    txn_ids: selectedRowKeys.length > 0 ? selectedRowKeys as string[] : undefined,
                });
            } else {
                return pushToJournalEntries(importId!, {
                    bank_account_id: pushTarget,
                    txn_ids: selectedRowKeys.length > 0 ? selectedRowKeys as string[] : undefined,
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["import-detail", importId] });
            setPushModalOpen(false);
            setPushTarget("");
            setSelectedRowKeys([]);
            onSuccess();
        },
    });

    const openCategorize = (txn: RawTransaction) => {
        setActiveTxn(txn);
        setCategorizeModal(true);
    };

    const handleBulkCategorize = () => {
        if (!bulkAccountId || selectedRowKeys.length === 0) return;
        modal.confirm({
            title: `Categorize ${selectedRowKeys.length} transactions?`,
            content: `They will all be assigned to the selected account.`,
            onOk: () => bulkCategorizeMutation.mutateAsync({
                account_id: bulkAccountId,
                txn_ids: selectedRowKeys as string[],
            }),
        });
    };

    const totalDebits = importDetail?.total_debits || 0;
    const totalCredits = importDetail?.total_credits || 0;
    const catPct = (importDetail?.imported_rows || 0) > 0
        ? Math.round(((importDetail?.categorized_count || 0) / (importDetail?.imported_rows || 1)) * 100)
        : 0;

    const STATUS_TABS: (TransactionStatus | "ALL")[] = [
        "ALL", "Uncategorized", "Categorized", "Excluded", "Pushed",
    ];

    const columns = [
        {
            title: "Date",
            dataIndex: "transaction_date",
            width: 110,
            render: (v: string) => (
                <Text style={{ fontSize: 12 }}>
                    {dayjs(v).isValid() ? dayjs(v).format("DD MMM YYYY") : v}
                </Text>
            ),
        },
        {
            title: "Description",
            dataIndex: "description",
            ellipsis: true,
            render: (v: string, r: RawTransaction) => (
                <Space direction="vertical" size={0}>
                    <Text style={{ fontSize: 13 }}>{v}</Text>
                    {r.reference && (
                        <Text type="secondary" style={{ fontSize: 11 }}>{r.reference}</Text>
                    )}
                </Space>
            ),
        },
        {
            title: "Account",
            key: "account",
            width: 200,
            render: (_: any, r: RawTransaction) => {
                if (!r.account_name) {
                    return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
                }
                return (
                    <Tag icon={<TagOutlined />} color="blue" style={{ fontSize: 11 }}>
                        {r.account_code} {r.account_name}
                    </Tag>
                );
            },
        },
        {
            title: "Debit",
            dataIndex: "debit",
            width: 110,
            align: "right" as const,
            render: (v: number, r: RawTransaction) => {
                if (importDetail?.amount_column_type === "single" && r.original_amount !== undefined) {
                    if (r.original_amount < 0) {
                        return <Text style={{ color: "#cf1322", fontSize: 12 }}>{r.original_amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>;
                    }
                    return <Text type="secondary">—</Text>;
                }
                return v > 0 ? (
                    <Text style={{ color: "#cf1322", fontSize: 12 }}>{v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>
                ) : <Text type="secondary">—</Text>;
            },
        },
        {
            title: "Credit",
            dataIndex: "credit",
            width: 110,
            align: "right" as const,
            render: (v: number, r: RawTransaction) => {
                if (importDetail?.amount_column_type === "single" && r.original_amount !== undefined) {
                    if (r.original_amount > 0) {
                        return <Text style={{ color: "#389e0d", fontSize: 12 }}>{r.original_amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>;
                    }
                    return <Text type="secondary">—</Text>;
                }
                return v > 0 ? (
                    <Text style={{ color: "#389e0d", fontSize: 12 }}>{v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>
                ) : <Text type="secondary">—</Text>;
            },
        },
        {
            title: "Status",
            dataIndex: "status",
            width: 120,
            render: (s: TransactionStatus) => (
                <Badge status={STATUS_COLORS[s] as any} text={s} style={{ fontSize: 12 }} />
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 150,
            fixed: "right" as const,
            render: (_: any, r: RawTransaction) => {
                if (r.status === "Pushed") return null;
                return (
                    <Space size={4}>
                        <Tooltip title="Categorize">
                            <Button
                                icon={<TagOutlined />}
                                size="small"
                                onClick={() => openCategorize(r)}
                                disabled={r.status === "Excluded"}
                            />
                        </Tooltip>
                        {r.status === "Categorized" && (
                            <Tooltip title="Uncategorize">
                                <Button
                                    icon={<ReloadOutlined />}
                                    size="small"
                                    onClick={() => uncategorizeMutation.mutate(r._id)}
                                />
                            </Tooltip>
                        )}
                        <Tooltip title={r.status === "Excluded" ? "Restore" : "Exclude"}>
                            <Button
                                icon={<StopOutlined />}
                                size="small"
                                danger={r.status !== "Excluded"}
                                onClick={() => excludeMutation.mutate(r._id)}
                            />
                        </Tooltip>
                    </Space>
                );
            },
        },
    ];

    const bankAccounts = accounts
        .filter((a: any) => a.is_bank_account || a.account_type === "ASSET")
        .map((a: any) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));

    return (
        <>
            <Drawer
                title={
                    <Space>
                        <Text strong style={{ fontSize: 18 }}>Review Transactions</Text>
                        {importRecord && (
                            <Tag color="blue" style={{ marginLeft: 8 }}>
                                {importRecord.import_no}
                            </Tag>
                        )}
                    </Space>
                }
                open={open}
                onClose={onClose}
                width={950}
                destroyOnClose
                extra={
                    <Space>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => reApplyMutation.mutate()}
                            loading={reApplyMutation.isLoading}
                            size="large"
                        >
                            Re-apply Rules
                        </Button>
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={() => setPushModalOpen(true)}
                            disabled={!importDetail?.categorized_count}
                            size="large"
                        >
                            Push Categorized
                        </Button>
                    </Space>
                }
            >
                {/* ── Summary Stats ── */}
                <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col span={4}>
                        <Card size="small" bordered>
                            <Statistic
                                title="Total"
                                value={importDetail?.imported_rows || 0}
                                valueStyle={{ fontSize: 18 }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card size="small" bordered>
                            <Statistic
                                title="Categorized"
                                value={importDetail?.categorized_count || 0}
                                valueStyle={{ fontSize: 18, color: "#52c41a" }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card size="small" bordered>
                            <Statistic
                                title="Uncategorized"
                                value={importDetail?.uncategorized_count || 0}
                                valueStyle={{ fontSize: 18, color: "#faad14" }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card size="small" bordered>
                            <Statistic
                                title="Pushed"
                                value={importDetail?.pushed_count || 0}
                                valueStyle={{ fontSize: 18, color: "#1890ff" }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card size="small" bordered>
                            <Space direction="vertical" size={4} style={{ width: "100%" }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Progress</Text>
                                <Progress percent={catPct} size="small" strokeColor="#52c41a" />
                            </Space>
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card size="small" bordered>
                            <Space direction="vertical" size={4} style={{ width: "100%" }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Amounts</Text>
                                <Text style={{ fontSize: 13 }}>
                                    <Text type="danger">DR {totalDebits.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>
                                    {" / "}
                                    <Text type="success">CR {totalCredits.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>
                                </Text>
                            </Space>
                        </Card>
                    </Col>
                </Row>

                {/* ── Bulk Actions (when rows selected) ── */}
                {selectedRowKeys.length > 0 && (
                    <div style={{ marginBottom: 16, padding: 12, background: "#e6f7ff", borderRadius: 8 }}>
                        <Space wrap>
                            <Text strong>{selectedRowKeys.length} selected</Text>
                            <Select
                                placeholder="Select account..."
                                options={accountOptions}
                                value={bulkAccountId}
                                onChange={setBulkAccountId}
                                style={{ width: 250 }}
                                showSearch
                                optionFilterProp="label"
                                allowClear
                                size="large"
                            />
                            <Button
                                type="primary"
                                icon={<TagOutlined />}
                                onClick={handleBulkCategorize}
                                disabled={!bulkAccountId}
                                loading={bulkCategorizeMutation.isLoading}
                                size="large"
                            >
                                Apply
                            </Button>
                            <Button onClick={() => setSelectedRowKeys([])} size="large">Clear</Button>
                        </Space>
                    </div>
                )}

                {/* ── Status Tabs ── */}
                <Tabs
                    activeKey={statusFilter}
                    onChange={(k) => { setStatusFilter(k as any); setPage(1); }}
                    size="large"
                    style={{ marginBottom: 16 }}
                    items={STATUS_TABS.map((s) => ({
                        key: s,
                        label: s === "ALL" ? "All" : s,
                    }))}
                    tabBarExtraContent={
                        <DatePicker.RangePicker
                            size="large"
                            style={{ width: 280 }}
                            value={dateRange ? [dayjs(dateRange[0]), dayjs(dateRange[1])] : null}
                            onChange={(dates) => {
                                if (dates && dates[0] && dates[1]) {
                                    setDateRange([dates[0].format("YYYY-MM-DD"), dates[1].format("YYYY-MM-DD")]);
                                } else {
                                    setDateRange(null);
                                }
                            }}
                            onOk={(dates) => {
                                if (dates && dates[0] && dates[1]) {
                                    setDateRange([dates[0].format("YYYY-MM-DD"), dates[1].format("YYYY-MM-DD")]);
                                    setPage(1);
                                }
                            }}
                            allowClear
                        />
                    }
                />

                <Table
                    rowKey="_id"
                    dataSource={transactions}
                    columns={columns}
                    loading={isLoading}
                    size="middle"
                    scroll={{ x: 850 }}
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                        getCheckboxProps: (r: RawTransaction) => ({
                            disabled: r.status === "Pushed",
                        }),
                    }}
                    pagination={{
                        current: page,
                        total: totalTxns,
                        pageSize: 50,
                        onChange: (p) => setPage(p),
                        showTotal: (t) => `${t} transactions`,
                        showSizeChanger: false,
                    }}
                    rowClassName={(r: RawTransaction) =>
                        r.status === "Excluded" ? "opacity-50" : ""
                    }
                />
            </Drawer>

            {/* ── Categorize Modal ── */}
            <CategorizeTxnModal
                open={categorizeModal}
                onClose={() => { setCategorizeModal(false); setActiveTxn(null); }}
                onConfirm={(d) => categorizeMutation.mutate({ txnId: activeTxn!._id, data: d })}
                transaction={activeTxn}
                accounts={accounts}
                suppliers={suppliers}
                loading={categorizeMutation.isLoading}
            />

            {/* ── Push Modal ── */}
            <Modal
                open={pushModalOpen}
                title="Push Categorized Transactions"
                onCancel={() => setPushModalOpen(false)}
                onOk={() => pushMutation.mutate()}
                confirmLoading={pushMutation.isLoading}
                okText="Push"
                okButtonProps={{ size: "large" }}
                cancelButtonProps={{ size: "large" }}
                width={500}
                destroyOnClose
            >
                <Space direction="vertical" style={{ width: "100%" }} size={20}>
                    <Alert
                        type="info"
                        showIcon
                        message={`${selectedRowKeys.length > 0 ? selectedRowKeys.length : importDetail?.categorized_count} transactions`}
                        description={selectedRowKeys.length > 0 ? "Selected transactions only" : "All categorized transactions"}
                    />
                    <div>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>Push to</Text>
                        <Select
                            value={pushMode}
                            onChange={setPushMode as any}
                            style={{ width: "100%" }}
                            size="large"
                            options={[
                                { label: "Bank Reconciliation", value: "reconciliation" },
                                { label: "Journal Entries", value: "journal" },
                            ]}
                        />
                    </div>
                    <div>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                            {pushMode === "reconciliation" ? "Reconciliation" : "Bank Account"}
                        </Text>
                        {pushMode === "reconciliation" ? (
                            <Select
                                placeholder="Select reconciliation..."
                                options={reconciliationOptions}
                                value={pushTarget || undefined}
                                onChange={setPushTarget}
                                style={{ width: "100%" }}
                                showSearch
                                optionFilterProp="label"
                                size="large"
                            />
                        ) : (
                            <Select
                                placeholder="Select bank account..."
                                options={bankAccounts}
                                value={pushTarget || undefined}
                                onChange={setPushTarget}
                                style={{ width: "100%" }}
                                showSearch
                                optionFilterProp="label"
                                size="large"
                            />
                        )}
                    </div>
                </Space>
            </Modal>
        </>
    );
};

export default TransactionReviewDrawer;