import React from "react";
import { Button, Tooltip, Modal, Form, Input, message } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import { getPermissionChecker } from "@utils/getPermissionChecker";

interface SMSButtonProps {
  phoneNumber: string;
  customerId?: string;
  leadId?: string;
  onSuccess?: () => void;
  size?: "small" | "middle" | "large";
  type?: "primary" | "default" | "text" | "link";
  iconOnly?: boolean;
}

const SMSButton: React.FC<SMSButtonProps> = ({
  phoneNumber,
  customerId,
  leadId,
  onSuccess,
  size = "small",
  type = "default",
  iconOnly = false,
}) => {
  const [modalVisible, setModalVisible] = React.useState(false);
  const [form] = Form.useForm();
  const can = getPermissionChecker();
  const canManageAccounts = can("TWILIO_MANAGE_ACCOUNTS");

  const handleSendSMS = async (values: { message: string }) => {
    // This would integrate with your SMS sending functionality
    // For now, it's a placeholder
    message.success("SMS functionality coming soon");
    setModalVisible(false);
    form.resetFields();
    onSuccess?.();
  };

  if (!canManageAccounts) {
    return null;
  }

  return (
    <>
      <Tooltip title={`Send SMS to ${phoneNumber}`}>
        <Button
          icon={<MessageOutlined />}
          onClick={() => setModalVisible(true)}
          size={size}
          type={type}
          style={{ color: "#10b981", borderColor: "#10b981" }}
        >
          {iconOnly ? "" : "SMS"}
        </Button>
      </Tooltip>

      <Modal
        title="Send SMS"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Send"
      >
        <Form form={form} layout="vertical" onFinish={handleSendSMS}>
          <Form.Item label="To" name="to" initialValue={phoneNumber}>
            <Input disabled />
          </Form.Item>
          <Form.Item
            label="Message"
            name="message"
            rules={[{ required: true, message: "Please enter your message" }]}
          >
            <Input.TextArea rows={4} placeholder="Type your message..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SMSButton;
