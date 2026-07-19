import React, { useState, useEffect } from "react";
import {
    Drawer, Table, Typography, Space, Tag, Button, Tooltip,
    Select, Popconfirm, Badge, Alert, Row, Col, Statistic,
    Tabs, Progress, Divider, App, Modal, Form, Input, DatePicker,
} from "antd";
import {
    ThunderboltOutlined, CheckCircleOutlined, StopOutlined,
    SendOutlined, ReloadOutlined, TagOutlined, PushpinOutlined,
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
    loading: boolean;
}

const CategorizeTxnModal: React.FC<CategorizeTxnModalProps> = ({
    open, onClose, onConfirm, transaction, accounts, loading,
}) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open && transaction) {
            form.setFieldsValue({
                account_id: transaction.account_id || undefined,
                category_label: transaction.category_label || "",
                payee_name: transaction.payee_name || "",
                notes: transaction.notes || "",
                record_type: transaction.record_type || undefined,
                target_account_id: transaction.target_account_id || undefined,
            });
        } else {
            form.resetFields();
        }
    }, [open, transaction, form]);

    const accountOptions = accounts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
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
            okText="Save Category"
            width={500}
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
                    />
                </Form.Item>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item name="record_type" label="Record As">
                            <Select
                                placeholder="Select type..."
                                options={[
                                    { label: "Income", value: "income" },
                                    { label: "Expense", value: "expense" },
                                    { label: "Transfer", value: "transfer" },
                                    { label: "Refund", value: "refund" },
                                ]}
                                allowClear
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="category_label" label="Category Label">
                            <Input placeholder="e.g. Office Supplies, Utilities..." />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.record_type !== curr.record_type}>
                    {({ getFieldValue }) =>
                        getFieldValue("record_type") === "transfer" ? (
                            <Form.Item name="target_account_id" label="Target Account (for transfers)">
                                <Select
                                    placeholder="Select target account..."
                                    options={accountOptions}
                                    showSearch
                                    optionFilterProp="label"
                                    allowClear
                                />
                            </Form.Item>
                        ) : null
                    }
                </Form.Item>
                <Form.Item name="payee_name" label="Payee Name">
                    <Input placeholder="e.g. KPA, Safaricom..." />
                </Form.Item>
                <Form.Item name="notes" label="Notes">
                    <Input.TextArea rows={2} placeholder="Optional notes" />
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

    const accounts = accountsData?.accounts || [];
    const accountOptions = accounts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
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
            title: "Category",
            key: "category",
            width: 200,
            render: (_: any, r: RawTransaction) => {
                if (!r.account_name && !r.category_label) {
                    return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
                }
                return (
                    <Space direction="vertical" size={0}>
                        {r.account_name && (
                            <Tag icon={<TagOutlined />} color="blue" style={{ fontSize: 11 }}>
                                {r.account_code} {r.account_name}
                            </Tag>
                        )}
                        {r.category_label && (
                            <Text type="secondary" style={{ fontSize: 11 }}>{r.category_label}</Text>
                        )}
                        {r.categorized_by && (
                            <Text type="secondary" style={{ fontSize: 10 }}>
                                via {r.categorized_by === "rule" ? `rule: ${r.matched_rule_name}` : r.categorized_by}
                            </Text>
                        )}
                    </Space>
                );
            },
        },
        {
            title: "Debit (Deposit)",
            dataIndex: "debit",
            width: 110,
            align: "right" as const,
            render: (v: number) =>
                v > 0 ? (
                    <Text style={{ color: "#cf1322", fontSize: 12 }}>
                        {v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
        {
            title: "Credit (Withdrawal)",
            dataIndex: "credit",
            width: 110,
            align: "right" as const,
            render: (v: number) =>
                v > 0 ? (
                    <Text style={{ color: "#389e0d", fontSize: 12 }}>
                        {v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                ) : (
                    <Text type="secondary">—</Text>
                ),
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
                    <Space direction="vertical" size={0}>
                        <Title level={5} style={{ margin: 0 }}>Review Transactions</Title>
                        {importRecord && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {importRecord.import_no} — {importRecord.original_filename || importRecord.source_type}
                            </Text>
                        )}
                    </Space>
                }
                open={open}
                onClose={onClose}
                width={1100}
                destroyOnClose
                extra={
                    <Space>
                        <Tooltip title="Re-apply categorization rules to uncategorized transactions">
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => reApplyMutation.mutate()}
                                loading={reApplyMutation.isLoading}
                            >
                                Re-apply Rules
                            </Button>
                        </Tooltip>
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={() => setPushModalOpen(true)}
                            disabled={!importDetail?.categorized_count}
                        >
                            Push Categorized
                        </Button>
                    </Space>
                }
            >
                {/* ── Summary Row ── */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={4}>
                        <Statistic
                            title="Total"
                            value={importDetail?.imported_rows || 0}
                            valueStyle={{ fontSize: 18 }}
                        />
                    </Col>
                    <Col span={4}>
                        <Statistic
                            title="Categorized"
                            value={importDetail?.categorized_count || 0}
                            valueStyle={{ fontSize: 18, color: "#52c41a" }}
                        />
                    </Col>
                    <Col span={4}>
                        <Statistic
                            title="Uncategorized"
                            value={importDetail?.uncategorized_count || 0}
                            valueStyle={{ fontSize: 18, color: "#faad14" }}
                        />
                    </Col>
                    <Col span={4}>
                        <Statistic
                            title="Excluded"
                            value={importDetail?.excluded_count || 0}
                            valueStyle={{ fontSize: 18, color: "#8c8c8c" }}
                        />
                    </Col>
                    <Col span={4}>
                        <Statistic
                            title="Pushed"
                            value={importDetail?.pushed_count || 0}
                            valueStyle={{ fontSize: 18, color: "#1890ff" }}
                        />
                    </Col>
                    <Col span={4}>
                        <Space direction="vertical" size={4} style={{ width: "100%" }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Categorization</Text>
                            <Progress percent={catPct} size="small" strokeColor="#52c41a" />
                        </Space>
                    </Col>
                </Row>

                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                        <Alert
                            type="error"
                            showIcon
                            message={`Total Debits: KES ${totalDebits.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`}
                        />
                    </Col>
                    <Col span={12}>
                        <Alert
                            type="success"
                            showIcon
                            message={`Total Credits: KES ${totalCredits.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`}
                        />
                    </Col>
                </Row>

                {/* ── Bulk Actions (when rows selected) ── */}
                {selectedRowKeys.length > 0 && (
                    <Alert
                        type="info"
                        style={{ marginBottom: 12 }}
                        message={
                            <Space wrap>
                                <Text strong>{selectedRowKeys.length} selected</Text>
                                <Select
                                    placeholder="Select account for bulk categorize..."
                                    options={accountOptions}
                                    value={bulkAccountId}
                                    onChange={setBulkAccountId}
                                    style={{ width: 260 }}
                                    showSearch
                                    optionFilterProp="label"
                                    allowClear
                                />
                                <Button
                                    type="primary"
                                    size="small"
                                    icon={<TagOutlined />}
                                    onClick={handleBulkCategorize}
                                    disabled={!bulkAccountId}
                                    loading={bulkCategorizeMutation.isLoading}
                                >
                                    Apply to {selectedRowKeys.length}
                                </Button>
                                <Button size="small" onClick={() => setSelectedRowKeys([])}>Clear</Button>
                            </Space>
                        }
                    />
                )}

                {/* ── Status Tabs ── */}
                <Row gutter={12} style={{ marginBottom: 8 }}>
                    <Col span={16}>
                        <Tabs
                            activeKey={statusFilter}
                            onChange={(k) => { setStatusFilter(k as any); setPage(1); }}
                            size="small"
                            items={STATUS_TABS.map((s) => ({
                                key: s,
                                label: s === "ALL" ? "All" : s,
                            }))}
                        />
                    </Col>
                    <Col span={8}>
                        <DatePicker.RangePicker
                            size="small"
                            style={{ width: "100%" }}
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
                    </Col>
                </Row>

                <Table
                    rowKey="_id"
                    dataSource={transactions}
                    columns={columns}
                    loading={isLoading}
                    size="small"
                    scroll={{ x: 1000 }}
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
                loading={categorizeMutation.isLoading}
            />

            {/* ── Push Modal ── */}
            <Modal
                open={pushModalOpen}
                title="Push Categorized Transactions"
                onCancel={() => setPushModalOpen(false)}
                onOk={() => pushMutation.mutate()}
                confirmLoading={pushMutation.isLoading}
                okText="Push Now"
                destroyOnClose
            >
                <Space direction="vertical" style={{ width: "100%" }} size={16}>
                    <Alert
                        type="info"
                        showIcon
                        message={`${selectedRowKeys.length > 0 ? selectedRowKeys.length : importDetail?.categorized_count} transactions will be pushed`}
                        description={selectedRowKeys.length > 0 ? "Only selected transactions" : "All categorized transactions"}
                    />
                    <Space direction="vertical" style={{ width: "100%" }} size={8}>
                        <Text strong>Push to:</Text>
                        <Select
                            value={pushMode}
                            onChange={setPushMode as any}
                            style={{ width: "100%" }}
                            options={[
                                { label: "Bank Reconciliation (as statement lines)", value: "reconciliation" },
                                { label: "Journal Entries (creates double-entry JEs)", value: "journal" },
                            ]}
                        />
                    </Space>
                    <Space direction="vertical" style={{ width: "100%" }} size={8}>
                        <Text strong>
                            {pushMode === "reconciliation" ? "Reconciliation ID" : "Bank Account"}
                        </Text>
                        {pushMode === "reconciliation" ? (
                            <Input
                                placeholder="Enter reconciliation ID..."
                                value={pushTarget}
                                onChange={(e) => setPushTarget(e.target.value)}
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
                            />
                        )}
                    </Space>
                </Space>
            </Modal>
        </>
    );
};

export default TransactionReviewDrawer;