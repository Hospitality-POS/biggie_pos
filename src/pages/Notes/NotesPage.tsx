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
    Tabs,
    message,
} from "antd";
import {
    PlusOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    FilterOutlined,
    FileProtectOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getAllNotes,
    deleteNote,
    applyNote,
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

const getShopId = (): string => localStorage.getItem("shopId") || "";

// Updated status config - no more "Approved" state
const STATUS_CONFIG: Record<NoteStatus, { badge: "success" | "processing" | "warning" | "error" | "default"; color: string }> = {
    Draft: { badge: "warning", color: "orange" },
    Applied: { badge: "success", color: "green" },
    Voided: { badge: "error", color: "red" },
};

const ALL_STATUSES: (NoteStatus | "ALL")[] = ["ALL", "Draft", "Applied", "Voided"];

// ── Shared table for a given note type ───────────────────────────────────────
interface NoteTableProps {
    noteType: NoteType;
    shopId: string;
    primaryColor: string;
    onOpenCreate: (type: NoteType) => void;
    onOpenEdit: (note: Note) => void;
    onOpenDetail: (id: string) => void;
    onDelete: (id: string) => void;
    onApply: (id: string) => void;
}

const NoteTable: React.FC<NoteTableProps> = ({
    noteType, shopId, primaryColor,
    onOpenCreate, onOpenEdit, onOpenDetail, onDelete, onApply,
}) => {
    const actionRef = useRef<ActionType>();
    const [activeStatus, setActiveStatus] = useState<NoteStatus | "ALL">("ALL");
    const [direction, setDirection] = useState<NoteDirection | undefined>();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
        dayjs().startOf("month"),
        dayjs().endOf("month"),
    ]);

    const from = dateRange[0]?.startOf("day").toISOString();
    const to = dateRange[1]?.endOf("day").toISOString();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["notes", shopId, noteType, activeStatus, direction, page, pageSize, from, to],
        queryFn: () =>
            getAllNotes({
                shop_id: shopId,
                note_type: noteType,
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

    const totalAmt = notes
        .filter((n) => n.status !== "Voided")
        .reduce((s, n) => s + (n.grand_total || 0), 0);
    const draftCount = notes.filter((n) => n.status === "Draft").length;
    const appliedCount = notes.filter((n) => n.status === "Applied").length;

    const isCredit = noteType === "CREDIT_NOTE";
    const amtColor = isCredit ? "#389e0d" : "#cf1322";
    const label = isCredit ? "Credit Notes" : "Debit Notes";

    const columns = [
        {
            title: "Note No.",
            dataIndex: "note_no",
            key: "note_no",
            width: 150,
            render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
        },
        {
            title: "Direction",
            key: "direction",
            width: 100,
            render: (_: any, r: Note) => (
                <Tag color={r.direction === "customer" ? "blue" : "purple"}>
                    {r.direction === "customer" ? "CUSTOMER" : "SUPPLIER"}
                </Tag>
            ),
        },
        {
            title: "Contact",
            key: "contact",
            render: (_: any, r: Note) => {
                if (r.direction === "customer" && r.customer_id) {
                    const c = r.customer_id as any;
                    return <Text style={{ fontSize: 12 }}>{c?.customer_name || c?.name || c}</Text>;
                }
                if (r.direction === "supplier" && r.supplier_id) {
                    const s = r.supplier_id as any;
                    return <Text style={{ fontSize: 12 }}>{s?.supplier_name || s?.name || s}</Text>;
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
            render: (v: number) => (
                <Text strong style={{ color: amtColor, fontSize: 13 }}>
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
                if (s === "Draft") {
                    return <Badge status="warning" text="Draft" />;
                }
                if (s === "Applied") {
                    return <Badge status="success" text="Applied" />;
                }
                return <Badge status="error" text="Voided" />;
            },
        },
        {
            title: "Actions",
            key: "actions",
            width: 150,
            fixed: "right" as const,
            render: (_: any, record: Note) => (
                <Space size={4}>
                    <Tooltip title="View Details">
                        <Button icon={<EyeOutlined />} size="small"
                            onClick={() => onOpenDetail(record._id)} />
                    </Tooltip>
                    {record.status === "Draft" && (
                        <Tooltip title="Edit">
                            <Button icon={<EditOutlined />} size="small"
                                onClick={() => onOpenEdit(record)} />
                        </Tooltip>
                    )}
                    {record.status === "Draft" && (
                        <Tooltip title="Apply Note">
                            <Button
                                icon={<CheckCircleOutlined />}
                                size="small"
                                type="primary"
                                ghost
                                onClick={() => onApply(record._id)}
                                style={{ borderColor: primaryColor, color: primaryColor }}
                            />
                        </Tooltip>
                    )}
                    {record.status === "Draft" && (
                        <Tooltip title="Delete">
                            <Popconfirm
                                title="Delete this draft note?"
                                onConfirm={() => onDelete(record._id)}
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

    return (
        <>
            {/* ── Summary row ── */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <ProCard bordered size="small">
                        <Statistic
                            title={label}
                            value={notes.length}
                            valueStyle={{ color: amtColor, fontSize: 22 }}
                            suffix={
                                <Text style={{ fontSize: 12, color: "#8c8c8c" }}>
                                    KES {totalAmt.toLocaleString("en-KE", { maximumFractionDigits: 0 })}
                                </Text>
                            }
                        />
                    </ProCard>
                </Col>
                <Col span={8}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Draft (Pending)"
                            value={draftCount}
                            valueStyle={{ color: draftCount > 0 ? "#faad14" : "#8c8c8c", fontSize: 22 }}
                        />
                    </ProCard>
                </Col>
                <Col span={8}>
                    <ProCard bordered size="small">
                        <Statistic
                            title="Applied"
                            value={appliedCount}
                            valueStyle={{ color: appliedCount > 0 ? "#52c41a" : "#8c8c8c", fontSize: 22 }}
                        />
                    </ProCard>
                </Col>
            </Row>

            {/* ── Status filter ── */}
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
                scroll={{ x: 1000 }}
                size="small"
                cardBordered={false}
                rowClassName={(r) => r.status === "Voided" ? "opacity-50" : ""}
                columnsState={{
                    persistenceKey: `notes-table-${noteType}`,
                    persistenceType: "localStorage",
                }}
                toolbar={{
                    actions: [
                        <Button
                            key="create"
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => onOpenCreate(noteType)}
                            style={{ background: primaryColor, borderColor: primaryColor }}
                        >
                            New {isCredit ? "Credit" : "Debit"} Note
                        </Button>,
                    ],
                }}
            />
        </>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const NotesPage: React.FC = () => {
    const shopId = getShopId();
    const primaryColor = usePrimaryColor();
    const queryClient = useQueryClient();
    const { message } = App.useApp();
    const [activeTab, setActiveTab] = useState<NoteType>("CREDIT_NOTE");

    const [formOpen, setFormOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [formNoteType, setFormNoteType] = useState<NoteType>("CREDIT_NOTE");
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteNote(id),
        onSuccess: () => {
            message.success("Note deleted successfully");
            queryClient.invalidateQueries({ queryKey: ["notes"] });
        },
        onError: (error: any) => {
            message.error(error?.response?.data?.message || "Failed to delete note");
        },
    });

    const applyMutation = useMutation({
        mutationFn: (id: string) => applyNote(id),
        onSuccess: (data) => {
            message.success("Note applied successfully");
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            // Also invalidate invoice queries since invoice was updated
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
        },
        onError: (error: any) => {
            message.error(error?.response?.data?.message || "Failed to apply note");
        },
    });

    const openCreate = (type: NoteType) => {
        setFormNoteType(type);
        setEditingNote(null);
        setFormOpen(true);
    };

    const openEdit = (note: Note) => {
        setFormNoteType(note.note_type);
        setEditingNote(note);
        setFormOpen(true);
    };

    const openDetail = (id: string) => {
        setSelectedNoteId(id);
        setDetailOpen(true);
    };

    const handleApply = (id: string) => {
        applyMutation.mutate(id);
    };

    const onSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
    }, [queryClient]);

    const sharedTableProps = {
        shopId,
        primaryColor,
        onOpenCreate: openCreate,
        onOpenEdit: openEdit,
        onOpenDetail: openDetail,
        onDelete: (id: string) => deleteMutation.mutate(id),
        onApply: handleApply,
    };

    return (
        <>
            {!shopId && (
                <Alert
                    type="warning"
                    message="Shop not selected. Please select a shop to view notes."
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            <ProCard
                title={
                    <Space>
                        <FileProtectOutlined style={{ fontSize: 18, color: primaryColor }} />
                        <Typography.Title level={4} style={{ margin: 0 }}>
                            Debit &amp; Credit Notes
                        </Typography.Title>
                    </Space>
                }
                bordered
            >
                <Tabs
                    activeKey={activeTab}
                    onChange={(k) => setActiveTab(k as NoteType)}
                    items={[
                        {
                            key: "CREDIT_NOTE",
                            label: <Tag color="green" style={{ fontSize: 13, padding: "2px 10px" }}>Credit Notes</Tag>,
                            children: (
                                <NoteTable
                                    noteType="CREDIT_NOTE"
                                    {...sharedTableProps}
                                />
                            ),
                        },
                        {
                            key: "DEBIT_NOTE",
                            label: <Tag color="orange" style={{ fontSize: 13, padding: "2px 10px" }}>Debit Notes</Tag>,
                            children: (
                                <NoteTable
                                    noteType="DEBIT_NOTE"
                                    {...sharedTableProps}
                                />
                            ),
                        },
                    ]}
                />
            </ProCard>

            <NoteFormDrawer
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSuccess={onSuccess}
                editingNote={editingNote}
                shopId={shopId}
                noteType={formNoteType}
            />

            <NoteDetailDrawer
                open={detailOpen}
                onClose={() => { setDetailOpen(false); setSelectedNoteId(null); }}
                noteId={selectedNoteId}
                onSuccess={onSuccess}
            />
        </>
    );
};

export default NotesPage;