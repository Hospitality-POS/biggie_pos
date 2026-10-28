import React, { useState } from "react";
import { Badge, Button, Card, Empty, Select, Space, Spin, Tag, Typography, message } from "antd";
import { LoginOutlined, ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createVisit, fetchVisits, healthcareError, type Visit } from "@services/healthcare";
import { useHealthcareSettings } from "@hooks/useHealthcareSettings";
import PatientPicker from "./PatientPicker";
import VisitDrawer from "./VisitDrawer";
import { PRIORITY_COLOR, STAGES, VISIT_TYPE_LABEL, patientName, searchPermissionFor, useHealthcareAccess, waitedFor } from "./shared";

const { Text } = Typography;

const QueueTab: React.FC = () => {
  const queryClient = useQueryClient();
  const settings = useHealthcareSettings();
  const access = useHealthcareAccess();
  const [patientId, setPatientId] = useState<string>();
  const [visitType, setVisitType] = useState<Visit["visit_type"]>("outpatient");
  const [priority, setPriority] = useState<Visit["priority"]>("normal");
  const [payer, setPayer] = useState<Visit["payer"]>("cash");
  const [openVisit, setOpenVisit] = useState<string | null>(null);

  const { data: visits = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["healthcare-visits", "open"],
    queryFn: () => fetchVisits({ open: true }),
    refetchInterval: 30_000,
  });

  const checkIn = useMutation({
    mutationFn: () => createVisit({ customer_id: patientId ?? "", visit_type: visitType, priority, payer }),
    onSuccess: (visit) => {
      message.success(`Checked in · ${visit.visit_number}`);
      setPatientId(undefined);
      setPriority("normal");
      queryClient.invalidateQueries({ queryKey: ["healthcare-visits"] });
    },
    onError: (error) => message.error(healthcareError(error, "Couldn't check the patient in")),
  });

  // Keep the triage column while anyone is still in it after triage is switched off
  const stages = STAGES.filter((s) => s.key !== "triage" || settings.triage || visits.some((v) => v.stage === "triage"));
  // Emergencies and urgent cases first, then whoever has waited longest
  const rank = { emergency: 0, urgent: 1, normal: 2 };
  const byStage = (stage: string) =>
    visits
      .filter((v) => v.stage === stage)
      .sort((a, b) => rank[a.priority] - rank[b.priority] || a.checked_in_at.localeCompare(b.checked_in_at));

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {access.manageVisits && (
        <Card size="small" title="Check in a patient">
          <Space wrap style={{ width: "100%" }}>
            <PatientPicker
              value={patientId}
              onChange={(id) => setPatientId(id)}
              canRegister={access.managePatients}
              permission={searchPermissionFor(access)}
              style={{ minWidth: 340, maxWidth: 520 }}
            />
            <Select
              value={visitType}
              onChange={setVisitType}
              style={{ width: 170 }}
              options={Object.entries(VISIT_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
            />
            <Select
              value={priority}
              onChange={setPriority}
              style={{ width: 120 }}
              options={[
                { value: "normal", label: "Normal" },
                { value: "urgent", label: "Urgent" },
                { value: "emergency", label: "Emergency" },
              ]}
            />
            <Select
              value={payer}
              onChange={setPayer}
              style={{ width: 120 }}
              options={[
                { value: "cash", label: "Cash" },
                { value: "insurance", label: "Insurance" },
                { value: "corporate", label: "Corporate" },
              ]}
            />
            <Button type="primary" icon={<LoginOutlined />} disabled={!patientId} loading={checkIn.isLoading} onClick={() => checkIn.mutate()}>
              Check in
            </Button>
          </Space>
        </Card>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text strong>
          Patients in the facility <Badge count={visits.length} showZero color="#64748b" />
        </Text>
        <Button size="small" icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`, gap: 12 }}>
          {stages.map((stage) => {
            const list = byStage(stage.key);
            return (
              <div key={stage.key} style={{ background: "#f8fafc", borderRadius: 10, padding: 10, minHeight: 160 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text strong style={{ color: stage.color }}>
                    {stage.label}
                  </Text>
                  <Tag>{list.length}</Tag>
                </div>
                {list.length ? (
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    {list.map((v) => (
                      <Card
                        key={v._id}
                        size="small"
                        hoverable
                        onClick={() => setOpenVisit(v._id)}
                        style={{ borderLeft: `3px solid ${stage.color}` }}
                        bodyStyle={{ padding: "8px 10px" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                          <Text strong ellipsis style={{ maxWidth: 150 }}>
                            {patientName(v.customer)}
                          </Text>
                          {v.priority !== "normal" && <Tag color={PRIORITY_COLOR[v.priority]}>{v.priority}</Tag>}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                          {[v.patient_number, v.visit_number].filter(Boolean).join(" · ")}
                        </Text>
                        <Space size={6} style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {waitedFor(v.checked_in_at)}
                          </Text>
                          {v.payer !== "cash" && <Tag style={{ fontSize: 11 }}>{v.payer}</Tag>}
                          {v.has_allergies && <WarningOutlined style={{ color: "#dc2626" }} title="Has allergies" />}
                        </Space>
                      </Card>
                    ))}
                  </Space>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No one here" />
                )}
              </div>
            );
          })}
        </div>
      )}

      <VisitDrawer visitId={openVisit} onClose={() => setOpenVisit(null)} />
    </Space>
  );
};

export default QueueTab;
