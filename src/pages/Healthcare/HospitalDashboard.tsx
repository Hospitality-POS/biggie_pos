import React, { useEffect, useState } from "react";
import { Button, Col, Empty, Row, Skeleton, Space, Typography } from "antd";
import { ProCard } from "@ant-design/pro-components";
import {
  AlertOutlined,
  ApartmentOutlined,
  CalendarOutlined,
  ExperimentOutlined,
  FileProtectOutlined,
  HomeOutlined,
  MedicineBoxOutlined,
  NodeIndexOutlined,
  ScheduleOutlined,
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

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setV(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
};

// Same tints as the dashboard's headline cards (Total Revenue, Bills, …)
const TINTS = {
  blue: { color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  purple: { color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  cyan: { color: "#06b6d4", bg: "#ecfeff", border: "#a5f3fc" },
  green: { color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
  teal: { color: "#14b8a6", bg: "#f0fdfa", border: "#99f6e4" },
  amber: { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  red: { color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
} as const;
type Tint = keyof typeof TINTS;

/** A tile built like the dashboard's headline cards: title, icon chip, value, subtext. */
const Tile: React.FC<{ tint: Tint; icon: React.ReactNode; title: string; value: React.ReactNode; subtext: React.ReactNode; onClick?: () => void; isMobile: boolean }> = ({
  tint,
  icon,
  title,
  value,
  subtext,
  onClick,
  isMobile,
}) => {
  const t = TINTS[tint];
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      style={{
        background: t.bg,
        borderRadius: isMobile ? 10 : 12,
        padding: isMobile ? "10px 10px" : "16px 18px",
        border: `1px solid ${t.border}`,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        height: "100%",
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <Space direction="vertical" size={isMobile ? 2 : 3} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: isMobile ? 11 : 12, color: "#475569", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </Text>
          <div
            style={{
              background: "#ffffff",
              borderRadius: isMobile ? 6 : 8,
              padding: isMobile ? "3px 5px" : "4px 6px",
              color: t.color,
              fontSize: isMobile ? 12 : 14,
              lineHeight: 1,
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        </div>
        <div style={{ fontSize: isMobile ? 17 : 22, fontWeight: 700, color: "#0f172a", letterSpacing: -0.3, marginTop: 2, lineHeight: 1.2, whiteSpace: "nowrap" }}>
          {value}
        </div>
        <div style={{ marginTop: 2, fontSize: 11, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtext}</div>
      </Space>
    </div>
  );
};

/** A panel built like the dashboard's chart cards (Top Sellers, Operations). */
const Panel: React.FC<{ tint: Tint; icon: React.ReactNode; title: string; extra?: React.ReactNode; isMobile: boolean; children: React.ReactNode }> = ({
  tint,
  icon,
  title,
  extra,
  isMobile,
  children,
}) => (
  <ProCard
    bordered
    headerBordered
    size="small"
    style={{ borderRadius: 12, height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    title={
      <Space size={8}>
        <div style={{ background: TINTS[tint].bg, borderRadius: 8, padding: "4px 8px", color: TINTS[tint].color, display: "inline-flex" }}>{icon}</div>
        <Text strong style={{ fontSize: 14 }}>
          {title}
        </Text>
      </Space>
    }
    extra={extra}
    bodyStyle={{ padding: isMobile ? "10px 10px 8px" : "14px 16px 12px" }}
  >
    {children}
  </ProCard>
);

const Bar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => (
  <div style={{ background: "#f1f5f9", borderRadius: 4, height: 8, width: "100%" }}>
    <div style={{ background: color, borderRadius: 4, height: 8, width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
  </div>
);

/**
 * The facility at a glance on the POS dashboard in hospital mode, styled
 * like the rest of the dashboard: who is where right now, patient flow,
 * today, what needs attention, ward occupancy and top diagnoses. Shows only
 * what the branch has switched on and the user may see.
 */
const HospitalDashboard: React.FC<{ startDate: Dayjs; endDate: Dayjs; periodLabel: string }> = ({ startDate, endDate, periodLabel }) => {
  const settings = useHealthcareSettings();
  const access = useHealthcareAccess();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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

  const gutter: [number, number] = isMobile ? [8, 8] : [12, 12];

  if (isLoading || !data) {
    return (
      <Row gutter={gutter} style={{ marginBottom: isMobile ? 12 : 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <Col xs={12} lg={6} key={i}>
            <div style={{ border: "1px solid #eef2f7", borderRadius: 12, padding: 16 }}>
              <Skeleton active paragraph={false} />
            </div>
          </Col>
        ))}
      </Row>
    );
  }

  const f = data.features;
  const go = (tab: string) => () => navigate(`/tables?tab=${tab}`);
  const words = settings.words;

  // ── Right now: same tiles as the headline cards ──
  const tiles = [
    f.visits && {
      tint: "blue" as Tint,
      icon: <TeamOutlined />,
      title: `${words.people} in the facility`,
      value: data.now.in_facility,
      subtext: data.now.urgent_waiting ? <span style={{ color: "#ef4444", fontWeight: 600 }}>{data.now.urgent_waiting} urgent</span> : "Checked in, not yet done",
      onClick: go("queue"),
    },
    f.visits && {
      tint: "purple" as Tint,
      icon: <UserOutlined />,
      title: "Waiting / with doctor",
      value: `${data.now.stages.waiting ?? 0} / ${data.now.stages.consultation ?? 0}`,
      subtext: "At reception and in consultation",
      onClick: go("queue"),
    },
    f.diagnostics && {
      tint: "cyan" as Tint,
      icon: <ExperimentOutlined />,
      title: "Tests in progress",
      value: data.now.lab_open,
      subtext: data.now.lab_urgent ? <span style={{ color: "#ef4444", fontWeight: 600 }}>{data.now.lab_urgent} urgent</span> : "Ordered, sampled or running",
      onClick: go("lab"),
    },
    f.prescriptions && {
      tint: "green" as Tint,
      icon: <MedicineBoxOutlined />,
      title: "To dispense",
      value: data.now.pharmacy_open,
      subtext: "Prescriptions waiting at the pharmacy",
      onClick: go("pharmacy"),
    },
    f.inpatient && {
      tint: "teal" as Tint,
      icon: <HomeOutlined />,
      title: "Beds occupied",
      value: `${data.now.beds_occupied} / ${data.now.beds}`,
      subtext: data.now.beds ? `${Math.round((data.now.beds_occupied / data.now.beds) * 100)}% full` : "No beds set up",
      onClick: go("wards"),
    },
  ].filter(Boolean) as { tint: Tint; icon: React.ReactNode; title: string; value: React.ReactNode; subtext: React.ReactNode; onClick: () => void }[];

  // ── Today ──
  const today = [
    f.visits && { label: "Visits", value: data.today.visits },
    { label: `New ${words.people.toLowerCase()}`, value: data.today.new_patients },
    f.diagnostics && { label: "Tests done", value: data.today.tests_done },
    f.prescriptions && { label: "Dispensed", value: data.today.prescriptions_dispensed },
    f.inpatient && { label: "Admitted", value: data.today.admitted },
    f.inpatient && { label: "Discharged", value: data.today.discharged },
    f.visits && data.today.average_visit_minutes != null && { label: "Average visit", value: `${data.today.average_visit_minutes} min` },
  ].filter(Boolean) as { label: string; value: React.ReactNode }[];

  // ── Needs attention ──
  const a = data.attention;
  const alerts = [
    a.urgent_waiting > 0 && { tint: "red" as Tint, icon: <AlertOutlined />, text: `${a.urgent_waiting} urgent or emergency ${a.urgent_waiting === 1 ? "patient" : "patients"} in the queue`, onClick: go("queue") },
    a.urgent_tests > 0 && { tint: "red" as Tint, icon: <ExperimentOutlined />, text: `${a.urgent_tests} urgent ${a.urgent_tests === 1 ? "test" : "tests"} waiting at the lab`, onClick: go("lab") },
    a.abnormal_results_today > 0 && { tint: "amber" as Tint, icon: <WarningOutlined />, text: `${a.abnormal_results_today} lab ${a.abnormal_results_today === 1 ? "order" : "orders"} with abnormal results today`, onClick: go("lab") },
    a.expired_batches > 0 && { tint: "red" as Tint, icon: <CalendarOutlined />, text: `${a.expired_batches} expired medicine ${a.expired_batches === 1 ? "batch" : "batches"} still on the shelf`, onClick: () => navigate("/inventory?tab=batches") },
    a.expiring_batches > 0 && { tint: "amber" as Tint, icon: <CalendarOutlined />, text: `${a.expiring_batches} ${a.expiring_batches === 1 ? "batch expires" : "batches expire"} within ${a.near_expiry_days} days`, onClick: () => navigate("/inventory?tab=batches") },
    a.beds_to_clean > 0 && { tint: "amber" as Tint, icon: <HomeOutlined />, text: `${a.beds_to_clean} ${a.beds_to_clean === 1 ? "bed needs" : "beds need"} cleaning`, onClick: go("wards") },
    access.deposits && a.unbilled_discharges > 0 && { tint: "blue" as Tint, icon: <HomeOutlined />, text: `${a.unbilled_discharges} discharged ${a.unbilled_discharges === 1 ? "patient's bill" : "patients' bills"} not sent to the POS`, onClick: go("wards") },
    access.viewClaims && a.claim_drafts > 0 && { tint: "blue" as Tint, icon: <FileProtectOutlined />, text: `${a.claim_drafts} draft ${a.claim_drafts === 1 ? "claim" : "claims"} to submit`, onClick: go("claims") },
    access.viewClaims && a.owed_by_payers > 0 && { tint: "purple" as Tint, icon: <FileProtectOutlined />, text: `${money(a.owed_by_payers)} owed by insurers`, onClick: go("claims") },
  ].filter(Boolean) as { tint: Tint; icon: React.ReactNode; text: string; onClick: () => void }[];

  // The same steps the queue board shows for this branch
  const flowStages = visibleStages(settings, Object.keys(data.now.stages));
  const maxStage = Math.max(1, ...flowStages.map((s) => data.now.stages[s.key] ?? 0));
  const maxDiagnosis = Math.max(1, ...data.top_diagnoses.map((d) => d.count));
  // Four tiles fill a row like the headline cards; five share it evenly
  const tileSpan = tiles.length >= 4 ? (tiles.length === 4 ? 6 : undefined) : 24 / Math.max(1, tiles.length);

  return (
    <>
      {!!tiles.length && (
        <Row gutter={gutter} style={{ marginBottom: isMobile ? 12 : 16 }}>
          {tiles.map((t) => (
            <Col key={t.title} xs={12} sm={12} lg={tileSpan} flex={tileSpan ? undefined : "1 1 0"} style={{ minWidth: isMobile ? undefined : 180 }}>
              <Tile {...t} isMobile={isMobile} />
            </Col>
          ))}
        </Row>
      )}

      <Row gutter={gutter} style={{ marginBottom: isMobile ? 12 : 16 }}>
        {f.visits && (
          <Col xs={24} lg={8}>
            <Panel
              tint="purple"
              icon={<NodeIndexOutlined />}
              title="Patient flow"
              isMobile={isMobile}
              extra={
                access.manageVisits && (
                  <Button type="text" size="small" icon={<UserAddOutlined />} onClick={go("queue")} style={{ fontSize: 12, color: "#3b82f6" }}>
                    Check in
                  </Button>
                )
              }
            >
              {flowStages.map((s) => (
                <div key={s.key} style={{ display: "grid", gridTemplateColumns: "86px 1fr 28px", gap: 8, alignItems: "center", padding: "5px 0" }}>
                  <Text style={{ fontSize: 12.5, color: "#475569" }}>{s.label}</Text>
                  <Bar value={data.now.stages[s.key] ?? 0} max={maxStage} color={s.color} />
                  <Text strong style={{ fontSize: 12.5, textAlign: "right" }}>
                    {data.now.stages[s.key] ?? 0}
                  </Text>
                </div>
              ))}
            </Panel>
          </Col>
        )}

        <Col xs={24} lg={f.visits ? 8 : 12}>
          <Panel tint="blue" icon={<ScheduleOutlined />} title="Today" isMobile={isMobile}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {today.map((t) => (
                <div key={t.label} style={{ background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: isMobile ? "6px 10px" : "8px 12px" }}>
                  <Text style={{ fontSize: 11, color: "#64748b", display: "block" }}>{t.label}</Text>
                  <Text strong style={{ fontSize: 16, color: "#0f172a" }}>
                    {t.value}
                  </Text>
                </div>
              ))}
            </div>
          </Panel>
        </Col>

        <Col xs={24} lg={f.visits ? 8 : 12}>
          <Panel tint={alerts.length ? "red" : "green"} icon={<AlertOutlined />} title="Needs attention" isMobile={isMobile}>
            {alerts.length ? (
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                {alerts.map((al) => (
                  <div
                    key={al.text}
                    onClick={al.onClick}
                    role="button"
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                      padding: "7px 10px",
                      cursor: "pointer",
                      background: TINTS[al.tint].bg,
                      border: `1px solid ${TINTS[al.tint].border}`,
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ color: TINTS[al.tint].color, marginTop: 2 }}>{al.icon}</span>
                    <Text style={{ fontSize: 12.5 }}>{al.text}</Text>
                  </div>
                ))}
              </Space>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="All clear" />
            )}
          </Panel>
        </Col>
      </Row>

      {(f.inpatient && data.wards.length > 0) || f.visits ? (
        <Row gutter={gutter} style={{ marginBottom: isMobile ? 12 : 16 }}>
          {f.inpatient && data.wards.length > 0 && (
            <Col xs={24} lg={12}>
              <Panel tint="teal" icon={<ApartmentOutlined />} title="Ward occupancy" isMobile={isMobile}>
                {data.wards.map((w) => (
                  <div key={w.name} style={{ display: "grid", gridTemplateColumns: "minmax(110px, 160px) 1fr 56px", gap: 8, alignItems: "center", padding: "5px 0" }}>
                    <Text ellipsis style={{ fontSize: 12.5, color: "#475569" }}>
                      {w.name}
                    </Text>
                    <Bar value={w.occupied} max={w.beds} color={w.beds && w.occupied / w.beds > 0.85 ? TINTS.red.color : TINTS.teal.color} />
                    <Text strong style={{ fontSize: 12.5, textAlign: "right" }}>
                      {w.occupied}/{w.beds}
                    </Text>
                  </div>
                ))}
              </Panel>
            </Col>
          )}
          {f.visits && (
            <Col xs={24} lg={f.inpatient && data.wards.length ? 12 : 24}>
              <Panel tint="purple" icon={<MedicineBoxOutlined />} title={`Top diagnoses · ${periodLabel}`} isMobile={isMobile}>
                {data.top_diagnoses.length ? (
                  data.top_diagnoses.map((d) => (
                    <div key={d.description} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 220px) 1fr 36px", gap: 8, alignItems: "center", padding: "5px 0" }}>
                      <Text ellipsis style={{ fontSize: 12.5, color: "#475569" }}>
                        {d.code ? `${d.code} · ` : ""}
                        {d.description}
                      </Text>
                      <Bar value={d.count} max={maxDiagnosis} color={TINTS.purple.color} />
                      <Text strong style={{ fontSize: 12.5, textAlign: "right" }}>
                        {d.count}
                      </Text>
                    </div>
                  ))
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No diagnoses recorded in this period" />
                )}
              </Panel>
            </Col>
          )}
        </Row>
      ) : null}
    </>
  );
};

export default HospitalDashboard;
