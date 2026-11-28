import React, { useEffect, useState } from "react";
import { Alert, InputNumber, Modal, Select, Table, Typography, message } from "antd";
import {
    DAMAGE_REASONS, completeRun, productionError,
    type DamageReason, type ProductionRun,
} from "@services/production";
import { qty } from "./shared";

const { Text } = Typography;

interface OutRow { product_id: string; name: string; expected: number; good: number; damaged: number; damage_reason: DamageReason }
interface IngRow { inventory_id: string; variant_id?: string | null; name: string; unit_name?: string | null; planned: number; used: number }

/**
 * Finishes a run: how much of each ingredient was used, and of each item how
 * many came out good (added to stock) and damaged (recorded as damages).
 */
const CompleteRunModal: React.FC<{
    run: ProductionRun | null;
    onClose: () => void;
    onCompleted: (run: ProductionRun) => void;
}> = ({ run, onClose, onCompleted }) => {
    const [outs, setOuts] = useState<OutRow[]>([]);
    const [ings, setIngs] = useState<IngRow[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!run) return;
        setOuts(run.outputs.map((o) => ({ product_id: o.product_id, name: o.name, expected: o.expected, good: o.expected, damaged: 0, damage_reason: "spoilt" })));
        setIngs(run.ingredients.map((i) => ({ inventory_id: i.inventory_id, variant_id: i.variant_id, name: i.variant_name ? `${i.name} (${i.variant_name})` : i.name, unit_name: i.unit_name, planned: i.planned, used: i.planned })));
    }, [run]);

    const setOut = (i: number, p: Partial<OutRow>) => setOuts((rows) => rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
    const setIng = (i: number, used: number) => setIngs((rows) => rows.map((r, j) => (j === i ? { ...r, used } : r)));

    const totalGood = outs.reduce((n, o) => n + (o.good || 0), 0);
    const totalDamaged = outs.reduce((n, o) => n + (o.damaged || 0), 0);

    const complete = async () => {
        if (!run) return;
        if (totalGood + totalDamaged <= 0) { message.warning("Enter how many items came out"); return; }
        setSaving(true);
        try {
            const res = await completeRun(run._id, {
                ingredients: ings.map((i) => ({ inventory_id: i.inventory_id, variant_id: i.variant_id, used: i.used || 0 })),
                outputs: outs.map((o) => ({ product_id: o.product_id, good: o.good || 0, damaged: o.damaged || 0, damage_reason: o.damage_reason })),
            });
            message.success(`Production ${run.run_no} done: ${qty(totalGood)} added to stock${totalDamaged ? `, ${qty(totalDamaged)} damaged` : ""}`);
            (res.warnings || []).forEach((w) => message.warning(w, 6));
            onCompleted(res.data);
        } catch (err) {
            message.error(productionError(err, "Couldn't complete production"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={!!run}
            onCancel={onClose}
            onOk={complete}
            okText="Complete production"
            confirmLoading={saving}
            title={run ? `Complete ${run.run_no} — ${run.formula_name}${run.batches !== 1 ? ` × ${run.batches}` : ""}` : ""}
            width={760}
            maskClosable={false}
            destroyOnHidden
        >
            <Text strong style={{ display: "block", marginBottom: 6 }}>What came out</Text>
            <Table<OutRow>
                size="small" pagination={false} rowKey="product_id" dataSource={outs}
                columns={[
                    { title: "Item", dataIndex: "name" },
                    { title: "Expected", dataIndex: "expected", align: "right", width: 90, render: (v) => qty(v) },
                    {
                        title: "Good (to stock)", width: 130,
                        render: (_, r, i) => <InputNumber min={0} precision={0} style={{ width: "100%" }} value={r.good} onChange={(v) => setOut(i, { good: Number(v) || 0 })} />,
                    },
                    {
                        title: "Damaged", width: 110,
                        render: (_, r, i) => <InputNumber min={0} precision={0} style={{ width: "100%" }} value={r.damaged} onChange={(v) => setOut(i, { damaged: Number(v) || 0 })} />,
                    },
                    {
                        title: "Why damaged", width: 150,
                        render: (_, r, i) => (
                            <Select size="small" style={{ width: "100%" }} disabled={!r.damaged} value={r.damage_reason}
                                onChange={(v) => setOut(i, { damage_reason: v })} options={DAMAGE_REASONS} />
                        ),
                    },
                ]}
            />

            <Text strong style={{ display: "block", margin: "16px 0 6px" }}>Ingredients used</Text>
            <Table<IngRow>
                size="small" pagination={false} rowKey={(r) => `${r.inventory_id}-${r.variant_id || ""}`} dataSource={ings}
                columns={[
                    { title: "Ingredient", dataIndex: "name" },
                    { title: "Planned", align: "right", width: 120, render: (_, r) => `${qty(r.planned)} ${r.unit_name || ""}` },
                    {
                        title: "Actually used", width: 170,
                        render: (_, r, i) => (
                            <InputNumber min={0} style={{ width: "100%" }} value={r.used} addonAfter={r.unit_name || undefined}
                                onChange={(v) => setIng(i, Number(v) || 0)} />
                        ),
                    },
                ]}
            />

            <Alert
                style={{ marginTop: 14 }} type="info" showIcon
                message={`${qty(totalGood)} good item${totalGood === 1 ? "" : "s"} will be added to stock${totalDamaged ? ` and ${qty(totalDamaged)} recorded as damaged` : ""}.`}
                description="The ingredients used come off inventory. Damaged items are costed from this batch's ingredients."
            />
        </Modal>
    );
};

export default CompleteRunModal;
