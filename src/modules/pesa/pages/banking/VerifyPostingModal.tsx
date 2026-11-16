import React, { useEffect, useState } from "react";
import {
    Modal, Table, Typography, Space, Tag, Button, Alert,
    Select, Spin, Empty, Tooltip, Row, Col, Card, Statistic, Progress,
} from "antd";
import {
    CheckCircleOutlined, WarningOutlined, SendOutlined, ReloadOutlined,
    FileSearchOutlined, StopOutlined, ExclamationCircleOutlined, CheckSquareOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    verifyPosting,
    pushToJournalEntries,
    UnpostedTransaction,
    UnpostedReason,
    BankStatementImport,
    REPOSTABLE_REASONS,
    UNPOSTED_REASON_LABELS,
} from "@services/accounting/bankStatementImport";
import { getAllAccounts } from "@services/accounting/accounts";
import dayjs from "dayjs";

const { Text } = Typography;

const BATCH_SIZE = 20;


interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    importRecord: BankStatementImport | null;
    shopId: string;
}

const VerifyPostingModal: React.FC<Props> = ({
    open, onClose, onSuccess, importRecord, shopId,
}) => {
    const queryClient = useQueryClient();
    const importId = importRecord?._id;

    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [bankAccountId, setBankAccountId] = useState<string | undefined>(undefined);
    const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; posted: number } | null>(null);

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["verify-posting", importId],
        queryFn: () => verifyPosting(importId!),
        enabled: open && !!importId,
        refetchOnWindowFocus: false,
    });

    const { data: accountsData } = useQuery({
        queryKey: ["chart-of-accounts", shopId],
        queryFn: () => getAllAccounts({ shop_id: shopId }),
        enabled: open,
    });

    const accounts = accountsData?.accounts || [];
    const bankAccountOptions = accounts
        .filter((a: any) => a.is_bank_account || a.account_type === "ASSET")
        .map((a: any) => ({ label: `${a.account_code} — ${a.account_name}`, value: a._id }));

    useEffect(() => {
        if (!open) {
            setSelectedRowKeys([]);
            setBankAccountId(undefined);
            setBatchProgress(null);
        }
    }, [open]);

    const unposted = data?.unposted || [];

    // Only transactions that have an account assigned can actually be posted
    // (ones that are still Uncategorized need categorizing first in the
    // Review Transactions drawer before they're postable here).
    // Transactions whose entry exists but is wrong (draft, other bank…) aren't
    // re-postable either — the push skips them; the entry needs fixing instead.
    const postableKeys = unposted
        .filter((t) => !!t.account_id && REPOSTABLE_REASONS.includes(t.reason))
        .map((t) => String(t._id));

    const postMutation = useMutation({
        mutationFn: async () => {
            const ids = (selectedRowKeys as string[]).filter((id) => postableKeys.includes(id));
            const batches: string[][] = [];
            for (let i = 0; i < ids.length; i += BATCH_SIZE) batches.push(ids.slice(i, i + BATCH_SIZE));

            setBatchProgress({ done: 0, total: batches.length, posted: 0 });
            let totalPosted = 0;
            for (let i = 0; i < batches.length; i++) {
                const res = await pushToJournalEntries(
                    importId!,
                    { bank_account_id: bankAccountId!, txn_ids: batches[i] },
                    batches.length > 1 // silence per-batch toasts when batching
                );
                totalPosted += res.pushed_count || 0;
                setBatchProgress({ done: i + 1, total: batches.length, posted: totalPosted });
            }
            return totalPosted;
        },
        onSuccess: (totalPosted) => {
            setSelectedRowKeys([]);
            onSuccess();
            void totalPosted;
            // Let the completed (100%) progress bar stay visible briefly
            // before refreshing the list — otherwise, if everything ends up
            // posted, the view switches to the "all posted" state instantly
            // and the progress bar never gets seen.
            setTimeout(() => {
                refetch();
                queryClient.invalidateQueries({ queryKey: ["import-detail", importId] });
                setBatchProgress(null);
            }, 1500);
        },
        onError: () => setBatchProgress(null),
    });

    const selectedPostableCount = (selectedRowKeys as string[]).filter((id) => postableKeys.includes(id)).length;

    const columns = [
        {
            title: "Date",
            dataIndex: "transaction_date",
            width: 110,
            render: (v: string) => (
                <Text style={{ fontSize: 12 }}>
                    {dayjs(v).isValid() ? dayjs(v).format("DD MMM YYYY") : v}
                </Text>
            ),
        },
        {
            title: "Description",
            dataIndex: "description",
            render: (v: string, r: UnpostedTransaction) => (
                <Space direction="vertical" size={0}>
                    <Text style={{ fontSize: 13, whiteSpace: "normal" }}>{v}</Text>
                    {r.reference && (
                        <Text type="secondary" style={{ fontSize: 11 }}>{r.reference}</Text>
                    )}
                </Space>
            ),
        },
        {
            title: "Account",
            key: "account",
            width: 200,
            render: (_: unknown, r: UnpostedTransaction) =>
                r.account_name ? (
                    <Tag color="blue" style={{ fontSize: 11 }}>{r.account_code} {r.account_name}</Tag>
                ) : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
        },
        {
            title: "Debit",
            dataIndex: "debit",
            width: 110,
            align: "right" as const,
            render: (v: number) => v > 0 ? (
                <Text style={{ color: "#cf1322", fontSize: 12 }}>{v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>
            ) : <Text type="secondary">—</Text>,
        },
        {
            title: "Credit",
            dataIndex: "credit",
            width: 110,
            align: "right" as const,
            render: (v: number) => v > 0 ? (
                <Text style={{ color: "#389e0d", fontSize: 12 }}>{v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>
            ) : <Text type="secondary">—</Text>,
        },
        {
            title: "Issue",
            dataIndex: "reason",
            width: 180,
            render: (r: UnpostedReason) => {
                const cfg = UNPOSTED_REASON_LABELS[r] || { label: r, color: "default", hint: "" };
                return (
                    <Tooltip title={cfg.hint}>
                        <Tag color={cfg.color}>{cfg.label}</Tag>
                    </Tooltip>
                );
            },
        },
    ];

    return (
        <Modal
            open={open}
            title={
                <Space>
                    <FileSearchOutlined style={{ fontSize: 18 }} />
                    <Text strong style={{ fontSize: 17 }}>Verify Posting</Text>
                    {importRecord && <Tag color="blue">{importRecord.import_no}</Tag>}
                </Space>
            }
            onCancel={onClose}
            footer={null}
            width={1200}
            style={{ top: 32 }}
            bodyStyle={{ maxHeight: "78vh", overflowY: "auto", paddingTop: 8 }}
            destroyOnClose
        >
            {batchProgress && (
                <div style={{ marginBottom: 16, padding: 14, background: "#f0f5ff", border: "1px solid #adc6ff", borderRadius: 10 }}>
                    <Space style={{ marginBottom: 8 }}>
                        <SendOutlined spin={batchProgress.done < batchProgress.total} style={{ color: "#1677ff" }} />
                        <Text strong>
                            {batchProgress.done < batchProgress.total ? "Posting transactions..." : "Posting complete"}
                        </Text>
                    </Space>
                    <Progress
                        percent={Math.round((batchProgress.done / Math.max(batchProgress.total, 1)) * 100)}
                        status={batchProgress.done < batchProgress.total ? "active" : "success"}
                        strokeColor={{ from: "#108ee9", to: "#52c41a" }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Batch {batchProgress.done} of {batchProgress.total} — {batchProgress.posted} transaction{batchProgress.posted === 1 ? "" : "s"} posted so far
                    </Text>
                </div>
            )}

            {isLoading ? (
                <div style={{ textAlign: "center", padding: 60 }}>
                    <Spin size="large" tip="Checking journal entries..." />
                </div>
            ) : data?.all_posted ? (
                <Alert
                    type="success"
                    showIcon
                    icon={<CheckCircleOutlined />}
                    message="All transactions posted"
                    description={`${data.posted_count} of ${data.total_checked} transactions have been confirmed posted to journal entries.`}
                    style={{ borderRadius: 10 }}
                />
            ) : (
                <>
                    <Row gutter={16} style={{ marginBottom: 20 }}>
                        <Col span={8}>
                            <Card size="small" bordered>
                                <Statistic
                                    title="Total Checked"
                                    value={data?.total_checked || 0}
                                    valueStyle={{ fontSize: 22 }}
                                />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card size="small" bordered>
                                <Statistic
                                    title="Posted"
                                    value={data?.posted_count || 0}
                                    valueStyle={{ fontSize: 22, color: "#52c41a" }}
                                    prefix={<CheckCircleOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card size="small" bordered>
                                <Statistic
                                    title="Not Posted"
                                    value={data?.unposted_count || 0}
                                    valueStyle={{ fontSize: 22, color: "#faad14" }}
                                    prefix={<ExclamationCircleOutlined />}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Alert
                        type="warning"
                        showIcon
                        icon={<WarningOutlined />}
                        style={{ marginBottom: 16, borderRadius: 10 }}
                        message={`${data?.unposted_count || 0} of ${data?.total_checked || 0} transactions are not posted to journal entries`}
                        description="Select transactions below, choose the bank account, then post them. Large selections are posted automatically in batches."
                    />

                    <div style={{ marginBottom: 16, padding: 14, background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 10 }}>
                        <Space wrap size="middle">
                            <Text strong>
                                {selectedRowKeys.length > 0
                                    ? `${selectedRowKeys.length} selected${selectedPostableCount !== selectedRowKeys.length ? ` (${selectedPostableCount} postable)` : ""}`
                                    : "No transactions selected"}
                            </Text>
                            <Button
                                icon={<CheckSquareOutlined />}
                                onClick={() => setSelectedRowKeys(postableKeys)}
                                disabled={postableKeys.length === 0 || selectedPostableCount === postableKeys.length}
                                size="large"
                            >
                                Select All {postableKeys.length}
                            </Button>
                            <Select
                                placeholder="Select bank account..."
                                options={bankAccountOptions}
                                value={bankAccountId}
                                onChange={setBankAccountId}
                                style={{ width: 280 }}
                                showSearch
                                optionFilterProp="label"
                                size="large"
                            />
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={() => postMutation.mutate()}
                                disabled={!bankAccountId || selectedPostableCount === 0}
                                loading={postMutation.isLoading}
                                size="large"
                            >
                                Post Selected ({selectedPostableCount})
                            </Button>
                            {selectedRowKeys.length > 0 && (
                                <Button icon={<StopOutlined />} onClick={() => setSelectedRowKeys([])} size="large">
                                    Clear Selection
                                </Button>
                            )}
                        </Space>
                    </div>

                    {unposted.length === 0 ? (
                        <Empty description="No unposted transactions" />
                    ) : (
                        <Table
                            rowKey="_id"
                            dataSource={unposted}
                            columns={columns}
                            size="middle"
                            scroll={{ x: 850, y: 420 }}
                            pagination={{ pageSize: 25, showTotal: (t) => `${t} transactions` }}
                            rowSelection={{
                                selectedRowKeys,
                                onChange: setSelectedRowKeys,
                                getCheckboxProps: (r: UnpostedTransaction) => ({
                                    disabled: !postableKeys.includes(String(r._id)),
                                }),
                                selections: [
                                    {
                                        key: "select-all-postable",
                                        text: `Select All ${postableKeys.length} Postable`,
                                        onSelect: () => setSelectedRowKeys(postableKeys),
                                    },
                                    {
                                        key: "select-page",
                                        text: "Select Current Page",
                                        onSelect: (changeableRowKeys) => {
                                            const pageIds = changeableRowKeys.filter((k) => postableKeys.includes(String(k)));
                                            setSelectedRowKeys(pageIds);
                                        },
                                    },
                                    {
                                        key: "clear-all",
                                        text: "Deselect All",
                                        onSelect: () => setSelectedRowKeys([]),
                                    },
                                ],
                            }}
                        />
                    )}

                    <div style={{ textAlign: "right", marginTop: 14 }}>
                        <Tooltip title="Re-run verification">
                            <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching}>
                                Re-check
                            </Button>
                        </Tooltip>
                    </div>
                </>
            )}
        </Modal>
    );
};

export default VerifyPostingModal;
