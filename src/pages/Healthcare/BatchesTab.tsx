import React, { useEffect, useState } from "react";
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Segmented, Select, Space, Statistic, Table, Tag, Typography, message } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import {
  createBatch,
  fetchBatchSummary,
  fetchBatches,
  healthcareError,
  writeOffBatch,
  type BatchState,
  type StockBatch,
} from "@services/healthcare";
import { useDebounced, useHealthcareAccess, useMedicineOptions } from "./shared";

const { Text } = Typography;

const STATE_TAG: Record<BatchState, { label: string; color: string }> = {
  active: { label: "In date", color: "green" },
  expiring: { label: "Expiring soon", color: "orange" },
  expired: { label: "Expired", color: "red" },
  empty: { label: "Used up", color: "default" },
};

const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

const BatchesTab: React.FC = () => {
  const access = useHealthcareAccess();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<BatchState | "all">("all");
  const [typed, setTyped] = useState("");
  const search = useDebounced(typed.trim());
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [writeOff, setWriteOff] = useState<StockBatch | null>(null);

  const { data: summary } = useQuery({ queryKey: ["healthcare-batches", "summary"], queryFn: fetchBatchSummary });
  const { data, isFetching } = useQuery({
    queryKey: ["healthcare-batches", status, search],
    queryFn: () => fetchBatches({ status: status === "all" ? undefined : status, search: search || undefined }),
  });


  const refresh = () => queryClient.invalidateQueries({ queryKey: ["healthcare-batches"] });

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <Card size="small">
          <Statistic title="In-date units" value={summary?.active.units ?? 0} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {summary?.active.batches ?? 0} batches · value {money(summary?.active.value ?? 0)}
          </Text>
        </Card>
        <Card size="small" onClick={() => setStatus("expiring")} hoverable>
          <Statistic title={`Expiring in ${summary?.near_expiry_days ?? 90} days`} value={summary?.expiring.units ?? 0} valueStyle={{ color: "#d97706" }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {summary?.expiring.batches ?? 0} batches · value {money(summary?.expiring.value ?? 0)}
          </Text>
        </Card>
        <Card size="small" onClick={() => setStatus("expired")} hoverable>
          <Statistic title="Expired, still on the shelf" value={summary?.expired.units ?? 0} valueStyle={{ color: "#dc2626" }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {summary?.expired.batches ?? 0} batches · value {money(summary?.expired.value ?? 0)}
          </Text>
        </Card>
      </div>

      <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
        <Space wrap>
          <Segmented<BatchState | "all">
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "In date" },
              { value: "expiring", label: "Expiring" },
              { value: "expired", label: "Expired" },
              { value: "empty", label: "Used up" },
            ]}
          />
          <Input allowClear prefix={<SearchOutlined />} placeholder="Medicine or batch no." onChange={(e) => setTyped(e.target.value)} style={{ width: 240 }} />
        </Space>
        {access.manageBatches && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setReceiveOpen(true)}>
            Receive batch
          </Button>
        )}
      </Space>

      <Table<StockBatch>
        rowKey="_id"
        size="middle"
        loading={isFetching}
        dataSource={data?.data ?? []}
        scroll={{ x: 800 }}
        locale={{ emptyText: "No batches recorded" }}
        columns={[
          { title: "Medicine", dataIndex: "product_name", render: (n: string) => <Text strong>{n}</Text> },
          { title: "Batch no.", dataIndex: "batch_number", width: 130 },
          {
            title: "Expiry",
            dataIndex: "expiry_date",
            width: 120,
            sorter: (a, b) => a.expiry_date.localeCompare(b.expiry_date),
            render: (d: string) => dayjs(d).format("DD MMM YYYY"),
          },
          { title: "Left", width: 90, render: (_, b) => `${b.quantity_remaining} / ${b.quantity_received}` },
          { title: "Supplier", dataIndex: "supplier", width: 150, render: (s: string) => s || "—" },
          { title: "State", width: 130, render: (_, b) => <Tag color={STATE_TAG[b.state].color}>{STATE_TAG[b.state].label}</Tag> },
          ...(access.manageBatches
            ? [
                {
                  title: "",
                  width: 100,
                  render: (_: unknown, b: StockBatch) =>
                    b.quantity_remaining > 0 && (
                      <Button size="small" danger={b.state === "expired"} onClick={() => setWriteOff(b)}>
                        Write off
                      </Button>
                    ),
                },
              ]
            : []),
        ]}
      />

      <ReceiveBatchModal open={receiveOpen} onClose={() => setReceiveOpen(false)} onDone={refresh} />
      <WriteOffModal batch={writeOff} onClose={() => setWriteOff(null)} onDone={refresh} />
    </Space>
  );
};

