/**
 * Pack pricing — suppliers usually sell by the pack/carton/crate (e.g. 60
 * sausages for Ksh 3,000), while stock and margins are tracked per item.
 * These helpers turn "packs × items per pack @ price per pack" into the
 * per-item quantity and unit price the rest of the system uses.
 */
import React, { useEffect, useState } from "react";
import { Button, Form, InputNumber, Popover, Space, Typography } from "antd";
import type { FormInstance } from "antd";
import { CalculatorOutlined } from "@ant-design/icons";

const { Text } = Typography;

/** Unit price kept to 4 decimals so qty × unit price adds back up to the pack total. */
export const packUnitPrice = (packPrice: number, perPack: number) =>
    Math.round((packPrice / perPack) * 10000) / 10000;

/** 2 decimals, up to 4 when the per-item price needs them (3000 / 7 = 428.5714) */
const ksh = (n: number) =>
    `Ksh ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

/**
 * Inline "Priced per pack" fields for a Form.List row. Fills the row's
 * quantity and unit-price fields, and records pack_count / pack_size /
 * pack_price on the row so documents can show "2 packs × 60".
 */
export const PackLineFields: React.FC<{
    listName: string;
    name: number;
    qtyKey: string;
    priceKey: string;
    /** Called with the row's form after quantity/price changed (e.g. to recalc totals) */
    onChange?: (form: FormInstance) => void;
    unitLabel?: string;
}> = ({ listName, name, qtyKey, priceKey, onChange, unitLabel = "items" }) => {
    const form = Form.useFormInstance();
    const path = (k: string) => [listName, name, k];
    const saved = {
        count: Form.useWatch(path("pack_count"), form) as number | undefined,
        size: Form.useWatch(path("pack_size"), form) as number | undefined,
        price: Form.useWatch(path("pack_price"), form) as number | undefined,
    };
    const [on, setOn] = useState(!!saved.size);
    useEffect(() => { if (saved.size) setOn(true); }, [saved.size]);

    const set = (k: "pack_count" | "pack_size" | "pack_price", v: number | null) => {
        form.setFieldValue(path(k), v ?? undefined);
        const count = k === "pack_count" ? v : saved.count;
        const size = k === "pack_size" ? v : saved.size;
        const price = k === "pack_price" ? v : saved.price;
        if (count && size) form.setFieldValue(path(qtyKey), count * size);
        if (price != null && size) form.setFieldValue(path(priceKey), packUnitPrice(price, size));
        onChange?.(form);
    };

    const turnOff = () => {
        setOn(false);
        (["pack_count", "pack_size", "pack_price"] as const).forEach((k) => form.setFieldValue(path(k), undefined));
    };

    const unit = saved.price != null && saved.size ? packUnitPrice(saved.price, saved.size) : null;
    const total = saved.count && saved.price != null ? saved.count * saved.price : null;

    return (
        <div style={{ margin: "-4px 0 12px" }}>
            {/* keep pack details on the row so they're submitted */}
            <Form.Item name={[name, "pack_count"]} hidden><InputNumber /></Form.Item>
            <Form.Item name={[name, "pack_size"]} hidden><InputNumber /></Form.Item>
            <Form.Item name={[name, "pack_price"]} hidden><InputNumber /></Form.Item>

            {!on ? (
                <Button type="link" size="small" icon={<CalculatorOutlined />} style={{ padding: 0 }} onClick={() => setOn(true)}>
                    Supplier sells by the pack? Enter pack price
                </Button>
            ) : (
                <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, padding: "8px 10px" }}>
                    <Space wrap size={[10, 6]} align="center">
                        <InputNumber size="small" min={1} precision={0} placeholder="Packs" style={{ width: 92 }}
                            addonAfter="packs" value={saved.count} onChange={(v) => set("pack_count", v)} />
                        <Text type="secondary">×</Text>
                        <InputNumber size="small" min={1} placeholder="Per pack" style={{ width: 120 }}
                            addonAfter={unitLabel} value={saved.size} onChange={(v) => set("pack_size", v)} />
                        <Text type="secondary">@</Text>
                        <InputNumber size="small" min={0} placeholder="Pack price" style={{ width: 150 }}
                            addonBefore="Ksh" value={saved.price} onChange={(v) => set("pack_price", v)} />
                        <Text type="secondary" style={{ fontSize: 12 }}>per pack</Text>
                        <Button size="small" type="text" onClick={turnOff}>Clear</Button>
                    </Space>
                    {unit != null && (
                        <div style={{ fontSize: 12, marginTop: 6 }}>
                            = <Text strong>{ksh(unit)}</Text> per {unitLabel.replace(/s$/, "")}
                            {saved.count && saved.size ? <> · {saved.count * saved.size} {unitLabel}</> : null}
                            {total != null ? <> · line total <Text strong>{ksh(total)}</Text></> : null}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Small "per pack" calculator for table cells: enter the pack price and items
 * per pack, get the per-item price back.
 */
export const PackPricePopover: React.FC<{
    onApply: (unitPrice: number, pack: { size: number; price: number }) => void;
    initialSize?: number;
}> = ({ onApply, initialSize }) => {
    const [open, setOpen] = useState(false);
    const [price, setPrice] = useState<number | null>(null);
    const [size, setSize] = useState<number | null>(initialSize ?? null);
    const unit = price != null && size ? packUnitPrice(price, size) : null;
    return (
        <Popover
            open={open}
            onOpenChange={setOpen}
            trigger="click"
            title="Price per pack"
            content={
                <div style={{ width: 240 }}>
                    <Space direction="vertical" style={{ width: "100%" }} size={8}>
                        <InputNumber autoFocus min={0} addonBefore="Ksh" placeholder="Pack price" style={{ width: "100%" }}
                            value={price} onChange={(v) => setPrice(v)} />
                        <InputNumber min={1} addonAfter="items / pack" placeholder="Items in pack" style={{ width: "100%" }}
                            value={size} onChange={(v) => setSize(v)} />
                        <Text style={{ fontSize: 12 }}>
                            {unit != null ? <>= <Text strong>{ksh(unit)}</Text> per item</> : "Enter both to get the per-item price"}
                        </Text>
                        <Button type="primary" size="small" block disabled={unit == null}
                            onClick={() => { onApply(unit!, { size: size!, price: price! }); setOpen(false); }}>
                            Use this price
                        </Button>
                    </Space>
                </div>
            }
        >
            <Button size="small" type="link" icon={<CalculatorOutlined />} style={{ padding: "0 4px" }}>per pack</Button>
        </Popover>
    );
};
