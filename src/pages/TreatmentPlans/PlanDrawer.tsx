import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Drawer,
  Button,
  Input,
  Typography,
  Progress,
  Spin,
  Dropdown,
  Modal,
  DatePicker,
  Grid,
  Collapse,
  Empty,
  message,
} from "antd";
import {
  CheckOutlined,
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  StopOutlined,
  UndoOutlined,
  DeleteOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  UserOutlined,
  CheckCircleFilled,
  CloseCircleOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useAppSelector } from "src/store";
import { THEME_C } from "@utils/getPrimaryColor";
import { usePermissions } from "@hooks/usePermissions";
import {
  fetchTreatmentPlan,
  updateTreatmentPlan,
  addPlanSession,
  updatePlanSession,
  completePlanSession,
  deletePlanSession,
  planError,
} from "@services/treatmentPlans";
import { PLAN_STATUS_META, SESSION_STATUS_META, type PlanSession, type TreatmentPlan } from "./types";

const { Text } = Typography;
const C = THEME_C;

interface Props {
  planId: string | null;
  onClose: () => void;
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 6 }}>
    {children}
  </Text>
);

/** Text area that saves when it loses focus. */
const BlurField: React.FC<{
  value: string;
  disabled: boolean;
  placeholder: string;
  onSave: (v: string) => void;
  rows?: number;
}> = ({ value, disabled, placeholder, onSave, rows = 2 }) => {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <Input.TextArea
      value={v}
      disabled={disabled}
      placeholder={placeholder}
      autoSize={{ minRows: rows, maxRows: 8 }}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
    />
  );
};

const SessionEditModal: React.FC<{
  open: boolean;
  session: Partial<PlanSession> | null;
  onCancel: () => void;
  onSave: (input: { title: string; planned_date: string | null; service_name: string; next_step: string }) => Promise<void>;
}> = ({ open, session, onCancel, onSave }) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Dayjs | null>(null);
  const [service, setService] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setTitle(session?.title ?? "");
      setDate(session?.planned_date ? dayjs(session.planned_date) : null);
      setService(session?.service_name ?? "");
      setNextStep(session?.next_step ?? "");
    }
  }, [open, session]);
  return (
    <Modal
      open={open}
      title={session?._id ? "Edit session" : "Add session"}
      okText="Save"
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={async () => {
        if (!title.trim()) {
          message.warning("Name the session");
          return;
        }
        setSaving(true);
        try {
          await onSave({ title: title.trim(), planned_date: date ? date.hour(9).toISOString() : null, service_name: service, next_step: nextStep });
        } finally {
          setSaving(false);
        }
      }}
      destroyOnHidden
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <Label>Session</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Peel 2" autoFocus />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <Label>Date</Label>
            <DatePicker value={date} onChange={setDate} format="D MMM YYYY" style={{ width: "100%" }} />
          </div>
          <div>
            <Label>Treatment / service</Label>
            <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="e.g. Chemical peel" />
          </div>
        </div>
        <div>
          <Label>Plan for this session</Label>
          <Input.TextArea value={nextStep} onChange={(e) => setNextStep(e.target.value)} autoSize={{ minRows: 2 }} placeholder="Optional" />
        </div>
      </div>
    </Modal>
  );
};

