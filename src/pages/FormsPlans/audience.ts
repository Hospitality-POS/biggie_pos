import { createContext, useContext } from "react";
import type { Audience, FormCategory, PrefillSource, SignerRole } from "./forms/types";
import { CATEGORY_META } from "./forms/constants";

/**
 * Forms & Plans serves two audiences with the same screens:
 *  - client   → customers (Duka / Pesa / Mteja): consent forms, treatment plans
 *  - employee → Bandu HR: onboarding, policies, NDAs, incident reports,
 *               onboarding / training plans
 * Everything that differs (wording, permission keys, categories, paths)
 * lives here; components read it with useAudience().
 */

export type HubTab = "forms" | "filled" | "plans" | "templates";

export interface AudienceConfig {
  audience: Audience;
  /** The person who fills forms in: "Client" / "Employee" */
  person: string;
  people: string;
  /** Picker label: "Customer" / "Employee" */
  pickerLabel: string;
  /** Staff who countersign: "Therapist" / "HR" */
  staff: string;
  signerLabels: Record<SignerRole, string>;
  /** Flagged answers on signed forms */
  alertsLabel: string;
  /** One flagged answer: "medical alert" / "flag for HR" */
  alertNoun: string;
  title: string;
  formsTitle: string;
  filledTitle: string;
  plansTitle: string;
  planNoun: string;
  /** One row of a plan: "Session" / "Step" */
  stepNoun: string;
  ownerLabel: string;
  serviceLabel: string;
  notesLabel: string;
  guidanceLabel: string;
  categories: FormCategory[];
  categoryOptions: { value: FormCategory; label: string }[];
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
  };
  hubPath: (tab?: HubTab) => string;
  builderPath: (id: string) => string;
  fillPath: (submissionId: string) => string;
}

const adminPrefix = () => (window.location.pathname.startsWith("/admin") ? "/admin" : "");

const options = (categories: FormCategory[]) =>
  categories.map((value) => ({ value, label: `${CATEGORY_META[value].emoji}  ${CATEGORY_META[value].label}` }));

const CLIENT_CATEGORIES: FormCategory[] = [
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

const EMPLOYEE_CATEGORIES: FormCategory[] = ["onboarding", "policy", "nda", "incident", "training", "contract", "other"];

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
    pickerLabel: "Customer",
    staff: "Therapist",
    signerLabels: { client: "Client", therapist: "Therapist", witness: "Witness" },
    alertsLabel: "Medical alerts",
    alertNoun: "medical alert",
    title: "Client Forms & Plans",
    formsTitle: "Form library",
    filledTitle: "Signed by clients",
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
    },
    hubPath: (tab) => `${adminPrefix()}/forms${tab ? `?tab=${tab}` : ""}`,
    builderPath: (id) => `${adminPrefix()}/forms/builder/${id}`,
    fillPath: (id) => `/forms/fill/${id}`,
  },
  employee: {
    audience: "employee",
    person: "Employee",
    people: "Employees",
    pickerLabel: "Employee",
    staff: "HR",
    signerLabels: { client: "Employee", therapist: "HR", witness: "Witness" },
    alertsLabel: "Flagged answers",
    alertNoun: "flag for HR",
    title: "Employee Forms & Plans",
    formsTitle: "Form library",
    filledTitle: "Signed by employees",
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
    },
    hubPath: (tab) => `/hr/forms${tab ? `?tab=${tab}` : ""}`,
    builderPath: (id) => `/hr/forms/builder/${id}`,
    fillPath: (id) => `/hr/forms/fill/${id}`,
  },
};

export const audienceConfig = (audience?: Audience | null): AudienceConfig => AUDIENCES[audience === "employee" ? "employee" : "client"];

/** Which audience a route belongs to: anything under /hr is employees. */
export const audienceFromPath = (pathname: string): Audience => (/^\/(admin\/)?hr\//.test(pathname) ? "employee" : "client");

export const AudienceContext = createContext<AudienceConfig>(AUDIENCES.client);

export const useAudience = () => useContext(AudienceContext);
