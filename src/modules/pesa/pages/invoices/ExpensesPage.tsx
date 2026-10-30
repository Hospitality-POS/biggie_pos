import React, { useState } from "react";
import {
    Button, DatePicker, Spin, Table, Typography, Tag, Modal,
    Input, App, Space, Tooltip, Select, Drawer, Descriptions, Divider, Empty,
} from "antd";
import {
    ArrowUpOutlined, PlusOutlined, CheckCircleOutlined, StopOutlined, ReloadOutlined, EditOutlined,
    EyeOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import ExpenseFormModal from "@modules/duka/pages/orders/components/ExpenseFormModal";
import {
    getAllExpenses, getExpenseSummary, getExpenseById, approveExpense, voidExpense,
    type Expense, type ExpenseStatus,
} from "@services/accounting/expense";
import { fetchAllCustomers } from "@services/customers";
import { THEME_C } from "@utils/getPrimaryColor";

const { RangePicker } = DatePicker;
const { Text } = Typography;

const C = THEME_C;

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

const AccountChip: React.FC<{ acct: any }> = ({ acct }) => acct?.account_code ? (
    <span style={{
        fontFamily: "monospace", fontSize: 11,
        background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 4, padding: "1px 6px", color: C.darkText,
    }}>
        {acct.account_code} {acct.account_name}
    </span>
) : <Text style={{ color: C.subText }}>—</Text>;

// ── View drawer ───────────────────────────────────────────────────────────────
const ViewExpenseDrawer: React.FC<{
    expenseId: string | null;
    onClose: () => void;
    onEdit: (expense: Expense) => void;
}> = ({ expenseId, onClose, onEdit }) => {
    const { data, isLoading } = useQuery({
        queryKey: ["expense", expenseId],
        queryFn: () => getExpenseById(expenseId!),
        enabled: !!expenseId,
    });
    const expense = data?.expense;
    const je = expense?.journal_entry_id as any;
    const payAcct = expense?.payment_account_id as any;
    const person = (u: any) => u?.name || u?.username || "—";

    return (
        <Drawer
            open={!!expenseId}
            onClose={onClose}
            width={640}
            destroyOnClose
            title={
                <Space>
                    <ArrowUpOutlined style={{ color: C.red }} />
                    <span>{expense?.expense_no || "Expense"}</span>
                    {expense && (
                        <Tag color={STATUS_CFG[expense.status]?.color || "default"} style={{ fontWeight: 600 }}>
                            {expense.status}
                        </Tag>
                    )}
                </Space>
            }
            extra={expense && expense.status !== "Voided" && (
                <Button icon={<EditOutlined />} onClick={() => onEdit(expense)}>Edit</Button>
            )}
        >
            <Spin spinning={isLoading}>
                {!expense ? (!isLoading && <Empty description="Expense not found" />) : (
                    <>
                        <div style={{
                            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
                            padding: "12px 16px", marginBottom: 16,
                        }}>
                            <Text style={{ fontSize: 11, color: C.subText, textTransform: "uppercase", fontWeight: 700 }}>
                                Paid from {payAcct?.account_name || "—"}
                            </Text>
                            <div>
                                <Text strong style={{ fontSize: 22, color: C.red }}>
                                    {expense.currency} {fmt(expense.grand_total)}
                                </Text>
                            </div>
                            <Text style={{ fontSize: 12, color: C.subText }}>
                                {expense.expense_lines.length} line{expense.expense_lines.length === 1 ? "" : "s"}
                                {" · "}Net {fmt(expense.subtotal)} · VAT {fmt(expense.total_vat_amount)}
                            </Text>
                        </div>

                        <Descriptions size="small" column={2} bordered labelStyle={{ width: 130 }}>
                            <Descriptions.Item label="Date">{dayjs(expense.expense_date).format("DD MMM YYYY HH:mm")}</Descriptions.Item>
                            <Descriptions.Item label="Reference">{expense.reference || "—"}</Descriptions.Item>
                            <Descriptions.Item label="Payment">{expense.payment_method?.replace("_", " ") || "—"}</Descriptions.Item>
                            <Descriptions.Item label="Paid From (CR)"><AccountChip acct={payAcct} /></Descriptions.Item>
                            <Descriptions.Item label="Supplier">{(expense.supplier_id as any)?.name || expense.payee_name || "—"}</Descriptions.Item>
                            <Descriptions.Item label="Customer">{(expense.customer_id as any)?.customer_name || "—"}</Descriptions.Item>
                            <Descriptions.Item label="Created by">{person(expense.created_by)}</Descriptions.Item>
                            <Descriptions.Item label="Approved by">
                                {person(expense.approved_by)}
                                {expense.approved_at && <Text type="secondary" style={{ fontSize: 11 }}> · {dayjs(expense.approved_at).format("DD MMM YYYY")}</Text>}
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider orientation="left" plain style={{ fontSize: 12 }}>Expense Lines (DR)</Divider>
                        <Table
                            rowKey={(_, i) => String(i)}
                            size="small"
                            pagination={false}
                            dataSource={expense.expense_lines}
                            columns={[
                                { title: "Account", render: (_: any, l: any) => <AccountChip acct={l.account_id} /> },
                                { title: "Description", dataIndex: "description", render: (v: string) => v || "—" },
                                { title: "Net", dataIndex: "amount", align: "right" as const, render: (v: number) => fmt(v) },
                                { title: "VAT", dataIndex: "vat_amount", align: "right" as const, render: (v: number) => v ? fmt(v) : "—" },
                                {
                                    title: "Total", align: "right" as const,
                                    render: (_: any, l: any) => <Text strong>{fmt((l.amount || 0) + (l.vat_amount || 0))}</Text>,
                                },
                            ]}
                            summary={() => (
                                <Table.Summary.Row>
                                    <Table.Summary.Cell index={0} colSpan={2}><Text strong>Total</Text></Table.Summary.Cell>
                                    <Table.Summary.Cell index={2} align="right">{fmt(expense.subtotal)}</Table.Summary.Cell>
                                    <Table.Summary.Cell index={3} align="right">{fmt(expense.total_vat_amount)}</Table.Summary.Cell>
                                    <Table.Summary.Cell index={4} align="right">
                                        <Text strong style={{ color: C.red }}>{fmt(expense.grand_total)}</Text>
                                    </Table.Summary.Cell>
                                </Table.Summary.Row>
                            )}
                        />

                        <Divider orientation="left" plain style={{ fontSize: 12 }}>
                            Journal Entry {je?.entry_no && <Tag style={{ marginLeft: 6 }}>{je.entry_no} · {je.status}</Tag>}
                        </Divider>
                        {je?.lines?.length ? (
                            <Table
                                rowKey={(_, i) => String(i)}
                                size="small"
                                pagination={false}
                                dataSource={je.lines}
                                columns={[
                                    {
                                        title: "Account",
                                        render: (_: any, l: any) => <AccountChip acct={{ account_code: l.account_code, account_name: l.account_name }} />,
                                    },
                                    { title: "Debit", dataIndex: "debit", align: "right" as const, render: (v: number) => v ? fmt(v) : "—" },
                                    { title: "Credit", dataIndex: "credit", align: "right" as const, render: (v: number) => v ? fmt(v) : "—" },
                                ]}
                            />
                        ) : (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Not posted to the books yet{expense.status === "Pending" ? " — approve to post." : "."}
                            </Text>
                        )}

                        {(expense.notes || expense.internal_notes) && (
                            <>
                                <Divider orientation="left" plain style={{ fontSize: 12 }}>Notes</Divider>
                                {expense.notes && <Text style={{ display: "block", whiteSpace: "pre-wrap" }}>{expense.notes}</Text>}
                                {expense.internal_notes && (
                                    <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 6, whiteSpace: "pre-wrap" }}>
                                        {expense.internal_notes}
                                    </Text>
                                )}
                            </>
                        )}

                        {!!expense.attachments?.length && (
                            <>
                                <Divider orientation="left" plain style={{ fontSize: 12 }}>Attachments</Divider>
                                <Space direction="vertical" size={4}>
                                    {expense.attachments.map((a, i) => (
                                        <a key={i} href={a.url} target="_blank" rel="noreferrer">{a.filename || a.url}</a>
                                    ))}
                                </Space>
                            </>
                        )}
                    </>
                )}
            </Spin>
        </Drawer>
    );
};

