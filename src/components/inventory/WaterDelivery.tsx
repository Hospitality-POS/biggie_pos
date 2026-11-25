import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AutoComplete,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Segmented,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CarOutlined, StopOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  addWaterDelivery,
  fetchAllInventory,
  fetchWaterDeliveries,
  voidWaterDelivery,
  type WaterDelivery,
  type WaterPaidFrom,
} from "@services/inventory";
import { fetchAllSuppliers } from "@services/supplier";
import { useWaterMeterSetting } from "@hooks/useWaterMeterSetting";
import { useAppSelector } from "src/store";

const { Text } = Typography;

// Water truck deliveries for metered water items (Inventory → Water
// delivery). Through an inlet meter, the reading after offloading adds the
// stock; otherwise (a meter on water dispensed, or the truck bypassed the
// inlet meter) the amount delivered is added directly.

const fmt = (n: number | null | undefined, digits = 2) =>
  Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: digits });
const kes = (n: number | null | undefined) =>
  `KES ${Number(n ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const errorText = (e: any, fallback: string) => e?.response?.data?.error || e?.response?.data?.message || fallback;
const PAID_FROM_LABEL: Record<WaterPaidFrom, string> = { cash: "Cash", mpesa: "M-Pesa", bank: "Bank" };

export const isWaterLow = (record: any) =>
  !!record?.meter?.enabled && Number(record?.min_viable_quantity) > 0 && Number(record?.quantity ?? 0) <= Number(record.min_viable_quantity);

// ─────────────────────────────────────────────────────────────────────────────
// Modal: record a delivery + delivery history
// ─────────────────────────────────────────────────────────────────────────────
export const WaterDeliveryModal: React.FC<{
  inventoryId: string;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}> = ({ inventoryId, open, onClose, onChanged }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState("record");
  const [saving, setSaving] = useState(false);
  const [voidTarget, setVoidTarget] = useState<WaterDelivery | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["water-deliveries", inventoryId],
    queryFn: () => fetchWaterDeliveries(inventoryId),
    enabled: open,
  });
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => fetchAllSuppliers({}),
    enabled: open,
  });
  const supplierList: any[] = Array.isArray(suppliers) ? suppliers : suppliers?.data || [];

  const item = data?.item;
  const meter = item?.meter;
  const unit = item?.unit_name || "units";
  const inletMeter = meter?.direction !== "out";
  const lastReading = meter?.last_reading ?? meter?.initial_reading ?? 0;
  const rate = meter?.conversion_rate && meter.conversion_rate > 0 ? meter.conversion_rate : 1;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setTab("record");
  }, [open, form]);

  useEffect(() => {
    if (open && item) {
      form.setFieldsValue({
        how: inletMeter ? "meter" : "direct",
        cost_basis: "unit",
        unit_cost: item.supplier_price ?? undefined,
        payment: "paid",
        paid_from: "cash",
        delivered_at: dayjs(),
      });
    }
  }, [open, item?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const how: "meter" | "direct" = Form.useWatch("how", form) || (inletMeter ? "meter" : "direct");
  const reading: number | undefined = Form.useWatch("meter_reading", form);
  const qtyTyped: number | undefined = Form.useWatch("quantity", form);
  const costBasis: "unit" | "total" = Form.useWatch("cost_basis", form) || "unit";
  const unitCost: number | undefined = Form.useWatch("unit_cost", form);
  const totalCost: number | undefined = Form.useWatch("total_cost", form);
  const payment: "paid" | "owed" = Form.useWatch("payment", form) || "paid";

  const quantity = useMemo(() => {
    if (how === "meter") return reading != null && reading > lastReading ? (reading - lastReading) * rate : 0;
    return qtyTyped || 0;
  }, [how, reading, lastReading, rate, qtyTyped]);
  const cost = costBasis === "total" ? totalCost ?? null : unitCost != null ? unitCost * quantity : null;
  const perUnit = costBasis === "total" ? (totalCost != null && quantity > 0 ? totalCost / quantity : null) : unitCost ?? null;

  const handleSave = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const supplier = supplierList.find((s) => s.name === v.supplier);
      const res = await addWaterDelivery(inventoryId, {
        ...(v.how === "meter" ? { meter_reading: v.meter_reading } : { quantity: v.quantity, bypassed_meter: inletMeter }),
        ...(supplier ? { supplier_id: supplier._id } : { supplier_name: v.supplier?.trim() || undefined }),
        vehicle_plate: v.vehicle_plate?.trim() || undefined,
        driver_name: v.driver_name?.trim() || undefined,
        ...(v.cost_basis === "total" ? { total_cost: v.total_cost ?? undefined } : { unit_cost: v.unit_cost ?? undefined }),
        paid: v.payment !== "owed",
        paid_from: v.payment !== "owed" ? v.paid_from : undefined,
        delivered_at: (v.delivered_at || dayjs()).toISOString(),
        note: v.note?.trim() || undefined,
      });
      message.success(`Recorded ${fmt(res.delivery.quantity)} ${unit} of water delivered`);
      if (res.warning) message.warning(res.warning, 6);
      await queryClient.invalidateQueries({ queryKey: ["water-deliveries", inventoryId] });
      queryClient.invalidateQueries({ queryKey: ["meter-readings", inventoryId] });
      queryClient.invalidateQueries({ queryKey: ["low-water-items"] });
      onChanged?.();
      form.resetFields(["meter_reading", "quantity", "note", "total_cost"]);
      setTab("history");
    } catch (e: any) {
      message.error(errorText(e, "Failed to record water delivery"));
    } finally {
      setSaving(false);
    }
  };

  const handleVoid = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      const res = await voidWaterDelivery(inventoryId, voidTarget._id, voidReason.trim() || undefined);
      message.success("Water delivery voided. The water is off stock again.");
      if (res.warning) message.warning(res.warning, 6);
      setVoidTarget(null);
      setVoidReason("");
      queryClient.invalidateQueries({ queryKey: ["water-deliveries", inventoryId] });
      queryClient.invalidateQueries({ queryKey: ["meter-readings", inventoryId] });
      queryClient.invalidateQueries({ queryKey: ["low-water-items"] });
      onChanged?.();
    } catch (e: any) {
      message.error(errorText(e, "Failed to void water delivery"));
    } finally {
      setVoiding(false);
    }
  };

  const columns: ColumnsType<WaterDelivery> = [
    { title: "Date", dataIndex: "delivered_at", width: 120, render: (d) => <Text style={{ fontSize: 12 }}>{dayjs(d).format("DD MMM YYYY, HH:mm")}</Text> },
    {
      title: "Water", dataIndex: "quantity", align: "right",
      render: (v, r) => (
        <div>
          <Text strong style={{ textDecoration: r.status === "voided" ? "line-through" : undefined }}>{fmt(v)} {r.unit_name || unit}</Text>
          <Text type="secondary" style={{ display: "block", fontSize: 11 }}>
            {r.mode === "meter" ? `Meter read ${fmt(r.meter_reading, 3)}` : "Added directly"}
          </Text>
        </div>
      ),
    },
    {
      title: "Truck", key: "truck",
      render: (_, r) => (
        <div style={{ fontSize: 12 }}>
          <Text strong style={{ fontSize: 12 }}>{r.supplier_name || "—"}</Text>
          {(r.vehicle_plate || r.driver_name) && (
            <Text type="secondary" style={{ display: "block", fontSize: 11 }}>
              {[r.vehicle_plate, r.driver_name].filter(Boolean).join(" · ")}
            </Text>
          )}
          {r.status === "voided" && (
            <Text style={{ display: "block", fontSize: 11, color: "#dc2626" }}>
              Voided by {r.voided_by_name || "admin"}{r.void_reason ? ` — ${r.void_reason}` : ""}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "Cost", dataIndex: "total_cost", align: "right",
      render: (v, r) => v != null ? (
        <div>
          <Text strong style={{ fontSize: 12 }}>{kes(v)}</Text>
          {r.unit_cost != null && <Text type="secondary" style={{ display: "block", fontSize: 11 }}>{kes(r.unit_cost)} / {r.unit_name || unit}</Text>}
        </div>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: "Paid", dataIndex: "paid", width: 90,
      render: (paid, r) => paid
        ? <Tag color="green">{PAID_FROM_LABEL[(r.paid_from || "cash") as WaterPaidFrom]}</Tag>
        : <Tag color="orange">Owed</Tag>,
    },
    { title: "By", dataIndex: "recorded_by_name", width: 90, render: (v) => <Text style={{ fontSize: 12 }}>{v || "—"}</Text> },
    ...(isAdmin ? [{
      title: "", key: "void", width: 44,
      render: (_: any, r: WaterDelivery) => r.status === "active" ? (
        <Tooltip title="Void (takes the water back off stock)">
          <Button size="small" type="text" danger icon={<StopOutlined />} onClick={() => setVoidTarget(r)} />
        </Tooltip>
      ) : null,
    }] : []),
  ];

  const deliveries = data?.deliveries || [];
  const low = item ? isWaterLow(item) : false;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={760}
      destroyOnClose
      title={<span><CarOutlined style={{ color: "#0284c7", marginRight: 8 }} />Water delivery — {item?.name || ""}</span>}
      footer={tab === "record" ? (
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={handleSave} icon={<CarOutlined />}>Record delivery</Button>
        </Space>
      ) : <Button onClick={onClose}>Close</Button>}
    >
      {item && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 12, fontSize: 12 }}>
          <span>In stock: <Text strong style={{ color: low ? "#dc2626" : undefined }}>{fmt(item.quantity)} {unit}</Text></span>
          {item.min_viable_quantity ? <span>Minimum: <Text strong>{fmt(item.min_viable_quantity)} {unit}</Text></span> : null}
          {low && <Tag color="red" style={{ margin: 0 }}>Water low</Tag>}
          <span>Meter: <Text strong>{inletMeter ? "counts water coming in" : "counts water dispensed"}</Text></span>
        </div>
      )}

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: "record",
            label: "Record delivery",
            children: (
              <Form form={form} layout="vertical" requiredMark="optional" disabled={isLoading}>
                {inletMeter ? (
                  <Form.Item name="how" label="How did the water go in?">
                    <Segmented
                      block
                      options={[
                        { value: "meter", label: "Through the meter" },
                        { value: "direct", label: "Bypassed the meter" },
                      ]}
                    />
                  </Form.Item>
                ) : (
                  <Alert
                    type="info" showIcon style={{ marginBottom: 12, fontSize: 12 }}
                    message="This meter counts water dispensed, so the truck's water isn't metered. Enter how much was delivered and it's added to stock."
                  />
                )}

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {how === "meter" ? (
                    <Form.Item
                      name="meter_reading"
                      label={`Meter reading after offloading (${meter?.unit_label || "m³"})`}
                      extra={`Last reading: ${fmt(lastReading, 3)}${reading != null && reading > lastReading ? ` → ${fmt(quantity)} ${unit} came in` : ""}`}
                      rules={[
                        { required: true, message: "Enter the meter reading" },
                        { validator: (_, v) => (v == null || v > lastReading ? Promise.resolve() : Promise.reject(new Error(`Must be higher than ${lastReading}`))) },
                      ]}
                      style={{ flex: "1 1 220px" }}
                    >
                      <InputNumber min={0} step={0.001} style={{ width: "100%" }} />
                    </Form.Item>
                  ) : (
                    <Form.Item
                      name="quantity"
                      label={`Water delivered (${unit})`}
                      rules={[{ required: true, message: "Enter how much was delivered" }]}
                      style={{ flex: "1 1 220px" }}
                    >
                      <InputNumber min={0.001} style={{ width: "100%" }} placeholder="e.g. 10000" />
                    </Form.Item>
                  )}
                  <Form.Item name="delivered_at" label="When" style={{ flex: "1 1 200px" }}>
                    <DatePicker
                      showTime={{ format: "HH:mm" }} format="DD MMM YYYY HH:mm" allowClear={false}
                      style={{ width: "100%" }} disabledDate={(d) => d && d.isAfter(dayjs().endOf("day"))}
                    />
                  </Form.Item>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <Form.Item name="supplier" label="Supplier / truck owner" style={{ flex: "1 1 220px" }}>
                    <AutoComplete
                      allowClear
                      placeholder="Pick or type a name"
                      options={supplierList.map((s) => ({ value: s.name }))}
                      filterOption={(input, o) => String(o?.value ?? "").toLowerCase().includes(input.toLowerCase())}
                    />
                  </Form.Item>
                  <Form.Item name="vehicle_plate" label="Vehicle plate" style={{ flex: "1 1 130px" }}>
                    <Input maxLength={20} placeholder="e.g. KDA 123A" style={{ textTransform: "uppercase" }} />
                  </Form.Item>
                  <Form.Item name="driver_name" label="Driver" style={{ flex: "1 1 150px" }}>
                    <Input maxLength={80} />
                  </Form.Item>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <Form.Item name="cost_basis" label="Cost" style={{ flex: "0 0 auto" }}>
                    <Segmented options={[{ value: "unit", label: `Per ${unit}` }, { value: "total", label: "Total" }]} />
                  </Form.Item>
                  {costBasis === "unit" ? (
                    <Form.Item name="unit_cost" label={`Price per ${unit} (KES)`} style={{ flex: "1 1 160px" }}
                      extra={cost != null ? `Total: ${kes(cost)}` : undefined}>
                      <InputNumber min={0} step={0.01} style={{ width: "100%" }} placeholder="Optional" />
                    </Form.Item>
                  ) : (
                    <Form.Item name="total_cost" label="Total paid for the load (KES)" style={{ flex: "1 1 160px" }}
                      extra={perUnit != null ? `${kes(perUnit)} per ${unit}` : undefined}>
                      <InputNumber min={0} style={{ width: "100%" }} placeholder="Optional" />
                    </Form.Item>
                  )}
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <Form.Item name="payment" label="Payment" style={{ flex: "0 0 auto" }}>
                    <Radio.Group optionType="button" buttonStyle="solid" options={[
                      { value: "paid", label: "Paid now" },
                      { value: "owed", label: "Owed (pay later)" },
                    ]} />
                  </Form.Item>
                  {payment === "paid" && (
                    <Form.Item name="paid_from" label="Paid from" style={{ flex: "0 0 auto" }}>
                      <Radio.Group optionType="button" options={[
                        { value: "cash", label: "Cash" },
                        { value: "mpesa", label: "M-Pesa" },
                        { value: "bank", label: "Bank" },
                      ]} />
                    </Form.Item>
                  )}
                </div>

                <Form.Item name="note" label="Note" style={{ marginBottom: 8 }}>
                  <Input.TextArea rows={2} maxLength={500} />
                </Form.Item>

                {item && quantity > 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Stock goes from {fmt(item.quantity)} to <Text strong>{fmt(item.quantity + quantity)} {unit}</Text>.
                    {perUnit != null && perUnit > 0 ? ` The water's buying price is updated to ${kes(perUnit)} per ${unit}.` : ""}
                  </Text>
                )}
              </Form>
            ),
          },
          {
            key: "history",
            label: `Deliveries${deliveries.length ? ` (${deliveries.length})` : ""}`,
            children: (
              <Table<WaterDelivery>
                rowKey="_id" size="small" loading={isLoading} dataSource={deliveries} columns={columns}
                pagination={{ pageSize: 10, hideOnSinglePage: true }} scroll={{ x: 680 }}
                locale={{ emptyText: "No water deliveries recorded yet" }}
              />
            ),
          },
        ]}
      />

      <Modal
        open={!!voidTarget}
        title={`Void delivery — ${fmt(voidTarget?.quantity)} ${voidTarget?.unit_name || unit}`}
        okText="Void" okButtonProps={{ danger: true }} confirmLoading={voiding}
        onOk={handleVoid} onCancel={() => { setVoidTarget(null); setVoidReason(""); }} destroyOnClose
      >
        <p style={{ fontSize: 13 }}>
          {voidTarget?.mode === "meter"
            ? "Its meter reading is undone, which takes the water back off stock. This only works while it's the latest meter reading."
            : "The water is taken back off stock."}
          {voidTarget?.journal_entry_id ? " The accounting entry is reversed." : ""}
        </p>
        <Input placeholder="Why? e.g. Recorded twice" value={voidReason} maxLength={300} onChange={(e) => setVoidReason(e.target.value)} />
      </Modal>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Button on inventory rows / cards (metered water items only)
