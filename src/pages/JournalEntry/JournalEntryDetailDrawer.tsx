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
} from "antd";
import {
    CheckCircleOutlined,
    StopOutlined,
    SwapOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getJournalEntryById,
    postJournalEntry,
    voidJournalEntry,
    JournalEntry,
    JournalLine,
} from "@services/accounting/journals";
import dayjs from "dayjs";

const { Text, Title } = Typography;

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; badge: "success" | "processing" | "error" | "default" }> = {
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

const TYPE_COLORS: Record<string, string> = {
    ASSET: "blue", LIABILITY: "red", EQUITY: "purple", REVENUE: "green", EXPENSE: "orange",
};

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onClose: () => void;
    entryId: string | null;
    onSuccess: () => void;
}

const JournalEntryDetailDrawer: React.FC<Props> = ({ open, onClose, entryId, onSuccess }) => {
    const queryClient = useQueryClient();
    const [voidModalOpen, setVoidModalOpen] = useState(false);
    const [voidReason, setVoidReason] = useState("");

    // ── Fetch entry ────────────────────────────────────────────────────────────

    const { data, isLoading } = useQuery({
        queryKey: ["journal-entry", entryId],
        queryFn: () => getJournalEntryById(entryId!),
        enabled: open && !!entryId,
    });

    const entry: JournalEntry | undefined = data?.entry;

    // ── Mutations ──────────────────────────────────────────────────────────────

    const postMutation = useMutation({
        mutationFn: (id: string) => postJournalEntry(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entry", entryId] });
            onSuccess();
        },
    });

    const voidMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            voidJournalEntry(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
            queryClient.invalidateQueries({ queryKey: ["journal-entry", entryId] });
            setVoidModalOpen(false);
            setVoidReason("");
            onSuccess();
        },
    });

    const handleVoidConfirm = () => {
        if (!voidReason.trim() || !entryId) return;
        voidMutation.mutate({ id: entryId, reason: voidReason });
    };

    // ── Line columns ───────────────────────────────────────────────────────────

    const lineColumns = [
        {
            title: "Account",
            key: "account",
            render: (_: any, line: JournalLine) => {
                const acc = typeof line.account_id === "object" ? line.account_id : null;
                return (
                    <Space size={4}>
                        {acc ? (
                            <>
                                <Text code style={{ fontSize: 11 }}>{acc.account_code}</Text>
                                <Text style={{ fontSize: 13 }}>{acc.account_name}</Text>
                                <Tag
                                    color={TYPE_COLORS[acc.account_type]}
                                    style={{ fontSize: 10, padding: "0 4px", lineHeight: "16px" }}
                                >
                                    {acc.account_type}
                                </Tag>
                            </>
                        ) : (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {line.account_code} — {line.account_name}
                            </Text>
                        )}
                    </Space>
                );
            },
        },
        {
            title: "Memo",
            dataIndex: "description",
            key: "description",
            width: 160,
            render: (v: string) =>
                v ? <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> : "—",
        },
        {
            title: "Debit",
            dataIndex: "debit",
            key: "debit",
            width: 130,
            align: "right" as const,
            render: (v: number) =>
                v > 0 ? (
                    <Text strong style={{ color: "#cf1322" }}>
                        {v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
        {
            title: "Credit",
            dataIndex: "credit",
            key: "credit",
            width: 130,
            align: "right" as const,
            render: (v: number) =>
                v > 0 ? (
                    <Text strong style={{ color: "#389e0d" }}>
                        {v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
    ];

    const lines = entry?.lines || [];
    const status = entry?.status;
    const statusCfg = status ? STATUS_CONFIG[status] : STATUS_CONFIG.Draft;

    const postedBy = typeof entry?.posted_by === "object"
        ? entry.posted_by?.username
        : entry?.posted_by;

    const voidedBy = typeof entry?.voided_by === "object"
        ? entry.voided_by?.username
        : entry?.voided_by;

    const createdBy = typeof entry?.created_by === "object"
        ? entry.created_by?.username
        : entry?.created_by;

    return (
        <>
            <Drawer
                title={
                    <Space>
                        <SwapOutlined />
                        <Text strong>Journal Entry</Text>
                        {entry && (
                            <Text code style={{ fontSize: 13 }}>{entry.entry_no}</Text>
                        )}
                        {status && (
                            <Badge status={statusCfg.badge} text={status} />
                        )}
                    </Space>
                }
                open={open}
                onClose={onClose}
                width={720}
                destroyOnClose
                extra={
                    entry && (
                        <Space>
                            {status === "Draft" && (
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    loading={postMutation.isPending}
                                    onClick={() => postMutation.mutate(entry._id)}
                                >
                                    Post Entry
                                </Button>
                            )}
                            {status === "Posted" && (
                                <Button
                                    danger
                                    icon={<StopOutlined />}
                                    onClick={() => setVoidModalOpen(true)}
                                >
                                    Void Entry
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
                ) : !entry ? (
                    <Alert type="error" message="Entry not found" />
                ) : (
                    <>
                        {/* ── Meta ── */}
                        <Descriptions bordered size="small" column={2} style={{ marginBottom: 20 }}>
                            <Descriptions.Item label="Entry No.">
                                <Text code>{entry.entry_no}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Badge status={statusCfg.badge} text={status} />
                            </Descriptions.Item>

                            <Descriptions.Item label="Date">
                                {dayjs(entry.entry_date).format("DD MMM YYYY")}
                            </Descriptions.Item>
                            <Descriptions.Item label="Source">
                                <Tag color={SOURCE_COLORS[entry.source]} style={{ fontSize: 11 }}>
                                    {entry.source?.replace(/_/g, " ").toUpperCase()}
                                </Tag>
                            </Descriptions.Item>

                            <Descriptions.Item label="Description" span={2}>
                                {entry.description}
                            </Descriptions.Item>

                            {entry.reference && (
                                <Descriptions.Item label="Reference" span={2}>
                                    {entry.reference}
                                </Descriptions.Item>
                            )}

                            <Descriptions.Item label="Fiscal Period">
                                {entry.fiscal_year} / {String(entry.fiscal_month).padStart(2, "0")}
                            </Descriptions.Item>
                            <Descriptions.Item label="Created By">
                                {createdBy || "—"}
                            </Descriptions.Item>

                            {status === "Posted" && entry.posted_at && (
                                <>
                                    <Descriptions.Item label="Posted At">
                                        {dayjs(entry.posted_at).format("DD MMM YYYY HH:mm")}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Posted By">
                                        {postedBy || "—"}
                                    </Descriptions.Item>
                                </>
                            )}

                            {status === "Voided" && entry.voided_at && (
                                <>
                                    <Descriptions.Item label="Voided At">
                                        {dayjs(entry.voided_at).format("DD MMM YYYY HH:mm")}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Voided By">
                                        {voidedBy || "—"}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Void Reason" span={2}>
                                        <Text type="danger">{entry.voided_reason}</Text>
                                    </Descriptions.Item>
                                </>
                            )}

                            {entry.source_type && entry.source_id && (
                                <Descriptions.Item label="Source Document" span={2}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {entry.source_type} / {entry.source_id}
                                    </Text>
                                </Descriptions.Item>
                            )}
                        </Descriptions>

                        {/* ── Lines ── */}
                        <Divider orientation="left" plain>
                            <Text type="secondary" style={{ fontSize: 12 }}>Journal Lines</Text>
                        </Divider>

                        <Table
                            rowKey={(r, i) => `${r._id || i}`}
                            columns={lineColumns}
                            dataSource={lines}
                            pagination={false}
                            size="small"
                            scroll={{ x: 600 }}
                            summary={() => (
                                <Table.Summary fixed>
                                    <Table.Summary.Row style={{ background: "#fafafa" }}>
                                        <Table.Summary.Cell index={0} colSpan={2}>
                                            <Text strong>Total</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={2} align="right">
                                            <Text strong style={{ color: "#cf1322" }}>
                                                {(entry.total_debit || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                            </Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={3} align="right">
                                            <Text strong style={{ color: "#389e0d" }}>
                                                {(entry.total_credit || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                            </Text>
                                        </Table.Summary.Cell>
                                    </Table.Summary.Row>
                                </Table.Summary>
                            )}
                        />

                        {/* Balance check */}
                        {Math.abs((entry.total_debit || 0) - (entry.total_credit || 0)) < 0.001 ? (
                            <Alert
                                type="success"
                                showIcon
                                message="Balanced"
                                style={{ marginTop: 12, padding: "4px 12px" }}
                            />
                        ) : (
                            <Alert
                                type="error"
                                showIcon
                                message="Entry is unbalanced — contact support"
                                style={{ marginTop: 12, padding: "4px 12px" }}
                            />
                        )}
                    </>
                )}
            </Drawer>

            {/* ── Void Modal ── */}
            <Modal
                title="Void Journal Entry"
                open={voidModalOpen}
                onCancel={() => { setVoidModalOpen(false); setVoidReason(""); }}
                onOk={handleVoidConfirm}
                okText="Void Entry"
                okButtonProps={{
                    danger: true,
                    disabled: !voidReason.trim(),
                    loading: voidMutation.isPending,
                }}
            >
                <Alert
                    type="warning"
                    showIcon
                    message="This will create a reversal entry and mark this entry as Voided."
                    style={{ marginBottom: 16 }}
                />
                <Text>Void Reason <Text type="danger">*</Text></Text>
                <Input.TextArea
                    rows={3}
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Explain why this entry is being voided…"
                    style={{ marginTop: 8 }}
                    maxLength={300}
                    showCount
                />
            </Modal>
        </>
    );
};

export default JournalEntryDetailDrawer;