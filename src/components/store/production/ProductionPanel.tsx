import React, { useState } from "react";
import { Button, Card, Empty, Popconfirm, Segmented, Space, Table, Tag, Typography, message } from "antd";
import { CheckOutlined, DeleteOutlined, EditOutlined, ExperimentOutlined, PlayCircleOutlined, PlusOutlined, StopOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
    cancelRun, deleteMix, listMixes, listRuns, listStockedServices, productionError,
    type ProductionMix, type ProductionRun, type RunStatus,
} from "@services/production";
import MixEditorModal from "./MixEditorModal";
import StartRunModal from "./StartRunModal";
import CompleteRunModal from "./CompleteRunModal";
import { PRODUCTION_KEYS, money, qty } from "./shared";

const { Text } = Typography;

const STATUS: Record<RunStatus, { label: string; color: string }> = {
    in_progress: { label: "In progress", color: "gold" },
    completed: { label: "Completed", color: "green" },
    cancelled: { label: "Cancelled", color: "default" },
};

/**
 * Services → Production (shown when Production & Stock is on): today's stock
 * and runs, the run history, and the mixes runs are made from.
 */
const ProductionPanel: React.FC<{ services: { _id: string; name: string; is_disabled?: boolean }[] }> = ({ services }) => {
    const queryClient = useQueryClient();
    const [view, setView] = useState<"today" | "runs" | "mixes">("today");
    const [mixEditor, setMixEditor] = useState<{ open: boolean; mix: ProductionMix | null }>({ open: false, mix: null });
    const [startOpen, setStartOpen] = useState<{ open: boolean; mixId?: string }>({ open: false });
    const [completing, setCompleting] = useState<ProductionRun | null>(null);

    const { data: mixes = [], isFetching: mixesLoading } = useQuery({ queryKey: PRODUCTION_KEYS.mixes, queryFn: listMixes });
    const { data: stock = [], isFetching: stockLoading } = useQuery({ queryKey: PRODUCTION_KEYS.stock, queryFn: listStockedServices });
    const { data: openRuns } = useQuery({
        queryKey: [...PRODUCTION_KEYS.runs, "in_progress"],
        queryFn: () => listRuns({ status: "in_progress", limit: 50 }),
    });
    const { data: history, isFetching: historyLoading } = useQuery({
        queryKey: [...PRODUCTION_KEYS.runs, "history"],
        queryFn: () => listRuns({ limit: 100 }),
        enabled: view === "runs",
    });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: PRODUCTION_KEYS.runs });
        queryClient.invalidateQueries({ queryKey: PRODUCTION_KEYS.stock });
        queryClient.invalidateQueries({ queryKey: PRODUCTION_KEYS.mixes });
        queryClient.invalidateQueries({ queryKey: ["production-ingredients"] });
    };

    const cancel = async (run: ProductionRun) => {
        try {
            await cancelRun(run._id);
            message.success(`${run.run_no} cancelled`);
            refresh();
        } catch (err) {
            message.error(productionError(err, "Couldn't cancel the run"));
        }
    };

    const removeMix = async (mix: ProductionMix) => {
        try {
            await deleteMix(mix._id);
            message.success("Mix removed");
            refresh();
        } catch (err) {
            message.error(productionError(err, "Couldn't remove the mix"));
        }
    };

    const startButton = (
        <Button type="primary" icon={<PlayCircleOutlined />} disabled={!mixes.length}
            onClick={() => setStartOpen({ open: true })}>
            Start production
        </Button>
    );

    const runColumns = [
        { title: "Run", dataIndex: "run_no", width: 140, render: (v: string) => <Text strong>{v}</Text> },
        { title: "Date", dataIndex: "production_date", width: 110, render: (v: string) => dayjs(v).format("DD MMM YYYY") },
        {
            title: "Mix", key: "mix",
            render: (_: unknown, r: ProductionRun) => `${r.formula_name}${r.batches !== 1 ? ` × ${qty(r.batches)}` : ""}`,
        },
        {
            title: "Made", key: "made",
            render: (_: unknown, r: ProductionRun) => r.status === "completed"
                ? <span>{qty(r.total_good)} good{r.total_damaged ? <Text type="danger">, {qty(r.total_damaged)} damaged</Text> : null}</span>
                : <Text type="secondary">{r.outputs.map((o) => `${qty(o.expected)} ${o.name}`).join(", ")} expected</Text>,
        },
        { title: "Cost / item", key: "cost", width: 120, align: "right" as const, render: (_: unknown, r: ProductionRun) => money(r.unit_cost) },
        { title: "Status", dataIndex: "status", width: 110, render: (s: RunStatus) => <Tag color={STATUS[s].color}>{STATUS[s].label}</Tag> },
        {
            key: "actions", width: 200,
            render: (_: unknown, r: ProductionRun) => r.status === "in_progress" ? (
                <Space>
                    <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => setCompleting(r)}>Complete</Button>
                    <Popconfirm title={`Cancel ${r.run_no}?`} description="Nothing has come off stock yet." onConfirm={() => cancel(r)}>
                        <Button size="small" icon={<StopOutlined />}>Cancel</Button>
                    </Popconfirm>
                </Space>
            ) : null,
        },
    ];

    const runDetail = (r: ProductionRun) => (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13 }}>
            <div>
                <Text strong>Items</Text>
                {r.outputs.map((o) => (
                    <div key={o.product_id}>
                        {o.name}: {r.status === "completed" ? `${qty(o.good)} good${o.damaged ? `, ${qty(o.damaged)} damaged` : ""} (expected ${qty(o.expected)})` : `${qty(o.expected)} expected`}
                    </div>
                ))}
            </div>
            <div>
                <Text strong>Ingredients</Text>
                {r.ingredients.map((i) => (
                    <div key={`${i.inventory_id}-${i.variant_id || ""}`}>
                        {i.name}{i.variant_name ? ` (${i.variant_name})` : ""}: {r.status === "completed" ? `${qty(i.used)} used` : `${qty(i.planned)} planned`} {i.unit_name || ""}
                    </div>
                ))}
                {r.status === "completed" && <div style={{ marginTop: 4 }}>Ingredient cost: {money(r.ingredient_cost)}</div>}
            </div>
            {(r.note || r.created_by_name) && (
                <Text type="secondary" style={{ gridColumn: "1 / -1" }}>
                    {r.created_by_name ? `Started by ${r.created_by_name}` : ""}{r.completed_by_name ? ` · completed by ${r.completed_by_name}` : ""}{r.note ? ` · ${r.note}` : ""}
                </Text>
            )}
        </div>
    );

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                <Segmented
                    value={view}
                    onChange={(v) => setView(v as typeof view)}
                    options={[
                        { value: "today", label: "Today" },
                        { value: "runs", label: "Production runs" },
                        { value: "mixes", label: `Mixes (${mixes.length})` },
                    ]}
                />
                {view === "mixes"
                    ? <Button type="primary" icon={<PlusOutlined />} onClick={() => setMixEditor({ open: true, mix: null })}>New mix</Button>
                    : startButton}
            </div>

            {view === "today" && (
                <>
                    {!mixes.length && !mixesLoading && (
                        <Card size="small" style={{ marginBottom: 14, background: "#fffbeb", borderColor: "#fde68a" }}>
                            <Space direction="vertical" size={6}>
                                <Text strong><ExperimentOutlined /> Start by saving a mix</Text>
                                <Text>A mix is one batch: its ingredients (e.g. 25 kg flour, 2 kg sugar) and what it makes (e.g. 200 buns).</Text>
                                <Button size="small" icon={<PlusOutlined />} onClick={() => setMixEditor({ open: true, mix: null })}>New mix</Button>
                            </Space>
                        </Card>
                    )}

                    {!!openRuns?.data.length && (
                        <>
                            <Text strong style={{ display: "block", marginBottom: 8 }}>In progress</Text>
                            <Table<ProductionRun> rowKey="_id" size="small" pagination={false} style={{ marginBottom: 18 }}
                                dataSource={openRuns.data} columns={runColumns} />
                        </>
                    )}

                    <Text strong style={{ display: "block", marginBottom: 8 }}>In stock</Text>
                    {stock.length ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
                            {stock.map((s) => (
                                <Card key={s._id} size="small" loading={stockLoading}
                                    style={{ borderColor: s.quantity <= 0 ? "#fecaca" : s.low ? "#fed7aa" : undefined }}>
                                    <Text style={{ fontSize: 12, color: "#64748b" }} ellipsis>{s.name}</Text>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: s.quantity <= 0 ? "#dc2626" : s.low ? "#ea580c" : "#0f172a" }}>
                                        {qty(s.quantity)}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {s.quantity <= 0 ? "Sold out" : s.low ? "Running low" : s.last_production ? `Last made ${dayjs(s.last_production.date).format("DD MMM")}` : "In stock"}
                                    </Text>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No items counted as stock yet. Save a mix to start." />
                    )}
                </>
            )}

            {view === "runs" && (
                <Table<ProductionRun>
                    rowKey="_id" size="small" loading={historyLoading}
                    dataSource={history?.data || []}
                    columns={runColumns}
                    expandable={{ expandedRowRender: runDetail }}
                    locale={{ emptyText: "No production recorded yet." }}
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 900 }}
                />
            )}

            {view === "mixes" && (
                <Table<ProductionMix>
                    rowKey="_id" size="small" loading={mixesLoading} pagination={false}
                    dataSource={mixes}
                    locale={{ emptyText: "No mixes yet." }}
                    columns={[
                        { title: "Mix", dataIndex: "name", render: (v: string) => <Text strong>{v}</Text> },
                        {
                            title: "One batch uses", key: "in",
                            render: (_, m) => m.ingredients.map((i) => `${qty(i.quantity)} ${i.unit_name || ""} ${i.name}`.replace(/\s+/g, " ")).join(", "),
                        },
                        { title: "And makes", key: "out", render: (_, m) => m.outputs.map((o) => `${qty(o.quantity)} ${o.name}`).join(", ") },
                        {
                            key: "actions", width: 220,
                            render: (_, m) => (
                                <Space>
                                    <Button size="small" icon={<PlayCircleOutlined />} onClick={() => setStartOpen({ open: true, mixId: m._id })}>Start</Button>
                                    <Button size="small" icon={<EditOutlined />} onClick={() => setMixEditor({ open: true, mix: m })} aria-label="Edit mix" />
                                    <Popconfirm title={`Remove ${m.name}?`} description="Past runs keep their record." onConfirm={() => removeMix(m)}>
                                        <Button size="small" danger icon={<DeleteOutlined />} aria-label="Remove mix" />
                                    </Popconfirm>
                                </Space>
                            ),
                        },
                    ]}
                />
            )}

            <MixEditorModal
                open={mixEditor.open}
                mix={mixEditor.mix}
                services={services.filter((s) => !s.is_disabled)}
                onClose={() => setMixEditor({ open: false, mix: null })}
                onSaved={() => { setMixEditor({ open: false, mix: null }); refresh(); }}
            />
            <StartRunModal
                open={startOpen.open}
                mixes={mixes}
                defaultMixId={startOpen.mixId}
                onClose={() => setStartOpen({ open: false })}
                onStarted={() => { setStartOpen({ open: false }); refresh(); setView("today"); }}
            />
            <CompleteRunModal
                run={completing}
                onClose={() => setCompleting(null)}
                onCompleted={() => { setCompleting(null); refresh(); }}
            />
        </div>
    );
};

export default ProductionPanel;
