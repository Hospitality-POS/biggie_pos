import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Steps,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, ExperimentOutlined, FileTextOutlined, LoginOutlined, MedicineBoxOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  fetchVisit,
  healthcareError,
  moveVisitStage,
  saveClinicalNotes,
  saveVitals,
  type ClinicalNotes,
  type Diagnosis,
  type VisitStage,
  type Vitals,
  type Visit,
  updateVisit,
  fetchPayers,
} from "@services/healthcare";
import { useHealthcareSettings } from "@hooks/useHealthcareSettings";
import { AllergyBanner } from "./AllergyBanner";
import PrescriptionModal from "./PrescriptionModal";
import LabOrderModal from "./LabOrderModal";
import ReferralLetterModal from "./ReferralLetterModal";
import { AdmitModal } from "./WardsTab";
import { LabOrderDrawer } from "./LabTab";
import { ClaimDrawer } from "./ClaimsTab";
import { CLAIM_STATUS_TAG, LAB_STATUS_TAG, RX_STATUS, STAGE_LABEL, VISIT_TYPE_LABEL, ageOf, bmiOf, money, patientName, useHealthcareAccess, visibleStages } from "./shared";

const { Text, Title } = Typography;

const VITAL_INPUTS: { name: keyof Vitals; label: string; unit: string; step?: number }[] = [
  { name: "temperature_c", label: "Temperature", unit: "°C", step: 0.1 },
  { name: "pulse_bpm", label: "Pulse", unit: "bpm" },
  { name: "respiratory_rate", label: "Resp. rate", unit: "/min" },
  { name: "bp_systolic", label: "BP systolic", unit: "mmHg" },
  { name: "bp_diastolic", label: "BP diastolic", unit: "mmHg" },
  { name: "spo2_percent", label: "SpO₂", unit: "%" },
  { name: "weight_kg", label: "Weight", unit: "kg", step: 0.1 },
  { name: "height_cm", label: "Height", unit: "cm" },
  { name: "blood_sugar_mmol", label: "Blood sugar", unit: "mmol/L", step: 0.1 },
];

interface VisitDrawerProps {
  visitId: string | null;
  onClose: () => void;
}

