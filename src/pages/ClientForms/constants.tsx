import React from "react";
import {
  AlignLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  EditOutlined,
  FieldNumberOutlined,
  FontSizeOutlined,
  HighlightOutlined,
  InfoCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  StarOutlined,
  UnorderedListOutlined,
  UserOutlined,
  AimOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import type {
  FieldType,
  FormCategory,
  FormField,
  FormStatus,
  PrefillSource,
  SignerRole,
} from "./types";

export const CATEGORY_META: Record<FormCategory, { label: string; color: string; bg: string; emoji: string }> = {
  consultation: { label: "Consultation", color: "#0ea5e9", bg: "#f0f9ff", emoji: "📝" },
  facial: { label: "Facial", color: "#ec4899", bg: "#fdf2f8", emoji: "✨" },
  lash_brow: { label: "Lash & Brow", color: "#8b5cf6", bg: "#f5f3ff", emoji: "👁️" },
  massage: { label: "Massage", color: "#0d9488", bg: "#f0fdfa", emoji: "💆" },
  reflexology: { label: "Reflexology", color: "#16a34a", bg: "#f0fdf4", emoji: "🦶" },
  wood_therapy: { label: "Wood Therapy", color: "#b45309", bg: "#fffbeb", emoji: "🪵" },
  chemical_peel: { label: "Chemical Peel", color: "#f97316", bg: "#fff7ed", emoji: "🧪" },
  iv_drip: { label: "IV / Wellness Drip", color: "#2563eb", bg: "#eff6ff", emoji: "💧" },
  skin_tag: { label: "Skin Tag Removal", color: "#dc2626", bg: "#fef2f2", emoji: "🩹" },
  other: { label: "Other", color: "#64748b", bg: "#f8fafc", emoji: "📄" },
};

export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_META) as FormCategory[]).map((value) => ({
  value,
  label: `${CATEGORY_META[value].emoji}  ${CATEGORY_META[value].label}`,
}));

export const STATUS_META: Record<FormStatus, { label: string; color: string; bg: string; antColor: string }> = {
  draft: { label: "Draft", color: "#64748b", bg: "#f1f5f9", antColor: "default" },
  pending_approval: { label: "Waiting for approval", color: "#d97706", bg: "#fffbeb", antColor: "gold" },
  approved: { label: "Approved", color: "#059669", bg: "#ecfdf5", antColor: "green" },
  archived: { label: "Archived", color: "#94a3b8", bg: "#f8fafc", antColor: "default" },
};

export const FIELD_TYPE_META: Record<
  FieldType,
  { label: string; hint: string; icon: React.ReactNode; color: string; group: "answer" | "choice" | "agree" | "other" }
> = {
  short_text: { label: "Short answer", hint: "Name, city, one line", icon: <FontSizeOutlined />, color: "#3b82f6", group: "answer" },
  long_text: { label: "Paragraph", hint: "Explanations, notes", icon: <AlignLeftOutlined />, color: "#3b82f6", group: "answer" },
  date: { label: "Date", hint: "Birthday, visit date", icon: <CalendarOutlined />, color: "#0ea5e9", group: "answer" },
  phone: { label: "Phone", hint: "Phone number", icon: <PhoneOutlined />, color: "#0ea5e9", group: "answer" },
  email: { label: "Email", hint: "Email address", icon: <MailOutlined />, color: "#0ea5e9", group: "answer" },
  number: { label: "Number", hint: "Age, count", icon: <FieldNumberOutlined />, color: "#0ea5e9", group: "answer" },
  yes_no: { label: "Yes / No", hint: "With optional “if yes, explain”", icon: <QuestionCircleOutlined />, color: "#8b5cf6", group: "choice" },
  single_choice: { label: "Pick one", hint: "Only one option can be chosen", icon: <CheckCircleOutlined />, color: "#8b5cf6", group: "choice" },
  multi_choice: { label: "Tick all that apply", hint: "Several options can be ticked", icon: <UnorderedListOutlined />, color: "#8b5cf6", group: "choice" },
  rating: { label: "Rating scale", hint: "e.g. 1 (bad) – 5 (excellent)", icon: <StarOutlined />, color: "#f59e0b", group: "choice" },
  consent: { label: "Consent tick-box", hint: "“I understand / I consent …”", icon: <CheckSquareOutlined />, color: "#059669", group: "agree" },
  initials: { label: "Initials", hint: "Client initials a section", icon: <HighlightOutlined />, color: "#059669", group: "agree" },
  signature: { label: "Signature", hint: "Signature inside the form", icon: <EditOutlined />, color: "#059669", group: "agree" },
  info: { label: "Information text", hint: "Risks, aftercare — read only", icon: <InfoCircleOutlined />, color: "#64748b", group: "other" },
  body_map: { label: "Body / foot diagram", hint: "Client marks areas of discomfort", icon: <AimOutlined />, color: "#64748b", group: "other" },
};