// ── Main ──────────────────────────────────────────────────────────────────────
function ExpensesPage() {
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [voidTarget, setVoidTarget] = useState<Expense | null>(null);
    const [editTarget, setEditTarget] = useState<Expense | null>(null);
    const [viewId, setViewId] = useState<string | null>(null);
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
            from: dateRange[0].format("YYYY-MM-DD"),
            to: dateRange[1].format("YYYY-MM-DD"),
            customer_id: selectedCustomerId,
        }),
    });

    const { data: summaryData } = useQuery({
        queryKey: ["expense-summary", dateRange],
        queryFn: () => getExpenseSummary({
            from: dateRange[0].format("YYYY-MM-DD"),
            to: dateRange[1].format("YYYY-MM-DD"),
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
                const lines = row.expense_lines || [];
                const desc = lines[0]?.description || row.notes;
                return (
                    <Space size={4}>
                        {desc
                            ? <Text style={{ fontSize: 12 }}>{desc}</Text>
                            : <Text style={{ color: C.subText }}>—</Text>}
                        {lines.length > 1 && (
                            <Tooltip title={lines.map((l) => l.description).filter(Boolean).join(" · ")}>
                                <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>Split · {lines.length}</Tag>
                            </Tooltip>
                        )}
                    </Space>
                );
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
                const lines = row.expense_lines || [];
                const extra = new Set(lines.map((l: any) => l.account_id?._id || l.account_id)).size - 1;
                return (
                    <Space size={4}>
                        <AccountChip acct={lines[0]?.account_id} />
                        {extra > 0 && <Text style={{ fontSize: 11, color: C.subText }}>+{extra} more</Text>}
                    </Space>
                );
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
            title: "Actions", key: "actions", width: 160, fixed: "right" as const,
            render: (_: any, row: Expense) => {
                const isPending = row.status === "Pending" || row.status === "Draft";
                const isApprovable = row.status === "Pending";
                const isVoidable = row.status !== "Voided";
                const isEditable = row.status === "Draft" || row.status === "Pending" || row.status === "Approved";
                return (
                    <Space size={4}>
                        <Tooltip title="View expense">
                            <Button size="small" icon={<EyeOutlined />} onClick={() => setViewId(row._id)} />
                        </Tooltip>
                        {isEditable && (
                            <Tooltip title="Edit expense">
                                <Button
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => {
                                        setEditTarget(row);
                                        setModalOpen(true);
                                    }}
                                />
                            </Tooltip>
                        )}
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
                                    { label: "This Quarter", value: [dayjs().month(Math.floor(dayjs().month() / 3) * 3).startOf("month"), dayjs().month(Math.floor(dayjs().month() / 3) * 3 + 2).endOf("month")] },
                                    { label: "This Year", value: [dayjs().startOf("year"), dayjs().endOf("year")] },
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
                                onClick={() => {
                                    setEditTarget(null);
                                    setModalOpen(true);
                                }}
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

            <ExpenseFormModal
                open={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditTarget(null);
                }}
                onSuccess={refresh}
                expenseToEdit={editTarget}
            />

            <ViewExpenseDrawer
                expenseId={viewId}
                onClose={() => setViewId(null)}
                onEdit={(exp) => {
                    setViewId(null);
                    setEditTarget(exp);
                    setModalOpen(true);
                }}
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