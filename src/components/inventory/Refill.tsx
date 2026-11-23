import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { FormInstance } from "antd";
import {
  DeleteOutlined,
  ExperimentOutlined,
  HistoryOutlined,
  PlusOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import { useRefillSetting } from "@hooks/useRefillSetting";
import {
  addRefill,
  fetchAllInventory,
  fetchRefills,
  undoLatestRefill,
  type RefillBatch,
  type RefillRole,
  type RefillSetup,
} from "@services/inventory";

const { Text } = Typography;

// Refills (water refill points, shown where water meter tracking is on).
// A "filled" item — e.g. Filled bottle 20L — is made from inputs: 1 empty
// bottle + 20 L water + 1 cap. Recording a refill takes the inputs off stock
// and adds the filled bottles, so bottles refilled but not yet sold are
// counted. Empties usually come in bales (e.g. 20 per bale).

const fmt = (n: number | null | undefined, digits = 2) =>
  Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: digits });

const errorText = (e: any, fallback: string) =>
  e?.response?.data?.error || e?.response?.data?.message || fallback;

const ROLE_LABEL: Record<RefillRole, string> = {
  container: "Empty bottle",
  water: "Water",
  other: "Other (cap, seal, label…)",
};
/** What a row is when no stock item is picked yet, e.g. "400 (water)" */
const ROLE_NOUN: Record<RefillRole, string> = {
  container: "empty bottles",
  water: "water",
  other: "other items",
};

/** "6 bales + 17" (or just the count when there's no bale size) */
export const inBales = (qty: number, baleSize?: number | null, unit = "") => {
  if (!baleSize || baleSize <= 0) return `${fmt(qty)}${unit ? ` ${unit}` : ""}`;
  const bales = Math.floor(qty / baleSize);
  const loose = Math.round((qty - bales * baleSize) * 1000) / 1000;
  const parts = [];
  if (bales) parts.push(`${bales} bale${bales === 1 ? "" : "s"}`);
  if (loose || !bales) parts.push(`${fmt(loose)}${unit ? ` ${unit}` : ""}`);
  return parts.join(" + ");
};

// ─────────────────────────────────────────────────────────────────────────────
// Form section for Add / Edit Inventory
// ─────────────────────────────────────────────────────────────────────────────

const idOf = (v: any) => (v && typeof v === "object" ? v._id : v);

/** The saved `refill` → form values */
export const refillFormValues = (refill?: RefillSetup | null) => ({
  refill_enabled: !!refill?.enabled,
  refill_bale_size: refill?.bale_size ?? undefined,
  refill_inputs: refill?.inputs?.length
    ? refill.inputs.map((i) => ({ inventory_id: idOf(i.inventory_id), quantity: i.quantity, role: i.role || "other" }))
    : [
        { inventory_id: undefined, quantity: 1, role: "container" },
        { inventory_id: undefined, quantity: 20, role: "water" },
      ],
});

/** Form values → the `refill` object the API expects (undefined = leave it) */
export const refillPayload = (values: Record<string, any>, saved?: RefillSetup | null) => {
  const inputs = (values.refill_inputs || [])
    .filter((i: any) => i?.inventory_id && Number(i.quantity) > 0)
    .map((i: any) => ({ inventory_id: i.inventory_id, quantity: Number(i.quantity), role: i.role || "other" }));
  if (!values.refill_enabled) {
    return saved?.enabled ? { enabled: false, bale_size: saved.bale_size ?? null, inputs } : undefined;
  }
  return { enabled: true, bale_size: Number(values.refill_bale_size) || null, inputs };
};

