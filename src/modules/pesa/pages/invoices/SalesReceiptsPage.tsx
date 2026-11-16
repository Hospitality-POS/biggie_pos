import React, { useEffect, useMemo, useState } from "react";
import {
    Button,
    Space,
    Tag,
    Typography,
    App,
    Select,
    Tooltip,
    Table,
    Input,
} from "antd";
import {
    PlusOutlined,
    EyeOutlined,
    EditOutlined,
    ReloadOutlined,
    SearchOutlined,
    FileDoneOutlined,
    StopOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getSalesReceipts,
    getSalesReceiptSummary,
    fixVoidedJournalEntries,
    SalesReceipt,
    SalesReceiptStatus,
    PaymentMethod,
} from "@services/accounting/salesReceipts";
import { fetchAllCustomers } from "@services/customers";
import { THEME_C } from "@utils/getPrimaryColor";
import PeriodFilter, { defaultPeriod, periodRange, isDefaultPeriod, type PeriodValue } from "@components/PeriodFilter";
import SalesReceiptFormModal from "./SalesReceiptFormModal";
import SalesReceiptDetailDrawer from "./SalesReceiptDetailDrawer";
import VoidReceiptModal from "./VoidReceiptModal";
import dayjs from "dayjs";

const { Text } = Typography;

// ── Color Palette ───────────────────────────────────────────────────────────────
const C = THEME_C;
// Readable green for text/buttons (the theme green is a bright accent)
const RECEIPT_GREEN = "#16a34a";

