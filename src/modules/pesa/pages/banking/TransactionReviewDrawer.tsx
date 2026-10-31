import React, { useState, useEffect } from "react";
import {
    Drawer, Table, Typography, Space, Tag, Button, Tooltip,
    Select, Popconfirm, Badge, Alert, Row, Col,
    Tabs, Progress, App, Modal, Form, Input, DatePicker,
    Switch, InputNumber, Dropdown,
} from "antd";
import {
    CheckCircleOutlined, StopOutlined, PlusOutlined, MinusCircleOutlined,
    SendOutlined, ReloadOutlined, TagOutlined, DeleteOutlined, LinkOutlined,
    ApartmentOutlined, FileSearchOutlined, EyeOutlined, MoreOutlined,
    ThunderboltOutlined, BulbOutlined,
} from "@ant-design/icons";
import LinkDocumentsModal from "./LinkDocumentsModal";
import SmartAssistDrawer from "./SmartAssistDrawer";
import SmartAssistBar, { type AssistTab } from "./SmartAssistBar";
import { similarUncategorized, ruleFor } from "./smartAssistMatch";
import JournalEntryDetailDrawer from "../journals/JournalEntryDetailDrawer";
import JournalEntryFormDrawer from "../journals/JournalEntryFormDrawer";
import SplitAccountsModal, { SplitRow } from "@components/accounting/SplitAccountsModal";
import SplitJournalLineModal from "@components/accounting/SplitJournalLineModal";
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
    addTransaction,
    AddTransactionInput,
    verifyPosting,
    getImportAssist,
    createCategorizationRule,
    AssistSuggestion,
    AssistPattern,
    AssistWatchout,
    RawTransaction,
    TransactionStatus,
    BankStatementImport,
    CategorizeTransactionInput,
    UnpostedTransaction,
    REPOSTABLE_REASONS,
    UNPOSTED_REASON_LABELS,
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

interface AddManualTxnModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (data: AddTransactionInput) => void;
    accountOptions: { label: string; value: string }[];
    loading: boolean;
}

/** A transaction the statement file missed, entered by hand. */
const AddManualTxnModal: React.FC<AddManualTxnModalProps> = ({
    open, onClose, onConfirm, accountOptions, loading,
}) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) form.setFieldsValue({ transaction_date: dayjs(), direction: "out" });
        else form.resetFields();
    }, [open, form]);

    const handleOk = async () => {
        const { transaction_date, ...values } = await form.validateFields();
        onConfirm({
            ...values,
            transaction_date: transaction_date.format("YYYY-MM-DD"),
            reference: values.reference || undefined,
            account_id: values.account_id || undefined,
            notes: values.notes || undefined,
        });
    };

    return (
        <Modal
            open={open}
            title="Add Manual Transaction"
            onCancel={onClose}
            onOk={handleOk}
            confirmLoading={loading}
            okText="Add"
            width={560}
            destroyOnClose
        >
            <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item
                            name="transaction_date"
                            label="Date"
                            rules={[{ required: true, message: "Pick a date" }]}
                        >
                            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="reference" label="Reference">
                            <Input placeholder="Optional" />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item
                    name="description"
                    label="Description"
                    rules={[{ required: true, whitespace: true, message: "Enter a description" }]}
                >
                    <Input placeholder="e.g. Bank charges" />
                </Form.Item>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item name="direction" label="Type" rules={[{ required: true }]}>
                            <Select
                                options={[
                                    { label: "Money out (debit)", value: "out" },
                                    { label: "Money in (credit)", value: "in" },
                                ]}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="amount"
                            label="Amount (KES)"
                            rules={[{ required: true, message: "Enter an amount" }]}
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
                </Row>
                <Form.Item
                    name="account_id"
                    label="Account"
                    extra="Optional — picking one categorizes the transaction straight away"
                >
                    <Select
                        placeholder="Select account..."
                        options={accountOptions}
                        showSearch
                        optionFilterProp="label"
                        allowClear
                    />
                </Form.Item>
                <Form.Item name="notes" label="Notes">
                    <Input.TextArea rows={2} placeholder="Optional" />
                </Form.Item>
            </Form>
        </Modal>
    );
};

