import React from "react";
import { Modal, Form, DatePicker, Input, Typography, Alert, message } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs, { Dayjs } from "dayjs";
import {
  editContractHistory,
  historyDateOf,
  CONTRACT_STATUS_KEY,
  ContractActivation,
  ContractStatus,
} from "@services/smartContract";

const { Text } = Typography;

type EditValues = { effective_date?: Dayjs | null; paid_until?: Dayjs | null; note?: string; pin: string };

interface Props {
  entry: ContractActivation | null;
  // The entry the install's current paid-until date came from — editing its
  // paid-until changes the client's access
  isCurrent: boolean;
  onClose: () => void;
}

// BasePoint staff only (PIN). Edits an entry's date, note and paid-until date.
// Paid-until on the current entry changes the client's access; on older
// entries only the record changes. The fee is never edited here.
const SmartContractHistoryEditModal: React.FC<Props> = ({ entry, isCurrent, onClose }) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<EditValues>();

  React.useEffect(() => {
    if (!entry) return;
    form.setFieldsValue({
      effective_date: dayjs(historyDateOf(entry)),
      paid_until: entry.paid_until ? dayjs(entry.paid_until.slice(0, 10)) : undefined,
      note: entry.note || undefined,
      pin: undefined,
    });
  }, [form, entry]);

  const mutation = useMutation({
    mutationFn: ({ row, values }: { row: ContractActivation; values: EditValues }) =>
      editContractHistory(row.index, {
        pin: values.pin,
        activated_at: row.activated_at,
        effective_date: values.effective_date ? values.effective_date.format("YYYY-MM-DD") : null,
        note: values.note?.trim() || null,
        paid_until: row.paid_until && values.paid_until ? values.paid_until.format("YYYY-MM-DD") : undefined,
      }),
    onSuccess: (result) => {
      queryClient.setQueryData<ContractStatus>(CONTRACT_STATUS_KEY, result.status);
      message.success(result.message);
      onClose();
    },
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
      // 403 (wrong PIN) is already shown by the request interceptor
      if (error?.response?.status !== 403) {
        message.error(error?.response?.data?.message || "Could not update the entry");
      }
    },
  });

  const handleOk = async () => {
    if (!entry) return;
    const values = await form.validateFields();
    mutation.mutate({ row: entry, values });
  };

  return (
    <Modal
      open={!!entry}
      title="Edit history entry"
      okText="Save"
      onOk={handleOk}
      confirmLoading={mutation.isPending}
      onCancel={onClose}
      destroyOnHidden
    >
      {entry && (
        <>
          <Alert
            type={isCurrent && entry.paid_until ? "warning" : "info"}
            showIcon
            style={{ marginBottom: 16 }}
            message={
              isCurrent && entry.paid_until
                ? "This is the current entry: changing Paid until changes the client's access right away."
                : "This is an older entry: changes only correct the history record. The client's access stays as it is."
            }
          />
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
            Entered {dayjs(entry.activated_at).format("DD MMM YYYY, HH:mm")}
            {entry.activated_by ? ` by ${entry.activated_by}` : ""} — this stays on the record.
          </Text>
          <Form form={form} layout="vertical">
            <Form.Item
              name="effective_date"
              label="Date"
              tooltip="The date this entry is shown under, e.g. last month. Cannot be in the future."
              rules={[{ required: true, message: "Pick a date" }]}
            >
              <DatePicker
                format="DD MMM YYYY"
                style={{ width: "100%" }}
                disabledDate={(d) => d.isAfter(dayjs(), "day")}
              />
            </Form.Item>
            {entry.paid_until && (
              <Form.Item
                name="paid_until"
                label="Paid until"
                extra={
                  entry.previous_paid_until
                    ? `Originally ${dayjs(entry.previous_paid_until.slice(0, 10)).format("DD MMM YYYY")}`
                    : undefined
                }
                rules={[{ required: true, message: "Pick the paid-until date" }]}
              >
                <DatePicker format="DD MMM YYYY" style={{ width: "100%" }} />
              </Form.Item>
            )}
            <Form.Item name="note" label="Note (optional)">
              <Input maxLength={200} placeholder="e.g. Service started in October" />
            </Form.Item>
            <Form.Item
              name="pin"
              label="BasePoint PIN"
              rules={[{ required: true, message: "Enter the BasePoint PIN" }]}
            >
              <Input.Password autoComplete="new-password" inputMode="numeric" maxLength={20} />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default SmartContractHistoryEditModal;
