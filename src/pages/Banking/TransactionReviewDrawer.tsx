import React, { useState, useEffect } from "react";
import {
    Drawer, Table, Typography, Space, Tag, Button, Tooltip,
    Select, Popconfirm, Badge, Alert, Row, Col, Statistic,
    Tabs, Progress, App, Modal, Form, Input, DatePicker, Card,
    Switch, InputNumber,
} from "antd";
import {
    CheckCircleOutlined, StopOutlined, PlusOutlined, MinusCircleOutlined,
    SendOutlined, ReloadOutlined, TagOutlined, DeleteOutlined, LinkOutlined,
    ApartmentOutlined,
} from "@ant-design/icons";
import LinkDocumentsModal from "./LinkDocumentsModal";
import SplitAccountsModal, { SplitRow } from "@components/accounting/SplitAccountsModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getImportById,
    reApplyRules,
    categorizeTransaction,
    bulkCategorize,
    excludeTransaction,
    uncategorizeTransaction,
    pushToJournalEntries,
    deleteImport,
    deleteTransactions,
    RawTransaction,
    TransactionStatus,
    BankStatementImport,
    CategorizeTransactionInput,
} from "@services/accounting/bankStatementImport";
import { getAllAccounts } from "@services/accounting/accounts";
import { fetchAllSuppliers } from "@services/supplier";
import dayjs from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";

dayjs.extend(quarterOfYear);

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

const fmtAmount = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const round2 = (n: number) => Math.round((n || 0) * 100) / 100;

/** The part of a transaction left for its category account(s) after invoice / bill links. */
const categoryAmount = (t: RawTransaction) =>
    round2(
        (Math.abs(t.debit || 0) || Math.abs(t.credit || 0)) -
        (t.allocations || []).reduce((s, a) => s + (a.amount || 0), 0)
    );

