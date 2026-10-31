import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Grid, Segmented, Spin, Typography } from "antd";
import { FormOutlined, ScheduleOutlined, StarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { THEME_C } from "@utils/getPrimaryColor";
import { fetchFormAnalytics } from "@services/formSubmissions";
import { fetchPlanAnalytics } from "@services/plans";
import { useAudience } from "./audience";
import FormsAiDrawer from "./FormsAiDrawer";
import { CATEGORY_META } from "./forms/constants";
import { SUBMISSION_STATUS_META, type SubmissionStatus } from "./forms/fill/types";

const { Text } = Typography;
const C = THEME_C;

type Range = "7" | "30" | "90" | "all";
const RANGES: { label: string; value: Range }[] = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
  { label: "All time", value: "all" },
];
const FORM_STATUSES: SubmissionStatus[] = ["completed", "awaiting_therapist", "in_progress", "pending", "voided"];
const PLAN_STATUSES = [
  { key: "active", label: "Active", color: "#0d9488" },
  { key: "completed", label: "Completed", color: "#059669" },
  { key: "cancelled", label: "Cancelled", color: "#94a3b8" },
] as const;
const FORMS_COLOR = "#8b5cf6";
const PLANS_COLOR = "#0d9488";

const formatHours = (h: number | null) => {
  if (h == null) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h * 10) / 10} h`;
  return `${Math.round(h / 24)} days`;
};
const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);
const categoryOf = (c?: string) => CATEGORY_META[(c ?? "other") as keyof typeof CATEGORY_META] ?? CATEGORY_META.other;

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string; color?: string }> = ({ label, value, hint, color }) => (
  <div style={{ background: "#fff", border: "1px solid #e8edf3", borderRadius: 12, padding: "12px 14px" }}>
    <Text style={{ fontSize: 12, color: C.subText, display: "block" }}>{label}</Text>
    <div style={{ fontSize: 22, fontWeight: 700, color: color ?? C.darkText, lineHeight: 1.3 }}>{value}</div>
    {hint && <Text style={{ fontSize: 11.5, color: "#94a3b8" }}>{hint}</Text>}
  </div>
);

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ background: "#fff", border: "1px solid #e8edf3", borderRadius: 12, padding: "14px 16px" }}>
    <Text strong style={{ fontSize: 13.5, display: "block", marginBottom: 12 }}>{title}</Text>
    {children}
  </div>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; color: string; title: string }> = ({ icon, color, title }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "20px 0 10px" }}>
    <span style={{ color, fontSize: 15 }}>{icon}</span>
    <Text strong style={{ fontSize: 14.5 }}>{title}</Text>
  </div>
);

const Meter: React.FC<{ label: React.ReactNode; value: number; of: number; color: string; right?: React.ReactNode }> = ({ label, value, of, color, right }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
      <span style={{ color: "#334155", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{right ?? value}</span>
    </div>
    <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", marginTop: 4 }}>
      <div style={{ width: `${pct(value, of)}%`, height: "100%", borderRadius: 3, background: color }} />
    </div>
  </div>
);

/**
 * Analytics for the whole Forms & Plans hub: forms sent and signed, and
 * treatment (or onboarding / training) plans and their sessions. Each part
 * shows only when the user can see it.
 */
const HubAnalytics: React.FC<{ showForms: boolean; showPlans: boolean }> = ({ showForms, showPlans }) => {
  const screens = Grid.useBreakpoint();
  const isPhone = !screens.md;
  const a = useAudience();
  const isEmployee = a.audience === "employee";
  const plansLabel = isEmployee ? "Onboarding & training plans" : "Treatment plans";
  // Section heading for the forms half: "Client forms" / "Employee forms" / "Contact forms"
  const formsHeading = a.formsGroup;
  const [range, setRange] = useState<Range>("30");
  const [aiOpen, setAiOpen] = useState(false);

  const params = useMemo(
    () => (range === "all" ? {} : { from: dayjs().subtract(Number(range) - 1, "day").startOf("day").toISOString() }),
    [range]
  );
  const { data: forms, isLoading: formsLoading } = useQuery({
    queryKey: ["form-analytics", a.audience, range],
    queryFn: () => fetchFormAnalytics(a.audience, params),
    enabled: showForms,
    staleTime: 60_000,
  });
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["plan-analytics", a.audience, range],
    queryFn: () => fetchPlanAnalytics(a.audience, params),
    enabled: showPlans,
    staleTime: 60_000,
  });

  // One timeline for both: forms signed and sessions done per day
  const perDay = useMemo(() => {
    const signed = Object.fromEntries((forms?.per_day ?? []).map((d) => [d.date, d.count]));
    const done = Object.fromEntries((plans?.per_day ?? []).map((d) => [d.date, d.count]));
    const days = range === "all" ? 30 : Number(range);
    return Array.from({ length: days }, (_, i) => {
      const d = dayjs().subtract(days - 1 - i, "day");
      const key = d.format("YYYY-MM-DD");
      return { date: d.format("D MMM"), signed: signed[key] ?? 0, sessions: done[key] ?? 0 };
    });
  }, [forms, plans, range]);

  const loading = (showForms && formsLoading) || (showPlans && plansLoading);
  const empty = (!showForms || !forms?.total) && (!showPlans || !plans?.total);

  const toolbar = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
      <Text style={{ fontSize: 12.5, color: C.subText }}>
        {range === "all" ? "Everything so far" : `Forms sent and plans started in the last ${range} days`}
      </Text>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Segmented size="small" options={RANGES} value={range} onChange={(v) => setRange(v as Range)} />
        <Button
          size="small"
          icon={<StarOutlined />}
          onClick={() => setAiOpen(true)}
          style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", color: "#fff", border: "none", fontWeight: 600 }}
        >
          AI insights
        </Button>
      </div>
      <FormsAiDrawer
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        params={{ audience: a.audience, ...params }}
        periodLabel={RANGES.find((r) => r.value === range)?.label === "All time" ? "All time" : `Last ${range} days`}
      />
    </div>
  );

  if (loading) {
    return (
      <>
        {toolbar}
        <div style={{ textAlign: "center", padding: 48 }}><Spin /></div>
      </>
    );
  }
  if (empty) {
    return (
      <>
        {toolbar}
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing in this period yet" />
      </>
    );
  }

  // ── Forms numbers ──
  const signed = forms?.by_status.completed ?? 0;
  const live = (forms?.total ?? 0) - (forms?.by_status.voided ?? 0);
  const waiting = (forms?.by_status.pending ?? 0) + (forms?.by_status.in_progress ?? 0);
  // ── Plans numbers ──
  const activePlans = plans?.by_status.active ?? 0;
  const finished = plans?.by_status.completed ?? 0;
  const s = plans?.sessions ?? { total: 0, done: 0, skipped: 0, overdue: 0 };

  const cols = (n: number) => (isPhone ? "1fr 1fr" : `repeat(${n}, 1fr)`);

  return (
    <div>
      {toolbar}

      {/* ── Overview ──────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: cols((showForms ? 2 : 0) + (showPlans ? 2 : 0)), gap: 10 }}>
        {showForms && <Stat label="Forms sent" value={forms?.total ?? 0} hint={`${forms?.people ?? 0} ${a.people.toLowerCase()}`} />}
        {showForms && <Stat label="Forms signed" value={signed} hint={`${pct(signed, live)}% of forms sent`} color="#059669" />}
        {showPlans && <Stat label={isEmployee ? "Plans started" : "Treatment plans started"} value={plans?.total ?? 0} hint={`${plans?.people ?? 0} ${a.people.toLowerCase()}`} />}
        {showPlans && <Stat label={`${a.stepNoun}s done`} value={s.done} hint={`${pct(s.done, s.total)}% of ${s.total} planned`} color={PLANS_COLOR} />}
      </div>

      <div style={{ marginTop: 14 }}>
        <Panel title={range === "all" ? "Activity per day (last 30 days)" : "Activity per day"}>
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perDay} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "#f8fafc" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                {showForms && <Bar dataKey="signed" name="Forms signed" fill={FORMS_COLOR} radius={[4, 4, 0, 0]} maxBarSize={22} />}
                {showPlans && <Bar dataKey="sessions" name={`${a.stepNoun}s done`} fill={PLANS_COLOR} radius={[4, 4, 0, 0]} maxBarSize={22} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* ── Forms ─────────────────────────────────────────────────────── */}
      {showForms && forms && forms.total > 0 && (
        <>
          <SectionTitle icon={<FormOutlined />} color={FORMS_COLOR} title={formsHeading} />
          <div style={{ display: "grid", gridTemplateColumns: cols(3), gap: 10, marginBottom: 14 }}>
            <Stat label="Needs countersign" value={forms.by_status.awaiting_therapist ?? 0} color="#d97706" />
            <Stat label="Not signed yet" value={waiting} hint={forms.by_status.voided ? `${forms.by_status.voided} voided` : undefined} />
            <Stat
              label="Avg. time to sign"
              value={formatHours(forms.avg_hours_to_sign)}
              hint={`${forms.alerts} ${a.alertNoun}${forms.alerts === 1 ? "" : "s"}`}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 2fr", gap: 14 }}>
            <Panel title="Where forms are">
              {FORM_STATUSES.map((st) => (
                <Meter key={st} label={SUBMISSION_STATUS_META[st].label} value={forms.by_status[st] ?? 0} of={forms.total} color={SUBMISSION_STATUS_META[st].color} />
              ))}
              <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 12, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.subText }}>
                <span>📱 By link: <strong style={{ color: "#334155" }}>{forms.by_channel.link ?? 0}</strong></span>
                <span>🖥️ In store: <strong style={{ color: "#334155" }}>{forms.by_channel.in_store ?? 0}</strong></span>
              </div>
            </Panel>
            <Panel title="Most used forms">
              {forms.by_form.map((f) => (
                <Meter
                  key={f.template_id}
                  label={`${categoryOf(f.category).emoji}  ${f.name}`}
                  value={f.completed}
                  of={f.total}
                  color="#059669"
                  right={`${f.completed}/${f.total} signed${f.alerts ? ` · ${f.alerts} ⚠️` : ""}`}
                />
              ))}
            </Panel>
          </div>
        </>
      )}

      {/* ── Plans ─────────────────────────────────────────────────────── */}
      {showPlans && plans && plans.total > 0 && (
        <>
          <SectionTitle icon={<ScheduleOutlined />} color={PLANS_COLOR} title={plansLabel} />
          <div style={{ display: "grid", gridTemplateColumns: cols(4), gap: 10, marginBottom: 14 }}>
            <Stat label="Active" value={activePlans} color={PLANS_COLOR} />
            <Stat label="Completed" value={finished} hint={`${pct(finished, plans.total)}% of plans`} color="#059669" />
            <Stat label={`Overdue ${a.stepNoun.toLowerCase()}s`} value={s.overdue} hint="Planned date has passed" color={s.overdue ? "#dc2626" : undefined} />
            <Stat
              label="Avg. time to finish"
              value={plans.avg_days_to_finish == null ? "—" : `${plans.avg_days_to_finish} days`}
              hint={isEmployee ? undefined : `${plans.from_forms} started from a signed form`}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 2fr", gap: 14 }}>
            <Panel title={`${a.stepNoun}s`}>
              <Meter label="Done" value={s.done} of={s.total} color="#059669" />
              <Meter label="Still planned" value={s.total - s.done - s.skipped} of={s.total} color={PLANS_COLOR} />
              <Meter label="Skipped" value={s.skipped} of={s.total} color="#94a3b8" />
              <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 12, paddingTop: 10 }}>
                {PLAN_STATUSES.map((p) => (
                  <Meter key={p.key} label={`${p.label} plans`} value={plans.by_status[p.key] ?? 0} of={plans.total} color={p.color} />
                ))}
              </div>
            </Panel>
            <div style={{ display: "grid", gap: 14 }}>
              <Panel title={isEmployee ? "Most used plans" : "Most used treatment plans"}>
                {plans.by_plan.map((p) => (
                  <Meter
                    key={p.key}
                    label={`${categoryOf(p.category).emoji}  ${p.name}`}
                    value={p.completed}
                    of={p.total}
                    color="#059669"
                    right={`${p.completed}/${p.total} completed`}
                  />
                ))}
              </Panel>
              {plans.by_owner.length > 0 && (
                <Panel title={`By ${a.ownerLabel.toLowerCase()}`}>
                  {plans.by_owner.map((o) => (
                    <Meter key={o.name} label={o.name} value={o.active} of={o.plans} color={PLANS_COLOR} right={`${o.active} active · ${o.plans} total`} />
                  ))}
                </Panel>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HubAnalytics;
