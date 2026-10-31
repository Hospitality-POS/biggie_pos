import React, { useMemo, useState } from "react";
import { Button, Form, Input, Modal, Select, Space, Typography, DatePicker, message } from "antd";
import { UserAddOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { searchPatients, savePatientProfile, healthcareError, type PatientRow } from "@services/healthcare";
import { addNewCustomer } from "@services/customers";
import { patientName, useDebounced } from "./shared";
import { useHealthcareSettings } from "@hooks/useHealthcareSettings";

const { Text } = Typography;

interface PatientPickerProps {
  value?: string;
  onChange: (customerId: string | undefined, row?: PatientRow) => void;
  /** Show the "New patient" button (needs permission to register patients) */
  canRegister?: boolean;
  /** The permission the caller searches with (reception, doctor or pharmacy) */
  permission?: string;
  style?: React.CSSProperties;
}

/** Search patients by name, phone, patient number or ID — or register a new one. */
const PatientPicker: React.FC<PatientPickerProps> = ({ value, onChange, canRegister = true, permission, style }) => {
  const [typed, setTyped] = useState("");
  const search = useDebounced(typed.trim());
  const [registerOpen, setRegisterOpen] = useState(false);
  const [extra, setExtra] = useState<PatientRow | null>(null);

  const { data = [], isFetching } = useQuery({
    queryKey: ["healthcare-patient-search", search],
    queryFn: () => searchPatients(search, permission),
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    if (extra && !data.some((r) => r.customer._id === extra.customer._id)) return [extra, ...data];
    return data;
  }, [data, extra]);


  return (
    <Space.Compact style={{ width: "100%", ...style }}>
      <Select
        showSearch
        allowClear
        value={value}
        placeholder="Search name, phone, patient no. or ID no."
        filterOption={false}
        onSearch={setTyped}
        loading={isFetching}
        onChange={(id) => onChange(id, rows.find((r) => r.customer._id === id))}
        style={{ width: "100%" }}
        notFoundContent={isFetching ? "Searching…" : "No patient found"}
        options={rows.map((r) => ({
          value: r.customer._id,
          label: (
            <span>
              {patientName(r.customer)}{" "}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {[r.profile?.patient_number, r.customer.phone].filter(Boolean).join(" · ")}
              </Text>
            </span>
          ),
        }))}
      />
      {canRegister && (
        <Button icon={<UserAddOutlined />} onClick={() => setRegisterOpen(true)}>
          New patient
        </Button>
      )}
      <RegisterPatientModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onCreated={(row) => {
          setExtra(row);
          onChange(row.customer._id, row);
        }}
      />
    </Space.Compact>
  );
};

interface RegisterValues {
  customer_name: string;
  phone: string;
  gender?: string;
  date_of_birth?: { toISOString: () => string };
  national_id?: string;
}

/** Registers a patient as a customer, then gives them a patient number. */
const RegisterPatientModal: React.FC<{ open: boolean; onClose: () => void; onCreated: (row: PatientRow) => void }> = ({
  open,
  onClose,
  onCreated,
}) => {
  const [form] = Form.useForm<RegisterValues>();
  const { patientRecords } = useHealthcareSettings();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    let customer: PatientRow["customer"] | undefined;
    try {
      const res = await addNewCustomer({
        customer_name: values.customer_name.trim(),
        phone: values.phone.replace(/\D/g, ""),
        gender: values.gender,
        date_of_birth: values.date_of_birth?.toISOString(),
        entity_type: "individual",
      });
      customer = res?.data?.customer as PatientRow["customer"] | undefined;
    } catch {
      // addNewCustomer already showed why
      setSaving(false);
      return;
    }
    try {
      if (!customer?._id) throw new Error("The patient was saved but couldn't be loaded — search for them by phone");
      // Without patient records the patient number comes with their first visit
      const profile = patientRecords
        ? await savePatientProfile(customer._id, { national_id: values.national_id?.trim() || "" })
        : null;
      message.success(profile ? `${customer.customer_name} registered as ${profile.patient_number}` : `${customer.customer_name} registered`);
      onCreated({ customer, profile });
      form.resetFields();
      onClose();
    } catch (error) {
      message.error(healthcareError(error, (error as Error)?.message || "Couldn't register the patient"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Register patient" open={open} onCancel={onClose} onOk={submit} okText="Register" confirmLoading={saving} destroyOnClose>
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="customer_name" label="Full name" rules={[{ required: true, whitespace: true, message: "Enter the patient's name" }]}>
          <Input autoFocus />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Phone"
          rules={[
            { required: true, message: "Enter a phone number" },
            { pattern: /^[\d\s+()-]{9,16}$/, message: "Enter a valid phone number" },
          ]}
        >
          <Input inputMode="tel" placeholder="0712 345 678" />
        </Form.Item>
        <Space size={12} style={{ width: "100%" }} wrap>
          <Form.Item name="gender" label="Gender" style={{ minWidth: 140 }}>
            <Select
              allowClear
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
            />
          </Form.Item>
          <Form.Item name="date_of_birth" label="Date of birth">
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
          {patientRecords && (
            <Form.Item name="national_id" label="ID / birth cert. no.">
              <Input />
            </Form.Item>
          )}
        </Space>
      </Form>
    </Modal>
  );
};

export default PatientPicker;
