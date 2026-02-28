import React, { useState, useCallback } from "react";
import {
    Button,
    Space,
    Table,
    Tag,
    Typography,
    Badge,
    Alert,
    Statistic,
    Row,
    Col,
    Select,
    Tooltip,
    Popconfirm,
    Modal,
    Input,
    Divider,
    Spin,
    Card,
    Progress,
} from "antd";
import {
    LinkOutlined,
    DisconnectOutlined,
    MinusCircleOutlined,
    ThunderboltOutlined,
    CheckCircleOutlined,
    StopOutlined,
    PlusOutlined,
    ArrowLeftOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getReconciliationById,
    matchLine,
    unmatchLine,
    excludeLine,
    autoMatch,
    completeReconciliation,
    voidReconciliation,
    BankReconciliation,
    StatementLine,
    UnreconciledJELine,
} from "@services/accounting/reconciliation";
import OpenReconciliationDrawer from "./OpenReconciliationDrawer";
import dayjs from "dayjs";

const { Text, Title } = Typography;

// ── Helpers ────────────────────────────────────────────────────────────────────

const LINE_STATUS_COLORS: Record<string, string> = {
    Unmatched: "orange",
    Matched: "green",
    Excluded: "default",
};

const STATUS_CONFIG: Record<string, { badge: "success" | "processing" | "warning" | "error" | "default" }> = {
    Open: { badge: "default" },
    "In Progress": { badge: "processing" },
    Completed: { badge: "success" },
    Voided: { badge: "error" },
};

interface Props {
    reconciliationId: string;
    shopId: string;
    onBack: () => void;
}

