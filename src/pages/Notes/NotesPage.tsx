import React, { useRef, useState, useCallback } from "react";
import { ProTable, ProCard, ActionType } from "@ant-design/pro-components";
import {
    Button,
    Space,
    Tag,
    Typography,
    Badge,
    Tooltip,
    Popconfirm,
    DatePicker,
    Select,
    Alert,
    App,
    Statistic,
    Row,
    Col,
} from "antd";
import {
    PlusOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    FilterOutlined,
    FileProtectOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getAllNotes,
    deleteNote,
    Note,
    NoteType,
    NoteStatus,
    NoteDirection,
} from "@services/accounting/notes";
import { usePrimaryColor } from "@context/PrimaryColorContext";
import NoteFormDrawer from "./NoteFormDrawer";
import NoteDetailDrawer from "./NoteDetailDrawer";
import dayjs, { Dayjs } from "dayjs";

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Shop ID — same pattern used across the whole app ─────────────────────────
const getShopId = (): string =>
    localStorage.getItem("shopId") || "";

const STATUS_CONFIG: Record<NoteStatus, { badge: "success" | "processing" | "warning" | "error" | "default"; color: string }> = {
    Draft: { badge: "default", color: "default" },
    Approved: { badge: "processing", color: "blue" },
    Applied: { badge: "success", color: "green" },
    Voided: { badge: "error", color: "red" },
};

const ALL_STATUSES: (NoteStatus | "ALL")[] = ["ALL", "Draft", "Approved", "Applied", "Voided"];
const ALL_TYPES: (NoteType | "ALL")[] = ["ALL", "CREDIT_NOTE", "DEBIT_NOTE"];

