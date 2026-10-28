import React from "react";
import { Card, Col, Empty, Row, Skeleton, Typography } from "antd";
import {
  AlertOutlined,
  CalendarOutlined,
  ExperimentOutlined,
  FileProtectOutlined,
  HomeOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { Dayjs } from "dayjs";
import { fetchHealthcareDashboard } from "@services/healthcare";
import { useHealthcareSettings } from "@hooks/useHealthcareSettings";
import { money, useHealthcareAccess, visibleStages } from "./shared";

const { Text } = Typography;

const Tile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  color: string;
  onClick?: () => void;
}> = ({ icon, label, value, hint, color, onClick }) => (
  <div
    onClick={onClick}
    role={onClick ? "button" : undefined}
    style={{
      background: "#fff",
      border: "1px solid #eef2f7",
      borderRadius: 12,
      padding: "14px 16px",
      cursor: onClick ? "pointer" : "default",
      height: "100%",
      display: "flex",
      gap: 12,
      alignItems: "center",
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: `${color}14`,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <Text style={{ fontSize: 12, color: "#64748b", display: "block" }}>{label}</Text>
      <Text strong style={{ fontSize: 22, lineHeight: 1.2, color: "#0f172a" }}>
        {value}
      </Text>
      {hint && <Text style={{ fontSize: 11.5, color: "#94a3b8", display: "block" }}>{hint}</Text>}
    </div>
  </div>
);

const Bar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => (
  <div style={{ background: "#f1f5f9", borderRadius: 4, height: 8, width: "100%" }}>
    <div style={{ background: color, borderRadius: 4, height: 8, width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
  </div>
);

/**
 * The facility at a glance, at the top of the POS dashboard in hospital
 * mode: who is where right now, today's movement, what needs attention,
 * ward occupancy and the period's top diagnoses. Shows only what the
 * branch has switched on.
 */
const HospitalDashboard: React.FC<{ startDate: Dayjs; endDate: Dayjs; periodLabel: string }> = ({ startDate, endDate, periodLabel }) => {
  const settings = useHealthcareSettings();
  const access = useHealthcareAccess();
  const navigate = useNavigate();
  const permission = access.viewVisits
    ? "HEALTHCARE_VISITS_VIEW"
    : access.viewReports
      ? "HEALTHCARE_REPORTS_VIEW"
      : access.viewInpatients
        ? "HEALTHCARE_INPATIENT_VIEW"
        : access.viewPrescriptions
          ? "HEALTHCARE_PRESCRIPTIONS_VIEW"
          : access.viewLab
            ? "HEALTHCARE_LAB_VIEW"
            : "";
  const from = startDate.format("YYYY-MM-DD");
  const to = endDate.format("YYYY-MM-DD");
  const { data, isLoading } = useQuery({
    queryKey: ["healthcare-dashboard", from, to],
    queryFn: () => fetchHealthcareDashboard(from, to, permission),
    enabled: settings.enabled && !!permission,
    refetchInterval: 60_000,
  });

  if (!settings.enabled || !permission) return null;
  if (isLoading || !data) {
    return (
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  const f = data.features;
  const go = (tab: string) => () => navigate(`/tables?tab=${tab}`);
  const words = settings.words;

  // ── Right now ──
  const nowTiles = [
    f.visits && { icon: <TeamOutlined />, label: `${words.people} in the facility`, value: data.now.in_facility, color: "#2563eb", hint: data.now.urgent_waiting ? `${data.now.urgent_waiting} urgent` : undefined, onClick: go("queue") },
    f.visits && { icon: <UserOutlined />, label: "Waiting / with the doctor", value: `${data.now.stages.waiting ?? 0} / ${data.now.stages.consultation ?? 0}`, color: "#7c3aed", onClick: go("queue") },
    f.diagnostics && { icon: <ExperimentOutlined />, label: "Tests in progress", value: data.now.lab_open, color: "#0891b2", hint: data.now.lab_urgent ? `${data.now.lab_urgent} urgent` : undefined, onClick: go("lab") },
    f.prescriptions && { icon: <MedicineBoxOutlined />, label: "To dispense", value: data.now.pharmacy_open, color: "#16a34a", onClick: go("pharmacy") },
    f.inpatient && { icon: <HomeOutlined />, label: "Beds occupied", value: `${data.now.beds_occupied} / ${data.now.beds}`, color: "#0f766e", hint: data.now.beds ? `${Math.round((data.now.beds_occupied / data.now.beds) * 100)}% full` : undefined, onClick: go("wards") },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: React.ReactNode; color: string; hint?: string; onClick?: () => void }[];

  // ── Today ──
  const today = [
    f.visits && { label: "Visits", value: data.today.visits },
    { label: `New ${words.people.toLowerCase()}`, value: data.today.new_patients },
    f.diagnostics && { label: "Tests done", value: data.today.tests_done },
    f.prescriptions && { label: "Prescriptions dispensed", value: data.today.prescriptions_dispensed },
    f.inpatient && { label: "Admitted", value: data.today.admitted },
    f.inpatient && { label: "Discharged", value: data.today.discharged },
    f.visits && data.today.average_visit_minutes != null && { label: "Average visit", value: `${data.today.average_visit_minutes} min` },
  ].filter(Boolean) as { label: string; value: React.ReactNode }[];

  // ── Needs attention ──
  const a = data.attention;
  const alerts = [
    a.urgent_waiting > 0 && { color: "#dc2626", icon: <AlertOutlined />, text: `${a.urgent_waiting} urgent or emergency ${a.urgent_waiting === 1 ? "patient" : "patients"} in the queue`, onClick: go("queue") },
    a.urgent_tests > 0 && { color: "#dc2626", icon: <ExperimentOutlined />, text: `${a.urgent_tests} urgent ${a.urgent_tests === 1 ? "test" : "tests"} waiting at the lab`, onClick: go("lab") },
    a.abnormal_results_today > 0 && { color: "#d97706", icon: <WarningOutlined />, text: `${a.abnormal_results_today} lab ${a.abnormal_results_today === 1 ? "order" : "orders"} with abnormal results today`, onClick: go("lab") },
    a.expired_batches > 0 && { color: "#dc2626", icon: <CalendarOutlined />, text: `${a.expired_batches} expired medicine ${a.expired_batches === 1 ? "batch" : "batches"} still on the shelf`, onClick: () => navigate("/inventory?tab=batches") },
    a.expiring_batches > 0 && { color: "#d97706", icon: <CalendarOutlined />, text: `${a.expiring_batches} ${a.expiring_batches === 1 ? "batch expires" : "batches expire"} within ${a.near_expiry_days} days`, onClick: () => navigate("/inventory?tab=batches") },
    a.beds_to_clean > 0 && { color: "#d97706", icon: <HomeOutlined />, text: `${a.beds_to_clean} ${a.beds_to_clean === 1 ? "bed needs" : "beds need"} cleaning`, onClick: go("wards") },
    a.unbilled_discharges > 0 && { color: "#2563eb", icon: <HomeOutlined />, text: `${a.unbilled_discharges} discharged ${a.unbilled_discharges === 1 ? "patient's bill" : "patients' bills"} not sent to the POS`, onClick: go("wards") },
    a.claim_drafts > 0 && { color: "#2563eb", icon: <FileProtectOutlined />, text: `${a.claim_drafts} draft ${a.claim_drafts === 1 ? "claim" : "claims"} to submit`, onClick: go("claims") },
    a.owed_by_payers > 0 && { color: "#475569", icon: <FileProtectOutlined />, text: `${money(a.owed_by_payers)} owed by insurers`, onClick: go("claims") },
  ].filter(Boolean) as { color: string; icon: React.ReactNode; text: string; onClick: () => void }[];

  // The same steps the queue board shows for this branch
  const flowStages = visibleStages(settings, Object.keys(data.now.stages));
  const maxStage = Math.max(1, ...flowStages.map((s) => data.now.stages[s.key] ?? 0));
  const maxDiagnosis = Math.max(1, ...data.top_diagnoses.map((d) => d.count));

  return (
    <div style={{ marginBottom: 16 }}>
      <Text strong style={{ fontSize: 13, color: "#475569", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Right now
      </Text>
      {!!nowTiles.length && (
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          {nowTiles.map((t) => (
            <Col key={t.label} xs={12} md={8} xl={Math.max(4, Math.floor(24 / nowTiles.length))}>
              <Tile {...t} />
            </Col>
          ))}
        </Row>
      )}

      <Row gutter={[12, 12]}>
        {f.visits && (
          <Col xs={24} lg={8}>
            <Card size="small" title="Patient flow" style={{ borderRadius: 12, height: "100%" }}>
              {flowStages.map((s) => (
                <div key={s.key} style={{ display: "grid", gridTemplateColumns: "86px 1fr 28px", gap: 8, alignItems: "center", padding: "5px 0" }}>
                  <Text style={{ fontSize: 12.5 }}>{s.label}</Text>
                  <Bar value={data.now.stages[s.key] ?? 0} max={maxStage} color={s.color} />
                  <Text strong style={{ fontSize: 12.5, textAlign: "right" }}>
                    {data.now.stages[s.key] ?? 0}
                  </Text>
                </div>
              ))}
            </Card>
          </Col>
        )}

        <Col xs={24} lg={f.visits ? 8 : 12}>
          <Card size="small" title="Today" style={{ borderRadius: 12, height: "100%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
              {today.map((t) => (
                <div key={t.label}>
                  <Text style={{ fontSize: 12, color: "#64748b", display: "block" }}>{t.label}</Text>
                  <Text strong style={{ fontSize: 18 }}>
                    {t.value}
                  </Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={f.visits ? 8 : 12}>
          <Card
            size="small"
            title={
              <span>
                <AlertOutlined style={{ color: alerts.length ? "#dc2626" : "#16a34a" }} /> Needs attention
              </span>
            }
            style={{ borderRadius: 12, height: "100%" }}
          >
            {alerts.length ? (
              alerts.map((al) => (
                <div
                  key={al.text}
                  onClick={al.onClick}
                  role="button"
                  style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}
                >
                  <span style={{ color: al.color, marginTop: 2 }}>{al.icon}</span>
                  <Text style={{ fontSize: 13 }}>{al.text}</Text>
                </div>
              ))
            ) : (
              <Text type="secondary">All clear</Text>
            )}
          </Card>
        </Col>

        {f.inpatient && !!data.wards.length && (
          <Col xs={24} lg={12}>
            <Card size="small" title="Ward occupancy" style={{ borderRadius: 12, height: "100%" }}>
              {data.wards.map((w) => (
                <div key={w.name} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 160px) 1fr 70px", gap: 8, alignItems: "center", padding: "5px 0" }}>
                  <Text ellipsis style={{ fontSize: 12.5 }}>
                    {w.name}
                  </Text>
                  <Bar value={w.occupied} max={w.beds} color={w.beds && w.occupied / w.beds > 0.85 ? "#dc2626" : "#0f766e"} />
                  <Text style={{ fontSize: 12.5, textAlign: "right" }}>
                    {w.occupied}/{w.beds}
                  </Text>
                </div>
              ))}
            </Card>
          </Col>
        )}

        {f.visits && (
          <Col xs={24} lg={f.inpatient && data.wards.length ? 12 : 24}>
            <Card size="small" title={`Top diagnoses · ${periodLabel}`} style={{ borderRadius: 12, height: "100%" }}>
              {data.top_diagnoses.length ? (
                data.top_diagnoses.map((d) => (
                  <div key={d.description} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 220px) 1fr 36px", gap: 8, alignItems: "center", padding: "5px 0" }}>
                    <Text ellipsis style={{ fontSize: 12.5 }}>
                      {d.code ? `${d.code} · ` : ""}
                      {d.description}
                    </Text>
                    <Bar value={d.count} max={maxDiagnosis} color="#7c3aed" />
                    <Text strong style={{ fontSize: 12.5, textAlign: "right" }}>
                      {d.count}
                    </Text>
                  </div>
                ))
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No diagnoses recorded in this period" />
              )}
            </Card>
          </Col>
        )}
      </Row>

      {access.manageVisits && f.visits && (
        <div style={{ marginTop: 12 }}>
          <Text
            role="button"
            onClick={go("queue")}
            style={{ color: "#2563eb", cursor: "pointer", fontSize: 13 }}
          >
            <UserAddOutlined /> Check in a patient
          </Text>
        </div>
      )}
    </div>
  );
};

export default HospitalDashboard;
