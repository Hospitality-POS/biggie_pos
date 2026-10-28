import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { fetchAllInventory } from "@services/inventory";
import { useAppDispatch, useAppSelector } from "src/store";
import { useRetailQueue } from "@context/RetailQueueContext";
import { addItemToCart, createCart, getCart } from "../../features/Cart/CartActions";
import { escapeHtml } from "@utils/escapeHtml";
import { makePermissionChecker } from "@utils/accessControl";
import type { CartDetailsInterface } from "src/interfaces/CartDetailsTypes";
import type { PatientCustomer, PrescriptionItem, VisitStage } from "@services/healthcare";

/** `value`, once it has stopped changing for `delay` ms (for search boxes). */
export const useDebounced = <T,>(value: T, delay = 300): T => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return settled;
};

// ─── Access ──────────────────────────────────────────────────────────────────

/** What this user may do in Healthcare (admins may do everything). */
export const useHealthcareAccess = () => {
  const { user } = useAppSelector((state) => state.auth);
  const u = user as { rolePermissions?: string[]; permissions?: string[]; role?: string } | null;
  const can = makePermissionChecker(u?.rolePermissions ?? u?.permissions ?? [], u?.role === "admin");
  return {
    viewPatients: can("HEALTHCARE_PATIENTS_VIEW"),
    managePatients: can("HEALTHCARE_PATIENTS_MANAGE"),
    viewVisits: can("HEALTHCARE_VISITS_VIEW"),
    manageVisits: can("HEALTHCARE_VISITS_MANAGE"),
    triage: can("HEALTHCARE_TRIAGE"),
    clinicalNotes: can("HEALTHCARE_CLINICAL_NOTES"),
    prescribe: can("HEALTHCARE_PRESCRIBE"),
    viewPrescriptions: can("HEALTHCARE_PRESCRIPTIONS_VIEW"),
    dispense: can("HEALTHCARE_DISPENSE"),
    viewBatches: can("HEALTHCARE_BATCHES_VIEW"),
    manageBatches: can("HEALTHCARE_BATCHES_MANAGE"),
    orderLab: can("HEALTHCARE_LAB_ORDER"),
    viewLab: can("HEALTHCARE_LAB_VIEW"),
    labWork: can("HEALTHCARE_LAB_WORK"),
    labSetup: can("HEALTHCARE_LAB_SETUP"),
    viewClaims: can("HEALTHCARE_CLAIMS_VIEW"),
    manageClaims: can("HEALTHCARE_CLAIMS_MANAGE"),
    managePayers: can("HEALTHCARE_PAYERS_MANAGE"),
    viewReports: can("HEALTHCARE_REPORTS_VIEW"),
  };
};

export type HealthcareAccess = ReturnType<typeof useHealthcareAccess>;

/** The search permission this user holds, for the patient picker. */
export const searchPermissionFor = (a: HealthcareAccess) =>
  a.viewPatients
    ? "HEALTHCARE_PATIENTS_VIEW"
    : a.manageVisits
      ? "HEALTHCARE_VISITS_MANAGE"
      : a.prescribe
        ? "HEALTHCARE_PRESCRIBE"
        : "HEALTHCARE_DISPENSE";

// ─── Stages ──────────────────────────────────────────────────────────────────

export const STAGES: { key: VisitStage; label: string; color: string }[] = [
  { key: "waiting", label: "Waiting", color: "#64748b" },
  { key: "triage", label: "Triage", color: "#e11d48" },
  { key: "consultation", label: "Doctor", color: "#7c3aed" },
  { key: "lab", label: "Lab", color: "#0891b2" },
  { key: "pharmacy", label: "Pharmacy", color: "#16a34a" },
  { key: "billing", label: "Billing", color: "#f59e0b" },
];

