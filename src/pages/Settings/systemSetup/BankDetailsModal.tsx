import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Button, Space, Typography, Divider } from "antd";
import { BankOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const { Text } = Typography;

interface BankDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  editValue?: string | null;
}

interface KenyanBank {
  name: string;
  paybill: string;
  short: string;
  color?: string;
}

interface KenyanBankFull extends KenyanBank {
  swift: string;
  location: string;
}

const KENYAN_BANKS: KenyanBankFull[] = [
  { name: "KCB Bank Kenya",        paybill: "522522", short: "KCB",       color: "#006400", swift: "KCBLKENX", location: "Nairobi, Kenya"       },
  { name: "Equity Bank",           paybill: "247247", short: "Equity",    color: "#c8102e", swift: "EQBLKENA", location: "Nairobi, Kenya"       },
  { name: "Cooperative Bank",      paybill: "400200", short: "Co-op",     color: "#003366", swift: "KCOOKENA", location: "Nairobi, Kenya"       },
  { name: "NCBA Bank",             paybill: "880100", short: "NCBA",      color: "#1a1a1a", swift: "CBAFKENX", location: "Nairobi, Kenya"       },
  { name: "Standard Chartered",    paybill: "329329", short: "StanChart", color: "#0072c6", swift: "SCBLKENX", location: "Nairobi, Kenya"       },
  { name: "Absa Bank Kenya",       paybill: "303030", short: "Absa",      color: "#e40000", swift: "BARCKENX", location: "Nairobi, Kenya"       },
  { name: "Family Bank",           paybill: "222111", short: "Family",    color: "#f57c00", swift: "FABLKENA", location: "Nairobi, Kenya"       },
  { name: "Stanbic Bank",          paybill: "600100", short: "Stanbic",   color: "#0033a0", swift: "SBICKENX", location: "Nairobi, Kenya"       },
  { name: "I&M Bank",              paybill: "542542", short: "I&M",       color: "#1b5e20", swift: "HFBLKENA", location: "Nairobi, Kenya"       },
  { name: "National Bank",         paybill: "625625", short: "NBK",       color: "#b71c1c", swift: "NBKEKENX", location: "Nairobi, Kenya"       },
  { name: "DTB Bank",              paybill: "516600", short: "DTB",       color: "#4a148c", swift: "DTKEKENA", location: "Nairobi, Kenya"       },
  { name: "Prime Bank",            paybill: "582582", short: "Prime",     color: "#004d40", swift: "PRBLKENA", location: "Nairobi, Kenya"       },
  { name: "M-Pesa (Safaricom)",    paybill: "",       short: "M-Pesa",    color: "#4caf50", swift: "",         location: "Kenya"                },
];

const BankDetailsModal: React.FC<BankDetailsModalProps> = ({
  open,
  onClose,
  onSave,
  editValue,
}) => {
  const [form] = Form.useForm();
  const [selectedBank, setSelectedBank] = useState<KenyanBank | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedBank(null);
      form.setFieldsValue({ text: editValue || "" });
    }
  }, [open, editValue, form]);

  const handleBankSelect = (bank: KenyanBankFull) => {
    setSelectedBank(bank);
    const lines: string[] = [bank.name];
    lines.push(`Branch: [Your Branch]`);
    lines.push(`Account Name: [Your Account Name]`);
    if (bank.paybill) lines.push(`Paybill: ${bank.paybill}`);
    lines.push(`Acc: [Your Account Number]`);
    if (bank.swift)   lines.push(`Swift: ${bank.swift}`);
    if (bank.location) lines.push(`Location: ${bank.location}`);
    form.setFieldsValue({ text: lines.join("\n") });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const trimmed = (values.text || "").trim();
      if (trimmed) {
        onSave(trimmed);
        form.resetFields();
        setSelectedBank(null);
      }
    } catch {
      // Validation errors shown inline
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => { onClose(); setSelectedBank(null); }}
      title={
        <Space>
          <BankOutlined />
          <span>{editValue ? "Edit Bank / Payment Detail" : "Add Bank / Payment Detail"}</span>
        </Space>
      }
      footer={
        <Space>
          <Button onClick={() => { onClose(); setSelectedBank(null); }}>Cancel</Button>
          <Button type="primary" onClick={handleSave}>
            {editValue ? "Update" : "Add"}
          </Button>
        </Space>
      }
      width={560}
    >
      {/* Bank quick-select */}
      <Text strong style={{ fontSize: 12 }}>Select Bank</Text>
      <Text type="secondary" style={{ display: "block", fontSize: 11, marginBottom: 8 }}>
        Click a bank to auto-fill its name and paybill number
      </Text>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {KENYAN_BANKS.map((bank) => {
          const isActive = selectedBank?.name === bank.name;
          return (
            <button
              key={bank.name}
              onClick={() => handleBankSelect(bank)}
              style={{
                padding: "4px 10px",
                border: `1.5px solid ${isActive ? bank.color || "#1890ff" : "#e2e8f0"}`,
                borderRadius: 16,
                background: isActive ? `${bank.color}15` : "#fff",
                color: isActive ? bank.color || "#1890ff" : "#374151",
                fontWeight: isActive ? 700 : 500,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {bank.short}
            </button>
          );
        })}
      </div>

      <Divider style={{ margin: "0 0 14px" }} />

      <Form form={form} layout="vertical">
        <Form.Item
          name="text"
          label="Bank / Payment Details"
          rules={[{ required: true, message: "Please enter bank details" }]}
        >
          <TextArea
            rows={6}
            placeholder={"Equity Bank\nWestlands Branch\nAcc: 1234567890\nAccount Name: My Business Ltd\nPaybill: 247247"}
            style={{ fontFamily: "monospace", fontSize: 13 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BankDetailsModal;