// ─────────────────────────────────────────────────────────────────────────────
export const WaterDeliveryButton: React.FC<{
  record: any;
  onChanged?: () => void;
  size?: "small" | "middle";
}> = ({ record, onChanged, size = "small" }) => {
  const [open, setOpen] = useState(false);
  const meterOn = useWaterMeterSetting();
  if (!meterOn || !record?.meter?.enabled) return null;
  const low = isWaterLow(record);
  return (
    <>
      <Tooltip title={low ? "Water low — record a water truck delivery" : "Record a water truck delivery"}>
        <Button
          size={size}
          icon={<CarOutlined />}
          onClick={() => setOpen(true)}
          danger={low}
          type={low ? "primary" : "default"}
          style={{ borderRadius: 6, ...(low ? {} : { color: "#0284c7", borderColor: "#bae6fd" }) }}
        >
          {size === "small" ? undefined : "Water in"}
        </Button>
      </Tooltip>
      {open && (
        <WaterDeliveryModal inventoryId={record._id} open={open} onClose={() => setOpen(false)} onChanged={onChanged} />
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Banner at the top of Inventory when a metered water item is below its minimum
// ─────────────────────────────────────────────────────────────────────────────
export const LowWaterAlert: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const meterOn = useWaterMeterSetting();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["low-water-items"],
    queryFn: () => fetchAllInventory({ shop_id: localStorage.getItem("shopId") || undefined }),
    enabled: meterOn,
    staleTime: 30 * 1000,
  });
  if (!meterOn) return null;
  const list: any[] = Array.isArray(data) ? data : data?.data || [];
  const low = list.filter(isWaterLow);
  if (!low.length) return null;
  return (
    <>
      {low.map((w) => (
        <Alert
          key={w._id}
          type="error"
          showIcon
          style={{ marginBottom: 12, borderRadius: 10 }}
          message={<span><Text strong>Water low: {w.name}</Text> — {fmt(w.quantity)} {w.unit_id?.name || ""} left (minimum {fmt(w.min_viable_quantity)}). Order a water truck.</span>}
          action={<Button size="small" type="primary" danger icon={<CarOutlined />} onClick={() => setOpenId(w._id)}>Record water delivery</Button>}
        />
      ))}
      {openId && (
        <WaterDeliveryModal inventoryId={openId} open={!!openId} onClose={() => setOpenId(null)} onChanged={onChanged} />
      )}
    </>
  );
};
