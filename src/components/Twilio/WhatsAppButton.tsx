import React from "react";
import { Button, Tooltip, Modal, Form, Input, message } from "antd";
import { WhatsAppOutlined } from "@ant-design/icons";
import { getPermissionChecker } from "@utils/getPermissionChecker";

interface WhatsAppButtonProps {
  phoneNumber: string;
  customerId?: string;
  leadId?: string;
  onSuccess?: () => void;
  size?: "small" | "middle" | "large";
  type?: "primary" | "default" | "text" | "link";
  iconOnly?: boolean;
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
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

  const handleSendWhatsApp = async (values: { message: string }) => {
    // This would integrate with your Twilio WhatsApp sending functionality
    // For now, it's a placeholder - you'll need to implement the actual API call
    message.success("WhatsApp message sent via Twilio");
    setModalVisible(false);
    form.resetFields();
    onSuccess?.();
  };

  if (!canManageAccounts) {
    return null;
  }

  return (
    <>
      <Tooltip title={`Send WhatsApp to ${phoneNumber}`}>
        <Button
          icon={<WhatsAppOutlined />}
          onClick={() => setModalVisible(true)}
          size={size}
          type={type}
          style={{ color: "#25D366", borderColor: "#25D366" }}
        >
          {iconOnly ? "" : "WhatsApp"}
        </Button>
      </Tooltip>

      <Modal
        title="Send WhatsApp Message"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Send"
      >
        <Form form={form} layout="vertical" onFinish={handleSendWhatsApp}>
          <Form.Item label="To" name="to" initialValue={phoneNumber}>
            <Input disabled />
          </Form.Item>
          <Form.Item
            label="Message"
            name="message"
            rules={[{ required: true, message: "Please enter your message" }]}
          >
            <Input.TextArea rows={4} placeholder="Type your WhatsApp message..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default WhatsAppButton;
