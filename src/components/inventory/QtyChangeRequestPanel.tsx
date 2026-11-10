import React, { useEffect, useMemo, useState } from "react";
import { Form, Input, InputNumber, Segmented, Space, Tag, Typography } from "antd";
import type { FormInstance } from "antd";
import { ArrowRightOutlined, ClockCircleOutlined, LockOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { fetchQtyRequests } from "@services/inventoryQtyRequests";

const { Text } = Typography;

// Shown in the item form instead of editable quantities when the shop needs
// admin approval for quantity edits and the user isn't an admin. The user
// asks for new stock (add, remove or set) with a reason. The asked-for
// numbers go on the form — `requested_quantity` for a plain item,
// `requested_variant_quantities` ({ variant key: qty }) for an item with
// variants — and are sent as the item's quantities; the API holds them as a
// request and stock changes once an admin approves it.

type Mode = "set" | "add" | "remove";

export interface PanelVariant {
    /** The form's key for the variant (its id) */
    key: string;
    name: string;
    quantity: number;
}

interface Props {
    form: FormInstance;
    inventoryId?: string;
    currentQuantity: number;
    unit?: string;
    /** Set for an item with variants: one request line per variant */
    variants?: PanelVariant[];
}

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

const apply = (mode: Mode, current: number, amount: number | null | undefined) =>
    amount === null || amount === undefined ? null
        : mode === "set" ? amount
            : mode === "add" ? current + amount
                : Math.max(0, current - amount);

const DeltaTag: React.FC<{ delta: number }> = ({ delta }) =>
    delta ? <Tag color={delta > 0 ? "green" : "red"} style={{ margin: 0 }}>{delta > 0 ? "+" : ""}{fmt(delta)}</Tag> : null;

const QtyChangeRequestPanel: React.FC<Props> = ({ form, inventoryId, currentQuantity, unit, variants }) => {
    const byVariant = !!variants?.length;
    const [mode, setMode] = useState<Mode>("add");
    const [amount, setAmount] = useState<number | null>(null);
    const [amounts, setAmounts] = useState<Record<string, number | null>>({});

    const { data } = useQuery({
        queryKey: ["inventory-qty-requests", "item", inventoryId],
        queryFn: () => fetchQtyRequests({ inventory_id: inventoryId, status: "Pending" }),
        enabled: !!inventoryId,
    });
    const pending = data?.requests?.[0];

    // Plain item
    const requested = apply(mode, currentQuantity, amount);

    // Per variant: only the ones that change
    const variantRequests = useMemo(() => {
        const out: Record<string, number> = {};
        (variants || []).forEach((v) => {
            const next = apply(mode, v.quantity, amounts[v.key]);
            if (next !== null && next !== v.quantity) out[v.key] = next;
        });
        return out;
    }, [variants, amounts, mode]);

    const totalAfter = byVariant
        ? (variants || []).reduce((s, v) => s + (variantRequests[v.key] ?? v.quantity), 0)
        : requested ?? currentQuantity;
    const delta = totalAfter - currentQuantity;
    const changed = byVariant ? Object.keys(variantRequests).length > 0 : requested !== null && requested !== currentQuantity;

    useEffect(() => {
        if (byVariant) {
            form.setFieldValue("requested_variant_quantities", Object.keys(variantRequests).length ? variantRequests : null);
            form.setFieldValue("requested_quantity", null);
        } else {
            form.setFieldValue("requested_quantity", changed ? requested : null);
            form.setFieldValue("requested_variant_quantities", null);
        }
    }, [form, byVariant, variantRequests, requested, changed]);

    const modeLabel = mode === "set" ? "New quantity" : mode === "add" ? "Add" : "Remove";

    return (
        <div
            style={{
                border: "1px solid #fde68a",
                background: "linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 16,
            }}
        >
            <Space align="center" style={{ marginBottom: 10 }}>
                <span
                    style={{
                        width: 30, height: 30, borderRadius: 8, background: "#fef3c7", color: "#d97706",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}
                >
                    <LockOutlined />
                </span>
                <div>
                    <Text strong style={{ display: "block", fontSize: 14 }}>Request a stock change</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Quantity changes need an admin's approval. Stock updates as soon as it's approved.
                    </Text>
                </div>
            </Space>

            {pending && (
                <div
                    style={{
                        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                        background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8,
                        padding: "8px 10px", marginBottom: 12,
                    }}
                >
                    <ClockCircleOutlined style={{ color: "#ea580c" }} />
                    <Text style={{ fontSize: 12 }}>
                        Waiting for approval:{" "}
                        {pending.variant_changes?.length
                            ? pending.variant_changes.map((c) => `${c.name} ${fmt(c.old_quantity)} → ${fmt(c.new_quantity)}`).join(", ")
                            : <>{fmt(pending.old_quantity ?? 0)} → <Text strong>{fmt(pending.new_quantity ?? 0)}</Text></>}
                        {" "}· {pending.requested_by_name || "staff"} · {dayjs(pending.createdAt).format("DD MMM HH:mm")}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>A new request from you replaces your earlier one.</Text>
                </div>
            )}

            <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Change</Text>
                <Segmented
                    value={mode}
                    onChange={(v) => setMode(v as Mode)}
                    options={[
                        { label: "Add stock", value: "add" },
                        { label: "Remove", value: "remove" },
                        { label: "Set to", value: "set" },
                    ]}
                />
            </div>

            {byVariant ? (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                    <div
                        style={{
                            display: "grid", gridTemplateColumns: "1.6fr 0.8fr 1.2fr 1fr", gap: 8,
                            padding: "6px 12px", background: "#f8fafc", fontSize: 11, color: "#64748b", fontWeight: 600,
                        }}
                    >
                        <span>VARIANT</span><span>NOW</span><span>{modeLabel.toUpperCase()}</span><span>AFTER</span>
                    </div>
                    {(variants || []).map((v) => {
                        const next = variantRequests[v.key];
                        return (
                            <div
                                key={v.key}
                                style={{
                                    display: "grid", gridTemplateColumns: "1.6fr 0.8fr 1.2fr 1fr", gap: 8,
                                    alignItems: "center", padding: "8px 12px", borderTop: "1px solid #f1f5f9",
                                }}
                            >
                                <Text style={{ fontSize: 13 }} ellipsis={{ tooltip: v.name }}>{v.name}</Text>
                                <Text style={{ fontSize: 13 }}>{fmt(v.quantity)}</Text>
                                <InputNumber
                                    size="small"
                                    min={0}
                                    placeholder="0"
                                    style={{ width: "100%" }}
                                    value={amounts[v.key] ?? null}
                                    onChange={(val) => setAmounts((p) => ({ ...p, [v.key]: val === null ? null : Number(val) }))}
                                />
                                <Space size={4}>
                                    <Text strong style={{ fontSize: 13, color: next !== undefined ? "#d97706" : "#94a3b8" }}>
                                        {fmt(next ?? v.quantity)}
                                    </Text>
                                    {next !== undefined && <DeltaTag delta={next - v.quantity} />}
                                </Space>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ maxWidth: 260 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                        {mode === "set" ? "New quantity" : mode === "add" ? "Quantity to add" : "Quantity to remove"}
                    </Text>
                    <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        placeholder="0"
                        value={amount}
                        onChange={(val) => setAmount(val === null ? null : Number(val))}
                        addonAfter={unit || undefined}
                    />
                </div>
            )}

            <div
                style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
                    background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
                    padding: "10px 12px", margin: "12px 0",
                }}
            >
                <div style={{ textAlign: "center" }}>
                    <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{byVariant ? "TOTAL NOW" : "NOW"}</Text>
                    <Text strong style={{ fontSize: 20 }}>{fmt(currentQuantity)}</Text>
                </div>
                <ArrowRightOutlined style={{ color: "#94a3b8" }} />
                <div style={{ textAlign: "center" }}>
                    <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                        {byVariant ? "TOTAL AFTER APPROVAL" : "AFTER APPROVAL"}
                    </Text>
                    <Text strong style={{ fontSize: 20, color: changed ? "#d97706" : "#94a3b8" }}>
                        {changed ? fmt(totalAfter) : "—"}
                    </Text>
                </div>
                {changed && <DeltaTag delta={delta} />}
            </div>

            <Form.Item
                name="qty_change_reason"
                label="Reason"
                style={{ marginBottom: 0 }}
                rules={[{ required: changed, message: "Say why the stock is changing" }]}
            >
                <Input placeholder="e.g. Delivery from supplier, stock count, damaged items" maxLength={200} />
            </Form.Item>
        </div>
    );
};

export default QtyChangeRequestPanel;