const TransactionReviewDrawer: React.FC<Props> = ({
    open, onClose, onSuccess, importRecord, shopId,
}) => {
    const { modal, notification } = App.useApp();
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState<TransactionStatus | "ALL">("ALL");
    const [page, setPage] = useState(1);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [categorizeModal, setCategorizeModal] = useState(false);
    const [activeTxn, setActiveTxn] = useState<RawTransaction | null>(null);
    const [linkTxn, setLinkTxn] = useState<RawTransaction | null>(null);
    const [splitTxn, setSplitTxn] = useState<RawTransaction | null>(null);
    const [splitPostedTxn, setSplitPostedTxn] = useState<RawTransaction | null>(null);
    const [categorizingBulk, setCategorizingBulk] = useState(false);
    const [bulkAccountId, setBulkAccountId] = useState<string | null>(null);
    const [pushModalOpen, setPushModalOpen] = useState(false);
    const [addTxnOpen, setAddTxnOpen] = useState(false);
    const [assistOpen, setAssistOpen] = useState(false);
    const [assistTab, setAssistTab] = useState<AssistTab>("suggestions");
    const [assistBusy, setAssistBusy] = useState<string | null>(null);
    const openAssist = (tab: AssistTab) => {
        setAssistTab(tab);
        setAssistOpen(true);
    };
    const [pushTarget, setPushTarget] = useState<string>("");
    const [dateRange, setDateRange] = useState<[string, string] | null>(null);
    // Journal entry check — which transactions don't show in the bank's ledger
    const [entryCheckOn, setEntryCheckOn] = useState(false);
    const [issuesOnly, setIssuesOnly] = useState(false);
    const [viewEntryId, setViewEntryId] = useState<string | null>(null);
    const [editEntryId, setEditEntryId] = useState<string | null>(null);

    const importId = importRecord?._id;
    // The issue filter works client-side, so it needs every row like the date filter
    const loadAll = !!dateRange || issuesOnly;

    const { data, isLoading } = useQuery({
        queryKey: ["import-detail", importId, issuesOnly ? "ALL" : statusFilter, loadAll ? 1 : page, dateRange, loadAll],
        queryFn: () =>
            getImportById(importId!, {
                status_filter: issuesOnly || statusFilter === "ALL" ? undefined : statusFilter,
                page: loadAll ? 1 : page,
                limit: loadAll ? 10000 : 50,
            }),
        enabled: open && !!importId,
        keepPreviousData: true,
        refetchOnWindowFocus: false,
    });

    const { data: entryCheck, isFetching: entryCheckLoading, refetch: recheckEntries } = useQuery({
        queryKey: ["verify-posting", importId],
        queryFn: () => verifyPosting(importId!),
        enabled: open && !!importId && entryCheckOn,
        refetchOnWindowFocus: false,
    });
    const issueById = new Map<string, UnpostedTransaction>(
        (entryCheck?.unposted || []).map((t) => [String(t._id), t])
    );
    const issueCounts = (entryCheck?.unposted || []).reduce<Record<string, number>>((acc, t) => {
        acc[t.reason] = (acc[t.reason] || 0) + 1;
        return acc;
    }, {});
    const repostableIds = (entryCheck?.unposted || [])
        .filter((t) => !!t.account_id && REPOSTABLE_REASONS.includes(t.reason))
        .map((t) => String(t._id));

    // Smart Assist suggestions (history only — the AI runs from the drawer on
    // request) shown inline on uncategorized rows. Shares its cache with the drawer.
    const { data: assist } = useQuery({
        queryKey: ["import-assist", importId, false],
        queryFn: () => getImportAssist(importId!),
        enabled: open && !!importId,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
    });
    const suggestionByTxn = new Map<string, AssistSuggestion>(
        (assist?.suggestions ?? []).map((s) => [s.txn_id, s])
    );
    // Duplicates / unusual amounts, flagged on their rows
    const watchoutsByTxn = new Map<string, AssistWatchout[]>();
    for (const w of assist?.watchouts ?? []) {
        if (w.txn_id) watchoutsByTxn.set(w.txn_id, [...(watchoutsByTxn.get(w.txn_id) ?? []), w]);
    }

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

    // Client-side date / journal-entry-issue filtering
    const transactions = allTransactions.filter((txn: RawTransaction) => {
        if (issuesOnly && !issueById.has(String(txn._id))) return false;
        if (!dateRange) return true;
        const txnDate = dayjs(txn.transaction_date).format('YYYY-MM-DD');
        return txnDate >= dateRange[0] && txnDate <= dateRange[1];
    });

    useEffect(() => {
        if (!open) {
            setPage(1);
            setSelectedRowKeys([]);
            setStatusFilter("ALL");
            setDateRange(null);
            setEntryCheckOn(false);
            setIssuesOnly(false);
        }
    }, [open]);

    const refreshAfterEntryFix = () => {
        queryClient.invalidateQueries({ queryKey: ["import-detail", importId] });
        queryClient.invalidateQueries({ queryKey: ["verify-posting", importId] });
        onSuccess();
    };

    // Re-post transactions whose journal entry is missing, deleted or voided
    const bankAccountId = String((importDetail?.account_id as any)?._id || importDetail?.account_id || "");
    const repostMutation = useMutation({
        mutationFn: (txnIds: string[]) =>
            pushToJournalEntries(importId!, { bank_account_id: bankAccountId, txn_ids: txnIds }),
        onSuccess: refreshAfterEntryFix,
    });

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
        onSuccess: (_res, { txnId, data }) => {
            queryClient.invalidateQueries({ queryKey: ["import-detail", importId] });
            // Each decision teaches Smart Assist — refresh its suggestions
            queryClient.invalidateQueries({ queryKey: ["import-assist", importId] });
            // …and offers to repeat it for look-alike lines (splits are one-offs)
            if (!data.splits?.length) offerFollowUp(txnId, data);
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

    const addTxnMutation = useMutation({
        mutationFn: (data: AddTransactionInput) => addTransaction(importId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["import-detail", importId] });
            setAddTxnOpen(false);
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

    // ── Smart Assist actions ────────────────────────────────────────────────
    const refreshAssist = () => {
        queryClient.invalidateQueries({ queryKey: ["import-detail", importId] });
        queryClient.invalidateQueries({ queryKey: ["import-assist", importId] });
        onSuccess();
    };

    /** A rule for this bank account that categorizes matching lines from now on, then applied here. */
    const saveRule = async (
        rule: { name: string; conditions: any[]; apply_to: "deposits" | "withdrawals" },
        account: { account_id: string; account_code?: string; account_name?: string }
    ) => {
        await createCategorizationRule({
            shop_id: shopId,
            name: rule.name,
            is_active: true,
            match_type: "all",
            conditions: rule.conditions,
            actions: account,
            apply_to: rule.apply_to,
            transaction_handling: "recognized",
            auto_categorize: true,
            associate_accounts: "custom",
            associated_account_id: [bankAccountId],
        });
        await reApplyRules(importId!, { reset_categorized: false });
        refreshAssist();
    };

    // Every suggestion that is 80%+ sure, one bulk call per account
    const acceptSureSuggestions = async () => {
        const sure = (assist?.suggestions ?? []).filter((s) => s.confidence >= 80);
        if (!sure.length) return;
        setAssistBusy("sure");
        try {
            const byAccount = new Map<string, AssistSuggestion[]>();
            for (const s of sure) byAccount.set(s.account_id, [...(byAccount.get(s.account_id) ?? []), s]);
            for (const [account_id, list] of byAccount) {
                await bulkCategorize(importId!, {
                    account_id,
                    account_code: list[0].account_code,
                    account_name: list[0].account_name,
                    txn_ids: list.map((s) => s.txn_id),
                });
            }
            refreshAssist();
        } finally {
            setAssistBusy(null);
        }
    };

    const createRuleFromPattern = async (p: AssistPattern) => {
        if (!p.suggested_rule) return;
        setAssistBusy(`rule-${p.key}`);
        try {
            await saveRule(p.suggested_rule, p.suggested_rule.actions as any);
        } finally {
            setAssistBusy(null);
        }
    };

    /**
     * Right after someone categorizes a line: if other uncategorized lines
     * look like it, offer to do the same for them — and to make it a rule so
     * future statements are done automatically.
     */
    const offerFollowUp = (txnId: string, data: CategorizeTransactionInput) => {
        const line = allTransactions.find((t: RawTransaction) => String(t._id) === String(txnId));
        if (!line || !data.account_id) return;
        const similar = similarUncategorized(line, allTransactions);
        const account = {
            account_id: data.account_id,
            account_code: data.account_code ?? accounts.find((a: any) => a._id === data.account_id)?.account_code,
            account_name: data.account_name ?? accounts.find((a: any) => a._id === data.account_id)?.account_name,
        };
        const rule = ruleFor([line, ...similar], account);
        // Nothing to repeat and only one line seen so far — not worth a prompt
        if (!similar.length && !(rule && (assist?.patterns ?? []).some((p) => !p.covered_by_rule && p.sample_descriptions.some((d) => d === line.description)))) return;

        const key = `assist-follow-${txnId}`;
        const accountLabel = `${account.account_code ?? ""} ${account.account_name ?? ""}`.trim();
        notification.open({
            key,
            placement: "bottomRight",
            duration: 15,
            icon: <BulbOutlined style={{ color: "#722ed1" }} />,
            message: similar.length
                ? `${similar.length} more line${similar.length === 1 ? " looks" : "s look"} like this`
                : "Make this automatic?",
            description: (
                <div style={{ fontSize: 12.5 }}>
                    {similar.length ? (
                        <>
                            Categorize {similar.length === 1 ? "it" : "them"} to <strong>{accountLabel}</strong> too?
                            <div style={{ color: "#8c8c8c", marginTop: 4 }}>
                                {similar.slice(0, 3).map((s) => (
                                    <div key={s._id} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        · {s.description}
                                    </div>
                                ))}
                                {similar.length > 3 && <div>· and {similar.length - 3} more</div>}
                            </div>
                        </>
                    ) : (
                        <>This payee comes up regularly. Always categorize it to <strong>{accountLabel}</strong>?</>
                    )}
                    {rule && (
                        <div style={{ color: "#8c8c8c", marginTop: 6 }}>
                            A rule catches narrations containing “{rule.phrase}” on future statements too.
                        </div>
                    )}
                </div>
            ),
            btn: (
                <Space>
                    {rule && (
                        <Button
                            size="small"
                            onClick={async () => {
                                notification.destroy(key);
                                await saveRule(rule, account);
                            }}
                        >
                            Always do this
                        </Button>
                    )}
                    {similar.length > 0 && (
                        <Button
                            size="small"
                            type="primary"
                            onClick={async () => {
                                notification.destroy(key);
                                await bulkCategorize(importId!, { ...account, txn_ids: similar.map((s) => s._id) });
                                refreshAssist();
                            }}
                        >
                            Apply to {similar.length}
                        </Button>
                    )}
                </Space>
            ),
        });
    };

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
    // Reviewed = categorized or already completed (completed rows are no
    // longer "categorized", so counting only those showed 0% when all done)
    const reviewedCount = (importDetail?.categorized_count || 0) + (importDetail?.pushed_count || 0);
    const catPct = (importDetail?.imported_rows || 0) > 0
        ? Math.min(100, Math.round((reviewedCount / (importDetail?.imported_rows || 1)) * 100))
        : 0;
    const fmtKes = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 2 });
    const tabCounts: Partial<Record<TransactionStatus | "ALL", number | undefined>> = {
        ALL: importDetail?.imported_rows,
        Uncategorized: importDetail?.uncategorized_count,
        Categorized: importDetail?.categorized_count,
        Pushed: importDetail?.pushed_count,
    };

    const STATUS_TABS: (TransactionStatus | "ALL")[] = [
        "ALL", "Uncategorized", "Categorized", "Excluded", "Pushed",
    ];

    const columns = [
        {
            title: "Date",
            dataIndex: "transaction_date",
            width: 100,
            render: (v: string) => (
                <Text style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                    {dayjs(v).isValid() ? dayjs(v).format("DD MMM YYYY") : v}
                </Text>
            ),
        },
        {
            title: "Description",
            dataIndex: "description",
            width: 230,
            // Long bank narrations are capped at two lines; full text on hover
            render: (v: string, r: RawTransaction) => (
                <div style={{ minWidth: 0 }}>
                    <Typography.Paragraph
                        ellipsis={{ rows: 2, tooltip: v }}
                        style={{ fontSize: 13, marginBottom: 0 }}
                    >
                        {v}
                    </Typography.Paragraph>
                    {r.reference && (
                        <Text type="secondary" ellipsis={{ tooltip: r.reference }} style={{ fontSize: 11, display: "block" }}>
                            {r.reference}
                        </Text>
                    )}
                    {r.is_manual && (
                        <Tooltip title="Added by hand, not from the statement file">
                            <Tag style={{ fontSize: 10, marginTop: 2 }}>Manual</Tag>
                        </Tooltip>
                    )}
                </div>
            ),
        },
        {
            title: "Account",
            key: "account",
            width: 180,
            render: (_: any, r: RawTransaction) => {
                const links = r.allocations || [];
                const splits = r.splits || [];
                if (!r.account_name && !links.length && !splits.length) {
                    // Smart Assist: the account similar lines went to, one click to accept
                    const s = r.status === "Uncategorized" ? suggestionByTxn.get(String(r._id)) : undefined;
                    if (!s) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
                    return (
                        <Tooltip
                            title={`Suggested — ${s.confidence}% sure, from ${s.based_on} similar line${s.based_on === 1 ? "" : "s"}. Click to accept.`}
                        >
                            <Tag
                                icon={<BulbOutlined />}
                                color={s.confidence >= 80 ? "green" : "gold"}
                                style={{ fontSize: 11, cursor: "pointer", borderStyle: "dashed" }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    categorizeMutation.mutate({
                                        txnId: r._id,
                                        data: { account_id: s.account_id, account_code: s.account_code, account_name: s.account_name },
                                    });
                                }}
                            >
                                {s.account_code} {s.account_name} · {s.confidence}%
                            </Tag>
                        </Tooltip>
                    );
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
            // Debit (money out, red, −) and credit (money in, green, +) in one
            // column — two separate columns didn't fit the drawer.
            title: "Amount",
            key: "amount",
            width: 120,
            align: "right" as const,
            render: (_: any, r: RawTransaction) => {
                let out = 0;
                let inn = 0;
                if (importDetail?.amount_column_type === "single" && r.original_amount !== undefined) {
                    if (r.original_amount < 0) out = Math.abs(r.original_amount);
                    else if (r.original_amount > 0) inn = r.original_amount;
                } else {
                    out = r.debit > 0 ? r.debit : 0;
                    inn = r.credit > 0 ? r.credit : 0;
                }
                if (out > 0) {
                    return <Text style={{ color: "#cf1322", fontSize: 12, whiteSpace: "nowrap" }}>−{fmtKes(out)}</Text>;
                }
                if (inn > 0) {
                    return <Text style={{ color: "#389e0d", fontSize: 12, whiteSpace: "nowrap" }}>+{fmtKes(inn)}</Text>;
                }
                return <Text type="secondary">—</Text>;
            },
        },
        {
            title: "Status",
            dataIndex: "status",
            width: 120,
            render: (s: TransactionStatus, r: RawTransaction) => {
                const issue = issueById.get(String(r._id));
                const cfg = issue ? UNPOSTED_REASON_LABELS[issue.reason] : null;
                const flags = s === "Excluded" ? [] : watchoutsByTxn.get(String(r._id)) ?? [];
                return (
                    <Space direction="vertical" size={2}>
                        <Badge
                            status={STATUS_COLORS[s] as any}
                            text={s === "Pushed" ? "Completed" : s}
                            style={{ fontSize: 12 }}
                        />
                        {cfg && (
                            <Tooltip title={`${cfg.hint}${issue?.journal_entry_no ? ` (${issue.journal_entry_no})` : ""}`}>
                                <Tag color={cfg.color} style={{ fontSize: 11, margin: 0 }}>{cfg.label}</Tag>
                            </Tooltip>
                        )}
                        {flags.map((w, i) => (
                            <Tooltip key={i} title={w.detail}>
                                <Tag
                                    color={w.severity === "high" ? "red" : "orange"}
                                    style={{ fontSize: 11, margin: 0, cursor: "pointer" }}
                                    onClick={() => openAssist("watchouts")}
                                >
                                    {w.type === "duplicate" ? "Duplicate?" : "Unusual amount"}
                                </Tag>
                            </Tooltip>
                        ))}
                    </Space>
                );
            },
        },
        {
            title: "Actions",
            key: "actions",
            width: 165,
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
                if (r.status === "Pushed" || r.journal_entry_id) {
                    // Already posted — a split edits the journal entry it posted
                    const issue = issueById.get(String(r._id));
                    const entryId = issue?.journal_entry_id || r.journal_entry_id;
                    const canRepost = !!issue && repostableIds.includes(String(r._id));
                    return (
                        <Space size={4}>
                            {linkButton}
                            {canRepost && (
                                <Tooltip title="Re-post its journal entry">
                                    <Button
                                        icon={<SendOutlined />}
                                        size="small"
                                        type="primary"
                                        loading={repostMutation.isLoading}
                                        onClick={() => repostMutation.mutate([String(r._id)])}
                                    />
                                </Tooltip>
                            )}
                            {!canRepost && entryId && (
                                <Tooltip title="View journal entry">
                                    <Button
                                        icon={<EyeOutlined />}
                                        size="small"
                                        type={issue ? "primary" : "default"}
                                        ghost={!!issue}
                                        onClick={() => setViewEntryId(String(entryId))}
                                    />
                                </Tooltip>
                            )}
                            {r.journal_entry_id && importDetail?.status !== "Voided" && (
                                <Tooltip title="Split across accounts">
                                    <Button
                                        icon={<ApartmentOutlined />}
                                        size="small"
                                        onClick={() => setSplitPostedTxn(r)}
                                    />
                                </Tooltip>
                            )}
                        </Space>
                    );
                }
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
                // Title and actions share one wrapping row: when the buttons
                // don't fit beside the title they drop to their own line
                // instead of squeezing the title to one letter per line.
                title={
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <Space size={8} style={{ whiteSpace: "nowrap" }}>
                        <Text strong style={{ fontSize: 18 }}>Review Transactions</Text>
                        {importRecord && (
                            <Tag color="blue" style={{ margin: 0 }}>
                                {importRecord.import_no}
                            </Tag>
                        )}
                    </Space>
                    <Space wrap size={8} style={{ fontWeight: "normal" }}>
                        <Tooltip title="Suggestions from your history, recurring payees and things that look off">
                            <Badge
                                count={(assist?.summary.suggested ?? 0) + (assist?.summary.watchouts ?? 0)}
                                size="small"
                                color="#722ed1"
                            >
                                <Button
                                    icon={<ThunderboltOutlined />}
                                    onClick={() => openAssist("suggestions")}
                                    disabled={!importDetail}
                                    style={{ borderColor: "#d3adf7", color: "#722ed1" }}
                                >
                                    Smart Assist
                                </Button>
                            </Badge>
                        </Tooltip>
                        <Button
                            icon={<PlusOutlined />}
                            onClick={() => setAddTxnOpen(true)}
                            disabled={!importDetail || importDetail.status === "Voided"}
                        >
                            Add Transaction
                        </Button>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => reApplyMutation.mutate()}
                            loading={reApplyMutation.isLoading}
                        >
                            Re-apply Rules
                        </Button>
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={() => setPushModalOpen(true)}
                            disabled={!importDetail?.categorized_count}
                        >
                            Mark Complete
                        </Button>
                        <Dropdown
                            trigger={["click"]}
                            placement="bottomRight"
                            menu={{
                                items: [
                                    {
                                        key: "check",
                                        icon: <FileSearchOutlined />,
                                        label: (
                                            <Tooltip placement="left" title="Find completed or categorized transactions whose journal entry is missing, or won't show in this bank's ledger">
                                                Check Journal Entries
                                            </Tooltip>
                                        ),
                                    },
                                    { type: "divider" },
                                    {
                                        key: "delete",
                                        icon: <DeleteOutlined />,
                                        danger: true,
                                        label: "Delete Import",
                                        disabled: !importDetail || (importDetail.pushed_count || 0) > 0,
                                    },
                                ],
                                onClick: ({ key }) => {
                                    if (key === "check") {
                                        if (entryCheckOn) recheckEntries();
                                        else setEntryCheckOn(true);
                                    }
                                    if (key === "delete") handleDeleteImport();
                                },
                            }}
                        >
                            <Button
                                icon={<MoreOutlined />}
                                loading={entryCheckLoading || deleteImportMutation.isLoading}
                                aria-label="More actions"
                            />
                        </Dropdown>
                    </Space>
                    </div>
                }
                open={open}
                onClose={onClose}
                width={1000}
                destroyOnClose
            >
                {/* ── Summary strip ── */}
                <div
                    style={{
                        display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 28px",
                        padding: "12px 16px", marginBottom: 16,
                        border: "1px solid #f0f0f0", borderRadius: 8, background: "#fafafa",
                    }}
                >
                    {[
                        { label: "Total", value: importDetail?.imported_rows || 0 },
                        { label: "Uncategorized", value: importDetail?.uncategorized_count || 0, color: "#d48806" },
                        { label: "Categorized", value: importDetail?.categorized_count || 0, color: "#389e0d" },
                        { label: "Completed", value: importDetail?.pushed_count || 0, color: "#1677ff" },
                    ].map((s) => (
                        <div key={s.label}>
                            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>{s.label}</Text>
                            <Text strong style={{ fontSize: 18, color: s.color }}>{s.value}</Text>
                        </div>
                    ))}
                    <div style={{ flex: "1 1 140px", minWidth: 140 }}>
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Reviewed</Text>
                        <Progress percent={catPct} size="small" strokeColor="#52c41a" style={{ margin: 0 }} />
                    </div>
                    <div style={{ textAlign: "right", marginLeft: "auto" }}>
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>Money out / in (KES)</Text>
                        <Text style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                            <Text type="danger">−{fmtKes(totalDebits)}</Text>
                            <Text type="secondary">{"  /  "}</Text>
                            <Text type="success">+{fmtKes(totalCredits)}</Text>
                        </Text>
                    </div>
                </div>

                {/* ── Smart Assist nudges: suggestions, rules, watch-outs ── */}
                <SmartAssistBar
                    assist={assist}
                    readOnly={importDetail?.status === "Voided" || importDetail?.status === "Fully Pushed"}
                    busy={assistBusy}
                    onAcceptSure={acceptSureSuggestions}
                    onCreateRule={createRuleFromPattern}
                    onOpen={openAssist}
                />

                {/* ── Journal entry check result ── */}
                {entryCheckOn && entryCheck && (
                    entryCheck.all_posted ? (
                        <Alert
                            type="success"
                            showIcon
                            closable
                            onClose={() => { setEntryCheckOn(false); setIssuesOnly(false); }}
                            style={{ marginBottom: 16 }}
                            message={`All ${entryCheck.total_checked} transactions have a posted journal entry on this bank account`}
                            description="If the bank's ledger still shows fewer, check its date range and branch filter."
                        />
                    ) : (
                        <Alert
                            type="warning"
                            showIcon
                            closable
                            onClose={() => { setEntryCheckOn(false); setIssuesOnly(false); }}
                            style={{ marginBottom: 16 }}
                            message={`${entryCheck.unposted_count} of ${entryCheck.total_checked} transactions are missing from this bank's ledger or not posted yet`}
                            description={
                                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                    <Space wrap size={4}>
                                        {Object.entries(issueCounts).map(([reason, n]) => {
                                            const cfg = UNPOSTED_REASON_LABELS[reason as keyof typeof UNPOSTED_REASON_LABELS];
                                            return (
                                                <Tooltip key={reason} title={cfg?.hint}>
                                                    <Tag color={cfg?.color}>{cfg?.label || reason}: {n}</Tag>
                                                </Tooltip>
                                            );
                                        })}
                                    </Space>
                                    <Space wrap>
                                        <Switch
                                            checked={issuesOnly}
                                            onChange={(v) => { setIssuesOnly(v); setStatusFilter("ALL"); setPage(1); }}
                                            checkedChildren="Showing only these"
                                            unCheckedChildren="Show only these"
                                        />
                                        {repostableIds.length > 0 && (
                                            <Popconfirm
                                                title={`Re-post ${repostableIds.length} transaction${repostableIds.length === 1 ? "" : "s"}?`}
                                                description="Creates a journal entry on this statement's bank account for each one."
                                                onConfirm={() => repostMutation.mutateAsync(repostableIds)}
                                                okText="Re-post"
                                            >
                                                <Button size="small" type="primary" icon={<SendOutlined />} loading={repostMutation.isLoading}>
                                                    Re-post {repostableIds.length} missing
                                                </Button>
                                            </Popconfirm>
                                        )}
                                        <Button size="small" icon={<ReloadOutlined />} onClick={() => recheckEntries()} loading={entryCheckLoading}>
                                            Re-check
                                        </Button>
                                    </Space>
                                </Space>
                            }
                        />
                    )
                )}

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
                            />
                            <Button
                                type="primary"
                                icon={<TagOutlined />}
                                onClick={handleBulkCategorize}
                                disabled={!bulkAccountId}
                                loading={bulkCategorizeMutation.isLoading}
                            >
                                Apply
                            </Button>
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                onClick={handleBulkDelete}
                                loading={deleteTxnsMutation.isLoading}
                            >
                                Delete
                            </Button>
                            <Button onClick={() => setSelectedRowKeys([])}>Clear</Button>
                        </Space>
                    </div>
                )}

                {/* ── Status Tabs ── */}
                <Tabs
                    activeKey={statusFilter}
                    onChange={(k) => { setStatusFilter(k as any); setPage(1); }}
                    style={{ marginBottom: 8 }}
                    items={STATUS_TABS.map((s) => {
                        const n = tabCounts[s];
                        const name = s === "ALL" ? "All" : s === "Pushed" ? "Completed" : s;
                        return {
                            key: s,
                            label: (
                                <span>
                                    {name}
                                    {n !== undefined && <Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>{n}</Text>}
                                </span>
                            ),
                        };
                    })}
                    tabBarExtraContent={
                        <DatePicker.RangePicker
                            style={{ width: 250 }}
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
                    size="small"
                    scroll={{ x: 930 }}
                    rowSelection={{
                        selectedRowKeys,
                        onChange: setSelectedRowKeys,
                        getCheckboxProps: (r: RawTransaction) => ({
                            disabled: r.status === "Pushed" || !!r.journal_entry_id,
                        }),
                    }}
                    pagination={
                        loadAll
                            ? { pageSize: 50, showTotal: (t) => `${t} transactions`, showSizeChanger: false }
                            : {
                                current: page,
                                total: totalTxns,
                                pageSize: 50,
                                onChange: (p) => setPage(p),
                                showTotal: (t) => `${t} transactions`,
                                showSizeChanger: false,
                            }
                    }
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

            {/* ── Smart Assist: suggestions, recurring payees, watch-outs ── */}
            <SmartAssistDrawer
                open={assistOpen}
                initialTab={assistTab}
                onClose={() => setAssistOpen(false)}
                importId={importId}
                shopId={shopId}
                bankAccountId={bankAccountId}
                readOnly={importDetail?.status === "Voided" || importDetail?.status === "Fully Pushed"}
                onChanged={onSuccess}
            />

            {/* ── Add a transaction by hand ── */}
            <AddManualTxnModal
                open={addTxnOpen}
                onClose={() => setAddTxnOpen(false)}
                onConfirm={(d) => addTxnMutation.mutate(d)}
                accountOptions={accountOptions.filter(
                    (o: { value: string }) => o.value !== bankAccountId
                )}
                loading={addTxnMutation.isLoading}
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

            {/* ── Journal entry behind a flagged transaction ── */}
            <JournalEntryDetailDrawer
                open={!!viewEntryId}
                entryId={viewEntryId}
                onClose={() => setViewEntryId(null)}
                onSuccess={refreshAfterEntryFix}
                onEdit={(id) => setEditEntryId(id)}
            />
            <JournalEntryFormDrawer
                open={!!editEntryId}
                entryId={editEntryId}
                shopId={shopId}
                onClose={() => setEditEntryId(null)}
                onSuccess={() => {
                    setEditEntryId(null);
                    refreshAfterEntryFix();
                }}
            />

            {/* ── Split a completed transaction's posted entry ── */}
            <SplitJournalLineModal
                entryId={splitPostedTxn?.journal_entry_id || null}
                accountId={splitPostedTxn?.account_id}
                onClose={() => setSplitPostedTxn(null)}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ["import-detail", importId] })}
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