const NotesPage: React.FC = () => {
    const shopId = getShopId();
    const primaryColor = usePrimaryColor();
    const queryClient = useQueryClient();
    const actionRef = useRef<ActionType>();

    const [activeType, setActiveType] = useState<NoteType | "ALL">("ALL");
    const [activeStatus, setActiveStatus] = useState<NoteStatus | "ALL">("ALL");
    const [direction, setDirection] = useState<NoteDirection | undefined>();
    const [formOpen, setFormOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
        dayjs().startOf("month"),
        dayjs().endOf("month"),
    ]);

    const from = dateRange[0]?.startOf("day").toISOString();
    const to = dateRange[1]?.endOf("day").toISOString();

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["notes", shopId, activeType, activeStatus, direction, page, pageSize, from, to],
        queryFn: () =>
            getAllNotes({
                shop_id: shopId,
                note_type: activeType === "ALL" ? undefined : activeType,
                status: activeStatus === "ALL" ? undefined : activeStatus,
                direction,
                from,
                to,
                page,
                limit: pageSize,
            }),
        enabled: !!shopId,
    });

    const notes: Note[] = data?.notes || [];
    const totalNotes = data?.totalNotes || 0;

    // ── Mutations ─────────────────────────────────────────────────────────────
    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteNote(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
    });

    // ── Handlers ──────────────────────────────────────────────────────────────
    const openCreate = () => { setEditingNote(null); setFormOpen(true); };
    const openEdit = (note: Note) => { setEditingNote(note); setFormOpen(true); };
    const openDetail = (id: string) => { setSelectedNoteId(id); setDetailOpen(true); };
    const onSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["notes"] });
    }, [queryClient]);

    // ── Summary ───────────────────────────────────────────────────────────────
    const creditCount = notes.filter((n) => n.note_type === "CREDIT_NOTE").length;
    const debitCount = notes.filter((n) => n.note_type === "DEBIT_NOTE").length;
    const draftCount = notes.filter((n) => n.status === "Draft").length;
    const approvedCount = notes.filter((n) => n.status === "Approved").length;
    const totalCreditAmt = notes
        .filter((n) => n.note_type === "CREDIT_NOTE" && n.status !== "Voided")
        .reduce((s, n) => s + (n.grand_total || 0), 0);
    const totalDebitAmt = notes
        .filter((n) => n.note_type === "DEBIT_NOTE" && n.status !== "Voided")
        .reduce((s, n) => s + (n.grand_total || 0), 0);

    // ── Columns ───────────────────────────────────────────────────────────────
    const columns = [
        {
            title: "Note No.",
            dataIndex: "note_no",
            key: "note_no",
            width: 150,
            render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
        },
        {
            title: "Type",
            key: "note_type",
            width: 120,
            hideInTable: activeType !== "ALL",
            render: (_: any, r: Note) => (
                <Tag color={r.note_type === "CREDIT_NOTE" ? "green" : "orange"}>
                    {r.note_type === "CREDIT_NOTE" ? "Credit Note" : "Debit Note"}
                </Tag>
            ),
        },
        {
            title: "Direction",
            key: "direction",
            width: 100,
            render: (_: any, r: Note) => (
                <Tag color={r.direction === "customer" ? "blue" : "purple"}>
                    {r.direction.toUpperCase()}
                </Tag>
            ),
        },
        {
            title: "Contact",
            key: "contact",
            render: (_: any, r: Note) => {
                if (r.direction === "customer" && r.customer_id) {
                    const c = r.customer_id as any;
                    return <Text style={{ fontSize: 12 }}>{c?.customer_name || c}</Text>;
                }
                if (r.direction === "supplier" && r.supplier_id) {
                    const s = r.supplier_id as any;
                    return <Text style={{ fontSize: 12 }}>{s?.name || s?.supplier_name || s}</Text>;
                }
                return <Text type="secondary">—</Text>;
            },
        },
        {
            title: "Invoice Ref",
            dataIndex: "original_invoice_no",
            key: "original_invoice_no",
            width: 130,
            render: (v: string) => v
                ? <Text code style={{ fontSize: 11 }}>{v}</Text>
                : <Text type="secondary">—</Text>,
        },
        {
            title: "Issue Date",
            dataIndex: "issue_date",
            key: "issue_date",
            width: 110,
            render: (d: string) => dayjs(d).format("DD MMM YYYY"),
        },
        {
            title: "Reason",
            dataIndex: "reason",
            key: "reason",
            ellipsis: true,
        },
        {
            title: "Grand Total",
            dataIndex: "grand_total",
            key: "grand_total",
            width: 130,
            align: "right" as const,
            render: (v: number, r: Note) => (
                <Text strong style={{
                    color: r.note_type === "CREDIT_NOTE" ? "#389e0d" : "#cf1322",
                    fontSize: 13,
                }}>
                    {(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </Text>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 110,
            render: (s: NoteStatus) => {
                const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.Draft;
                return <Badge status={cfg.badge} text={s} />;
            },
        },
        {
            title: "Actions",
            key: "actions",
            width: 110,
            fixed: "right" as const,
            render: (_: any, record: Note) => (
                <Space size={4}>
                    <Tooltip title="View Details">
                        <Button icon={<EyeOutlined />} size="small"
                            onClick={() => openDetail(record._id)} />
                    </Tooltip>
                    {record.status === "Draft" && (
                        <Tooltip title="Edit">
                            <Button icon={<EditOutlined />} size="small"
                                onClick={() => openEdit(record)} />
                        </Tooltip>
                    )}
                    {record.status === "Draft" && (
                        <Tooltip title="Delete">
                            <Popconfirm
                                title="Delete this draft note?"
                                onConfirm={() => deleteMutation.mutate(record._id)}
                                okText="Delete"
                                okButtonProps={{ danger: true }}
                            >
                                <Button icon={<DeleteOutlined />} size="small" danger />
                            </Popconfirm>
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
                            title="Credit Notes"
                            value={creditCount}
                            valueStyle={{ color: "#389e0d", fontSize: 22 }}
                            suffix={
                                <Text style={{ fontSize: 12, color: "#8c8c8c" }}>
                                    KES {totalCreditAmt.toLocaleString("en-KE", { maximumFractionDigits: 0 })}
                                </Text>
                            }
                        />
                    </ProCard>
                </Col>
                <Col span={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Debit Notes"
                            value={debitCount}
                            valueStyle={{ color: "#cf1322", fontSize: 22 }}
                            suffix={
                                <Text style={{ fontSize: 12, color: "#8c8c8c" }}>
                                    KES {totalDebitAmt.toLocaleString("en-KE", { maximumFractionDigits: 0 })}
                                </Text>
                            }
                        />
                    </ProCard>
                </Col>
                <Col span={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Draft (Pending)"
                            value={draftCount}
                            valueStyle={{ color: draftCount > 0 ? "#faad14" : "#8c8c8c", fontSize: 22 }}
                        />
                    </ProCard>
                </Col>
                <Col span={6}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Approved"
                            value={approvedCount}
                            valueStyle={{ color: approvedCount > 0 ? "#1890ff" : "#8c8c8c", fontSize: 22 }}
                        />
                    </ProCard>
                </Col>
            </Row>

            {/* ── Main Table ── */}
            <ProCard
                title={
                    <Space>
                        <FileProtectOutlined style={{ fontSize: 18, color: primaryColor }} />
                        <Typography.Title level={4} style={{ margin: 0 }}>
                            Debit &amp; Credit Notes
                        </Typography.Title>
                    </Space>
                }
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={openCreate}
                        style={{ background: primaryColor, borderColor: primaryColor }}
                    >
                        New Note
                    </Button>
                }
                bordered
            >
                {/* ── Type tabs ── */}
                <div style={{ marginBottom: 12, borderBottom: "1px solid #f0f0f0", paddingBottom: 8 }}>
                    <Space size={0}>
                        {ALL_TYPES.map((t) => (
                            <Button
                                key={t}
                                type={activeType === t ? "primary" : "text"}
                                onClick={() => { setActiveType(t as NoteType | "ALL"); setPage(1); }}
                                style={
                                    activeType === t
                                        ? { background: primaryColor, borderColor: primaryColor, borderRadius: 0 }
                                        : { borderRadius: 0 }
                                }
                            >
                                {t === "ALL" ? "All" : t === "CREDIT_NOTE" ? "Credit Notes" : "Debit Notes"}
                            </Button>
                        ))}
                    </Space>
                </div>

                {/* ── Status filter buttons ── */}
                <div style={{ marginBottom: 12 }}>
                    <Space size={8}>
                        {ALL_STATUSES.map((s) => (
                            <Button
                                key={s}
                                size="small"
                                type={activeStatus === s ? "primary" : "default"}
                                onClick={() => { setActiveStatus(s as NoteStatus | "ALL"); setPage(1); }}
                                style={activeStatus === s ? { background: primaryColor, borderColor: primaryColor } : {}}
                            >
                                {s === "ALL" ? "All Statuses" : s}
                            </Button>
                        ))}
                    </Space>
                </div>

                {/* ── Date + Direction filters ── */}
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
                        ]}
                    />
                    <Select
                        placeholder="Direction"
                        value={direction}
                        onChange={(v) => { setDirection(v); setPage(1); }}
                        allowClear
                        style={{ width: 130 }}
                        options={[
                            { label: "Customer", value: "customer" },
                            { label: "Supplier", value: "supplier" },
                        ]}
                    />
                </Space>

                {!shopId && (
                    <Alert
                        type="warning"
                        message="Shop not selected. Please select a shop to view notes."
                        showIcon
                        style={{ marginBottom: 12 }}
                    />
                )}

                <ProTable<Note>
                    rowKey="_id"
                    actionRef={actionRef}
                    dataSource={notes}
                    columns={columns}
                    loading={isLoading}
                    search={false}
                    options={{ reload: () => refetch(), fullScreen: true }}
                    pagination={{
                        current: page,
                        pageSize,
                        total: totalNotes,
                        showSizeChanger: true,
                        showTotal: (t) => `${t} notes`,
                        onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                    }}
                    scroll={{ x: 1100 }}
                    size="small"
                    cardBordered={false}
                    rowClassName={(r) => r.status === "Voided" ? "opacity-50" : ""}
                    columnsState={{
                        persistenceKey: "notes-table-columns",
                        persistenceType: "localStorage",
                    }}
                />
            </ProCard>

            {/* ── Create / Edit Drawer ── */}
            <NoteFormDrawer
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSuccess={onSuccess}
                editingNote={editingNote}
                shopId={shopId}
            />

            {/* ── Detail Drawer ── */}
            <NoteDetailDrawer
                open={detailOpen}
                onClose={() => { setDetailOpen(false); setSelectedNoteId(null); }}
                noteId={selectedNoteId}
                onSuccess={onSuccess}
            />
        </App>
    );
};

export default NotesPage;