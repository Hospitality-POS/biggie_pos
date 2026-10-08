import React from "react";
import { Modal, Form, Input, Space } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { C } from "./printHelpers";

interface ReprintReasonModalProps {
  open: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export const ReprintReasonModal: React.FC<ReprintReasonModalProps> = ({
  open,
  onConfirm,
  onCancel,
}) => {
  const [form] = Form.useForm();

  return (
    <Modal
      open={open}
      onOk={async () => {
        const { reason } = await form.validateFields();
        form.resetFields();
        onConfirm(reason);
      }}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      okText="Confirm Reprint"
      okButtonProps={{ style: { background: C.primary, borderColor: C.primary } }}
      title={
        <Space>
          <WarningOutlined style={{ color: "#f59e0b" }} />
          Reprint Reason Required
        </Space>
      }
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="reason"
          label="Reason for reprint"
          rules={[{ required: true, message: "Please enter a reason" }]}
        >
          <Input.TextArea rows={3} placeholder="e.g. Customer lost original receipt" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ReprintReasonModal;