const fmt = (v: number) =>
    (v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Same summary card as Bills / Expenses
const SummaryCard: React.FC<{ label: string; value: string; sub?: string; color: string; bg: string }> = ({
    label, value, sub, color, bg,
}) => (
    <div style={{
        flex: "1 1 150px", background: bg,
        border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`,
        borderRadius: 8, padding: "10px 14px",
    }}>
        <Text style={{
            fontSize: 10, color: C.subText, textTransform: "uppercase",
            letterSpacing: "0.4px", fontWeight: 700, display: "block", marginBottom: 4,
        }}>{label}</Text>
        <Text strong style={{ fontSize: 14, color }}>{value}</Text>
        {sub && <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>{sub}</Text>}
    </div>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const getShopId = (): string => {
    try {
        return localStorage.getItem("shopId") || "";
    } catch {
        return "";
    }
};

const STATUS_CONFIG: Record<SalesReceiptStatus, { color: string; badge: "success" | "processing" | "error" | "default" }> = {
    Pending: { color: "warning", badge: "processing" },
    Posted: { color: "success", badge: "success" },
    Voided: { color: "error", badge: "error" },
};

const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
    Cash: "green",
    "M-Pesa": "blue",
    Card: "purple",
    Bank_Transfer: "cyan",
    Cheque: "orange",
    Other: "default",
};

const ALL_STATUSES: (SalesReceiptStatus | "ALL")[] = ["ALL", "Pending", "Posted", "Voided"];

const PAYMENT_METHOD_OPTIONS: { label: string; value: PaymentMethod }[] = [
    { label: "Cash", value: "Cash" },
    { label: "M-Pesa", value: "M-Pesa" },
    { label: "Card", value: "Card" },
    { label: "Bank Transfer", value: "Bank_Transfer" },
    { label: "Cheque", value: "Cheque" },
    { label: "Other", value: "Other" },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

const SalesReceiptsPage: React.FC = () => {
    const shopId = getShopId();
    const queryClient = useQueryClient();
    const { message } = App.useApp();

    const [formOpen, setFormOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // ── Filters (same layout as Bills / Expenses) ───────────────────────────
    const [period, setPeriod] = useState<PeriodValue>(defaultPeriod);
    const [activeStatus, setActiveStatus] = useState<SalesReceiptStatus | undefined>();
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | undefined>();
    const [customerFilter, setCustomerFilter] = useState<string | undefined>();
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    // Debounce the free-text search so each keystroke doesn't refetch
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const dateRange = useMemo(() => periodRange(period), [period]);
    const from = dateRange[0].startOf("day").toISOString();
    const to = dateRange[1].endOf("day").toISOString();

    const filtersActive =
        !!(activeStatus || paymentMethodFilter || customerFilter || search) || !isDefaultPeriod(period);
    const clearFilters = () => {
        setActiveStatus(undefined);
        setPaymentMethodFilter(undefined);
        setCustomerFilter(undefined);
        setSearchInput("");
        setSearch("");
        setPeriod(defaultPeriod());
        setPage(1);
    };

    const { data: customersRaw } = useQuery({
        queryKey: ["customers-select-sales-receipts"],
        queryFn: () => fetchAllCustomers({}),
        staleTime: 60_000,
    });
    const customerOptions = (Array.isArray(customersRaw) ? customersRaw : []).map((c: any) => ({
        label: c.customer_name || c.company_name || c.code,
        value: c._id,
    }));

    // Fetch sales receipts
    const { data: receiptsData, isLoading, isFetching } = useQuery({
        queryKey: ["sales-receipts", page, pageSize, activeStatus, paymentMethodFilter, customerFilter, search, from, to],
        queryFn: () =>
            getSalesReceipts({
                page,
                limit: pageSize,
                status: activeStatus,
                payment_method: paymentMethodFilter,
                customer_id: customerFilter,
                search: search || undefined,
                from,
                to,
            }),
        enabled: !!shopId,
    });

    // Fetch summary — follows the period, payment method and customer filters
    const { data: summaryData } = useQuery({
        queryKey: ["sales-receipts-summary", from, to, paymentMethodFilter, customerFilter],
        queryFn: () => getSalesReceiptSummary({ from, to, payment_method: paymentMethodFilter, customer_id: customerFilter }),
        enabled: !!shopId,
    });

    const receipts = receiptsData?.receipts || [];
    const total = receiptsData?.total || 0;

    // The summary is grouped by status — a status filter is applied here
    const summary = (summaryData?.summary || []).filter((s) => !activeStatus || s._id === activeStatus);
    const sumOf = (status: SalesReceiptStatus) => summary.find((s) => s._id === status) || { total_amount: 0, count: 0 };
    const posted = sumOf("Posted");
    const pending = sumOf("Pending");
    const voided = sumOf("Voided");
    const receiptCount = summary.reduce((s, r) => s + (r.count || 0), 0);

    // The table is fed by React Query, so refreshing means refetching those queries
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ["sales-receipts"] });
        queryClient.invalidateQueries({ queryKey: ["sales-receipts-summary"] });
    };

    const handleView = (id: string) => {
        setSelectedReceiptId(id);
        setDetailOpen(true);
    };

    const handleEdit = (id: string) => {
        setDetailOpen(false);
        setSelectedReceiptId(id);
        setFormOpen(true);
    };

    const [voidTarget, setVoidTarget] = useState<SalesReceipt | null>(null);

    const handleCreate = () => {
        setSelectedReceiptId(null);
        setFormOpen(true);
    };

    const handleFixVoidedJournals = async () => {
        try {
            const result = await fixVoidedJournalEntries();
            message.success(result.message);
            refresh();
        } catch (error) {
            console.error("Failed to fix voided journals:", error);
        }
    };

    const columns = [
        {
            title: "Receipt No",
            dataIndex: "receipt_no",
            key: "receipt_no",
            width: 150,
            render: (text: string) => <Text strong style={{ fontFamily: "monospace" }}>{text}</Text>,
        },
        {
            title: "Date",
            dataIndex: "receipt_date",
            key: "receipt_date",
            width: 120,
            render: (date: string) => (
                <Text style={{ fontSize: 12, color: C.subText }}>{dayjs(date).format("DD MMM YYYY")}</Text>
            ),
        },
        {
            title: "Customer",
            dataIndex: "customer_name",
            key: "customer_name",
            width: 200,
            render: (name: string, record: SalesReceipt) => {
                const label = name || record.customer_id?.customer_name;
                return label
                    ? <Text strong style={{ fontSize: 13 }}>{label}</Text>
                    : <Text type="secondary">Cash Sale</Text>;
            },
        },
        {
            title: "Linked Invoice",
            dataIndex: "invoice_id",
            key: "invoice_id",
            width: 150,
            render: (invoice: any) =>
                invoice ? (
                    <Text style={{ color: C.primary }}>
                        {invoice.order_no}
                    </Text>
                ) : (
                    <Text style={{ color: C.subText }}>—</Text>
                ),
        },
        {
            title: "Amount",
            dataIndex: "grand_total",
            key: "grand_total",
            width: 120,
            align: "right" as const,
            render: (amount: number) => <Text strong>KES {fmt(amount)}</Text>,
        },
        {
            title: "Payment Method",
            dataIndex: "payment_method",
            key: "payment_method",
            width: 130,
            render: (method: PaymentMethod) => (
                <Tag color={PAYMENT_METHOD_COLORS[method] || "default"}>{(method || "").replace(/_/g, " ")}</Tag>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 100,
            render: (status: SalesReceiptStatus) => (
                <Tag color={STATUS_CONFIG[status]?.color || "default"} style={{ fontWeight: 600 }}>{status}</Tag>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 120,
            fixed: "right" as const,
            render: (_: any, record: SalesReceipt) => (
                <Space size="small">
                    <Tooltip title="View">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => handleView(record._id)}
                        />
                    </Tooltip>
                    {record.status !== "Voided" && (
                        <Tooltip title={record.status === "Posted" ? "Edit (re-posts the journal entry)" : "Edit"}>
                            <Button
                                type="text"
                                icon={<EditOutlined />}
                                aria-label="Edit receipt"
                                onClick={() => handleEdit(record._id)}
                            />
                        </Tooltip>
                    )}
                    {record.status !== "Voided" && (
                        <Tooltip title={record.status === "Posted" ? "Void (reverses the journal entry)" : "Void"}>
                            <Button
                                type="text"
                                danger
                                icon={<StopOutlined />}
                                aria-label="Void receipt"
                                onClick={() => setVoidTarget(record)}
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: "#fff" }}>
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    flexWrap: "wrap", gap: 10,
                    padding: "14px 18px", background: C.bg, borderBottom: `1px solid ${C.border}`,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            background: "#f0fdf4", borderRadius: 8,
                            padding: "5px 7px", color: RECEIPT_GREEN, fontSize: 16, lineHeight: 1,
                        }}>
                            <FileDoneOutlined />
                        </div>
                        <Text strong style={{ fontSize: 14, color: C.darkText }}>Sales Receipts</Text>
                        {pending.count > 0 && (
                            <Tag color="orange" style={{ fontSize: 11, fontWeight: 600 }}>
                                {pending.count} Pending
                            </Tag>
                        )}
                    </div>
                </div>

                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", flexWrap: "wrap", gap: 10,
                    }}>
                        <PeriodFilter value={period} onChange={(p) => { setPeriod(p); setPage(1); }} />
                        <Space wrap>
                            <Tooltip title="Refresh records">
                                <Button icon={<ReloadOutlined />} onClick={refresh} loading={isFetching} style={{ borderRadius: 8 }} />
                            </Tooltip>
                            {activeStatus === "Voided" && (
                                <Button onClick={handleFixVoidedJournals} style={{ borderRadius: 8 }}>
                                    Fix Voided Journals
                                </Button>
                            )}
                            <Button
                                type="primary" icon={<PlusOutlined />} onClick={handleCreate}
                                style={{ background: RECEIPT_GREEN, borderColor: RECEIPT_GREEN, borderRadius: 8, fontWeight: 600 }}
                            >
                                New Receipt
                            </Button>
                        </Space>
                    </div>

                    {/* ── Status / method / customer / search filters ── */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <Select
                            allowClear
                            placeholder="All statuses"
                            value={activeStatus}
                            onChange={(v) => { setActiveStatus(v); setPage(1); }}
                            style={{ width: 150 }}
                            options={ALL_STATUSES.filter((s) => s !== "ALL").map((s) => ({ label: s, value: s }))}
                        />
                        <Select
                            allowClear
                            placeholder="All payment methods"
                            value={paymentMethodFilter}
                            onChange={(v) => { setPaymentMethodFilter(v); setPage(1); }}
                            style={{ width: 180 }}
                            options={PAYMENT_METHOD_OPTIONS}
                        />
                        <Select
                            allowClear
                            showSearch
                            placeholder="All customers"
                            value={customerFilter}
                            onChange={(v) => { setCustomerFilter(v); setPage(1); }}
                            options={customerOptions}
                            optionFilterProp="label"
                            style={{ width: 220 }}
                        />
                        <Input
                            allowClear
                            prefix={<SearchOutlined style={{ color: C.subText }} />}
                            placeholder="Receipt no, customer or notes"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            style={{ width: 250, borderRadius: 8 }}
                        />
                        {filtersActive && (
                            <Button type="link" onClick={clearFilters} style={{ paddingInline: 4 }}>
                                Clear filters
                            </Button>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <SummaryCard label="Posted" value={`KES ${fmt(posted.total_amount)}`} sub={`${posted.count} receipts`} color={RECEIPT_GREEN} bg="#f0fdf4" />
                        <SummaryCard label="Pending" value={`KES ${fmt(pending.total_amount)}`} sub={`${pending.count} receipts`} color={C.orange} bg="#fffbeb" />
                        <SummaryCard label="Voided" value={`KES ${fmt(voided.total_amount)}`} sub={`${voided.count} receipts`} color={C.red} bg="#fef2f2" />
                        <SummaryCard label="Receipts" value={String(receiptCount)} sub="in this period" color={C.purple} bg="#f5f3ff" />
                    </div>

                    <Table<SalesReceipt>
                        rowKey="_id"
                        columns={columns}
                        dataSource={receipts}
                        loading={isLoading}
                        size="small"
                        pagination={{
                            current: page,
                            pageSize,
                            total,
                            onChange: (p, ps) => {
                                if (ps && ps !== pageSize) {
                                    setPageSize(ps);
                                    setPage(1);
                                } else {
                                    setPage(p);
                                }
                            },
                            showSizeChanger: true,
                            showTotal: (t) => `${t} receipts`,
                            style: { marginBottom: 0 },
                        }}
                        locale={{ emptyText: "No sales receipts for these filters" }}
                        scroll={{ x: 1000 }}
                        style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}
                    />
                </div>
            </div>

            {/* Create / edit — stepped modal */}
            <SalesReceiptFormModal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                receiptId={selectedReceiptId}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["sales-receipts"] });
                    queryClient.invalidateQueries({ queryKey: ["sales-receipts-summary"] });
                    queryClient.invalidateQueries({ queryKey: ["sales-receipt"] });
                }}
            />

            {/* View — side drawer */}
            <SalesReceiptDetailDrawer
                open={detailOpen}
                setOpen={setDetailOpen}
                onEdit={handleEdit}
                receiptId={selectedReceiptId}
                onSuccess={refresh}
            />

            <VoidReceiptModal
                receipt={voidTarget}
                onClose={() => setVoidTarget(null)}
                onVoided={() => {
                    refresh();
                    queryClient.invalidateQueries({ queryKey: ["sales-receipt"] });
                }}
            />
        </div>
    );
};

export default SalesReceiptsPage;
