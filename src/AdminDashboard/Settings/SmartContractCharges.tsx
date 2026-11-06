import React from "react";
import {
  AutoComplete,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { ProCard } from "@ant-design/pro-components";
import { PlusOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  addContractCharge,
  setContractChargeStatus,
  formatMoney,
  CONTRACT_STATUS_KEY,
  ContractCharge,
  ContractStatus,
} from "@services/smartContract";

const { Text } = Typography;

const CHARGE_SUGGESTIONS = ["Setup fee", "Installation", "Training", "Hardware", "Data migration", "Support visit"];

type ChargeStatus = "paid" | "outstanding" | "removed";
type AddValues = { label: string; amount: number; note?: string; pin: string };
type PendingChange = { charge: ContractCharge; status: ChargeStatus } | null;

type ApiError = { response?: { status?: number; data?: { message?: string } } };

// 403 (wrong PIN) is already shown by the request interceptor
const showError = (error: ApiError, fallback: string) => {
  if (error?.response?.status !== 403) message.error(error?.response?.data?.message || fallback);
};

const CHANGE_TEXT: Record<ChargeStatus, string> = {
  paid: "Mark as paid",
  outstanding: "Mark as outstanding",
  removed: "Remove",
};

// Amounts owed to BasePoint besides the monthly fee, e.g. a setup fee. Adding
// and settling them needs the BasePoint PIN, so the controls only show where
// it is configured. Charges never lock the system.
const SmartContractCharges: React.FC<{ status: ContractStatus }> = ({ status }) => {
  const queryClient = useQueryClient();
  const [addForm] = Form.useForm<AddValues>();
  const [pinForm] = Form.useForm<{ pin: string }>();
  const [adding, setAdding] = React.useState(false);
  const [pending, setPending] = React.useState<PendingChange>(null);
  const canEdit = status.history_edit_available;
  const currency = status.currency;
  const charges = status.other_charges || [];

  const applyResult = (result: { message: string; status: ContractStatus }) => {
    queryClient.setQueryData<ContractStatus>(CONTRACT_STATUS_KEY, result.status);
    message.success(result.message);
  };

  const addMutation = useMutation({
    mutationFn: addContractCharge,
    onSuccess: (result) => {
      applyResult(result);
      addForm.resetFields();
      setAdding(false);
    },
    onError: (error: ApiError) => showError(error, "Could not add the charge"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, pin, next }: { id: string; pin: string; next: ChargeStatus }) =>
      setContractChargeStatus(id, { pin, status: next }),
    onSuccess: (result) => {
      applyResult(result);
      pinForm.resetFields();
      setPending(null);
    },
    onError: (error: ApiError) => showError(error, "Could not update the charge"),
  });

  if (!charges.length && !canEdit) return null;

  const handleAdd = async () => {
    const values = await addForm.validateFields();
    addMutation.mutate({ ...values, label: values.label.trim() });
  };

  const handleConfirmChange = async () => {
    if (!pending) return;
    const { pin } = await pinForm.validateFields();
    statusMutation.mutate({ id: pending.charge._id, pin, next: pending.status });
  };

  const columns = [
    {
      title: "Item",
      dataIndex: "label",
      key: "label",
      render: (v: string, row: ContractCharge) => (
        <>
          <Text style={{ fontSize: 12, display: "block" }}>{v}</Text>
          {row.note && <Text type="secondary" style={{ fontSize: 11 }}>{row.note}</Text>}
        </>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right" as const,
      render: (v: number) => <Text style={{ fontSize: 12 }}>{formatMoney(v, currency)}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: ContractCharge["status"], row: ContractCharge) => (
        <>
          <Tag color={v === "paid" ? "green" : "orange"}>{v === "paid" ? "Paid" : "Outstanding"}</Tag>
          {v === "paid" && row.status_changed_at && (
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
              {dayjs(row.status_changed_at).format("DD MMM YYYY")}
            </Text>
          )}
        </>
      ),
    },
    {
      title: "Added",
      dataIndex: "added_at",
      key: "added_at",
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(v).format("DD MMM YYYY")}</Text>,
    },
    ...(canEdit
      ? [
          {
            title: "",
            key: "actions",
            render: (_: unknown, row: ContractCharge) => (
              <Space size={4}>
                <Button
                  size="small"
                  type="link"
                  onClick={() => setPending({ charge: row, status: row.status === "paid" ? "outstanding" : "paid" })}
                >
                  {row.status === "paid" ? "Unpaid" : "Paid"}
                </Button>
                <Button size="small" type="link" danger onClick={() => setPending({ charge: row, status: "removed" })}>
                  Remove
                </Button>
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <ProCard
      bordered
      title="Other charges"
      extra={
        canEdit && (
          <Button size="small" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
            Add charge
          </Button>
        )
      }
      style={{ marginBottom: 16 }}
    >
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
        Amounts owed to BasePoint besides the monthly fee, such as a setup fee. They show in the
        payment details but do not lock the system.
      </Text>
      {charges.length ? (
        <>
          <Table
            size="small"
            rowKey="_id"
            columns={columns}
            dataSource={charges}
            pagination={{ pageSize: 6, hideOnSinglePage: true }}
            scroll={{ x: true }}
          />
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Outstanding: </Text>
            <Text strong>{formatMoney(status.other_charges_outstanding, currency)}</Text>
          </div>
        </>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No other charges" />
      )}

      <Modal
        open={adding}
        title="Add charge"
        okText="Add"
        onOk={handleAdd}
        confirmLoading={addMutation.isPending}
        onCancel={() => setAdding(false)}
        destroyOnHidden
      >
        <Form form={addForm} layout="vertical">
          <Form.Item name="label" label="What is it for?" rules={[{ required: true, whitespace: true, message: "e.g. Setup fee" }]}>
            <AutoComplete
              options={CHARGE_SUGGESTIONS.map((value) => ({ value }))}
              placeholder="e.g. Setup fee"
              filterOption={(input, option) => (option?.value ?? "").toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="amount" label={`Amount (${currency})`} rules={[{ required: true, message: "Enter the amount" }]}>
            <InputNumber<number>
              min={1}
              step={500}
              style={{ width: "100%" }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(v) => Number((v || "").replace(/,/g, ""))}
            />
          </Form.Item>
          <Form.Item name="note" label="Note (optional)">
            <Input maxLength={200} placeholder="e.g. Payable with the first month" />
          </Form.Item>
          <Form.Item name="pin" label="BasePoint PIN" rules={[{ required: true, message: "Enter the BasePoint PIN" }]}>
            <Input.Password autoComplete="new-password" inputMode="numeric" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!pending}
        title={pending ? `${CHANGE_TEXT[pending.status]} — ${pending.charge.label}` : ""}
        okText={pending ? CHANGE_TEXT[pending.status] : "OK"}
        okButtonProps={{ danger: pending?.status === "removed" }}
        onOk={handleConfirmChange}
        confirmLoading={statusMutation.isPending}
        onCancel={() => setPending(null)}
        destroyOnHidden
      >
        {pending && (
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
            {formatMoney(pending.charge.amount, currency)}
            {pending.status === "removed" ? " — removed charges stay on record but are no longer shown." : ""}
          </Text>
        )}
        <Form form={pinForm} layout="vertical">
          <Form.Item name="pin" label="BasePoint PIN" rules={[{ required: true, message: "Enter the BasePoint PIN" }]}>
            <Input.Password autoComplete="new-password" inputMode="numeric" />
          </Form.Item>
        </Form>
      </Modal>
    </ProCard>
  );
};

export default SmartContractCharges;
