import React, { useEffect, useMemo, useState } from "react";
import { Alert, DatePicker, Input, InputNumber, Modal, Select, Table, Tag, Typography, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { productionError, startRun, type ProductionMix, type ProductionRun } from "@services/production";
import { qty, stockOf, useIngredientOptions } from "./shared";

const { Text } = Typography;

/** Starts today's run from a mix × batches, showing what it needs vs stock */
const StartRunModal: React.FC<{
    open: boolean;
    mixes: ProductionMix[];
    defaultMixId?: string;
    onClose: () => void;
    onStarted: (run: ProductionRun) => void;
}> = ({ open, mixes, defaultMixId, onClose, onStarted }) => {
    const [mixId, setMixId] = useState<string | undefined>();
    const [batches, setBatches] = useState<number>(1);
    const [date, setDate] = useState<Dayjs>(dayjs());
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const { data: stock = [] } = useIngredientOptions(open);

    useEffect(() => {
        if (open) {
            setMixId(defaultMixId || mixes[0]?._id);
            setBatches(1);
            setDate(dayjs());
            setNote("");
        }
    }, [open, defaultMixId, mixes]);

    const mix = mixes.find((m) => m._id === mixId);
    const needs = useMemo(() => (mix?.ingredients || []).map((i) => {
        const opt = stock.find((s) => s._id === i.inventory_id);
        const have = stockOf(opt, i.variant_id);
        const need = i.quantity * batches;
        return { ...i, need, have, short: have != null && need > have };
    }), [mix, stock, batches]);
    const anyShort = needs.some((n) => n.short);

    const start = async () => {
        if (!mix) { message.warning("Pick a mix"); return; }
        if (!(batches > 0)) { message.warning("Batches must be more than 0"); return; }
        setSaving(true);
        try {
            const run = await startRun({ formula_id: mix._id, batches, production_date: date.format("YYYY-MM-DD"), note: note.trim() || undefined });
            message.success(`Production ${run.run_no} started`);
            onStarted(run);
        } catch (err) {
            message.error(productionError(err, "Couldn't start production"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            onOk={start}
            okText="Start production"
            confirmLoading={saving}
            title="Start production"
            width={680}
            destroyOnHidden
        >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 150px", gap: 10, marginBottom: 14 }}>
                <div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Mix</div>
                    <Select style={{ width: "100%" }} value={mixId} onChange={setMixId}
                        options={mixes.map((m) => ({ value: m._id, label: m.name }))} placeholder="Pick a mix" />
                </div>
                <div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Batches</div>
                    <InputNumber min={0.5} step={0.5} style={{ width: "100%" }} value={batches} onChange={(v) => setBatches(Number(v) || 0)} />
                </div>
                <div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Date</div>
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" allowClear={false} value={date}
                        disabledDate={(d) => d.isAfter(dayjs().add(1, "day"), "day")}
                        onChange={(d) => d && setDate(d)} />
                </div>
            </div>

            {mix && (
                <>
                    <Text strong style={{ display: "block", marginBottom: 6 }}>Ingredients needed</Text>
                    <Table
                        size="small" pagination={false} rowKey={(r) => `${r.inventory_id}-${r.variant_id || ""}`}
                        dataSource={needs}
                        columns={[
                            { title: "Ingredient", render: (_, r) => `${r.name}${r.variant_name ? ` (${r.variant_name})` : ""}` },
                            { title: "Needed", align: "right", render: (_, r) => `${qty(r.need)} ${r.unit_name || ""}` },
                            {
                                title: "In stock", align: "right",
                                render: (_, r) => r.have == null ? "—" : (
                                    <span>{qty(r.have)} {r.short && <Tag color="red" style={{ marginLeft: 4 }}>Short</Tag>}</span>
                                ),
                            },
                        ]}
                    />
                    <Text strong style={{ display: "block", margin: "14px 0 6px" }}>Expected to make</Text>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {mix.outputs.map((o) => (
                            <Tag key={o.product_id} style={{ fontSize: 13, padding: "3px 8px" }}>{qty(o.quantity * batches)} × {o.name}</Tag>
                        ))}
                    </div>
                    {anyShort && (
                        <Alert style={{ marginTop: 12 }} type="warning" showIcon
                            message="Some ingredients show less in stock than needed"
                            description="You can still start. When you complete the run, the quantities used come off stock (not below 0). Record any deliveries in Inventory to keep counts right." />
                    )}
                </>
            )}
            <Input.TextArea style={{ marginTop: 12 }} autoSize={{ minRows: 1 }} placeholder="Note (optional), e.g. Morning shift" value={note} onChange={(e) => setNote(e.target.value)} />
        </Modal>
    );
};

export default StartRunModal;
