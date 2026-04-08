import React, { useState } from "react";
import {
    Button, DatePicker, Spin, Table, Typography, Tag,
} from "antd";
import { ArrowUpOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import ManualIncomeModal from "./Orders/ManualIncomeModal";
import { getAllExpenses, getExpenseSummary, type Expense, type ExpenseStatus } from "@services/accounting/expense";

const { RangePicker } = DatePicker;
const { Text } = Typography;

const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    red: "#ef4444",
    blue: "#3b82f6",
    orange: "#f59e0b",
    subText: "#64748b",
    darkText: "#0f172a",
    border: "#e2e8f0",
    bg: "#f8fafc",
};

const fmt = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SummaryCard: React.FC<{
    label: string; value: string; color: string; bg: string;
}> = ({ label, value, color, bg }) => (
    <div style={{
        flex: "1 1 130px", background: bg,
        border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`,
        borderRadius: 8, padding: "10px 14px",
    }}>
        <Text style={{
            fontSize: 10, color: C.subText, textTransform: "uppercase",
            letterSpacing: "0.4px", fontWeight: 700, display: "block", marginBottom: 4,
        }}>
            {label}
        </Text>
        <Text strong style={{ fontSize: 14, color }}>{value}</Text>
    </div>
);

const statusColors: Record<ExpenseStatus, string> = {
    Draft: "default",
    Pending: "orange",
    Approved: "green",
    Voided: "red",
};

function ExpensesPage() {
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().startOf("month"),
        dayjs().endOf("month"),
    ]);

    const { data, isLoading } = useQuery({
        queryKey: ["expenses", page, dateRange],
        queryFn: () => getAllExpenses({
            page,
            limit: 10,
            from: dateRange[0].toISOString(),
            to: dateRange[1].toISOString(),
        }),
    });

    const { data: summaryData } = useQuery({
        queryKey: ["expense-summary", dateRange],
        queryFn: () => getExpenseSummary({
            from: dateRange[0].toISOString(),
            to: dateRange[1].toISOString(),
        }),
    });

    const expenses: Expense[] = data?.expenses || [];
    const total = data?.total || 0;

    // Derive totals from summary for accuracy (avoids summing only current page)
    const summaryRows = summaryData?.summary || [];
    const totalExpenses = summaryRows.reduce((s, r) => s + r.total_amount, 0);
    const totalVat = summaryRows.reduce((s, r) => s + r.total_vat, 0);
    const approvedTotal = summaryRows
        .filter((r) => r._id === "Approved")
        .reduce((s, r) => s + r.total_amount, 0);

    const columns = [
        {
            title: "Date", dataIndex: "expense_date", width: 150,
            render: (v: string) => (
                <Text style={{ fontSize: 12, color: C.subText }}>{dayjs(v).format("DD MMM YYYY HH:mm")}</Text>
            ),
        },
        {
            title: "Ref", dataIndex: "expense_no", width: 130,
            render: (v: string) => (
                <Text style={{ fontSize: 11, fontFamily: "monospace", color: C.subText }}>{v}</Text>
            ),
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
            title: "Supplier", dataIndex: "supplier_id",
            render: (s: any) => s?.name
                ? <Text style={{ fontSize: 12 }}>{s.name}</Text>
                : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "Reference", dataIndex: "reference", width: 130,
            render: (v: string) => v
                ? <Text style={{ fontSize: 12 }}>{v}</Text>
                : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "Payment Method", dataIndex: "payment_method", width: 130,
            render: (v: string) => v
                ? <Text style={{ fontSize: 12 }}>{v.replace("_", " ")}</Text>
                : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "Expense Account (DR)",
            render: (_: any, row: Expense) => {
                const line = row.expense_lines?.[0];
                const acct = line?.account_id as any;
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
            title: "Status", dataIndex: "status", width: 100,
            render: (s: ExpenseStatus) => (
                <Tag color={statusColors[s] || "default"} style={{ fontSize: 11, fontWeight: 600 }}>
                    {s}
                </Tag>
            ),
        },
        {
            title: "VAT (KES)", dataIndex: "total_vat_amount", align: "right" as const, width: 110,
            render: (v: number) => v
                ? <Text style={{ fontSize: 12, color: C.orange }}>+{fmt(v)}</Text>
                : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "Amount (KES)", dataIndex: "grand_total", align: "right" as const, width: 140,
            render: (v: number) => (
                <Text strong style={{ color: C.red, fontSize: 13 }}>−{fmt(v)}</Text>
            ),
        },
        {
            title: "JE", dataIndex: "journal_entry_id", width: 110,
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
    ];

    return (
        <>
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
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setModalOpen(true)}
                            style={{ background: C.red, borderColor: C.red, borderRadius: 8, fontWeight: 600 }}
                        >
                            Post Expense
                        </Button>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <SummaryCard label="Total Expenses" value={`KES ${fmt(totalExpenses)}`} color={C.red} bg="#fef2f2" />
                        <SummaryCard label="Input VAT" value={`KES ${fmt(totalVat)}`} color={C.orange} bg="#fffbeb" />
                        <SummaryCard label="Gross Total" value={`KES ${fmt(totalExpenses + totalVat)}`} color={C.subText} bg={C.bg} />
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
                            scroll={{ x: 1100 }}
                            style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}
                        />
                    </Spin>
                </div>
            </div>

            <ManualIncomeModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                defaultTab="expense"
            />
        </>
    );
}

export default ExpensesPage;