const CompleteModal: React.FC<{
  open: boolean;
  session: PlanSession | null;
  onCancel: () => void;
  onSave: (input: { products_notes: string; next_step: string; signed_off_by: string; completed_at: string }) => Promise<void>;
}> = ({ open, session, onCancel, onSave }) => {
  const { user } = useAppSelector((s) => s.auth);
  const [notes, setNotes] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [signer, setSigner] = useState("");
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setNotes(session?.products_notes ?? "");
      setNextStep("");
      setSigner((user as { name?: string } | null)?.name ?? "");
      setDate(dayjs());
    }
  }, [open, session, user]);
  return (
    <Modal
      open={open}
      title={`Complete “${session?.title ?? ""}”`}
      okText="Mark done & sign off"
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={async () => {
        if (!signer.trim()) {
          message.warning("Enter the therapist's name");
          return;
        }
        setSaving(true);
        try {
          await onSave({ products_notes: notes, next_step: nextStep, signed_off_by: signer.trim(), completed_at: date.toISOString() });
        } finally {
          setSaving(false);
        }
      }}
      destroyOnHidden
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <Label>Products used &amp; notes</Label>
          <Input.TextArea value={notes} onChange={(e) => setNotes(e.target.value)} autoSize={{ minRows: 3 }} placeholder="e.g. Glycolic 30%, 3 minutes. Mild redness, settled after 10 min." autoFocus />
        </div>
        <div>
          <Label>Next step</Label>
          <Input.TextArea value={nextStep} onChange={(e) => setNextStep(e.target.value)} autoSize={{ minRows: 2 }} placeholder="e.g. Peel 2 in two weeks; SPF daily" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <Label>Done on</Label>
            <DatePicker value={date} onChange={(d) => d && setDate(d)} format="D MMM YYYY" style={{ width: "100%" }} allowClear={false} />
          </div>
          <div>
            <Label>Therapist sign-off</Label>
            <Input value={signer} onChange={(e) => setSigner(e.target.value)} prefix={<UserOutlined style={{ color: "#94a3b8" }} />} />
          </div>
        </div>
      </div>
    </Modal>
  );
};

