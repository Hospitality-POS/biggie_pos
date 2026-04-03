import React, { useEffect, useState } from "react";
import {
    ProForm,
    ProFormText,
    ProFormDatePicker,
    ProFormSwitch,
    ProFormTextArea,
} from "@ant-design/pro-components";
import {
    Drawer,
    Button,
    Space,
    Select,
    InputNumber,
    Input,
    Table,
    Typography,
    Tag,
    Divider,
    Alert,
    Tabs,
} from "antd";
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
    createManualEntry,
    createExpenseEntry,
    CreateManualEntryParams,
    CreateExpenseEntryParams,
} from "@services/accounting/journals";
import { getAllAccounts, ChartOfAccount } from "@services/accounting/accounts";
import dayjs from "dayjs";

const { Text } = Typography;

// ── Types ──────────────────────────────────────────────────────────────────────

interface LineItem {
    key: string;
    account_id: string;
    debit: number;
    credit: number;
    description: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    shopId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const emptyLine = (): LineItem => ({
    key: crypto.randomUUID(),
    account_id: "",
    debit: 0,
    credit: 0,
    description: "",
});

// ── Component ──────────────────────────────────────────────────────────────────

const JournalEntryFormDrawer: React.FC<Props> = ({ open, onClose, onSuccess, shopId }) => {
    const [form] = ProForm.useForm();
    const [expenseForm] = ProForm.useForm();
    const [activeTab, setActiveTab] = useState<"manual" | "expense">("manual");
    const [lines, setLines] = useState<LineItem[]>([emptyLine(), emptyLine()]);
    const [submitting, setSubmitting] = useState(false);

    // ── Accounts for select ────────────────────────────────────────────────────

    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts-all", shopId],
        queryFn: () => getAllAccounts({ shop_id: shopId, is_active: true, allows_direct_posting: true }),
        enabled: open && !!shopId,
    });

    const accounts: ChartOfAccount[] = accountsData?.accounts || [];

    const accountOptions = accounts.map((a) => ({
        label: (
            <Space size={4}>
                <Text code style={{ fontSize: 11 }}>{a.account_code}</Text>
                <Text style={{ fontSize: 12 }}>{a.account_name}</Text>
                <Tag color={TYPE_COLORS[a.account_type]} style={{ fontSize: 10, padding: "0 4px", lineHeight: "16px" }}>
                    {a.account_type}
                </Tag>
            </Space>
        ),
        value: a._id,
        text: `${a.account_code} ${a.account_name}`,
    }));

    const bankAccounts = accounts.filter((a) => a.is_bank_account);
    const expenseAccounts = accounts.filter((a) => a.account_type === "EXPENSE");

    // ── Reset on open ──────────────────────────────────────────────────────────

    useEffect(() => {
        if (open) {
            form.resetFields();
            expenseForm.resetFields();
            setLines([emptyLine(), emptyLine()]);
            setActiveTab("manual");
        }
    }, [open]);

    // ── Balance calculation ────────────────────────────────────────────────────

    const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;
    const difference = totalDebit - totalCredit;

    // ── Line mutations ─────────────────────────────────────────────────────────

    const addLine = () => setLines((prev) => [...prev, emptyLine()]);

    const removeLine = (key: string) =>
        setLines((prev) => prev.length > 2 ? prev.filter((l) => l.key !== key) : prev);

    const updateLine = (key: string, field: keyof LineItem, value: any) =>
        setLines((prev) =>
            prev.map((l) => (l.key === key ? { ...l, [field]: value } : l))
        );

    // ── Submit: Manual Entry ───────────────────────────────────────────────────

    const handleManualSubmit = async (values: any) => {
        if (!isBalanced) return;

        const validLines = lines.filter((l) => l.account_id);
        if (validLines.length < 2) return;

        setSubmitting(true);
        try {
            const payload: CreateManualEntryParams = {
                shop_id: shopId,
                description: values.description,
                reference: values.reference,
                entry_date: values.entry_date
                    ? dayjs(values.entry_date).toISOString()
                    : undefined,
                auto_post: values.auto_post || false,
                lines: validLines.map((l) => ({
                    account_id: l.account_id,
                    debit: l.debit || 0,
                    credit: l.credit || 0,
                    description: l.description || undefined,
                })),
            };

            await createManualEntry(payload);
            onSuccess();
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    // ── Submit: Expense Entry ──────────────────────────────────────────────────

    const handleExpenseSubmit = async (values: any) => {
        setSubmitting(true);
        try {
            const payload: CreateExpenseEntryParams = {
                shop_id: shopId,
                description: values.description,
                amount: values.amount,
                expense_account_id: values.expense_account_id,
                payment_account_id: values.payment_account_id,
                reference: values.reference,
                entry_date: values.entry_date
                    ? dayjs(values.entry_date).toISOString()
                    : undefined,
                vat_amount: values.vat_amount || undefined,
            };

            await createExpenseEntry(payload);
            onSuccess();
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    // ── Line table columns ─────────────────────────────────────────────────────

    const lineColumns = [
        {
            title: "Account",
            key: "account_id",
            width: 260,
            render: (_: any, record: LineItem) => (
                <Select
                    showSearch
                    placeholder="Search account…"
                    style={{ width: "100%" }}
                    value={record.account_id || undefined}
                    onChange={(v) => updateLine(record.key, "account_id", v)}
                    options={accountOptions}
                    optionFilterProp="text"
                    size="small"
                    filterOption={(input, option) =>
                        (option?.text as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                />
            ),
        },
        {
            title: "Debit",
            key: "debit",
            width: 120,
            render: (_: any, record: LineItem) => (
                <InputNumber
                    min={0}
                    precision={2}
                    value={record.debit}
                    onChange={(v) => {
                        updateLine(record.key, "debit", v || 0);
                        if (v && v > 0) updateLine(record.key, "credit", 0);
                    }}
                    style={{ width: "100%" }}
                    size="small"
                />
            ),
        },
        {
            title: "Credit",
            key: "credit",
            width: 120,
            render: (_: any, record: LineItem) => (
                <InputNumber
                    min={0}
                    precision={2}
                    value={record.credit}
                    onChange={(v) => {
                        updateLine(record.key, "credit", v || 0);
                        if (v && v > 0) updateLine(record.key, "debit", 0);
                    }}
                    style={{ width: "100%" }}
                    size="small"
                />
            ),
        },
        {
            title: "Memo",
            key: "description",
            render: (_: any, record: LineItem) => (
                <Input
                    placeholder="Optional memo"
                    value={record.description}
                    onChange={(e) => updateLine(record.key, "description", e.target.value)}
                    size="small"
                />
            ),
        },
        {
            title: "",
            key: "remove",
            width: 40,
            render: (_: any, record: LineItem) => (
                <Button
                    icon={<DeleteOutlined />}
                    size="small"
                    danger
                    type="text"
                    onClick={() => removeLine(record.key)}
                    disabled={lines.length <= 2}
                />
            ),
        },
    ];

    return (
        <Drawer
            title="New Journal Entry"
            open={open}
            onClose={onClose}
            width={700}
            destroyOnClose
            footer={null}
        >
            <Tabs
                activeKey={activeTab}
                onChange={(k) => setActiveTab(k as "manual" | "expense")}
                items={[
                    { key: "manual", label: "Journal Entry" },
                    // { key: "expense", label: "Quick Expense" },
                ]}
                style={{ marginBottom: 16 }}
            />

            {/* ── Manual Entry ── */}
            {activeTab === "manual" && (
                <ProForm
                    form={form}
                    onFinish={handleManualSubmit}
                    submitter={{
                        searchConfig: { submitText: "Save Entry", resetText: "Cancel" },
                        onReset: onClose,
                        submitButtonProps: {
                            disabled: !isBalanced,
                            loading: submitting,
                        },
                    }}
                    layout="vertical"
                >
                    <Space style={{ width: "100%" }} size={12}>
                        <ProFormDatePicker
                            name="entry_date"
                            label="Entry Date"
                            rules={[{ required: true, message: "Required" }]}
                            fieldProps={{ style: { width: 160 } }}
                        />
                        <ProFormText
                            name="description"
                            label="Description"
                            placeholder="e.g. Monthly rent payment"
                            rules={[{ required: true, message: "Required" }]}
                            fieldProps={{ style: { width: 300 } }}
                        />
                        <ProFormText
                            name="reference"
                            label="Reference"
                            placeholder="e.g. INV-001"
                            fieldProps={{ style: { width: 160 } }}
                        />

                    </Space>

                    <ProFormSwitch
                        name="auto_post"
                        label="Post immediately (skip Draft)"
                        initialValue={false}
                    />

                    {/* ── Lines ── */}
                    <Divider orientation="left" plain>
                        <Text type="secondary" style={{ fontSize: 12 }}>Journal Lines</Text>
                    </Divider>

                    <Table
                        rowKey="key"
                        dataSource={lines}
                        columns={lineColumns}
                        pagination={false}
                        size="small"
                        scroll={{ x: 600 }}
                        summary={() => (
                            <Table.Summary fixed>
                                <Table.Summary.Row style={{ background: "#fafafa" }}>
                                    <Table.Summary.Cell index={0}>
                                        <Button
                                            type="dashed"
                                            icon={<PlusOutlined />}
                                            size="small"
                                            onClick={addLine}
                                        >
                                            Add Line
                                        </Button>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={1} align="right">
                                        <Text strong style={{ color: "#1d39c4" }}>
                                            {totalDebit.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                        </Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={2} align="right">
                                        <Text strong style={{ color: "#389e0d" }}>
                                            {totalCredit.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                        </Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={3} colSpan={2} />
                                </Table.Summary.Row>
                            </Table.Summary>
                        )}
                    />

                    {/* ── Balance indicator ── */}
                    <div style={{ marginTop: 12 }}>
                        {totalDebit === 0 && totalCredit === 0 ? null : isBalanced ? (
                            <Alert
                                type="success"
                                showIcon
                                message="Entry is balanced"
                                style={{ padding: "4px 12px" }}
                            />
                        ) : (
                            <Alert
                                type="error"
                                showIcon
                                icon={<InfoCircleOutlined />}
                                message={`Out of balance by KES ${Math.abs(difference).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`}
                                style={{ padding: "4px 12px" }}
                            />
                        )}
                    </div>
                </ProForm>
            )}

            {/* ── Quick Expense ── */}
            {/* {activeTab === "expense" && (
                <>
                    <Alert
                        type="info"
                        showIcon
                        message="Quick shortcut — automatically debits the expense account and credits the payment account."
                        style={{ marginBottom: 16, padding: "6px 12px" }}
                    />
                    <ProForm
                        form={expenseForm}
                        onFinish={handleExpenseSubmit}
                        submitter={{
                            searchConfig: { submitText: "Record Expense", resetText: "Cancel" },
                            onReset: onClose,
                            submitButtonProps: { loading: submitting },
                        }}
                        layout="vertical"
                    >
                        <ProFormText
                            name="description"
                            label="Expense Description"
                            placeholder="e.g. Office supplies"
                            rules={[{ required: true, message: "Required" }]}
                        />

                        <Space style={{ width: "100%" }} size={12}>
                            <ProFormText
                                name="reference"
                                label="Reference / Receipt No."
                                placeholder="e.g. REC-001"
                                fieldProps={{ style: { width: 200 } }}
                            />
                            <ProFormDatePicker
                                name="entry_date"
                                label="Date"
                                fieldProps={{ style: { width: 180 } }}
                            />
                        </Space>

                        <ProForm.Item
                            name="expense_account_id"
                            label="Expense Account"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Select
                                showSearch
                                placeholder="Select expense account…"
                                options={expenseAccounts.map((a) => ({
                                    label: `${a.account_code} — ${a.account_name}`,
                                    value: a._id,
                                }))}
                                optionFilterProp="label"
                                style={{ width: "100%" }}
                            />
                        </ProForm.Item>

                        <ProForm.Item
                            name="payment_account_id"
                            label="Paid From (Bank / Cash Account)"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <Select
                                showSearch
                                placeholder="Select bank or cash account…"
                                options={bankAccounts.map((a) => ({
                                    label: `${a.account_code} — ${a.account_name}`,
                                    value: a._id,
                                }))}
                                optionFilterProp="label"
                                style={{ width: "100%" }}
                            />
                        </ProForm.Item>

                        <Space size={12}>
                            <ProForm.Item
                                name="amount"
                                label="Amount (KES)"
                                rules={[{ required: true, message: "Required" }]}
                            >
                                <InputNumber min={0} precision={2} style={{ width: 200 }} prefix="KES" />
                            </ProForm.Item>
                            <ProForm.Item name="vat_amount" label="VAT Amount (optional)">
                                <InputNumber min={0} precision={2} style={{ width: 200 }} prefix="KES" />
                            </ProForm.Item>
                        </Space>
                    </ProForm>
                </>
            )} */}
        </Drawer>
    );
};

const TYPE_COLORS: Record<string, string> = {
    ASSET: "blue", LIABILITY: "red", EQUITY: "purple", REVENUE: "green", EXPENSE: "orange",
};

export default JournalEntryFormDrawer;