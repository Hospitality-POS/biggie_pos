import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Modal, Select, Typography, Button, Input, message, Space } from "antd";
import {
  TabletOutlined,
  SendOutlined,
  CopyOutlined,
  WhatsAppOutlined,
  MessageOutlined,
  CheckCircleFilled,
  MailOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { THEME_C } from "@utils/getPrimaryColor";
import { fetchFormTemplates } from "@services/formTemplates";
import { createFormSubmission, buildSigningLink, submissionError, emailSigningLink } from "@services/formSubmissions";
import PersonPicker from "../components/PersonPicker";
import { personName, type PersonLite } from "../person";
import { useAudience } from "../../audience";
import { useCategories } from "../categories";

const { Text } = Typography;
const C = THEME_C;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Preselected customer / employee (from their profile) */
  person?: PersonLite | null;
  /** Preselected form (from the form builder) */
  templateId?: string;
  onCreated?: () => void;
}

/** Kenyan number → international digits for WhatsApp (0712… / 712… → 254712…). */
const toWhatsAppNumber = (phone?: string | number) => {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  return digits;
};

const MethodCard: React.FC<{
  active: boolean;
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}> = ({ active, icon, title, text, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    style={{
      flex: "1 1 200px",
      textAlign: "left",
      padding: "14px 16px",
      borderRadius: 12,
      border: `1.5px solid ${active ? C.primary : "#e2e8f0"}`,
      background: active ? C.primaryLight : "#fff",
      cursor: "pointer",
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
    }}
  >
    <span style={{ fontSize: 22, color: active ? C.primary : "#64748b", display: "inline-flex", marginTop: 2 }}>{icon}</span>
    <span>
      <span style={{ display: "block", fontWeight: 600, color: "#0f172a", fontSize: 14 }}>{title}</span>
      <span style={{ display: "block", fontSize: 12.5, color: C.subText, marginTop: 2 }}>{text}</span>
    </span>
  </button>
);

const StartFormModal: React.FC<Props> = ({ open, onClose, person, templateId, onCreated }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const a = useAudience();
  const isEmployee = a.audience === "employee";
  const [formId, setFormId] = useState<string | undefined>(templateId);
  const [picked, setPicked] = useState<PersonLite | null>(person ?? null);
  const [method, setMethod] = useState<"in_store" | "link">("in_store");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ url: string; expires: string; id: string; token: string; fileEmail: string } | null>(null);
  // Email row: pre-filled from the person's email on file, editable
  const [email, setEmail] = useState("");
  const [emailing, setEmailing] = useState(false);
  const [emailedTo, setEmailedTo] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormId(templateId);
      setPicked(person ?? null);
      setLink(null);
      setMethod("in_store");
      setEmail("");
      setEmailedTo(null);
    }
  }, [open, templateId, person]);

  const { data: forms, isLoading: formsLoading } = useQuery({
    queryKey: ["form-templates", a.audience, "approved"],
    queryFn: () => fetchFormTemplates(a.audience, { status: "approved" }),
    enabled: open,
  });

  const { meta: categoryMeta } = useCategories();
  const formOptions = useMemo(
    () =>
      (forms?.data ?? []).map((f) => ({
        value: f._id,
        label: `${categoryMeta(f.category).emoji}  ${f.name}`,
      })),
    [forms, categoryMeta]
  );

  const selectedForm = forms?.data.find((f) => f._id === formId);

  const start = async () => {
    if (!formId || !picked) {
      message.warning(`Choose a form and ${isEmployee ? "an employee" : "a customer"}`);
      return;
    }
    setBusy(true);
    try {
      const { submission, token } = await createFormSubmission(a.audience, { template_id: formId, person_id: picked._id, channel: method });
      onCreated?.();
      if (method === "in_store") {
        onClose();
        navigate(a.fillPath(submission._id), { state: { returnTo: location.pathname + location.search } });
      } else if (token) {
        const fileEmail = submission.subject_snapshot?.email || "";
        setLink({ url: buildSigningLink(token), expires: submission.public_link?.expires_at ?? "", id: submission._id, token, fileEmail });
        setEmail(fileEmail);
      }
    } catch (e) {
      const err = submissionError(e, "Couldn't prepare the form");
      if (!err.alreadyShown) message.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const sendEmail = async () => {
    if (!link) return;
    const to = email.trim();
    if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(to)) {
      message.warning("Enter a valid email address");
      return;
    }
    setEmailing(true);
    try {
      const res = await emailSigningLink(link.id, a.audience, { token: link.token, link_url: link.url, email: to });
      setEmailedTo(res.email || to);
      message.success(res.message || `Link emailed to ${to}`);
    } catch (e) {
      const err = submissionError(e, "Couldn't send the email");
      if (!err.alreadyShown) message.error(err.message);
    } finally {
      setEmailing(false);
    }
  };

  const shareText = link
    ? isEmployee
      ? `Hi ${personName(picked).split(" ")[0]}, please read, fill in and sign your ${selectedForm?.name ?? "form"}: ${link.url}`
      : `Hi ${personName(picked).split(" ")[0]}, please fill in your ${selectedForm?.name ?? "form"} before your appointment: ${link.url}`
    : "";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={link ? "Link ready to send" : `Send a form to ${isEmployee ? "an employee" : "a client"}`}
      footer={
        link ? (
          <Button type="primary" onClick={onClose}>Done</Button>
        ) : (
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" loading={busy} onClick={start} icon={method === "in_store" ? <TabletOutlined /> : <SendOutlined />}>
              {method === "in_store" ? "Open form" : "Create link"}
            </Button>
          </Space>
        )
      }
      width={560}
      destroyOnHidden
    >
      {link ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <CheckCircleFilled style={{ color: "#10b981", fontSize: 22 }} />
            <Text>
              Send this link to <strong>{personName(picked)}</strong>. It works for 3 days
              {link.expires ? ` (until ${dayjs(link.expires).format("D MMM, HH:mm")})` : ""}.
            </Text>
          </div>
          <Space.Compact style={{ display: "flex" }}>
            <Input value={link.url} readOnly style={{ flex: 1 }} onFocus={(e) => e.target.select()} />
            <Button
              icon={<CopyOutlined />}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link.url);
                  message.success("Link copied");
                } catch {
                  message.info("Select the link and copy it");
                }
              }}
            >
              Copy
            </Button>
          </Space.Compact>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Button
              icon={<WhatsAppOutlined />}
              href={`https://wa.me/${toWhatsAppNumber(picked?.phone)}?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#16a34a", borderColor: "#bbf7d0" }}
            >
              WhatsApp
            </Button>
            <Button icon={<MessageOutlined />} href={`sms:${picked?.phone ? `0${String(picked.phone).replace(/^0/, "")}` : ""}?body=${encodeURIComponent(shareText)}`}>
              SMS
            </Button>
          </div>
          <div style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 4 }}>
              <MailOutlined /> Send by email
            </Text>
            <Space.Compact style={{ display: "flex" }}>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailedTo(null);
                }}
                onPressEnter={sendEmail}
                placeholder="name@example.com"
                style={{ flex: 1 }}
                allowClear
              />
              <Button type="primary" icon={<MailOutlined />} loading={emailing} onClick={sendEmail} disabled={!email.trim()}>
                {emailedTo && emailedTo === email.trim().toLowerCase() ? "Send again" : "Send email"}
              </Button>
            </Space.Compact>
            <Text style={{ fontSize: 12, color: emailedTo ? "#10b981" : "#94a3b8", display: "block", marginTop: 4 }}>
              {emailedTo
                ? `Sent to ${emailedTo}`
                : !link.fileEmail
                  ? "No email on file — type the address to send the link to."
                  : email.trim().toLowerCase() === link.fileEmail.toLowerCase()
                    ? `${personName(picked).split(" ")[0] || "Their"}'s email on file — change it to send somewhere else.`
                    : `Sending to a different address than the one on file (${link.fileEmail}).`}
            </Text>
          </div>
          <Text style={{ fontSize: 12, color: "#94a3b8", display: "block", marginTop: 14 }}>
            You'll find the form under {isEmployee ? "Signed by employees" : "the customer's Forms tab"} — it updates when they sign.
          </Text>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 4 }}>Form</Text>
            <Select
              value={formId}
              onChange={setFormId}
              options={formOptions}
              loading={formsLoading}
              placeholder={formOptions.length || formsLoading ? "Choose an approved form" : "No approved forms yet"}
              style={{ width: "100%" }}
              size="large"
              showSearch
              optionFilterProp="label"
            />
          </div>

          <div>
            <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 4 }}>{a.pickerLabel}</Text>
            {person ? (
              <Input size="large" value={personName(person)} disabled />
            ) : (
              <PersonPicker value={picked} onChange={setPicked} size="large" />
            )}
          </div>

          <div>
            <Text style={{ fontSize: 12.5, color: C.subText, display: "block", marginBottom: 6 }}>How will they fill it?</Text>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <MethodCard
                active={method === "in_store"}
                icon={<TabletOutlined />}
                title="Here, on this device"
                text={`Hand the tablet to the ${a.person.toLowerCase()} to fill and sign now.`}
                onClick={() => setMethod("in_store")}
              />
              <MethodCard
                active={method === "link"}
                icon={<SendOutlined />}
                title="Send them a link"
                text={isEmployee ? "They fill and sign on their own phone or computer." : "They fill and sign on their phone before the visit."}
                onClick={() => setMethod("link")}
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default StartFormModal;