const PlanDrawer: React.FC<Props> = ({ planId, onClose }) => {
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const wide = !!screens.md;
  const { can } = usePermissions();
  const [editing, setEditing] = useState<Partial<PlanSession> | null>(null);
  const [completing, setCompleting] = useState<PlanSession | null>(null);

  // Keep showing the last plan while the drawer animates closed
  const [shownId, setShownId] = useState(planId);
  useEffect(() => {
    if (planId) setShownId(planId);
  }, [planId]);

  const { data: plan, isLoading } = useQuery({
    queryKey: ["treatment-plan", shownId],
    queryFn: () => fetchTreatmentPlan(shownId as string),
    enabled: !!shownId,
  });

  const editable = !!plan && plan.status === "active" && can("TREATMENT_PLANS_MANAGE");

  const apply = (next: TreatmentPlan) => {
    queryClient.setQueryData(["treatment-plan", next._id], (old: TreatmentPlan | undefined) => ({ ...next, history: next.history ?? old?.history }));
    queryClient.invalidateQueries({ queryKey: ["treatment-plans"] });
  };

  const run = async (fn: () => Promise<TreatmentPlan>, success?: string) => {
    try {
      apply(await fn());
      if (success) message.success(success);
      return true;
    } catch (e) {
      const msg = planError(e, "Couldn't save");
      if (msg) message.error(msg);
      return false;
    }
  };

  const savePlan = (patch: Parameters<typeof updateTreatmentPlan>[1], success?: string) =>
    plan ? run(() => updateTreatmentPlan(plan._id, patch), success) : Promise.resolve(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const cancelPlan = () => {
    setCancelReason("");
    setCancelOpen(true);
  };
  const confirmCancel = async () => {
    if (!cancelReason.trim()) {
      message.warning("Give a reason");
      return;
    }
    setCancelling(true);
    const ok = await savePlan({ status: "cancelled", cancelled_reason: cancelReason.trim() }, "Plan cancelled");
    setCancelling(false);
    if (ok) setCancelOpen(false);
  };

  const sorted = [...(plan?.sessions ?? [])];
  const nextPlannedId = plan?.progress.next_session?._id;
  const pct = plan && plan.progress.total ? Math.round((plan.progress.done / plan.progress.total) * 100) : 0;
  const allDone = !!plan && plan.progress.total > 0 && plan.progress.done === plan.progress.total;

  const sessionMenu = (s: PlanSession) => [
    { key: "edit", icon: <EditOutlined />, label: "Edit" },
    ...(s.status === "planned" ? [{ key: "skip", icon: <StopOutlined />, label: "Skip" }] : []),
    ...(s.status !== "planned" ? [{ key: "undo", icon: <UndoOutlined />, label: s.status === "done" ? "Undo done" : "Un-skip" }] : []),
    ...(s.status !== "done" ? [{ type: "divider" as const }, { key: "delete", icon: <DeleteOutlined />, label: "Remove", danger: true }] : []),
  ];

  const onSessionMenu = (s: PlanSession, key: string) => {
    if (!plan) return;
    if (key === "edit") setEditing(s);
    if (key === "skip") run(() => updatePlanSession(plan._id, s._id, { status: "skipped" }));
    if (key === "undo") run(() => updatePlanSession(plan._id, s._id, { status: "planned" }));
    if (key === "delete")
      Modal.confirm({
        title: `Remove “${s.title}”?`,
        okText: "Remove",
        okButtonProps: { danger: true },
        onOk: () => run(() => deletePlanSession(plan._id, s._id)),
      });
  };

  const statusChip = (s: PlanSession) => {
    const m = SESSION_STATUS_META[s.status];
    return <span style={{ fontSize: 11, fontWeight: 600, color: m.color, background: m.bg, padding: "1px 8px", borderRadius: 999 }}>{m.label}</span>;
  };

  const rowActions = (s: PlanSession) =>
    editable ? (
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
        {s.status === "planned" && (
          <Button size="small" type={s._id === nextPlannedId ? "primary" : "default"} icon={<CheckOutlined />} onClick={() => setCompleting(s)}>
            Done
          </Button>
        )}
        <Dropdown trigger={["click"]} menu={{ items: sessionMenu(s), onClick: ({ key }) => onSessionMenu(s, key) }}>
          <Button size="small" type="text" icon={<MoreOutlined />} />
        </Dropdown>
      </div>
    ) : null;

  const muted = (s: PlanSession) => s.status === "skipped";

  return (
    <Drawer
      open={!!planId}
      onClose={onClose}
      width="min(820px, 100vw)"
      destroyOnHidden
      styles={{ body: { background: C.bg, padding: wide ? "18px 22px" : 12 } }}
      title={
        plan ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: PLAN_STATUS_META[plan.status].color, background: PLAN_STATUS_META[plan.status].bg, padding: "2px 9px", borderRadius: 999 }}>
              {PLAN_STATUS_META[plan.status].label}
            </span>
            <Text strong style={{ fontSize: 15 }} ellipsis>
              {plan.customer_snapshot.name}
            </Text>
          </div>
        ) : (
          "Treatment plan"
        )
      }
      extra={
        plan && can("TREATMENT_PLANS_MANAGE") ? (
          plan.status === "active" ? (
            <div style={{ display: "flex", gap: 8 }}>
              {wide && (
                <Button icon={<CloseCircleOutlined />} onClick={cancelPlan}>
                  Cancel plan
                </Button>
              )}
              <Button type={allDone ? "primary" : "default"} icon={<CheckCircleFilled />} onClick={() => savePlan({ status: "completed" }, "Plan completed")}>
                Complete plan
              </Button>
            </div>
          ) : (
            <Button icon={<UndoOutlined />} onClick={() => savePlan({ status: "active" }, "Plan reopened")}>
              Reopen
            </Button>
          )
        ) : null
      }
    >
      {isLoading || !plan ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* ── Summary ───────────────────────────────────────────────── */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16 }}>
            <Input
              variant="borderless"
              defaultValue={plan.title}
              key={plan.title}
              disabled={!editable}
              onBlur={(e) => e.target.value.trim() && e.target.value !== plan.title && savePlan({ title: e.target.value.trim() })}
              style={{ padding: 0, fontSize: 19, fontWeight: 650, color: "#0f172a" }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12.5, color: C.subText, margin: "4px 0 12px" }}>
              <span><CalendarOutlined /> Started {dayjs(plan.start_date).format("D MMM YYYY")}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <UserOutlined />
                <Input
                  size="small"
                  variant="borderless"
                  defaultValue={plan.therapist_name}
                  key={plan.therapist_name}
                  placeholder="Therapist"
                  disabled={!editable}
                  onBlur={(e) => e.target.value !== plan.therapist_name && savePlan({ therapist_name: e.target.value })}
                  style={{ padding: 0, width: 160, fontSize: 12.5 }}
                />
              </span>
              {plan.status === "cancelled" && plan.cancelled_reason && <span>Cancelled: {plan.cancelled_reason}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Progress percent={pct} showInfo={false} strokeColor={{ from: "#ec4899", to: "#8b5cf6" }} style={{ flex: 1, margin: 0 }} />
              <Text strong style={{ whiteSpace: "nowrap", fontSize: 13 }}>
                {plan.progress.done} of {plan.progress.total} done
              </Text>
            </div>
            {plan.progress.next_session && plan.status === "active" && (
              <Text style={{ fontSize: 12.5, color: C.subText }}>
                Next: <strong>{plan.progress.next_session.title}</strong>
                {plan.progress.next_session.planned_date ? ` · ${dayjs(plan.progress.next_session.planned_date).format("ddd D MMM")}` : ""}
              </Text>
            )}
          </div>

          {/* ── Precautions ───────────────────────────────────────────── */}
          {plan.precautions.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <MedicineBoxOutlined style={{ color: "#dc2626" }} />
                <Text strong style={{ color: "#b91c1c" }}>Precautions from the client's form</Text>
              </div>
              {plan.precautions.map((p, i) => (
                <div key={i} style={{ fontSize: 13, color: "#7f1d1d" }}>
                  {/[?:]\s*$/.test(p.question) ? p.question : `${p.question}:`} <strong>{p.answer}</strong>
                </div>
              ))}
            </div>
          )}

          {/* ── Goals ─────────────────────────────────────────────────── */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16 }}>
            <Label>Goals</Label>
            <BlurField value={plan.goals} disabled={!editable} placeholder="What this plan should achieve" onSave={(goals) => savePlan({ goals })} />
          </div>

          {/* ── Sessions (the treatment plan sheet) ───────────────────── */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: wide ? 16 : 12 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <Label>Sessions</Label>
              {editable && (
                <Button size="small" icon={<PlusOutlined />} onClick={() => setEditing({})} style={{ marginLeft: "auto" }}>
                  Add session
                </Button>
              )}
            </div>

            {sorted.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sessions yet" />
            ) : wide ? (
              <div style={{ border: "1px solid #eef2f7", borderRadius: 10, overflow: "hidden" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1.1fr 1.4fr 1.3fr 110px",
                    background: "#f8fafc",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    color: "#64748b",
                  }}
                >
                  {["Date", "Treatment", "Products & notes", "Next step / sign-off", ""].map((h) => (
                    <div key={h} style={{ padding: "8px 10px" }}>{h}</div>
                  ))}
                </div>
                {sorted.map((s) => (
                  <div
                    key={s._id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "120px 1.1fr 1.4fr 1.3fr 110px",
                      borderTop: "1px solid #eef2f7",
                      fontSize: 13,
                      background: s._id === nextPlannedId && plan.status === "active" ? "#faf5ff" : "#fff",
                      opacity: muted(s) ? 0.55 : 1,
                    }}
                  >
                    <div style={{ padding: "10px" }}>
                      <div style={{ fontWeight: 600 }}>
                        {s.status === "done" && s.completed_at
                          ? dayjs(s.completed_at).format("D MMM YYYY")
                          : s.planned_date
                            ? dayjs(s.planned_date).format("D MMM YYYY")
                            : "—"}
                      </div>
                      <div style={{ marginTop: 4 }}>{statusChip(s)}</div>
                    </div>
                    <div style={{ padding: "10px" }}>
                      <div style={{ fontWeight: 600, textDecoration: muted(s) ? "line-through" : "none" }}>{s.title}</div>
                      {s.service_name && <div style={{ color: C.subText, fontSize: 12 }}>{s.service_name}</div>}
                    </div>
                    <div style={{ padding: "10px", color: s.products_notes ? "#334155" : "#cbd5e1", whiteSpace: "pre-wrap" }}>
                      {s.products_notes || "—"}
                    </div>
                    <div style={{ padding: "10px" }}>
                      <div style={{ color: s.next_step ? "#334155" : "#cbd5e1", whiteSpace: "pre-wrap" }}>{s.next_step || "—"}</div>
                      {s.signed_off_by && (
                        <div style={{ fontSize: 11.5, color: "#059669", marginTop: 4 }}>
                          <CheckCircleFilled /> {s.signed_off_by}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "8px 8px" }}>{rowActions(s)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sorted.map((s) => (
                  <div
                    key={s._id}
                    style={{
                      border: `1px solid ${s._id === nextPlannedId ? "#ddd6fe" : "#eef2f7"}`,
                      borderRadius: 10,
                      padding: 10,
                      opacity: muted(s) ? 0.55 : 1,
                      background: s._id === nextPlannedId ? "#faf5ff" : "#fff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong style={{ display: "block" }}>{s.title}</Text>
                        <Text style={{ fontSize: 12, color: C.subText }}>
                          {(s.status === "done" && s.completed_at) || s.planned_date
                            ? dayjs((s.status === "done" && s.completed_at) || s.planned_date).format("D MMM YYYY")
                            : "No date"}
                          {s.service_name ? ` · ${s.service_name}` : ""}
                        </Text>
                      </div>
                      {statusChip(s)}
                    </div>
                    {(s.products_notes || s.next_step) && (
                      <div style={{ fontSize: 12.5, color: "#334155", marginTop: 6, whiteSpace: "pre-wrap" }}>
                        {s.products_notes && <div><strong>Products:</strong> {s.products_notes}</div>}
                        {s.next_step && <div><strong>Next:</strong> {s.next_step}</div>}
                      </div>
                    )}
                    {s.signed_off_by && (
                      <div style={{ fontSize: 11.5, color: "#059669", marginTop: 4 }}>
                        <CheckCircleFilled /> Signed off by {s.signed_off_by}
                      </div>
                    )}
                    {editable && <div style={{ marginTop: 8 }}>{rowActions(s)}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Home care ─────────────────────────────────────────────── */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16 }}>
            <Label>Home care</Label>
            <BlurField
              value={plan.home_care}
              disabled={!editable}
              placeholder="Aftercare and products for the client to use at home"
              onSave={(home_care) => savePlan({ home_care })}
              rows={3}
            />
          </div>

          {!wide && plan.status === "active" && can("TREATMENT_PLANS_MANAGE") && (
            <Button icon={<CloseCircleOutlined />} onClick={cancelPlan} danger>
              Cancel plan
            </Button>
          )}

          {(plan.history?.length ?? 0) > 0 && (
            <Collapse
              ghost
              items={[
                {
                  key: "h",
                  label: <Text style={{ color: C.subText, fontSize: 12.5 }}>History ({plan.history?.length})</Text>,
                  children: (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {[...(plan.history ?? [])].reverse().map((h, i) => (
                        <Text key={i} style={{ fontSize: 12, color: C.subText }}>
                          {dayjs(h.at).format("D MMM YYYY, HH:mm")} · {h.action.replace(/_/g, " ")}
                          {h.notes ? ` — ${h.notes}` : ""}
                          {h.by_name ? ` (${h.by_name})` : ""}
                        </Text>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>
      )}

      <Modal
        open={cancelOpen}
        title="Cancel this plan?"
        okText="Cancel plan"
        cancelText="Keep plan"
        okButtonProps={{ danger: true }}
        confirmLoading={cancelling}
        onOk={confirmCancel}
        onCancel={() => setCancelOpen(false)}
      >
        <Input.TextArea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          autoSize={{ minRows: 2 }}
          placeholder="Reason, e.g. client moved away"
        />
      </Modal>

      <SessionEditModal
        open={!!editing}
        session={editing}
        onCancel={() => setEditing(null)}
        onSave={async (input) => {
          if (!plan || !editing) return;
          const ok = await run(() => (editing._id ? updatePlanSession(plan._id, editing._id, input) : addPlanSession(plan._id, input)));
          if (ok) setEditing(null);
        }}
      />
      <CompleteModal
        open={!!completing}
        session={completing}
        onCancel={() => setCompleting(null)}
        onSave={async (input) => {
          if (!plan || !completing) return;
          const ok = await run(() => completePlanSession(plan._id, completing._id, input), "Session signed off");
          if (ok) setCompleting(null);
        }}
      />
    </Drawer>
  );
};

export default PlanDrawer;
