import React, { useRef } from "react";
import { Alert, Button, Empty, Modal, Space, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined, ExperimentOutlined, PrinterFilled } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import {
  fetchRefillSummary,
  type RefillSummaryItem,
  type RefillSummaryWater,
} from "@services/inventory";
import { inBales } from "@components/inventory/Refill";
import useSystemDetails from "@hooks/useSystemDetails";
import { THEME_C } from "@utils/getPrimaryColor";

const { Text } = Typography;
const C = THEME_C;

const fmt = (n: number | null | undefined, digits = 2) =>
  Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: digits });
const fmtDate = (d?: string) => (d ? dayjs(d).format("DD MMM YYYY") : "—");

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

// Reports → Duka → Refills: for each filled item (e.g. Filled bottle 20L),
// what was refilled, rejected and sold in the period, what's filled and
// waiting to be sold, the empties still to refill (in bales), and the water
// used in refills against the water meter.
const RefillReportModal: React.FC<{
  openM: boolean;
  onCloseM: () => void;
  startDate: string;
  endDate: string;
  shopId?: string;
}> = ({ openM, onCloseM, startDate, endDate, shopId }) => {
  const { BRAND_NAME1 } = useSystemDetails();
  const printRef = useRef<HTMLDivElement>(null);
  const params = {
    shop_id: shopId,
    start_date: startDate ? dayjs(startDate).format("YYYY-MM-DD") : undefined,
    end_date: endDate ? dayjs(endDate).format("YYYY-MM-DD") : undefined,
  };
  const { data, isLoading } = useQuery({
    queryKey: ["refill-summary", params],
    queryFn: () => fetchRefillSummary(params),
    enabled: openM && !!startDate && !!endDate,
  });
  const print = useReactToPrint({ content: () => printRef.current });

  const items = data?.items ?? [];
  const water = data?.water ?? [];
  const hasData = items.length > 0;

  const exportCsv = () => {
    downloadCsv(`Refills_${dayjs().format("YYYY-MM-DD")}.csv`, items.map((i) => {
      const container = i.inputs.find((x) => x.role === "container");
      const w = i.inputs.find((x) => x.role === "water");
      return {
        "Item": i.name,
        "Bottles per bale": i.bale_size || "",
        "Refilled": i.made,
        "Rejects": i.rejects,
        "Sold": i.sold,
        "Filled, not sold (now)": i.on_hand,
        "Filled, not sold (bales)": i.bale_size ? inBales(i.on_hand, i.bale_size) : "",
        "Empties waiting": container ? container.on_hand : "",
        "Empties waiting (bales)": container && i.bale_size ? inBales(container.on_hand / (container.per_unit || 1), i.bale_size) : "",
        "Water used": w ? w.used_in_period : "",
        "Water bought by truck": (() => {
          const t = w && water.find((x) => String(x.inventory_id) === String(w.inventory_id))?.delivered_by_truck;
          return t ? t.quantity : "";
        })(),
        "Can refill now": i.can_make_now,
      };
    }));
  };

  const columns: ColumnsType<RefillSummaryItem> = [
    { title: "Filled item", dataIndex: "name", render: (v, r) => <div><Text strong>{v}</Text>{r.bale_size ? <Text type="secondary" style={{ display: "block", fontSize: 11 }}>{r.bale_size} per bale</Text> : null}</div> },
    { title: "Refilled", dataIndex: "made", align: "right", render: (v, r) => <Text strong style={{ color: C.green }}>{inBales(v, r.bale_size)}</Text> },
    { title: "Rejects", dataIndex: "rejects", align: "right", render: (v) => (v ? <Tag color="red">{fmt(v)}</Tag> : "—") },
    { title: "Sold", dataIndex: "sold", align: "right", render: (v, r) => inBales(v, r.bale_size) },
    {
      title: "Filled, not sold (now)", dataIndex: "on_hand", align: "right",
      render: (v, r) => <Text strong style={{ color: C.blue }}>{inBales(v, r.bale_size)}</Text>,
    },
    {
      title: "Empties waiting (now)", key: "empties", align: "right",
      render: (_, r) => {
        const c = r.inputs.find((x) => x.role === "container");
        if (!c) return "—";
        return (
          <div>
            <Text strong style={{ color: C.orange }}>{inBales(c.on_hand / (c.per_unit || 1), r.bale_size)}</Text>
            <Text type="secondary" style={{ display: "block", fontSize: 11 }}>{c.name}</Text>
          </div>
        );
      },
    },
    {
      title: "Water used", key: "water", align: "right",
      render: (_, r) => {
        const w = r.inputs.find((x) => x.role === "water");
        return w ? `${fmt(w.used_in_period)} ${w.unit_name}` : "—";
      },
    },
    { title: "Can refill now", dataIndex: "can_make_now", align: "right", render: (v, r) => inBales(v, r.bale_size) },
  ];

  const waterColumns: ColumnsType<RefillSummaryWater> = [
    { title: "Water", dataIndex: "name", render: (v, r) => <div><Text strong>{v}</Text><Text type="secondary" style={{ display: "block", fontSize: 11 }}>{fmt(r.on_hand)} {r.unit_name} in stock now</Text></div> },
    {
      title: "Bought by truck", key: "truck", align: "right",
      render: (_, r) => r.delivered_by_truck ? (
        <div>
          <Text strong style={{ color: C.blue }}>{fmt(r.delivered_by_truck.quantity)} {r.unit_name}</Text>
          <Text type="secondary" style={{ display: "block", fontSize: 11 }}>
            {r.delivered_by_truck.trucks} {r.delivered_by_truck.trucks === 1 ? "truck" : "trucks"}{r.delivered_by_truck.cost ? ` · KES ${fmt(r.delivered_by_truck.cost)}` : ""}
          </Text>
        </div>
      ) : <Text type="secondary">—</Text>,
    },
    { title: "Used in refills", dataIndex: "used_in_refills", align: "right", render: (v, r) => `${fmt(v)} ${r.unit_name}` },
    {
      title: "Meter", key: "meter", align: "right",
      render: (_, r) => {
        if (!r.meter) return <Text type="secondary">No meter</Text>;
        if (r.meter.direction === "out") return `${fmt(r.meter.dispensed)} ${r.unit_name} dispensed`;
        return r.meter.water_in != null ? `${fmt(r.meter.water_in)} ${r.unit_name} came in` : "No readings";
      },
    },
    {
      title: "Unaccounted", key: "gap", align: "right",
      render: (_, r) => {
        const gap = r.meter?.unaccounted;
        if (gap == null) return <Text type="secondary">—</Text>;
        const big = Math.abs(gap) > Math.max(1, r.used_in_refills * 0.02);
        return <Tag color={big ? "red" : "green"}>{gap > 0 ? "+" : ""}{fmt(gap)} {r.unit_name}</Tag>;
      },
    },
  ];

  return (
    <Modal
      open={openM}
      onCancel={onCloseM}
      destroyOnClose
      width={1040}
      style={{ top: 20 }}
      styles={{ body: { padding: "16px 20px" } }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: C.primaryLight, borderRadius: 7, padding: "4px 6px", color: C.primary, fontSize: 14, lineHeight: 1 }}>
            <ExperimentOutlined />
          </div>
          <Text strong style={{ fontSize: 14, color: C.darkText }}>Refill Report</Text>
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
      <Spin spinning={isLoading} tip="Generating refill report…" style={{ display: "block", width: "100%" }}>
        {!hasData && !isLoading ? (
          <Empty
            description="No items are set up for refilling. Turn on “Made by refilling” on the filled-bottle item in Inventory."
            style={{ padding: "40px 0" }}
          />
        ) : (
          <div ref={printRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } body { -webkit-print-color-adjust: exact; } }`}</style>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
              <Text strong>{BRAND_NAME1 || "Refill Report"}</Text>
              <Text style={{ fontSize: 12, color: C.subText }}>{fmtDate(startDate)} – {fmtDate(endDate)}</Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Refilled, rejects, sold and water used are for the period. “Now” columns are today's stock.
            </Text>
            <Table<RefillSummaryItem> rowKey="_id" size="small" dataSource={items} columns={columns} pagination={false} scroll={{ x: 900 }} />
            {water.length > 0 && (
              <>
                <Text strong style={{ marginTop: 6 }}>Water: bought, used in refills and the meter</Text>
                <Table<RefillSummaryWater> rowKey="inventory_id" size="small" dataSource={water} columns={waterColumns} pagination={false} scroll={{ x: 700 }} />
                {water.some((w) => w.meter?.direction === "in") && (
                  <Alert
                    type="info"
                    showIcon
                    style={{ borderRadius: 8 }}
                    message="A meter on the water coming in can't show the gap on its own — compare water in, water used in refills and the stock left. A meter on the water dispensed shows the unaccounted water directly."
                  />
                )}
              </>
            )}
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default RefillReportModal;
