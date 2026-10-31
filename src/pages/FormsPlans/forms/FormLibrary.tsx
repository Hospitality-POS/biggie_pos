import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Typography, Grid, Spin, Tooltip, message, Empty } from "antd";
import {
  CloudUploadOutlined,
  PlusOutlined,
  SearchOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  FileSearchOutlined,
  AppstoreAddOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { THEME_C } from "@utils/getPrimaryColor";
import { useDebounce } from "@hooks/useDebounce";
import { usePermissions } from "@hooks/usePermissions";
import { fetchFormTemplates, createBlankForm, apiErrorMessage } from "@services/formTemplates";
import { useAudience } from "../audience";
import UploadFormModal from "./UploadFormModal";
import StarterTemplatesModal from "./StarterTemplatesModal";
import { STARTER_TEMPLATES } from "./starterTemplates";
import { STATUS_META } from "./constants";
import type { FormStatus, FormTemplateSummary } from "./types";
import { CategorySelect } from "./categories";
import { useCategories } from "./categories";

dayjs.extend(relativeTime);

const { Text, Title } = Typography;
const C = THEME_C;

type TabKey = "all" | FormStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All forms" },
  { key: "draft", label: "Drafts" },
  { key: "pending_approval", label: "Waiting for approval" },
  { key: "approved", label: "Approved" },
  { key: "archived", label: "Archived" },
];

const StatusChip: React.FC<{ status: FormStatus }> = ({ status }) => {
  const meta = STATUS_META[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11.5,
        fontWeight: 600,
        color: meta.color,
        background: meta.bg,
        padding: "3px 9px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 3, background: meta.color }} />
      {meta.label}
    </span>
  );
};

const FormCard: React.FC<{ form: FormTemplateSummary; onOpen: () => void }> = ({ form, onOpen }) => {
  const cat = useCategories().meta(form.category);
  const reading = form.extraction?.status === "processing";
  const failed = form.extraction?.status === "failed";

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 16,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease",
        minHeight: 168,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(15,23,42,0.08)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = `${cat.color}55`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.borderColor = "#e2e8f0";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: cat.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {cat.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text
            strong
            style={{ fontSize: 14.5, color: "#0f172a", display: "block", lineHeight: 1.35 }}
            ellipsis={{ tooltip: form.name }}
          >
            {form.name}
          </Text>
          <Text style={{ fontSize: 12, color: cat.color, fontWeight: 500 }}>{cat.label}</Text>
        </div>
      </div>

      {form.description ? (
        <Text style={{ fontSize: 12.5, color: C.subText, lineHeight: 1.5 }} ellipsis={{ tooltip: form.description }}>
          {form.description}
        </Text>
      ) : (
        <div style={{ flex: 0 }} />
      )}

      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {reading ? (
          <span style={{ fontSize: 12, color: C.primary, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <LoadingOutlined /> Reading form…
          </span>
        ) : failed ? (
          <span style={{ fontSize: 12, color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ExclamationCircleOutlined /> Couldn’t read — open to retry
          </span>
        ) : (
          <StatusChip status={form.status} />
        )}
        <span style={{ fontSize: 11.5, color: "#94a3b8" }}>v{form.version}</span>
        <span style={{ fontSize: 11.5, color: "#94a3b8", marginLeft: "auto" }}>
          {form.status === "approved" && form.approved_at
            ? `Approved ${dayjs(form.approved_at).fromNow()}`
            : `Edited ${dayjs(form.updatedAt).fromNow()}`}
        </span>
      </div>
    </div>
  );
};

const HowItWorks: React.FC<{ people: string }> = ({ people }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 24 }}>
    {[
      { icon: <CloudUploadOutlined />, title: "1. Upload", text: "PDF, Word or phone photos of your paper form." },
      { icon: <FileSearchOutlined />, title: "2. Review", text: "Switch off questions or options you don’t need, add new ones." },
      { icon: <CheckCircleOutlined />, title: "3. Approve", text: `A manager approves it — then ${people.toLowerCase()} can fill and e-sign it.` },
    ].map((s) => (
      <div key={s.title} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, textAlign: "left" }}>
        <div style={{ fontSize: 20, color: C.primary, marginBottom: 6 }}>{s.icon}</div>
        <Text strong style={{ display: "block", marginBottom: 2 }}>{s.title}</Text>
        <Text style={{ fontSize: 12.5, color: C.subText }}>{s.text}</Text>
      </div>
    ))}
  </div>
);

