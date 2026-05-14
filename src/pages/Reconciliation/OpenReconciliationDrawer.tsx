import React, { useState } from "react";
import {
    ProForm,
    ProFormSelect,
    ProFormDigit,
    ProFormTextArea,
} from "@ant-design/pro-components";
import {
    Drawer,
    Button,
    Space,
    Table,
    Input,
    InputNumber,
    DatePicker,
    Typography,
    Alert,
} from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
    openReconciliation,
    importStatementLines,
    OpenReconciliationParams,
    StatementLineInput,
} from "@services/accounting/reconciliation";
import { getBankAccounts } from "@services/accounting/accounts";
import dayjs from "dayjs";

const { Text } = Typography;

interface LineRow extends StatementLineInput {
    key: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: (reconciliationId: string) => void;
    shopId: string;
    /** If provided — we're in "add lines to existing session" mode */
    reconciliationId?: string;
}

const emptyRow = (): LineRow => ({
    key: crypto.randomUUID(),
    transaction_date: dayjs().format("YYYY-MM-DD"),
    description: "",
    debit: 0,
    credit: 0,
    reference: "",
    notes: "",
});

const OpenReconciliationDrawer: React.FC<Props> = ({
    open, onClose, onSuccess, shopId, reconciliationId,
}) => {
    const [form] = ProForm.useForm();
    const [lines, setLines] = useState<LineRow[]>([emptyRow()]);
    const [submitting, setSubmitting] = useState(false);
    const isAddMode = !!reconciliationId;

    // ── Bank accounts ──────────────────────────────────────────────────────────

    const { data: bankData } = useQuery({
        queryKey: ["bank-accounts", shopId],
        queryFn: () => getBankAccounts(shopId),
        enabled: open && !!shopId && !isAddMode,
    });
    const bankAccounts = bankData?.accounts || [];

    // ── Line helpers ───────────────────────────────────────────────────────────

    const addRow = () => setLines((p) => [...p, emptyRow()]);
    const removeRow = (key: string) =>
        setLines((p) => p.length > 1 ? p.filter((r) => r.key !== key) : p);
    const updateRow = (key: string, field: keyof LineRow, value: unknown) =>
        setLines((p) => p.map((r) => r.key === key ? { ...r, [field]: value } : r));

    // ── Submit ─────────────────────────────────────────────────────────────────

    const handleSubmit = async (values: any) => {
        const validLines = lines.filter((l) => l.description && (l.debit > 0 || l.credit > 0));
        setSubmitting(true);
        try {
            if (isAddMode) {
                // Just add lines to existing reconciliation
                await importStatementLines(reconciliationId!, validLines.map((l) => {
                    const { key, ...rest } = l;
                    return rest;
                }));
                onSuccess(reconciliationId!);
            } else {
                // Open new reconciliation
                const payload: OpenReconciliationParams = {
                    shop_id: shopId,
                    account_id: values.account_id,
                    period_start: dayjs(values.period[0]).startOf("day").toISOString(),
                    period_end: dayjs(values.period[1]).endOf("day").toISOString(),
                    statement_balance: values.statement_balance,
                    opening_balance: values.opening_balance,
                    notes: values.notes,
                };
                const res = await openReconciliation(payload);
                const recoId = res.reconciliation._id;

                // Import lines if any provided
                if (validLines.length > 0) {
                    await importStatementLines(recoId, validLines.map((l) => {
                        const { key, ...rest } = l;
                        return rest;
                    }));
                }
                onSuccess(recoId);
            }
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    // ── Line table columns ─────────────────────────────────────────────────────

    const lineColumns = [
        {
            title: "Date", key: "transaction_date", width: 120,
            render: (_: any, r: LineRow) => (
                <DatePicker
                    size="small"
                    value={r.transaction_date ? dayjs(r.transaction_date) : undefined}
                    onChange={(d) => updateRow(r.key, "transaction_date", d?.format("YYYY-MM-DD") || "")}
                    style={{ width: "100%" }}
                    format="DD/MM/YYYY"
                />
            ),
        },
        {
            title: "Description", key: "description",
            render: (_: any, r: LineRow) => (
                <Input
                    size="small"
                    placeholder="Transaction description"
                    value={r.description}
                    onChange={(e) => updateRow(r.key, "description", e.target.value)}
                />
            ),
        },
        {
            title: "Reference", key: "reference", width: 120,
            render: (_: any, r: LineRow) => (
                <Input
                    size="small"
                    placeholder="Ref / Cheque no."
                    value={r.reference || ""}
                    onChange={(e) => updateRow(r.key, "reference", e.target.value)}
                />
            ),
        },
        {
            title: "Debit", key: "debit", width: 110,
            render: (_: any, r: LineRow) => (
                <InputNumber
                    size="small"
                    min={0}
                    precision={2}
                    value={r.debit}
                    onChange={(v) => { updateRow(r.key, "debit", v || 0); if (v) updateRow(r.key, "credit", 0); }}
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: "Credit", key: "credit", width: 110,
            render: (_: any, r: LineRow) => (
                <InputNumber
                    size="small"
                    min={0}
                    precision={2}
                    value={r.credit}
                    onChange={(v) => { updateRow(r.key, "credit", v || 0); if (v) updateRow(r.key, "debit", 0); }}
                    style={{ width: "100%" }}
                />
            ),
        },
        {
            title: "", key: "remove", width: 36,
            render: (_: any, r: LineRow) => (
                <Button
                    icon={<DeleteOutlined />}
                    size="small"
                    danger
                    type="text"
                    onClick={() => removeRow(r.key)}
                    disabled={lines.length <= 1}
                />
            ),
        },
    ];

    const linesSection = (
        <>
            <Table
                rowKey="key"
                dataSource={lines}
                columns={lineColumns}
                pagination={false}
                size="small"
                scroll={{ x: 650 }}
                summary={() => (
                    <Table.Summary fixed>
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={6}>
                                <Button
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    size="small"
                                    onClick={addRow}
                                >
                                    Add Row
                                </Button>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    </Table.Summary>
                )}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
                {lines.filter((l) => l.description && (l.debit > 0 || l.credit > 0)).length} valid lines
            </Text>
        </>
    );

    return (
        <Drawer
            title={isAddMode ? "Add Statement Lines" : "Open Reconciliation Session"}
            open={open}
            onClose={onClose}
            width={820}
            destroyOnClose
            footer={null}
        >
            {isAddMode ? (
                // Add lines only mode
                <ProForm
                    submitter={{
                        searchConfig: { submitText: "Import Lines", resetText: "Cancel" },
                        onReset: onClose,
                        submitButtonProps: { loading: submitting },
                    }}
                    onFinish={() => handleSubmit()}
                    layout="vertical"
                >
                    {linesSection}
                </ProForm>
            ) : (
                // Open new session mode
                <ProForm
                    form={form}
                    onFinish={handleSubmit}
                    submitter={{
                        searchConfig: { submitText: "Open Session", resetText: "Cancel" },
                        onReset: onClose,
                        submitButtonProps: { loading: submitting },
                    }}
                    layout="vertical"
                >
                    <Space style={{ width: "100%" }} size={12}>
                        <ProFormSelect
                            name="account_id"
                            label="Bank / Cash Account"
                            showSearch
                            rules={[{ required: true, message: "Required" }]}
                            options={bankAccounts.map((a) => ({
                                label: `${a.account_code} — ${a.account_name}`,
                                value: a._id,
                            }))}
                            fieldProps={{ style: { width: 280 }, optionFilterProp: "label" }}
                            placeholder="Select bank account…"
                        />
                        <ProForm.Item
                            name="period"
                            label="Statement Period"
                            rules={[{ required: true, message: "Required" }]}
                        >
                            <DatePicker.RangePicker
                                format="DD/MM/YYYY"
                                style={{ width: 260 }}
                            />
                        </ProForm.Item>
                    </Space>

                    <Space size={12}>
                        <ProFormDigit
                            name="statement_balance"
                            label="Closing Statement Balance"
                            placeholder="From your bank statement"
                            fieldProps={{ precision: 2, prefix: "KES", style: { width: 220 } }}
                            rules={[{ required: true, message: "Required" }]}
                        />
                        <ProFormDigit
                            name="opening_balance"
                            label="Opening Balance (optional)"
                            placeholder="Leave blank to auto-compute"
                            fieldProps={{ precision: 2, prefix: "KES", style: { width: 220 } }}
                        />
                    </Space>

                    <ProFormTextArea
                        name="notes"
                        label="Notes (optional)"
                        fieldProps={{ rows: 2 }}
                    />

                    <Alert
                        type="info"
                        showIcon
                        message="Statement lines are optional here — you can add them after opening the session."
                        style={{ marginBottom: 16, padding: "4px 12px" }}
                    />

                    {linesSection}
                </ProForm>
            )}
        </Drawer>
    );
};

export default OpenReconciliationDrawer;