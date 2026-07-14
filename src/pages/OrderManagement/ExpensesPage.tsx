import React, { useState } from "react";
import {
    Button, DatePicker, Spin, Table, Typography, Tag, Modal,
    Form, Input, App, Space, Tooltip, Select,
} from "antd";
import {
    ArrowUpOutlined, PlusOutlined, CheckCircleOutlined, StopOutlined, ReloadOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import ManualIncomeModal from "./Orders/ManualIncomeModal";
import {
    getAllExpenses, getExpenseSummary, approveExpense, voidExpense,
    type Expense, type ExpenseStatus,
} from "@services/accounting/expense";
import { fetchAllCustomers } from "@services/customers";

const { RangePicker } = DatePicker;
const { Text } = Typography;

const C = {
    primary: "#6c1c2c",
    green: "#10b981",
    red: "#ef4444",
    orange: "#f59e0b",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

const fmt = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SummaryCard: React.FC<{ label: string; value: string; color: string; bg: string }> = ({
    label, value, color, bg,
}) => (
    <div style={{
        flex: "1 1 130px", background: bg,
        border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`,
        borderRadius: 8, padding: "10px 14px",
    }}>
        <Text style={{
            fontSize: 10, color: C.subText, textTransform: "uppercase",
            letterSpacing: "0.4px", fontWeight: 700, display: "block", marginBottom: 4,
        }}>{label}</Text>
        <Text strong style={{ fontSize: 14, color }}>{value}</Text>
    </div>
);

const STATUS_CFG: Record<ExpenseStatus, { color: string }> = {
    Draft: { color: "default" },
    Pending: { color: "orange" },
    Approved: { color: "green" },
    Voided: { color: "red" },
};

// ── Void modal ────────────────────────────────────────────────────────────────
const VoidExpenseModal: React.FC<{
    expense: Expense | null;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ expense, open, onClose, onSuccess }) => {
    const [reason, setReason] = useState("");
    const { message } = App.useApp();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => voidExpense(expense!._id, reason),
        onSuccess: () => {
            message.success("Expense voided");
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
            setReason("");
            onSuccess();
            onClose();
        },
    });

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={
                <Space>
                    <StopOutlined style={{ color: C.red }} />
                    <span>Void Expense — {expense?.expense_no}</span>
                </Space>
            }
            footer={[
                <Button key="cancel" onClick={onClose}>Cancel</Button>,
                <Button key="void" danger loading={mutation.isPending}
                    disabled={!reason.trim()}
                    onClick={() => mutation.mutate()}>
                    Void Expense
                </Button>,
            ]}
            destroyOnClose
            width={420}
        >
            <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                This will reverse the journal entry if one was posted. Cannot be undone.
            </Text>
            <Input.TextArea
                rows={3}
                placeholder="Reason for voiding (required)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
            />
        </Modal>
    );
};

// ── Main ──────────────────────────────────────────────────────────────────────
function ExpensesPage() {
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [voidTarget, setVoidTarget] = useState<Expense | null>(null);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().startOf("month"),
        dayjs().endOf("month"),
    ]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();

    const { message } = App.useApp();
    const queryClient = useQueryClient();

    const { data: customersRaw } = useQuery({
        queryKey: ["customers-select-expenses"],
        queryFn: () => fetchAllCustomers({}),
    });
    const customers = Array.isArray(customersRaw) ? customersRaw : [];

    const { data, isLoading } = useQuery({
        queryKey: ["expenses", page, dateRange, selectedCustomerId],
        queryFn: () => getAllExpenses({
            page, limit: 10,
            from: dateRange[0].toISOString(),
            to: dateRange[1].toISOString(),
            customer_id: selectedCustomerId,
        }),
    });

    const { data: summaryData } = useQuery({
        queryKey: ["expense-summary", dateRange],
        queryFn: () => getExpenseSummary({
            from: dateRange[0].toISOString(),
            to: dateRange[1].toISOString(),
        }),
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => approveExpense(id),
        onSuccess: (res) => {
            const warning = (res as any)?.warning;
            if (warning) message.warning(warning);
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
        },
    });

    const expenses: Expense[] = data?.expenses || [];
    const total = data?.total || 0;
    const summaryRows = summaryData?.summary || [];

    // Calculate from summary API if available, otherwise fallback to expenses list
    const totalExpenses = summaryRows.length > 0
        ? summaryRows.reduce((s, r) => s + r.total_amount, 0)
        : expenses.reduce((s, r) => s + (r.grand_total || 0), 0);

    const totalVat = summaryRows.length > 0
        ? summaryRows.reduce((s, r) => s + r.total_vat, 0)
        : expenses.reduce((s, r) => s + (r.total_vat_amount || 0), 0);

    const approvedTotal = summaryRows.length > 0
        ? summaryRows.filter((r) => r._id === "Approved").reduce((s, r) => s + r.total_amount, 0)
        : expenses.filter((r) => r.status === "Approved").reduce((s, r) => s + (r.grand_total || 0), 0);

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
    };

    const columns = [
        {
            title: "Date", dataIndex: "expense_date", width: 130,
            render: (v: string) => (
                <Text style={{ fontSize: 12, color: C.subText }}>{dayjs(v).format("DD MMM YYYY")}</Text>
            ),
        },
        {
            title: "Ref", dataIndex: "expense_no", width: 120,
            render: (v: string) => (
                <Text style={{ fontSize: 11, fontFamily: "monospace", color: C.subText }}>{v}</Text>
            ),
        },
        {
            title: "Customer", width: 140,
            render: (_: any, row: Expense) => {
                const customer = row.customer_id as any;
                return customer?.customer_name
                    ? <Text style={{ fontSize: 12 }}>{customer.customer_name}</Text>
                    : <Text style={{ color: C.subText }}>—</Text>;
            },
        },
        {
            title: "Description",
            render: (_: any, row: Expense) => {
                const desc = row.expense_lines?.[0]?.description || row.notes;
                return desc
                    ? <Text style={{ fontSize: 12 }}>{desc}</Text>
                    : <Text style={{ color: C.subText }}>—</Text>;
            },
        },
        {
            title: "Payment", dataIndex: "payment_method", width: 110,
            render: (v: string) => v
                ? <Text style={{ fontSize: 12 }}>{v.replace("_", " ")}</Text>
                : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "Expense Account (DR)",
            render: (_: any, row: Expense) => {
                const acct = row.expense_lines?.[0]?.account_id as any;
                return acct?.account_code ? (
                    <span style={{
                        fontFamily: "monospace", fontSize: 11,
                        background: C.bg, border: `1px solid ${C.border}`,
                        borderRadius: 4, padding: "1px 6px", color: C.darkText,
                    }}>
                        {acct.account_code} {acct.account_name}
                    </span>
                ) : <Text style={{ color: C.subText }}>—</Text>;
            },
        },
        {
            title: "Status", dataIndex: "status", width: 90,
            render: (s: ExpenseStatus) => (
                <Tag color={STATUS_CFG[s]?.color || "default"} style={{ fontSize: 11, fontWeight: 600 }}>
                    {s}
                </Tag>
            ),
        },
        {
            title: "VAT", dataIndex: "total_vat_amount", align: "right" as const, width: 100,
            render: (v: number) => v
                ? <Text style={{ fontSize: 12, color: C.orange }}>+{fmt(v)}</Text>
                : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "Amount (KES)", dataIndex: "grand_total", align: "right" as const, width: 130,
            render: (v: number) => (
                <Text strong style={{ color: C.red, fontSize: 13 }}>−{fmt(v)}</Text>
            ),
        },
        {
            title: "JE", dataIndex: "journal_entry_id", width: 100,
            render: (je: any) => je ? (
                <span style={{
                    background: je.status === "Posted" ? "#f0fdf4" : "#fffbeb",
                    color: je.status === "Posted" ? C.green : C.orange,
                    border: `1px solid ${je.status === "Posted" ? "#bbf7d0" : "#fde68a"}`,
                    borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                }}>
                    {je.entry_no}
                </span>
            ) : <span style={{ color: C.subText, fontSize: 12 }}>—</span>,
        },
        {
            title: "Actions", key: "actions", width: 110, fixed: "right" as const,
            render: (_: any, row: Expense) => {
                const isPending = row.status === "Pending" || row.status === "Draft";
                const isApprovable = row.status === "Pending";
                const isVoidable = row.status !== "Voided";
                return (
                    <Space size={4}>
                        {isApprovable && (
                            <Tooltip title="Approve & post to books">
                                <Button
                                    size="small" type="primary"
                                    icon={<CheckCircleOutlined />}
                                    loading={approveMutation.isPending && approveMutation.variables === row._id}
                                    style={{ background: C.green, borderColor: C.green }}
                                    onClick={() => approveMutation.mutate(row._id)}
                                />
                            </Tooltip>
                        )}
                        {isVoidable && (
                            <Tooltip title="Void expense">
                                <Button
                                    size="small" danger
                                    icon={<StopOutlined />}
                                    onClick={() => setVoidTarget(row)}
                                />
                            </Tooltip>
                        )}
                        {row.status === "Approved" && (
                            <Tag color="green" style={{ fontSize: 10, margin: 0 }}>Posted</Tag>
                        )}
                        {row.status === "Voided" && (
                            <Tag color="default" style={{ fontSize: 10, margin: 0 }}>Voided</Tag>
                        )}
                    </Space>
                );
            },
        },
    ];

    return (
        <App>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    flexWrap: "wrap", gap: 10,
                    padding: "14px 18px", background: C.bg, borderBottom: `1px solid ${C.border}`,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            background: "#fef2f2", borderRadius: 8,
                            padding: "5px 7px", color: C.red, fontSize: 16, lineHeight: 1,
                        }}>
                            <ArrowUpOutlined />
                        </div>
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>Expenses</Text>
                    </div>
                </div>

                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", flexWrap: "wrap", gap: 10,
                    }}>
                        <Space size={8}>
                            <RangePicker
                                value={dateRange}
                                onChange={(v) => { if (v) { setPage(1); setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs]); } }}
                                style={{ borderRadius: 8 }}
                                presets={[
                                    { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
                                    { label: "This Week", value: [dayjs().startOf("week"), dayjs().endOf("week")] },
                                    { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
                                    { label: "Last Month", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
                                ]}
                            />
                            <Select
                                showSearch
                                allowClear
                                placeholder="Filter by customer"
                                style={{ width: 200, borderRadius: 8 }}
                                value={selectedCustomerId}
                                onChange={(v) => { setPage(1); setSelectedCustomerId(v); }}
                                options={customers.map((c: any) => ({
                                    label: c.customer_name,
                                    value: c._id,
                                }))}
                                optionFilterProp="label"
                            />
                        </Space>
                        <Space>
                            <Tooltip title="Refresh records">
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={refresh}
                                    style={{ borderRadius: 8 }}
                                />
                            </Tooltip>
                            <Button
                                type="primary" icon={<PlusOutlined />}
                                onClick={() => setModalOpen(true)}
                                style={{ background: C.red, borderColor: C.red, borderRadius: 8, fontWeight: 600 }}
                            >
                                Post Expense
                            </Button>
                        </Space>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <SummaryCard label="Total Expenses" value={`KES ${fmt(totalExpenses)}`} color={C.red} bg="#fef2f2" />
                        <SummaryCard label="Input VAT" value={`KES ${fmt(totalVat)}`} color={C.orange} bg="#fffbeb" />
                        <SummaryCard label="Approved" value={`KES ${fmt(approvedTotal)}`} color={C.green} bg="#f0fdf4" />
                    </div>

                    <Spin spinning={isLoading}>
                        <Table
                            rowKey="_id"
                            dataSource={expenses}
                            columns={columns}
                            size="small"
                            pagination={{
                                current: page, total, pageSize: 10, onChange: setPage,
                                showTotal: (t) => `${t} entries`,
                                style: { marginBottom: 0 },
                            }}
                            scroll={{ x: 1200 }}
                            style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}
                        />
                    </Spin>
                </div>
            </div>

            <ManualIncomeModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={refresh}
                defaultTab="expense"
            />

            <VoidExpenseModal
                expense={voidTarget}
                open={!!voidTarget}
                onClose={() => setVoidTarget(null)}
                onSuccess={refresh}
            />
        </App>
    );
}

export default ExpensesPage;