const VisitDrawer: React.FC<VisitDrawerProps> = ({ visitId, onClose }) => {
  const queryClient = useQueryClient();
  const settings = useHealthcareSettings();
  const access = useHealthcareAccess();
  const [vitalsForm] = Form.useForm<Vitals>();
  const [notesForm] = Form.useForm<{ clinical_notes: ClinicalNotes; diagnoses: Diagnosis[] }>();
  const [rxOpen, setRxOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [labOrderId, setLabOrderId] = useState<string | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [claimForVisit, setClaimForVisit] = useState<string | null>(null);
  const [admitOpen, setAdmitOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);

  const { data: visit, isLoading } = useQuery({
    queryKey: ["healthcare-visit", visitId],
    queryFn: () => fetchVisit(visitId ?? ""),
    enabled: !!visitId,
  });

  useEffect(() => {
    if (!visit) return;
    vitalsForm.setFieldsValue(visit.vitals ?? {});
    notesForm.setFieldsValue({ clinical_notes: visit.clinical_notes ?? {}, diagnoses: visit.diagnoses ?? [] });
  }, [visit, vitalsForm, notesForm]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["healthcare-visit", visitId] });
    queryClient.invalidateQueries({ queryKey: ["healthcare-visits"] });
  };

  const stageMutation = useMutation({
    mutationFn: ({ stage, notes }: { stage: VisitStage; notes?: string }) => moveVisitStage(visitId ?? "", stage, notes),
    onSuccess: (_, { stage }) => {
      message.success(stage === "cancelled" ? "Visit cancelled" : `Moved to ${STAGE_LABEL[stage]}`);
      refresh();
      if (stage === "completed" || stage === "cancelled") onClose();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't move the patient")),
  });

  const vitalsMutation = useMutation({
    mutationFn: (values: Vitals) => saveVitals(visitId ?? "", values),
    onSuccess: () => {
      message.success("Vitals saved");
      refresh();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't save the vitals")),
  });

  const notesMutation = useMutation({
    mutationFn: (values: { clinical_notes: ClinicalNotes; diagnoses: Diagnosis[] }) => saveClinicalNotes(visitId ?? "", values),
    onSuccess: () => {
      message.success("Notes saved");
      refresh();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't save the notes")),
  });

  const cancelVisit = () => {
    let reason = "";
    Modal.confirm({
      title: "Cancel this visit?",
      content: <Input.TextArea rows={2} placeholder="Reason" onChange={(e) => (reason = e.target.value)} />,
      okText: "Cancel visit",
      okButtonProps: { danger: true },
      cancelText: "Keep",
      onOk: () => {
        if (!reason.trim()) {
          message.error("Give a reason for cancelling");
          return Promise.reject();
        }
        return stageMutation.mutateAsync({ stage: "cancelled", notes: reason });
      },
    });
  };

  const open = !!visitId;
  const closed = visit?.stage === "completed" || visit?.stage === "cancelled";
  const stages = visibleStages(settings, visit ? [visit.stage] : []);
  const stageIndex = stages.findIndex((s) => s.key === visit?.stage);
  const weight = Form.useWatch("weight_kg", vitalsForm);
  const height = Form.useWatch("height_cm", vitalsForm);
  const bmi = bmiOf(weight, height);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={Math.min(820, window.innerWidth)}
      title={visit ? `${patientName(visit.customer)} · ${visit.visit_number}` : "Visit"}
      destroyOnClose
      extra={
        visit && (
          <Space>
            {access.clinicalNotes && (
              <Button icon={<FileTextOutlined />} onClick={() => setReferralOpen(true)}>
                Referral letter
              </Button>
            )}
            {!closed && settings.inpatient && access.admit && visit.stage !== "admitted" && (
              <Button type="primary" icon={<LoginOutlined />} onClick={() => setAdmitOpen(true)}>
                Admit
              </Button>
            )}
            {!closed && access.manageVisits && visit.stage !== "admitted" && (
              <Button danger type="text" onClick={cancelVisit}>
                Cancel visit
              </Button>
            )}
          </Space>
        )
      }
    >
      {isLoading || !visit ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <AllergyBanner allergies={visit.profile?.allergies} />

          <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} bordered>
            <Descriptions.Item label="Patient no.">{visit.profile?.patient_number || "—"}</Descriptions.Item>
            <Descriptions.Item label="Age / gender">
              {[ageOf(visit.customer?.date_of_birth), visit.customer?.gender].filter(Boolean).join(" · ") || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">{visit.customer?.phone || "—"}</Descriptions.Item>
            <Descriptions.Item label="Visit">{VISIT_TYPE_LABEL[visit.visit_type]}</Descriptions.Item>
            <Descriptions.Item label="Payer">
              {visit.payer}
              {visit.payer === "insurance" && visit.profile?.insurance?.provider ? ` · ${visit.profile.insurance.provider}` : ""}
            </Descriptions.Item>
            <Descriptions.Item label="Checked in">{dayjs(visit.checked_in_at).format("DD MMM, HH:mm")}</Descriptions.Item>
            {!!visit.profile?.chronic_conditions?.length && (
              <Descriptions.Item label="Conditions" span={3}>
                {visit.profile.chronic_conditions.map((c) => (
                  <Tag key={c}>{c}</Tag>
                ))}
              </Descriptions.Item>
            )}
          </Descriptions>

          {closed ? (
            <Tag color={visit.stage === "completed" ? "green" : "default"} style={{ alignSelf: "flex-start" }}>
              {STAGE_LABEL[visit.stage]}
            </Tag>
          ) : (
            <Card size="small" title="Where is the patient?">
              <Steps
                size="small"
                current={stageIndex}
                onChange={(i) => access.manageVisits && stageMutation.mutate({ stage: stages[i].key })}
                items={stages.map((s) => ({ title: s.label }))}
                style={{ marginBottom: 12 }}
              />
              {access.manageVisits && (
                <Space wrap>
                  {stages.filter((s) => s.key !== visit.stage).map((s) => (
                    <Button key={s.key} size="small" loading={stageMutation.isLoading} onClick={() => stageMutation.mutate({ stage: s.key })}>
                      Send to {s.label}
                    </Button>
                  ))}
                  <Button size="small" type="primary" loading={stageMutation.isLoading} onClick={() => stageMutation.mutate({ stage: "completed" })}>
                    Complete visit
                  </Button>
                </Space>
              )}
            </Card>
          )}

          {settings.triage && (access.triage || visit.vitals) && (
            <Card
              size="small"
              title="Vitals"
              extra={
                visit.vitals?.taken_at && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {visit.vitals.taken_by_name} · {dayjs(visit.vitals.taken_at).format("HH:mm")}
                  </Text>
                )
              }
            >
              <Form form={vitalsForm} layout="vertical" disabled={!access.triage || closed} onFinish={(v) => vitalsMutation.mutate(v)}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0 12px" }}>
                  {VITAL_INPUTS.map((v) => (
                    <Form.Item key={v.name} name={v.name} label={v.label}>
                      <InputNumber addonAfter={v.unit} step={v.step ?? 1} style={{ width: "100%" }} />
                    </Form.Item>
                  ))}
                  <Form.Item label="BMI">
                    <InputNumber value={bmi ?? undefined} disabled style={{ width: "100%" }} />
                  </Form.Item>
                </div>
                <Form.Item name="notes" label="Triage notes">
                  <Input.TextArea rows={2} />
                </Form.Item>
                {access.triage && !closed && (
                  <Button type="primary" htmlType="submit" loading={vitalsMutation.isLoading}>
                    Save vitals
                  </Button>
                )}
              </Form>
            </Card>
          )}

          {settings.clinicalNotes && visit.can_see_notes && (
            <Card size="small" title="Doctor's notes">
              <Form form={notesForm} layout="vertical" disabled={closed} onFinish={(v) => notesMutation.mutate(v)}>
                <Form.Item name={["clinical_notes", "chief_complaint"]} label="Presenting complaint">
                  <Input.TextArea rows={2} />
                </Form.Item>
                <Form.Item name={["clinical_notes", "history"]} label="History">
                  <Input.TextArea rows={2} />
                </Form.Item>
                <Form.Item name={["clinical_notes", "examination"]} label="Examination">
                  <Input.TextArea rows={2} />
                </Form.Item>
                <Title level={5} style={{ fontSize: 14 }}>
                  Diagnosis
                </Title>
                <Form.List name="diagnoses">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field) => (
                        <Space key={field.key} align="start" wrap>
                          <Form.Item name={[field.name, "code"]}>
                            <Input placeholder="ICD-10 (optional)" style={{ width: 140 }} />
                          </Form.Item>
                          <Form.Item name={[field.name, "description"]} rules={[{ required: true, message: "Describe the diagnosis" }]}>
                            <Input placeholder="e.g. Malaria, uncomplicated" style={{ width: 300 }} />
                          </Form.Item>
                          <Form.Item name={[field.name, "kind"]} initialValue="provisional">
                            <Select
                              style={{ width: 130 }}
                              options={[
                                { value: "provisional", label: "Provisional" },
                                { value: "final", label: "Final" },
                              ]}
                            />
                          </Form.Item>
                          {!closed && <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label="Remove diagnosis" />}
                        </Space>
                      ))}
                      {!closed && (
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ kind: "provisional" })} style={{ marginBottom: 12 }}>
                          Add diagnosis
                        </Button>
                      )}
                    </>
                  )}
                </Form.List>
                <Form.Item name={["clinical_notes", "plan"]} label="Plan">
                  <Input.TextArea rows={2} />
                </Form.Item>
                {!closed && (
                  <Button type="primary" htmlType="submit" loading={notesMutation.isLoading}>
                    Save notes
                  </Button>
                )}
              </Form>
            </Card>
          )}

          {settings.diagnostics && (access.orderLab || access.viewLab) && (
            <Card
              size="small"
              title="Lab & imaging"
              extra={
                access.orderLab &&
                !closed && (
                  <Button size="small" icon={<ExperimentOutlined />} onClick={() => setLabOpen(true)}>
                    Order tests
                  </Button>
                )
              }
            >
              {visit.lab_orders.length ? (
                visit.lab_orders.map((order) => {
                  const flagged = order.items.flatMap((i) => i.results).filter((r) => r.flag).length;
                  return (
                    <div
                      key={order._id}
                      onClick={() => setLabOrderId(order._id)}
                      style={{ borderBottom: "1px solid #f1f5f9", padding: "8px 0", cursor: "pointer" }}
                    >
                      <Space style={{ marginBottom: 4 }} wrap>
                        <Text strong>{order.order_number}</Text>
                        <Tag color={LAB_STATUS_TAG[order.status].color}>{LAB_STATUS_TAG[order.status].label}</Tag>
                        {order.priority === "urgent" && <Tag color="red">Urgent</Tag>}
                        {!!flagged && <Tag color="red">{flagged} abnormal</Tag>}
                      </Space>
                      <div style={{ fontSize: 13 }}>{order.items.filter((i) => i.status !== "cancelled").map((i) => i.name).join(", ")}</div>
                    </div>
                  );
                })
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tests ordered on this visit" />
              )}
            </Card>
          )}

          {settings.prescriptions && (
            <Card
              size="small"
              title="Prescriptions"
              extra={
                access.prescribe &&
                !closed && (
                  <Button size="small" icon={<MedicineBoxOutlined />} onClick={() => setRxOpen(true)}>
                    Prescribe
                  </Button>
                )
              }
            >
              {visit.prescriptions.length ? (
                visit.prescriptions.map((rx) => (
                  <div key={rx._id} style={{ borderBottom: "1px solid #f1f5f9", padding: "8px 0" }}>
                    <Space style={{ marginBottom: 4 }}>
                      <Tag color={RX_STATUS[rx.status].color}>{RX_STATUS[rx.status].label}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {rx.prescriber_name} · {dayjs(rx.createdAt).format("DD MMM, HH:mm")}
                      </Text>
                    </Space>
                    {rx.items.map((item) => (
                      <div key={item._id} style={{ fontSize: 13 }}>
                        <b>{item.name}</b> {[item.dose, item.frequency, item.duration].filter(Boolean).join(" · ")} — qty {item.quantity}
                        {item.dispensed_quantity > 0 && <Text type="secondary"> ({item.dispensed_quantity} given)</Text>}
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No prescriptions on this visit" />
              )}
            </Card>
          )}

          {settings.insurance && (
            <PayerCard
              visit={visit}
              disabled={closed || !access.manageVisits}
              onSaved={refresh}
              claims={visit.claims}
              canClaim={access.manageClaims}
              onOpenClaim={setClaimId}
              onStartClaim={() => setClaimForVisit(visit._id)}
            />
          )}
        </Space>
      )}

      {visit && (
        <>
          <AdmitModal
            open={admitOpen}
            customerId={visit.customer_id}
            visitId={visit._id}
            onClose={() => setAdmitOpen(false)}
            onAdmitted={() => {
              setAdmitOpen(false);
              refresh();
              onClose();
            }}
          />
          <ReferralLetterModal
            open={referralOpen}
            onClose={() => setReferralOpen(false)}
            patient={{
              patient: patientName(visit.customer),
              patientNumber: visit.profile?.patient_number,
              ageGender: [ageOf(visit.customer?.date_of_birth), visit.customer?.gender].filter(Boolean).join(" · "),
            }}
            defaults={{
              diagnoses: (visit.diagnoses ?? []).map((d) => `${d.code ? `${d.code} ` : ""}${d.description}`).join("; "),
              summary: [visit.clinical_notes?.chief_complaint, visit.clinical_notes?.examination].filter(Boolean).join("\n"),
              from: visit.doctor_name,
            }}
          />
        </>
      )}

      {visit && (
        <LabOrderModal
          open={labOpen}
          onClose={() => setLabOpen(false)}
          customerId={visit.customer_id}
          visitId={visit._id}
          onCreated={refresh}
        />
      )}
      <LabOrderDrawer
        orderId={labOrderId}
        onClose={() => {
          setLabOrderId(null);
          refresh();
        }}
      />
      <ClaimDrawer
        claimId={claimId}
        newVisitId={claimForVisit}
        onClose={() => {
          setClaimId(null);
          setClaimForVisit(null);
          refresh();
        }}
        onCreated={(id) => {
          setClaimForVisit(null);
          setClaimId(id);
        }}
      />

      {visit && (
        <PrescriptionModal
          open={rxOpen}
          onClose={() => setRxOpen(false)}
          customerId={visit.customer_id}
          visitId={visit._id}
          onCreated={() => {
            refresh();
            // Send the patient on to the pharmacy once something is prescribed
            if (visit.stage === "consultation" && access.manageVisits) stageMutation.mutate({ stage: "pharmacy" });
          }}
        />
      )}
    </Drawer>
  );
};

/** Who pays for the visit, the member check, and its claim. */
const PayerCard: React.FC<{
  visit: Visit;
  disabled: boolean;
  onSaved: () => void;
  claims: { _id: string; claim_number: string; status: keyof typeof CLAIM_STATUS_TAG; claim_amount: number; payer_name: string }[];
  canClaim: boolean;
  onOpenClaim: (id: string) => void;
  onStartClaim: () => void;
}> = ({ visit, disabled, onSaved, claims, canClaim, onOpenClaim, onStartClaim }) => {
  const [payer, setPayer] = useState(visit.payer);
  const [payerId, setPayerId] = useState(visit.payer_id ?? undefined);
  const [schemeId, setSchemeId] = useState(visit.scheme_id ?? undefined);
  const [member, setMember] = useState(visit.member_number ?? "");
  const [verified, setVerified] = useState(!!visit.member_verified);
  const { data: payers = [] } = useQuery({
    queryKey: ["healthcare-payers", "active"],
    queryFn: () => fetchPayers(true, "HEALTHCARE_VISITS_MANAGE"),
  });
  const save = useMutation({
    mutationFn: () =>
      updateVisit(visit._id, { payer, payer_id: payerId ?? null, scheme_id: schemeId ?? null, member_number: member, member_verified: verified }),
    onSuccess: () => {
      message.success("Payer saved");
      onSaved();
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't save the payer")),
  });
  const schemes = payers.find((p) => p._id === payerId)?.schemes.filter((s) => s.is_active !== false) ?? [];

  return (
    <Card
      size="small"
      title="Payment"
      extra={
        canClaim &&
        payer !== "cash" &&
        !claims.some((c) => c.status !== "rejected") && (
          <Button size="small" onClick={onStartClaim} disabled={!visit.payer_id}>
            Start claim
          </Button>
        )
      }
    >
      <Space wrap>
        <Select
          value={payer}
          disabled={disabled}
          onChange={setPayer}
          style={{ width: 130 }}
          options={[
            { value: "cash", label: "Cash" },
            { value: "insurance", label: "Insurance" },
            { value: "corporate", label: "Corporate" },
          ]}
        />
        {payer !== "cash" && (
          <>
            <Select
              value={payerId}
              disabled={disabled}
              placeholder="Payer"
              style={{ width: 190 }}
              onChange={(v) => {
                setPayerId(v);
                setSchemeId(undefined);
              }}
              options={payers.map((p) => ({ value: p._id, label: p.name }))}
            />
            <Select
              value={schemeId}
              disabled={disabled}
              allowClear
              placeholder="Scheme"
              style={{ width: 160 }}
              onChange={setSchemeId}
              options={schemes.map((s) => ({ value: s._id, label: s.name }))}
            />
            <Input value={member} disabled={disabled} placeholder="Member no." style={{ width: 150 }} onChange={(e) => setMember(e.target.value)} />
            <span>
              <Switch size="small" checked={verified} disabled={disabled} onChange={setVerified} /> <Text>Member verified</Text>
            </span>
          </>
        )}
        {!disabled && (
          <Button size="small" type="primary" loading={save.isLoading} onClick={() => save.mutate()}>
            Save
          </Button>
        )}
      </Space>
      {!!claims.length && (
        <div style={{ marginTop: 10 }}>
          {claims.map((c) => (
            <div key={c._id} onClick={() => onOpenClaim(c._id)} style={{ cursor: "pointer", padding: "4px 0" }}>
              <Space>
                <Text strong>{c.claim_number}</Text>
                <Tag color={CLAIM_STATUS_TAG[c.status].color}>{CLAIM_STATUS_TAG[c.status].label}</Tag>
                <Text type="secondary">
                  {c.payer_name} · {money(c.claim_amount)}
                </Text>
              </Space>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default VisitDrawer;
