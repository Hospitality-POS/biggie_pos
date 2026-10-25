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
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { usePermissions } from "@hooks/usePermissions";
import {
  fetchFormSubmissions,
  fetchCustomerAlerts,
  createSigningLink,
  buildSigningLink,
  fetchSignedPdfUrl,
  voidFormSubmission,
  submissionError,
} from "@services/formSubmissions";
import { CATEGORY_META } from "../constants";
import StartFormModal, { type CustomerLite } from "./StartFormModal";
import StaffSignModal from "./StaffSignModal";
import { SUBMISSION_STATUS_META, type FormSubmissionSummary, type SubmissionStatus } from "./types";
import { questionLead } from "./utils";

dayjs.extend(relativeTime);

const { Text } = Typography;

type Filter = "all" | "awaiting_therapist" | "open" | "completed";

const FILTERS: { key: Filter; label: string; statuses?: SubmissionStatus[] }[] = [
  { key: "all", label: "All" },
  { key: "awaiting_therapist", label: "Needs countersign", statuses: ["awaiting_therapist"] },
  { key: "open", label: "Waiting for client", statuses: ["pending", "in_progress"] },
  { key: "completed", label: "Signed", statuses: ["completed"] },
];

interface Props {
  /** Only this customer's forms (customer profile) */
  customer?: CustomerLite | null;
  /** Show the customer column and status filters (all clients view) */
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

const FilledFormsList: React.FC<Props> = ({ customer, showCustomer }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [filter, setFilter] = useState<Filter>("all");
  const [startOpen, setStartOpen] = useState(false);
  const [signing, setSigning] = useState<FormSubmissionSummary | null>(null);
  const [voiding, setVoiding] = useState<FormSubmissionSummary | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const statuses = FILTERS.find((f) => f.key === filter)?.statuses;
  const queryKey = ["form-submissions", customer?._id ?? "all", filter];
  const canView = can("CLIENT_FORMS_VIEW_FILLED");

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchFormSubmissions({ customer_id: customer?._id, status: statuses?.join(","), limit: 200 }),
    enabled: canView,
    // Refresh while a client may be signing on their phone
    refetchInterval: (data) => (data?.some((r) => r.status === "pending" || r.status === "in_progress") ? 15000 : false),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["form-alerts", customer?._id],
    queryFn: () => fetchCustomerAlerts(customer?._id ?? ""),
    enabled: !!customer?._id && canView,
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
      const { token } = await createSigningLink(row._id);
      const url = buildSigningLink(token);
      try {
        await navigator.clipboard.writeText(url);
        message.success("New link copied — the old one no longer works");
      } catch {
        Modal.info({ title: "New signing link", content: <Input value={url} readOnly onFocus={(e) => e.target.select()} /> });
      }
      refresh();
    });

  const openPdf = (row: FormSubmissionSummary) =>
    run(`pdf-${row._id}`, async () => {
      window.open(await fetchSignedPdfUrl(row._id), "_blank", "noopener");
    });

  const confirmVoid = () =>
    voiding &&
    run(`void-${voiding._id}`, async () => {
      if (!voidReason.trim()) {
        message.warning("Give a reason");
        return;
      }
      await voidFormSubmission(voiding._id, voidReason.trim());
      message.success("Form voided");
      setVoiding(null);
      setVoidReason("");
      refresh();
    });

  if (!canView) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="You don't have permission to view clients' filled forms." />
    );
  }

  return (
    <div>
      {/* ── Alerts ─────────────────────────────────────────────────────── */}
      {customer && alerts.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <MedicineBoxOutlined style={{ color: "#dc2626" }} />
            <Text strong style={{ color: "#b91c1c" }}>Medical alerts</Text>
          </div>
          {alerts.map((a) => (
            <div key={`${a.submission_id}-${a.field_key}`} style={{ fontSize: 13, color: "#7f1d1d", marginTop: 2 }}>
              {questionLead(a.question)} <strong>{a.answer}</strong>
              <span style={{ color: "#b4838a", fontSize: 11.5 }}> · {a.form_name}, {dayjs(a.reported_at).format("D MMM YYYY")}</span>
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
        {can("CLIENT_FORMS_SEND") && (
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
          description={filter === "all" ? (customer ? "No forms for this client yet" : "No forms filled yet") : "Nothing here"}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row) => {
            const cat = CATEGORY_META[row.form.category ?? "other"] ?? CATEGORY_META.other;
            const open = row.status === "pending" || row.status === "in_progress";
            const menu = [
              ...(open && row.channel === "link" && can("CLIENT_FORMS_SEND")
                ? [{ key: "link", icon: <LinkOutlined />, label: "Copy a new link" }]
                : []),
              ...(open && can("CLIENT_FORMS_SEND") ? [{ key: "here", icon: <TabletOutlined />, label: "Fill on this device" }] : []),
              ...(row.status !== "voided" && can("CLIENT_FORMS_VOID")
                ? [{ key: "void", icon: <StopOutlined />, label: "Void", danger: true }]
                : []),
            ];
            return (
              <div
                key={row._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13.5, display: "block" }} ellipsis>
                    {showCustomer ? `${row.customer_snapshot.name} · ` : ""}
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
                      <Tooltip title={row.alerts.map((a) => `${questionLead(a.question)} ${a.answer}`).join("\n")}>
                        <span style={{ fontSize: 11.5, color: "#dc2626" }}>
                          <MedicineBoxOutlined /> {row.alerts.length} alert{row.alerts.length === 1 ? "" : "s"}
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {row.status === "awaiting_therapist" && can("CLIENT_FORMS_COUNTERSIGN") && (
                  <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => setSigning(row)}>
                    Countersign
                  </Button>
                )}
                {row.status === "completed" && (
                  <Button size="small" icon={<DownloadOutlined />} loading={busy === `pdf-${row._id}`} onClick={() => openPdf(row)}>
                    PDF
                  </Button>
                )}
                {open && row.channel === "in_store" && can("CLIENT_FORMS_SEND") && (
                  <Button
                    size="small"
                    icon={<TabletOutlined />}
                    onClick={() => navigate(`/client-forms/fill/${row._id}`, { state: { returnTo: location.pathname } })}
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
                        if (key === "here") navigate(`/client-forms/fill/${row._id}`, { state: { returnTo: location.pathname } });
                        if (key === "void") setVoiding(row);
                      },
                    }}
                  >
                    <Button size="small" type="text" icon={<MoreOutlined />} loading={busy === `link-${row._id}`} />
                  </Dropdown>
                )}
              </div>
            );
          })}
        </div>
      )}

      <StartFormModal open={startOpen} onClose={() => setStartOpen(false)} customer={customer} onCreated={refresh} />

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
          placeholder="Reason, e.g. filled for the wrong treatment"
          autoSize={{ minRows: 2 }}
        />
      </Modal>
    </div>
  );
};

export default FilledFormsList;
