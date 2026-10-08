import React, { useState, useEffect, useRef } from "react";
import { Modal, Form, Input, Space, Segmented, Select } from "antd";
import { SendOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { fetchAllCustomers } from "@services/customers";
import type { SendWhatsAppValues } from "./printHelpers";

interface SendWhatsAppModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (values: SendWhatsAppValues) => Promise<void>;
  sending: boolean;
  docLabel: string;
  defaultPhone?: string;
}

export const SendWhatsAppModal: React.FC<SendWhatsAppModalProps> = ({
  open,
  onClose,
  onSend,
  sending,
  docLabel,
  defaultPhone,
}) => {
  const [form] = Form.useForm();
  const [mode, setMode] = useState<"type" | "customer">("type");
  const [customerOptions, setCustomerOptions] = useState<{ label: string; value: string }[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const customerSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ phone_number: defaultPhone || "" });
      setMode("type");
      setCustomerOptions([]);
    }
  }, [open, defaultPhone, form]);

  const handleCustomerSearch = (search: string) => {
    if (customerSearchTimeout.current) clearTimeout(customerSearchTimeout.current);
    if (!search || search.trim().length < 2) {
      setCustomerOptions([]);
      return;
    }
    customerSearchTimeout.current = setTimeout(async () => {
      setCustomerSearchLoading(true);
      try {
        const result = await fetchAllCustomers({ search: search.trim() });
        const customers = Array.isArray(result) ? result : (result?.customers ?? []);
        setCustomerOptions(
          customers
            .filter((c: any) => !!c.phone)
            .map((c: any) => ({
              label: `${c.customer_name || "Unnamed"} — ${c.phone}`,
              value: String(c.phone),
            }))
        );
      } catch {
        setCustomerOptions([]);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 400);
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    await onSend({ phone_number: values.phone_number });
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
      okButtonProps={{ style: { background: "#25D366", borderColor: "#25D366" } }}
      title={
        <Space>
          <WhatsAppOutlined style={{ color: "#25D366" }} />
          <span>Send {docLabel} via WhatsApp</span>
        </Space>
      }
      width={420}
      destroyOnClose
    >
      <Segmented
        block
        value={mode}
        onChange={(v) => {
          setMode(v as "type" | "customer");
          form.setFieldsValue({ phone_number: v === "type" ? defaultPhone || "" : undefined });
        }}
        options={[
          { label: "Type Number", value: "type" },
          { label: "Select Customer", value: "customer" },
        ]}
        style={{ marginTop: 4, marginBottom: 16 }}
      />
      <Form form={form} layout="vertical">
        {mode === "type" ? (
          <Form.Item
            name="phone_number"
            label="WhatsApp Number"
            rules={[{ required: true, message: "WhatsApp number is required" }]}
          >
            <Input prefix={<WhatsAppOutlined style={{ color: "#25D366" }} />} placeholder="e.g. 254712345678" />
          </Form.Item>
        ) : (
          <Form.Item
            name="phone_number"
            label="Customer"
            rules={[{ required: true, message: "Please select a customer" }]}
          >
            <Select
              showSearch
              placeholder="Search customer by name or phone"
              filterOption={false}
              notFoundContent={customerSearchLoading ? "Searching..." : "No customers found"}
              onSearch={handleCustomerSearch}
              options={customerOptions}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default SendWhatsAppModal;
