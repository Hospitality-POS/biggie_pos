import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Empty, Input, InputNumber, Modal, Select, Spin, Switch, Typography, message } from "antd";
import { PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, BulbOutlined } from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";
import { usePermissions } from "@hooks/usePermissions";
import { fetchPlanTemplates, savePlanTemplate, deletePlanTemplate, planError } from "@services/treatmentPlans";
import { CATEGORY_META, CATEGORY_OPTIONS } from "@pages/ClientForms/constants";
import type { FormCategory } from "@pages/ClientForms/types";
import type { PlanTemplate, TemplateSession } from "./types";

const { Text } = Typography;
const C = THEME_C;

type Draft = Omit<PlanTemplate, "_id"> & { _id?: string };

const emptyDraft = (): Draft => ({
  name: "",
  category: "facial",
  description: "",
  goals: "",
  sessions: [{ title: "Session 1", service_name: "", interval_days: 0, notes: "" }],
  home_care: "",
  active: true,
  triggers: { form_categories: [], answer_keywords: [] },
});

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 4 }}>{children}</Text>
);

const TemplateModal: React.FC<{ open: boolean; template: Draft | null; onClose: () => void; onSaved: () => void }> = ({
  open,
  template,
  onClose,
  onSaved,
}) => {
  const [d, setD] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setD(template ? JSON.parse(JSON.stringify(template)) : emptyDraft());
  }, [open, template]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  const setSession = (i: number, patch: Partial<TemplateSession>) =>
    set("sessions", d.sessions.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= d.sessions.length) return;
    const next = [...d.sessions];
    [next[i], next[j]] = [next[j], next[i]];
    set("sessions", next);
  };
  const totalDays = d.sessions.reduce((n, s, i) => n + (i === 0 ? 0 : s.interval_days || 0), 0);

  const save = async () => {
    if (!d.name.trim()) {
      message.warning("Name the template");
      return;
    }
    setSaving(true);
    try {
      await savePlanTemplate(d);
      message.success("Template saved");
      onSaved();
    } catch (e) {
      const msg = planError(e, "Couldn't save the template");
      if (msg) message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onCancel={onClose} onOk={save} confirmLoading={saving} okText="Save template" title={d._id ? "Edit plan template" : "New plan template"} width={680} destroyOnHidden>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12 }}>
          <div>
            <Label>Name</Label>
            <Input value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. 6-session acne peel course" autoFocus />
          </div>
          <div>
            <Label>Treatment</Label>
            <Select value={d.category} onChange={(v) => set("category", v)} options={CATEGORY_OPTIONS} style={{ width: "100%" }} />
          </div>
        </div>
        <div>
          <Label>Short description</Label>
          <Input value={d.description} onChange={(e) => set("description", e.target.value)} placeholder="Shown when picking a template" />
        </div>
        <div>
          <Label>Goals</Label>
          <Input.TextArea value={d.goals} onChange={(e) => set("goals", e.target.value)} autoSize={{ minRows: 2 }} />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
            <Label>Sessions</Label>
            <Text style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>
              {d.sessions.length} sessions over about {totalDays} days
            </Text>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {d.sessions.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1.4fr 1fr 120px auto", gap: 6, alignItems: "center" }}>
                <Text style={{ color: "#94a3b8", textAlign: "center" }}>{i + 1}</Text>
                <Input size="small" value={s.title} onChange={(e) => setSession(i, { title: e.target.value })} placeholder="Session name" />
                <Input size="small" value={s.service_name} onChange={(e) => setSession(i, { service_name: e.target.value })} placeholder="Service (optional)" />
                {i === 0 ? (
                  <Text style={{ fontSize: 12, color: "#94a3b8" }}>Start date</Text>
                ) : (
                  <InputNumber
                    size="small"
                    min={0}
                    max={365}
                    value={s.interval_days}
                    onChange={(v) => setSession(i, { interval_days: v ?? 0 })}
                    addonAfter="days later"
                    style={{ width: "100%" }}
                  />
                )}
                <div style={{ display: "flex" }}>
                  <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={i === 0} onClick={() => move(i, -1)} />
                  <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={i === d.sessions.length - 1} onClick={() => move(i, 1)} />
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} disabled={d.sessions.length === 1} onClick={() => set("sessions", d.sessions.filter((_, j) => j !== i))} />
                </div>
              </div>
            ))}
          </div>
          <Button
            size="small"
            type="dashed"
            icon={<PlusOutlined />}
            style={{ marginTop: 8 }}
            onClick={() => set("sessions", [...d.sessions, { title: `Session ${d.sessions.length + 1}`, service_name: "", interval_days: 14, notes: "" }])}
          >
            Add session
          </Button>
        </div>

        <div>
          <Label>Home care</Label>
          <Input.TextArea value={d.home_care} onChange={(e) => set("home_care", e.target.value)} autoSize={{ minRows: 2 }} placeholder="Aftercare the client follows between sessions" />
        </div>

        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: 12 }}>
          <Text strong style={{ fontSize: 13, display: "block", marginBottom: 2 }}>
            <BulbOutlined style={{ color: "#d97706" }} /> Suggest this plan when…
          </Text>
          <Text style={{ fontSize: 12, color: "#92400e", display: "block", marginBottom: 8 }}>
            After a client signs a form, matching templates are offered first when starting their plan.
          </Text>
          <div style={{ display: "grid", gap: 8 }}>
            <Select
              mode="multiple"
              value={d.triggers.form_categories}
              onChange={(v) => set("triggers", { ...d.triggers, form_categories: v })}
              options={CATEGORY_OPTIONS}
              placeholder="…the signed form is for one of these treatments"
              style={{ width: "100%" }}
            />
            <Select
              mode="tags"
              value={d.triggers.answer_keywords}
              onChange={(v) => set("triggers", { ...d.triggers, answer_keywords: v })}
              placeholder="…or an answer mentions a word (type and press Enter, e.g. acne)"
              style={{ width: "100%" }}
              tokenSeparators={[","]}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Switch size="small" checked={d.active} onChange={(v) => set("active", v)} />
          <Text style={{ fontSize: 13 }}>Available when starting new plans</Text>
        </div>
      </div>
    </Modal>
  );
};

