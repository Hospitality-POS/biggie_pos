import React, { useEffect, useState } from "react";
import { Button, Divider, Input, InputNumber, Modal, Select, Space, Typography, message } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { productionError, saveMix, type MixIngredient, type MixOutput, type ProductionMix } from "@services/production";
import { useIngredientOptions } from "./shared";

const { Text } = Typography;

type Draft = { _id?: string; name: string; note?: string; ingredients: MixIngredient[]; outputs: MixOutput[] };
const blank = (): Draft => ({ name: "", ingredients: [{ inventory_id: "", quantity: 0 }], outputs: [{ product_id: "", quantity: 0 }] });

/**
 * A mix (production formula): what goes into one batch and what one batch
 * makes. E.g. 25 kg flour + 2 kg sugar → 200 buns + 40 loaves.
 */
const MixEditorModal: React.FC<{
    open: boolean;
    mix: ProductionMix | null;
    services: { _id: string; name: string }[];
    onClose: () => void;
    onSaved: () => void;
}> = ({ open, mix, services, onClose, onSaved }) => {
    const [draft, setDraft] = useState<Draft>(blank());
    const [saving, setSaving] = useState(false);
    const { data: ingredients = [], isFetching } = useIngredientOptions(open);

    useEffect(() => {
        if (open) setDraft(mix ? { ...mix, ingredients: mix.ingredients.map((i) => ({ ...i })), outputs: mix.outputs.map((o) => ({ ...o })) } : blank());
    }, [open, mix]);

    const setIng = (i: number, p: Partial<MixIngredient>) =>
        setDraft((d) => ({ ...d, ingredients: d.ingredients.map((x, j) => (j === i ? { ...x, ...p } : x)) }));
    const setOut = (i: number, p: Partial<MixOutput>) =>
        setDraft((d) => ({ ...d, outputs: d.outputs.map((x, j) => (j === i ? { ...x, ...p } : x)) }));

    const save = async () => {
        const body = {
            ...draft,
            name: draft.name.trim(),
            ingredients: draft.ingredients.filter((i) => i.inventory_id && i.quantity > 0),
            outputs: draft.outputs.filter((o) => o.product_id && o.quantity > 0),
        };
        if (!body.name) { message.warning("Name the mix, e.g. Daily bread"); return; }
        if (!body.ingredients.length) { message.warning("Add at least one ingredient with an amount"); return; }
        if (!body.outputs.length) { message.warning("Add at least one item it makes, with how many"); return; }
        setSaving(true);
        try {
            await saveMix(body);
            message.success("Mix saved");
            onSaved();
        } catch (err) {
            message.error(productionError(err, "Couldn't save the mix"));
        } finally {
            setSaving(false);
        }
    };

    const ingOptions = ingredients.map((o) => ({ value: o._id, label: `${o.name}${o.unit_name ? ` (${o.unit_name})` : ""}` }));
    const usedOutputs = new Set(draft.outputs.map((o) => o.product_id));

    return (
        <Modal
            open={open}
            onCancel={onClose}
            onOk={save}
            okText="Save mix"
            confirmLoading={saving}
            title={draft._id ? `Edit mix — ${mix?.name}` : "New production mix"}
            width={720}
            maskClosable={false}
            destroyOnHidden
        >
            <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
                Enter one batch: what goes in and how many items come out. Each day you choose how many batches you made.
            </Text>
            <Input
                placeholder="Mix name, e.g. Daily bread"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                style={{ marginBottom: 14 }}
            />

            <Divider orientation="left" plain style={{ margin: "6px 0 10px" }}>Ingredients for one batch</Divider>
            {draft.ingredients.map((ing, i) => {
                const opt = ingredients.find((o) => o._id === ing.inventory_id);
                return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px 32px", gap: 8, marginBottom: 8 }}>
                        <Select
                            showSearch optionFilterProp="label" loading={isFetching}
                            placeholder="Inventory item, e.g. Flour"
                            value={ing.inventory_id || undefined}
                            onChange={(v) => setIng(i, { inventory_id: v, variant_id: null })}
                            options={ingOptions}
                        />
                        {opt?.variants.length ? (
                            <Select
                                placeholder="Which one"
                                value={ing.variant_id || undefined}
                                onChange={(v) => setIng(i, { variant_id: v })}
                                options={opt.variants.map((v) => ({ value: v._id, label: v.name }))}
                            />
                        ) : <span />}
                        <InputNumber
                            min={0} style={{ width: "100%" }}
                            value={ing.quantity || null}
                            addonAfter={opt?.unit_name || undefined}
                            placeholder="Amount"
                            onChange={(v) => setIng(i, { quantity: Number(v) || 0 })}
                        />
                        <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove ingredient"
                            disabled={draft.ingredients.length === 1}
                            onClick={() => setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((_, j) => j !== i) }))} />
                    </div>
                );
            })}
            <Button size="small" icon={<PlusOutlined />} onClick={() => setDraft((d) => ({ ...d, ingredients: [...d.ingredients, { inventory_id: "", quantity: 0 }] }))}>
                Add ingredient
            </Button>

            <Divider orientation="left" plain style={{ margin: "18px 0 10px" }}>Items one batch makes</Divider>
            {draft.outputs.map((out, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 32px", gap: 8, marginBottom: 8 }}>
                    <Select
                        showSearch optionFilterProp="label"
                        placeholder="Service, e.g. White bread 400g"
                        value={out.product_id || undefined}
                        onChange={(v) => setOut(i, { product_id: v })}
                        options={services.map((s) => ({ value: s._id, label: s.name, disabled: usedOutputs.has(s._id) && s._id !== out.product_id }))}
                    />
                    <InputNumber
                        min={0} precision={0} style={{ width: "100%" }}
                        value={out.quantity || null}
                        placeholder="How many"
                        onChange={(v) => setOut(i, { quantity: Number(v) || 0 })}
                    />
                    <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove item"
                        disabled={draft.outputs.length === 1}
                        onClick={() => setDraft((d) => ({ ...d, outputs: d.outputs.filter((_, j) => j !== i) }))} />
                </div>
            ))}
            <Space direction="vertical" size={4}>
                <Button size="small" icon={<PlusOutlined />} onClick={() => setDraft((d) => ({ ...d, outputs: [...d.outputs, { product_id: "", quantity: 0 }] }))}>
                    Add item
                </Button>
                <Text type="secondary" style={{ fontSize: 12 }}>Items in a mix are counted as stock from now on.</Text>
            </Space>
        </Modal>
    );
};

export default MixEditorModal;
