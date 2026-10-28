import React, { useEffect } from "react";
import { Form, Input, Modal } from "antd";
import { printReferralLetter } from "./shared";

interface ReferralValues {
  to: string;
  reason: string;
  diagnoses?: string;
  summary?: string;
  treatment?: string;
  from?: string;
}

/** Write and print a referral letter to another doctor or facility. */
const ReferralLetterModal: React.FC<{
  open: boolean;
  onClose: () => void;
  patient: { shopName?: string; patient: string; patientNumber?: string; ageGender?: string };
  defaults?: Partial<ReferralValues>;
}> = ({ open, onClose, patient, defaults }) => {
  const [form] = Form.useForm<ReferralValues>();
  useEffect(() => {
    if (open) form.setFieldsValue(defaults ?? {});
  }, [open, defaults, form]);
  return (
    <Modal title="Referral letter" open={open} onCancel={onClose} okText="Print letter" onOk={() => form.submit()} width={640} destroyOnClose>
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={(v) => {
          printReferralLetter({ ...patient, ...v });
          onClose();
        }}
      >
        <Form.Item name="to" label="To (doctor / facility)" rules={[{ required: true, whitespace: true, message: "Who is the patient referred to?" }]}>
          <Input placeholder="e.g. The Physician, Kenyatta National Hospital" />
        </Form.Item>
        <Form.Item name="reason" label="Reason for referral" rules={[{ required: true, whitespace: true, message: "Give the reason" }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="diagnoses" label="Diagnosis">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="summary" label="Clinical summary">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="treatment" label="Treatment given">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="from" label="Referring doctor">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ReferralLetterModal;
