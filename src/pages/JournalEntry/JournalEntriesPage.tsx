import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
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
    Input,
    Tooltip,
    Alert,
    Tabs,
    Checkbox,
    Popconfirm,
    Modal,
    message,
} from "antd";
import {
    PlusOutlined,
    EyeOutlined,
    EditOutlined,
    AccountBookOutlined,
    FilterOutlined,
    DeleteOutlined,
    ClearOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getAllJournalEntries,
    getJournalEntrySummary,
    bulkDeleteJournalEntries,
    JournalEntry,
    JournalEntryStatus,
    JournalEntrySource,
} from "@services/accounting/journals";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import JournalEntryFormDrawer from "./JournalEntryFormDrawer";
import JournalEntryDetailDrawer from "./JournalEntryDetailDrawer";
import dayjs, { Dayjs } from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";

dayjs.extend(quarterOfYear);

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Helpers ───────────────────────────────────────────────────────────────────

const getShopId = (): string => {
    try {
        return localStorage.getItem("shopId") || "";
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
    journal: "magenta",
    pos_sale: "blue",
    pos_subscription: "cyan",
    invoice: "green",
    bill: "orange",
    payment: "purple",
    reconciliation: "geekblue",
    bank_upload: "gold",
    income: "green",
    expense: "orange",
    payroll: "purple",
    credit_note: "cyan",
    debit_note: "blue",
    note_void: "red",
};

const ALL_STATUSES: (JournalEntryStatus | "ALL")[] = ["ALL", "Draft", "Posted", "Voided"];

// ── Duplicate detection helpers ───────────────────────────────────────────────
// Entries are duplicates only when EVERYTHING matches: same source, same date,
// same description, same reference (or both empty), and same amounts — the
// signature of one transaction posted to the journal more than once.
// A shared reference alone is NOT enough (many legit transactions reuse refs).
const duplicateKey = (e: JournalEntry): string | null => {
    const desc = (e.description || "").trim().toLowerCase();
    if (!desc) return null;
    const ref = (e.reference || "").trim().toLowerCase();
    const date = dayjs(e.entry_date).format("YYYY-MM-DD");
    return `${e.source}|${date}|${desc}|${ref}|${e.total_debit}|${e.total_credit}`;
};

// Voided entries already have reversal entries — never delete or "keep" them.
const isDeletable = (e: JournalEntry) => e.status !== "Voided";

const STATUS_KEEP_PRIORITY: Record<JournalEntryStatus, number> = {
    Posted: 0,
    Draft: 1,
    Voided: 2,
};

// Sorts so the entry to KEEP is first: Posted over Draft, then earliest date.
const sortKeepFirst = (a: JournalEntry, b: JournalEntry) =>
    STATUS_KEEP_PRIORITY[a.status] - STATUS_KEEP_PRIORITY[b.status] ||
    dayjs(a.entry_date).valueOf() - dayjs(b.entry_date).valueOf() ||
    String(a.entry_no).localeCompare(String(b.entry_no));

const SOURCE_OPTIONS: { label: string; value: JournalEntrySource }[] = [
    { label: "Manual", value: "manual" },
    { label: "Journal", value: "journal" },
    { label: "POS Sale", value: "pos_sale" },
    { label: "POS Subscription", value: "pos_subscription" },
    { label: "Invoice", value: "invoice" },
    { label: "Bill", value: "bill" },
    { label: "Payment", value: "payment" },
    { label: "Reconciliation", value: "reconciliation" },
    { label: "Bank Upload", value: "bank_upload" },
    { label: "Income", value: "income" },
    { label: "Expense", value: "expense" },
    { label: "Payroll", value: "payroll" },
    { label: "Credit Note", value: "credit_note" },
    { label: "Debit Note", value: "debit_note" },
    { label: "Note Void", value: "note_void" },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

const JournalEntriesPage: React.FC = () => {
    const shopId = getShopId();
    const primaryColor = usePrimaryColor();
    const queryClient = useQueryClient();
    const actionRef = useRef<ActionType>();

    const [activeStatus, setActiveStatus] = useState<JournalEntryStatus | "ALL">("ALL");
    const [formOpen, setFormOpen] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [sourceFilter, setSourceFilter] = useState<JournalEntrySource | undefined>();
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
    const [dupFilter, setDupFilter] = useState<"all" | "keep" | "delete">("all");
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [deleting, setDeleting] = useState(false);
    const [deletingDuplicates, setDeletingDuplicates] = useState(false);
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
        dayjs().startOf("month"),
        dayjs().endOf("month"),
    ]);

    const from = dateRange[0]?.startOf("day").toISOString();
    const to = dateRange[1]?.endOf("day").toISOString();

    // ── Data ──────────────────────────────────────────────────────────────────

    const { data, isLoading, refetch, error } = useQuery({
        queryKey: ["journal-entries", shopId, activeStatus, sourceFilter, searchTerm, page, pageSize, from, to],
        queryFn: () =>
            getAllJournalEntries({
                shop_id: shopId,
                status: activeStatus === "ALL" ? undefined : activeStatus,
                source: sourceFilter,
                search: searchTerm || undefined,
                from,
                to,
                page,
                limit: pageSize,
            }),
        enabled: true,
        retry: 2,
    });

    const { data: summaryData } = useQuery({
        queryKey: ["journal-entry-summary", shopId, from, to],
        queryFn: () => getJournalEntrySummary(shopId, undefined, undefined, from, to),
        enabled: true,
        retry: 2,
    });

    const entries = data?.entries || [];
    const totalEntries = data?.totalEntries || 0;
    const summary = summaryData?.summary;

    // Full (unpaginated) set matching the current filters — used for
    // cross-page duplicate detection and the delete-duplicates action.
    const { data: allEntriesData } = useQuery({
        queryKey: ["journal-entries-all", shopId, activeStatus, sourceFilter, searchTerm, from, to],
        queryFn: () =>
            getAllJournalEntries({
                shop_id: shopId,
                status: activeStatus === "ALL" ? undefined : activeStatus,
                source: sourceFilter,
                search: searchTerm || undefined,
                from,
                to,
                page: 1,
                limit: 5000,
            }),
        enabled: true,
        retry: 2,
    });
    const allEntries = allEntriesData?.entries || [];

    // ── Duplicate detection (across all matching entries, not just the page) ──

    const duplicateGroups = useMemo(() => {
        const groups: Record<string, JournalEntry[]> = {};
        for (const e of allEntries) {
            const key = duplicateKey(e);
            if (!key) continue;
            (groups[key] ||= []).push(e);
        }
        return Object.values(groups).filter(
            (g) => g.filter(isDeletable).length > 1
        );
    }, [allEntries]);

    // Ordered so each group's surviving entry (KEEP) comes first, followed by
    // the copies that will be deleted — groups stay visually together.
    const duplicateEntries = useMemo(
        () =>
            duplicateGroups.flatMap((g) =>
                g.filter(isDeletable).sort(sortKeepFirst)
            ),
        [duplicateGroups]
    );

    // Per-entry duplicate info: which group it belongs to and which entry
    // number survives in that group — makes KEEP/DELETE tags explainable.
    const duplicateGroupInfo = useMemo(() => {
        const info = new Map<string, { group: number; keptNo: string; keptId: string }>();
        duplicateGroups.forEach((g, i) => {
            const sorted = g.filter(isDeletable).sort(sortKeepFirst);
            const keptNo = sorted[0]?.entry_no || "";
            const keptId = sorted[0]?._id || "";
            for (const e of sorted) {
                info.set(e._id, { group: i + 1, keptNo, keptId });
            }
        });
        return info;
    }, [duplicateGroups]);

    // Duplicate groups formed ONLY from the rows the user has selected —
    // the delete-duplicates action is scoped to the selection.
    const selectedDuplicateGroups = useMemo(() => {
        if (!selectedRowKeys.length) return [];
        const byId = new Map(allEntries.map((e) => [e._id, e]));
        const groups: Record<string, JournalEntry[]> = {};
        for (const key of selectedRowKeys) {
            const e = byId.get(String(key));
            if (!e) continue;
            const dk = duplicateKey(e);
            if (!dk) continue;
            (groups[dk] ||= []).push(e);
        }
        return Object.values(groups).filter(
            (g) => g.filter(isDeletable).length > 1
        );
    }, [selectedRowKeys, allEntries]);

    const selectedDuplicateCount = useMemo(
        () =>
            selectedDuplicateGroups.reduce(
                (sum, g) => sum + g.filter(isDeletable).length - 1,
                0
            ),
        [selectedDuplicateGroups]
    );

    // Every extra copy across all duplicate groups — the delete-all count.
    const allDuplicatesDeleteCount = useMemo(
        () =>
            duplicateGroups.reduce(
                (sum, g) => sum + g.filter(isDeletable).length - 1,
                0
            ),
        [duplicateGroups]
    );

    const displayedEntries = useMemo(() => {
        if (!showDuplicatesOnly) return entries;
        if (dupFilter === "all") return duplicateEntries;
        return duplicateEntries.filter((e) => {
            const kept = duplicateGroupInfo.get(e._id)?.keptId === e._id;
            return dupFilter === "keep" ? kept : !kept;
        });
    }, [showDuplicatesOnly, entries, duplicateEntries, dupFilter, duplicateGroupInfo]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const openDetail = (id: string) => {
        setSelectedEntryId(id);
        setDetailOpen(true);
    };

    const openEdit = (id: string) => {
        setDetailOpen(false);
        setSelectedEntryId(null);
        setEditingEntryId(id);
        setFormOpen(true);
    };

    const onFormSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
        queryClient.invalidateQueries({ queryKey: ["journal-entry-summary"] });
    }, [queryClient]);

    const handleBulkDelete = async () => {
        setDeleting(true);
        try {
            const result = await bulkDeleteJournalEntries(
                selectedRowKeys.map(String),
                shopId
            );
            if (result.deleted.length > 0) {
                message.success(
                    `Deleted ${result.deleted.length} journal entr${result.deleted.length === 1 ? "y" : "ies"}`
                );
            }
            if (result.failed.length > 0) {
                message.error(
                    `${result.failed.length} entr${result.failed.length === 1 ? "y" : "ies"} could not be deleted: ` +
                    result.failed
                        .map((f) => `${f.entry_no || f.id} — ${f.reason}`)
                        .join("; ")
                );
            }
            setSelectedRowKeys([]);
            onFormSuccess();
        } catch (error: any) {
            message.error(
                error?.response?.data?.message || "Error deleting journal entries"
            );
        } finally {
            setDeleting(false);
        }
    };

    // Show every entry that will be deleted, grouped under the copy kept,
    // then bulk-delete on confirm. Used for both selected-rows dedupe and
    // the delete-all-duplicates action.
    const confirmDeleteDuplicates = (groups: JournalEntry[][]) => {
        const toDelete = groups.flatMap((g) =>
            g.filter(isDeletable).sort(sortKeepFirst).slice(1)
        );

        if (!toDelete.length) {
            message.info("No duplicates found");
            return;
        }

        Modal.confirm({
            title: `Delete ${toDelete.length} duplicate entr${toDelete.length === 1 ? "y" : "ies"}?`,
            width: 640,
            content: (
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        The entries below will be permanently deleted — one copy is
                        kept per group (preferring Posted, then the earliest).
                        Locked periods are skipped.
                    </Text>
                    <div style={{ maxHeight: 320, overflowY: "auto", marginTop: 10 }}>
                        {groups.map((g, i) => {
                            const sorted = g.filter(isDeletable).sort(sortKeepFirst);
                            const kept = sorted[0];
                            const del = sorted.slice(1);
                            if (!del.length) return null;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        marginBottom: 10,
                                        padding: "6px 10px",
                                        background: "#fafafa",
                                        borderRadius: 6,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, color: "#389e0d" }}>
                                        KEEP {kept?.entry_no}
                                    </Text>
                                    {del.map((e) => (
                                        <div key={e._id} style={{ fontSize: 12 }}>
                                            <Text delete type="danger">
                                                {e.entry_no}
                                            </Text>
                                            <Text type="secondary">
                                                {"  "}
                                                {dayjs(e.entry_date).format("DD MMM YY")} — {e.description} —{" "}
                                                {(e.total_debit || 0).toLocaleString("en-KE", {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </Text>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ),
            okText: `Delete ${toDelete.length} Duplicate${toDelete.length === 1 ? "" : "s"}`,
            okButtonProps: { danger: true },
            onOk: async () => {
                setDeletingDuplicates(true);
                const progressKey = "dup-delete-progress";
                message.open({ key: progressKey, type: "loading", content: "Deleting duplicates…", duration: 0 });
                try {
                    // Send in batches of 100 so large cleanups don't time out.
                    const BATCH = 100;
                    const deleted: { id: string; entry_no: string }[] = [];
                    const failed: { id: string; entry_no?: string; reason: string }[] = [];
                    for (let i = 0; i < toDelete.length; i += BATCH) {
                        const batch = toDelete.slice(i, i + BATCH);
                        message.open({
                            key: progressKey,
                            type: "loading",
                            content: `Deleting duplicates… ${Math.min(i + BATCH, toDelete.length)}/${toDelete.length}`,
                            duration: 0,
                        });
                        const result = await bulkDeleteJournalEntries(
                            batch.map((e) => e._id),
                            shopId
                        );
                        deleted.push(...result.deleted);
                        failed.push(...result.failed);
                    }
                    message.destroy(progressKey);
                    if (deleted.length > 0) {
                        message.success(
                            `Deleted ${deleted.length} duplicate entr${deleted.length === 1 ? "y" : "ies"}`
                        );
                    }
                    if (failed.length > 0) {
                        message.error(
                            `${failed.length} entr${failed.length === 1 ? "y" : "ies"} could not be deleted: ` +
                            failed
                                .map((f) => `${f.entry_no || f.id} — ${f.reason}`)
                                .join("; ")
                        );
                    }
                    setSelectedRowKeys([]);
                    onFormSuccess();
                } catch (error: any) {
                    message.destroy(progressKey);
                    message.error(
                        error?.response?.data?.message || "Error deleting duplicate journal entries"
                    );
                } finally {
                    setDeletingDuplicates(false);
                }
            },
        });
    };

    // Within the user's selected rows — keep one entry per duplicate group,
    // delete the other selected copies.
    const handleDeleteDuplicates = () =>
        confirmDeleteDuplicates(selectedDuplicateGroups);

    // Across ALL duplicate groups matching the current filters — keep one
    // entry per group, delete every extra copy in a single bulk request.
    const handleDeleteAllDuplicates = () =>
        confirmDeleteDuplicates(duplicateGroups);

    // ── Auto-refresh every 30 seconds ─────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entry-summary"] });
        }, 30000);

        return () => clearInterval(interval);
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
            render: (v: string, r: JournalEntry) => {
                const dup = showDuplicatesOnly ? duplicateGroupInfo.get(r._id) : undefined;
                return (
                    <Space size={4}>
                        <Text code style={{ fontSize: 12 }}>{v}</Text>
                        {dup && (
                            <>
                                <Tag style={{ fontSize: 10, marginInlineEnd: 0 }}>G{dup.group}</Tag>
                                {dup.keptId === r._id ? (
                                    <Tag color="success" style={{ fontSize: 10, marginInlineEnd: 0 }}>
                                        KEEP
                                    </Tag>
                                ) : (
                                    <Tooltip title={`Kept: ${dup.keptNo}`}>
                                        <Tag color="error" style={{ fontSize: 10, marginInlineEnd: 0 }}>
                                            DELETE
                                        </Tag>
                                    </Tooltip>
                                )}
                            </>
                        )}
                    </Space>
                );
            },
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
            width: 100,
            fixed: "right" as const,
            render: (_: any, record: JournalEntry) => (
                <Space size="small">
                    <Tooltip title="View Details">
                        <Button
                            icon={<EyeOutlined />}
                            size="small"
                            onClick={() => openDetail(record._id)}
                        />
                    </Tooltip>
                    {record.source === "manual" && !record.period_locked && record.status !== "Voided" && (
                        <Tooltip title="Edit">
                            <Button
                                icon={<EditOutlined />}
                                size="small"
                                onClick={() => openEdit(record._id)}
                            />
                        </Tooltip>
                    )}
                </Space>
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
                            title={`Total Entries (${dateRange[0]?.format("DD MMM YY")} – ${dateRange[1]?.format("DD MMM YY")})`}
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

            {/* ── Main Table Card ── */}
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
            >
                {/* ── Status Tabs ── */}
                <Tabs
                    activeKey={activeStatus}
                    onChange={(k) => {
                        setActiveStatus(k as JournalEntryStatus | "ALL");
                        setPage(1);
                    }}
                    style={{ marginBottom: 16 }}
                    items={ALL_STATUSES.map((s) => ({
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
                    }))}
                />

                {/* ── Filters ── */}
                <Space style={{ marginBottom: 16 }} wrap>
                    <FilterOutlined style={{ color: "#8c8c8c" }} />
                    <RangePicker
                        value={dateRange}
                        onChange={(r) => {
                            setDateRange(r as [Dayjs, Dayjs]);
                            setPage(1);
                        }}
                        allowClear={false}
                        format="DD MMM YYYY"
                        presets={[
                            { label: "Today", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
                            { label: "Yesterday", value: [dayjs().subtract(1, "day").startOf("day"), dayjs().subtract(1, "day").endOf("day")] },
                            { label: "This Week", value: [dayjs().startOf("week"), dayjs().endOf("week")] },
                            { label: "Last Week", value: [dayjs().subtract(1, "week").startOf("week"), dayjs().subtract(1, "week").endOf("week")] },
                            { label: "This Month", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
                            { label: "Last Month", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
                            { label: "This Quarter", value: [dayjs().startOf("quarter"), dayjs().endOf("quarter")] },
                            { label: "Last Quarter", value: [dayjs().subtract(1, "quarter").startOf("quarter"), dayjs().subtract(1, "quarter").endOf("quarter")] },
                            { label: "This Year", value: [dayjs().startOf("year"), dayjs().endOf("year")] },
                            { label: "Last Year", value: [dayjs().subtract(1, "year").startOf("year"), dayjs().subtract(1, "year").endOf("year")] },
                            { label: "Last 30 Days", value: [dayjs().subtract(30, "day"), dayjs()] },
                            { label: "Last 90 Days", value: [dayjs().subtract(90, "day"), dayjs()] },
                        ]}
                    />
                    <Select
                        placeholder="Filter by source"
                        options={SOURCE_OPTIONS}
                        value={sourceFilter}
                        onChange={(v) => {
                            setSourceFilter(v);
                            setPage(1);
                        }}
                        allowClear
                        style={{ width: 180 }}
                    />
                    <Input.Search
                        placeholder="Search entry no, description, reference or amount"
                        allowClear
                        value={searchTerm}
                        onSearch={(v) => { setSearchTerm(v); setPage(1); }}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                        }}
                        style={{ width: 220 }}
                    />
                    <Checkbox
                        checked={showDuplicatesOnly}
                        onChange={(e) => setShowDuplicatesOnly(e.target.checked)}
                    >
                        Show duplicates only
                        {duplicateEntries.length > 0 && ` (${duplicateEntries.length})`}
                    </Checkbox>
                    {showDuplicatesOnly && (
                        <Select
                            value={dupFilter}
                            onChange={setDupFilter}
                            options={[
                                { label: "All duplicates", value: "all" },
                                { label: "Keep only", value: "keep" },
                                { label: "Will be deleted", value: "delete" },
                            ]}
                            style={{ width: 160 }}
                        />
                    )}
                    {selectedDuplicateCount > 0 && (
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            loading={deletingDuplicates}
                            onClick={handleDeleteDuplicates}
                        >
                            Delete Selected Duplicates ({selectedDuplicateCount})
                        </Button>
                    )}
                    {allDuplicatesDeleteCount > 0 && (
                        <Button
                            danger
                            type="primary"
                            icon={<DeleteOutlined />}
                            loading={deletingDuplicates}
                            onClick={handleDeleteAllDuplicates}
                        >
                            Delete All Duplicates ({allDuplicatesDeleteCount})
                        </Button>
                    )}
                    {selectedRowKeys.length > 0 && (
                        <Popconfirm
                            title={`Delete ${selectedRowKeys.length} journal entr${selectedRowKeys.length === 1 ? "y" : "ies"}?`}
                            description="This action cannot be undone. Entries in locked periods will be skipped."
                            okText="Delete"
                            okButtonProps={{ danger: true }}
                            onConfirm={handleBulkDelete}
                        >
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                loading={deleting}
                            >
                                Delete Selected ({selectedRowKeys.length})
                            </Button>
                        </Popconfirm>
                    )}
                </Space>

                {!shopId && (
                    <Alert type="warning" message="Shop ID not found." showIcon style={{ marginBottom: 12 }} />
                )}

                <ProTable<JournalEntry>
                    rowKey="_id"
                    actionRef={actionRef}
                    dataSource={displayedEntries}
                    rowSelection={{
                        selectedRowKeys,
                        onChange: (keys) => setSelectedRowKeys(keys),
                    }}
                    tableAlertRender={false}
                    columns={columns}
                    loading={isLoading}
                    search={false}
                    options={{ reload: () => refetch(), fullScreen: true }}
                    pagination={
                        showDuplicatesOnly
                            ? {
                                  pageSize: 50,
                                  showSizeChanger: true,
                                  showTotal: (total) => `${total} duplicate entries`,
                              }
                            : {
                                  current: page,
                                  pageSize: pageSize,
                                  total: totalEntries,
                                  showSizeChanger: true,
                                  showTotal: (total) => `${total} entries`,
                                  onChange: (p, ps) => {
                                      setPage(p);
                                      setPageSize(ps);
                                  },
                              }
                    }
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

            {/* ── Create / Edit Drawer ── */}
            <JournalEntryFormDrawer
                open={formOpen}
                onClose={() => {
                    setFormOpen(false);
                    setEditingEntryId(null);
                }}
                onSuccess={onFormSuccess}
                shopId={shopId}
                entryId={editingEntryId}
            />

            {/* ── Detail / Post / Void / Edit Drawer ── */}
            <JournalEntryDetailDrawer
                open={detailOpen}
                onClose={() => {
                    setDetailOpen(false);
                    setSelectedEntryId(null);
                }}
                entryId={selectedEntryId}
                onSuccess={onFormSuccess}
                onEdit={openEdit}
            />
        </App>
    );
};

export default JournalEntriesPage;