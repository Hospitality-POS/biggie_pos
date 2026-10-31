import { createContext, useContext } from "react";
import type { Audience, BuiltInCategory, PrefillSource, SignerRole } from "./forms/types";
import { CATEGORY_META } from "./forms/constants";
import type { FormsSettings } from "@hooks/useFormsSettings";

/**
 * Forms & Plans serves three audiences with the same screens:
 *  - client   → customers (Duka / Pesa): consent forms, treatment plans
 *  - employee → Bandu HR: onboarding, policies, NDAs, incident reports,
 *               onboarding / training plans
 *  - contact  → Mteja: consent, data privacy, media releases, waivers,
 *               agreements… for leads and people who aren't customers
 *               (forms only — contacts have no plans)
 * Everything that differs (wording, permission keys, categories, paths)
 * lives here; components read it with useAudience().
 */

export type HubTab = "forms" | "filled" | "analytics" | "plans" | "templates";

export interface AudienceConfig {
  audience: Audience;
  /** The person who fills forms in: "Client" / "Employee" / "Contact" */
  person: string;
  people: string;
  /** "a client" / "an employee" / "a contact" */
  aPerson: string;
  /** Picker label: "Customer" / "Employee" / "Contact" */
  pickerLabel: string;
  /** Staff who countersign: "Therapist" / "HR" / "Staff" */
  staff: string;
  signerLabels: Record<SignerRole, string>;
  /** Flagged answers on signed forms */
  alertsLabel: string;
  /** One flagged answer: "medical alert" / "flag for HR" */
  alertNoun: string;
  /** Short word for a flagged answer in lists: "alert" / "flag" */
  alertShort: string;
  title: string;
  /** Line under the hub title */
  tagline: string;
  formsTitle: string;
  filledTitle: string;
  /** Side-menu group for the form tabs */
  formsGroup: string;
  filledDescription: string;
  /** Where a sent form shows up afterwards */
  filledWhere: string;
  /** How the person signs from a link */
  linkHint: string;
  voidPlaceholder: string;
  /** What a category is called in pickers: "treatment" / "type" */
  categoryNoun: string;
  /** Hub header colours */
  headerBg: string;
  headerColor: string;
  /** Setting names in System Setup → Forms & Plans */
  formsSettingLabel: string;
  formsFlag: keyof FormsSettings;
  plansFlag: keyof FormsSettings;
  /** Contacts have forms only */
  hasPlans: boolean;
  /** Request/filter key for the person a form belongs to */
  personKey: "customer_id" | "employee_id" | "lead_id";
  plansTitle: string;
  planNoun: string;
  /** One row of a plan: "Session" / "Step" */
  stepNoun: string;
  ownerLabel: string;
  serviceLabel: string;
  notesLabel: string;
  guidanceLabel: string;
  categories: BuiltInCategory[];
  categoryOptions: { value: BuiltInCategory; label: string }[];
  prefillOptions: { value: PrefillSource; label: string }[];
  perms: {
    view: string;
    create: string;
    update: string;
    delete: string;
    approve: string;
    viewFilled: string;
    send: string;
    countersign: string;
    void: string;
    plansView: string;
    plansManage: string;
    planTemplatesManage: string;
    analytics: string;
    download: string;
    categoriesManage: string;
    plansDownload: string;
  };
  hubPath: (tab?: HubTab) => string;
  builderPath: (id: string) => string;
  fillPath: (submissionId: string) => string;
}

const adminPrefix = () => (window.location.pathname.startsWith("/admin") ? "/admin" : "");

const options = (categories: BuiltInCategory[]) =>
  categories.map((value) => ({ value, label: `${CATEGORY_META[value].emoji}  ${CATEGORY_META[value].label}` }));

const CLIENT_CATEGORIES: BuiltInCategory[] = [
  "consultation",
  "facial",
  "lash_brow",
  "massage",
  "reflexology",
  "wood_therapy",
  "chemical_peel",
  "iv_drip",
  "skin_tag",
  "other",
];

const EMPLOYEE_CATEGORIES: BuiltInCategory[] = ["onboarding", "policy", "nda", "incident", "training", "contract", "other"];

const CONTACT_CATEGORIES: BuiltInCategory[] = [
  "consent",
  "data_privacy",
  "marketing_consent",
  "media_release",
  "waiver",
  "nda",
  "agreement",
  "registration",
  "feedback",
  "other",
];

const COMMON_PREFILL = (who: string): { value: PrefillSource; label: string }[] => [
  { value: "none", label: `${who} types it` },
  { value: "customer_name", label: `${who} name` },
  { value: "phone", label: `${who} phone` },
  { value: "email", label: `${who} email` },
  { value: "date_of_birth", label: `${who} date of birth` },
];