const PlanTemplates: React.FC = () => {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can("TREATMENT_PLAN_TEMPLATES_MANAGE");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({ queryKey: ["plan-templates", "all"], queryFn: () => fetchPlanTemplates(false) });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["plan-templates"] });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 8 }}>
        <Text style={{ color: C.subText, fontSize: 13, flex: 1 }}>
          Reusable treatment courses. Starting a plan from one copies its sessions and spaces the dates for you.
        </Text>
        {canManage && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            New template
          </Button>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <Spin />
        </div>
      ) : templates.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No plan templates yet — create one for each course you offer" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {templates.map((t) => {
            const cat = CATEGORY_META[t.category as FormCategory] ?? CATEGORY_META.other;
            return (
              <div key={t._id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, opacity: t.active ? 1 : 0.6, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>{cat.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ display: "block" }} ellipsis>{t.name}</Text>
                    <Text style={{ fontSize: 12, color: C.subText }}>
                      {t.sessions.length} session{t.sessions.length === 1 ? "" : "s"}
                      {t.active ? "" : " · hidden"}
                    </Text>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {t.sessions.slice(0, 4).map((s, i) => (
                    <span key={i} style={{ fontSize: 11.5, background: "#f1f5f9", color: "#475569", padding: "1px 8px", borderRadius: 999 }}>
                      {s.title}
                    </span>
                  ))}
                  {t.sessions.length > 4 && <span style={{ fontSize: 11.5, color: "#94a3b8" }}>+{t.sessions.length - 4}</span>}
                </div>
                {(t.triggers.form_categories.length > 0 || t.triggers.answer_keywords.length > 0) && (
                  <Text style={{ fontSize: 11.5, color: "#b45309" }}>
                    <BulbOutlined /> Suggested for{" "}
                    {[...t.triggers.form_categories.map((c) => CATEGORY_META[c as FormCategory]?.label ?? c), ...t.triggers.answer_keywords.map((k) => `“${k}”`)].join(", ")}
                  </Text>
                )}
                {canManage && (
                  <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                    <Button
                      size="small"
                      onClick={() => {
                        setEditing(t);
                        setModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() =>
                        Modal.confirm({
                          title: `Delete “${t.name}”?`,
                          content: "Plans already started from it keep their sessions.",
                          okText: "Delete",
                          okButtonProps: { danger: true },
                          onOk: async () => {
                            try {
                              await deletePlanTemplate(t._id);
                              refresh();
                            } catch (e) {
                              const msg = planError(e, "Couldn't delete");
                              if (msg) message.error(msg);
                            }
                          },
                        })
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TemplateModal
        open={modalOpen}
        template={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          refresh();
        }}
      />
    </div>
  );
};

export default PlanTemplates;