export const FIELD_GROUPS: { key: "answer" | "choice" | "agree" | "other"; label: string }[] = [
  { key: "answer", label: "Answers" },
  { key: "choice", label: "Choices" },
  { key: "agree", label: "Consent & signing" },
  { key: "other", label: "Other" },
];

export const PREFILL_OPTIONS: { value: PrefillSource; label: string }[] = [
  { value: "none", label: "Client types it" },
  { value: "customer_name", label: "Customer name" },
  { value: "phone", label: "Customer phone" },
  { value: "email", label: "Customer email" },
  { value: "date_of_birth", label: "Customer date of birth" },
  { value: "address", label: "Customer address" },
  { value: "today", label: "Today’s date" },
];

export const SIGNER_META: Record<SignerRole, { label: string; icon: React.ReactNode }> = {
  client: { label: "Client", icon: <UserOutlined /> },
  therapist: { label: "Therapist", icon: <EditOutlined /> },
  witness: { label: "Witness", icon: <UserOutlined /> },
};

export const CHOICE_TYPES: FieldType[] = ["single_choice", "multi_choice"];

const adminPrefix = () => (window.location.pathname.startsWith("/admin") ? "/admin" : "");

/** /client-forms (the builder lives at /client-forms/:id), or the admin-layout equivalent. */
export const clientFormsBasePath = () => `${adminPrefix()}/client-forms`;

export type SpaHubTab = "forms" | "filled" | "plans" | "templates";

/** The Spa & Wellness page (client forms + treatment plans), opened on a tab. */
export const spaHubPath = (tab?: SpaHubTab) => `${adminPrefix()}/spa${tab ? `?tab=${tab}` : ""}`;

const uid = () => Math.random().toString(36).slice(2, 8);

/** A fresh field of the given type with sensible starting content. */
export const newField = (type: FieldType): FormField => ({
  key: `${type}_${uid()}`,
  type,
  label:
    type === "info"
      ? "Information"
      : type === "consent"
        ? "I understand and agree to the above."
        : type === "body_map"
          ? "Please mark any areas of discomfort"
          : `New ${FIELD_TYPE_META[type].label.toLowerCase()} question`,
  help_text: "",
  enabled: true,
  required: type === "consent",
  options: CHOICE_TYPES.includes(type)
    ? [
        { key: `opt_${uid()}`, label: "Option 1", enabled: true, is_alert: false },
        { key: `opt_${uid()}`, label: "Option 2", enabled: true, is_alert: false },
      ]
    : [],
  allow_other: false,
  detail_label: type === "yes_no" ? "If yes, please explain" : "",
  alert_on_yes: false,
  scale_min: 1,
  scale_max: 5,
  scale_min_label: type === "rating" ? "Bad" : "",
  scale_max_label: type === "rating" ? "Excellent" : "",
  content: type === "info" ? ["Add the text the client should read here."] : [],
  signer_role: "client",
  prefill_from: "none",
  width: "full",
});

export const newOption = (label = "New option") => ({
  key: `opt_${uid()}`,
  label,
  enabled: true,
  is_alert: false,
});

export const newSectionKey = () => `section_${uid()}`;
