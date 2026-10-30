import React, { useEffect } from "react";
import { Button, Card, DatePicker, Form, Input, Select, Space, Spin, Tag, Typography, message } from "antd";
import { DeleteOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import { fetchPatient, fetchVisits, healthcareError, savePatientProfile, type PatientProfile } from "@services/healthcare";
import { useHealthcareSettings } from "@hooks/useHealthcareSettings";
import { AllergyBanner } from "./AllergyBanner";
import { STAGE_LABEL, useHealthcareAccess } from "./shared";

const { Text } = Typography;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];

interface ProfileFormValues extends Omit<PatientProfile, "_id" | "customer_id" | "patient_number" | "insurance"> {
  insurance?: Omit<NonNullable<PatientProfile["insurance"]>, "valid_until"> & { valid_until?: Dayjs | null };
}

/**
 * The medical side of a customer (patient): patient number, allergies,
 * conditions, insurance, next of kin, and their visits. Shown as a tab on
 * the customer's own drawer, so there is one patient list — Customers.
 */
const PatientMedicalPanel: React.FC<{ customerId: string }> = ({ customerId }) => {
  const queryClient = useQueryClient();
  const access = useHealthcareAccess();
  const settings = useHealthcareSettings();
  const [form] = Form.useForm<ProfileFormValues>();

  const { data, isLoading } = useQuery({
    queryKey: ["healthcare-patient", customerId],
    queryFn: () => fetchPatient(customerId),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ["healthcare-visits", "patient", customerId],
    queryFn: () => fetchVisits({ customer_id: customerId }),
    enabled: settings.visits && access.viewVisits,
  });

  useEffect(() => {
    if (!data) return;
    const p = data.profile;
    form.setFieldsValue({
      national_id: p?.national_id,
      blood_group: p?.blood_group ?? "unknown",
      allergies: p?.allergies ?? [],
      chronic_conditions: p?.chronic_conditions ?? [],
      current_medication: p?.current_medication,
      next_of_kin: p?.next_of_kin,
      insurance: { ...p?.insurance, valid_until: p?.insurance?.valid_until ? dayjs(p.insurance.valid_until) : null },
      notes: p?.notes,
    });
  }, [data, form]);

  const save = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      savePatientProfile(customerId, {
        ...values,
        insurance: { ...values.insurance, valid_until: values.insurance?.valid_until?.toISOString() ?? null },
      }),
    onSuccess: (profile) => {
      message.success(`Saved · ${profile.patient_number}`);
      queryClient.invalidateQueries({ queryKey: ["healthcare-patient", customerId] });
      queryClient.invalidateQueries({ queryKey: ["healthcare-patient-search"] });
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't save the medical details")),
  });

  if (isLoading || !data) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <Spin />
      </div>
    );
  }

  const readOnly = !access.managePatients;

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Text type="secondary">
        Patient no. <Text strong>{data.profile?.patient_number || "given on first save or visit"}</Text>
      </Text>
      <AllergyBanner allergies={data.profile?.allergies} />

      <Form form={form} layout="vertical" disabled={readOnly} onFinish={(v) => save.mutate(v)}>
        <Card size="small" title="Medical" style={{ marginBottom: 12 }}>
          <Space wrap>
            <Form.Item name="national_id" label="ID / birth cert. no.">
              <Input style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="blood_group" label="Blood group">
              <Select style={{ width: 120 }} options={BLOOD_GROUPS.map((b) => ({ value: b, label: b === "unknown" ? "Unknown" : b }))} />
            </Form.Item>
          </Space>
          <Text strong style={{ display: "block", marginBottom: 8 }}>
            Allergies
          </Text>
          <Form.List name="allergies">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="start" wrap>
                    <Form.Item name={[field.name, "substance"]} rules={[{ required: true, message: "What are they allergic to?" }]}>
                      <Input placeholder="e.g. Penicillin" style={{ width: 160 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, "reaction"]}>
                      <Input placeholder="Reaction" style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, "severity"]} initialValue="moderate">
                      <Select
                        style={{ width: 110 }}
                        options={[
                          { value: "mild", label: "Mild" },
                          { value: "moderate", label: "Moderate" },
                          { value: "severe", label: "Severe" },
                        ]}
                      />
                    </Form.Item>
                    {!readOnly && <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label="Remove allergy" />}
                  </Space>
                ))}
                {!readOnly && (
                  <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ severity: "moderate" })} style={{ marginBottom: 12 }}>
                    Add allergy
                  </Button>
                )}
              </>
            )}
          </Form.List>
          <Form.Item name="chronic_conditions" label="Chronic conditions">
            <Select mode="tags" placeholder="e.g. Diabetes, Hypertension" tokenSeparators={[","]} />
          </Form.Item>
          <Form.Item name="current_medication" label="Current medication">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Card>

        <Card size="small" title="Insurance" style={{ marginBottom: 12 }}>
          <Space wrap>
            <Form.Item name={["insurance", "provider"]} label="Provider">
              <Input placeholder="e.g. SHA, Jubilee, AAR" style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name={["insurance", "scheme"]} label="Scheme">
              <Input style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name={["insurance", "member_number"]} label="Member no.">
              <Input style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name={["insurance", "principal_member"]} label="Principal member">
              <Input style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name={["insurance", "valid_until"]} label="Valid until">
              <DatePicker format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
        </Card>

        <Card size="small" title="Next of kin" style={{ marginBottom: 12 }}>
          <Space wrap>
            <Form.Item name={["next_of_kin", "name"]} label="Name">
              <Input style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name={["next_of_kin", "relationship"]} label="Relationship">
              <Input style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name={["next_of_kin", "phone"]} label="Phone">
              <Input style={{ width: 150 }} />
            </Form.Item>
          </Space>
        </Card>

        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} />
        </Form.Item>
        {!readOnly && (
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={save.isLoading}>
            Save medical details
          </Button>
        )}
      </Form>

      {!!visits.length && (
        <Card size="small" title="Visits">
          {visits.slice(0, 20).map((v) => (
            <div key={v._id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
              <Text>
                {dayjs(v.checked_in_at).format("DD MMM YYYY")} · {v.visit_number}
              </Text>
              <Tag>{STAGE_LABEL[v.stage]}</Tag>
            </div>
          ))}
        </Card>
      )}
    </Space>
  );
};

export default PatientMedicalPanel;
