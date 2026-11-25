import React, { useMemo, useState } from "react";
import { Button, Card, Empty, Input, Modal, Select, Space, Statistic, Switch, Table, Tag, Tooltip, Typography, message } from "antd";
import { StopOutlined, WarningOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import PeriodFilter, { defaultPeriod, periodRange, type PeriodValue } from "@components/PeriodFilter";
import { DAMAGE_REASONS, fetchDamages, reasonLabel, voidDamage, type Damage, type DamageItemType } from "@services/damages";

const { Text } = Typography;
const kes = (n: number) => `KES ${(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  palette: { primary: string; subText: string; border: string };
  searchTerm?: string;
  isAdmin: boolean;
}

// Services → Damages: services and inventory items damaged, why, and what it cost
const DamagesPanel: React.FC<Props> = ({ palette, searchTerm = "", isAdmin }) => {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<PeriodValue>(defaultPeriod);
  const [reason, setReason] = useState<string | undefined>();
  const [itemType, setItemType] = useState<DamageItemType | undefined>();
  const [showVoided, setShowVoided] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Damage | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const [from, to] = periodRange(period);
  const params = {
    start: from.format("YYYY-MM-DD"),
    end: to.format("YYYY-MM-DD"),
    reason,
    item_type: itemType,
    include_voided: showVoided,
  };
  const { data, isLoading } = useQuery({
    queryKey: ["damages", params],
    queryFn: () => fetchDamages(params),
  });

  const rows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (data?.data || []).filter((r) => !q || r.product_name.toLowerCase().includes(q));
  }, [data, searchTerm]);
  const s = data?.summary;

  const handleVoid = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      const res = await voidDamage(voidTarget._id, voidReason.trim() || undefined);
      message.success("Damage voided. The ingredients are back in stock.");
      if (res.warning) message.warning(res.warning, 6);
      setVoidTarget(null);
      setVoidReason("");
      queryClient.invalidateQueries({ queryKey: ["damages"] });
    } catch (e: any) {
      message.error(e?.message || "Failed to void damage");
    } finally {
      setVoiding(false);
    }
  };

  const columns = [
    {
      title: "When", dataIndex: "damaged_at", width: 130,
      render: (d: string) => <span style={{ fontSize: 12 }}>{dayjs(d).format("DD MMM YYYY, HH:mm")}</span>,
    },
    {
      title: "Item", dataIndex: "product_name",
      render: (n: string, r: Damage) => (
        <div>
          <Text strong style={{ fontSize: 12, textDecoration: r.status === "voided" ? "line-through" : undefined }}>
            {r.variant_name ? `${n} (${r.variant_name})` : n}
          </Text>
          <Tag style={{ marginLeft: 6, fontSize: 10, lineHeight: "16px" }} color={r.item_type === "inventory" ? "blue" : "geekblue"}>
            {r.item_type === "inventory" ? "Inventory" : "Service"}
          </Tag>
          {r.note && <div style={{ fontSize: 11, color: palette.subText }}>{r.note}</div>}
          {r.status === "voided" && (
            <div style={{ fontSize: 11, color: "#dc2626" }}>
              Voided by {r.voided_by_name || "admin"}{r.void_reason ? ` — ${r.void_reason}` : ""}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Qty", dataIndex: "quantity", width: 80, align: "right" as const,
      render: (q: number, r: Damage) => <span style={{ fontSize: 12 }}>{q}{r.unit_name ? ` ${r.unit_name}` : ""}</span>,
    },
    {
      title: "Reason", dataIndex: "reason", width: 140,
      render: (v: string) => <Tag color={DAMAGE_REASONS.find((x) => x.value === v)?.color}>{reasonLabel(v)}</Tag>,
    },
    {
      title: "Stock used", dataIndex: "ingredients",
      render: (ings: Damage["ingredients"], r: Damage) => r.item_type === "inventory"
        ? <Text type="secondary" style={{ fontSize: 11 }}>The item itself</Text>
        : ings?.length
          ? <span style={{ fontSize: 11 }}>{ings.map((i) => `${i.name} ${Math.round(i.quantity * 1000) / 1000}`).join(", ")}</span>
          : <Text type="secondary" style={{ fontSize: 11 }}>No recipe</Text>,
    },
    {
      title: "Cost", dataIndex: "value_at_cost", width: 120, align: "right" as const,
      render: (v: number | null, r: Damage) => v != null ? (
        <Tooltip title={r.cost_source === "recipe" ? "From recipe buying prices" : r.cost_source === "buying_price" ? "From the item's buying price" : "Typed in"}>
          <span style={{ fontSize: 12 }}>{kes(v)}</span>
        </Tooltip>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: "Sales value", dataIndex: "value_at_price", width: 120, align: "right" as const,
      render: (v: number) => <span style={{ fontSize: 12 }}>{kes(v)}</span>,
    },
    { title: "Recorded by", dataIndex: "recorded_by_name", width: 110, render: (v: string) => <span style={{ fontSize: 12 }}>{v || "—"}</span> },
    ...(isAdmin ? [{
      title: "", key: "actions", width: 70,
      render: (_: any, r: Damage) => r.status === "active" ? (
        <Tooltip title="Void (puts the stock back)">
          <Button size="small" danger type="text" icon={<StopOutlined />} onClick={() => setVoidTarget(r)} />
        </Tooltip>
      ) : null,
    }] : []),
  ];

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Space wrap>
          <PeriodFilter value={period} onChange={setPeriod} />
          <Select
            allowClear
            placeholder="Services & inventory"
            style={{ width: 180 }}
            value={itemType}
            onChange={setItemType}
            options={[
              { label: "Services only", value: "product" },
              { label: "Inventory only", value: "inventory" },
            ]}
          />
          <Select
            allowClear
            placeholder="All reasons"
            style={{ width: 170 }}
            value={reason}
            onChange={setReason}
            options={DAMAGE_REASONS.map((r) => ({ label: r.label, value: r.value }))}
          />
        </Space>
        <Space>
          <Text style={{ fontSize: 12, color: palette.subText }}>Show voided</Text>
          <Switch size="small" checked={showVoided} onChange={setShowVoided} />
        </Space>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 12 }}>
        <Card size="small"><Statistic title="Damages" value={s?.count || 0} /></Card>
        <Card size="small"><Statistic title="Items damaged" value={s?.quantity || 0} /></Card>
        <Card size="small"><Statistic title="Cost lost" value={kes(s?.value_at_cost || 0)} valueStyle={{ color: "#dc2626", fontSize: 18 }} /></Card>
        <Card size="small"><Statistic title="Sales value lost" value={kes(s?.value_at_price || 0)} valueStyle={{ fontSize: 18 }} /></Card>
      </div>

      {!!s?.by_reason?.length && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          <Text style={{ fontSize: 12, color: palette.subText }}>By reason:</Text>
          {s.by_reason.map((g) => (
            <Tag key={g.key} color={DAMAGE_REASONS.find((x) => x.value === g.key)?.color}>
              {g.label}: {g.quantity} · {kes(g.value_at_cost || g.value_at_price)}
            </Tag>
          ))}
        </div>
      )}
      {!!s?.by_product?.length && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: palette.subText }}>Most damaged:</Text>
          {s.by_product.slice(0, 5).map((g) => (
            <Tag key={g.key}>{g.label}: {g.quantity}</Tag>
          ))}
        </div>
      )}

      <Table<Damage>
        rowKey="_id"
        size="small"
        loading={isLoading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        scroll={{ x: 900 }}
        locale={{
          emptyText: (
            <Empty
              image={<WarningOutlined style={{ fontSize: 32, color: "#cbd5e1" }} />}
              description="No damages in this period. Record one with the ⚠ button on an item in Services or Inventory."
            />
          ),
        }}
      />

      <Modal
        open={!!voidTarget}
        title={`Void damage — ${voidTarget?.quantity} × ${voidTarget?.product_name}`}
        okText="Void"
        okButtonProps={{ danger: true }}
        confirmLoading={voiding}
        onOk={handleVoid}
        onCancel={() => { setVoidTarget(null); setVoidReason(""); }}
        destroyOnClose
      >
        <p style={{ fontSize: 13 }}>
          The ingredients go back into stock{voidTarget?.journal_entry_id ? " and the accounting write-off is reversed" : ""}. The entry stays in the report as voided.
        </p>
        <Input
          placeholder="Why? e.g. Recorded twice"
          value={voidReason}
          maxLength={300}
          onChange={(e) => setVoidReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default DamagesPanel;
