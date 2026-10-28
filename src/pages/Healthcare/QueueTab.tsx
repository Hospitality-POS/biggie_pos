import React, { useState } from "react";
import { Button, Card, Checkbox, Empty, Form, Input, Modal, Radio, Select, Space, Spin, Tag, Typography, message } from "antd";
import { LoginOutlined, ReloadOutlined, SearchOutlined, WarningOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createVisit, fetchPayers, fetchVisits, healthcareError, type PatientRow, type Visit } from "@services/healthcare";
import { useHealthcareSettings } from "@hooks/useHealthcareSettings";
import PatientPicker from "./PatientPicker";
import VisitDrawer from "./VisitDrawer";
import { PRIORITY_COLOR, VISIT_TYPE_LABEL, patientName, searchPermissionFor, useHealthcareAccess, visibleStages, waitedFor } from "./shared";

const { Text } = Typography;

const QueueTab: React.FC = () => {
  const settings = useHealthcareSettings();
  const access = useHealthcareAccess();
  const [openVisit, setOpenVisit] = useState<string | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const { data: visits = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["healthcare-visits", "open"],
    queryFn: () => fetchVisits({ open: true }),
    refetchInterval: 30_000,
  });

  // Only the steps this branch uses (see visibleStages), plus any still in use
  const stages = visibleStages(settings, visits.map((v) => v.stage));
  const q = filter.trim().toLowerCase();
  const shown = q
    ? visits.filter((v) => `${patientName(v.customer)} ${v.patient_number ?? ""} ${v.visit_number} ${v.customer?.phone ?? ""}`.toLowerCase().includes(q))
    : visits;
  // Emergencies and urgent cases first, then whoever has waited longest
  const rank = { emergency: 0, urgent: 1, normal: 2 };
  const byStage = (stage: string) =>
    shown
      .filter((v) => v.stage === stage)
      .sort((a, b) => rank[a.priority] - rank[b.priority] || a.checked_in_at.localeCompare(b.checked_in_at));
  const urgent = visits.filter((v) => v.priority !== "normal").length;

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <div style={{ flex: "1 1 220px" }}>
          <Text strong style={{ fontSize: 16, display: "block" }}>
            Patient queue
          </Text>
          <Text type="secondary" style={{ fontSize: 12.5 }}>
            {visits.length} in the facility{urgent ? ` · ${urgent} urgent` : ""}
          </Text>
        </div>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Find a patient"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 220 }}
        />
        <Button icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()} aria-label="Refresh" />
        {access.manageVisits && (
          <Button type="primary" icon={<LoginOutlined />} onClick={() => setCheckInOpen(true)}>
            Check in patient
          </Button>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : !visits.length ? (
        <Empty description="No patients checked in yet" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: "40px 0" }}>
          {access.manageVisits && (
            <Button type="primary" icon={<LoginOutlined />} onClick={() => setCheckInOpen(true)}>
              Check in the first patient
            </Button>
          )}
        </Empty>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
          {stages.map((stage) => {
            const list = byStage(stage.key);
            return (
              <div key={stage.key} style={{ background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 12, padding: 10, minHeight: 180 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: stage.color }} />
                  <Text strong>{stage.label}</Text>
                  <Text type="secondary" style={{ marginLeft: "auto", fontSize: 12 }}>
                    {list.length}
                  </Text>
                </div>
                {list.length ? (
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    {list.map((v) => (
                      <Card
                        key={v._id}
                        size="small"
                        hoverable
                        onClick={() => setOpenVisit(v._id)}
                        style={{ borderLeft: `3px solid ${stage.color}`, borderRadius: 8 }}
                        bodyStyle={{ padding: "8px 10px" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                          <Text strong ellipsis style={{ maxWidth: 150 }}>
                            {patientName(v.customer)}
                          </Text>
                          {v.priority !== "normal" && <Tag color={PRIORITY_COLOR[v.priority]} style={{ marginRight: 0 }}>{v.priority}</Tag>}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                          {v.patient_number || v.visit_number}
                        </Text>
                        <Space size={6} style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {waitedFor(v.checked_in_at)}
                          </Text>
                          {v.payer !== "cash" && <Tag style={{ fontSize: 11, marginRight: 0 }}>{v.payer}</Tag>}
                          {v.has_allergies && <WarningOutlined style={{ color: "#dc2626" }} title="Has allergies" />}
                        </Space>
                      </Card>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary" style={{ fontSize: 12, display: "block", textAlign: "center", padding: "24px 0" }}>
                    {q ? "No match" : "No one here"}
                  </Text>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CheckInModal open={checkInOpen} onClose={() => setCheckInOpen(false)} />
      <VisitDrawer visitId={openVisit} onClose={() => setOpenVisit(null)} />
    </Space>
  );
};

/** Reception's form: who, why, how urgent, who pays. */
const CheckInModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const settings = useHealthcareSettings();
  const access = useHealthcareAccess();
  const [patientId, setPatientId] = useState<string>();
  const [visitType, setVisitType] = useState<Visit["visit_type"]>("outpatient");
  const [priority, setPriority] = useState<Visit["priority"]>("normal");
  const [payer, setPayer] = useState<Visit["payer"]>("cash");
  const [payerId, setPayerId] = useState<string>();
  const [schemeId, setSchemeId] = useState<string>();
  const [memberNumber, setMemberNumber] = useState("");
  const [memberVerified, setMemberVerified] = useState(false);

  const { data: payers = [] } = useQuery({
    queryKey: ["healthcare-payers", "active"],
    queryFn: () => fetchPayers(true, "HEALTHCARE_VISITS_MANAGE"),
    enabled: open && settings.insurance,
  });
  const schemes = payers.find((p) => p._id === payerId)?.schemes.filter((s) => s.is_active !== false) ?? [];

  const reset = () => {
    setPatientId(undefined);
    setVisitType("outpatient");
    setPriority("normal");
    setPayer("cash");
    setPayerId(undefined);
    setSchemeId(undefined);
    setMemberNumber("");
    setMemberVerified(false);
  };

  /** Picking a patient brings in their insurer and member number from their medical details. */
  const pickPatient = (id: string | undefined, row?: PatientRow) => {
    setPatientId(id);
    const ins = row?.profile?.insurance;
    if (!settings.insurance || !ins?.provider) return;
    const match = payers.find((p) => p.name.toLowerCase() === ins.provider?.toLowerCase());
    if (!match) return;
    setPayer(match.kind === "corporate" ? "corporate" : "insurance");
    setPayerId(match._id);
    setSchemeId(match.schemes.find((s) => s.name.toLowerCase() === ins.scheme?.toLowerCase())?._id);
    setMemberNumber(ins.member_number ?? "");
  };

  const checkIn = useMutation({
    mutationFn: () =>
      createVisit({
        customer_id: patientId ?? "",
        visit_type: visitType,
        priority,
        payer,
        ...(payer !== "cash" && settings.insurance
          ? { payer_id: payerId, scheme_id: schemeId, member_number: memberNumber, member_verified: memberVerified }
          : {}),
      }),
    onSuccess: (visit) => {
      message.success(`Checked in · ${visit.visit_number}`);
      reset();
      onClose();
      queryClient.invalidateQueries({ queryKey: ["healthcare-visits"] });
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't check the patient in")),
  });

  const needsPayer = settings.insurance && payer !== "cash" && !payerId;

  return (
    <Modal
      title="Check in patient"
      open={open}
      onCancel={() => {
        reset();
        onClose();
      }}
      okText="Check in"
      okButtonProps={{ disabled: !patientId || needsPayer, icon: <LoginOutlined /> }}
      confirmLoading={checkIn.isLoading}
      onOk={() => checkIn.mutate()}
      width={560}
      destroyOnClose
    >
      <Form layout="vertical">
        <Form.Item label="Patient" required>
          <PatientPicker value={patientId} onChange={pickPatient} canRegister={access.managePatients} permission={searchPermissionFor(access)} />
        </Form.Item>
        <Form.Item label="Visit">
          <Select value={visitType} onChange={setVisitType} options={Object.entries(VISIT_TYPE_LABEL).map(([value, label]) => ({ value, label }))} />
        </Form.Item>
        <Form.Item label="Priority">
          <Radio.Group value={priority} onChange={(e) => setPriority(e.target.value)} optionType="button" buttonStyle="solid">
            <Radio.Button value="normal">Normal</Radio.Button>
            <Radio.Button value="urgent">Urgent</Radio.Button>
            <Radio.Button value="emergency">Emergency</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="Who pays">
          <Radio.Group value={payer} onChange={(e) => setPayer(e.target.value)} optionType="button">
            <Radio.Button value="cash">Cash</Radio.Button>
            <Radio.Button value="insurance">Insurance</Radio.Button>
            <Radio.Button value="corporate">Corporate</Radio.Button>
          </Radio.Group>
        </Form.Item>
        {settings.insurance && payer !== "cash" && (
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 12px 0" }}>
            <Space wrap style={{ width: "100%" }}>
              <Form.Item label="Payer" required validateStatus={needsPayer ? "warning" : undefined}>
                <Select
                  value={payerId}
                  placeholder="Choose"
                  style={{ width: 200 }}
                  onChange={(v) => {
                    setPayerId(v);
                    setSchemeId(undefined);
                  }}
                  options={payers.map((p) => ({ value: p._id, label: p.name }))}
                  notFoundContent="Set up payers in the Claims tab"
                />
              </Form.Item>
              <Form.Item label="Scheme">
                <Select value={schemeId} allowClear placeholder="Optional" style={{ width: 180 }} onChange={setSchemeId} options={schemes.map((s) => ({ value: s._id, label: s.name }))} />
              </Form.Item>
              <Form.Item label="Member no.">
                <Input value={memberNumber} style={{ width: 200 }} onChange={(e) => setMemberNumber(e.target.value)} />
              </Form.Item>
              <Form.Item label=" ">
                <Checkbox checked={memberVerified} onChange={(e) => setMemberVerified(e.target.checked)}>
                  Member verified
                </Checkbox>
              </Form.Item>
            </Space>
          </div>
        )}
      </Form>
    </Modal>
  );
};

export default QueueTab;
