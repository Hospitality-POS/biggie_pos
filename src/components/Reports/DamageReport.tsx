import React, { useRef, useState } from "react";
import { Button, Empty, Input, Modal, Space, Spin, Table, Tag, Tooltip, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined, PrinterFilled, StopOutlined, WarningOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import {
  DAMAGE_REASONS,
  fetchDamages,
  reasonLabel,
  voidDamage,
  type Damage,
  type DamageGroup,
  type DamageItemType,
} from "@services/damages";
import useSystemDetails from "@hooks/useSystemDetails";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;
const C = THEME_C;

const kes = (n: number | null | undefined) =>
  `KES ${Number(n ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qty = (n: number) => String(Math.round(n * 1000) / 1000);
const fmtDate = (d?: string) => (d ? dayjs(d).format("DD MMM YYYY") : "—");
const reasonColor = (r: string) => DAMAGE_REASONS.find((x) => x.value === r)?.color;
const itemName = (r: Damage) => (r.variant_name ? `${r.product_name} (${r.variant_name})` : r.product_name);

const downloadCsv = (filename: string, rows: Record<string, any>[]) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Reports → Duka → Damages: services and inventory items recorded as
// damaged, spoilt or expired in the period — what, why, and what it cost.
// Admins can void a wrong entry here (puts the stock back).
const DamageReportModal: React.FC<{
  openM: boolean;
  onCloseM: () => void;
  startDate: string;
  endDate: string;
  shopId?: string;
  itemType?: DamageItemType;
  reason?: string;
  includeVoided?: boolean;
  isAdmin?: boolean;
}> = ({ openM, onCloseM, startDate, endDate, shopId, itemType, reason, includeVoided, isAdmin }) => {
  const { BRAND_NAME1 } = useSystemDetails();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [voidTarget, setVoidTarget] = useState<Damage | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const params = {
    shop_id: shopId,
    start: startDate ? dayjs(startDate).format("YYYY-MM-DD") : undefined,
    end: endDate ? dayjs(endDate).format("YYYY-MM-DD") : undefined,
    item_type: itemType,
    reason,
    include_voided: includeVoided,
  };
  const { data, isLoading } = useQuery({
    queryKey: ["damages", params],
    queryFn: () => fetchDamages(params),
    enabled: openM && !!startDate && !!endDate,
  });
  const print = useReactToPrint({ content: () => printRef.current });

  const rows = data?.data ?? [];
  const s = data?.summary;
  const hasData = rows.length > 0;

  const exportCsv = () => {
    downloadCsv(`Damages_${dayjs().format("YYYY-MM-DD")}.csv`, rows.map((r) => ({
      "Date": dayjs(r.damaged_at).format("YYYY-MM-DD HH:mm"),
      "Type": r.item_type === "inventory" ? "Inventory" : "Service",
      "Item": itemName(r),
      "Quantity": r.quantity,
      "Unit": r.unit_name || "",
      "Reason": reasonLabel(r.reason),
      "Note": r.note || "",
      "Stock used": r.item_type === "inventory" ? "The item itself" : (r.ingredients || []).map((i) => `${i.name} ${qty(i.quantity)}`).join("; "),
      "Cost": r.value_at_cost ?? "",
      "Sales value": r.value_at_price,
      "Recorded by": r.recorded_by_name || "",
      "Status": r.status === "voided" ? `Voided${r.void_reason ? `: ${r.void_reason}` : ""}` : "Active",
    })));
  };

  const handleVoid = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      const res = await voidDamage(voidTarget._id, voidReason.trim() || undefined);
      message.success("Damage voided. The stock is back.");
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

  const groupColumns = (first: string): ColumnsType<DamageGroup> => [
    {
      title: first, dataIndex: "label",
      render: (v, g) => first === "Reason" ? <Tag color={reasonColor(g.key)}>{v}</Tag> : <Text strong>{v}</Text>,
    },
    { title: "Times", dataIndex: "count", align: "right" },
    { title: "Quantity", dataIndex: "quantity", align: "right", render: (v) => qty(v) },
    { title: "Cost", dataIndex: "value_at_cost", align: "right", render: (v) => <Text strong style={{ color: C.red }}>{kes(v)}</Text> },
    { title: "Sales value", dataIndex: "value_at_price", align: "right", render: (v) => kes(v) },
  ];

  const columns: ColumnsType<Damage> = [
    { title: "Date", dataIndex: "damaged_at", width: 120, render: (d) => <Text style={{ fontSize: 12 }}>{dayjs(d).format("DD MMM YYYY, HH:mm")}</Text> },
    {
      title: "Item", key: "item",
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 12, textDecoration: r.status === "voided" ? "line-through" : undefined }}>{itemName(r)}</Text>
          <Tag style={{ marginLeft: 6, fontSize: 10, lineHeight: "16px" }} color={r.item_type === "inventory" ? "blue" : "geekblue"}>
            {r.item_type === "inventory" ? "Inventory" : "Service"}
          </Tag>
          {r.note && <Text type="secondary" style={{ display: "block", fontSize: 11 }}>{r.note}</Text>}
          {r.status === "voided" && (
            <Text style={{ display: "block", fontSize: 11, color: C.red }}>
              Voided by {r.voided_by_name || "admin"}{r.void_reason ? ` — ${r.void_reason}` : ""}
            </Text>
          )}
        </div>
      ),
    },
    { title: "Qty", dataIndex: "quantity", align: "right", width: 80, render: (v, r) => `${qty(v)}${r.unit_name ? ` ${r.unit_name}` : ""}` },
    { title: "Reason", dataIndex: "reason", width: 140, render: (v) => <Tag color={reasonColor(v)}>{reasonLabel(v)}</Tag> },
    {
      title: "Stock used", dataIndex: "ingredients",
      render: (ings: Damage["ingredients"], r) => r.item_type === "inventory"
        ? <Text type="secondary" style={{ fontSize: 11 }}>The item itself</Text>
        : ings?.length
          ? <Text style={{ fontSize: 11 }}>{ings.map((i) => `${i.name} ${qty(i.quantity)}`).join(", ")}</Text>
          : <Text type="secondary" style={{ fontSize: 11 }}>No recipe</Text>,
    },
    {
      title: "Cost", dataIndex: "value_at_cost", align: "right", width: 120,
      render: (v, r) => v != null ? (
        <Tooltip title={r.cost_source === "recipe" ? "From recipe buying prices" : r.cost_source === "buying_price" ? "From the item's buying price" : "Typed in"}>
          <Text strong style={{ color: C.red, fontSize: 12 }}>{kes(v)}</Text>
        </Tooltip>
      ) : <Text type="secondary">—</Text>,
    },
    { title: "Sales value", dataIndex: "value_at_price", align: "right", width: 120, render: (v) => <Text style={{ fontSize: 12 }}>{kes(v)}</Text> },
    { title: "Recorded by", dataIndex: "recorded_by_name", width: 110, render: (v) => <Text style={{ fontSize: 12 }}>{v || "—"}</Text> },
    ...(isAdmin ? [{
      title: "", key: "void", width: 50, className: "no-print",
      render: (_: any, r: Damage) => r.status === "active" ? (
        <Tooltip title="Void (puts the stock back)">
          <Button size="small" danger type="text" icon={<StopOutlined />} onClick={() => setVoidTarget(r)} />
        </Tooltip>
      ) : null,
    }] : []),
  ];

  const Stat = ({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) => (
    <div style={{ flex: "1 1 160px", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
      <Text style={{ fontSize: 11, color: C.subText, display: "block" }}>{label}</Text>
      <Text strong style={{ fontSize: 18, color: color || C.darkText }}>{value}</Text>
    </div>
  );

  return (
    <Modal
      open={openM}
      onCancel={onCloseM}
      destroyOnClose
      width={1100}
      style={{ top: 20 }}
      styles={{ body: { padding: "16px 20px" } }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.red, fontSize: 14, lineHeight: 1 }}>
            <WarningOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>Damage Report</Text>
        </div>
      }
      footer={
        <Space>
          <Button onClick={onCloseM} style={{ borderRadius: 8 }}>Cancel</Button>
          <Button icon={<DownloadOutlined />} disabled={isLoading || !hasData} onClick={exportCsv} style={{ borderRadius: 8 }}>Export CSV</Button>
          <Button type="primary" icon={<PrinterFilled />} disabled={isLoading || !hasData} onClick={print}
            style={{ background: C.primary, borderColor: C.primary, borderRadius: 8, fontWeight: 600 }}>
            Print A4 Report
          </Button>
        </Space>
      }
    >
      <Spin spinning={isLoading} tip="Generating damage report…" style={{ display: "block", width: "100%" }}>
        {!hasData && !isLoading ? (
          <Empty
            description="No damages in this period. Record one with the ⚠ button on an item in Services or Inventory."
            style={{ padding: "40px 0" }}
          />
        ) : (
          <div ref={printRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } body { -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }`}</style>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
              <Text strong>{BRAND_NAME1 || "Damage Report"}</Text>
              <Text style={{ fontSize: 12, color: C.subText }}>
                {fmtDate(startDate)} – {fmtDate(endDate)}
                {itemType ? ` · ${itemType === "inventory" ? "Inventory items" : "Services"} only` : ""}
                {reason ? ` · ${reasonLabel(reason)}` : ""}
              </Text>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Stat label="Damages recorded" value={s?.count ?? 0} />
              <Stat label="Quantity damaged" value={qty(s?.quantity ?? 0)} />
              <Stat label="Cost lost" value={kes(s?.value_at_cost)} color={C.red} />
              <Stat label="Sales value lost" value={kes(s?.value_at_price)} />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {!!s?.by_reason?.length && (
                <div style={{ flex: "1 1 420px", minWidth: 0 }}>
                  <Text strong style={{ display: "block", marginBottom: 6 }}>By reason</Text>
                  <Table<DamageGroup> rowKey="key" size="small" dataSource={s.by_reason} columns={groupColumns("Reason")} pagination={false} />
                </div>
              )}
              {!!s?.by_product?.length && (
                <div style={{ flex: "1 1 420px", minWidth: 0 }}>
                  <Text strong style={{ display: "block", marginBottom: 6 }}>Most damaged items</Text>
                  <Table<DamageGroup> rowKey="key" size="small" dataSource={s.by_product.slice(0, 10)} columns={groupColumns("Item")} pagination={false} />
                </div>
              )}
            </div>

            <Text strong style={{ marginTop: 4 }}>All damages</Text>
            <Table<Damage> rowKey="_id" size="small" dataSource={rows} columns={columns} pagination={false} scroll={{ x: 1000 }} />
          </div>
        )}
      </Spin>

      <Modal
        open={!!voidTarget}
        title={`Void damage — ${voidTarget?.quantity} × ${voidTarget ? itemName(voidTarget) : ""}`}
        okText="Void"
        okButtonProps={{ danger: true }}
        confirmLoading={voiding}
        onOk={handleVoid}
        onCancel={() => { setVoidTarget(null); setVoidReason(""); }}
        destroyOnClose
      >
        <p style={{ fontSize: 13 }}>
          The stock goes back{voidTarget?.journal_entry_id ? " and the accounting write-off is reversed" : ""}. The entry stays in the report as voided.
        </p>
        <Input
          placeholder="Why? e.g. Recorded twice"
          value={voidReason}
          maxLength={300}
          onChange={(e) => setVoidReason(e.target.value)}
        />
      </Modal>
    </Modal>
  );
};

export default DamageReportModal;
