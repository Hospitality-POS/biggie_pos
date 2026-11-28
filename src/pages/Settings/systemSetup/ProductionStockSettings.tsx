import React, { useState } from "react";
import { Alert, Button, Empty, InputNumber, Space, Spin, Table, Tag, Typography, message } from "antd";
import { ExperimentOutlined, ShopOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { fetchShop, updateShop } from "@services/shops";
import { countStock, listStockedServices, productionError, type StockedService } from "@services/production";
import { SectionLabel, ToggleRow } from "./PrivacySettings";

const { Text } = Typography;

/**
 * System Setup → Production & Stock. For shops that make items ahead, like a
 * bakery: services can be counted as stock, filled by daily production runs
 * (Services → Production) and taken down by sales and damages.
 */
const ProductionStockSettings: React.FC = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const shopId = localStorage.getItem("shopId");
    const [saving, setSaving] = useState(false);
    const [counts, setCounts] = useState<Record<string, number | null>>({});
    const [savingCount, setSavingCount] = useState<string | null>(null);

    const { data: shop, isLoading } = useQuery({
        queryKey: ["shop", shopId],
        queryFn: () => fetchShop(shopId as string),
        enabled: !!shopId,
    });
    const enabled = !!shop?.service_stock_enabled;

    const { data: stocked = [], isFetching } = useQuery({
        queryKey: ["production-stock"],
        queryFn: listStockedServices,
        enabled: enabled,
    });

    const toggle = async (checked: boolean) => {
        if (!shopId) { message.error("Shop not found"); return; }
        setSaving(true);
        try {
            await updateShop({ _id: shopId, service_stock_enabled: checked });
            queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
            message.success(checked ? "Production & Stock turned on" : "Production & Stock turned off");
        } catch (err) {
            console.error("Failed to update service_stock_enabled:", err);
        } finally {
            setSaving(false);
        }
    };

    const saveCount = async (row: StockedService) => {
        const value = counts[row._id];
        if (value == null || value < 0) return;
        setSavingCount(row._id);
        try {
            await countStock(row._id, value);
            message.success(`${row.name} count saved`);
            setCounts((c) => { const n = { ...c }; delete n[row._id]; return n; });
            queryClient.invalidateQueries({ queryKey: ["production-stock"] });
        } catch (err) {
            message.error(productionError(err, "Couldn't save the count"));
        } finally {
            setSavingCount(null);
        }
    };

    if (isLoading) {
        return <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spin size="large" /></div>;
    }

    return (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <SectionLabel text="Production & Stock" />
            <ToggleRow
                icon={<ExperimentOutlined />}
                color="#b45309"
                bg="#fef3c7"
                title={enabled ? "Services Counted as Stock" : "Services Not Counted as Stock"}
                description="For shops that make items ahead, like a bakery. Turn this on to count how many of a service are in stock. Each day, record a production run in Services → Production: the ingredients used come off inventory, the good items are added to stock, and damaged ones are recorded. Sales then take from that stock, and can't sell more than is left."
                checked={enabled}
                onChange={toggle}
                loading={saving}
            />

            {enabled && (
                <>
                    <Alert
                        type="info"
                        showIcon
                        message="How it works"
                        description={
                            <ol style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                                <li>In Services → Production, save a <b>mix</b>: the ingredients for one batch (e.g. 25 kg flour) and the items it makes (e.g. 200 buns).</li>
                                <li>Each day, start a run from the mix. When baking is done, enter how many came out good and how many were damaged.</li>
                                <li>Good items are added to stock and sold from it. Damaged ones go to Damages with the batch's cost.</li>
                            </ol>
                        }
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <Text strong>Services counted as stock</Text>
                        <Button icon={<ShopOutlined />} onClick={() => navigate(`${window.location.pathname.startsWith("/admin") ? "/admin" : ""}/store?tab=production`)}>Open Production</Button>
                    </div>
                    <Table<StockedService>
                        rowKey="_id"
                        size="small"
                        loading={isFetching}
                        dataSource={stocked}
                        pagination={false}
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="No services counted yet. Save a mix in Services → Production, or turn on “Count stock” when editing a service."
                                />
                            ),
                        }}
                        columns={[
                            { title: "Service", dataIndex: "name" },
                            {
                                title: "In stock", dataIndex: "quantity", width: 120,
                                render: (q: number, row) => (
                                    <Space size={4}>
                                        <Text strong>{q ?? 0}</Text>
                                        {row.low && <Tag color="orange">Low</Tag>}
                                    </Space>
                                ),
                            },
                            {
                                title: "Last made", key: "last", width: 150,
                                render: (_, row) => row.last_production
                                    ? `${row.last_production.good} on ${dayjs(row.last_production.date).format("DD MMM")}`
                                    : <Text type="secondary">—</Text>,
                            },
                            {
                                title: "Correct the count", key: "count", width: 220,
                                render: (_, row) => (
                                    <Space.Compact>
                                        <InputNumber
                                            min={0}
                                            precision={0}
                                            placeholder="Counted"
                                            style={{ width: 110 }}
                                            value={counts[row._id] ?? null}
                                            onChange={(v) => setCounts((c) => ({ ...c, [row._id]: v }))}
                                        />
                                        <Button
                                            disabled={counts[row._id] == null}
                                            loading={savingCount === row._id}
                                            onClick={() => saveCount(row)}
                                        >
                                            Save
                                        </Button>
                                    </Space.Compact>
                                ),
                            },
                        ]}
                    />
                </>
            )}
        </Space>
    );
};

export default ProductionStockSettings;
