import React, { useState } from "react";
import {
    Drawer,
    Descriptions,
    Table,
    Tag,
    Space,
    Button,
    Typography,
    Divider,
    Modal,
    Input,
    Badge,
    Alert,
    Spin,
    Statistic,
    Row,
    Col,
} from "antd";
import {
    CheckOutlined,
    LinkOutlined,
    StopOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getNoteById,
    approveNote,
    applyNote,
    voidNote,
    Note,
    NoteLine,
    NoteStatus,
} from "@services/accounting/notes";
import dayjs from "dayjs";

const { Text, Title } = Typography;

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<NoteStatus, { badge: "success" | "processing" | "warning" | "error" | "default"; color: string }> = {
    Draft: { badge: "default", color: "default" },
    Approved: { badge: "processing", color: "blue" },
    Applied: { badge: "success", color: "green" },
    Voided: { badge: "error", color: "red" },
};

const VAT_TYPE_COLORS: Record<string, string> = {
    STANDARD: "blue",
    ZERO: "cyan",
    EXEMPT: "orange",
    NONE: "default",
};

interface Props {
    open: boolean;
    onClose: () => void;
    noteId: string | null;
    onSuccess: () => void;
}

const NoteDetailDrawer: React.FC<Props> = ({ open, onClose, noteId, onSuccess }) => {
    const queryClient = useQueryClient();
    const [voidModalOpen, setVoidModalOpen] = useState(false);
    const [voidReason, setVoidReason] = useState("");

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const { data, isLoading } = useQuery({
        queryKey: ["note-detail", noteId],
        queryFn: () => getNoteById(noteId!),
        enabled: open && !!noteId,
    });

    const note: Note | undefined = data?.note;

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        queryClient.invalidateQueries({ queryKey: ["note-detail", noteId] });
        onSuccess();
    };

    // ── Mutations ──────────────────────────────────────────────────────────────

    const approveMutation = useMutation({
        mutationFn: (id: string) => approveNote(id),
        onSuccess: invalidate,
    });

    const applyMutation = useMutation({
        mutationFn: (id: string) => applyNote(id),
        onSuccess: invalidate,
    });

    const voidMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => voidNote(id, reason),
        onSuccess: () => {
            invalidate();
            setVoidModalOpen(false);
            setVoidReason("");
        },
    });

    // ── Derived helpers ────────────────────────────────────────────────────────

    const status = note?.status;
    const statusCfg = status ? STATUS_CONFIG[status] : STATUS_CONFIG.Draft;

    const getUser = (field: any) =>
        typeof field === "object" ? field?.username : field;

    const getJENo = () => {
        if (!note?.journal_entry_id) return null;
        if (typeof note.journal_entry_id === "object") return note.journal_entry_id.entry_no;
        return note.journal_entry_id;
    };

    // ── Line columns ───────────────────────────────────────────────────────────

    const lineColumns = [
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
        },
        {
            title: "Account",
            key: "account",
            width: 200,
            render: (_: any, l: NoteLine) => {
                const acc = typeof l.account_id === "object" ? l.account_id : null;
                return acc ? (
                    <Space size={4}>
                        <Text code style={{ fontSize: 11 }}>{acc.account_code}</Text>
                        <Text style={{ fontSize: 12 }}>{acc.account_name}</Text>
                    </Space>
                ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>{l.account_code} {l.account_name}</Text>
                );
            },
        },
        {
            title: "Qty",
            dataIndex: "quantity",
            key: "quantity",
            width: 65,
            align: "right" as const,
        },
        {
            title: "Unit Price",
            dataIndex: "unit_price",
            key: "unit_price",
            width: 100,
            align: "right" as const,
            render: (v: number) => v.toLocaleString("en-KE", { minimumFractionDigits: 2 }),
        },
        {
            title: "Discount",
            dataIndex: "discount",
            key: "discount",
            width: 80,
            align: "right" as const,
            render: (v: number) => v > 0 ? `${v}%` : "—",
        },
        {
            title: "VAT",
            dataIndex: "vat_type",
            key: "vat_type",
            width: 80,
            render: (v: string) => (
                <Tag color={VAT_TYPE_COLORS[v] || "default"} style={{ fontSize: 10, padding: "0 4px" }}>
                    {v === "STANDARD" ? "16%" : v}
                </Tag>
            ),
        },
        {
            title: "VAT Amt",
            dataIndex: "vat_amount",
            key: "vat_amount",
            width: 90,
            align: "right" as const,
            render: (v: number) =>
                v > 0 ? (
                    <Text style={{ color: "#1890ff", fontSize: 12 }}>
                        {v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                ) : "—",
        },
        {
            title: "Line Total",
            dataIndex: "line_total",
            key: "line_total",
            width: 110,
            align: "right" as const,
            render: (v: number) => (
                <Text strong style={{ fontSize: 12 }}>
                    {(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </Text>
            ),
        },
    ];

    // ── Customer / Supplier display ────────────────────────────────────────────

    const contactDisplay = () => {
        if (note?.direction === "customer" && note.customer_id) {
            const c = note.customer_id;
            if (typeof c === "object") return `${c.customer_name} (${c.phone || c.email || ""})`;
            return c;
        }
        if (note?.direction === "supplier" && note.supplier_id) {
            const s = note.supplier_id;
            if (typeof s === "object") return `${s.name} (${s.phone || s.email || ""})`;
            return s;
        }
        return "—";
    };

    const origInvoice = () => {
        if (!note?.original_invoice_id) return note?.original_invoice_no || "—";
        if (typeof note.original_invoice_id === "object")
            return `${note.original_invoice_id.invoice_no} (${note.original_invoice_id.status})`;
        return note.original_invoice_no || note.original_invoice_id;
    };

    return (
        <>
            <Drawer
                title={
                    <Space>
                        <Text strong>
                            {note?.note_type === "CREDIT_NOTE" ? "Credit Note" : "Debit Note"}
                        </Text>
                        {note && <Text code style={{ fontSize: 13 }}>{note.note_no}</Text>}
                        {status && <Badge status={statusCfg.badge} text={status} />}
                    </Space>
                }
                open={open}
                onClose={onClose}
                width={820}
                destroyOnClose
                extra={
                    note && (
                        <Space>
                            {status === "Draft" && (
                                <Button
                                    type="primary"
                                    icon={<CheckOutlined />}
                                    loading={approveMutation.isPending}
                                    onClick={() => approveMutation.mutate(note._id)}
                                >
                                    Approve
                                </Button>
                            )}
                            {status === "Approved" && (
                                <Button
                                    icon={<LinkOutlined />}
                                    loading={applyMutation.isPending}
                                    onClick={() => applyMutation.mutate(note._id)}
                                >
                                    Apply
                                </Button>
                            )}
                            {(status === "Draft" || status === "Approved") && (
                                <Button
                                    danger
                                    icon={<StopOutlined />}
                                    onClick={() => setVoidModalOpen(true)}
                                >
                                    Void
                                </Button>
                            )}
                        </Space>
                    )
                }
            >
                {isLoading ? (
                    <div style={{ textAlign: "center", padding: 60 }}>
                        <Spin size="large" />
                    </div>
                ) : !note ? (
                    <Alert type="error" message="Note not found" />
                ) : (
                    <>
                        {/* ── Meta ── */}
                        <Descriptions bordered size="small" column={2} style={{ marginBottom: 20 }}>
                            <Descriptions.Item label="Note No.">
                                <Text code>{note.note_no}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Badge status={statusCfg.badge} text={status} />
                            </Descriptions.Item>

                            <Descriptions.Item label="Type">
                                <Tag color={note.note_type === "CREDIT_NOTE" ? "green" : "orange"}>
                                    {note.note_type === "CREDIT_NOTE" ? "Credit Note" : "Debit Note"}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Direction">
                                <Tag color={note.direction === "customer" ? "blue" : "purple"}>
                                    {note.direction.toUpperCase()}
                                </Tag>
                            </Descriptions.Item>

                            <Descriptions.Item label={note.direction === "customer" ? "Customer" : "Supplier"} span={2}>
                                {contactDisplay()}
                            </Descriptions.Item>

                            <Descriptions.Item label="Issue Date">
                                {dayjs(note.issue_date).format("DD MMM YYYY")}
                            </Descriptions.Item>
                            <Descriptions.Item label="Expiry Date">
                                {note.expiry_date ? dayjs(note.expiry_date).format("DD MMM YYYY") : "—"}
                            </Descriptions.Item>

                            <Descriptions.Item label="Original Invoice" span={2}>
                                {origInvoice()}
                            </Descriptions.Item>

                            <Descriptions.Item label="Reason" span={2}>
                                {note.reason}
                            </Descriptions.Item>

                            {note.notes && (
                                <Descriptions.Item label="Notes" span={2}>{note.notes}</Descriptions.Item>
                            )}

                            <Descriptions.Item label="VAT Mode">
                                {note.vat_pricing_mode || "EXCLUSIVE"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Created By">
                                {getUser(note.created_by) || "—"}
                            </Descriptions.Item>

                            {status === "Approved" && note.approved_at && (
                                <>
                                    <Descriptions.Item label="Approved At">
                                        {dayjs(note.approved_at).format("DD MMM YYYY HH:mm")}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Approved By">
                                        {getUser(note.approved_by) || "—"}
                                    </Descriptions.Item>
                                </>
                            )}

                            {status === "Applied" && note.applied_at && (
                                <Descriptions.Item label="Applied At" span={2}>
                                    {dayjs(note.applied_at).format("DD MMM YYYY HH:mm")}
                                </Descriptions.Item>
                            )}

                            {status === "Voided" && note.voided_at && (
                                <>
                                    <Descriptions.Item label="Voided At">
                                        {dayjs(note.voided_at).format("DD MMM YYYY HH:mm")}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Voided By">
                                        {getUser(note.voided_by) || "—"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Void Reason" span={2}>
                                        <Text type="danger">{note.void_reason}</Text>
                                    </Descriptions.Item>
                                </>
                            )}

                            {getJENo() && (
                                <Descriptions.Item label="Journal Entry" span={2}>
                                    <Text code>{getJENo()}</Text>
                                </Descriptions.Item>
                            )}
                        </Descriptions>

                        {/* ── Lines ── */}
                        <Divider orientation="left" plain>
                            <Text type="secondary" style={{ fontSize: 12 }}>Line Items</Text>
                        </Divider>

                        <Table
                            rowKey={(r, i) => r._id || String(i)}
                            columns={lineColumns}
                            dataSource={note.lines}
                            pagination={false}
                            size="small"
                            scroll={{ x: 800 }}
                        />

                        {/* ── Totals ── */}
                        <Row gutter={16} justify="end" style={{ marginTop: 16 }}>
                            <Col>
                                <Space direction="vertical" size={4} style={{ textAlign: "right" }}>
                                    <Space>
                                        <Text type="secondary">Subtotal:</Text>
                                        <Text>KES {(note.subtotal || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>
                                    </Space>
                                    {(note.total_discount || 0) > 0 && (
                                        <Space>
                                            <Text type="secondary">Discount:</Text>
                                            <Text type="warning">
                                                -KES {note.total_discount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                            </Text>
                                        </Space>
                                    )}
                                    {(note.total_vat || 0) > 0 && (
                                        <Space>
                                            <Text type="secondary">VAT:</Text>
                                            <Text style={{ color: "#1890ff" }}>
                                                KES {note.total_vat.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                            </Text>
                                        </Space>
                                    )}
                                    <Divider style={{ margin: "4px 0" }} />
                                    <Space>
                                        <Text strong>Grand Total:</Text>
                                        <Text strong style={{ fontSize: 16, color: "#1d39c4" }}>
                                            KES {(note.grand_total || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                        </Text>
                                    </Space>
                                </Space>
                            </Col>
                        </Row>
                    </>
                )}
            </Drawer>

            {/* ── Void Modal ── */}
            <Modal
                title="Void Note"
                open={voidModalOpen}
                onCancel={() => { setVoidModalOpen(false); setVoidReason(""); }}
                onOk={() => noteId && voidMutation.mutate({ id: noteId, reason: voidReason })}
                okText="Void Note"
                okButtonProps={{
                    danger: true,
                    disabled: !voidReason.trim(),
                    loading: voidMutation.isPending,
                }}
            >
                <Alert
                    type="warning"
                    showIcon
                    message={
                        note?.status === "Approved"
                            ? "This note has been approved — voiding will automatically create a reversal journal entry."
                            : "This will void the draft note permanently."
                    }
                    style={{ marginBottom: 16 }}
                />
                <Text>Void Reason <Text type="danger">*</Text></Text>
                <Input.TextArea
                    rows={3}
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Explain why this note is being voided…"
                    style={{ marginTop: 8 }}
                    maxLength={300}
                    showCount
                />
            </Modal>
        </>
    );
};

export default NoteDetailDrawer;