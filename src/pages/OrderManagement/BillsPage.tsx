import React, { useState } from "react";
import {
    Button, DatePicker, Spin, Table, Typography, Tag,
} from "antd";
import { FileTextOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import ManualIncomeModal from "./Orders/ManualIncomeModal";
import { getIncomeHistory } from "@services/accounting/income";

const { RangePicker } = DatePicker;
const { Text } = Typography;

const C = {
    primary: "#6c1c2c",
    primaryLight: "#f9f0f2",
    green: "#10b981",
    red: "#ef4444",
    blue: "#3b82f6",
    orange: "#f59e0b",
    purple: "#8b5cf6",
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

const statusColor: Record<string, string> = {
    Pending: "orange",
    Paid: "green",
    Overdue: "red",
    Partial: "blue",
};

function BillsPage() {
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"expense" | "bill">("bill");
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().startOf("month"),
        dayjs().endOf("month"),
    ]);

    const { data, isLoading } = useQuery({
        queryKey: ["income-history-bills", page, dateRange],
        queryFn: () => getIncomeHistory({
            page, limit: 10,
            payment_type: "supplier_bill",
            from: dateRange[0].toISOString(),
            to: dateRange[1].toISOString(),
        }),
    });

    const bills = (data?.payments || []).filter((p: any) => p.payment_type === "supplier_bill");
    const total = data?.total || 0;
    const totalBills = bills.reduce((s: number, p: any) => s + p.amount, 0);
    const totalPaid = bills.filter((p: any) => p.status === "Paid").reduce((s: number, p: any) => s + p.amount, 0);
    const totalPending = bills.filter((p: any) => p.status !== "Paid").reduce((s: number, p: any) => s + p.amount, 0);

    const columns = [
        {
            title: "Bill Date", dataIndex: "payment_date", width: 130,
            render: (v: string) => (
                <Text style={{ fontSize: 12, color: C.subText }}>{dayjs(v).format("DD MMM YYYY")}</Text>
            ),
        },
        {
            title: "Supplier", dataIndex: "supplier_id", width: 160,
            render: (s: any) => s?.name
                ? <Text style={{ fontSize: 12, fontWeight: 500 }}>{s.name}</Text>
                : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "Description", dataIndex: "description",
            render: (v: string) => v
                ? <Text style={{ fontSize: 12 }}>{v}</Text>
                : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "Due Date", dataIndex: "due_date", width: 120,
            render: (v: string) => v
                ? <Text style={{ fontSize: 12, color: dayjs(v).isBefore(dayjs()) ? C.red : C.subText }}>{dayjs(v).format("DD MMM YYYY")}</Text>
                : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "Status", dataIndex: "status", width: 100,
            render: (s: string) => (
                <Tag color={statusColor[s] || "default"} style={{ fontSize: 11, fontWeight: 600 }}>{s || "Pending"}</Tag>
            ),
        },
        {
            title: "Account", dataIndex: "account_id",
            render: (a: any) => a ? (
                <span style={{
                    fontFamily: "monospace", fontSize: 11,
                    background: C.bg, border: `1px solid ${C.border}`,
                    borderRadius: 4, padding: "1px 6px", color: C.darkText,
                }}>
                    {a.account_code} {a.account_name}
                </span>
            ) : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "Amount (KES)", dataIndex: "amount", align: "right" as const, width: 130,
            render: (v: number) => (
                <Text strong style={{ color: C.purple, fontSize: 13 }}>KES {fmt(v)}</Text>
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

    const handleOpen = () => {
        setActiveTab("bill");
        setModalOpen(true);
    };

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
                            background: "#f5f3ff", borderRadius: 8,
                            padding: "5px 7px", color: C.purple, fontSize: 16, lineHeight: 1,
                        }}>
                            <FileTextOutlined />
                        </div>
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>Supplier Bills</Text>
                    </div>
                </div>

                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", flexWrap: "wrap", gap: 10,
                    }}>
                        <RangePicker
                            value={dateRange}
                            onChange={(v) => v && setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs])}
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
                            onClick={handleOpen}
                            style={{ background: C.purple, borderColor: C.purple, borderRadius: 8, fontWeight: 600 }}
                        >
                            Create Supplier Bill
                        </Button>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <SummaryCard label="Total Bills" value={`KES ${fmt(totalBills)}`} color={C.purple} bg="#f5f3ff" />
                        <SummaryCard label="Paid" value={`KES ${fmt(totalPaid)}`} color={C.green} bg="#f0fdf4" />
                        <SummaryCard label="Outstanding" value={`KES ${fmt(totalPending)}`} color={C.red} bg="#fef2f2" />
                    </div>

                    <Spin spinning={isLoading}>
                        <Table
                            rowKey="_id"
                            dataSource={bills}
                            columns={columns}
                            size="small"
                            pagination={{
                                current: page, total, pageSize: 10, onChange: setPage,
                                showTotal: (t) => `${t} entries`,
                                style: { marginBottom: 0 },
                            }}
                            scroll={{ x: 950 }}
                            style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}
                        />
                    </Spin>
                </div>
            </div>

            <ManualIncomeModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                defaultTab={activeTab}
            />
        </>
    );
}

export default BillsPage;