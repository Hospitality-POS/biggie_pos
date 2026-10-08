import React from "react";
import { Modal, Form, Input, Space } from "antd";
import { MailOutlined, UserOutlined, PlusOutlined, SendOutlined } from "@ant-design/icons";
import { C, type SendEmailValues } from "./printHelpers";

interface SendEmailModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (values: SendEmailValues) => Promise<void>;
  sending: boolean;
  docLabel: string;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  open,
  onClose,
  onSend,
  sending,
  docLabel,
}) => {
  const [form] = Form.useForm();
  const handleOk = async () => {
    const values = await form.validateFields();
    await onSend(values);
    form.resetFields();
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={handleOk}
      confirmLoading={sending}
      okText={
        <Space>
          <SendOutlined />
          Send {docLabel}
        </Space>
      }
      okButtonProps={{ style: { background: C.primary, borderColor: C.primary } }}
      title={
        <Space>
          <MailOutlined style={{ color: C.primary }} />
          <span>Send {docLabel} via Email</span>
        </Space>
      }
      width={480}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="to"
          label="Recipient Email"
          rules={[
            { required: true, message: "Recipient email is required" },
            { type: "email", message: "Enter a valid email address" },
          ]}
        >
          <Input prefix={<MailOutlined style={{ color: C.subText }} />} placeholder="customer@email.com" />
        </Form.Item>
        <Form.Item name="recipientName" label="Recipient Name">
          <Input prefix={<UserOutlined style={{ color: C.subText }} />} placeholder="e.g. John Kamau" />
        </Form.Item>
        <Form.Item name="cc" label="CC (optional)" extra="Separate multiple addresses with commas">
          <Input prefix={<PlusOutlined style={{ color: C.subText }} />} placeholder="accounts@company.com" />
        </Form.Item>
        <Form.Item name="intro" label="Personal Message (optional)">
          <Input.TextArea rows={3} placeholder="Please find your document attached." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SendEmailModal;
