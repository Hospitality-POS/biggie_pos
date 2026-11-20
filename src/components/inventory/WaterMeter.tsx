import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
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
  ArrowDownOutlined,
  ArrowUpOutlined,
  DashboardOutlined,
  HistoryOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import {
  addMeterReading,
  fetchMeterReadings,
  undoLatestMeterReading,
  type InventoryMeter,
  type MeterReading,
} from "@services/inventory";

const { Text } = Typography;

// Water meter tracking (System Setup → Privacy → Inventory, retail shops).
// An item linked to a meter keeps the meter's last reading; each new reading
// moves the item's stock by (reading − last reading) × conversion rate —
// up for a meter on the water coming in, down for one on water dispensed.

const fmt = (n: number | null | undefined, digits = 2) =>
  Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: digits });

const errorText = (e: any, fallback: string) =>
  e?.response?.data?.error || e?.response?.data?.message || fallback;

// ─────────────────────────────────────────────────────────────────────────────
// Form section for Add / Edit Inventory
// ─────────────────────────────────────────────────────────────────────────────

/** Form values the meter section uses → the `meter` object the API expects */
export const meterFormValues = (meter?: InventoryMeter | null) => ({
  meter_enabled: !!meter?.enabled,
  meter_name: meter?.name || "",
  meter_unit_label: meter?.unit_label || "m³",
  meter_conversion_rate: meter?.conversion_rate ?? 1000,
  meter_direction: meter?.direction || "in",
  meter_initial_reading: meter?.initial_reading ?? 0,
});

export const meterPayload = (values: Record<string, any>, savedMeter?: InventoryMeter | null) => {
  if (!values.meter_enabled) return savedMeter?.enabled ? { enabled: false } : undefined;
  return {
    enabled: true,
    name: values.meter_name || "",
    unit_label: values.meter_unit_label || "m³",
    conversion_rate: Number(values.meter_conversion_rate) || 1,
    direction: values.meter_direction === "out" ? "out" : "in",
    initial_reading: Number(values.meter_initial_reading) || 0,
  };
};

