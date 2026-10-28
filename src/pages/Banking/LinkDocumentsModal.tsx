import React, { useEffect, useMemo, useState } from "react";
import { Modal, Select, Table, InputNumber, Button, Typography, Space, Tag, Alert, Empty } from "antd";
import { DeleteOutlined, LinkOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
    getLinkableDocuments,
    linkTransaction,
    LinkableDocument,
    RawTransaction,
    TransactionAllocation,
} from "@services/accounting/bankStatementImport";

const { Text } = Typography;

const fmt = (n: number) => (n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const round2 = (n: number) => Math.round((n || 0) * 100) / 100;

// Single-column imports display money out as a negative debit
const isMoneyOut = (t: Pick<RawTransaction, "debit">) => Math.abs(t.debit || 0) > 0;
const txnAmount = (t: Pick<RawTransaction, "debit" | "credit">) => Math.abs((t.debit || 0) || (t.credit || 0));

interface Props {
    open: boolean;
    importId?: string;
    txn: RawTransaction | null;
    onClose: () => void;
    onLinked: () => void;
}

/**
 * Link a bank transaction to the customer invoices (money in) or supplier
 * bills (money out) it pays. Linked amounts post against A/R / A/P and are
 * recorded as payments on each document — when the journal is posted, or
 * immediately for a transaction that's already posted.
 */
const LinkDocumentsModal: React.FC<Props> = ({ open, importId, txn, onClose, onLinked }) => {
    const [rows, setRows] = useState<TransactionAllocation[]>([]);
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);

    const docType = txn && isMoneyOut(txn) ? "bill" : "invoice";
    const amount = txn ? txnAmount(txn) : 0;
    const label = docType === "bill" ? "bill" : "invoice";
    const posted = txn?.status === "Pushed";

    useEffect(() => {
        if (open) {
            setRows((txn?.allocations || []).map((a) => ({ ...a })));
            setSearch("");
        }
    }, [open, txn]);

    const { data: documents = [], isFetching } = useQuery({
        queryKey: ["linkable-documents", docType, search, amount],
        queryFn: () => getLinkableDocuments({ type: docType, search: search || undefined, amount }),
        enabled: open && !!txn,
    });

    // Outstanding per document, plus what this transaction already applied to
    // it (so editing an existing link isn't capped by its own payment).
    const outstanding = useMemo(() => {
        const map = new Map<string, number>();
        documents.forEach((d) => map.set(d.doc_id, d.amount_due));
        if (posted) {
            (txn?.allocations || []).forEach((a) => {
                if (a.payment_id) map.set(a.doc_id, round2((map.get(a.doc_id) || 0) + a.amount));
            });
        }
        return map;
    }, [documents, posted, txn]);

    const linkedTotal = round2(rows.reduce((s, r) => s + (r.amount || 0), 0));
    const remainder = round2(amount - linkedTotal);
    const overLinked = remainder < -0.009;
    const hasCategory = !!(txn?.account_id && !["1200", "2100"].includes(txn?.account_code || ""));

    const addDocument = (docId: string) => {
        const d = documents.find((x) => x.doc_id === docId);
        if (!d || rows.some((r) => r.doc_id === docId)) return;
        const left = Math.max(0, round2(amount - linkedTotal));
        setRows((prev) => [
            ...prev,
            {
                doc_type: d.doc_type,
                doc_id: d.doc_id,
                doc_no: d.doc_no,
                party_name: d.party_name,
                amount: round2(Math.min(d.amount_due, left || d.amount_due)),
            },
        ]);
    };

    const save = async (allocations: TransactionAllocation[]) => {
        if (!importId || !txn) return;
        setSaving(true);
        try {
            await linkTransaction(importId, txn._id, {
                allocations: allocations.map(({ doc_type, doc_id, amount: a }) => ({ doc_type, doc_id, amount: a })),
            });
            onLinked();
            onClose();
        } catch {
            // linkTransaction shows the error
        } finally {
            setSaving(false);
        }
    };

    const options = documents
        .filter((d) => !rows.some((r) => r.doc_id === d.doc_id))
        .map((d: LinkableDocument) => ({
            value: d.doc_id,
            label: (
                <Space size={6} style={{ width: "100%", justifyContent: "space-between" }}>
                    <span>
                        <Text strong>{d.doc_no}</Text> <Text type="secondary">{d.party_name}</Text>
                        {d.date && <Text type="secondary"> · {dayjs(d.date).format("DD MMM YYYY")}</Text>}
                    </span>
                    <span>
                        {d.exact_match && <Tag color="green">Exact amount</Tag>}
                        <Text>{fmt(d.amount_due)} due</Text>
                    </span>
                </Space>
            ),
        }));

    return (
        <Modal
            open={open}
            onCancel={onClose}
            width={760}
            destroyOnClose
            title={
                <Space>
                    <LinkOutlined />
                    <span>Link to {docType === "bill" ? "supplier bills" : "customer invoices"}</span>
                </Space>
            }
            footer={[
                txn?.allocations?.length ? (
                    <Button key="clear" danger onClick={() => save([])} loading={saving}>
                        Remove links
                    </Button>
                ) : null,
                <Button key="cancel" onClick={onClose}>
                    Cancel
                </Button>,
                <Button
                    key="save"
                    type="primary"
                    onClick={() => save(rows)}
                    loading={saving}
                    disabled={!rows.length || overLinked || rows.some((r) => !(r.amount > 0))}
                >
                    {posted ? "Link & record payments" : "Save links"}
                </Button>,
            ]}
        >
            {txn && (
                <div style={{ marginBottom: 12, padding: "8px 12px", background: "#fafafa", borderRadius: 8 }}>
                    <Space direction="vertical" size={0} style={{ width: "100%" }}>
                        <Space style={{ justifyContent: "space-between", width: "100%" }}>
                            <Text strong>{txn.description}</Text>
                            <Text strong style={{ color: docType === "bill" ? "#cf1322" : "#389e0d" }}>
                                {docType === "bill" ? "Paid out" : "Received"} {fmt(amount)}
                            </Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(txn.transaction_date).format("DD MMM YYYY")}
                            {txn.reference ? ` · ${txn.reference}` : ""}
                        </Text>
                    </Space>
                </div>
            )}

            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message={
                    posted
                        ? `This transaction is already posted. Linking updates its journal entry and records the payment on each ${label} now.`
                        : `When the journal is posted, a payment is recorded on each linked ${label} (shown as "via Journal") and its paid amount updates.`
                }
            />

            <Select
                showSearch
                value={null as unknown as string}
                placeholder={`Search open ${label}s by number or ${docType === "bill" ? "supplier" : "customer"}`}
                filterOption={false}
                onSearch={setSearch}
                onChange={addDocument}
                loading={isFetching}
                options={options}
                style={{ width: "100%", marginBottom: 12 }}
                notFoundContent={isFetching ? "Loading…" : `No open ${label}s found`}
            />

            <Table
                size="small"
                rowKey="doc_id"
                pagination={false}
                dataSource={rows}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No ${label}s linked yet`} /> }}
                columns={[
                    {
                        title: docType === "bill" ? "Bill" : "Invoice",
                        dataIndex: "doc_no",
                        render: (v: string, r: TransactionAllocation) => (
                            <Space direction="vertical" size={0}>
                                <Text strong>{v}</Text>
                                {r.party_name && <Text type="secondary" style={{ fontSize: 12 }}>{r.party_name}</Text>}
                            </Space>
                        ),
                    },
                    {
                        title: "Outstanding",
                        key: "due",
                        align: "right" as const,
                        render: (_: unknown, r: TransactionAllocation) =>
                            outstanding.has(r.doc_id) ? fmt(outstanding.get(r.doc_id)!) : <Text type="secondary">—</Text>,
                    },
                    {
                        title: "Amount applied",
                        dataIndex: "amount",
                        width: 170,
                        render: (v: number, r: TransactionAllocation) => (
                            <InputNumber
                                value={v}
                                min={0.01}
                                max={outstanding.get(r.doc_id)}
                                precision={2}
                                style={{ width: "100%" }}
                                onChange={(val) =>
                                    setRows((prev) =>
                                        prev.map((x) => (x.doc_id === r.doc_id ? { ...x, amount: Number(val) || 0 } : x))
                                    )
                                }
                            />
                        ),
                    },
                    {
                        key: "remove",
                        width: 40,
                        render: (_: unknown, r: TransactionAllocation) => (
                            <Button
                                size="small"
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => setRows((prev) => prev.filter((x) => x.doc_id !== r.doc_id))}
                            />
                        ),
                    },
                ]}
            />

            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <Text>
                    Linked <Text strong>{fmt(linkedTotal)}</Text> of {fmt(amount)}
                </Text>
                {overLinked ? (
                    <Text type="danger">Linked amounts are more than the transaction</Text>
                ) : remainder > 0.009 && rows.length > 0 ? (
                    <Text type={hasCategory ? "secondary" : "warning"}>
                        {fmt(remainder)} left —{" "}
                        {hasCategory
                            ? `posts to ${txn?.account_code} ${txn?.account_name}`
                            : `posts to ${docType === "bill" ? "Accounts Payable" : "Accounts Receivable"} unless you categorize it`}
                    </Text>
                ) : null}
            </div>
        </Modal>
    );
};

export default LinkDocumentsModal;
