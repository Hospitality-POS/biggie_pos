import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dropdown, Empty, Input, Modal, Spin, Tooltip, Typography, message } from "antd";
import {
  PlusOutlined,
  TabletOutlined,
  LinkOutlined,
  EditOutlined,
  DownloadOutlined,
  StopOutlined,
  MoreOutlined,
  MedicineBoxOutlined,
  SendOutlined,
  ScheduleOutlined,
  EyeOutlined,
  MailOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { usePermissions } from "@hooks/usePermissions";
import {
  fetchFormSubmissions,
  fetchPersonAlerts,
  createSigningLink,
  buildSigningLink,
  fetchSignedPdfBlob,
  voidFormSubmission,
  submissionError,
} from "@services/formSubmissions";
import StartFormModal from "./StartFormModal";
import type { PersonLite } from "../person";
import { useAudience } from "../../audience";
import StaffSignModal from "./StaffSignModal";
import PdfPreviewModal, { saveBlob, signedPdfName } from "./SignedPdfModal";
import EmailSignedCopyModal from "./EmailSignedCopyModal";
import { SUBMISSION_STATUS_META, type FormSubmissionSummary, type SubmissionStatus } from "./types";
import { questionLead } from "./utils";
import { useFormsSettings } from "@hooks/useFormsSettings";
import NewPlanModal from "@pages/FormsPlans/plans/NewPlanModal";
import PlanDrawer from "@pages/FormsPlans/plans/PlanDrawer";
import { useCategories } from "../categories";

dayjs.extend(relativeTime);

const { Text } = Typography;

type Filter = "all" | "awaiting_therapist" | "open" | "completed";

const FILTERS: { key: Filter; label: string; statuses?: SubmissionStatus[] }[] = [
  { key: "all", label: "All" },
  { key: "awaiting_therapist", label: "Needs countersign", statuses: ["awaiting_therapist"] },
  { key: "open", label: "Not signed yet", statuses: ["pending", "in_progress"] },
  { key: "completed", label: "Signed", statuses: ["completed"] },
];

interface Props {
  /** Only this customer's / employee's forms (their profile) */
  person?: PersonLite | null;
  /** Show the person's name on each row (everyone view) */
  showCustomer?: boolean;
}

const StatusChip: React.FC<{ status: SubmissionStatus }> = ({ status }) => {
  const m = SUBMISSION_STATUS_META[status];
  return (
    <span style={{ fontSize: 11.5, fontWeight: 600, color: m.color, background: m.bg, padding: "2px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {m.label}
    </span>
  );
};

const FilledFormsList: React.FC<Props> = ({ person, showCustomer }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const a = useAudience();
  const isEmployee = a.audience === "employee";
  const [filter, setFilter] = useState<Filter>("all");
  const [startOpen, setStartOpen] = useState(false);
  const [signing, setSigning] = useState<FormSubmissionSummary | null>(null);
  const [voiding, setVoiding] = useState<FormSubmissionSummary | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const { meta: categoryMeta } = useCategories();
  const [previewing, setPreviewing] = useState<FormSubmissionSummary | null>(null);
  const [emailing, setEmailing] = useState<FormSubmissionSummary | null>(null);
  // Start a plan from a signed form
  const settings = useFormsSettings();
  const [planFrom, setPlanFrom] = useState<FormSubmissionSummary | null>(null);
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const canStartPlan = a.hasPlans && !!settings[a.plansFlag] && can(a.perms.plansManage);

  const statuses = FILTERS.find((f) => f.key === filter)?.statuses;
  const queryKey = ["form-submissions", a.audience, person?._id ?? "all", filter];
  const canView = can(a.perms.viewFilled);
  const canDownload = can(a.perms.download);
  const personKey = a.personKey;

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchFormSubmissions(a.audience, { [personKey]: person?._id, status: statuses?.join(","), limit: 200 }),
    enabled: canView,
    // Refresh while someone may be signing on their phone
    refetchInterval: (data) => (data?.some((r) => r.status === "pending" || r.status === "in_progress") ? 15000 : false),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["form-alerts", a.audience, person?._id],
    queryFn: () => fetchPersonAlerts(a.audience, person?._id ?? ""),
    enabled: !!person?._id && canView,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["form-submissions"] });
    queryClient.invalidateQueries({ queryKey: ["form-alerts"] });
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      const err = submissionError(e, "Something went wrong");
      if (!err.alreadyShown) message.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const copyNewLink = (row: FormSubmissionSummary) =>
    run(`link-${row._id}`, async () => {
      const { token } = await createSigningLink(row._id, a.audience);
      const url = buildSigningLink(token);
      try {
        await navigator.clipboard.writeText(url);
        message.success("New link copied — the old one no longer works");
      } catch {
        Modal.info({ title: "New signing link", content: <Input value={url} readOnly onFocus={(e) => e.target.select()} /> });
      }
      refresh();
    });

  // Fetched through the API and saved from memory: the desktop app blocks
  // window.open, so opening the storage link did nothing there
  const downloadPdf = (row: FormSubmissionSummary) =>
    run(`pdf-${row._id}`, async () => {
      saveBlob(await fetchSignedPdfBlob(row._id, a.audience), signedPdfName(row));
    });

  const confirmVoid = () =>
    voiding &&
    run(`void-${voiding._id}`, async () => {
      if (!voidReason.trim()) {
        message.warning("Give a reason");
        return;
      }
      await voidFormSubmission(voiding._id, voidReason.trim(), a.audience);
      message.success("Form voided");
      setVoiding(null);
      setVoidReason("");
      refresh();
    });

  if (!canView) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`You don't have permission to view ${a.people.toLowerCase()}' filled forms.`} />
    );
  }

  return (
    <div>
      {/* ── Alerts ─────────────────────────────────────────────────────── */}
      {person && alerts.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <MedicineBoxOutlined style={{ color: "#dc2626" }} />
            <Text strong style={{ color: "#b91c1c" }}>{a.alertsLabel}</Text>
          </div>
          {alerts.map((al) => (
            <div key={`${al.submission_id}-${al.field_key}`} style={{ fontSize: 13, color: "#7f1d1d", marginTop: 2 }}>
              {questionLead(al.question)} <strong>{al.answer}</strong>
              <span style={{ color: "#b4838a", fontSize: 11.5 }}> · {al.form_name}, {dayjs(al.reported_at).format("D MMM YYYY")}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", flex: 1 }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: `1px solid ${active ? "#0f172a" : "#e2e8f0"}`,
                  background: active ? "#0f172a" : "#fff",
                  color: active ? "#fff" : "#334155",
                  fontSize: 12.5,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        {can(a.perms.send) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setStartOpen(true)}>
            New form
          </Button>
        )}
      </div>

      {/* ── Rows ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 32 }}><Spin /></div>
      ) : rows.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={filter === "all" ? (person ? `No forms for this ${a.person.toLowerCase()} yet` : "No forms filled yet") : "Nothing here"}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row) => {
            const cat = categoryMeta(row.form.category);
            const open = row.status === "pending" || row.status === "in_progress";
            const menu = [
              ...(open && row.channel === "link" && can(a.perms.send)
                ? [{ key: "link", icon: <LinkOutlined />, label: "Copy a new link" }]
                : []),
              ...(open && can(a.perms.send) ? [{ key: "here", icon: <TabletOutlined />, label: "Fill on this device" }] : []),
              ...(row.status === "completed" && canStartPlan
                ? [{ key: "plan", icon: <ScheduleOutlined />, label: isEmployee ? "Start onboarding / training plan" : "Start treatment plan" }]
                : []),
              ...(row.status !== "voided" && can(a.perms.void)
                ? [{ key: "void", icon: <StopOutlined />, label: "Void", danger: true }]
                : []),
            ];
            return (
              <div
                key={row._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap", // actions drop below the name on phones
                  gap: "8px 12px",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e8edf3",
                  background: row.status === "voided" ? "#fafafa" : "#fff",
                  opacity: row.status === "voided" ? 0.7 : 1,
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {cat.emoji}
                </div>
                <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13.5, display: "block" }} ellipsis>
                    {showCustomer ? `${row.subject_snapshot.name} · ` : ""}
                    {row.form.name}
                  </Text>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                    <StatusChip status={row.status} />
                    <span style={{ fontSize: 11.5, color: "#94a3b8" }}>
                      {row.channel === "link" ? <SendOutlined /> : <TabletOutlined />}{" "}
                      {row.status === "completed" && row.completed_at
                        ? `Signed ${dayjs(row.completed_at).format("D MMM YYYY, HH:mm")}`
                        : row.status === "voided"
                          ? `Voided — ${row.void_reason}`
                          : `Sent ${dayjs(row.createdAt).fromNow()}`}
                    </span>
                    {row.alerts?.length > 0 && (
                      <Tooltip title={row.alerts.map((al) => `${questionLead(al.question)} ${al.answer}`).join("\n")}>
                        <span style={{ fontSize: 11.5, color: "#dc2626" }}>
                          <MedicineBoxOutlined /> {row.alerts.length} {a.alertShort}{row.alerts.length === 1 ? "" : "s"}
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                {row.status === "awaiting_therapist" && can(a.perms.countersign) && (
                  <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => setSigning(row)}>
                    Countersign
                  </Button>
                )}
                {row.status === "completed" && canDownload && (
                  <>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewing(row)}>
                      Preview
                    </Button>
                    <Tooltip title="Download PDF">
                      <Button size="small" icon={<DownloadOutlined />} loading={busy === `pdf-${row._id}`} onClick={() => downloadPdf(row)}>
                        PDF
                      </Button>
                    </Tooltip>
                    <Tooltip title="Email signed copy">
                      <Button size="small" icon={<MailOutlined />} onClick={() => setEmailing(row)}>
                        Email
                      </Button>
                    </Tooltip>
                  </>
                )}
                {open && row.channel === "in_store" && can(a.perms.send) && (
                  <Button
                    size="small"
                    icon={<TabletOutlined />}
                    onClick={() => navigate(a.fillPath(row._id), { state: { returnTo: location.pathname + location.search } })}
                  >
                    Continue
                  </Button>
                )}
                {menu.length > 0 && (
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: menu,
                      onClick: ({ key }) => {
                        if (key === "link") copyNewLink(row);
                        if (key === "here") navigate(a.fillPath(row._id), { state: { returnTo: location.pathname + location.search } });
                        if (key === "void") setVoiding(row);
                        if (key === "plan") setPlanFrom(row);
                      },
                    }}
                  >
                    <Button size="small" type="text" icon={<MoreOutlined />} loading={busy === `link-${row._id}`} />
                  </Dropdown>
                )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StartFormModal open={startOpen} onClose={() => setStartOpen(false)} person={person} onCreated={refresh} />

      {canStartPlan && (
        <>
          <NewPlanModal
            open={!!planFrom}
            onClose={() => setPlanFrom(null)}
            person={planFrom ? { _id: (isEmployee ? planFrom.employee_id : planFrom.customer_id) ?? "", name: planFrom.subject_snapshot.name } : null}
            submissionId={planFrom?._id}
            onCreated={(plan) => {
              setPlanFrom(null);
              setOpenPlanId(plan._id);
            }}
          />
          <PlanDrawer planId={openPlanId} onClose={() => setOpenPlanId(null)} />
        </>
      )}

      <EmailSignedCopyModal submission={emailing} audience={a.audience} onClose={() => setEmailing(null)} />
      <PdfPreviewModal
        open={!!previewing}
        title={previewing ? `${previewing.form.name} · ${previewing.subject_snapshot.name}` : ""}
        fileName={previewing ? signedPdfName(previewing) : "form.pdf"}
        load={() => fetchSignedPdfBlob(previewing!._id, a.audience)}
        onClose={() => setPreviewing(null)}
      />

      {signing && (
        <StaffSignModal
          open
          submission={signing}
          onClose={() => setSigning(null)}
          onSigned={() => {
            setSigning(null);
            refresh();
          }}
        />
      )}

      <Modal
        open={!!voiding}
        title="Void this form?"
        okText="Void"
        okButtonProps={{ danger: true }}
        confirmLoading={busy === `void-${voiding?._id}`}
        onOk={confirmVoid}
        onCancel={() => {
          setVoiding(null);
          setVoidReason("");
        }}
      >
        <Text style={{ color: "#64748b", display: "block", marginBottom: 8 }}>
          The form stays on record marked as voided{voiding?.channel === "link" ? " and its link stops working" : ""}.
        </Text>
        <Input.TextArea
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
          placeholder={a.voidPlaceholder}
          autoSize={{ minRows: 2 }}
        />
      </Modal>
    </div>
  );
};

export default FilledFormsList;