export const WaterMeterFields: React.FC<{
  form: FormInstance;
  hasVariants: boolean;
  stockUnit?: string;
  /** Readings already recorded — the starting reading can no longer change */
  hasReadings?: boolean;
  lastReading?: number | null;
}> = ({ form, hasVariants, stockUnit, hasReadings, lastReading }) => {
  const enabled = Form.useWatch("meter_enabled", form);
  const unitLabel = Form.useWatch("meter_unit_label", form) || "m³";
  const rate = Form.useWatch("meter_conversion_rate", form);
  const direction = Form.useWatch("meter_direction", form);
  const unit = stockUnit || "stock units";

  return (
    <div
      style={{
        border: `1px solid ${enabled ? "#bae6fd" : "#e2e8f0"}`,
        background: enabled ? "#f0f9ff" : "#fff",
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 9, background: "#e0f2fe", color: "#0284c7",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0,
          }}
        >
          <DashboardOutlined />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ display: "block" }}>Track with a water meter</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Record the meter reading each day and the water quantity updates from the difference.
          </Text>
        </div>
        <Form.Item name="meter_enabled" valuePropName="checked" style={{ margin: 0 }}>
          <Switch disabled={hasVariants} checkedChildren="ON" unCheckedChildren="OFF" />
        </Form.Item>
      </div>

      {hasVariants && (
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
          Meter tracking works on items without variants.
        </Text>
      )}

      {enabled && !hasVariants && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <Form.Item name="meter_name" label="Meter name / number" style={{ marginBottom: 8 }}>
              <Input placeholder="e.g. Main inlet meter" maxLength={80} />
            </Form.Item>
            <Form.Item
              name="meter_unit_label"
              label="Meter unit"
              tooltip="What the meter counts, e.g. m³, litres or units"
              rules={[{ required: true, message: "Enter the meter unit" }]}
              style={{ marginBottom: 8 }}
            >
              <Input placeholder="m³" maxLength={20} />
            </Form.Item>
            <Form.Item
              name="meter_conversion_rate"
              label={`1 ${unitLabel} equals`}
              tooltip={`How much stock (${unit}) one meter unit is. 1 m³ = 1000 litres.`}
              rules={[{ required: true, message: "Enter the conversion" }]}
              style={{ marginBottom: 8 }}
            >
              <InputNumber min={0.0001} style={{ width: "100%" }} addonAfter={unit} />
            </Form.Item>
            <Form.Item
              name="meter_initial_reading"
              label="Starting meter reading"
              tooltip={hasReadings ? "Readings have been recorded — the next reading counts from the last one" : "The reading on the meter today, before any new reading is recorded"}
              style={{ marginBottom: 8 }}
            >
              <InputNumber min={0} style={{ width: "100%" }} disabled={hasReadings} addonAfter={unitLabel} />
            </Form.Item>
          </div>

          <Form.Item name="meter_direction" label="What does this meter measure?" style={{ marginBottom: 8 }}>
            <Segmented
              block
              options={[
                { value: "in", label: <span><ArrowUpOutlined /> Water coming in (adds stock)</span> },
                { value: "out", label: <span><ArrowDownOutlined /> Water dispensed (deducts stock)</span> },
              ]}
            />
          </Form.Item>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Example: a reading that goes up by 2 {unitLabel} {direction === "out" ? "removes" : "adds"}{" "}
            {fmt(2 * (Number(rate) || 0))} {unit} {direction === "out" ? "from" : "to"} stock.
            {hasReadings && lastReading != null && <> Last reading: <b>{fmt(lastReading, 3)} {unitLabel}</b>.</>}
          </Text>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Readings modal (Inventory list)
// ─────────────────────────────────────────────────────────────────────────────

export const MeterReadingsModal: React.FC<{
  inventoryId: string;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}> = ({ inventoryId, open, onClose, onChanged }) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const queryKey = ["meter-readings", inventoryId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchMeterReadings(inventoryId),
    enabled: open && !!inventoryId,
  });

  const item = data?.item;
  const meter = item?.meter;
  const readings = data?.readings ?? [];
  const unitLabel = meter?.unit_label || "m³";
  const stockUnit = item?.unit_id?.name || "units";
  const rate = meter?.conversion_rate && meter.conversion_rate > 0 ? meter.conversion_rate : 1;
  const sign = meter?.direction === "out" ? -1 : 1;
  const lastReading = meter?.last_reading ?? meter?.initial_reading ?? 0;
  const lastAt = meter?.last_reading_at ? dayjs(meter.last_reading_at) : null;
  const readToday = !!lastAt && lastAt.isSame(dayjs(), "day");

  const newReading = Form.useWatch("reading", form);
  const isReset = Form.useWatch("is_reset", form);
  const resetStart = Form.useWatch("reset_start", form);

  const preview = useMemo(() => {
    if (newReading === null || newReading === undefined || newReading === "") return null;
    const from = isReset ? Number(resetStart) || 0 : lastReading;
    const used = Number(newReading) - from;
    if (used < 0) return { invalid: true, from } as const;
    const change = used * rate * sign;
    return { invalid: false, from, used, change, after: (item?.quantity || 0) + change } as const;
  }, [newReading, isReset, resetStart, lastReading, rate, sign, item?.quantity]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey });
    onChanged?.();
  };

  const addMutation = useMutation({
    mutationFn: (values: any) =>
      addMeterReading(inventoryId, {
        reading: Number(values.reading),
        reading_date: (values.reading_date as Dayjs | undefined)?.toISOString(),
        note: values.note || undefined,
        reset_start: values.is_reset ? Number(values.reset_start) || 0 : undefined,
      }),
    onSuccess: () => {
      message.success("Meter reading recorded — water quantity updated");
      form.resetFields();
      refresh();
    },
    onError: (e: any) => message.error(errorText(e, "Failed to record the reading")),
  });

  const undoMutation = useMutation({
    mutationFn: () => undoLatestMeterReading(inventoryId),
    onSuccess: () => {
      message.success("Latest reading undone");
      refresh();
    },
    onError: (e: any) => message.error(errorText(e, "Failed to undo the reading")),
  });

  const columns = [
    {
      title: "Date",
      dataIndex: "reading_date",
      render: (d: string, r: MeterReading) => (
        <Space direction="vertical" size={0}>
          <Text>{dayjs(d).format("DD MMM YYYY")}</Text>
          {r.is_reset && <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>Meter reset</Tag>}
        </Space>
      ),
    },
    { title: `Previous (${unitLabel})`, dataIndex: "previous_reading", render: (v: number) => fmt(v, 3) },
    { title: `Reading (${unitLabel})`, dataIndex: "reading", render: (v: number) => <Text strong>{fmt(v, 3)}</Text> },
    { title: `Used (${unitLabel})`, dataIndex: "units_used", render: (v: number) => fmt(v, 3) },
    {
      title: `Water (${stockUnit})`,
      dataIndex: "quantity_change",
      render: (v: number) => (
        <Text strong style={{ color: v < 0 ? "#dc2626" : "#16a34a" }}>
          {v > 0 ? "+" : ""}{fmt(v)}
        </Text>
      ),
    },
    { title: "Stock after", dataIndex: "qty_after", render: (v: number) => fmt(v) },
    {
      title: "By",
      dataIndex: "recorded_by_name",
      render: (v: string, r: MeterReading) => (
        <Tooltip title={r.note}>
          <Text type="secondary" style={{ fontSize: 12 }}>{v || "—"}{r.note ? " · 📝" : ""}</Text>
        </Tooltip>
      ),
    },
  ];

  const stat = (label: string, value: React.ReactNode, sub?: React.ReactNode) => (
    <div style={{ flex: "1 1 150px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{label}</Text>
      <Text strong style={{ fontSize: 16 }}>{value}</Text>
      {sub && <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{sub}</Text>}
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={860}
      destroyOnClose
      title={
        <Space>
          <DashboardOutlined style={{ color: "#0284c7" }} />
          <span>Meter Readings{item?.name ? ` — ${item.name}` : ""}</span>
        </Space>
      }
    >
      {isLoading || !meter ? (
        <div style={{ padding: 40, textAlign: "center" }}><Text type="secondary">Loading…</Text></div>
      ) : (
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {stat("Water in stock", `${fmt(item?.quantity)} ${stockUnit}`)}
            {stat("Last reading", `${fmt(lastReading, 3)} ${unitLabel}`, lastAt ? lastAt.format("DD MMM YYYY") : "Starting reading")}
            {stat("Conversion", `1 ${unitLabel} = ${fmt(rate)} ${stockUnit}`, meter.name || undefined)}
            {stat(
              "Meter measures",
              meter.direction === "out" ? "Water dispensed" : "Water coming in",
              meter.direction === "out" ? "Readings deduct stock" : "Readings add stock"
            )}
          </div>

          {!readToday && (
            <Alert type="info" showIcon message="No reading recorded today yet." style={{ borderRadius: 8 }} />
          )}

          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
            <Text strong style={{ display: "block", marginBottom: 10 }}>Add new reading</Text>
            <Form
              form={form}
              layout="vertical"
              initialValues={{ reading_date: dayjs(), is_reset: false }}
              onFinish={(values) => addMutation.mutate(values)}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <Form.Item name="reading_date" label="Reading date" rules={[{ required: true, message: "Pick a date" }]} style={{ marginBottom: 8 }}>
                  <DatePicker
                    style={{ width: "100%" }}
                    format="DD MMM YYYY"
                    allowClear={false}
                    disabledDate={(d) => d.isAfter(dayjs(), "day") || (!!lastAt && d.isBefore(lastAt, "day"))}
                  />
                </Form.Item>
                <Form.Item
                  name="reading"
                  label={`Meter reading (${unitLabel})`}
                  rules={[{ required: true, message: "Enter the reading" }]}
                  style={{ marginBottom: 8 }}
                >
                  <InputNumber min={0} style={{ width: "100%" }} placeholder={`Last: ${fmt(lastReading, 3)}`} />
                </Form.Item>
                <Form.Item name="note" label="Note (optional)" style={{ marginBottom: 8 }}>
                  <Input placeholder="e.g. Morning reading" maxLength={200} />
                </Form.Item>
              </div>

              <Space wrap align="center" style={{ marginBottom: 8 }}>
                <Form.Item name="is_reset" valuePropName="checked" style={{ margin: 0 }}>
                  <Checkbox>Meter was replaced or reset</Checkbox>
                </Form.Item>
                {isReset && (
                  <Form.Item name="reset_start" style={{ margin: 0 }} rules={[{ required: true, message: "Enter the new meter's starting reading" }]}>
                    <InputNumber min={0} placeholder="New meter started at" style={{ width: 200 }} addonAfter={unitLabel} />
                  </Form.Item>
                )}
              </Space>

              {preview && (
                preview.invalid ? (
                  <Alert
                    type="error"
                    showIcon
                    style={{ marginBottom: 10, borderRadius: 8 }}
                    message={`The reading can't be lower than ${fmt(preview.from, 3)} ${unitLabel}. If the meter was replaced or reset, tick the box above.`}
                  />
                ) : (
                  <Alert
                    type={preview.change < 0 ? "warning" : "success"}
                    showIcon
                    style={{ marginBottom: 10, borderRadius: 8 }}
                    message={
                      <span>
                        {fmt(preview.used, 3)} {unitLabel} used →{" "}
                        <b>{preview.change > 0 ? "+" : ""}{fmt(preview.change)} {stockUnit}</b>. Water in stock becomes{" "}
                        <b>{fmt(preview.after)} {stockUnit}</b>.
                      </span>
                    }
                  />
                )
              )}

              <Button
                type="primary"
                htmlType="submit"
                loading={addMutation.isLoading}
                disabled={!!preview?.invalid}
                icon={<DashboardOutlined />}
              >
                Save reading & update quantity
              </Button>
            </Form>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Space><HistoryOutlined /><Text strong>Reading history</Text></Space>
              {readings.length > 0 && (
                <Popconfirm
                  title="Undo the latest reading?"
                  description={`This reverses its ${fmt(readings[0].quantity_change)} ${stockUnit} stock change.`}
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
              dataSource={readings}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              scroll={{ x: 700 }}
              locale={{ emptyText: "No readings yet — add today's reading above." }}
            />
          </div>
        </Space>
      )}
    </Modal>
  );
};

/** "Meter" button for an inventory row/card — only for items linked to a meter */
export const MeterReadingsButton: React.FC<{
  record: any;
  onChanged?: () => void;
  size?: "small" | "middle";
  block?: boolean;
}> = ({ record, onChanged, size = "small", block }) => {
  const [open, setOpen] = useState(false);
  if (!record?.meter?.enabled) return null;
  const lastAt = record.meter.last_reading_at ? dayjs(record.meter.last_reading_at) : null;
  const readToday = !!lastAt && lastAt.isSame(dayjs(), "day");
  return (
    <>
      <Tooltip title={readToday ? "Meter readings" : "No meter reading today"}>
        <Button
          size={size}
          block={block}
          icon={<DashboardOutlined />}
          onClick={() => setOpen(true)}
          style={{ borderRadius: 6, color: "#0284c7", borderColor: readToday ? "#bae6fd" : "#f59e0b" }}
        >
          {size === "small" ? undefined : "Meter"}
        </Button>
      </Tooltip>
      {open && (
        <MeterReadingsModal
          inventoryId={record._id}
          open={open}
          onClose={() => setOpen(false)}
          onChanged={onChanged}
        />
      )}
    </>
  );
};
