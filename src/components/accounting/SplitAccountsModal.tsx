import React, { useEffect, useState } from "react";
import { Modal, Space, Select, InputNumber, Input, Button, Typography, DatePicker } from "antd";
import dayjs from "dayjs";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

// Splits one amount (a journal line, a bank transaction) across several
// accounts, and optionally across dates. The rows must add up to the amount
// exactly before they apply.

export interface SplitRow {
    account_id: string;
    amount: number;
    description?: string;
    /** YYYY-MM-DD; only set when the modal is opened withDates. */
    date?: string;
}

interface EditableRow extends SplitRow {
    key: string;
}

interface Props {
    open: boolean;
    /** The amount the rows must add up to. */
    total: number;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    /** Rows to start from; defaults to the whole amount on one blank row plus one empty row. */
    initialRows?: SplitRow[];
    /** Memo pre-filled on new rows. */
    defaultDescription?: string;
    accountOptions: { label: string; value: string }[];
    onClose: () => void;
    onApply: (rows: SplitRow[]) => void;
    /** Shown as a "Remove split" button when set. */
    onRemove?: () => void;
    /** Shown above the rows. */
    header?: React.ReactNode;
    /** Changing this while open starts the rows over from initialRows. */
    resetKey?: string | number;
    /** Adds a date to each row, for posting parts of the amount on other days. */
    withDates?: boolean;
    /** Date given to rows that have none (YYYY-MM-DD). */
    defaultDate?: string;
}

const round2 = (n: number) => Math.round((n || 0) * 100) / 100;
const fmtAmount = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const newKey = () => crypto.randomUUID();

const SplitAccountsModal: React.FC<Props> = ({
    open, total, title, subtitle, initialRows, defaultDescription = "",
    accountOptions, onClose, onApply, onRemove, header, resetKey, withDates, defaultDate,
}) => {
    const [rows, setRows] = useState<EditableRow[]>([]);
    const target = round2(total);

    useEffect(() => {
        if (!open) return;
        const start = initialRows?.length
            ? initialRows
            : [
                { account_id: "", amount: target, description: defaultDescription },
                { account_id: "", amount: 0, description: defaultDescription },
            ];
        setRows(start.map((r) => ({ ...r, date: withDates ? r.date || defaultDate : undefined, key: newKey() })));
        // Only reset when the modal opens (or resetKey changes), not on every parent render
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, resetKey]);

    const sum = round2(rows.reduce((s, r) => s + (r.amount || 0), 0));
    const left = round2(target - sum);
    const valid = rows.length >= 2 && Math.abs(left) < 0.01 && rows.every((r) => r.account_id && r.amount > 0 && (!withDates || r.date));

    const update = (key: string, patch: Partial<SplitRow>) =>
        setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

    return (
        <Modal
            open={open}
            title={
                <Space direction="vertical" size={0}>
                    <Text strong>{title || "Split across accounts"}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {subtitle || `The split lines must add up to ${fmtAmount(target)}`}
                    </Text>
                </Space>
            }
            onCancel={onClose}
            width={withDates ? 880 : 720}
            destroyOnClose
            footer={
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <span>
                        {onRemove && (
                            <Button danger onClick={onRemove}>
                                Remove split
                            </Button>
                        )}
                    </span>
                    <Space>
                        <Button onClick={onClose}>Cancel</Button>
                        <Button
                            type="primary"
                            disabled={!valid}
                            onClick={() =>
                                valid &&
                                onApply(rows.map(({ key, ...r }) => ({ ...r, amount: round2(r.amount) })))
                            }
                        >
                            Apply Split
                        </Button>
                    </Space>
                </Space>
            }
        >
            <Space direction="vertical" style={{ width: "100%", marginTop: 12 }} size={8}>
                {header}
                {rows.map((r) => (
                    <Space key={r.key} style={{ width: "100%" }} align="start">
                        <Select
                            showSearch
                            placeholder="Account…"
                            style={{ width: withDates ? 260 : 300 }}
                            value={r.account_id || undefined}
                            onChange={(v) => update(r.key, { account_id: v })}
                            options={accountOptions}
                            optionFilterProp="label"
                        />
                        <InputNumber
                            min={0}
                            precision={2}
                            placeholder="0.00"
                            value={r.amount || undefined}
                            onChange={(v) => update(r.key, { amount: v || 0 })}
                            style={{ width: 130 }}
                            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                            parser={(v) => v!.replace(/,/g, "") as any}
                        />
                        {withDates && (
                            <DatePicker
                                allowClear={false}
                                format="DD MMM YYYY"
                                value={r.date ? dayjs(r.date) : null}
                                onChange={(d) => update(r.key, { date: d ? d.format("YYYY-MM-DD") : undefined })}
                                style={{ width: 140 }}
                            />
                        )}
                        <Input
                            placeholder="Memo"
                            value={r.description}
                            onChange={(e) => update(r.key, { description: e.target.value })}
                            style={{ width: 200 }}
                        />
                        <Button
                            type="text"
                            danger
                            icon={<MinusCircleOutlined />}
                            onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                            disabled={rows.length <= 2}
                        />
                    </Space>
                ))}
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() =>
                            setRows((prev) => [
                                ...prev,
                                {
                                    key: newKey(), account_id: "", amount: left > 0 ? left : 0, description: defaultDescription,
                                    date: withDates ? prev[prev.length - 1]?.date || defaultDate : undefined,
                                },
                            ])
                        }
                    >
                        Add account
                    </Button>
                    <Text type={Math.abs(left) < 0.01 ? "success" : "danger"}>
                        {fmtAmount(sum)} of {fmtAmount(target)}
                        {Math.abs(left) >= 0.01 &&
                            (left > 0 ? ` — ${fmtAmount(left)} left` : ` — ${fmtAmount(-left)} over`)}
                    </Text>
                </Space>
            </Space>
        </Modal>
    );
};

export default SplitAccountsModal;
