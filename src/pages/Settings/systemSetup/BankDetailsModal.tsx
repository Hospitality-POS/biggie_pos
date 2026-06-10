import React, { useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Radio,
} from "antd";
import { BankOutlined } from "@ant-design/icons";

interface BankDetail {
  _id?: string;
  bank_name: string;
  branch: string;
  account_no: string;
  account_name: string;
  swift_code: string;
  paybill_no: string;
  is_primary: boolean;
}

interface BankDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (bank: BankDetail) => void;
  editBank?: BankDetail | null;
  isOnlyBank?: boolean;
}

const BankDetailsModal: React.FC<BankDetailsModalProps> = ({
  open,
  onClose,
  onSave,
  editBank,
  isOnlyBank = false,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (editBank) {
        form.setFieldsValue(editBank);
      } else {
        form.resetFields();
        form.setFieldsValue({ is_primary: !isOnlyBank });
      }
    }
  }, [open, editBank, form, isOnlyBank]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      onSave(values);
      form.resetFields();
    } catch (error) {
      // Validation errors shown inline
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <BankOutlined />
          <span>{editBank ? "Edit Bank" : "Add New Bank"}</span>
        </Space>
      }
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleSave}>
            {editBank ? "Update" : "Add Bank"}
          </Button>
        </Space>
      }
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          bank_name: "",
          branch: "",
          account_no: "",
          account_name: "",
          swift_code: "",
          paybill_no: "",
          is_primary: false,
        }}
      >
        <Form.Item
          label="Bank Name"
          name="bank_name"
          rules={[{ required: true, message: "Bank name is required" }]}
        >
          <Input
            placeholder="e.g., Equity Bank"
            prefix={<BankOutlined />}
          />
        </Form.Item>

        <Form.Item label="Branch" name="branch">
          <Input placeholder="e.g., Westlands Branch" />
        </Form.Item>

        <Form.Item
          label="Account Number"
          name="account_no"
          rules={[{ required: true, message: "Account number is required" }]}
        >
          <Input placeholder="e.g., 0123456789" />
        </Form.Item>

        <Form.Item
          label="Account Name"
          name="account_name"
          rules={[{ required: true, message: "Account name is required" }]}
        >
          <Input placeholder="e.g., Business Ltd" />
        </Form.Item>

        <Form.Item label="SWIFT Code" name="swift_code">
          <Input
            placeholder="e.g., EQBLKENA"
            style={{ textTransform: "uppercase" }}
          />
        </Form.Item>

        <Form.Item label="M-Pesa Paybill Number" name="paybill_no">
          <Input placeholder="e.g., 123456" />
        </Form.Item>

        {!isOnlyBank && (
          <Form.Item
            label="Primary Bank"
            name="is_primary"
            tooltip="Only one bank can be marked as primary"
          >
            <Radio.Group>
              <Radio value={true}>Yes - Set as primary bank</Radio>
              <Radio value={false}>No</Radio>
            </Radio.Group>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default BankDetailsModal;