const ReconciliationWorkspace: React.FC<Props> = ({ reconciliationId, shopId, onBack }) => {
    const queryClient = useQueryClient();

    const [selectedStatementLineId, setSelectedStatementLineId] = useState<string | null>(null);
    const [selectedJELineId, setSelectedJELineId] = useState<string | null>(null);
    const [selectedJEEntryId, setSelectedJEEntryId] = useState<string | null>(null);
    const [voidModalOpen, setVoidModalOpen] = useState(false);
    const [voidReason, setVoidReason] = useState("");
    const [addLinesOpen, setAddLinesOpen] = useState(false);
    const [loadingLineId, setLoadingLineId] = useState<string | null>(null);

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const { data, isLoading } = useQuery({
        queryKey: ["reconciliation-workspace", reconciliationId],
        queryFn: () => getReconciliationById(reconciliationId),
        refetchInterval: 0,
    });

    const recon: BankReconciliation | undefined = data?.reconciliation;

    const invalidate = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["reconciliation-workspace", reconciliationId] });
        queryClient.invalidateQueries({ queryKey: ["reconciliations"] });
    }, [queryClient, reconciliationId]);

    // ── Mutations ──────────────────────────────────────────────────────────────

    const matchMutation = useMutation({
        mutationFn: ({ lineId, jeId, jlId }: { lineId: string; jeId: string; jlId: string }) =>
            matchLine(reconciliationId, lineId, jeId, jlId),
        onSuccess: () => {
            invalidate();
            setSelectedStatementLineId(null);
            setSelectedJELineId(null);
            setSelectedJEEntryId(null);
            setLoadingLineId(null);
        },
        onError: () => setLoadingLineId(null),
    });

    const unmatchMutation = useMutation({
        mutationFn: (lineId: string) => unmatchLine(reconciliationId, lineId),
        onSuccess: () => { invalidate(); setLoadingLineId(null); },
        onError: () => setLoadingLineId(null),
    });

    const excludeMutation = useMutation({
        mutationFn: (lineId: string) => excludeLine(reconciliationId, lineId),
        onSuccess: () => { invalidate(); setLoadingLineId(null); },
        onError: () => setLoadingLineId(null),
    });

    const autoMatchMutation = useMutation({
        mutationFn: () => autoMatch(reconciliationId),
        onSuccess: invalidate,
    });

    const completeMutation = useMutation({
        mutationFn: () => completeReconciliation(reconciliationId),
        onSuccess: invalidate,
    });

    const voidMutation = useMutation({
        mutationFn: (reason: string) => voidReconciliation(reconciliationId, reason),
        onSuccess: () => { invalidate(); setVoidModalOpen(false); setVoidReason(""); },
    });

    // ── Derived state ──────────────────────────────────────────────────────────

    const stmtLines = recon?.statement_lines || [];
    const jeLines = recon?.unreconciled_je_line_ids || [];
    const status = recon?.status;
    const isEditable = status === "Open" || status === "In Progress";

    const difference = recon?.difference ?? 0;
    const isBalanced = Math.abs(difference) < 0.001;
    const matchedCount = recon?.matched_count || 0;
    const unmatchedCount = recon?.unmatched_count || 0;
    const excludedCount = recon?.excluded_count || 0;
    const totalLines = stmtLines.length;
    const matchProgress = totalLines > 0 ? Math.round(((matchedCount + excludedCount) / totalLines) * 100) : 0;

    const accountDisplay = () => {
        if (!recon?.account_id) return "—";
        if (typeof recon.account_id === "object")
            return `${recon.account_id.account_code} — ${recon.account_id.account_name}`;
        return recon.account_name || recon.account_code || recon.account_id;
    };

    // ── Statement Lines columns ────────────────────────────────────────────────

    const stmtColumns = [
        {
            title: "Date",
            dataIndex: "transaction_date",
            key: "transaction_date",
            width: 95,
            render: (d: string) => dayjs(d).format("DD MMM YY"),
        },
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            ellipsis: true,
            render: (v: string, r: StatementLine) => (
                <Space direction="vertical" size={0}>
                    <Text style={{ fontSize: 12 }}>{v}</Text>
                    {r.reference && (
                        <Text type="secondary" style={{ fontSize: 11 }}>{r.reference}</Text>
                    )}
                </Space>
            ),
        },
        {
            title: "Debit",
            dataIndex: "debit",
            key: "debit",
            width: 90,
            align: "right" as const,
            render: (v: number) =>
                v > 0 ? (
                    <Text style={{ color: "#cf1322", fontSize: 12 }}>
                        {v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                ) : "—",
        },
        {
            title: "Credit",
            dataIndex: "credit",
            key: "credit",
            width: 90,
            align: "right" as const,
            render: (v: number) =>
                v > 0 ? (
                    <Text style={{ color: "#389e0d", fontSize: 12 }}>
                        {v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </Text>
                ) : "—",
        },
        {
            title: "Status",
            key: "status",
            width: 90,
            render: (_: any, r: StatementLine) => (
                <Tag color={LINE_STATUS_COLORS[r.status] || "default"} style={{ fontSize: 10 }}>
                    {r.status}
                </Tag>
            ),
        },
        {
            title: "",
            key: "actions",
            width: 90,
            render: (_: any, r: StatementLine) => {
                if (!isEditable) return null;
                const isLoading = loadingLineId === r._id;

                if (r.status === "Matched") {
                    return (
                        <Tooltip title="Unmatch">
                            <Button
                                icon={<DisconnectOutlined />}
                                size="small"
                                loading={isLoading}
                                onClick={() => {
                                    setLoadingLineId(r._id);
                                    unmatchMutation.mutate(r._id);
                                }}
                            />
                        </Tooltip>
                    );
                }

                return (
                    <Space size={4}>
                        <Tooltip title={r.status === "Excluded" ? "Un-exclude" : "Exclude"}>
                            <Button
                                icon={<MinusCircleOutlined />}
                                size="small"
                                loading={isLoading}
                                onClick={() => {
                                    setLoadingLineId(r._id);
                                    excludeMutation.mutate(r._id);
                                }}
                            />
                        </Tooltip>
                        {r.status === "Unmatched" && (
                            <Tooltip title={
                                selectedStatementLineId === r._id
                                    ? "Selected — now pick a JE line on the right"
                                    : "Select to match"
                            }>
                                <Button
                                    icon={<LinkOutlined />}
                                    size="small"
                                    type={selectedStatementLineId === r._id ? "primary" : "default"}
                                    onClick={() =>
                                        setSelectedStatementLineId((prev) => prev === r._id ? null : r._id)
                                    }
                                />
                            </Tooltip>
                        )}
                    </Space>
                );
            },
        },
    ];

    // ── JE Lines columns ───────────────────────────────────────────────────────

    const jeColumns = [
        {
            title: "Entry No.",
            dataIndex: "entry_no",
            key: "entry_no",
            width: 110,
            render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
        },
        {
            title: "Date",
            dataIndex: "entry_date",
            key: "entry_date",
            width: 90,
            render: (d: string) => dayjs(d).format("DD MMM YY"),
        },
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            ellipsis: true,
            render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
        },
        {
            title: "Debit",
            dataIndex: "debit",
            key: "debit",
            width: 90,
            align: "right" as const,
            render: (v: number) =>
                v > 0 ? <Text style={{ color: "#cf1322", fontSize: 12 }}>
                    {v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </Text> : "—",
        },
        {
            title: "Credit",
            dataIndex: "credit",
            key: "credit",
            width: 90,
            align: "right" as const,
            render: (v: number) =>
                v > 0 ? <Text style={{ color: "#389e0d", fontSize: 12 }}>
                    {v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </Text> : "—",
        },
        {
            title: "",
            key: "match",
            width: 80,
            render: (_: any, r: UnreconciledJELine) => {
                if (!isEditable || !selectedStatementLineId) return null;
                const isSelected = selectedJELineId === r.journal_line_id;
                return (
                    <Button
                        size="small"
                        type={isSelected ? "primary" : "default"}
                        onClick={() => {
                            if (isSelected) {
                                // Confirm match
                                setLoadingLineId(selectedStatementLineId);
                                matchMutation.mutate({
                                    lineId: selectedStatementLineId,
                                    jeId: r.journal_entry_id,
                                    jlId: r.journal_line_id,
                                });
                            } else {
                                setSelectedJELineId(r.journal_line_id);
                                setSelectedJEEntryId(r.journal_entry_id);
                            }
                        }}
                    >
                        {isSelected ? "Confirm" : "Select"}
                    </Button>
                );
            },
        },
    ];

    if (isLoading) {
        return (
            <div style={{ textAlign: "center", padding: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!recon) {
        return <Alert type="error" message="Reconciliation not found" />;
    }

    return (
        <div>
            {/* ── Header ── */}
            <Space style={{ marginBottom: 16 }} align="start" size={16}>
                <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
                    Back to List
                </Button>
                <div>
                    <Space align="center">
                        <Title level={4} style={{ margin: 0 }}>
                            {accountDisplay()}
                        </Title>
                        <Text code style={{ fontSize: 12 }}>{recon.reconciliation_no}</Text>
                        <Badge status={STATUS_CONFIG[status || "Open"]?.badge} text={status} />
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                        {dayjs(recon.period_start).format("DD MMM YYYY")} — {dayjs(recon.period_end).format("DD MMM YYYY")}
                    </Text>
                </div>

                <Space style={{ marginLeft: "auto" }}>
                    {isEditable && (
                        <>
                            <Button
                                icon={<PlusOutlined />}
                                onClick={() => setAddLinesOpen(true)}
                            >
                                Add Lines
                            </Button>
                            <Button
                                icon={<ThunderboltOutlined />}
                                loading={autoMatchMutation.isPending}
                                onClick={() => autoMatchMutation.mutate()}
                            >
                                Auto-Match
                            </Button>
                            <Popconfirm
                                title="Complete this reconciliation?"
                                description={
                                    isBalanced
                                        ? "This will lock the reconciliation permanently."
                                        : `Difference of KES ${Math.abs(difference).toLocaleString("en-KE", { minimumFractionDigits: 2 })} must be zero to complete.`
                                }
                                disabled={!isBalanced}
                                onConfirm={() => completeMutation.mutate()}
                                okText="Complete"
                            >
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    disabled={!isBalanced}
                                    loading={completeMutation.isPending}
                                >
                                    Complete
                                </Button>
                            </Popconfirm>
                            <Button
                                danger
                                icon={<StopOutlined />}
                                onClick={() => setVoidModalOpen(true)}
                            >
                                Void
                            </Button>
                        </>
                    )}
                </Space>
            </Space>

            {/* ── Balance Summary ── */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={5}>
                    <Card size="small" bordered>
                        <Statistic
                            title="Book Balance"
                            value={recon.closing_book_balance}
                            precision={2}
                            prefix="KES"
                            valueStyle={{ fontSize: 16, color: "#1d39c4" }}
                        />
                    </Card>
                </Col>
                <Col span={5}>
                    <Card size="small" bordered>
                        <Statistic
                            title="Statement Balance"
                            value={recon.statement_balance}
                            precision={2}
                            prefix="KES"
                            valueStyle={{ fontSize: 16, color: "#1890ff" }}
                        />
                    </Card>
                </Col>
                <Col span={5}>
                    <Card size="small" bordered style={{ background: isBalanced ? "#f6ffed" : "#fff2f0", borderColor: isBalanced ? "#b7eb8f" : "#ffa39e" }}>
                        <Statistic
                            title="Difference"
                            value={Math.abs(difference)}
                            precision={2}
                            prefix="KES"
                            valueStyle={{ fontSize: 18, color: isBalanced ? "#389e0d" : "#cf1322", fontWeight: 700 }}
                            suffix={isBalanced ? "✓ Balanced" : ""}
                        />
                    </Card>
                </Col>
                <Col span={9}>
                    <Card size="small" bordered>
                        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                            Matching Progress — {matchedCount + excludedCount} of {totalLines} lines resolved
                        </Text>
                        <Progress
                            percent={matchProgress}
                            size="small"
                            status={matchProgress === 100 ? "success" : "active"}
                            format={(p) => `${p}%`}
                        />
                        <Space size={16} style={{ marginTop: 6 }}>
                            <Text style={{ fontSize: 11 }}>
                                <Tag color="green" style={{ fontSize: 10 }}>Matched {matchedCount}</Tag>
                                <Tag color="orange" style={{ fontSize: 10 }}>Unmatched {unmatchedCount}</Tag>
                                <Tag color="default" style={{ fontSize: 10 }}>Excluded {excludedCount}</Tag>
                            </Text>
                        </Space>
                    </Card>
                </Col>
            </Row>

            {/* ── Match hint ── */}
            {isEditable && selectedStatementLineId && (
                <Alert
                    type="info"
                    showIcon
                    message={
                        selectedJELineId
                            ? "JE line selected — click Confirm to match, or select a different JE line."
                            : "Statement line selected — pick a matching JE line on the right panel."
                    }
                    style={{ marginBottom: 12 }}
                    action={
                        <Button size="small" onClick={() => { setSelectedStatementLineId(null); setSelectedJELineId(null); }}>
                            Cancel Selection
                        </Button>
                    }
                />
            )}

            {/* ── Two-panel layout ── */}
            <Row gutter={16}>
                {/* Left — Statement Lines */}
                <Col span={13}>
                    <Card
                        size="small"
                        title={
                            <Space>
                                <Text strong>Bank Statement Lines</Text>
                                <Tag>{stmtLines.length} lines</Tag>
                            </Space>
                        }
                        bodyStyle={{ padding: 0 }}
                    >
                        <Table
                            rowKey="_id"
                            dataSource={stmtLines}
                            columns={stmtColumns}
                            pagination={{ pageSize: 15, showSizeChanger: false, size: "small" }}
                            size="small"
                            scroll={{ x: 550 }}
                            rowClassName={(r) => {
                                if (r._id === selectedStatementLineId) return "ant-table-row-selected";
                                if (r.status === "Matched") return "opacity-75";
                                if (r.status === "Excluded") return "opacity-40";
                                return "";
                            }}
                            locale={{ emptyText: "No statement lines — add lines to begin" }}
                            summary={() => (
                                <Table.Summary fixed>
                                    <Table.Summary.Row style={{ background: "#fafafa" }}>
                                        <Table.Summary.Cell index={0} colSpan={2}>
                                            <Text strong style={{ fontSize: 12 }}>Totals</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={2} align="right">
                                            <Text strong style={{ color: "#cf1322", fontSize: 12 }}>
                                                {(recon.total_statement_debits || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                            </Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={3} align="right">
                                            <Text strong style={{ color: "#389e0d", fontSize: 12 }}>
                                                {(recon.total_statement_credits || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                            </Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={4} colSpan={2} />
                                    </Table.Summary.Row>
                                </Table.Summary>
                            )}
                        />
                    </Card>
                </Col>

                {/* Right — Unreconciled JE Lines */}
                <Col span={11}>
                    <Card
                        size="small"
                        title={
                            <Space>
                                <Text strong>Unreconciled Journal Lines</Text>
                                <Tag color="orange">{jeLines.length}</Tag>
                            </Space>
                        }
                        bodyStyle={{ padding: 0 }}
                    >
                        {!selectedStatementLineId && isEditable && (
                            <Alert
                                type="warning"
                                message="Select a statement line on the left first"
                                style={{ margin: 8, padding: "4px 12px" }}
                                showIcon
                            />
                        )}
                        <Table
                            rowKey="journal_line_id"
                            dataSource={jeLines}
                            columns={jeColumns}
                            pagination={{ pageSize: 15, showSizeChanger: false, size: "small" }}
                            size="small"
                            scroll={{ x: 460 }}
                            rowClassName={(r) =>
                                r.journal_line_id === selectedJELineId ? "ant-table-row-selected" : ""
                            }
                            locale={{ emptyText: "All journal lines reconciled" }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* ── Add Lines Drawer ── */}
            <OpenReconciliationDrawer
                open={addLinesOpen}
                onClose={() => setAddLinesOpen(false)}
                onSuccess={() => { setAddLinesOpen(false); invalidate(); }}
                shopId={shopId}
                reconciliationId={reconciliationId}
            />

            {/* ── Void Modal ── */}
            <Modal
                title="Void Reconciliation"
                open={voidModalOpen}
                onCancel={() => { setVoidModalOpen(false); setVoidReason(""); }}
                onOk={() => voidMutation.mutate(voidReason)}
                okText="Void"
                okButtonProps={{
                    danger: true,
                    disabled: !voidReason.trim(),
                    loading: voidMutation.isPending,
                }}
            >
                <Alert
                    type="warning"
                    showIcon
                    message="This will void the reconciliation and release all matched JE lines."
                    style={{ marginBottom: 16 }}
                />
                <Text>Void Reason <Text type="danger">*</Text></Text>
                <Input.TextArea
                    rows={3}
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Reason for voiding…"
                    style={{ marginTop: 8 }}
                    maxLength={300}
                    showCount
                />
            </Modal>
        </div>
    );
};

export default ReconciliationWorkspace;