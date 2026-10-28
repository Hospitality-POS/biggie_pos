import React, { useMemo, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Select, Space, Typography, message } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useMedicineOptions } from "./shared";
import { createPrescription, healthcareError, type AllergyWarning, type NewPrescriptionItem, type Prescription } from "@services/healthcare";
import { AllergyWarnings } from "./AllergyBanner";

const { Text } = Typography;

const FREQUENCIES = ["OD (once a day)", "BD (twice a day)", "TDS (3 times a day)", "QID (4 times a day)", "PRN (when needed)", "STAT (now)", "Nocte (at night)"];
const ROUTES = ["Oral", "Topical", "IV", "IM", "SC", "Inhaled", "Rectal", "Eye", "Ear", "Nasal"];

interface PrescriptionModalProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  visitId?: string;
  /** "external" records a prescription from an outside doctor (pharmacy) */
  source?: "internal" | "external";
  onCreated?: (rx: Prescription, warnings: AllergyWarning[]) => void;
}

interface FormValues {
  items: NewPrescriptionItem[];
  notes?: string;
  external_reference?: string;
}

const PrescriptionModal: React.FC<PrescriptionModalProps> = ({ open, onClose, customerId, visitId, source = "internal", onCreated }) => {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState<AllergyWarning[]>([]);
  const { data: medicines = [], isLoading } = useMedicineOptions(open);
  const options = useMemo(
    () =>
      medicines.map((m) => ({
        value: m._id,
        label: `${m.name}${m.quantity !== undefined ? ` (${m.quantity} in stock)` : ""}`,
      })),
    [medicines]
  );

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const { data, warnings: found } = await createPrescription({
        customer_id: customerId,
        visit_id: visitId,
        source,
        notes: values.notes,
        external_reference: values.external_reference,
        items: values.items,
      });
      onCreated?.(data, found);
      if (found.length) {
        // Keep the modal open on the saved prescription so the prescriber sees the warning
        setWarnings(found);
        message.warning("Prescription saved — check the allergy warning");
      } else {
        message.success("Prescription saved");
        form.resetFields();
        onClose();
      }
    } catch (error) {
      message.error(healthcareError(error, "Couldn't save the prescription"));
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    setWarnings([]);
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={source === "external" ? "Record outside prescription" : "Prescribe"}
      open={open}
      onCancel={close}
      width={860}
      destroyOnClose
      footer={
        warnings.length
          ? [<Button key="ok" type="primary" onClick={close}>Done</Button>]
          : [
              <Button key="cancel" onClick={close}>Cancel</Button>,
              <Button key="save" type="primary" loading={saving} onClick={submit}>Save prescription</Button>,
            ]
      }
    >
      {warnings.length ? (
        <AllergyWarnings warnings={warnings} />
      ) : (
        <Form form={form} layout="vertical" initialValues={{ items: [{ quantity: 1 }] }} preserve={false}>
          {source === "external" && (
            <Form.Item name="external_reference" label="Prescribed by (doctor / facility)" rules={[{ required: true, message: "Who wrote this prescription?" }]}>
              <Input placeholder="e.g. Dr. Wanjiru, Kenyatta Hospital" />
            </Form.Item>
          )}
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <div key={field.key} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px 0", marginBottom: 10 }}>
                    <Space align="start" wrap style={{ width: "100%" }}>
                      <Form.Item
                        name={[field.name, "product_id"]}
                        label="Medicine"
                        rules={[{ required: true, message: "Choose a medicine" }]}
                        style={{ minWidth: 260 }}
                      >
                        <Select showSearch optionFilterProp="label" loading={isLoading} options={options} placeholder="Search stock" />
                      </Form.Item>
                      <Form.Item name={[field.name, "dose"]} label="Dose">
                        <Input placeholder="500 mg" style={{ width: 100 }} />
                      </Form.Item>
                      <Form.Item name={[field.name, "frequency"]} label="Frequency">
                        <Select allowClear showSearch style={{ width: 170 }} options={FREQUENCIES.map((f) => ({ value: f, label: f }))} />
                      </Form.Item>
                      <Form.Item name={[field.name, "duration"]} label="Duration">
                        <Input placeholder="5 days" style={{ width: 90 }} />
                      </Form.Item>
                      <Form.Item name={[field.name, "route"]} label="Route">
                        <Select allowClear style={{ width: 100 }} options={ROUTES.map((r) => ({ value: r, label: r }))} />
                      </Form.Item>
                      <Form.Item name={[field.name, "quantity"]} label="Qty" rules={[{ required: true, message: "Qty" }]}>
                        <InputNumber min={1} style={{ width: 80 }} />
                      </Form.Item>
                      {fields.length > 1 && (
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} style={{ marginTop: 30 }} aria-label="Remove medicine" />
                      )}
                    </Space>
                    <Form.Item name={[field.name, "instructions"]} style={{ marginBottom: 10 }}>
                      <Input placeholder="Instructions, e.g. after meals" />
                    </Form.Item>
                  </div>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ quantity: 1 })} block>
                  Add medicine
                </Button>
              </>
            )}
          </Form.List>
          <Form.Item name="notes" label="Notes" style={{ marginTop: 12 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Medicines are chosen from stock so the pharmacy can dispense and bill them.
          </Text>
        </Form>
      )}
    </Modal>
  );
};

export default PrescriptionModal;
