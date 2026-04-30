import React, { useEffect, useState } from "react";
import {
    ProForm,
    ProFormText,
    ProFormDatePicker,
    ProFormSwitch,
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
} from "antd";
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createManualEntry,
    CreateManualEntryParams,
} from "@services/accounting/journals";
import { getAllAccounts, ChartOfAccount } from "@services/accounting/accounts";
import AccountFormDrawer from "@pages/ChartOfAccounts/AccountFormDrawer";
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

const TYPE_COLORS: Record<string, string> = {
    ASSET: "blue",
    LIABILITY: "red",
    EQUITY: "purple",
    REVENUE: "green",
    EXPENSE: "orange",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const emptyLine = (): LineItem => ({
    key: crypto.randomUUID(),
    account_id: "",
    debit: 0,
    credit: 0,
    description: "",
});

const generateReferenceNumber = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `JE-${year}${month}${day}-${random}`;
};

// ── Component ──────────────────────────────────────────────────────────────────

const JournalEntryFormDrawer: React.FC<Props> = ({ open, onClose, onSuccess, shopId }) => {
    const [form] = ProForm.useForm();
    const queryClient = useQueryClient();
    const [lines, setLines] = useState<LineItem[]>([emptyLine(), emptyLine()]);
    const [submitting, setSubmitting] = useState(false);
    const [addAccountOpen, setAddAccountOpen] = useState(false);
    const [reference, setReference] = useState<string>("");

    // ── Accounts ───────────────────────────────────────────────────────────────

    const { data: accountsData, isLoading: accountsLoading } = useQuery({
        queryKey: ["chart-of-accounts-je", shopId],
        queryFn: () => getAllAccounts({ is_active: true }),
        enabled: open,
        staleTime: 60_000,
    });

    const allAccounts: ChartOfAccount[] = accountsData?.accounts || [];

    const postableAccounts = allAccounts.filter(
        (a) => a.is_active && a.allows_direct_posting !== false
    );

    const accountOptions = postableAccounts.map((a) => ({
        label: `${a.account_code} — ${a.account_name} (${a.account_type})`,
        value: a._id,
        account_code: a.account_code,
        account_name: a.account_name,
        account_type: a.account_type,
    }));

    // ── Reset on open ──────────────────────────────────────────────────────────

    useEffect(() => {
        if (open) {
            const newReference = generateReferenceNumber();
            setReference(newReference);
            form.resetFields();
            form.setFieldValue("reference", newReference);
            setLines([emptyLine(), emptyLine()]);
        }
    }, [open, form]);

    // ── Generate new reference ─────────────────────────────────────────────────

    const handleGenerateNewReference = () => {
        const newReference = generateReferenceNumber();
        setReference(newReference);
        form.setFieldValue("reference", newReference);
    };

    // ── Account added callback ─────────────────────────────────────────────────

    const handleAccountAdded = () => {
        queryClient.invalidateQueries({ queryKey: ["chart-of-accounts-je", shopId] });
        queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    };

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

    // ── Submit ─────────────────────────────────────────────────────────────────

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

            // Close drawer first, then refresh list after drawer animation completes
            onClose();
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
                queryClient.invalidateQueries({ queryKey: ["journal-entry-summary"] });
                onSuccess();
            }, 300);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Account dropdown footer ────────────────────────────────────────────────

    const accountDropdownRender = (menu: React.ReactNode) => (
        <>
            {menu}
            <Divider style={{ margin: "4px 0" }} />
            <Button
                type="link"
                icon={<PlusOutlined />}
                style={{ width: "100%", textAlign: "left", padding: "4px 8px" }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    setAddAccountOpen(true);
                }}
            >
                Add New Account
            </Button>
        </>
    );

    // ── Line table columns ─────────────────────────────────────────────────────

    const lineColumns = [
        {
            title: "Account",
            key: "account_id",
            width: 280,
            render: (_: any, record: LineItem) => (
                <Select
                    showSearch
                    placeholder={accountsLoading ? "Loading accounts…" : "Search account…"}
                    style={{ width: "100%" }}
                    value={record.account_id || undefined}
                    onChange={(v) => updateLine(record.key, "account_id", v)}
                    options={accountOptions}
                    optionFilterProp="label"
                    size="small"
                    loading={accountsLoading}
                    notFoundContent={
                        accountsLoading
                            ? "Loading..."
                            : postableAccounts.length === 0
                                ? "No accounts found — add accounts in Chart of Accounts"
                                : "No match"
                    }
                    optionRender={(option) => (
                        <Space size={6}>
                            <Text code style={{ fontSize: 11 }}>
                                {option.data.account_code}
                            </Text>
                            <Text style={{ fontSize: 12 }}>{option.data.account_name}</Text>
                            <Tag
                                color={TYPE_COLORS[option.data.account_type] || "default"}
                                style={{ fontSize: 10, padding: "0 4px", lineHeight: "16px", margin: 0 }}
                            >
                                {option.data.account_type}
                            </Tag>
                        </Space>
                    )}
                    dropdownRender={accountDropdownRender}
                />
            ),
        },
        {
            title: "Debit",
            key: "debit",
            width: 115,
            render: (_: any, record: LineItem) => (
                <InputNumber
                    min={0}
                    precision={2}
                    value={record.debit || undefined}
                    placeholder="0.00"
                    onChange={(v) => {
                        updateLine(record.key, "debit", v || 0);
                        if (v && v > 0) updateLine(record.key, "credit", 0);
                    }}
                    style={{ width: "100%" }}
                    size="small"
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(v) => v!.replace(/,/g, "") as any}
                />
            ),
        },
        {
            title: "Credit",
            key: "credit",
            width: 115,
            render: (_: any, record: LineItem) => (
                <InputNumber
                    min={0}
                    precision={2}
                    value={record.credit || undefined}
                    placeholder="0.00"
                    onChange={(v) => {
                        updateLine(record.key, "credit", v || 0);
                        if (v && v > 0) updateLine(record.key, "debit", 0);
                    }}
                    style={{ width: "100%" }}
                    size="small"
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    parser={(v) => v!.replace(/,/g, "") as any}
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
            width: 36,
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
        <>
            <Drawer
                title="New Journal Entry"
                open={open}
                onClose={onClose}
                width={760}
                destroyOnClose
                footer={null}
            >
                <ProForm
                    form={form}
                    onFinish={handleManualSubmit}
                    submitter={{
                        searchConfig: { submitText: "Save Entry", resetText: "Cancel" },
                        onReset: onClose,
                        submitButtonProps: {
                            disabled: !isBalanced,
                            loading: submitting,
                            title: !isBalanced ? "Entry must be balanced before saving" : undefined,
                        },
                    }}
                    layout="vertical"
                >
                    <Space style={{ width: "100%", flexWrap: "wrap" }} size={12}>
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
                            fieldProps={{ style: { width: 280 } }}
                        />
                        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                            <ProFormText
                                name="reference"
                                label="Reference"
                                placeholder="e.g. INV-001"
                                rules={[{ required: true, message: "Reference is required" }]}
                                fieldProps={{
                                    style: { width: 180 },
                                    value: reference,
                                    onChange: (e) => setReference(e.target.value),
                                }}
                            />
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={handleGenerateNewReference}
                                style={{ marginTop: "28px" }}
                                title="Generate new reference number"
                            >
                                Generate
                            </Button>
                        </div>
                    </Space>

                    <ProFormSwitch
                        name="auto_post"
                        label="Post immediately (skip Draft)"
                        initialValue={true}
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
                        scroll={{ x: 620 }}
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
            </Drawer>

            {/* Add Account — triggered from the account dropdown in any line */}
            <AccountFormDrawer
                open={addAccountOpen}
                onClose={() => setAddAccountOpen(false)}
                onSuccess={() => {
                    setAddAccountOpen(false);
                    handleAccountAdded();
                }}
                accounts={allAccounts}
                shopId={shopId}
            />
        </>
    );
};

export default JournalEntryFormDrawer;