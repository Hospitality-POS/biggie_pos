import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Input,
  Typography,
  Grid,
  Spin,
  Tabs,
  Segmented,
  Modal,
  Switch,
  Popover,
  Tooltip,
  Dropdown,
  message,
  Result,
} from "antd";
import {
  ArrowLeftOutlined,
  SendOutlined,
  CheckOutlined,
  RollbackOutlined,
  UndoOutlined,
  BranchesOutlined,
  CopyOutlined,
  InboxOutlined,
  DeleteOutlined,
  ReloadOutlined,
  PlusOutlined,
  MoreOutlined,
  CloudSyncOutlined,
  CheckCircleFilled,
  EyeOutlined,
  FileImageOutlined,
  HistoryOutlined,
  EditOutlined,
  MedicineBoxOutlined,
  EyeInvisibleOutlined,
  RobotOutlined,
  CloseOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { THEME_C } from "@utils/getPrimaryColor";
import { usePermissions } from "@hooks/usePermissions";
import {
  fetchFormTemplate,
  fetchFormVersions,
  updateFormTemplate,
  submitForm,
  withdrawForm,
  rejectForm,
  approveForm,
  newFormVersion,
  duplicateForm,
  archiveForm,
  restoreForm,
  deleteForm,
  reExtractForm,
  apiErrorMessage,
} from "@services/formTemplates";
import { AudienceContext, audienceConfig, audienceFromPath } from "../audience";
import SectionEditor, { AddFieldPicker } from "./components/SectionEditor";
import FormRenderer from "./components/FormRenderer";
import { SourcePanel, HistoryPanel, ExtractingState, ExtractionFailed } from "./components/SidePanels";
import StartFormModal from "./fill/StartFormModal";
import { STATUS_META, newField, newSectionKey } from "./constants";
import type { EditableForm, FormSection, FormSigner, FormTemplate, SignerRole } from "./types";
import { CategorySelect } from "./categories";

const { Text } = Typography;
const C = THEME_C;

const AUTOSAVE_MS = 1000;

type SaveState = "idle" | "saving" | "saved" | "error";

const toEditable = (f: FormTemplate): EditableForm => ({
  name: f.name,
  description: f.description,
  category: f.category,
  sections: f.sections,
  signers: f.signers,
  declaration: f.declaration,
});

const Stat: React.FC<{ icon: React.ReactNode; value: number | string; label: string; color: string }> = ({ icon, value, label, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
    <span style={{ color, fontSize: 15, display: "inline-flex" }}>{icon}</span>
    <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{value}</span>
    <span style={{ fontSize: 12, color: C.subText, whiteSpace: "nowrap" }}>{label}</span>
  </div>
);

const FormBuilderPage: React.FC = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const twoColumn = !!screens.xl;
  const { can } = usePermissions();
  const location = useLocation();
  // /hr/forms/builder/:id is an employee form; the loaded form has the final say
  const pathAudience = audienceFromPath(location.pathname);

  const [draft, setDraft] = useState<EditableForm | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [busy, setBusy] = useState<string | null>(null);
  const [panel, setPanel] = useState<string>("preview");
  const [mobileView, setMobileView] = useState<string>("edit");
  const [reviewModal, setReviewModal] = useState<null | "approve" | "reject" | "submit">(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [hideAiBanner, setHideAiBanner] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const dirtyRef = useRef(false);
  const draftRef = useRef<EditableForm | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const savingRef = useRef<Promise<void> | null>(null);
  const lastExtraction = useRef<string | undefined>();

  const { data: form, isLoading, isError } = useQuery({
    queryKey: ["form-template", id],
    queryFn: () => fetchFormTemplate(id, pathAudience),
    enabled: !!id,
    refetchInterval: (f) => (f?.extraction?.status === "processing" ? 3000 : false),
    refetchOnWindowFocus: false,
  });

  const a = audienceConfig(form?.audience ?? pathAudience);
  const aud = a.audience;

  // Opening another version reuses this page — start from a clean editor
  useEffect(() => {
    draftRef.current = null;
    dirtyRef.current = false;
    lastExtraction.current = undefined;
    setDraft(null);
    setSaveState("idle");
    setHideAiBanner(false);
  }, [id]);

  // Load the server copy into the editor on first load and whenever the AI
  // finishes reading — but never over unsaved edits.
  useEffect(() => {
    if (!form) return;
    const ext = form.extraction?.status;
    const finishedReading = lastExtraction.current === "processing" && ext !== "processing";
    lastExtraction.current = ext;
    if (!draftRef.current || (finishedReading && !dirtyRef.current)) {
      const next = toEditable(form);
      draftRef.current = next;
      setDraft(next);
    }
  }, [form]);

  const status = form?.status ?? "draft";
  const reading = form?.extraction?.status === "processing";
  const editable = status === "draft" && !reading && can(a.perms.update);

  // ── Saving ────────────────────────────────────────────────────────────────
  const doSave = useCallback(async () => {
    if (!dirtyRef.current || !draftRef.current) return;
    const snapshot = draftRef.current;
    dirtyRef.current = false;
    setSaveState("saving");
    try {
      const saved = await updateFormTemplate(id, snapshot, aud);
      // Keep the cached copy current without replacing what is on screen
      queryClient.setQueryData(["form-template", id], saved);
      setSaveState(dirtyRef.current ? "saving" : "saved");
    } catch (error) {
      dirtyRef.current = true;
      setSaveState("error");
      const msg = apiErrorMessage(error, "Couldn’t save your changes");
      if (msg) message.error(msg);
    }
  }, [id, queryClient, aud]);

  const flushSave = useCallback(async () => {
    clearTimeout(saveTimer.current);
    if (savingRef.current) await savingRef.current;
    if (dirtyRef.current) {
      savingRef.current = doSave();
      await savingRef.current;
      savingRef.current = null;
    }
  }, [doSave]);

  const update = useCallback(
    (patch: Partial<EditableForm>) => {
      if (!draftRef.current) return;
      const next = { ...draftRef.current, ...patch };
      draftRef.current = next;
      setDraft(next);
      dirtyRef.current = true;
      setSaveState("saving");
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flushSave();
      }, AUTOSAVE_MS);
    },
    [flushSave]
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      clearTimeout(saveTimer.current);
    };
  }, []);

  // ── Workflow actions ──────────────────────────────────────────────────────
  const applyServer = (next: FormTemplate) => {
    queryClient.setQueryData(["form-template", next._id], next);
    queryClient.invalidateQueries({ queryKey: ["form-templates"] });
    const editableCopy = toEditable(next);
    draftRef.current = editableCopy;
    setDraft(editableCopy);
  };

  const run = async (key: string, fn: () => Promise<FormTemplate | void>, success: string) => {
    setBusy(key);
    try {
      await flushSave();
      const result = await fn();
      if (result) {
        if (result._id !== id) {
          queryClient.invalidateQueries({ queryKey: ["form-templates"] });
          navigate(a.builderPath(result._id));
        } else {
          applyServer(result);
        }
      }
      message.success(success);
      return true;
    } catch (error) {
      const msg = apiErrorMessage(error, "Something went wrong");
      if (msg) message.error(msg);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const confirmReview = async () => {
    const notes = reviewNotes.trim();
    if (reviewModal === "reject" && !notes) {
      message.warning("Tell the author what to change");
      return;
    }
    const ok =
      reviewModal === "approve"
        ? await run("approve", () => approveForm(id, notes, aud), `Form approved — it’s ready for ${a.people.toLowerCase()}`)
        : reviewModal === "reject"
          ? await run("reject", () => rejectForm(id, notes, aud), "Sent back to draft with your notes")
          : await run("submit", () => submitForm(id, notes, aud), "Sent for approval");
    if (ok) {
      setReviewModal(null);
      setReviewNotes("");
    }
  };

  const confirmDelete = () =>
    Modal.confirm({
      title: "Delete this draft?",
      content: "The draft and its uploaded files are removed. This can’t be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteForm(id, aud);
          queryClient.invalidateQueries({ queryKey: ["form-templates"] });
          message.success("Draft deleted");
          navigate(a.hubPath("forms"));
        } catch (error) {
          const msg = apiErrorMessage(error, "Couldn’t delete the draft");
          if (msg) message.error(msg);
        }
      },
    });

  // ── Versions popover ──────────────────────────────────────────────────────
  const [versionsOpen, setVersionsOpen] = useState(false);
  const { data: versions } = useQuery({
    queryKey: ["form-template-versions", id],
    queryFn: () => fetchFormVersions(id, aud),
    enabled: versionsOpen,
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const sections = draft?.sections ?? [];
    let total = 0;
    let shown = 0;
    let hiddenItems = 0;
    let alerts = 0;
    for (const s of sections) {
      if (!s.enabled) hiddenItems++;
      for (const f of s.fields) {
        total++;
        if (f.enabled && s.enabled) shown++;
        if (!f.enabled) hiddenItems++;
        hiddenItems += f.options.filter((o) => !o.enabled).length;
        // Only questions people actually see can raise alerts
        if (!f.enabled || !s.enabled) continue;
        if (f.alert_on_yes) alerts++;
        alerts += f.options.filter((o) => o.is_alert && o.enabled).length;
      }
    }
    return { total, shown, hiddenItems, alerts };
  }, [draft]);

  if (isLoading || (!draft && !isError)) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }
  if (isError || !form || !draft) {
    return (
      <Result
        status="404"
        title="Form not found"
        extra={<Button onClick={() => navigate(a.hubPath("forms"))}>Back to {a.title}</Button>}
      />
    );
  }

  const statusMeta = STATUS_META[status];
  const fieldOffsets = draft.sections.reduce<number[]>((acc, _s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + draft.sections[i - 1].fields.length);
    return acc;
  }, []);

  const setSections = (sections: FormSection[]) => update({ sections });
  const moveSection = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.sections.length) return;
    const next = [...draft.sections];
    [next[i], next[j]] = [next[j], next[i]];
    setSections(next);
  };

  const signerOn = (role: SignerRole) => draft.signers.some((s) => s.role === role);
  const toggleSigner = (role: SignerRole, label: string, on: boolean) =>
    update({
      signers: on
        ? [...draft.signers, { role, label, required: true }]
        : draft.signers.filter((s) => s.role !== role),
    });
  const setSigner = (role: SignerRole, patch: Partial<FormSigner>) =>
    update({ signers: draft.signers.map((s) => (s.role === role ? { ...s, ...patch } : s)) });

  // ── Action buttons per status ─────────────────────────────────────────────
  const primaryAction = (() => {
    if (reading) return null;
    if (status === "draft" && can(a.perms.update))
      return (
        <Button type="primary" icon={<SendOutlined />} loading={busy === "submit"} onClick={() => setReviewModal("submit")} style={{ background: C.primary }}>
          {isMobile ? "Submit" : "Send for approval"}
        </Button>
      );
    if (status === "pending_approval" && can(a.perms.approve))
      return (
        <div style={{ display: "flex", gap: 8 }}>
          <Button icon={<RollbackOutlined />} onClick={() => setReviewModal("reject")} loading={busy === "reject"}>
            {isMobile ? "" : "Send back"}
          </Button>
          <Button type="primary" icon={<CheckOutlined />} onClick={() => setReviewModal("approve")} loading={busy === "approve"}>
            Approve
          </Button>
        </div>
      );
    if (status === "pending_approval" && can(a.perms.update))
      return (
        <Button icon={<UndoOutlined />} loading={busy === "withdraw"} onClick={() => run("withdraw", () => withdrawForm(id, aud), "Withdrawn — you can edit again")}>
          Withdraw to edit
        </Button>
      );
    if (status === "approved")
      return (
        <div style={{ display: "flex", gap: 8 }}>
          {can(a.perms.update) && (
            <Button icon={<BranchesOutlined />} loading={busy === "version"} onClick={() => run("version", () => newFormVersion(id, aud), "New draft version created")}>
              {isMobile ? "" : "Edit as new version"}
            </Button>
          )}
          {can(a.perms.send) && (
            <Button type="primary" icon={<SendOutlined />} onClick={() => setSendOpen(true)}>
              {isMobile ? "Send" : `Send to ${a.person.toLowerCase()}`}
            </Button>
          )}
        </div>
      );
    if (status === "archived" && can(a.perms.approve))
      return (
        <Button icon={<UndoOutlined />} loading={busy === "restore"} onClick={() => run("restore", () => restoreForm(id, aud), "Restored — this version is live again")}>
          Restore
        </Button>
      );
    return null;
  })();

  const moreItems = [
    ...(status === "draft" && form.source_files.length > 0 && can(a.perms.update) && !reading
      ? [{ key: "reextract", icon: <ReloadOutlined />, label: "Read the uploaded form again" }]
      : []),
    ...(can(a.perms.create) ? [{ key: "duplicate", icon: <CopyOutlined />, label: "Duplicate as a new form" }] : []),
    ...(status === "approved" && can(a.perms.update) ? [{ key: "archive", icon: <InboxOutlined />, label: "Archive (stop using)" }] : []),
    ...(status === "archived" && can(a.perms.update) ? [{ key: "version", icon: <BranchesOutlined />, label: "Edit as new version" }] : []),
    ...(status === "draft" && can(a.perms.delete) ? [{ type: "divider" as const }, { key: "delete", icon: <DeleteOutlined />, label: "Delete draft", danger: true }] : []),
  ];

  const onMore = ({ key }: { key: string }) => {
    if (key === "reextract")
      Modal.confirm({
        title: "Read the form again?",
        content: "The AI reads your uploaded files again and replaces the current questions, including any changes you made.",
        okText: "Read again",
        onOk: () => run("reextract", () => reExtractForm(id, aud), "Reading the form again…").then(() => setHideAiBanner(false)),
      });
    else if (key === "duplicate") run("duplicate", () => duplicateForm(id, aud), "Copied into a new draft");
    else if (key === "archive")
      Modal.confirm({
        title: "Archive this form?",
        content: `${a.people} won’t be asked to fill it any more. Signed copies stay on file, and you can restore it later.`,
        okText: "Archive",
        onOk: () => run("archive", () => archiveForm(id, aud), "Form archived"),
      });
    else if (key === "version") run("version", () => newFormVersion(id, aud), "New draft version created");
    else if (key === "delete") confirmDelete();
  };

  // ── Panels ────────────────────────────────────────────────────────────────
  const previewPanel = (
    <FormRenderer
      name={draft.name}
      description={draft.description}
      sections={draft.sections}
      signers={draft.signers}
      declaration={draft.declaration}
      compact
    />
  );
  const sourcePanel = <SourcePanel files={form.source_files} />;
  const historyPanel = <HistoryPanel history={form.review_history} />;

  const editorColumn = reading ? (
    <ExtractingState startedAt={form.extraction.started_at} fileCount={form.source_files.length} />
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {status === "draft" && form.review_notes && (
        <div style={{ display: "flex", gap: 12, padding: "12px 16px", borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <RollbackOutlined style={{ color: "#ea580c", fontSize: 16, marginTop: 3 }} />
          <div>
            <Text strong style={{ color: "#9a3412", display: "block" }}>Sent back for changes</Text>
            <Text style={{ fontSize: 13, color: "#7c2d12" }}>{form.review_notes}</Text>
          </div>
        </div>
      )}

      {status === "pending_approval" && (
        <div style={{ display: "flex", gap: 12, padding: "12px 16px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a" }}>
          <SendOutlined style={{ color: "#d97706", fontSize: 16, marginTop: 3 }} />
          <Text style={{ fontSize: 13, color: "#92400e" }}>
            {can(a.perms.approve)
              ? `Check each section and the preview. Approve it to make it available to ${a.people.toLowerCase()}, or send it back with notes.`
              : "This form is waiting for a manager to approve it. Withdraw it if you need to make more changes."}
          </Text>
        </div>
      )}

      {status === "approved" && (
        <div style={{ display: "flex", gap: 12, padding: "12px 16px", borderRadius: 12, background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
          <CheckCircleFilled style={{ color: "#059669", fontSize: 16, marginTop: 3 }} />
          <Text style={{ fontSize: 13, color: "#065f46" }}>
            Approved{form.approved_by_name ? ` by ${form.approved_by_name}` : ""}
            {form.approved_at ? ` on ${dayjs(form.approved_at).format("D MMM YYYY")}` : ""}. To change it, edit it as a new
            version — {a.people.toLowerCase()} keep using this one until the new version is approved.
          </Text>
        </div>
      )}

      {form.extraction.status === "failed" && status === "draft" && (
        <ExtractionFailed
          error={form.extraction.error}
          retrying={busy === "reextract"}
          canRetry={form.source_files.length > 0 && can(a.perms.update)}
          onRetry={() => run("reextract", () => reExtractForm(id, aud), "Reading the form again…")}
        />
      )}

      {editable && !hideAiBanner && form.extraction.status === "done" && (form.extraction.crossed_out_count ?? 0) > 0 && (
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderRadius: 12, background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
          <RobotOutlined style={{ color: "#7c3aed", fontSize: 16, marginTop: 3 }} />
          <Text style={{ fontSize: 13, color: "#4c1d95", flex: 1 }}>
            The AI hid <strong>{form.extraction.crossed_out_count}</strong> item
            {form.extraction.crossed_out_count === 1 ? "" : "s"} it saw crossed out on your paper form. They’re marked{" "}
            <EyeInvisibleOutlined /> Hidden below — switch any back on if it got one wrong.
          </Text>
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setHideAiBanner(true)} />
        </div>
      )}

      {/* Stats strip */}
      <div
        style={{
          display: "flex",
          gap: isMobile ? 14 : 24,
          flexWrap: "wrap",
          padding: "10px 16px",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
        }}
      >
        <Stat icon={<EyeOutlined />} value={`${stats.shown}/${stats.total}`} label="questions shown" color="#16a34a" />
        <Stat icon={<EyeInvisibleOutlined />} value={stats.hiddenItems} label="items hidden" color="#94a3b8" />
        <Stat icon={<MedicineBoxOutlined />} value={stats.alerts} label={a.alertsLabel.toLowerCase()} color="#dc2626" />
      </div>

      {/* Details */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 }}>
        <Text style={{ fontSize: 11.5, color: C.subText, display: "block", marginBottom: 4 }}>Short description (shown under the title)</Text>
        <Input.TextArea
          value={draft.description}
          disabled={!editable}
          onChange={(e) => update({ description: e.target.value })}
          autoSize={{ minRows: 1, maxRows: 3 }}
          placeholder="e.g. Please complete before your first facial"
        />
      </div>

      {draft.sections.map((s, i) => (
        <SectionEditor
          key={s.key}
          section={s}
          number={i + 1}
          fieldOffset={fieldOffsets[i]}
          readOnly={!editable}
          isFirst={i === 0}
          isLast={i === draft.sections.length - 1}
          onChange={(next) => setSections(draft.sections.map((x, j) => (j === i ? next : x)))}
          onDelete={() =>
            Modal.confirm({
              title: `Delete “${s.title || "this section"}”?`,
              content: `Its ${s.fields.length} question${s.fields.length === 1 ? "" : "s"} will be removed. To keep them for later, hide the section instead.`,
              okText: "Delete",
              okButtonProps: { danger: true },
              onOk: () => setSections(draft.sections.filter((_, j) => j !== i)),
            })
          }
          onMove={(dir) => moveSection(i, dir)}
        />
      ))}

      {editable && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setSections([...draft.sections, { key: newSectionKey(), title: "New section", description: "", enabled: true, fields: [] }])}
          >
            Add section
          </Button>
          {draft.sections.length === 0 && (
            <AddFieldPicker
              onPick={(type) =>
                setSections([{ key: newSectionKey(), title: "Questions", description: "", enabled: true, fields: [newField(type)] }])
              }
            >
              <Button type="dashed" icon={<PlusOutlined />}>Add first question</Button>
            </AddFieldPicker>
          )}
        </div>
      )}

      {/* Signatures */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <EditOutlined style={{ color: C.primary }} />
          <Text strong style={{ fontSize: 15 }}>Signing</Text>
        </div>
        <Text style={{ fontSize: 11.5, color: C.subText, display: "block", marginBottom: 4 }}>
          Declaration the {a.person.toLowerCase()} agrees to by signing
        </Text>
        <Input.TextArea
          value={draft.declaration}
          disabled={!editable}
          onChange={(e) => update({ declaration: e.target.value })}
          autoSize={{ minRows: 2, maxRows: 6 }}
          placeholder={
            aud === "employee"
              ? "I confirm I have read and understood this document and agree to its terms."
              : "I confirm the information above is true and I consent to the treatment."
          }
          style={{ marginBottom: 14 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(["client", "therapist", "witness"] as SignerRole[]).map((role) => {
            const defaultLabel = a.signerLabels[role];
            const signer = draft.signers.find((s) => s.role === role);
            const on = signerOn(role);
            return (
              <div key={role} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Switch
                  size="small"
                  checked={on}
                  disabled={!editable || role === "client"}
                  onChange={(v) => toggleSigner(role, defaultLabel, v)}
                />
                <Input
                  size="small"
                  value={signer?.label ?? defaultLabel}
                  disabled={!editable || !on}
                  onChange={(e) => setSigner(role, { label: e.target.value })}
                  style={{ width: 200 }}
                />
                <Text style={{ fontSize: 12, color: "#94a3b8" }}>
                  {role === "client" ? "Always signs" : on ? `Signs after the ${a.person.toLowerCase()}` : "Not signing"}
                </Text>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const sidePanelTabs = [
    { key: "preview", label: <span><EyeOutlined /> {a.person} preview</span>, children: previewPanel },
    { key: "source", label: <span><FileImageOutlined /> Original</span>, children: sourcePanel },
    { key: "history", label: <span><HistoryOutlined /> History</span>, children: historyPanel },
  ];

  const saveIndicator = editable ? (
    <span style={{ fontSize: 12, color: saveState === "error" ? "#dc2626" : "#94a3b8", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
      {saveState === "saving" ? (
        <><CloudSyncOutlined spin /> Saving…</>
      ) : saveState === "error" ? (
        <Tooltip title="Click to retry"><span style={{ cursor: "pointer" }} onClick={() => { dirtyRef.current = true; void flushSave(); }}>Not saved — retry</span></Tooltip>
      ) : saveState === "saved" ? (
        <><CheckCircleFilled style={{ color: "#10b981" }} /> Saved</>
      ) : null}
    </span>
  ) : null;

  return (
    <AudienceContext.Provider value={a}>
    <div style={{ background: C.bg, minHeight: "100%" }}>
      <style>{`@media (max-width: 640px) { .cf-hide-sm { display: none; } }`}</style>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #e2e8f0",
          padding: isMobile ? "10px 12px" : "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={async () => { await flushSave(); navigate(a.hubPath("forms")); }} />
        <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column" }}>
          <Input
            variant="borderless"
            value={draft.name}
            disabled={!editable}
            onChange={(e) => update({ name: e.target.value })}
            style={{ padding: 0, fontSize: isMobile ? 15 : 17, fontWeight: 650, color: "#0f172a" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: statusMeta.color, background: statusMeta.bg, padding: "1px 8px", borderRadius: 999 }}>
              {statusMeta.label}
            </span>
            <Popover
              trigger="click"
              open={versionsOpen}
              onOpenChange={setVersionsOpen}
              content={
                <div style={{ minWidth: 240 }}>
                  {(versions ?? []).map((v) => (
                    <div
                      key={v._id}
                      onClick={() => { setVersionsOpen(false); if (v._id !== id) navigate(a.builderPath(v._id)); }}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, cursor: "pointer", background: v._id === id ? "#f1f5f9" : "transparent" }}
                    >
                      <Text strong style={{ width: 28 }}>v{v.version}</Text>
                      <span style={{ fontSize: 11.5, color: STATUS_META[v.status].color }}>{STATUS_META[v.status].label}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>{dayjs(v.updatedAt).format("D MMM")}</span>
                    </div>
                  ))}
                  {!versions && <Spin size="small" />}
                </div>
              }
            >
              <button type="button" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: C.subText, padding: 0, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <ClockCircleOutlined /> Version {form.version}
              </button>
            </Popover>
            {saveIndicator}
          </div>
        </div>
        <CategorySelect
          value={draft.category}
          disabled={!editable}
          onChange={(category) => update({ category })}
          style={{ width: isMobile ? 150 : 190 }}
        />
        {primaryAction}
        {moreItems.length > 0 && (
          <Dropdown trigger={["click"]} menu={{ items: moreItems, onClick: onMore }}>
            <Button icon={<MoreOutlined />} loading={["duplicate", "archive", "reextract"].includes(busy ?? "")} />
          </Dropdown>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? 12 : "18px 24px" }}>
        {twoColumn ? (
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0, maxWidth: 860 }}>{editorColumn}</div>
            <div
              style={{
                width: 460,
                flexShrink: 0,
                position: "sticky",
                top: 84,
                maxHeight: "calc(100vh - 110px)",
                overflowY: "auto",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "4px 16px 16px",
              }}
            >
              <Tabs activeKey={panel} onChange={setPanel} items={sidePanelTabs} />
            </div>
          </div>
        ) : (
          <>
            <Segmented
              block
              value={mobileView}
              onChange={(v) => setMobileView(String(v))}
              options={[
                { value: "edit", label: "Edit", icon: <EditOutlined /> },
                { value: "preview", label: "Preview", icon: <EyeOutlined /> },
                { value: "source", label: "Original", icon: <FileImageOutlined /> },
                { value: "history", label: "History", icon: <HistoryOutlined /> },
              ]}
              style={{ marginBottom: 14 }}
            />
            {mobileView === "edit" && editorColumn}
            {mobileView === "preview" && previewPanel}
            {mobileView === "source" && sourcePanel}
            {mobileView === "history" && <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>{historyPanel}</div>}
          </>
        )}
      </div>

      <StartFormModal open={sendOpen} onClose={() => setSendOpen(false)} templateId={id} />

      {/* ── Review modals ───────────────────────────────────────────── */}
      <Modal
        open={!!reviewModal}
        onCancel={() => { setReviewModal(null); setReviewNotes(""); }}
        onOk={confirmReview}
        confirmLoading={busy === reviewModal}
        okText={reviewModal === "approve" ? "Approve form" : reviewModal === "reject" ? "Send back" : "Send for approval"}
        title={
          reviewModal === "approve"
            ? "Approve this form?"
            : reviewModal === "reject"
              ? "Send back for changes"
              : "Send for approval"
        }
      >
        <Text style={{ color: C.subText, display: "block", marginBottom: 10 }}>
          {reviewModal === "approve"
            ? `${a.people} will see ${stats.shown} question${stats.shown === 1 ? "" : "s"}. ${form.version > 1 ? "The previous version will be archived." : ""}`
            : reviewModal === "reject"
              ? "Tell the author what needs to change. The form goes back to draft."
              : `A manager checks the form before ${a.people.toLowerCase()} can use it. Add a note for them if helpful.`}
        </Text>
        <Input.TextArea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          autoSize={{ minRows: 3, maxRows: 6 }}
          placeholder={reviewModal === "reject" ? "e.g. Please add a question about contact lenses" : "Note (optional)"}
        />
      </Modal>
    </div>
    </AudienceContext.Provider>
  );
};

export default FormBuilderPage;
