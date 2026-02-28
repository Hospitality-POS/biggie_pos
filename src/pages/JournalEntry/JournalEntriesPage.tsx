import React, { useRef, useState, useCallback } from "react";
import { ProTable, ProCard, ActionType } from "@ant-design/pro-components";
import {
    Button,
    Space,
    Tag,
    Typography,
    Badge,
    Statistic,
    Row,
    Col,
    App,
    DatePicker,
    Select,
    Tooltip,
    Alert,
} from "antd";
import {
    PlusOutlined,
    EyeOutlined,
    AccountBookOutlined,
    FilterOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getAllJournalEntries,
    getJournalEntrySummary,
    JournalEntry,
    JournalEntryStatus,
    JournalEntrySource,
} from "@services/accounting/journals";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import JournalEntryFormDrawer from "./JournalEntryFormDrawer";
import JournalEntryDetailDrawer from "./JournalEntryDetailDrawer";
import dayjs, { Dayjs } from "dayjs";

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Helpers ───────────────────────────────────────────────────────────────────

const getShopId = (): string => {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        return user?.shop_id || user?.shopId || "";
    } catch {
        return "";
    }
};

const STATUS_CONFIG: Record<JournalEntryStatus, { color: string; badge: "success" | "processing" | "error" | "default" }> = {
    Draft: { color: "default", badge: "default" },
    Posted: { color: "success", badge: "success" },
    Voided: { color: "error", badge: "error" },
};

const SOURCE_COLORS: Record<string, string> = {
    manual: "default",
    pos_sale: "blue",
    pos_subscription: "cyan",
    invoice: "green",
    bill: "orange",
    payment: "purple",
    reconciliation: "geekblue",
};

const ALL_STATUSES: (JournalEntryStatus | "ALL")[] = ["ALL", "Draft", "Posted", "Voided"];