interface ReceiveValues {
  product_id: string;
  batch_number: string;
  expiry_date: Dayjs;
  manufacture_date?: Dayjs;
  quantity: number;
  unit_cost?: number;
  supplier?: string;
}

const ReceiveBatchModal: React.FC<{ open: boolean; onClose: () => void; onDone: () => void }> = ({ open, onClose, onDone }) => {
  const [form] = Form.useForm<ReceiveValues>();
  const { data: medicines = [], isLoading } = useMedicineOptions(open);
  const save = useMutation({
    mutationFn: (v: ReceiveValues) =>
      createBatch({
        ...v,
        expiry_date: v.expiry_date.endOf("day").toISOString(),
        manufacture_date: v.manufacture_date?.toISOString(),
      }),
    onSuccess: (b) => {
      message.success(`Batch ${b.batch_number} recorded`);
      form.resetFields();
      onDone();
      onClose();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't record the batch")),
  });

  return (
    <Modal title="Receive batch" open={open} onCancel={onClose} onOk={() => form.submit()} okText="Save" confirmLoading={save.isLoading} destroyOnClose>
      <Form form={form} layout="vertical" preserve={false} onFinish={(v) => save.mutate(v)}>
        <Form.Item name="product_id" label="Medicine" rules={[{ required: true, message: "Choose the medicine" }]}>
          <Select showSearch optionFilterProp="label" loading={isLoading} options={medicines.map((m) => ({ value: m._id, label: m.name }))} />
        </Form.Item>
        <Space wrap>
          <Form.Item name="batch_number" label="Batch / lot no." rules={[{ required: true, whitespace: true, message: "Enter the batch number" }]}>
            <Input style={{ width: 180 }} />
          </Form.Item>
          <Form.Item
            name="expiry_date"
            label="Expiry date"
            rules={[{ required: true, message: "Enter the expiry date" }]}
          >
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="manufacture_date" label="Manufactured">
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
        </Space>
        <Space wrap>
          <Form.Item name="quantity" label="Units received" rules={[{ required: true, message: "How many units?" }]}>
            <InputNumber min={1} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="unit_cost" label="Cost per unit">
            <InputNumber min={0} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="supplier" label="Supplier">
            <Input style={{ width: 180 }} />
          </Form.Item>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>
          This records which batch the stock came from. Receive the stock itself through Medicine Delivery or Purchase Orders as usual.
        </Text>
      </Form>
    </Modal>
  );
};

const WriteOffModal: React.FC<{ batch: StockBatch | null; onClose: () => void; onDone: () => void }> = ({ batch, onClose, onDone }) => {
  const [form] = Form.useForm<{ quantity: number; reason: string }>();
  useEffect(() => {
    if (batch) form.setFieldsValue({ quantity: batch.quantity_remaining, reason: batch.state === "expired" ? "Expired" : "" });
  }, [batch, form]);

  const save = useMutation({
    mutationFn: (v: { quantity: number; reason: string }) => writeOffBatch(batch?._id ?? "", v.quantity, v.reason),
    onSuccess: () => {
      message.success("Written off");
      onDone();
      onClose();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't write off")),
  });

  return (
    <Modal
      title={batch ? `Write off · ${batch.product_name} (${batch.batch_number})` : "Write off"}
      open={!!batch}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Write off"
      okButtonProps={{ danger: true }}
      confirmLoading={save.isLoading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
        <Form.Item name="quantity" label="Units" rules={[{ required: true, message: "How many units?" }]}>
          <InputNumber min={1} max={batch?.quantity_remaining} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="reason" label="Reason" rules={[{ required: true, whitespace: true, message: "Give a reason" }]}>
          <Select
            showSearch
            options={["Expired", "Damaged", "Recalled", "Lost"].map((r) => ({ value: r, label: r }))}
          />
        </Form.Item>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Also adjust the medicine's stock count in Pharmacy Stock so the shelf and the system agree.
        </Text>
      </Form>
    </Modal>
  );
};

export default BatchesTab;
