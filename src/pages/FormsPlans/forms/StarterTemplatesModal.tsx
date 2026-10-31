import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Grid, Input, Modal, Typography, message } from "antd";
import { SearchOutlined, FileAddOutlined } from "@ant-design/icons";
import { THEME_C } from "@utils/getPrimaryColor";
import { createBlankForm, apiErrorMessage } from "@services/formTemplates";
import { useAudience } from "../audience";
import { CATEGORY_META } from "./constants";
import { STARTER_TEMPLATES, type StarterTemplate } from "./starterTemplates";

const { Text } = Typography;
const C = THEME_C;

const questionCount = (t: StarterTemplate) =>
  t
    .build()
    .sections.reduce((n, s) => n + s.fields.filter((f) => f.type !== "info").length, 0);

/**
 * Gallery of ready-made forms for the audience. Using one creates a draft in
 * the builder; it still goes through review and approval before it can be sent.
 */
const StarterTemplatesModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const a = useAudience();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = !Grid.useBreakpoint().md;
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState<string | null>(null);

  const templates = STARTER_TEMPLATES[a.audience];
  const counts = useMemo(() => Object.fromEntries(templates.map((t) => [t.id, questionCount(t)])), [templates]);
  const q = search.trim().toLowerCase();
  const shown = q
    ? templates.filter((t) => `${t.name} ${t.description} ${t.useFor} ${CATEGORY_META[t.category].label}`.toLowerCase().includes(q))
    : templates;

  const use = async (t: StarterTemplate) => {
    setCreating(t.id);
    try {
      const form = await createBlankForm(a.audience, t.build());
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      message.success(`“${t.name}” added as a draft — edit the wording, then send it for approval`);
      onClose();
      navigate(a.builderPath(form._id));
    } catch (error) {
      const msg = apiErrorMessage(error, "Couldn’t create the form");
      if (msg) message.error(msg);
    } finally {
      setCreating(null);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={isMobile ? "100%" : 880}
      title="Start from a template"
      destroyOnHidden
    >
      <Text style={{ display: "block", color: C.subText, fontSize: 13, marginBottom: 12 }}>
        Ready-made {a.person.toLowerCase()} documents. Each one opens as a draft you can edit — check the wording fits your business
        (these are a starting point, not legal advice), then send it for approval.
      </Text>
      <Input
        allowClear
        prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
        placeholder="Search templates, e.g. consent, waiver, NDA"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 14 }}
      />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
        {shown.map((t) => {
          const meta = CATEGORY_META[t.category];
          return (
            <div
              key={t.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: meta.bg,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {meta.emoji}
                </span>
                <div style={{ minWidth: 0 }}>
                  <Text strong style={{ display: "block", fontSize: 13.5, lineHeight: 1.3 }}>
                    {t.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: meta.color, fontWeight: 600 }}>{meta.label}</Text>
                </div>
              </div>
              <Text style={{ fontSize: 12.5, color: "#475569", flex: 1 }}>{t.description}</Text>
              <Text style={{ fontSize: 11.5, color: "#94a3b8" }}>
                Use for: {t.useFor} · {counts[t.id]} questions
              </Text>
              <Button icon={<FileAddOutlined />} loading={creating === t.id} disabled={!!creating && creating !== t.id} onClick={() => use(t)}>
                Use this template
              </Button>
            </div>
          );
        })}
      </div>
      {shown.length === 0 && (
        <Text style={{ display: "block", textAlign: "center", color: C.subText, padding: 24 }}>
          No templates match “{search}”. Start blank or upload your own form instead.
        </Text>
      )}
    </Modal>
  );
};

export default StarterTemplatesModal;