const SOURCE_OPTIONS: { label: string; value: JournalEntrySource }[] = [
    { label: "Manual", value: "manual" },
    { label: "POS Sale", value: "pos_sale" },
    { label: "POS Subscription", value: "pos_subscription" },
    { label: "Invoice", value: "invoice" },
    { label: "Bill", value: "bill" },
    { label: "Payment", value: "payment" },
    { label: "Reconciliation", value: "reconciliation" },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

const JournalEntriesPage: React.FC = () => {
    const shopId = getShopId();
    const primaryColor = usePrimaryColor();
    const queryClient = useQueryClient();
    const actionRef = useRef<ActionType>();

    const [activeStatus, setActiveStatus] = useState<JournalEntryStatus | "ALL">("ALL");
    const [formOpen, setFormOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [sourceFilter, setSourceFilter] = useState<JournalEntrySource | undefined>();
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
        dayjs().startOf("month"),
        dayjs().endOf("month"),
    ]);

    const from = dateRange[0]?.startOf("day").toISOString();
    const to = dateRange[1]?.endOf("day").toISOString();

    // ── Data ──────────────────────────────────────────────────────────────────

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["journal-entries", shopId, activeStatus, sourceFilter, page, pageSize, from, to],
        queryFn: () =>
            getAllJournalEntries({
                shop_id: shopId,
                status: activeStatus === "ALL" ? undefined : activeStatus,
                source: sourceFilter,
                from,
                to,
                page,
                limit: pageSize,
            }),
        enabled: !!shopId,
    });

    const { data: summaryData } = useQuery({
        queryKey: ["journal-entry-summary", shopId, dayjs().year(), dayjs().month() + 1],
        queryFn: () => getJournalEntrySummary(shopId, dayjs().year(), dayjs().month() + 1),
        enabled: !!shopId,
    });

    const entries = data?.entries || [];
    const totalEntries = data?.totalEntries || 0;
    const summary = summaryData?.summary;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const openDetail = (id: string) => {
        setSelectedEntryId(id);
        setDetailOpen(true);
    };

    const onFormSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
        queryClient.invalidateQueries({ queryKey: ["journal-entry-summary"] });
    }, [queryClient]);

    // ── Tab counts from summary ────────────────────────────────────────────────

    const statusCounts: Record<string, number> = summary?.by_status || {};

    // ── Columns ───────────────────────────────────────────────────────────────

    const columns = [
        {
            title: "Entry No.",
            dataIndex: "entry_no",
            key: "entry_no",
            width: 130,
            render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
        },
        {
            title: "Date",
            dataIndex: "entry_date",
            key: "entry_date",
            width: 110,
            render: (d: string) => dayjs(d).format("DD MMM YYYY"),
        },
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            ellipsis: true,
        },
        {
            title: "Reference",
            dataIndex: "reference",
            key: "reference",
            width: 120,
            render: (v: string) =>
                v ? <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> : "—",
        },
        {
            title: "Source",
            dataIndex: "source",
            key: "source",
            width: 140,
            render: (s: string) => (
                <Tag color={SOURCE_COLORS[s] || "default"} style={{ fontSize: 11 }}>
                    {s?.replace(/_/g, " ").toUpperCase()}
                </Tag>
            ),
        },
        {
            title: "Total Debit",
            dataIndex: "total_debit",
            key: "total_debit",
            width: 130,
            align: "right" as const,
            render: (v: number) => (
                <Text style={{ color: "#cf1322" }}>
                    {(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </Text>
            ),
        },
        {
            title: "Total Credit",
            dataIndex: "total_credit",
            key: "total_credit",
            width: 130,
            align: "right" as const,
            render: (v: number) => (
                <Text style={{ color: "#389e0d" }}>
                    {(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </Text>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 100,
            render: (s: JournalEntryStatus) => {
                const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.Draft;
                return <Badge status={cfg.badge} text={s} />;
            },
        },
        {
            title: "Fiscal",
            key: "fiscal",
            width: 90,
            render: (_: any, r: JournalEntry) => (
                <Text type="secondary" style={{ fontSize: 11 }}>
                    {r.fiscal_year}/{String(r.fiscal_month).padStart(2, "0")}
                </Text>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 80,
            fixed: "right" as const,
            render: (_: any, record: JournalEntry) => (
                <Tooltip title="View Details">
                    <Button
                        icon={<EyeOutlined />}
                        size="small"
                        onClick={() => openDetail(record._id)}
                    />
                </Tooltip>
            ),
        },
    ];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <App>
            {/* ── Summary Cards ── */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Total Entries (This Month)"
                            value={summary?.total_entries || 0}
                            prefix={<AccountBookOutlined />}
                            valueStyle={{ color: primaryColor, fontSize: 22 }}
                        />
                    </ProCard>
                </Col>
                <Col span={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Total Debits"
                            value={summary?.total_debits || 0}
                            precision={2}
                            prefix="KES"
                            valueStyle={{ color: "#cf1322", fontSize: 18 }}
                        />
                    </ProCard>
                </Col>
                <Col span={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Total Credits"
                            value={summary?.total_credits || 0}
                            precision={2}
                            prefix="KES"
                            valueStyle={{ color: "#389e0d", fontSize: 18 }}
                        />
                    </ProCard>
                </Col>
                <Col span={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Draft (Unposted)"
                            value={statusCounts["Draft"] || 0}
                            valueStyle={{
                                color: statusCounts["Draft"] > 0 ? "#faad14" : "#8c8c8c",
                                fontSize: 22,
                            }}
                            suffix={
                                statusCounts["Draft"] > 0 ? (
                                    <Text style={{ fontSize: 12, color: "#faad14" }}>pending</Text>
                                ) : null
                            }
                        />
                    </ProCard>
                </Col>
            </Row>

            {/* ── Main Table ── */}
            <ProCard
                title={
                    <Space>
                        <AccountBookOutlined style={{ fontSize: 18, color: primaryColor }} />
                        <Typography.Title level={4} style={{ margin: 0 }}>
                            Journal Entries
                        </Typography.Title>
                    </Space>
                }
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setFormOpen(true)}
                        style={{ background: primaryColor, borderColor: primaryColor }}
                    >
                        New Entry
                    </Button>
                }
                bordered
                tabs={{
                    activeKey: activeStatus,
                    onChange: (k) => { setActiveStatus(k as JournalEntryStatus | "ALL"); setPage(1); },
                    items: ALL_STATUSES.map((s) => ({
                        key: s,
                        label: (
                            <Space size={4}>
                                {s === "ALL" ? "All" : s}
                                {s !== "ALL" && (statusCounts[s] || 0) > 0 && (
                                    <Tag
                                        color={STATUS_CONFIG[s as JournalEntryStatus]?.color}
                                        style={{ fontSize: 10, lineHeight: "16px", padding: "0 5px", marginLeft: 2 }}
                                    >
                                        {statusCounts[s]}
                                    </Tag>
                                )}
                            </Space>
                        ),
                    })),
                }}
            >
                {/* ── Filters ── */}
                <Space style={{ marginBottom: 16 }} wrap>
                    <FilterOutlined style={{ color: "#8c8c8c" }} />
                    <RangePicker
                        value={dateRange}
                        onChange={(r) => { setDateRange(r as [Dayjs, Dayjs]); setPage(1); }}
                        allowClear={false}
                        format="DD MMM YYYY"
                        presets={[
                            { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
                            { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
                            { label: "Last Month", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
                            { label: "This Year", value: [dayjs().startOf("year"), dayjs().endOf("year")] },
                            { label: "Last 30 Days", value: [dayjs().subtract(30, "day"), dayjs()] },
                        ]}
                    />
                    <Select
                        placeholder="Filter by source"
                        options={SOURCE_OPTIONS}
                        value={sourceFilter}
                        onChange={(v) => { setSourceFilter(v); setPage(1); }}
                        allowClear
                        style={{ width: 180 }}
                    />
                </Space>

                {!shopId && (
                    <Alert type="warning" message="Shop ID not found." showIcon style={{ marginBottom: 12 }} />
                )}

                <ProTable<JournalEntry>
                    rowKey="_id"
                    actionRef={actionRef}
                    dataSource={entries}
                    columns={columns}
                    loading={isLoading}
                    search={false}
                    options={{ reload: () => refetch(), fullScreen: true }}
                    pagination={{
                        current: page,
                        pageSize: pageSize,
                        total: totalEntries,
                        showSizeChanger: true,
                        showTotal: (total) => `${total} entries`,
                        onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                    }}
                    scroll={{ x: 1100 }}
                    size="small"
                    cardBordered={false}
                    toolbar={{
                        title: `${totalEntries} total entries`,
                    }}
                    rowClassName={(record) =>
                        record.status === "Voided" ? "opacity-50" : ""
                    }
                    columnsState={{
                        persistenceKey: "je-table-columns",
                        persistenceType: "localStorage",
                    }}
                />
            </ProCard>

            {/* ── Create Drawer ── */}
            <JournalEntryFormDrawer
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSuccess={onFormSuccess}
                shopId={shopId}
            />

            {/* ── Detail / Post / Void Drawer ── */}
            <JournalEntryDetailDrawer
                open={detailOpen}
                onClose={() => { setDetailOpen(false); setSelectedEntryId(null); }}
                entryId={selectedEntryId}
                onSuccess={onFormSuccess}
            />
        </App>
    );
};

export default JournalEntriesPage;