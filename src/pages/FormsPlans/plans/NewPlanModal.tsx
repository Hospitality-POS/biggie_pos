import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, Input, DatePicker, Typography, Spin, message } from "antd";
import { BulbOutlined, FileAddOutlined, CheckCircleFilled } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { THEME_C } from "@utils/getPrimaryColor";
import { fetchPlanTemplates, fetchPlanSuggestions, createPlan, planError } from "@services/plans";
import PersonPicker from "@pages/FormsPlans/forms/components/PersonPicker";
import { personName, type PersonLite } from "@pages/FormsPlans/forms/person";
import { useAudience } from "@pages/FormsPlans/audience";
import { CATEGORY_META } from "@pages/FormsPlans/forms/constants";
import type { FormCategory } from "@pages/FormsPlans/forms/types";
import type { TreatmentPlan } from "./types";

const { Text } = Typography;
const C = THEME_C;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Preselected customer / employee (from their profile or a signed form) */
  person?: PersonLite | null;
  /** Signed form the plan starts from — enables suggestions and copies precautions */
  submissionId?: string | null;
  onCreated: (plan: TreatmentPlan) => void;
}

const BLANK = "__blank";
const emoji = (category: string) => CATEGORY_META[category as FormCategory]?.emoji ?? "📋";

const Choice: React.FC<{
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}> = ({ active, onClick, title, sub, icon, badge }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    style={{
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      textAlign: "left",
      padding: "10px 12px",
      borderRadius: 10,
      border: `1.5px solid ${active ? C.primary : "#e2e8f0"}`,
      background: active ? C.primaryLight : "#fff",
      cursor: "pointer",
      width: "100%",
    }}
  >
    <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
    <span style={{ flex: 1, minWidth: 0 }}>
      <span style={{ display: "block", fontWeight: 600, color: "#0f172a", fontSize: 13.5 }}>{title}</span>
      <span style={{ display: "block", fontSize: 12, color: C.subText }}>{sub}</span>
      {badge}
    </span>
    {active && <CheckCircleFilled style={{ color: C.primary, marginTop: 2 }} />}
  </button>
);

const NewPlanModal: React.FC<Props> = ({ open, onClose, person, submissionId, onCreated }) => {
  const a = useAudience();
  const isEmployee = a.audience === "employee";
  const [picked, setPicked] = useState<PersonLite | null>(person ?? null);
  const [choice, setChoice] = useState<string>(BLANK);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState<Dayjs>(dayjs());
  const [saving, setSaving] = useState(false);

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["plan-templates", a.audience, "active"],
    queryFn: () => fetchPlanTemplates(a.audience, true),
    enabled: open,
  });
  const { data: suggestions = [], isLoading: loadingSuggestions } = useQuery({
    queryKey: ["plan-suggestions", submissionId],
    queryFn: () => fetchPlanSuggestions(submissionId as string, a.audience),
    enabled: open && !!submissionId,
  });

  useEffect(() => {
    if (open) {
      setPicked(person ?? null);
      setChoice(BLANK);
      setTitle("");
      setStart(dayjs());
    }
  }, [open, person]);

  // Preselect the best suggestion once it arrives
  useEffect(() => {
    if (open && suggestions.length) setChoice((c) => (c === BLANK ? suggestions[0]._id : c));
  }, [open, suggestions]);

  const suggestedIds = new Set(suggestions.map((s) => s._id));
  const others = templates.filter((t) => !suggestedIds.has(t._id));

  const create = async () => {
    if (!picked) {
      message.warning(isEmployee ? "Choose an employee" : "Choose a customer");
      return;
    }
    setSaving(true);
    try {
      const plan = await createPlan(a.audience, {
        person_id: picked._id,
        template_id: choice === BLANK ? undefined : choice,
        submission_id: submissionId ?? undefined,
        title: choice === BLANK ? title.trim() || undefined : undefined,
        start_date: start.toISOString(),
      });
      message.success(isEmployee ? "Plan started" : "Treatment plan started");
      onCreated(plan);
    } catch (e) {
      const msg = planError(e, "Couldn't start the plan");
      if (msg) message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onCancel={onClose} onOk={create} okText="Start plan" confirmLoading={saving} title={isEmployee ? "New onboarding / training plan" : "New treatment plan"} width={600} destroyOnHidden>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
          <div>
            <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 4 }}>{a.pickerLabel}</Text>
            {person ? (
              <Input value={personName(person)} disabled />
            ) : (
              <PersonPicker value={picked} onChange={setPicked} />
            )}
          </div>
          <div>
            <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 4 }}>First {a.stepNoun.toLowerCase()}</Text>
            <DatePicker value={start} onChange={(d) => d && setStart(d)} format="D MMM YYYY" allowClear={false} style={{ width: "100%" }} />
          </div>
        </div>

        {submissionId && (
          <div>
            <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 6 }}>
              <BulbOutlined style={{ color: "#f59e0b" }} /> Suggested from the {a.person.toLowerCase()}'s signed form
            </Text>
            {loadingSuggestions ? (
              <Spin size="small" />
            ) : suggestions.length === 0 ? (
              <Text style={{ fontSize: 12.5, color: "#94a3b8" }}>No template matches this form. Pick one below or start blank.</Text>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {suggestions.map((s) => (
                  <Choice
                    key={s._id}
                    active={choice === s._id}
                    onClick={() => setChoice(s._id)}
                    icon={emoji(s.category)}
                    title={s.name}
                    sub={`${s.sessions} ${a.stepNoun.toLowerCase()}${s.sessions === 1 ? "" : "s"}`}
                    badge={<span style={{ display: "block", fontSize: 11.5, color: "#b45309", marginTop: 2 }}>{s.reasons.join(" · ")}</span>}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 6 }}>
            {submissionId ? "Other templates" : "Start from"}
          </Text>
          {loadingTemplates ? (
            <Spin size="small" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8, maxHeight: 280, overflowY: "auto" }}>
              <Choice active={choice === BLANK} onClick={() => setChoice(BLANK)} icon={<FileAddOutlined style={{ color: C.primary }} />} title="Blank plan" sub={`Add ${a.stepNoun.toLowerCase()}s yourself`} />
              {others.map((t) => (
                <Choice
                  key={t._id}
                  active={choice === t._id}
                  onClick={() => setChoice(t._id)}
                  icon={emoji(t.category)}
                  title={t.name}
                  sub={`${t.sessions.length} ${a.stepNoun.toLowerCase()}${t.sessions.length === 1 ? "" : "s"}${t.description ? ` · ${t.description}` : ""}`}
                />
              ))}
            </div>
          )}
        </div>

        {choice === BLANK && (
          <div>
            <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 4 }}>Plan name</Text>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pigmentation programme" maxLength={200} />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default NewPlanModal;