export const RefillFields: React.FC<{
  form: FormInstance;
  hasVariants: boolean;
  /** This item's id when editing — it can't be one of its own inputs */
  itemId?: string;
  stockUnit?: string;
}> = ({ form, hasVariants, itemId, stockUnit }) => {
  const enabled = Form.useWatch("refill_enabled", form);
  const baleSize = Form.useWatch("refill_bale_size", form);
  const inputs = Form.useWatch("refill_inputs", form) as any[] | undefined;
  const itemName = (Form.useWatch("name", form) as string | undefined)?.trim();

  const { data: inventory } = useQuery({
    queryKey: ["inventory-for-refill"],
    queryFn: () => fetchAllInventory({}),
    enabled: !!enabled,
    staleTime: 60_000,
  });
  // Stock items that can be inputs, with their unit (Litres, Pieces…)
  const stock = useMemo(() => {
    const list: any[] = Array.isArray(inventory) ? inventory : (inventory as any)?.data ?? [];
    return list
      .filter((i) => i?._id && i._id !== itemId && !i.has_variants)
      .map((i) => ({ id: i._id as string, name: i.name as string, unit: (i.unit_id?.name as string) || "" }));
  }, [inventory, itemId]);
  const byId = useMemo(() => Object.fromEntries(stock.map((s) => [s.id, s])), [stock]);
  const options = stock.map((s) => ({ value: s.id, label: s.unit ? `${s.name} (${s.unit})` : s.name }));

  const filled = itemName || "filled bottle";
  const filledUnit = stockUnit || "";
  const water = (inputs || []).find((i) => i?.role === "water");
  const bale = Number(baleSize) || 0;

  /** "400 Litres of Water" · "20 Pieces of Empty bottle 20L" · "400 (water)" */
  const describe = (row: any, times: number) => {
    const qty = fmt((Number(row?.quantity) || 0) * times);
    const s = row?.inventory_id ? byId[row.inventory_id] : undefined;
    if (!s) return `${qty} (${ROLE_NOUN[(row?.role as RefillRole) || "other"]})`;
    return s.unit ? `${qty} ${s.unit} of ${s.name}` : `${qty} ${s.name}`;
  };
  const listed = (inputs || []).filter((i) => Number(i?.quantity) > 0);
  const joinList = (parts: string[]) =>
    parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

  return (
    <div
      style={{
        border: `1px solid ${enabled ? "#c7d2fe" : "#e2e8f0"}`,
        background: enabled ? "#eef2ff" : "#fff",
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 9, background: "#e0e7ff", color: "#4f46e5",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0,
          }}
        >
          <ExperimentOutlined />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ display: "block" }}>Made by refilling</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Turn on for a filled item, such as Filled bottle 20L. Each refill takes empty bottles and water off stock and
            adds filled bottles here, so you can see how many are filled and waiting to be sold.
          </Text>
        </div>
        <Form.Item name="refill_enabled" valuePropName="checked" style={{ margin: 0 }}>
          <Switch disabled={hasVariants} checkedChildren="ON" unCheckedChildren="OFF" />
        </Form.Item>
      </div>

      {hasVariants && (
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
          Refilling works on items without variants.
        </Text>
      )}

      {enabled && !hasVariants && (
        <div style={{ marginTop: 14 }}>
          <Form.Item
            name="refill_bale_size"
            label="Empty bottles per bale"
            tooltip="How many empty bottles come in one bale from your supplier. Lets you record refills in bales and shows stock as bales + loose bottles."
            style={{ marginBottom: 10, maxWidth: 280 }}
          >
            <InputNumber min={1} precision={0} style={{ width: "100%" }} placeholder="e.g. 20" addonAfter="bottles" />
          </Form.Item>

          <Text strong style={{ display: "block" }}>To fill one {filled}, you use:</Text>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
            Pick the stock item for each and enter how much one {filled} needs, in that item's own unit.
          </Text>
          <Form.List name="refill_inputs">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => {
                  const row = inputs?.[name];
                  const picked = row?.inventory_id ? byId[row.inventory_id] : undefined;
                  return (
                    <Space key={key} wrap align="start" style={{ display: "flex", marginBottom: 4 }}>
                      <Form.Item name={[name, "role"]} style={{ marginBottom: 6, width: 190 }}>
                        <Select
                          options={(Object.keys(ROLE_LABEL) as RefillRole[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
                        />
                      </Form.Item>
                      <Form.Item
                        name={[name, "inventory_id"]}
                        rules={[{ required: true, message: "Pick the stock item" }]}
                        style={{ marginBottom: 6, width: 260 }}
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          placeholder={row?.role === "water" ? "Pick your water item" : row?.role === "container" ? "Pick your empty-bottle item" : "Pick the stock item"}
                          options={options}
                        />
                      </Form.Item>
                      <Form.Item
                        name={[name, "quantity"]}
                        rules={[{ required: true, message: "Enter the amount" }]}
                        style={{ marginBottom: 6, width: 170 }}
                      >
                        <InputNumber
                          min={0.0001}
                          style={{ width: "100%" }}
                          placeholder="Amount"
                          addonAfter={picked?.unit || "unit"}
                        />
                      </Form.Item>
                      <Tooltip title="Remove">
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                      </Tooltip>
                    </Space>
                  );
                })}
                <Button size="small" icon={<PlusOutlined />} onClick={() => add({ quantity: 1, role: "other" })}>
                  Add another (e.g. cap or seal)
                </Button>
              </>
            )}
          </Form.List>

          <Alert
            type="info"
            showIcon
            style={{ marginTop: 12, borderRadius: 8 }}
            message={
              listed.length === 0 ? (
                <span>Add what one {filled} uses above.</span>
              ) : bale > 0 ? (
                <span>
                  Filling <b>1 bale</b> ({bale} bottles) uses <b>{joinList(listed.map((i) => describe(i, bale)))}</b>,
                  and adds <b>{bale}{filledUnit ? ` ${filledUnit}` : ""}</b> to {filled}.
                </span>
              ) : (
                <span>
                  Filling <b>1</b> {filled} uses <b>{joinList(listed.map((i) => describe(i, 1)))}</b>.
                  Set empty bottles per bale to record refills in bales.
                </span>
              )
            }
            description={
              water
                ? "Rejected bottles (leaked or cracked) still use their empty bottle and water — those are recorded as waste."
                : "Tip: add a Water row so the Refills report can compare water used in refills with your water meter."
            }
          />
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Refill window (Inventory list → Refill)
// ─────────────────────────────────────────────────────────────────────────────

export const RefillModal: React.FC<{
  inventoryId: string;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}> = ({ inventoryId, open, onClose, onChanged }) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const queryKey = ["refills", inventoryId];
  const [mode, setMode] = useState<"bales" | "units">("bales");

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchRefills(inventoryId),
    enabled: open && !!inventoryId,
  });

  const item = data?.item;
  const baleSize = item?.bale_size || null;
  const byBale = mode === "bales" && !!baleSize;
  const amount = Form.useWatch("amount", form);
  const rejects = Number(Form.useWatch("rejects", form)) || 0;

  const preview = useMemo(() => {
    if (!data) return null;
    const total = (byBale ? (Number(amount) || 0) * (baleSize || 0) : Number(amount) || 0);
    if (total <= 0) return null;
    const good = Math.max(0, total - rejects);
    const rows = data.inputs.map((i) => {
      const need = i.per_unit * total;
      return { ...i, need, short: need > i.on_hand + 1e-9 };
    });
    return { total, good, rows, short: rows.some((r) => r.short) };
  }, [data, amount, rejects, byBale, baleSize]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["refill-summary"] });
    onChanged?.();
  };

  const addMutation = useMutation({
    mutationFn: (values: any) => {
      const total = byBale ? (Number(values.amount) || 0) * (baleSize || 0) : Number(values.amount) || 0;
      const rej = Number(values.rejects) || 0;
      return addRefill(inventoryId, {
        units: Math.max(0, total - rej),
        rejects: rej,
        refill_date: (values.refill_date as Dayjs | undefined)?.toISOString(),
        note: values.note || undefined,
      });
    },
    onSuccess: (res: any) => {
      message.success(res?.message || "Refill recorded");
      form.resetFields();
      refresh();
    },
    onError: (e: any) => message.error(errorText(e, "Failed to record the refill")),
  });

  const undoMutation = useMutation({
    mutationFn: () => undoLatestRefill(inventoryId),
    onSuccess: () => {
      message.success("Latest refill undone");
      refresh();
    },
    onError: (e: any) => message.error(errorText(e, "Failed to undo the refill")),
  });

  const unit = item?.unit_name || "units";
  const batches = data?.batches ?? [];

  const columns = [
    {
      title: "Date",
      dataIndex: "refill_date",
      render: (d: string, r: RefillBatch) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(d).format("DD MMM YYYY")}</Text>
          {r.created_by_name && <Text type="secondary" style={{ fontSize: 11 }}>{r.created_by_name}</Text>}
        </Space>
      ),
    },
    {
      title: "Refilled",
      key: "units",
      render: (_: any, r: RefillBatch) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: "#16a34a" }}>+{fmt(r.units)} {unit}</Text>
          {r.bales ? <Text type="secondary" style={{ fontSize: 11 }}>{fmt(r.bales)} bale(s)</Text> : null}
        </Space>
      ),
    },
    {
      title: "Rejects",
      dataIndex: "rejects",
      render: (v: number) => (v ? <Tag color="red">{fmt(v)}</Tag> : "—"),
    },
    {
      title: "Used",
      key: "used",
      render: (_: any, r: RefillBatch) => (
        <Space direction="vertical" size={0}>
          {r.inputs.map((i) => (
            <Text key={i.inventory_id} style={{ fontSize: 12 }}>
              −{fmt(i.used)} {i.unit_name ? `${i.unit_name} of ` : ""}{i.name}
            </Text>
          ))}
        </Space>
      ),
    },
    { title: "Stock after", dataIndex: "qty_after", render: (v: number) => inBales(v, baleSize) },
    {
      title: "",
      dataIndex: "note",
      render: (v: string) => (v ? <Tooltip title={v}><Text type="secondary">📝</Text></Tooltip> : null),
    },
  ];

  const stat = (label: string, value: React.ReactNode, sub?: React.ReactNode) => (
    <div style={{ flex: "1 1 150px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{label}</Text>
      <Text strong style={{ fontSize: 16 }}>{value}</Text>
      {sub && <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{sub}</Text>}
    </div>
  );

  const container = data?.inputs.find((i) => i.role === "container");

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnClose
      title={
        <Space>
          <ExperimentOutlined style={{ color: "#4f46e5" }} />
          <span>Refill{item?.name ? ` — ${item.name}` : ""}</span>
        </Space>
      }
    >
      {isLoading || !data ? (
        <div style={{ padding: 40, textAlign: "center" }}><Text type="secondary">Loading…</Text></div>
      ) : (
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {stat("Filled, not yet sold", inBales(item?.quantity || 0, baleSize), `${fmt(item?.quantity)} ${unit}`)}
            {container &&
              stat(
                "Empties waiting",
                inBales(container.on_hand / (container.per_unit || 1), baleSize),
                `${fmt(container.on_hand)} ${container.unit_name ? `${container.unit_name} of ` : ""}${container.name}`
              )}
            {stat("Can refill now", inBales(data.can_make_now, baleSize), "With the stock on hand")}
          </div>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
            <Text strong style={{ display: "block", marginBottom: 10 }}>Record a refill</Text>
            <Form
              form={form}
              layout="vertical"
              initialValues={{ refill_date: dayjs(), rejects: 0 }}
              onFinish={(values) => addMutation.mutate(values)}
            >
              {baleSize && (
                <Segmented
                  value={mode}
                  onChange={(v) => setMode(v as "bales" | "units")}
                  options={[
                    { value: "bales", label: `By bale (${baleSize})` },
                    { value: "units", label: "By bottle" },
                  ]}
                  style={{ marginBottom: 10 }}
                />
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
                <Form.Item
                  name="amount"
                  label={byBale ? "Bales filled" : "Bottles filled"}
                  rules={[{ required: true, message: "Enter how many" }]}
                  style={{ marginBottom: 8 }}
                >
                  <InputNumber min={1} precision={0} style={{ width: "100%" }} addonAfter={byBale ? "bales" : unit} />
                </Form.Item>
                <Form.Item
                  name="rejects"
                  label="Rejects (of these)"
                  tooltip="Bottles that leaked or cracked while refilling — their empties and water are written off, and they aren't added to stock"
                  style={{ marginBottom: 8 }}
                >
                  <InputNumber min={0} precision={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="refill_date" label="Date" rules={[{ required: true, message: "Pick a date" }]} style={{ marginBottom: 8 }}>
                  <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} />
                </Form.Item>
                <Form.Item name="note" label="Note (optional)" style={{ marginBottom: 8 }}>
                  <Input maxLength={200} placeholder="e.g. Morning shift" />
                </Form.Item>
              </div>

              {preview && (
                <Alert
                  type={preview.short ? "error" : "success"}
                  showIcon
                  style={{ marginBottom: 10, borderRadius: 8 }}
                  message={
                    preview.short
                      ? "Not enough stock for this refill"
                      : <span>Adds <b>{fmt(preview.good)} {unit}</b> to stock{rejects ? ` (${rejects} rejected)` : ""}.</span>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      {preview.rows.map((r) => (
                        <Text key={r.inventory_id} type={r.short ? "danger" : undefined} style={{ fontSize: 12 }}>
                          Uses {fmt(r.need)} {r.unit_name ? `${r.unit_name} of ` : ""}{r.name} — you have {fmt(r.on_hand)}
                          {r.unit_name ? ` ${r.unit_name}` : ""}
                        </Text>
                      ))}
                    </Space>
                  }
                />
              )}

              <Button
                type="primary"
                htmlType="submit"
                loading={addMutation.isLoading}
                disabled={!!preview?.short || (!!preview && rejects > preview.total)}
                icon={<ExperimentOutlined />}
              >
                Save refill & update stock
              </Button>
            </Form>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Space><HistoryOutlined /><Text strong>Refill history</Text></Space>
              {batches.length > 0 && (
                <Popconfirm
                  title="Undo the latest refill?"
                  description="Puts its empties and water back and takes its filled bottles off stock."
                  onConfirm={() => undoMutation.mutate()}
                  okText="Undo"
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" icon={<UndoOutlined />} loading={undoMutation.isLoading}>Undo latest</Button>
                </Popconfirm>
              )}
            </div>
            <Table
              size="small"
              rowKey="_id"
              columns={columns}
              dataSource={batches}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              scroll={{ x: 760 }}
              locale={{ emptyText: "No refills yet — record one above." }}
            />
          </div>
        </Space>
      )}
    </Modal>
  );
};

/** "Refill" button for an inventory row/card — only for items set up for refilling */
export const RefillButton: React.FC<{
  record: any;
  onChanged?: () => void;
  size?: "small" | "middle";
  block?: boolean;
}> = ({ record, onChanged, size = "small", block }) => {
  const [open, setOpen] = useState(false);
  const refillOn = useRefillSetting();
  if (!refillOn || !record?.refill?.enabled) return null;
  return (
    <>
      <Tooltip title="Record a refill">
        <Button
          size={size}
          block={block}
          icon={<ExperimentOutlined />}
          onClick={() => setOpen(true)}
          style={{ borderRadius: 6, color: "#4f46e5", borderColor: "#c7d2fe" }}
        >
          {size === "small" ? undefined : "Refill"}
        </Button>
      </Tooltip>
      {open && (
        <RefillModal inventoryId={record._id} open={open} onClose={() => setOpen(false)} onChanged={onChanged} />
      )}
    </>
  );
};