/** The form library tab of the Forms & Plans page (client or employee forms). */
const FormLibrary: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { can } = usePermissions();
  const a = useAudience();
  const isEmployee = a.audience === "employee";
  const isContact = a.audience === "contact";
  const canCreate = can(a.perms.create);
  const hasStarters = STARTER_TEMPLATES[a.audience].length > 0;
  const [startersOpen, setStartersOpen] = useState(false);

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["form-templates", a.audience, tab, debouncedSearch, category],
    queryFn: () =>
      fetchFormTemplates(a.audience, {
        status: tab === "all" ? undefined : tab,
        search: debouncedSearch || undefined,
        category,
      }),
    // Keep polling while any form is still being read by the AI
    refetchInterval: (res) => (res?.data?.some((f) => f.extraction?.status === "processing") ? 4000 : false),
  });

  const forms = data?.data ?? [];
  const counts = useMemo(() => data?.counts ?? {}, [data]);
  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + (b ?? 0), 0), [counts]);
  const pending = counts.pending_approval ?? 0;

  const openForm = (id: string) => navigate(a.builderPath(id));

  const startBlank = async () => {
    setCreating(true);
    try {
      const form = await createBlankForm(a.audience, { name: "Untitled form" });
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      openForm(form._id);
    } catch (error) {
      const msg = apiErrorMessage(error, "Couldn’t create the form");
      if (msg) message.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      {canCreate && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <Text style={{ flex: "1 1 220px", fontSize: 13, color: C.subText }}>
            {hasStarters
              ? "Start from a ready-made template, upload the paper forms you use today, review them, and get them approved."
              : "Upload the paper forms you use today, review them, and get them approved."}
          </Text>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {hasStarters && (
              <Button icon={<AppstoreAddOutlined />} onClick={() => setStartersOpen(true)}>
                {isMobile ? "Templates" : "From template"}
              </Button>
            )}
            <Button icon={<PlusOutlined />} onClick={startBlank} loading={creating}>
              {isMobile ? "Blank" : "Start blank"}
            </Button>
            <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setUploadOpen(true)}>
              Upload form
            </Button>
          </div>
        </div>
      )}

      {/* ── Approval banner ─────────────────────────────────────────────── */}
      {pending > 0 && can(a.perms.approve) && tab !== "pending_approval" && (
        <div
          onClick={() => setTab("pending_approval")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderRadius: 12,
            background: "#fffbeb",
            border: "1px solid #fde68a",
            marginBottom: 16,
            cursor: "pointer",
          }}
        >
          <SafetyCertificateOutlined style={{ color: "#d97706", fontSize: 18 }} />
          <Text style={{ flex: 1, color: "#92400e" }}>
            <strong>{pending}</strong> {pending === 1 ? "form is" : "forms are"} waiting for your approval
          </Text>
          <Button size="small" icon={<EyeOutlined />}>Review</Button>
        </div>
      )}

      {/* ── Tabs + filters ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            flex: isMobile ? "1 1 100%" : "0 1 auto",
            paddingBottom: 2,
          }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            const count = t.key === "all" ? total : counts[t.key] ?? 0;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 13px",
                  borderRadius: 999,
                  border: `1px solid ${active ? C.primary : "#e2e8f0"}`,
                  background: active ? C.primary : "#fff",
                  color: active ? "#fff" : "#334155",
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
                <span
                  style={{
                    fontSize: 11,
                    padding: "0 6px",
                    borderRadius: 999,
                    background: active ? "rgba(255,255,255,0.25)" : t.key === "pending_approval" && count > 0 ? "#fef3c7" : "#f1f5f9",
                    color: active ? "#fff" : t.key === "pending_approval" && count > 0 ? "#b45309" : "#64748b",
                    fontWeight: 600,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: isMobile ? 0 : "auto", flex: isMobile ? "1 1 100%" : "0 0 auto" }}>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            placeholder="Search forms"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: isMobile ? "100%" : 220 }}
          />
          <CategorySelect
            allowClear
            placeholder={a.categoryNoun === "type" ? "All types" : "All treatments"}
            value={category}
            onChange={setCategory}
            style={{ width: isMobile ? 160 : 190 }}
          />
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : forms.length === 0 ? (
        total === 0 && !search && !category ? (
          <div style={{ textAlign: "center", padding: isMobile ? "28px 8px" : "48px 24px", maxWidth: 760, margin: "0 auto" }}>
            <div style={{ fontSize: 46, marginBottom: 8 }}>📋</div>
            <Title level={5} style={{ marginBottom: 4 }}>
              {isContact ? "Get consent and signatures from anyone" : "Bring your paper forms online"}
            </Title>
            <Text style={{ color: C.subText }}>
              {isContact
                ? "Data protection consent, marketing opt-ins, photo releases, waivers, NDAs, agreements, registrations and feedback — for leads and people who aren't customers. They fill and sign on a tablet or from a link, no account needed."
                : isEmployee
                  ? "Upload the onboarding forms, policies, NDAs and incident reports you already use. Employees fill and sign them on a tablet or from a link, and HR countersigns — no more paper files."
                  : "Upload the consultation and consent forms you already use. Clients then fill and sign them on a tablet or from a link — no more paper files."}
            </Text>
            {canCreate && (
              <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {hasStarters && (
                  <Button type="primary" size="large" icon={<AppstoreAddOutlined />} onClick={() => setStartersOpen(true)} style={{ background: C.primary }}>
                    Browse templates
                  </Button>
                )}
                <Button
                  type={hasStarters ? "default" : "primary"}
                  size="large"
                  icon={<CloudUploadOutlined />}
                  onClick={() => setUploadOpen(true)}
                  style={hasStarters ? undefined : { background: C.primary }}
                >
                  {hasStarters ? "Upload your own" : "Upload your first form"}
                </Button>
              </div>
            )}
            <HowItWorks people={a.people} />
          </div>
        ) : (
          <Empty description="No forms match" style={{ padding: 48 }} />
        )
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 240 : 280}px, 1fr))`,
            gap: 14,
          }}
        >
          {forms.map((f) => (
            <Tooltip key={f._id} title={f.review_notes && f.status === "draft" ? `Reviewer: ${f.review_notes}` : undefined}>
              <div>
                <FormCard form={f} onOpen={() => openForm(f._id)} />
              </div>
            </Tooltip>
          ))}
        </div>
      )}

      <UploadFormModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(form) => {
          setUploadOpen(false);
          queryClient.invalidateQueries({ queryKey: ["form-templates"] });
          message.success("Uploaded — the AI is reading your form");
          openForm(form._id);
        }}
      />
      {hasStarters && <StarterTemplatesModal open={startersOpen} onClose={() => setStartersOpen(false)} />}
    </div>
  );
};

export default FormLibrary;