export const STAGE_LABEL: Record<VisitStage, string> = {
  waiting: "Waiting",
  triage: "Triage",
  consultation: "Doctor",
  lab: "Lab",
  pharmacy: "Pharmacy",
  billing: "Billing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PRIORITY_COLOR = { normal: "default", urgent: "orange", emergency: "red" } as const;

export const VISIT_TYPE_LABEL = {
  outpatient: "Outpatient",
  walk_in_pharmacy: "Pharmacy walk-in",
  follow_up: "Follow-up",
  emergency: "Emergency",
} as const;

export const RX_STATUS = {
  pending: { label: "Pending", color: "blue" },
  partially_dispensed: { label: "Part dispensed", color: "orange" },
  dispensed: { label: "Dispensed", color: "green" },
  cancelled: { label: "Cancelled", color: "default" },
} as const;

// ─── Formatting ──────────────────────────────────────────────────────────────

export const patientName = (c?: PatientCustomer | null) => c?.customer_name || "Unnamed patient";

export const ageOf = (dob?: string) => {
  if (!dob) return "";
  const years = dayjs().diff(dayjs(dob), "year");
  return Number.isFinite(years) && years >= 0 ? `${years} yrs` : "";
};

export const waitedFor = (since: string) => {
  const mins = dayjs().diff(dayjs(since), "minute");
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export const bmiOf = (weightKg?: number | null, heightCm?: number | null) => {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
};

// ─── Medicines ───────────────────────────────────────────────────────────────

export interface MedicineOption {
  _id: string;
  name: string;
  quantity: number;
  price: number;
}

/** The shop's stock items, for choosing medicines and pricing the bill. */
export const useMedicineOptions = (enabled = true) =>
  useQuery({
    queryKey: ["healthcare-medicine-options", localStorage.getItem("shopId")],
    queryFn: async (): Promise<MedicineOption[]> => {
      const res = await fetchAllInventory({ shop_id: localStorage.getItem("shopId") });
      const rows = (Array.isArray(res) ? res : res?.data ?? []) as Partial<MedicineOption>[];
      return rows.map((r) => ({ _id: String(r._id), name: r.name ?? "", quantity: r.quantity ?? 0, price: r.price ?? 0 }));
    },
    enabled,
    staleTime: 60_000,
  });

// ─── Billing ─────────────────────────────────────────────────────────────────

export interface BillLine {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  /** Medicine is stock (default); lab tests are usually services */
  product_type?: "Product" | "Product_Inventory";
}

/**
 * Adds dispensed medicine to the cart on the POS's active patient slot, the
 * same way tapping the item on the POS does, so stock and payment work as
 * usual. Returns the slot's table id.
 */
export const useAddToBill = () => {
  const dispatch = useAppDispatch();
  const { activeTable } = useRetailQueue();
  const { user } = useAppSelector((state) => state.auth);
  const userId = (user as { id?: string; _id?: string } | null)?.id || (user as { _id?: string } | null)?._id || "";

  return useCallback(
    async (lines: BillLine[]) => {
      const tableId = activeTable?._id;
      if (!tableId) throw new Error("Open a patient slot on the POS first, then add the medicine to the bill.");

      const current = await dispatch(getCart(tableId));
      let cartId = (current.payload as { _id?: string } | undefined)?._id;
      if (!cartId) {
        const created = await dispatch(
          createCart({ table_id: tableId, created_by: userId } as unknown as CartDetailsInterface)
        );
        cartId = (created.payload as { _id?: string } | undefined)?._id;
        if (!cartId) throw new Error("Couldn't open a bill for this patient");
      }

      for (const line of lines) {
        await dispatch(
          addItemToCart({
            cart_id: cartId,
            product_id: line.product_id,
            product_type: line.product_type ?? "Product_Inventory",
            price: line.price,
            created_by: userId,
            quantity: line.quantity,
            desc: line.name,
            table_id: tableId,
          })
        );
      }
      return { tableId, slotName: (activeTable as { name?: string } | null)?.name || "" };
    },
    [activeTable, dispatch, userId]
  );
};

// ─── Dispensing labels ───────────────────────────────────────────────────────

/** Prints one small label per medicine: patient, drug, how to take it. */
export const printDispensingLabels = (opts: {
  shopName?: string;
  patient: string;
  patientNumber?: string;
  items: Pick<PrescriptionItem, "name" | "dose" | "frequency" | "duration" | "route" | "instructions">[];
  quantities: Record<string, number>;
  dispensedBy?: string;
}) => {
  const date = dayjs().format("DD MMM YYYY");
  const labels = opts.items
    .filter((item) => (opts.quantities[item.name] ?? 0) > 0)
    .map(
      (item) => `
      <div class="label">
        <div class="shop">${escapeHtml(opts.shopName || "")}</div>
        <div class="drug">${escapeHtml(item.name)} &times; ${escapeHtml(opts.quantities[item.name])}</div>
        <div class="how">${escapeHtml([item.dose, item.frequency, item.duration].filter(Boolean).join(" · "))}</div>
        ${item.route ? `<div>Route: ${escapeHtml(item.route)}</div>` : ""}
        ${item.instructions ? `<div class="inst">${escapeHtml(item.instructions)}</div>` : ""}
        <div class="foot">${escapeHtml(opts.patient)}${opts.patientNumber ? ` (${escapeHtml(opts.patientNumber)})` : ""} · ${escapeHtml(date)}${
          opts.dispensedBy ? ` · ${escapeHtml(opts.dispensedBy)}` : ""
        }</div>
        <div class="warn">Keep out of reach of children</div>
      </div>`
    )
    .join("");
  if (!labels) return;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>
    @page { size: 72mm auto; margin: 3mm; }
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; }
    .label { border: 1px dashed #000; padding: 6px; margin-bottom: 6px; page-break-inside: avoid; }
    .shop { font-weight: bold; text-align: center; font-size: 10px; }
    .drug { font-weight: bold; font-size: 13px; margin: 4px 0; }
    .how { font-size: 12px; }
    .inst { margin-top: 2px; font-style: italic; }
    .foot { margin-top: 4px; font-size: 10px; }
    .warn { font-size: 9px; text-align: center; margin-top: 3px; }
  </style></head><body>${labels}</body></html>`;

  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 200);
};

// ─── Lab ─────────────────────────────────────────────────────────────────────

export const LAB_STATUS_TAG = {
  ordered: { label: "Ordered", color: "blue" },
  sample_collected: { label: "Sample taken", color: "geekblue" },
  in_progress: { label: "In progress", color: "orange" },
  completed: { label: "Results ready", color: "green" },
  cancelled: { label: "Cancelled", color: "default" },
} as const;

export const money = (n?: number | null) =>
  (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Opens a print dialog for a small HTML document (reports, claim forms). */
export const printHtml = (title: string, body: string) => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 16px; }
    h1 { font-size: 16px; margin: 0 0 4px; } h2 { font-size: 13px; margin: 16px 0 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; } .muted { color: #555; } .flag { font-weight: bold; color: #b91c1c; }
    .right { text-align: right; } .sign { margin-top: 32px; display: flex; gap: 48px; }
  </style></head><body>${body}</body></html>`;
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 200);
};

/** A lab or imaging report for the patient's file. */
export const printLabReport = (opts: {
  shopName?: string;
  order: {
    order_number: string;
    department: "lab" | "radiology";
    ordered_by_name?: string;
    sample_collected_at?: string | null;
    completed_at?: string | null;
    clinical_notes?: string;
    items: { name: string; status: string; results: { parameter: string; value: string; unit?: string; ref_range?: string; flag?: string }[]; report?: string; completed_by_name?: string }[];
  };
  patient: string;
  patientNumber?: string;
  ageGender?: string;
}) => {
  const { order } = opts;
  const e = escapeHtml;
  const tests = order.items
    .filter((i) => i.status === "completed")
    .map((i) => {
      const rows = i.results.length
        ? `<table><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference range</th><th></th></tr>${i.results
            .map(
              (r) =>
                `<tr><td>${e(r.parameter)}</td><td class="${r.flag ? "flag" : ""}">${e(r.value)}</td><td>${e(r.unit)}</td><td>${e(r.ref_range)}</td><td class="flag">${e(
                  r.flag === "high" ? "H" : r.flag === "low" ? "L" : r.flag ? "*" : ""
                )}</td></tr>`
            )
            .join("")}</table>`
        : "";
      const report = i.report ? `<p>${e(i.report).replace(/\n/g, "<br>")}</p>` : "";
      return `<h2>${e(i.name)}</h2>${rows}${report}<div class="muted">Reported by ${e(i.completed_by_name || "—")}</div>`;
    })
    .join("");
  printHtml(
    `${order.order_number} report`,
    `<h1>${e(opts.shopName || "")}</h1>
     <div><b>${order.department === "radiology" ? "Imaging" : "Laboratory"} report</b> · ${e(order.order_number)}</div>
     <table><tr><td><b>Patient</b> ${e(opts.patient)}${opts.patientNumber ? ` (${e(opts.patientNumber)})` : ""}</td><td>${e(opts.ageGender || "")}</td></tr>
     <tr><td><b>Requested by</b> ${e(order.ordered_by_name || "—")}</td><td><b>Sample</b> ${e(
       order.sample_collected_at ? dayjs(order.sample_collected_at).format("DD MMM YYYY HH:mm") : "—"
     )} · <b>Reported</b> ${e(order.completed_at ? dayjs(order.completed_at).format("DD MMM YYYY HH:mm") : "—")}</td></tr></table>
     ${order.clinical_notes ? `<p class="muted"><b>Clinical notes:</b> ${e(order.clinical_notes)}</p>` : ""}
     ${tests}
     <div class="sign"><div>Verified by: ____________________</div><div>Signature: ____________________</div></div>`
  );
};

// ─── Claims ──────────────────────────────────────────────────────────────────

export const CLAIM_STATUS_TAG: Record<"draft" | "submitted" | "approved" | "partially_paid" | "paid" | "rejected", { label: string; color: string }> = {
  draft: { label: "Draft", color: "default" },
  submitted: { label: "Submitted", color: "blue" },
  approved: { label: "Approved", color: "geekblue" },
  partially_paid: { label: "Part paid", color: "orange" },
  paid: { label: "Paid", color: "green" },
  rejected: { label: "Rejected", color: "red" },
};

/** The visit stages this branch uses (a diagnostic centre has no doctor or pharmacy step). */
export const visibleStages = (
  settings: { triage: boolean; clinicalNotes: boolean; prescriptions: boolean; diagnostics: boolean },
  inUse: string[] = []
) =>
  STAGES.filter((s) => {
    // Keep a column while anyone is still in it after its feature is switched off
    if (inUse.includes(s.key)) return true;
    if (s.key === "triage") return settings.triage;
    if (s.key === "consultation") return settings.clinicalNotes || settings.prescriptions;
    if (s.key === "lab") return settings.diagnostics;
    if (s.key === "pharmacy") return settings.prescriptions;
    return true;
  });