const CategorizeTxnModal: React.FC<CategorizeTxnModalProps> = ({
    open, onClose, onConfirm, transaction, accounts, suppliers, loading,
}) => {
    const [form] = Form.useForm();
    const splitMode: boolean = Form.useWatch("split_mode", form);
    const splitLines: { amount?: number }[] = Form.useWatch("splits", form) || [];
    const target = transaction ? categoryAmount(transaction) : 0;
    const splitTotal = round2(splitLines.reduce((s, l) => s + (l?.amount || 0), 0));
    const splitLeft = round2(target - splitTotal);

    useEffect(() => {
        if (open && transaction) {
            const existingSplits = transaction.splits || [];
            form.setFieldsValue({
                split_mode: existingSplits.length > 0,
                splits: existingSplits.length
                    ? existingSplits.map((s) => ({ account_id: s.account_id, amount: s.amount, description: s.description }))
                    : [{ account_id: transaction.account_id || undefined, amount: target || undefined }, {}],
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
        const { split_mode, splits, ...values } = await form.validateFields();
        if (split_mode) {
            if (Math.abs(splitLeft) > 0.01) return;
            const lines = (splits || []).map((s: any) => ({
                account_id: s.account_id,
                amount: s.amount,
                description: s.description || undefined,
            }));
            onConfirm({ ...values, account_id: lines[0].account_id, splits: lines });
        } else {
            onConfirm({ ...values, splits: [] });
        }
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
            okButtonProps={{ disabled: splitMode && Math.abs(splitLeft) > 0.01 }}
            width={splitMode ? 760 : 600}
            destroyOnClose
        >
            <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                <Space style={{ marginBottom: 12 }} align="center">
                    <Form.Item name="split_mode" valuePropName="checked" noStyle>
                        <Switch size="small" />
                    </Form.Item>
                    <Text>Split across several accounts</Text>
                    {transaction && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            (amount to categorize: {fmtAmount(target)})
                        </Text>
                    )}
                </Space>

                {splitMode ? (
                    <div style={{ marginBottom: 16 }}>
                        <Form.List name="splits">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name }) => (
                                        <Row gutter={8} key={key} align="top">
                                            <Col flex="auto">
                                                <Form.Item
                                                    name={[name, "account_id"]}
                                                    rules={[{ required: true, message: "Pick an account" }]}
                                                    style={{ marginBottom: 8 }}
                                                >
                                                    <Select
                                                        placeholder="Account..."
                                                        options={accountOptions}
                                                        showSearch
                                                        optionFilterProp="label"
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col flex="140px">
                                                <Form.Item
                                                    name={[name, "amount"]}
                                                    rules={[{ required: true, message: "Amount" }]}
                                                    style={{ marginBottom: 8 }}
                                                >
                                                    <InputNumber
                                                        min={0.01}
                                                        precision={2}
                                                        placeholder="0.00"
                                                        style={{ width: "100%" }}
                                                        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                                        parser={(v) => v!.replace(/,/g, "") as any}
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col flex="180px">
                                                <Form.Item name={[name, "description"]} style={{ marginBottom: 8 }}>
                                                    <Input placeholder="Memo (optional)" />
                                                </Form.Item>
                                            </Col>
                                            <Col flex="32px">
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<MinusCircleOutlined />}
                                                    onClick={() => remove(name)}
                                                    disabled={fields.length <= 2}
                                                />
                                            </Col>
                                        </Row>
                                    ))}
                                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                                        <Button
                                            type="dashed"
                                            icon={<PlusOutlined />}
                                            onClick={() => add({ amount: splitLeft > 0 ? splitLeft : undefined })}
                                        >
                                            Add account
                                        </Button>
                                        <Text type={Math.abs(splitLeft) > 0.01 ? "danger" : "success"}>
                                            {fmtAmount(splitTotal)} of {fmtAmount(target)}
                                            {Math.abs(splitLeft) > 0.01 &&
                                                (splitLeft > 0
                                                    ? ` — ${fmtAmount(splitLeft)} left`
                                                    : ` — ${fmtAmount(-splitLeft)} over`)}
                                        </Text>
                                    </Space>
                                </>
                            )}
                        </Form.List>
                    </div>
                ) : (
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
                )}
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
    const [linkTxn, setLinkTxn] = useState<RawTransaction | null>(null);
    const [splitTxn, setSplitTxn] = useState<RawTransaction | null>(null);
    const [categorizingBulk, setCategorizingBulk] = useState(false);
    const [bulkAccountId, setBulkAccountId] = useState<string | null>(null);
    const [pushModalOpen, setPushModalOpen] = useState(false);
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

    const accounts = accountsData?.accounts || [];
    const suppliers = Array.isArray(suppliersData) ? suppliersData : [];
    const accountOptions = accounts.map((a: any) => ({
        label: `${a.account_code} — ${a.account_name}`,
        value: a._id,
    }));
    const supplierOptions = suppliers.map((s: any) => ({
        label: s.name,
        value: s._id,
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
            setSplitTxn(null);
        },
    });

    // Quick split from the row: only the split changes, the rest of the categorization stays
    const saveSplit = (txn: RawTransaction, splits: SplitRow[]) =>
        categorizeMutation.mutate({
            txnId: txn._id,
            data: { account_id: splits[0]?.account_id || txn.account_id!, splits },
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
        mutationFn: () =>
            pushToJournalEntries(importId!, {
                bank_account_id: pushTarget,
                txn_ids: selectedRowKeys.length > 0 ? selectedRowKeys as string[] : undefined,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["import-detail", importId] });
            setPushModalOpen(false);
            setPushTarget("");
            setSelectedRowKeys([]);
            onSuccess();
        },
    });

    const deleteTxnsMutation = useMutation({
        mutationFn: (txnIds: string[]) => deleteTransactions(importId!, txnIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["import-detail", importId] });
            setSelectedRowKeys([]);
            onSuccess();
        },
    });

    const deleteImportMutation = useMutation({
        mutationFn: () => deleteImport(importId!),
        onSuccess: () => {
            onSuccess();
            onClose();
        },
    });

    const handleBulkDelete = () => {
        if (selectedRowKeys.length === 0) return;
        modal.confirm({
            title: `Delete ${selectedRowKeys.length} transaction${selectedRowKeys.length === 1 ? "" : "s"}?`,
            content: "They will be removed from this import permanently.",
            okText: "Delete",
            okButtonProps: { danger: true },
            onOk: () => deleteTxnsMutation.mutateAsync(selectedRowKeys as string[]),
        });
    };

    const handleDeleteImport = () => {
        modal.confirm({
            title: "Delete this import?",
            content: `${importDetail?.imported_rows || 0} transactions will be removed permanently. You can upload the statement again afterwards.`,
            okText: "Delete Import",
            okButtonProps: { danger: true },
            onOk: () => deleteImportMutation.mutateAsync(),
        });
    };

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
            width: 240,
            render: (v: string, r: RawTransaction) => (
                <Space direction="vertical" size={0}>
                    <Text style={{ fontSize: 13, whiteSpace: "normal" }}>{v}</Text>
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
                const links = r.allocations || [];
                const splits = r.splits || [];
                if (!r.account_name && !links.length && !splits.length) {
                    return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
                }
                return (
                    <Space direction="vertical" size={2}>
                        {splits.length > 0 ? (
                            <Tooltip title={`Split across ${splits.length} accounts`}>
                                <Space direction="vertical" size={2}>
                                    {splits.map((s, i) => (
                                        <Tag key={i} icon={<ApartmentOutlined />} color="purple" style={{ fontSize: 11 }}>
                                            {s.account_code} {s.account_name} · {fmtAmount(s.amount)}
                                        </Tag>
                                    ))}
                                </Space>
                            </Tooltip>
                        ) : r.account_name && (
                            <Tag icon={<TagOutlined />} color="blue" style={{ fontSize: 11 }}>
                                {r.account_code} {r.account_name}
                            </Tag>
                        )}
                        {links.map((a) => (
                            <Tooltip
                                key={a.doc_id}
                                title={
                                    a.payment_id
                                        ? "Payment recorded on the " + a.doc_type
                                        : "Payment is recorded when the journal is posted"
                                }
                            >
                                <Tag icon={<LinkOutlined />} color={a.payment_id ? "green" : "gold"} style={{ fontSize: 11 }}>
                                    {a.doc_no} · {a.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                </Tag>
                            </Tooltip>
                        ))}
                    </Space>
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
                <Badge
                    status={STATUS_COLORS[s] as any}
                    text={s === "Pushed" ? "Completed" : s}
                    style={{ fontSize: 12 }}
                />
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 180,
            fixed: "right" as const,
            render: (_: any, r: RawTransaction) => {
                const linkButton = (
                    <Tooltip title={Math.abs(r.debit || 0) > 0 ? "Link to bills" : "Link to invoices"}>
                        <Button
                            icon={<LinkOutlined />}
                            size="small"
                            type={r.allocations?.length ? "primary" : "default"}
                            ghost={!!r.allocations?.length}
                            onClick={() => setLinkTxn(r)}
                            disabled={r.status === "Excluded" || importDetail?.status === "Voided"}
                        />
                    </Tooltip>
                );
                if (r.status === "Pushed" || r.journal_entry_id) return linkButton;
                return (
                    <Space size={4}>
                        {linkButton}
                        <Tooltip title="Categorize">
                            <Button
                                icon={<TagOutlined />}
                                size="small"
                                onClick={() => openCategorize(r)}
                                disabled={r.status === "Excluded"}
                            />
                        </Tooltip>
                        {r.status === "Categorized" && categoryAmount(r) > 0 && (
                            <Tooltip title={r.splits?.length ? "Edit split" : "Split across accounts"}>
                                <Button
                                    icon={<ApartmentOutlined />}
                                    size="small"
                                    type={r.splits?.length ? "primary" : "default"}
                                    ghost={!!r.splits?.length}
                                    onClick={() => setSplitTxn(r)}
                                />
                            </Tooltip>
                        )}
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
                        <Popconfirm
                            title="Delete this transaction?"
                            onConfirm={() => deleteTxnsMutation.mutateAsync([r._id])}
                            okText="Delete"
                            okButtonProps={{ danger: true }}
                        >
                            <Tooltip title="Delete">
                                <Button icon={<DeleteOutlined />} size="small" danger />
                            </Tooltip>
                        </Popconfirm>
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
                            icon={<DeleteOutlined />}
                            danger
                            onClick={handleDeleteImport}
                            disabled={!importDetail || (importDetail.pushed_count || 0) > 0}
                            loading={deleteImportMutation.isLoading}
                            size="large"
                        >
                            Delete Import
                        </Button>
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
                            Mark Complete
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
                                title="Completed"
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
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                onClick={handleBulkDelete}
                                loading={deleteTxnsMutation.isLoading}
                                size="large"
                            >
                                Delete
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
                        label: s === "ALL" ? "All" : s === "Pushed" ? "Completed" : s,
                    }))}
                    tabBarExtraContent={
                        <DatePicker.RangePicker
                            size="large"
                            style={{ width: 280 }}
                            presets={[
                                { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
                                { label: "This Week", value: [dayjs().startOf("week"), dayjs().endOf("week")] },
                                { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
                                { label: "Last Month", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
                                { label: "This Quarter", value: [dayjs().startOf("quarter"), dayjs().endOf("quarter")] },
                                { label: "Last Quarter", value: [dayjs().subtract(1, "quarter").startOf("quarter"), dayjs().subtract(1, "quarter").endOf("quarter")] },
                                { label: "This Year", value: [dayjs().startOf("year"), dayjs().endOf("year")] },
                                { label: "Last Year", value: [dayjs().subtract(1, "year").startOf("year"), dayjs().subtract(1, "year").endOf("year")] },
                            ]}
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
                            disabled: r.status === "Pushed" || !!r.journal_entry_id,
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

            {/* ── Split a categorized transaction across accounts ── */}
            <SplitAccountsModal
                open={!!splitTxn}
                total={splitTxn ? categoryAmount(splitTxn) : 0}
                title="Split transaction across accounts"
                subtitle={
                    splitTxn
                        ? `${splitTxn.description} — ${fmtAmount(categoryAmount(splitTxn))} to split${
                            splitTxn.allocations?.length ? " (after linked invoices / bills)" : ""
                        }`
                        : undefined
                }
                initialRows={
                    splitTxn?.splits?.length
                        ? splitTxn.splits
                        : splitTxn
                            ? [
                                { account_id: splitTxn.account_id || "", amount: categoryAmount(splitTxn) },
                                { account_id: "", amount: 0 },
                            ]
                            : undefined
                }
                accountOptions={accountOptions.filter(
                    (o: { value: string }) => o.value !== (importDetail?.account_id as any)?._id && o.value !== importDetail?.account_id
                )}
                onClose={() => setSplitTxn(null)}
                onApply={(rows) => splitTxn && saveSplit(splitTxn, rows)}
                onRemove={
                    splitTxn?.splits?.length
                        ? () => categorizeMutation.mutate({
                            txnId: splitTxn._id,
                            data: { account_id: splitTxn.account_id!, splits: [] },
                        })
                        : undefined
                }
            />

            {/* ── Link to invoices / bills ── */}
            <LinkDocumentsModal
                open={!!linkTxn}
                importId={importId}
                txn={linkTxn}
                onClose={() => setLinkTxn(null)}
                onLinked={() => {
                    queryClient.invalidateQueries({ queryKey: ["import-detail", importId] });
                    queryClient.invalidateQueries({ queryKey: ["linkable-documents"] });
                    onSuccess();
                }}
            />

            {/* ── Push Modal ── */}
            <Modal
                open={pushModalOpen}
                title="Complete Transactions"
                onCancel={() => setPushModalOpen(false)}
                onOk={() => {
                    if (!pushMutation.isLoading) pushMutation.mutate();
                }}
                confirmLoading={pushMutation.isLoading}
                okText="Complete"
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
                        description={`${selectedRowKeys.length > 0 ? "Selected transactions only" : "All categorized transactions"}. Already completed transactions are skipped and cannot be posted twice.`}
                    />
                    <div>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>Bank Account</Text>
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
                    </div>
                </Space>
            </Modal>
        </>
    );
};

export default TransactionReviewDrawer;