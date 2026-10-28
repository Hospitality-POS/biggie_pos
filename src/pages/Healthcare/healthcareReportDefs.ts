import { createElement, useMemo, type ReactNode } from "react";
import {
  AuditOutlined,
  CalendarOutlined,
  ExperimentOutlined,
  FileProtectOutlined,
  MedicineBoxOutlined,
  SolutionOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { HealthcareReportKind } from "@services/healthcare";
import { useHealthcareSettings } from "@hooks/useHealthcareSettings";
import { THEME_C } from "@utils/getPrimaryColor";
import { CLAIM_STATUS_TAG, STAGE_LABEL, VISIT_TYPE_LABEL, money, useHealthcareAccess } from "./shared";

const C = THEME_C;

/**
 * Healthcare registers and returns. They appear as report tabs on the
 * Reports page beside Item Sales, VAT and the rest (keys prefixed "hc_"),
 * each generated from filters into a printable table.
 */

// ── Report definitions ────────────────────────────────────────────────────────

export type ColumnKind = "text" | "date" | "money" | "number";
export interface ReportColumn {
  key: string;
  title: string;
  kind?: ColumnKind;
  /** Turns stored codes into words (stages, visit types, statuses) */
  label?: (value: unknown) => string;
  /** Adds this column up in the totals row */
  total?: boolean;
}

export interface ReportDef {
  key: HealthcareReportKind;
  label: string;
  title: string;
  icon: ReactNode;
  iconColor: string;
  /** Uses a date range (the expiry and ageing reports are as of today) */
  dated: boolean;
  columns: ReportColumn[];
  emptyText: string;
}

const word = (map: Record<string, string>) => (v: unknown) => map[String(v)] ?? String(v ?? "");

export const HEALTHCARE_REPORTS: ReportDef[] = [
  {
    key: "visits",
    label: "Patient Register",
    title: "PATIENT REGISTER",
    icon: createElement(SolutionOutlined),
    iconColor: C.blue,
    dated: true,
    emptyText: "No visits in the selected period",
    columns: [
      { key: "date", title: "Date", kind: "date" },
      { key: "visit_number", title: "Visit No." },
      { key: "patient_number", title: "Patient No." },
      { key: "patient", title: "Name" },
      { key: "age", title: "Age" },
      { key: "sex", title: "Sex" },
      { key: "visit_type", title: "Visit", label: word(VISIT_TYPE_LABEL) },
      { key: "payer", title: "Payer" },
      { key: "diagnosis", title: "Diagnosis" },
      { key: "doctor", title: "Doctor" },
      { key: "status", title: "Status", label: word(STAGE_LABEL) },
    ],
  },
  {
    key: "morbidity",
    label: "Diagnoses (Morbidity)",
    title: "OUTPATIENT MORBIDITY (MOH 705)",
    icon: createElement(AuditOutlined),
    iconColor: C.purple,
    dated: true,
    emptyText: "No diagnoses recorded in the selected period",
    columns: [
      { key: "code", title: "ICD-10" },
      { key: "diagnosis", title: "Diagnosis" },
      { key: "under_5", title: "Under 5", kind: "number", total: true },
      { key: "five_plus", title: "5 & over", kind: "number", total: true },
      { key: "age_unknown", title: "Age unknown", kind: "number", total: true },
      { key: "total", title: "Total", kind: "number", total: true },
    ],
  },
  {
    key: "lab",
    label: "Lab & Imaging Register",
    title: "LAB & IMAGING REGISTER",
    icon: createElement(ExperimentOutlined),
    iconColor: C.purple,
    dated: true,
    emptyText: "No tests in the selected period",
    columns: [
      { key: "date", title: "Date", kind: "date" },
      { key: "order_number", title: "Order" },
      { key: "department", title: "Dept." },
      { key: "patient_number", title: "Patient No." },
      { key: "patient", title: "Name" },
      { key: "test", title: "Test" },
      { key: "result", title: "Result" },
      { key: "abnormal", title: "Abnormal" },
      { key: "status", title: "Status", label: word({ ordered: "Ordered", sample_collected: "Sample taken", in_progress: "In progress", completed: "Done", cancelled: "Cancelled" }) },
      { key: "reported_by", title: "Reported by" },
      { key: "price", title: "Price", kind: "money", total: true },
    ],
  },
  {
    key: "dispensing",
    label: "Dispensing Register",
    title: "DISPENSING REGISTER",
    icon: createElement(MedicineBoxOutlined),
    iconColor: C.green,
    dated: true,
    emptyText: "Nothing dispensed in the selected period",
    columns: [
      { key: "date", title: "Date", kind: "date" },
      { key: "patient_number", title: "Patient No." },
      { key: "patient", title: "Name" },
      { key: "medicine", title: "Medicine" },
      { key: "dosage", title: "Dosage" },
      { key: "prescribed", title: "Prescribed", kind: "number", total: true },
      { key: "dispensed", title: "Dispensed", kind: "number", total: true },
      { key: "batches", title: "Batch" },
      { key: "prescriber", title: "Prescriber" },
      { key: "dispensed_by", title: "Dispensed by" },
    ],
  },
  {
    key: "expiry",
    label: "Expiry",
    title: "MEDICINE EXPIRY REPORT",
    icon: createElement(CalendarOutlined),
    iconColor: C.orange,
    dated: false,
    emptyText: "Nothing expiring in that time",
    columns: [
      { key: "medicine", title: "Medicine" },
      { key: "batch_number", title: "Batch" },
      { key: "expiry_date", title: "Expiry", kind: "date" },
      { key: "days_left", title: "Days left", kind: "number" },
      { key: "state", title: "State" },
      { key: "quantity", title: "Units", kind: "number", total: true },
      { key: "unit_cost", title: "Unit cost", kind: "money" },
      { key: "value", title: "Value", kind: "money", total: true },
      { key: "supplier", title: "Supplier" },
    ],
  },
  {
    key: "claims",
    label: "Claims",
    title: "INSURANCE CLAIMS REPORT",
    icon: createElement(FileProtectOutlined),
    iconColor: C.blue,
    dated: true,
    emptyText: "No claims in the selected period",
    columns: [
      { key: "date", title: "Date", kind: "date" },
      { key: "claim_number", title: "Claim" },
      { key: "patient", title: "Patient" },
      { key: "member_number", title: "Member No." },
      { key: "payer", title: "Payer" },
      { key: "scheme", title: "Scheme" },
      { key: "total", title: "Bill", kind: "money", total: true },
      { key: "copay", title: "Co-pay", kind: "money", total: true },
      { key: "claimed", title: "Claimed", kind: "money", total: true },
      { key: "approved", title: "Approved", kind: "money", total: true },
      { key: "paid", title: "Paid", kind: "money", total: true },
      { key: "balance", title: "Balance", kind: "money", total: true },
      { key: "status", title: "Status", label: (v) => CLAIM_STATUS_TAG[v as keyof typeof CLAIM_STATUS_TAG]?.label ?? String(v) },
    ],
  },
  {
    key: "ageing",
    label: "Payer Ageing",
    title: "MONEY OWED BY PAYERS (AGEING)",
    icon: createElement(WalletOutlined),
    iconColor: C.red,
    dated: false,
    emptyText: "Nothing outstanding",
    columns: [
      { key: "payer", title: "Payer" },
      { key: "claims", title: "Claims", kind: "number", total: true },
      { key: "d0_30", title: "0–30 days", kind: "money", total: true },
      { key: "d31_60", title: "31–60 days", kind: "money", total: true },
      { key: "d61_90", title: "61–90 days", kind: "money", total: true },
      { key: "d90_plus", title: "Over 90 days", kind: "money", total: true },
      { key: "total", title: "Total", kind: "money", total: true },
    ],
  },
];

export const cellText = (col: ReportColumn, value: unknown): string => {
  if (value === null || value === undefined || value === "") return col.kind === "money" ? "" : "";
  if (col.label) return col.label(value);
  if (col.kind === "date") return dayjs(String(value)).format("DD MMM YYYY");
  if (col.kind === "money") return money(Number(value));
  return String(value);
};

export const isRight = (col: ReportColumn) => col.kind === "money" || col.kind === "number";

export const HC_PREFIX = "hc_";

/** The healthcare reports this branch and user get, as report tabs. */
export const useHealthcareReportTabs = () => {
  const settings = useHealthcareSettings();
  const { viewReports } = useHealthcareAccess();
  return useMemo(
    () =>
      !settings.enabled || !viewReports
        ? []
        : HEALTHCARE_REPORTS.filter((r) => {
            if (r.key === "visits" || r.key === "morbidity") return settings.visits;
            if (r.key === "lab") return settings.diagnostics;
            if (r.key === "dispensing") return settings.prescriptions;
            if (r.key === "expiry") return settings.batchTracking;
            return settings.insurance;
          }).map((r) => ({ key: `${HC_PREFIX}${r.key}`, icon: r.icon, iconColor: r.iconColor, label: r.label })),
    [settings, viewReports]
  );
};

export const healthcareReportFor = (tabKey: string): ReportDef | undefined =>
  tabKey.startsWith(HC_PREFIX) ? HEALTHCARE_REPORTS.find((r) => `${HC_PREFIX}${r.key}` === tabKey) : undefined;