export const AUDIENCES: Record<Audience, AudienceConfig> = {
  client: {
    audience: "client",
    person: "Client",
    people: "Clients",
    aPerson: "a client",
    pickerLabel: "Customer",
    staff: "Therapist",
    signerLabels: { client: "Client", therapist: "Therapist", witness: "Witness" },
    alertsLabel: "Medical alerts",
    alertNoun: "medical alert",
    alertShort: "alert",
    title: "Client Forms & Plans",
    tagline: "Client forms, e-signatures and treatment plans",
    formsTitle: "Form library",
    filledTitle: "Signed by clients",
    formsGroup: "Client forms",
    filledDescription: "Signed forms, links & countersigning",
    filledWhere: "the customer's Forms tab",
    linkHint: "They fill and sign on their phone before the visit.",
    voidPlaceholder: "Reason, e.g. filled for the wrong treatment",
    categoryNoun: "treatment",
    headerBg: "linear-gradient(135deg, #fdf2f8 0%, #f5f3ff 100%)",
    headerColor: "#8b5cf6",
    formsSettingLabel: "Client Forms",
    formsFlag: "clientForms",
    plansFlag: "clientPlans",
    hasPlans: true,
    personKey: "customer_id",
    plansTitle: "Treatment plans",
    planNoun: "treatment plan",
    stepNoun: "Session",
    ownerLabel: "Therapist",
    serviceLabel: "Service",
    notesLabel: "Products & notes",
    guidanceLabel: "Home care",
    categories: CLIENT_CATEGORIES,
    categoryOptions: options(CLIENT_CATEGORIES),
    prefillOptions: [
      ...COMMON_PREFILL("Client"),
      { value: "address", label: "Client address" },
      { value: "today", label: "Today’s date" },
    ],
    perms: {
      view: "CLIENT_FORMS_VIEW",
      create: "CLIENT_FORMS_CREATE",
      update: "CLIENT_FORMS_UPDATE",
      delete: "CLIENT_FORMS_DELETE",
      approve: "CLIENT_FORMS_APPROVE",
      viewFilled: "CLIENT_FORMS_VIEW_FILLED",
      send: "CLIENT_FORMS_SEND",
      countersign: "CLIENT_FORMS_COUNTERSIGN",
      void: "CLIENT_FORMS_VOID",
      plansView: "CLIENT_PLANS_VIEW",
      plansManage: "CLIENT_PLANS_MANAGE",
      planTemplatesManage: "CLIENT_PLAN_TEMPLATES_MANAGE",
      analytics: "CLIENT_FORMS_ANALYTICS",
      download: "CLIENT_FORMS_DOWNLOAD",
      categoriesManage: "CLIENT_FORMS_CATEGORIES_MANAGE",
      plansDownload: "CLIENT_PLANS_DOWNLOAD",
    },
    hubPath: (tab) => `${adminPrefix()}/forms${tab ? `?tab=${tab}` : ""}`,
    builderPath: (id) => `${adminPrefix()}/forms/builder/${id}`,
    fillPath: (id) => `/forms/fill/${id}`,
  },
  employee: {
    audience: "employee",
    person: "Employee",
    people: "Employees",
    aPerson: "an employee",
    pickerLabel: "Employee",
    staff: "HR",
    signerLabels: { client: "Employee", therapist: "HR", witness: "Witness" },
    alertsLabel: "Flagged answers",
    alertNoun: "flag for HR",
    alertShort: "flag",
    title: "Employee Forms & Plans",
    tagline: "Onboarding, policies, NDAs & incident reports — signed by the employee, countersigned by HR",
    formsTitle: "Form library",
    filledTitle: "Signed by employees",
    formsGroup: "Employee forms",
    filledDescription: "Signed forms, links & HR countersigning",
    filledWhere: "Signed by employees",
    linkHint: "They fill and sign on their own phone or computer.",
    voidPlaceholder: "Reason, e.g. sent the wrong policy version",
    categoryNoun: "type",
    headerBg: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
    headerColor: "#2563eb",
    formsSettingLabel: "Employee Forms",
    formsFlag: "employeeForms",
    plansFlag: "employeePlans",
    hasPlans: true,
    personKey: "employee_id",
    plansTitle: "Onboarding & training",
    planNoun: "plan",
    stepNoun: "Step",
    ownerLabel: "Supervisor / trainer",
    serviceLabel: "Topic / module",
    notesLabel: "Notes",
    guidanceLabel: "Reading & practice",
    categories: EMPLOYEE_CATEGORIES,
    categoryOptions: options(EMPLOYEE_CATEGORIES),
    prefillOptions: [
      ...COMMON_PREFILL("Employee"),
      { value: "id_number", label: "Employee ID / passport no." },
      { value: "job_title", label: "Employee job title" },
      { value: "employee_number", label: "Employee number" },
      { value: "hire_date", label: "Employee start date" },
      { value: "today", label: "Today’s date" },
    ],
    perms: {
      view: "EMPLOYEE_FORMS_VIEW",
      create: "EMPLOYEE_FORMS_MANAGE",
      update: "EMPLOYEE_FORMS_MANAGE",
      delete: "EMPLOYEE_FORMS_MANAGE",
      approve: "EMPLOYEE_FORMS_APPROVE",
      viewFilled: "EMPLOYEE_FORMS_VIEW",
      send: "EMPLOYEE_FORMS_MANAGE",
      countersign: "EMPLOYEE_FORMS_MANAGE",
      void: "EMPLOYEE_FORMS_MANAGE",
      plansView: "EMPLOYEE_PLANS_VIEW",
      plansManage: "EMPLOYEE_PLANS_MANAGE",
      planTemplatesManage: "EMPLOYEE_PLANS_MANAGE",
      analytics: "EMPLOYEE_FORMS_ANALYTICS",
      download: "EMPLOYEE_FORMS_DOWNLOAD",
      categoriesManage: "EMPLOYEE_FORMS_CATEGORIES_MANAGE",
      plansDownload: "EMPLOYEE_PLANS_DOWNLOAD",
    },
    hubPath: (tab) => `/hr/forms${tab ? `?tab=${tab}` : ""}`,
    builderPath: (id) => `/hr/forms/builder/${id}`,
    fillPath: (id) => `/hr/forms/fill/${id}`,
  },
  contact: {
    audience: "contact",
    person: "Contact",
    people: "Contacts",
    aPerson: "a contact",
    pickerLabel: "Contact",
    staff: "Staff",
    signerLabels: { client: "Signatory", therapist: "Staff", witness: "Witness" },
    alertsLabel: "Flagged answers",
    alertNoun: "flag to follow up",
    alertShort: "flag",
    title: "Contact Forms",
    tagline: "Consent, privacy, media releases, waivers & agreements — for leads and people who aren't customers",
    formsTitle: "Form library",
    filledTitle: "Signed by contacts",
    formsGroup: "Contact forms",
    filledDescription: "Signed forms, links & countersigning",
    filledWhere: "Signed by contacts",
    linkHint: "They fill and sign on their own phone or computer — no account needed.",
    voidPlaceholder: "Reason, e.g. sent to the wrong person",
    categoryNoun: "type",
    headerBg: "linear-gradient(135deg, #ecfdf5 0%, #eff6ff 100%)",
    headerColor: "#059669",
    formsSettingLabel: "Contact Forms (Mteja)",
    formsFlag: "contactForms",
    plansFlag: "contactPlans",
    hasPlans: false,
    personKey: "lead_id",
    plansTitle: "Plans",
    planNoun: "plan",
    stepNoun: "Step",
    ownerLabel: "Owner",
    serviceLabel: "Topic",
    notesLabel: "Notes",
    guidanceLabel: "Guidance",
    categories: CONTACT_CATEGORIES,
    categoryOptions: options(CONTACT_CATEGORIES),
    prefillOptions: [
      ...COMMON_PREFILL("Contact"),
      { value: "address", label: "Contact address" },
      { value: "id_number", label: "Contact ID / passport no." },
      { value: "today", label: "Today’s date" },
    ],
    perms: {
      view: "MTEJA_FORMS_VIEW",
      create: "MTEJA_FORMS_MANAGE",
      update: "MTEJA_FORMS_MANAGE",
      delete: "MTEJA_FORMS_MANAGE",
      approve: "MTEJA_FORMS_APPROVE",
      viewFilled: "MTEJA_FORMS_VIEW_FILLED",
      send: "MTEJA_FORMS_SEND",
      countersign: "MTEJA_FORMS_SEND",
      void: "MTEJA_FORMS_MANAGE",
      plansView: "MTEJA_FORMS_MANAGE",
      plansManage: "MTEJA_FORMS_MANAGE",
      planTemplatesManage: "MTEJA_FORMS_MANAGE",
      analytics: "MTEJA_FORMS_VIEW_FILLED",
      download: "MTEJA_FORMS_VIEW_FILLED",
      categoriesManage: "MTEJA_FORMS_MANAGE",
      plansDownload: "MTEJA_FORMS_MANAGE",
    },
    hubPath: (tab) => `${adminPrefix()}/crm/forms${tab ? `?tab=${tab}` : ""}`,
    builderPath: (id) => `${adminPrefix()}/crm/forms/builder/${id}`,
    fillPath: (id) => `/crm/forms/fill/${id}`,
  },
};

export const audienceConfig = (audience?: Audience | null): AudienceConfig =>
  AUDIENCES[audience === "employee" || audience === "contact" ? audience : "client"];

/** The forms audience of a submission's subject_type. */
export const audienceOfSubject = (subjectType?: string | null): Audience =>
  subjectType === "employee" ? "employee" : subjectType === "contact" ? "contact" : "client";

/** Which audience a route belongs to: /hr is employees, /crm is Mteja contacts. */
export const audienceFromPath = (pathname: string): Audience =>
  /^\/(admin\/)?hr\//.test(pathname) ? "employee" : /^\/(admin\/)?crm\//.test(pathname) ? "contact" : "client";

export const AudienceContext = createContext<AudienceConfig>(AUDIENCES.client);

export const useAudience = () => useContext(AudienceContext);
