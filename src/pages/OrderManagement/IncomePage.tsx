import React, { useState } from "react";
import {
    Button, DatePicker, Spin, Table, Typography,
} from "antd";
import { DollarOutlined, PlusOutlined, OrderedListOutlined } from "@ant-design/icons";
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

const DirectionTag: React.FC<{ direction: string }> = ({ direction }) => (
    <span style={{
        display: "inline-block", borderRadius: 5, padding: "2px 8px",
        fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
        background: direction === "inbound" ? "#f0fdf4" : "#fef2f2",
        color: direction === "inbound" ? C.green : C.red,
        border: `1px solid ${direction === "inbound" ? "#bbf7d0" : "#fecaca"}`,
    }}>
        {direction === "inbound" ? "Income" : "Expense"}
    </span>
);

function IncomePage() {
    const [page, setPage] = useState(1);
    const [incomeModalOpen, setIncomeModalOpen] = useState(false);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().startOf("month"),
        dayjs().endOf("month"),
    ]);

    const { data, isLoading } = useQuery({
        queryKey: ["income-history", page, dateRange],
        queryFn: () => getIncomeHistory({
            page, limit: 10,
            from: dateRange[0].toISOString(),
            to: dateRange[1].toISOString(),
        }),
    });

    const payments = data?.payments || [];
    const total = data?.total || 0;

    const totalInbound = payments
        .filter((p: any) => p.direction === "inbound")
        .reduce((s: number, p: any) => s + p.amount, 0);
    const totalOutbound = payments
        .filter((p: any) => p.direction === "outbound")
        .reduce((s: number, p: any) => s + p.amount, 0);

    const columns = [
        {
            title: "Date", dataIndex: "payment_date", width: 150,
            render: (v: string) => (
                <Text style={{ fontSize: 12, color: C.subText }}>{dayjs(v).format("DD MMM YYYY HH:mm")}</Text>
            ),
        },
        {
            title: "Type", dataIndex: "payment_type", width: 130,
            render: (type: string, rec: any) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <DirectionTag direction={rec.direction} />
                    <Text style={{ fontSize: 11, color: C.subText }}>{type?.replace(/_/g, " ")}</Text>
                </div>
            ),
        },
        {
            title: "Reference", dataIndex: "reference",
            render: (v: string) => v
                ? <Text style={{ fontSize: 12 }}>{v}</Text>
                : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "Method", dataIndex: "method_id", width: 110,
            render: (m: any) => m?.name
                ? <Text style={{ fontSize: 12 }}>{m.name}</Text>
                : <Text style={{ color: C.subText }}>—</Text>,
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
            title: "Invoice", dataIndex: "invoice_id", width: 110,
            render: (inv: any) => inv ? (
                <span style={{
                    background: "#eff6ff", color: C.blue, border: `1px solid #bfdbfe`,
                    borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                }}>
                    {inv.order_no}
                </span>
            ) : <Text style={{ color: C.subText }}>—</Text>,
        },
        {
            title: "Amount (KES)", dataIndex: "amount", align: "right" as const, width: 130,
            render: (v: number, rec: any) => (
                <Text strong style={{ color: rec.direction === "inbound" ? C.green : C.red, fontSize: 13 }}>
                    {rec.direction === "outbound" ? "−" : "+"}
                    {fmt(v)}
                </Text>
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
                            background: "#fff7ed", borderRadius: 8,
                            padding: "5px 7px", color: C.orange, fontSize: 16, lineHeight: 1,
                        }}>
                            <DollarOutlined />
                        </div>
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>Income & Payments</Text>
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
                            onClick={() => setIncomeModalOpen(true)}
                            style={{ background: C.orange, borderColor: C.orange, borderRadius: 8, fontWeight: 600 }}
                        >
                            Post Income / Expense
                        </Button>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <SummaryCard label="Total Income" value={`KES ${fmt(totalInbound)}`} color={C.green} bg="#f0fdf4" />
                        <SummaryCard label="Total Outflow" value={`KES ${fmt(totalOutbound)}`} color={C.red} bg="#fef2f2" />
                        <SummaryCard label="Net" value={`KES ${fmt(totalInbound - totalOutbound)}`} color={C.blue} bg="#eff6ff" />
                    </div>

                    <Spin spinning={isLoading}>
                        <Table
                            rowKey="_id"
                            dataSource={payments}
                            columns={columns}
                            size="small"
                            pagination={{
                                current: page, total, pageSize: 10, onChange: setPage,
                                showTotal: (t) => `${t} entries`,
                                style: { marginBottom: 0 },
                            }}
                            scroll={{ x: 900 }}
                            style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}
                        />
                    </Spin>
                </div>
            </div>

            <ManualIncomeModal open={incomeModalOpen} onClose={() => setIncomeModalOpen(false)} />
        </>
    );
}

export default IncomePage;